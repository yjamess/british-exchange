"""Independent QA for Industrial electricity prices — DESNZ QEP 3.1.2.

Read-only against ``data/energy/industrial-electricity-prices/``.
Does not rewrite source data.

Re-run: ``uv run python -m validation.qa_industrial_electricity_prices_2026_11_03``
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
BASE = REPO_ROOT / "data/energy/industrial-electricity-prices"
RAW = BASE / "raw/2026-11-03/table_311_314.xlsx"
CSV_PATH = BASE / "curated/observations.csv"
MANIFEST_PATH = BASE / "manifest.yaml"
REPORT_PATH = (
    REPO_ROOT / "data/qa/qa_report_industrial_electricity_prices_2026-11-03.md"
)

EXPECTED_SHA256 = "56d562fcf3f928ff3341e84a98713dab02cefab4d1c0cc178561efc2bda36a0d"
EXPECTED_ROWS = 660
HEADER_ROW = 6
AVG_COL = 31
SMALL_COL = 26

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


def approx_equal(a: float, b: float, tol: float = 1e-9) -> bool:
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
        and manifest.get("unit") == "p/kWh"
        and manifest.get("indicator_id") == "industrial-electricity-prices"
        and "Great Britain" in str(manifest.get("geography", ""))
    )
    checks.append(
        (
            "C3",
            "Manifest completeness (GB geography)",
            "pass" if ok else "fail",
            f"missing={missing or 'none'}; geo={manifest.get('geography')}",
        )
    )

    wb = load_workbook(RAW, data_only=True, read_only=False)
    try:
        ws = wb["3.1.2"]
        spot_failures: list[str] = []
        # Row 116 = 2026 Apr to Jun
        raw_avg = float(ws.cell(116, AVG_COL).value)
        raw_small = float(ws.cell(116, SMALL_COL).value)
        for band, expected in (("Average", raw_avg), ("Small", raw_small)):
            curated = next(
                (
                    r
                    for r in rows
                    if r["period_start"] == "2026-04-01"
                    and r["notes"].startswith(f"band={band};")
                ),
                None,
            )
            if curated is None or curated["value"] == "":
                spot_failures.append(f"Q2 2026 {band}: missing curated")
                continue
            if not approx_equal(float(curated["value"]), expected):
                spot_failures.append(
                    f"Q2 2026 {band}: curated={curated['value']} raw={expected}"
                )
        curated_1999 = next(
            (
                r
                for r in rows
                if r["period_start"] == "1999-01-01"
                and r["notes"].startswith("band=Average;")
            ),
            None,
        )
        raw_1999 = float(ws.cell(7, AVG_COL).value)
        if curated_1999 is None:
            spot_failures.append("1999 Q1 Average missing curated")
        elif not approx_equal(float(curated_1999["value"]), raw_1999):
            spot_failures.append(
                f"1999 Q1 Average: curated={curated_1999['value']} raw={raw_1999}"
            )
        checks.append(
            (
                "C4",
                "Spot values vs QEP 3.1.2 Electricity columns",
                "pass" if not spot_failures else "fail",
                "; ".join(spot_failures) if spot_failures else "samples match",
            )
        )
    finally:
        wb.close()

    geos = {r["geography_code"] for r in rows}
    units = {r["unit"] for r in rows}
    bands = {
        r["notes"].split("band=", 1)[1].split(";", 1)[0]
        for r in rows
        if "band=" in r["notes"]
    }
    statuses = Counter(r["observation_status"] for r in rows)
    geo_ok = geos == {"K03000001"}
    unit_ok = units == {"p/kWh"}
    checks.append(
        (
            "C5",
            "GB geography + unit + bands",
            "pass" if geo_ok and unit_ok and "Average" in bands else "fail",
            f"geo={geos} units={units} bands={sorted(bands)} statuses={dict(statuses)}",
        )
    )

    REPORT_PATH.parent.mkdir(parents=True, exist_ok=True)
    lines = [
        "# QA report — industrial electricity prices — 2026-11-03",
        "",
        "## Scope",
        "- Indicator: `industrial-electricity-prices` (DESNZ QEP 3.1.2)",
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
