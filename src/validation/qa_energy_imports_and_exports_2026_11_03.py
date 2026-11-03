"""Independent QA for Energy imports and exports — DESNZ ET 1.3.

Read-only against ``data/energy/energy-imports-and-exports/``.
Does not rewrite source data.

Re-run: ``uv run python -m validation.qa_energy_imports_and_exports_2026_11_03``
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
BASE = REPO_ROOT / "data/energy/energy-imports-and-exports"
RAW = BASE / "raw/2026-11-03/ET_1.3_SEP_26.xlsx"
CSV_PATH = BASE / "curated/observations.csv"
MANIFEST_PATH = BASE / "manifest.yaml"
REPORT_PATH = REPO_ROOT / "data/qa/qa_report_energy_imports_and_exports_2026-11-03.md"

EXPECTED_SHA256 = "7e3d230e7cdcc45f3eef2b1ec5c866a30ffc26218fdd486cbae59f55eb34bf81"
EXPECTED_ROWS = 228
HEADER_ROW = 5

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
        and manifest.get("indicator_id") == "energy-imports-and-exports"
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
        ws = wb["Quarter supply and use of fuels"]
        # Locate Q2 2026 row
        q2_row = None
        for row_idx in range(HEADER_ROW + 1, (ws.max_row or HEADER_ROW) + 1):
            label = str(ws.cell(row_idx, 1).value or "")
            if "Quarter 2 2026" in label:
                q2_row = row_idx
                break
        spot_failures: list[str] = []
        if q2_row is None:
            spot_failures.append("Q2 2026 missing on raw sheet")
        else:
            raw_imp = float(ws.cell(q2_row, 3).value)
            raw_exp = float(ws.cell(q2_row, 4).value)
            for flow, col, raw_val in (
                ("Imports", 3, raw_imp),
                ("Exports", 4, raw_exp),
            ):
                curated = next(
                    (
                        r
                        for r in rows
                        if r["period_start"] == "2026-04-01"
                        and r["notes"] == f"flow={flow}"
                    ),
                    None,
                )
                if curated is None or curated["value"] == "":
                    spot_failures.append(f"Q2 2026 {flow}: missing curated")
                    continue
                if not approx_equal(float(curated["value"]), raw_val):
                    spot_failures.append(
                        f"Q2 2026 {flow}: curated={curated['value']} raw={raw_val}"
                    )
                if curated["observation_status"] != "provisional":
                    spot_failures.append(
                        f"Q2 2026 {flow}: expected provisional, got "
                        f"{curated['observation_status']}"
                    )
            if raw_exp >= 0:
                spot_failures.append(
                    f"Expected signed negative Exports in raw; got {raw_exp}"
                )
        # Q1 1998 Imports
        curated_1998 = next(
            (
                r
                for r in rows
                if r["period_start"] == "1998-01-01" and r["notes"] == "flow=Imports"
            ),
            None,
        )
        raw_1998 = float(ws.cell(HEADER_ROW + 1, 3).value)
        if curated_1998 is None or not approx_equal(
            float(curated_1998["value"]), raw_1998
        ):
            spot_failures.append(
                f"Q1 1998 Imports: curated={curated_1998} raw={raw_1998}"
            )
        checks.append(
            (
                "C4",
                "Spot values vs Quarter supply and use sheet",
                "pass" if not spot_failures else "fail",
                "; ".join(spot_failures) if spot_failures else "samples match",
            )
        )
    finally:
        wb.close()

    flows = {r["notes"] for r in rows}
    geos = {r["geography_code"] for r in rows}
    units = {r["unit"] for r in rows}
    statuses = Counter(r["observation_status"] for r in rows)
    flow_ok = flows == {"flow=Imports", "flow=Exports"}
    checks.append(
        (
            "C5",
            "Flows + geography + unit",
            "pass" if flow_ok and geos == {"K02000001"} and units == {"ktoe"} else "fail",
            f"flows={flows} geo={geos} units={units} statuses={dict(statuses)}",
        )
    )

    REPORT_PATH.parent.mkdir(parents=True, exist_ok=True)
    lines = [
        "# QA report — energy imports and exports — 2026-11-03",
        "",
        "## Scope",
        "- Indicator: `energy-imports-and-exports` (DESNZ ET 1.3)",
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
