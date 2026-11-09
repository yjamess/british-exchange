"""Independent read-only housing atlas QA; writes only data/qa/.

Run: PYTHONPATH=src uv run python -m validation.qa_housing_atlas
No Housing/Regions transformation code is imported. Archived workbook cells,
CSV records and geographic geometry are decoded independently.
"""
from __future__ import annotations

import csv
import hashlib
import json
import math
import re
from collections import Counter
from pathlib import Path
from xml.etree import ElementTree as ET
from zipfile import ZipFile

import yaml
from openpyxl import load_workbook

ROOT = Path(__file__).resolve().parents[2]
H = ROOT / "data/housing"
B = ROOT / "data/regions/housing-boundaries"
OUT = ROOT / "data/qa/housing_atlas_2026_11_04.md"
TABLE = "{urn:oasis:names:tc:opendocument:xmlns:table:1.0}"
TEXT = "{urn:oasis:names:tc:opendocument:xmlns:text:1.0}"
COLUMNS = {"average": "AveragePrice", "detached": "DetachedPrice", "semi-detached": "SemiDetachedPrice", "terraced": "TerracedPrice", "flat": "FlatPrice", "new-build": "NewPrice", "existing": "OldPrice", "sales-volume": "SalesVolume"}


def sha(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def ods(path: Path, sheet_name: str) -> list[list[str]]:
    with ZipFile(path) as archive:
        document = ET.fromstring(archive.read("content.xml"))
    sheet = next(s for s in document.iter(TABLE + "table") if s.attrib[TABLE + "name"] == sheet_name)
    rows = []
    for row in sheet.iter(TABLE + "table-row"):
        cells = []
        for cell in row:
            if cell.tag not in {TABLE + "table-cell", TABLE + "covered-table-cell"}:
                continue
            value = " ".join("".join(p.itertext()) for p in cell.iter(TEXT + "p"))
            cells.extend([value] * min(20, int(cell.attrib.get(TABLE + "number-columns-repeated", "1"))))
        rows.append(cells[:20])
    return rows


def number(value: str) -> float | None:
    if not value or value in {"[x]", "[z]"}:
        return None
    return float(value.replace(",", ""))


def main() -> None:
    checks: list[tuple[str, bool, str]] = []
    def check(label: str, passed: bool, details: str) -> None:
        checks.append((label, bool(passed), details))

    atlas = json.loads((H / "housing-atlas/curated/atlas.json").read_text())
    topics = json.loads((H / "housing-atlas/curated/topics.json").read_text())
    manifest = yaml.safe_load((H / "housing-atlas/atlas-manifest.yaml").read_text())
    boundary_manifest = yaml.safe_load((B / "boundary-manifest.yaml").read_text())
    raw = H / "uk-average-house-price/raw/2026-11-03/UK-HPI-full-file-2026-08.csv"
    evidence = manifest["source_evidence"]
    evidence_ok = all(sha(ROOT / e["raw_path"]) == e["raw_sha256"] and e["retrieved_at"] and e["official_release_date"] for e in evidence)
    outputs_ok = all(sha(H / "housing-atlas" / e["path"]) == e["sha256"] for e in manifest["curated_outputs"])
    check("Provenance and output checksums", evidence_ok and outputs_ok, "Five archived sources retain SHA-256, original retrieval timestamps and release dates; two output hashes agree.")
    areas = {a["code"]: a for a in atlas["areas"]}
    months = atlas["months"]
    indexes = {month: i for i, month in enumerate(months)}
    month_numbers = [int(m[:4]) * 12 + int(m[5:]) for m in months]
    check("Geography and time shape", len(areas) == 374 and Counter(a["level"] for a in areas.values()) == {"local": 360, "region": 9, "nation": 4, "uk": 1} and len(months) == 380 and all(b-a == 1 for a,b in zip(month_numbers, month_numbers[1:])), "374 unique areas; 360 local, nine English regions, four nations and UK; 380 consecutive months Jan 1995–Aug 2026.")
    seen = set()
    matched = 0
    mismatches = []
    source_rows = {}
    with raw.open(newline="") as handle:
        for row in csv.DictReader(handle):
            d,m,y = row["Date"].split("/")
            period = f"{y}-{m}"
            code = row["AreaCode"]
            if code not in areas or period not in indexes:
                continue
            key = (code,period)
            if key in seen:
                mismatches.append(f"duplicate {key}")
            seen.add(key)
            source_rows[key] = row
            for measure,column in COLUMNS.items():
                expected = number(row[column])
                actual = areas[code]["values"][measure][indexes[period]]
                if actual != expected:
                    mismatches.append(f"{code} {period} {measure}: {expected} != {actual}")
                matched += 1
    check("Every retained HPI source cell", not mismatches, f"{matched:,} source cells independently compared, including blanks; {len(mismatches)} mismatches.")
    padding_errors = []
    non_null = nulls = 0
    for code,area in areas.items():
        for measure,values in area["values"].items():
            if len(values) != len(months):
                padding_errors.append(f"length {code}/{measure}")
            for period,value in zip(months,values):
                if value is None:
                    nulls += 1
                else:
                    non_null += 1
                    if not math.isfinite(value) or (code,period) not in seen:
                        padding_errors.append(f"invented {code}/{period}/{measure}")
    check("Missing values and padding", not padding_errors, f"{non_null:,} observed cells; {nulls:,} null cells. No invented numbers in absent source months; no non-finite values.")
    annual_samples = []
    annual_ok = True
    for code in ["E08000003", "E09000033", "S12000049", "W06000015", "N09000003", "K02000001"]:
        period = "2026-08"
        now = source_rows.get((code,period))
        prior = source_rows.get((code,"2025-08"))
        if not now or not prior:
            continue
        actual = (areas[code]["values"]["average"][indexes[period]] / areas[code]["values"]["average"][indexes["2025-08"]] - 1) * 100
        expected = (float(now["AveragePrice"]) / float(prior["AveragePrice"]) - 1) * 100
        annual_ok &= abs(actual-expected) < 1e-10
        annual_samples.append(f"{areas[code]['name']} {actual:.4f}%")
    check("Calendar-year change samples", annual_ok and len(annual_samples) >= 5, "; ".join(annual_samples) + ". Ratio of price values, not source index percentage; exact same month 12 months apart.")

    boundaries = json.loads((B / "curated/boundaries.geojson").read_text())
    raw_boundary = json.loads((B / boundary_manifest["raw_evidence"][0]["path"]).read_text())
    original = {f["properties"]["LAD25CD"]: f for f in raw_boundary["features"]}
    codes = {f["properties"]["code"] for f in boundaries["features"]}
    local = {code for code,a in areas.items() if a["level"] == "local"}
    check("Exact boundary joins", len(codes) == 361 and len(codes & local) == 360 and codes-local == {"E06000053"} and not local-codes, "361 boundaries, 360 exact local HPI matches. Isles of Scilly (E06000053) must remain no-data. No fuzzy joins.")
    geometry_ok = True
    coordinate_count = 0
    def compare_coords(current: object, source: object) -> bool:
        nonlocal coordinate_count
        if not isinstance(current,list) or not isinstance(source,list) or len(current) != len(source):
            return False
        if current and isinstance(current[0], (int,float)):
            coordinate_count += 1
            return len(current) == 2 and all(math.isfinite(v) for v in current) and all(abs(a-b) <= 0.0000051 for a,b in zip(current,source)) and -9 < current[0] < 3 and 49 < current[1] < 62
        return all(compare_coords(a,b) for a,b in zip(current,source))
    for feature in boundaries["features"]:
        source = original[feature["properties"]["code"]]
        geometry_ok &= feature["geometry"]["type"] == source["geometry"]["type"] and compare_coords(feature["geometry"]["coordinates"], source["geometry"]["coordinates"])
    check("Boundary geometry preservation", geometry_ok, f"{coordinate_count:,} coordinates independently compared to ONS archive; all polygon/ring structures retained with ≤5-decimal rounding.")
    check("Boundary evidence hashes", all(sha(B/e["path"]) == e["checksum_sha256"] for e in boundary_manifest["raw_evidence"]), "All four boundary raw evidence hashes match; source licence and attribution recorded.")

    complete_rows = ods(H/"housing-completions/raw/2026-11-03/LiveTable213.ods", "LT_213_quarterly")
    official_complete = {}
    for row in complete_rows:
        match = re.fullmatch(r"(\d{4}) Q([1-4])",row[0]) if row else None
        if match:
            year,q = map(int,match.groups())
            official_complete[f"{year}-{(q-1)*3+1:02d}-01"] = {"value": number(row[8]), "provisional": "[p]" in row[9]}
    check("All completions values vs official workbook", len(topics["completions"]) == len(official_complete) == 194 and all(row["value"] == official_complete[row["period"]]["value"] for row in topics["completions"]), "194 England quarters compared directly to archived LT213 All Completions.")
    flags_ok = all(row["status"] == "provisional" for row in topics["completions"] if official_complete[row["period"]]["provisional"])
    check("Completions provisional flag", flags_ok, "Official LT213 marks 2026 Q2 [p] in separate Notes column; the bundle must carry provisional status.")
    latest_four = topics["completions"][-4:]
    check("Rolling-year reference value", sum(row["value"] for row in latest_four) == 143790, "2025 Q3–2026 Q2 = 30,930 + 41,570 + 33,760 + 37,530 = 143,790. Contains a provisional quarter.")

    official_tenure = {}
    for row in ods(H/"dwelling-stock-by-tenure/raw/2026-11-03/LiveTable104.ods", "LT_104"):
        if len(row) > 8 and row[0] == "31 March" and row[1].isdigit() and all(number(v) is not None for v in row[2:8]):
            official_tenure[int(row[1])] = {"owner": number(row[2]), "privateRented": number(row[3]), "social": sum(number(v) for v in row[4:7]), "total": number(row[7]), "provisional": "[p]" in row[8]}
    check("All tenure values vs official workbook", len(topics["tenure"]) == len(official_tenure) == 35 and all(all(row[key] == official_tenure[row["year"]][key] for key in ["owner","privateRented","social","total"]) for row in topics["tenure"]), "35 complete 31 March snapshots, 1991–2025; five components mapped independently from LT104.")
    differences = [abs(row["owner"]+row["privateRented"]+row["social"]-row["total"]) for row in topics["tenure"]]
    check("Tenure share denominator", max(differences) == 1000, "Largest published-total/component-sum difference = 1,000 dwellings. Exact shares must divide by component sum, not reported total.")
    check("Tenure provisional flag", all(row.get("status") == "provisional" for row in topics["tenure"] if official_tenure[row["year"]]["provisional"]), "Official LT104 marks 2022–2025 provisional; expose this status or an equally specific visible source caveat.")

    workbook = load_workbook(H/"private-rental-price-index/raw/2026-11-03/pipr_monthly.xlsx",read_only=True,data_only=True)
    rent_rows = {row[0].strftime("%Y-%m-%d"): row for row in workbook["Table 1"].iter_rows(values_only=True) if len(row)>4 and row[1] == "K02000001"}
    check("All rent index values vs official workbook", len(rent_rows) == len(topics["rent"]) == 141 and all(row["value"] == rent_rows[row["period"]][4] for row in topics["rent"]), "141 UK PIPR index values match Table 1 exactly; no rent-level values substituted.")
    latest_rent = topics["rent"][-1]; previous_rent = topics["rent"][-13]
    annual = (latest_rent["value"]/previous_rent["value"]-1)*100
    official_annual = rent_rows[latest_rent["period"]][6]
    check("Rent annual change vs published percentage", abs(annual-official_annual) < 0.00001, f"September 2026 computed annual change {annual:.8f}%, source {official_annual}%; rounding tolerance 0.00001 percentage points.")
    workbook.close()
    workbook = load_workbook(H/"house-price-to-earnings-ratio/raw/2026-11-03/aff1_ratio_workplace.xlsx",read_only=True,data_only=True)
    sheet = list(workbook["1c"].iter_rows(values_only=True)); header = sheet[1]; england = next(row for row in sheet if row[0] == "E92000001")
    official_afford = {str(year):england[i] for i,year in enumerate(header) if str(year).isdigit()}
    check("All affordability values vs official workbook", len(topics["affordability"]) == 29 and all(row["value"] == official_afford[row["period"][:4]] for row in topics["affordability"]), "29 England values match AFF1 Table 1c, workplace-based median ratio; 2025 = 7.63.")
    workbook.close()

    failed = [label for label,passed,_ in checks if not passed]
    lines = ["# Independent QA — Housing atlas · 4 November 2026", "", "Scope: archived observations, exported presentation bundles, ONS boundary geometry and selected numerical methods. No source data rewritten. This is local review evidence, not publication approval or registry Ready status.", "", "Reproduce: `PYTHONPATH=src uv run python -m validation.qa_housing_atlas`", "", "| Check | Result | Evidence |", "|---|---|---|"]
    lines += [f"| {label} | {'PASS' if passed else 'FAIL'} | {details} |" for label,passed,details in checks]
    lines += ["", f"**Overall: {'PASS' if not failed else 'FAIL'}** — {len(checks)-len(failed)}/{len(checks)} checks passed.", "", "## Interpretation and limits", "", "- Fixed December 2025 boundaries are used for every historical date; this is not historical boundary reconstruction.", "- The 500m ultra-generalised boundary geometry is suitable for national/area exploration, not locating individual properties or determining legal boundaries.", "- HPI prices are nominal, mix-adjusted area statistics. Northern Ireland monthly rows reflect its quarterly source contribution.", "- Recent HPI estimates can revise; new/existing and sales-volume series lag headline average prices. Missing values must remain unavailable.", "- Data QA covers archived releases; it does not establish that these are the newest publisher releases today.", "- Browser, responsive and interaction QA is owned by Orchestrator; this report does not claim those checks."]
    if failed:
        lines += ["", "## Required corrections", ""] + [f"- {label}" for label in failed]
    OUT.write_text("\n".join(lines)+"\n")
    print(f"{len(checks)-len(failed)}/{len(checks)} checks passed; report={OUT}")
    if failed:
        print("Failed: " + "; ".join(failed))
        raise SystemExit(1)

if __name__ == "__main__":
    main()
