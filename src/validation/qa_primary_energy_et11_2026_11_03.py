"""Independent QA for Primary energy production — DESNZ ET 1.1.

Read-only against ``data/energy/primary-energy-production/``.
Does not rewrite source data.

Re-run: ``uv run python -m validation.qa_primary_energy_et11_2026_11_03``
"""

from __future__ import annotations

import csv
import hashlib
import sys
from collections import Counter
from pathlib import Path

import yaml
from openpyxl import load_workbook

from britain_exchange.aggregation import ENERGY_AGGREGATE_FUELS, energy_aggregation_role
from britain_exchange.observation import CURATED_FIELDNAMES

REPO_ROOT = Path(__file__).resolve().parents[2]
BASE = REPO_ROOT / "data/energy/primary-energy-production"
RAW = BASE / "raw/2026-11-03/ET_1.1_OCT_26.xlsx"
CSV_PATH = BASE / "curated/observations.csv"
MANIFEST_PATH = BASE / "manifest.yaml"
REPORT_PATH = REPO_ROOT / "data/qa/qa_report_primary_energy_2026-11-03.md"

EXPECTED_SHA256 = "d5989df64a338a5d89239c65eae2aaf3d8e9df8116a0061bfa57df7dba3b6c78"
EXPECTED_ROWS = 2660
HEADER_ROW = 6

# Official Main table / Month sheet samples (Mtoe).
SPOT_CHECKS: tuple[tuple[str, str, float], ...] = (
    ("2026-08-01", "Total", 6.55),
    ("2026-08-01", "Natural gas", 1.95),
    ("2026-08-01", "Petroleum", 2.03),
    ("2026-08-01", "Coal", 0.01),
    ("1995-01-01", "Coal", 1.72),
    ("2025-01-01", "Total", None),  # filled below from raw if needed
)

REQUIRED_MANIFEST_FIELDS = (
    "indicator_id",
    "title",
    "sector",
    "publisher",
    "source_url",
    "series_id",
    "geography",
    "frequency",
    "unit",
    "definition",
    "licence",
    "agent_owner",
    "connector_module",
    "curated_path",
    "raw_evidence",
)


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def approx_equal(a: float, b: float, tol: float = 1e-6) -> bool:
    return abs(a - b) <= tol


def load_curated(path: Path) -> tuple[tuple[str, ...], list[dict[str, str]]]:
    with path.open(newline="", encoding="utf-8") as handle:
        reader = csv.DictReader(handle)
        return tuple(reader.fieldnames or ()), list(reader)


def raw_month_value(ws, period_label: str, fuel_header_substr: str) -> float | None:
    headers = [
        str(ws.cell(HEADER_ROW, col).value or "")
        for col in range(1, 12)
    ]
    fuel_col = None
    for idx, header in enumerate(headers, start=1):
        if fuel_header_substr.casefold() in header.casefold():
            fuel_col = idx
            break
    if fuel_col is None:
        return None
    for row_idx in range(HEADER_ROW + 1, (ws.max_row or HEADER_ROW) + 1):
        label = str(ws.cell(row_idx, 1).value or "").strip()
        if label.casefold().startswith(period_label.casefold()):
            raw = ws.cell(row_idx, fuel_col).value
            if isinstance(raw, (int, float)):
                return float(raw)
            return None
    return None


