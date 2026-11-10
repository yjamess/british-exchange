"""Offline source checks for Energy finalise; does not alter source datasets."""
from __future__ import annotations
import calendar
import csv
import hashlib
import json
import math
import re
from pathlib import Path
import openpyxl
import yaml

ROOT = Path(__file__).resolve().parents[2]

def main() -> None:
    result: dict[str, object] = {}
    for sector, indicator in [("energy", "uk-oil-gas-reserves"), ("energy", "fossil-fuel-dependency"), ("energy", "low-carbon-energy-share"), ("energy", "natural-gas-storage"), ("economy", "nominal-earnings"), ("energy", "major-power-producer-fuel-prices")]:
        folder = ROOT / "data" / sector / indicator
        manifest = yaml.safe_load((folder / "manifest.yaml").read_text())
        for evidence in manifest["raw_evidence"]:
            raw = folder / evidence["path"]
            assert hashlib.sha256(raw.read_bytes()).hexdigest() == evidence["checksum_sha256"], indicator
        rows = list(csv.DictReader((folder / "curated/observations.csv").open()))
        keys = [(r["period_start"], r["period_end"], r["geography_code"], r["notes"]) for r in rows]
        assert len(keys) == len(set(keys)), indicator
        assert all(r["indicator_id"] == indicator for r in rows)
        assert all("\x1f" not in value for r in rows for value in r.values() if value)
        result[indicator] = {"rows": len(rows), "raw_checksums": "pass", "unique_keys": "pass"}

    folder = ROOT / "data/economy/nominal-earnings"
    source = json.loads((folder / "raw/2026-11-07/kai7_emp.json").read_text())
    expected = {}
    for item in source["months"]:
        month = list(calendar.month_name).index(item["month"])
        expected[f'{item["year"]}-{month:02d}-01'] = float(item["value"])
    actual = {r["period_start"]: float(r["value"]) for r in csv.DictReader((folder / "curated/observations.csv").open())}
    assert actual == expected
    result["nominal-earnings"]["publisher_months_matched"] = len(actual)

    folder = ROOT / "data/energy/major-power-producer-fuel-prices"
    workbook = openpyxl.load_workbook(folder / "raw/2026-11-07/table_321.xlsx", data_only=True)
    sheet = workbook["3.2.1"]
    quarters = {"Jan to Mar": 1, "Apr to Jun": 4, "Jul to Sep": 7, "Oct to Dec": 10}
    expected = {}
    for row in sheet.iter_rows(min_row=12, values_only=True):
        year_text = str(row[0] or "").strip()
        year = re.fullmatch(r"(\d{4})(?:\s*[rp])?", year_text, re.I)
        month = quarters.get(str(row[1]).strip())
        if not year or not month:
            continue
        for col, measure in [(3, "coal_p_kwh"), (5, "oil_p_kwh"), (6, "gas_mpp_p_kwh")]:
            value = row[col]
            if isinstance(value, (int, float)):
                expected[(f'{year[1]}-{month:02d}-01', measure)] = float(value)
    actual = {}
    for row in csv.DictReader((folder / "curated/observations.csv").open()):
        measure = re.search(r"measure=([^;]+)", row["notes"])[1]
        actual[(row["period_start"], measure)] = float(row["value"])
    assert actual.keys() == expected.keys(), (len(actual), len(expected))
    assert all(math.isclose(value, expected[key], abs_tol=0.000051) for key, value in actual.items())
    result["major-power-producer-fuel-prices"]["publisher_cells_matched"] = len(actual)
    workbook.close()
    # Reproduction plus independent Section C samples from the raw DIOP table.
    from energy.connectors.manufacturing_iop_by_division import weights_from_raw
    folder = ROOT / "data/energy/manufacturing-iop-by-division"
    raw = folder / "raw/2026-11-07/diop.csv"
    weights, version = weights_from_raw(raw)
    pack = json.loads((folder / "curated/weights.json").read_text())
    assert weights == pack["observations"]
    with raw.open(encoding="utf-8-sig") as handle:
        table = list(csv.reader(handle))
    header = next(r for r in table if r and r[0] == "CDID")
    column = header.index("KM44")
    for year in ("1997", "2023", "2024"):
        source = next(float(r[column]) for r in table if r and r[0] == year)
        actual_weight = next(r["value"] for r in weights if r["period_start"] == year + "-01-01" and r["dimensions"]["series"] == "C")
        assert source == actual_weight
    result["manufacturing-iop-weights"] = {"rows": len(weights), "version": version, "exact_reproduction": "pass", "independent_section_c_samples": 3, "raw_sha256": hashlib.sha256(raw.read_bytes()).hexdigest()}
    print(json.dumps(result, indent=2))

if __name__ == "__main__":
    main()
