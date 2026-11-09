"""Independent QA for Housing & Land land indicators (2026-11-04).

Read-only against ``data/housing/{green-belt-area,land-use-stock,planning-decisions-granted}/``.
Re-run: ``uv run python -m validation.qa_housing_land_2026_11_04``
"""

from __future__ import annotations

import csv
import hashlib
import sys
from collections import Counter
from pathlib import Path

import yaml

from britain_exchange.observation import CURATED_FIELDNAMES
from housing.ods_util import read_ods_sheet

REPO_ROOT = Path(__file__).resolve().parents[2]
HOUSING = REPO_ROOT / "data/housing"
QA_OUT = REPO_ROOT / "data/qa/qa_housing_land_2026_11_04.md"

INDICATORS = {
    "green-belt-area": {
        "raw": "raw/2026-11-04/Live_Tables_Green_Belt_Statistics_2025-26.ods",
        "rows_min": 200,
        "geo": "E92000001",
        "owner": "housing",
    },
    "land-use-stock": {
        "raw": "raw/2026-11-04/Live_Tables_Land_Use_Stock_2022.ods",
        "rows": 14,
        "geo": "E92000001",
        "owner": "housing",
    },
    "planning-decisions-granted": {
        "raw": "raw/2026-11-04/Tables_P120_to_P138_MJPSI_PIPTDCC.ods",
        # 57 quarters × received + decided + granted
        "rows": 171,
        "geo": "E92000001",
        "owner": "housing",
    },
}

REQUIRED = (
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
    "update_cadence",
    "raw_evidence",
)


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def main() -> int:
    results: list[tuple[str, str, str, str]] = []
    for indicator_id, meta in INDICATORS.items():
        base = HOUSING / indicator_id
        raw = base / meta["raw"]
        curated = base / "curated/observations.csv"
        manifest = yaml.safe_load((base / "manifest.yaml").read_text(encoding="utf-8"))
        file_sha = sha256_file(raw)
        manifest_sha = manifest["raw_evidence"][0]["checksum_sha256"]
        c1 = file_sha == manifest_sha
        results.append(
            (f"{indicator_id}:C1", "Checksum raw=manifest", "pass" if c1 else "fail", file_sha)
        )

        missing = [f for f in REQUIRED if not manifest.get(f)]
        c2 = (
            not missing
            and manifest.get("agent_owner") == meta["owner"]
            and meta["geo"] in str(manifest.get("geography", ""))
        )
        results.append(
            (
                f"{indicator_id}:C2",
                "Manifest contract + owner + geography",
                "pass" if c2 else "fail",
                f"missing={missing or 'none'}",
            )
        )

        with curated.open(newline="", encoding="utf-8") as handle:
            reader = csv.reader(handle)
            header = tuple(next(reader))
            fieldnames = list(header)
            rows = [dict(zip(fieldnames, row, strict=False)) for row in reader]
        header_ok = header == CURATED_FIELDNAMES
        results.append(
            (f"{indicator_id}:C3", "Curated Observation schema", "pass" if header_ok else "fail", "")
        )

        dupes = sum(
            1
            for _, n in Counter(
                (r["indicator_id"], r["period_start"], r["geography_code"], r["notes"]) for r in rows
            ).items()
            if n > 1
        )
        if "rows" in meta:
            count_ok = len(rows) == meta["rows"]
        else:
            count_ok = len(rows) >= meta["rows_min"]
        c4 = count_ok and dupes == 0 and all(r["indicator_id"] == indicator_id for r in rows)
        results.append(
            (
                f"{indicator_id}:C4",
                "Row count / uniqueness",
                "pass" if c4 else "fail",
                f"rows={len(rows)} dupes={dupes}",
            )
        )

        spot_ok = True
        spot_note = ""
        if indicator_id == "green-belt-area":
            table = read_ods_sheet(raw, "Area_since_1997")
            eng = [r for r in rows if r["geography_code"] == "E92000001"]
            last = eng[-1]
            # Latest Area_by_LA England = 1,632,730
            area = read_ods_sheet(raw, "Area_by_LA")
            england_area = next(r for r in area if r and r[0] == "England")
            expected = float(england_area[2].replace(",", ""))
            spot_ok = abs(float(last["value"]) - expected) < 1e-6 and len(eng) >= 15
            spot_note = f"england_points={len(eng)} last={last['value']} expected={expected}"
        elif indicator_id == "land-use-stock":
            shares = [r for r in rows if "measure=share" in r["notes"] and "series=developed" in r["notes"]]
            spot_ok = len(shares) == 1 and abs(float(shares[0]["value"]) - 8.7) < 1e-9
            spot_note = f"developed_share={shares[0]['value'] if shares else None}"
        elif indicator_id == "planning-decisions-granted":
            table = read_ods_sheet(raw, "LT_P120")
            q_rows = [r for r in table if r and len(r) > 4 and " Q" in (r[1] or "")]
            series = {r["notes"].split("series=")[1].split(";")[0] for r in rows if "series=" in r["notes"]}
            expected_series = {
                "applications-received",
                "applications-decided",
                "decisions-granted",
            }
            spot_ok = (
                len(rows) == len(q_rows) * 3
                and series == expected_series
                and float(rows[-1]["value"]) > 0
            )
            spot_note = (
                f"rows={len(rows)} ods_quarters={len(q_rows)} "
                f"series={sorted(series)} last={rows[-1]['value']}"
            )

        results.append(
            (
                f"{indicator_id}:C5",
                "Independent raw recompute / spot check",
                "pass" if spot_ok else "fail",
                spot_note,
            )
        )

    lines = [
        "# QA — Housing land indicators 2026-11-04",
        "",
        "Independent read-only checks for green-belt-area, land-use-stock, planning-decisions-granted.",
        "",
        "| ID | Check | Result | Notes |",
        "|----|-------|--------|-------|",
    ]
    for check_id, name, result, notes in results:
        lines.append(f"| {check_id} | {name} | {result} | {notes} |")
    fails = [r for r in results if r[2] == "fail"]
    verdict = "fail" if fails else "pass"
    lines.extend(["", f"Overall: **{verdict}**", ""])
    QA_OUT.parent.mkdir(parents=True, exist_ok=True)
    QA_OUT.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print("\n".join(lines))
    print(f"wrote {QA_OUT}")
    return 1 if fails else 0


if __name__ == "__main__":
    sys.exit(main())