def main() -> int:
    checks: list[tuple[str, str, str, str]] = []

    # C1 checksum
    if not RAW.is_file():
        checks.append(("C1", "Pinned raw present", "fail", f"missing {RAW}"))
        actual_sha = ""
    else:
        actual_sha = sha256_file(RAW)
        ok = actual_sha == EXPECTED_SHA256
        checks.append(
            (
                "C1",
                "Pinned raw SHA-256",
                "pass" if ok else "fail",
                actual_sha if ok else f"got {actual_sha}, expected {EXPECTED_SHA256}",
            )
        )

    # C2 schema + row count
    header, rows = load_curated(CSV_PATH)
    schema_ok = header == CURATED_FIELDNAMES
    count_ok = len(rows) == EXPECTED_ROWS
    checks.append(
        (
            "C2",
            "Curated schema + row count",
            "pass" if schema_ok and count_ok else "fail",
            f"rows={len(rows)} schema_ok={schema_ok}",
        )
    )

    # C3 manifest
    manifest = yaml.safe_load(MANIFEST_PATH.read_text(encoding="utf-8"))
    missing = [f for f in REQUIRED_MANIFEST_FIELDS if f not in manifest or manifest[f] in (None, "", [])]
    unit_ok = manifest.get("unit") == "Mtoe"
    id_ok = manifest.get("indicator_id") == "primary-energy-production"
    checks.append(
        (
            "C3",
            "Manifest completeness",
            "pass" if not missing and unit_ok and id_ok else "fail",
            f"missing={missing or 'none'}; unit={manifest.get('unit')}",
        )
    )

    # C4 spot vs raw Month sheet
    wb = load_workbook(RAW, data_only=True, read_only=False)
    try:
        ws = wb["Month"]
        spot_failures: list[str] = []
        for period_start, fuel, expected in [
            ("2026-08-01", "Total", 6.55),
            ("2026-08-01", "Natural gas", 1.95),
            ("2026-08-01", "Petroleum", 2.03),
            ("2026-08-01", "Coal", 0.01),
            ("1995-01-01", "Coal", 1.72),
        ]:
            curated = next(
                (
                    r
                    for r in rows
                    if r["period_start"] == period_start and r["notes"] == f"fuel={fuel}"
                ),
                None,
            )
            if curated is None or curated["value"] == "":
                spot_failures.append(f"{period_start}/{fuel}: missing curated")
                continue
            curated_val = float(curated["value"])
            # Map period_start to Month label for raw lookup
            year, month, _ = period_start.split("-")
            import calendar

            label = f"{calendar.month_name[int(month)]} {year}"
            raw_val = raw_month_value(ws, label, fuel if fuel != "Total" else "Total")
            if raw_val is None or not approx_equal(curated_val, raw_val, tol=1e-9):
                spot_failures.append(
                    f"{period_start}/{fuel}: curated={curated_val} raw={raw_val}"
                )
            if not approx_equal(curated_val, expected, tol=5e-3):
                # Main table publishes rounded display; allow 0.005 Mtoe
                spot_failures.append(
                    f"{period_start}/{fuel}: curated={curated_val} vs published~{expected}"
                )
        checks.append(
            (
                "C4",
                "Spot values vs Month sheet + Main table",
                "pass" if not spot_failures else "fail",
                "; ".join(spot_failures) if spot_failures else "5/5 samples match",
            )
        )
    finally:
        wb.close()

    # C5 Total is aggregate; component sum ≈ Total for a recent month
    aug_rows = [r for r in rows if r["period_start"] == "2026-08-01" and r["value"]]
    total_row = next(r for r in aug_rows if r["notes"] == "fuel=Total")
    components = [
        r
        for r in aug_rows
        if r["notes"] != "fuel=Total" and energy_aggregation_role(r["notes"]) == "component"
    ]
    component_sum = sum(float(r["value"]) for r in components)
    total_val = float(total_row["value"])
    sum_ok = approx_equal(component_sum, total_val, tol=1e-6)
    role_ok = "Total" in ENERGY_AGGREGATE_FUELS
    checks.append(
        (
            "C5",
            "Aggregate Total vs component sum (Aug 2026)",
            "pass" if sum_ok and role_ok else "fail",
            f"sum(components)={component_sum} Total={total_val}",
        )
    )

    # C6 geography / unit / statuses
    geos = {r["geography_code"] for r in rows}
    units = {r["unit"] for r in rows}
    statuses = Counter(r["observation_status"] for r in rows)
    geo_ok = geos == {"K02000001"}
    unit_ok2 = units == {"Mtoe"}
    checks.append(
        (
            "C6",
            "Geography + unit + status vocabulary",
            "pass" if geo_ok and unit_ok2 else "fail",
            f"geo={geos} units={units} statuses={dict(statuses)}",
        )
    )

    # Write report
    REPORT_PATH.parent.mkdir(parents=True, exist_ok=True)
    lines = [
        "# QA report — primary energy production — 2026-11-03",
        "",
        "## Scope",
        f"- Indicator: `primary-energy-production` (DESNZ ET 1.1)",
        f"- Raw: `{RAW.relative_to(REPO_ROOT)}`",
        f"- Curated: `{CSV_PATH.relative_to(REPO_ROOT)}` ({len(rows)} rows)",
        f"- Manifest: `{MANIFEST_PATH.relative_to(REPO_ROOT)}`",
        "",
        "## Checks",
        "| ID | Check | Result | Notes |",
        "|----|-------|--------|-------|",
    ]
    for cid, name, result, notes in checks:
        lines.append(f"| {cid} | {name} | **{result}** | {notes} |")
    fails = [c for c in checks if c[2] == "fail"]
    warns = [c for c in checks if c[2] == "warn"]
    lines.extend(
        [
            "",
            "## Summary",
            f"- Pass: {sum(1 for c in checks if c[2] == 'pass')}/{len(checks)}",
            f"- Warn: {len(warns)}",
            f"- Fail: {len(fails)}",
            f"- Blockers: {'none' if not fails else '; '.join(f'{c[0]} {c[1]}' for c in fails)}",
            "- Recommended next: Orchestrator marks registry **Ready** and runs `load_ready` iff no blockers.",
            "",
        ]
    )
    REPORT_PATH.write_text("\n".join(lines), encoding="utf-8")
    print(REPORT_PATH.read_text(encoding="utf-8"))
    return 1 if fails else 0


if __name__ == "__main__":
    sys.exit(main())
