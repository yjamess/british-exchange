"""Independent QA for Housing & Land first five indicators (2026-11-03).

Read-only against ``data/housing/``. Does not rewrite source data.
Re-run: ``uv run python -m validation.qa_housing_wave_2026_11_03``
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
from housing.ods_util import read_ods_sheet

REPO_ROOT = Path(__file__).resolve().parents[2]
HOUSING = REPO_ROOT / "data/housing"
QA_OUT = REPO_ROOT / "data/qa/housing_wave_2026_11_03.md"

INDICATORS = {
    "house-price-to-earnings-ratio": {
        "raw": "raw/2026-11-03/aff1_ratio_workplace.xlsx",
        "sha256": "585bc98112e801fc3dd45dbc5238d05c6507d4e48dc3ec3afab4867eded1c2f4",
        "rows": 29,
        "geo": "E92000001",
        "owner": "housing",
    },
    "uk-average-house-price": {
        "raw": "raw/2026-11-03/UK-HPI-full-file-2026-08.csv",
        "sha256": "b00756d0c39f356d17fadf93c42af75ccc48f7123cd666e602c65260d081b6c9",
        "rows": 701,
        "geo": "K02000001",
        "owner": "housing",
    },
    "private-rental-price-index": {
        "raw": "raw/2026-11-03/pipr_monthly.xlsx",
        "sha256": "0d79a0b23041b200748edc84526aff286379f59e2367aeeb57ebb8813517a73c",
        "rows": 141,
        "geo": "K02000001",
        "owner": "housing",
    },
    "housing-completions": {
        "raw": "raw/2026-11-03/LiveTable213.ods",
        "sha256": "97752ab5cbee6e7491b207e2eaebbfd798b0bda73c2d91300f085ef79d6031e6",
        "rows": 194,
        "geo": "E92000001",
        "owner": "housing",
    },
    "dwelling-stock-by-tenure": {
        "raw": "raw/2026-11-03/LiveTable104.ods",
        "sha256": "ecd02eb8e520e4fef7878bda35db002ca2360cb45112416db6619863b211a1fa",
        "rows": 444,
        "geo": "E92000001",
        "owner": "housing",
    },
}

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
    "update_cadence",
    "raw_evidence",
)


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def load_rows(path: Path) -> list[dict[str, str]]:
    with path.open(newline="", encoding="utf-8") as handle:
        return list(csv.DictReader(handle))


def check_indicator(indicator_id: str, meta: dict) -> list[tuple[str, str, str, str]]:
    base = HOUSING / indicator_id
    raw = base / meta["raw"]
    curated = base / "curated/observations.csv"
    manifest_path = base / "manifest.yaml"
    results: list[tuple[str, str, str, str]] = []

    file_sha = sha256_file(raw)
    manifest = yaml.safe_load(manifest_path.read_text(encoding="utf-8"))
    manifest_sha = manifest["raw_evidence"][0]["checksum_sha256"]
    c1 = file_sha == meta["sha256"] == manifest_sha
    results.append(
        (f"{indicator_id}:C1", "Checksum raw=freeze=manifest", "pass" if c1 else "fail", file_sha)
    )

    missing = [f for f in REQUIRED_MANIFEST_FIELDS if not manifest.get(f)]
    geo = str(manifest.get("geography", ""))
    geo_ok = meta["geo"] in geo or (
        meta["geo"] == "E92000001" and "England" in geo
    ) or (
        meta["geo"] == "K02000001"
        and ("United Kingdom" in geo or "UK" in geo)
    )
    c2 = not missing and manifest.get("agent_owner") == meta["owner"] and geo_ok
    results.append(
        (
            f"{indicator_id}:C2",
            "Manifest contract + owner + geography",
            "pass" if c2 else "fail",
            f"missing={missing or 'none'}; geo_ok={geo_ok}",
        )
    )

    rows = load_rows(curated)
    header_ok = tuple(rows[0].keys()) == CURATED_FIELDNAMES if rows else False
    # DictReader key order from file
    with curated.open(newline="", encoding="utf-8") as handle:
        header = tuple(next(csv.reader(handle)))
    header_ok = header == CURATED_FIELDNAMES
    results.append(
        (f"{indicator_id}:C3", "Curated Observation schema", "pass" if header_ok else "fail", "")
    )

    key_counts = Counter((r["indicator_id"], r["period_start"], r["notes"]) for r in rows)
    dupes = sum(1 for _, n in key_counts.items() if n > 1)
    c4 = len(rows) == meta["rows"] and dupes == 0 and all(r["indicator_id"] == indicator_id for r in rows)
    results.append(
        (
            f"{indicator_id}:C4",
            "Row count / uniqueness",
            "pass" if c4 else "fail",
            f"rows={len(rows)} expected={meta['rows']} dupes={dupes}",
        )
    )

    # Spot recompute per indicator
    spot_ok = True
    spot_note = ""
    if indicator_id == "house-price-to-earnings-ratio":
        wb = load_workbook(raw, data_only=True, read_only=True)
        ws = wb["1c"]
        england = None
        header = None
        for i, row in enumerate(ws.iter_rows(values_only=True), start=1):
            if i == 2:
                header = list(row)
            if row and str(row[0]) == "E92000001":
                england = row
                break
        wb.close()
        header_map = {str(h): idx for idx, h in enumerate(header or []) if h is not None}
        idx = {r["period_start"][:4]: r for r in rows}
        for year in ("1997", "2021", "2025"):
            col = header_map.get(year)
            if col is None:
                spot_ok = False
                break
            expected = float(england[col])
            got = float(idx[year]["value"])
            if abs(expected - got) > 1e-9:
                spot_ok = False
        spot_note = "AFF1 1c England 1997/2021/2025"
    elif indicator_id == "uk-average-house-price":
        with raw.open(newline="", encoding="utf-8") as handle:
            uk = [r for r in csv.DictReader(handle) if r["RegionName"] == "United Kingdom"]
        if len(uk) != len(rows):
            spot_ok = False
        last = rows[-1]
        if abs(float(last["value"]) - float(uk[-1]["AveragePrice"])) > 1e-6:
            spot_ok = False
        spot_note = f"UK rows={len(uk)} last={uk[-1]['AveragePrice']}"
    elif indicator_id == "private-rental-price-index":
        wb = load_workbook(raw, data_only=True, read_only=True)
        ws = wb["Table 1"]
        uk_n = 0
        for row in ws.iter_rows(values_only=True):
            if row and row[1] == "K02000001":
                uk_n += 1
        wb.close()
        spot_ok = uk_n == len(rows)
        spot_note = f"PIPR UK index rows={uk_n}"
    elif indicator_id == "housing-completions":
        table = read_ods_sheet(raw, "LT_213_quarterly")
        header = next(r for r in table if r and r[0] == "Period")
        col = header.index("All Completions")
        n = sum(1 for r in table if r and r[0][:4].isdigit() and " Q" in r[0])
        spot_ok = n == len(rows)
        spot_note = f"ODS quarterly periods={n} col={col}"
    elif indicator_id == "dwelling-stock-by-tenure":
        tenures = {r["notes"].split("tenure=")[1].split(";")[0] for r in rows if "tenure=" in r["notes"]}
        spot_ok = len(tenures) == 6 and len(rows) == meta["rows"]
        spot_note = f"tenures={sorted(tenures)}"

    results.append(
        (
            f"{indicator_id}:C5",
            "Independent raw recompute / spot check",
            "pass" if spot_ok else "fail",
            spot_note,
        )
    )
    return results


def main() -> int:
    all_results: list[tuple[str, str, str, str]] = []
    for indicator_id, meta in INDICATORS.items():
        all_results.extend(check_indicator(indicator_id, meta))

    lines = [
        "# QA — Housing wave 2026-11-03",
        "",
        "Independent read-only checks against `data/housing/`.",
        "",
        "| ID | Check | Result | Notes |",
        "|----|-------|--------|-------|",
    ]
    for check_id, name, result, notes in all_results:
        lines.append(f"| {check_id} | {name} | {result} | {notes} |")

    fails = [r for r in all_results if r[2] == "fail"]
    verdict = "fail" if fails else "pass"
    lines.extend(["", f"Overall: **{verdict}**", ""])
    QA_OUT.parent.mkdir(parents=True, exist_ok=True)
    QA_OUT.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print("\n".join(lines))
    print(f"wrote {QA_OUT}")
    return 1 if fails else 0


if __name__ == "__main__":
    sys.exit(main())
