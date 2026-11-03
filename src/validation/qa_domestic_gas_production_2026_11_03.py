"""Independent QA for Domestic gas production — DESNZ ET 4.2.

Read-only against ``data/energy/domestic-gas-production/``.
Does not rewrite source data.

Re-run: ``uv run python -m validation.qa_domestic_gas_production_2026_11_03``
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
BASE = REPO_ROOT / "data/energy/domestic-gas-production"
RAW = BASE / "raw/2026-11-03/ET_4.2_OCT_26.xlsx"
CSV_PATH = BASE / "curated/observations.csv"
MANIFEST_PATH = BASE / "manifest.yaml"
REPORT_PATH = REPO_ROOT / "data/qa/qa_report_domestic_gas_production_2026-11-03.md"

EXPECTED_SHA256 = "f48acf6de39a9733fbd6da33dfc3575bec9ad4b0ac3808ec96120d3db64afb11"
EXPECTED_ROWS = 368
HEADER_ROW = 8

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
    unit_ok = manifest.get("unit") == "GWh"
    id_ok = manifest.get("indicator_id") == "domestic-gas-production"
    checks.append(
        (
            "C3",
            "Manifest completeness",
            "pass" if not missing and unit_ok and id_ok else "fail",
            f"missing={missing or 'none'}; unit={manifest.get('unit')}",
        )
    )

    wb = load_workbook(RAW, data_only=True, read_only=False)
    try:
        ws = wb["Month (GWh)"]
        spot_failures: list[str] = []
        spots = (
            ("2026-08-01", 376, 22659.78, "provisional"),
            ("1996-01-01", 9, 106629.0, "final"),
            ("2026-07-01", 375, 25878.49, "final"),
        )
        for period_start, raw_row, expected, expected_status in spots:
            curated = next(
                (r for r in rows if r["period_start"] == period_start),
                None,
            )
            if curated is None or curated["value"] == "":
                spot_failures.append(f"{period_start}: missing curated")
                continue
            curated_val = float(curated["value"])
            raw_val = float(ws.cell(raw_row, 2).value)
            if not approx_equal(curated_val, raw_val) or not approx_equal(
                curated_val, expected
            ):
                spot_failures.append(
                    f"{period_start}: curated={curated_val} raw={raw_val} expected={expected}"
                )
            if curated["observation_status"] != expected_status:
                spot_failures.append(
                    f"{period_start}: status={curated['observation_status']} "
                    f"expected={expected_status}"
                )
        checks.append(
            (
                "C4",
                "Spot values vs Month (GWh) Gross production",
                "pass" if not spot_failures else "fail",
                "; ".join(spot_failures) if spot_failures else "3/3 samples match",
            )
        )
    finally:
        wb.close()

    geos = {r["geography_code"] for r in rows}
    units = {r["unit"] for r in rows}
    statuses = Counter(r["observation_status"] for r in rows)
    geo_ok = geos == {"K02000001"}
    unit_ok2 = units == {"GWh"}
    checks.append(
        (
            "C5",
            "Geography + unit + status vocabulary",
            "pass" if geo_ok and unit_ok2 else "fail",
            f"geo={geos} units={units} statuses={dict(statuses)}",
        )
    )

    REPORT_PATH.parent.mkdir(parents=True, exist_ok=True)
    lines = [
        "# QA report — domestic gas production — 2026-11-03",
        "",
        "## Scope",
        "- Indicator: `domestic-gas-production` (DESNZ ET 4.2)",
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
