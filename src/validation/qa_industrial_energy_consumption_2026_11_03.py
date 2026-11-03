"""Independent QA for Industrial energy consumption — DESNZ ECUK C1.

Read-only against ``data/energy/industrial-energy-consumption/``.
Does not rewrite source data.

Re-run: ``uv run python -m validation.qa_industrial_energy_consumption_2026_11_03``
"""

from __future__ import annotations

import csv
import hashlib
import sys
from collections import Counter
from pathlib import Path

import yaml
from openpyxl import load_workbook

from britain_exchange.observation import CURATED_FIELDNAMES

REPO_ROOT = Path(__file__).resolve().parents[2]
BASE = REPO_ROOT / "data/energy/industrial-energy-consumption"
RAW = BASE / "raw/2026-11-03/ECUK_2026_Consumption_tables.xlsx"
CSV_PATH = BASE / "curated/observations.csv"
MANIFEST_PATH = BASE / "manifest.yaml"
REPORT_PATH = (
    REPO_ROOT / "data/qa/qa_report_industrial_energy_consumption_2026-11-03.md"
)

EXPECTED_SHA256 = "e0b73e341a009e066f067492607c940d8df155c00d40568430bfbbe77f0e4bd2"
EXPECTED_ROWS = 616

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


def main() -> int:
    checks: list[tuple[str, str, str, str]] = []

    actual_sha = sha256_file(RAW) if RAW.is_file() else ""
    checks.append(
        (
            "C1",
            "Pinned raw SHA-256",
            "pass" if actual_sha == EXPECTED_SHA256 else "fail",
            actual_sha or f"missing {RAW}",
        )
    )

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

    manifest = yaml.safe_load(MANIFEST_PATH.read_text(encoding="utf-8"))
    missing = [
        f
        for f in REQUIRED_MANIFEST_FIELDS
        if f not in manifest or manifest[f] in (None, "", [])
    ]
    ok = (
        not missing
        and manifest.get("unit") == "ktoe"
        and manifest.get("indicator_id") == "industrial-energy-consumption"
    )
    checks.append(
        (
            "C3",
            "Manifest completeness",
            "pass" if ok else "fail",
            f"missing={missing or 'none'}; unit={manifest.get('unit')}",
        )
    )

    wb = load_workbook(RAW, data_only=True, read_only=False)
    try:
        ws = wb["Table C1"]
        # Industry Year header at row 6; 1970 at row 7; 2025 at row 62
        spot_failures: list[str] = []
        spots = (
            ("2025-01-01", "Total", 62, 12, 17321.83),
            ("2025-01-01", "Electricity", 62, 8, 6592.44),
            ("2025-01-01", "Natural gas", 62, 7, 5478.74),
            ("1970-01-01", "Total", 7, 12, 62333.0),
        )
        for period_start, fuel, raw_row, raw_col, expected in spots:
            curated = next(
                (
                    r
                    for r in rows
                    if r["period_start"] == period_start and r["notes"] == f"fuel={fuel}"
                ),
                None,
            )
            raw_val = ws.cell(raw_row, raw_col).value
            if curated is None or curated["value"] == "" or raw_val is None:
                spot_failures.append(f"{period_start}/{fuel}: missing")
                continue
            curated_val = float(curated["value"])
            if not approx_equal(curated_val, float(raw_val)) or not approx_equal(
                curated_val, expected, tol=5e-2
            ):
                spot_failures.append(
                    f"{period_start}/{fuel}: curated={curated_val} "
                    f"raw={raw_val} expected~{expected}"
                )
        checks.append(
            (
                "C4",
                "Spot values vs ECUK Table C1 Industry",
                "pass" if not spot_failures else "fail",
                "; ".join(spot_failures) if spot_failures else "4/4 samples match",
            )
        )
    finally:
        wb.close()

    # Component sum vs Total for 2025.
    # Note 2: Total can include blast furnace gas (and historically creosote/pitch)
    # not shown as a separate Industry fuel column — so exact equality is not
    # expected. Check curated Total matches raw Total, and document residual.
    year_rows = [
        r
        for r in rows
        if r["period_start"] == "2025-01-01" and r["value"]
    ]
    total = next(r for r in year_rows if r["notes"] == "fuel=Total")
    components = [r for r in year_rows if r["notes"] != "fuel=Total"]
    component_sum = sum(float(r["value"]) for r in components)
    total_val = float(total["value"])
    residual = total_val - component_sum
    # Official Note 2 residual for recent years is small (BFG in Total only).
    residual_ok = 0 < residual < 20
    checks.append(
        (
            "C5",
            "Total vs component sum residual (Note 2 BFG)",
            "pass" if residual_ok else "fail",
            f"sum(components)={component_sum} Total={total_val} residual={residual:.4f}",
        )
    )

    geos = {r["geography_code"] for r in rows}
    units = {r["unit"] for r in rows}
    statuses = Counter(r["observation_status"] for r in rows)
    checks.append(
        (
            "C6",
            "Geography + unit + status vocabulary",
            "pass" if geos == {"K02000001"} and units == {"ktoe"} else "fail",
            f"geo={geos} units={units} statuses={dict(statuses)}",
        )
    )

    REPORT_PATH.parent.mkdir(parents=True, exist_ok=True)
    lines = [
        "# QA report — industrial energy consumption — 2026-11-03",
        "",
        "## Scope",
        "- Indicator: `industrial-energy-consumption` (DESNZ ECUK Table C1)",
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
    lines.extend(
        [
            "",
            "## Summary",
            f"- Pass: {sum(1 for c in checks if c[2] == 'pass')}/{len(checks)}",
            f"- Fail: {len(fails)}",
            f"- Blockers: {'none' if not fails else '; '.join(f'{c[0]} {c[1]}' for c in fails)}",
            "",
        ]
    )
    REPORT_PATH.write_text("\n".join(lines), encoding="utf-8")
    print(REPORT_PATH.read_text(encoding="utf-8"))
    return 1 if fails else 0


if __name__ == "__main__":
    sys.exit(main())
