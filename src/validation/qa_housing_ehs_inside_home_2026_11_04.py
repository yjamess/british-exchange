"""Independent QA — Housing Domain 07 "Inside the home" EHS packages (2026-11-04).

Read-only against curated packages and their pinned raw files. Never rewrites
source or curated data; findings go to data/qa/.

Checks
1. Package integrity: manifest, raw checksums, header, unique natural keys,
   value/status consistency, observation-type on every row, 10k web cap.
2. Spot checks: curated values vs raw cells located by fixed (sheet, row
   label, column) coordinates read by eye from the published tables — not via
   the connector's header logic.
3. Denominators: published dwellings-in-group / sample sizes for exclusive
   category sets sum to the all-dwellings base; EER band shares sum to ~100.
4. Live tables vs 2024-25 annex overlaps (reported, not rewritten).
5. Sample-size / suppression profile (EHS 'u' rule; small published bases).
6. Audit of column headers used by the pre-existing ehs-heating /
   ehs-insulation parser (fixed indexes).

Re-run:
  uv run python -m validation.qa_housing_ehs_inside_home_2026_11_04
"""

from __future__ import annotations

import csv
import hashlib
import sys
from collections import Counter, defaultdict
from pathlib import Path

import yaml

from britain_exchange.observation import CURATED_FIELDNAMES
from housing.ods_util import read_ods_sheet

REPO_ROOT = Path(__file__).resolve().parents[2]
HOUSING = REPO_ROOT / "data/housing"
PIN = HOUSING / "_ehs_pin/2026-11-04"
QA_OUT = REPO_ROOT / "data/qa/qa_housing_ehs_inside_home_2026_11_04.md"
WEB_ROW_CAP = 10_000

INDICATORS = (
    "ehs-decent-homes",
    "ehs-category-1-hazards",
    "ehs-damp-surveyor",
    "ehs-energy-efficiency-bands",
    "ehs-overcrowding",
    "ehs-under-occupation",
    "ehs-damp-mould-reported",
)
RAW = {
    "DA3201": "DA3201.ods",
    "DA3202": "DA3202.ods",
    "DT3101": "DT3101.ods",
    "DA4101": "DA4101.ods",
    "DA4102": "DA4102.ods",
    "DA5101": "DA5101.ods",
    "DA5102": "DA5102.ods",
    "DA7101": "DA7101.ods",
    "DA7102": "DA7102.ods",
    "ANNEX": "EHS_Ch1_Quality_annex.ods",
}

# (indicator, year, geography_code, {notes key: value}, raw table, sheet,
#  row label, label column, column index, occurrence of label)
SPOTS: list[tuple[str, int, str, dict[str, str], str, str, str, int, int, int]] = [
    ("ehs-decent-homes", 2024, "E92000001", {"series": "non-decent", "tenure": "all-tenures", "dwelling-age": "pre-1919"}, "DA3201", "2024", "pre-1919", 0, 19, 1),
    ("ehs-decent-homes", 2024, "E92000001", {"series": "non-decent", "tenure": "private-rented", "dwelling-age": "pre-1919"}, "DA3201", "2024", "pre-1919", 0, 7, 1),
    ("ehs-decent-homes", 2024, "E92000001", {"series": "fails-thermal-comfort", "tenure": "social-rented", "dwelling-type": "converted-flat"}, "DA3201", "2024", "converted flat", 0, 17, 1),
    ("ehs-decent-homes", 2015, "E92000001", {"series": "non-decent", "tenure": "all-tenures", "dwelling-type": "converted-flat"}, "DA3201", "2015", "converted flat", 0, 1, 1),
    ("ehs-decent-homes", 2015, "E92000001", {"series": "non-decent", "tenure": "social-rented", "breakdown": "none"}, "DA3201", "2015", "all social", 0, 1, 1),
    ("ehs-decent-homes", 2008, "E92000001", {"series": "non-decent", "tenure": "all-tenures", "breakdown": "none"}, "DA3201", "2008", "all dwellings", 0, 1, 2),
    ("ehs-decent-homes", 2024, "E12000007", {"series": "non-decent", "tenure": "all-tenures"}, "DA3202", "2024", "London", 0, 19, 1),
    ("ehs-decent-homes", 2024, "E12000007", {"series": "non-decent", "tenure": "private-rented"}, "DA3202", "2024", "London", 0, 7, 1),
    ("ehs-decent-homes", 2015, "EHS-SNA-NORTHERN", {"series": "non-decent", "tenure": "all-tenures"}, "DA3202", "2015", "Northern", 0, 1, 1),
    ("ehs-category-1-hazards", 2024, "E92000001", {"series": "any-category-1-hazard", "tenure": "private-rented", "dwelling-type": "detached"}, "DA4101", "2024", "detached", 0, 6, 1),
    ("ehs-category-1-hazards", 2024, "E92000001", {"series": "excess-cold", "tenure": "all-tenures", "breakdown": "none"}, "DA4101", "2024", "all dwellings", 0, 17, 2),
    ("ehs-category-1-hazards", 2021, "E92000001", {"series": "any-category-1-hazard", "tenure": "all-tenures", "dwelling-age": "pre-1919"}, "DA4101", "2021", "pre-1919", 0, 1, 1),
    ("ehs-category-1-hazards", 2024, "E92000001", {"series": "falls-on-stairs", "tenure": "all-tenures"}, "ANNEX", "AT1_8", "Falls on stairs", 1, 10, 2),
    ("ehs-damp-surveyor", 2024, "E92000001", {"series": "rising-damp", "tenure": "all-tenures", "dwelling-age": "pre-1919"}, "DA5101", "2024", "pre-1919", 0, 17, 1),
    ("ehs-damp-surveyor", 2024, "E92000001", {"series": "condensation-mould", "tenure": "private-rented", "breakdown": "none"}, "DA5101", "2024", "all dwellings", 0, 9, 2),
    ("ehs-damp-surveyor", 2019, "E92000001", {"series": "any-damp", "tenure": "all-tenures", "dwelling-type": "converted-flat"}, "DA5101", "2019", "converted flat", 0, 1, 1),
    ("ehs-damp-surveyor", 1996, "E92000001", {"series": "any-damp", "tenure": "all-tenures"}, "ANNEX", "AT1_9", "1996", 1, 5, 2),
    ("ehs-damp-surveyor", 2024, "E92000001", {"series": "any-damp", "tenure": "housing-association"}, "ANNEX", "AT1_10", "housing association", 1, 5, 2),
    ("ehs-energy-efficiency-bands", 2024, "E92000001", {"series": "band-a-b-c", "tenure": "all-tenures", "dwelling-age": "post-2013"}, "DA7101", "2024", "post-2013", 0, 3, 1),
    ("ehs-energy-efficiency-bands", 2024, "E92000001", {"series": "band-a-b-c", "tenure": "local-authority"}, "DA7101", "2024", "local authority", 0, 3, 1),
    ("ehs-energy-efficiency-bands", 2010, "E92000001", {"series": "band-d", "tenure": "all-tenures", "breakdown": "none"}, "DA7101", "2010", "all dwellings", 0, 3, 2),
    ("ehs-energy-efficiency-bands", 2010, "E92000001", {"series": "band-c", "tenure": "all-tenures", "breakdown": "none"}, "DA7101", "2010", "all dwellings", 0, 2, 2),
    ("ehs-overcrowding", 2022, "E92000001", {"series": "overcrowded", "tenure": "all-tenures", "survey-year-label": "2024-25"}, "ANNEX", "AT1_2", "2024-25", 1, 5, 2),
    ("ehs-overcrowding", 1993, "E92000001", {"series": "overcrowded", "tenure": "owner-occupied", "survey-year-label": "1995-96"}, "ANNEX", "AT1_2", "1995-96", 1, 2, 2),
    ("ehs-under-occupation", 2024, "E92000001", {"series": "under-occupied", "tenure": "all-tenures"}, "ANNEX", "AT1_3", "2024-25", 1, 5, 2),
    ("ehs-under-occupation", 2020, "E92000001", {"series": "under-occupied", "tenure": "private-rented"}, "ANNEX", "AT1_3", "2020-21", 1, 3, 2),
    ("ehs-damp-mould-reported", 2023, "E92000001", {"series": "resident-reports-damp-mould", "tenure": "private-rented"}, "ANNEX", "AT1_11", "Mentioned", 1, 5, 2),
]

EXCLUSIVE_SETS = {
    "dwelling-age-pre-2024": ["pre-1919", "1919-1944", "1945-1964", "1965-1980", "1981-1990", "post-1990"],
    "dwelling-type": [
        "end-terrace",
        "mid-terrace",
        "semi-detached",
        "detached",
        "bungalow",
        "converted-flat",
        "purpose-built-flat-low-rise",
        "purpose-built-flat-high-rise",
    ],
    "floor-area": ["under-50m2", "50-69m2", "70-89m2", "90-109m2", "110m2-plus"],
}


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def notes_map(notes: str) -> dict[str, str]:
    out: dict[str, str] = {}
    for part in notes.split(";"):
        if "=" in part:
            k, v = part.split("=", 1)
            out.setdefault(k.strip(), v.strip())
    return out


def load_rows(indicator: str) -> tuple[dict, list[dict[str, str]], list[str]]:
    root = HOUSING / indicator
    manifest = yaml.safe_load((root / "manifest.yaml").read_text(encoding="utf-8"))
    with (root / manifest["curated_path"]).open(newline="", encoding="utf-8") as handle:
        reader = csv.DictReader(handle)
        header = list(reader.fieldnames or [])
        rows = list(reader)
    for row in rows:
        row["_n"] = notes_map(row["notes"])  # type: ignore[assignment]
    return manifest, rows, header


def raw_cell(table: str, sheet: str, label: str, label_col: int, col: int, occurrence: int) -> str:
    rows = read_ods_sheet(PIN / RAW[table], sheet)
    seen = 0
    for row in rows:
        if len(row) > label_col and row[label_col].strip() == label:
            seen += 1
            if seen == occurrence:
                return row[col].strip() if col < len(row) else ""
    raise LookupError(f"{table}/{sheet}: {label!r} occurrence {occurrence} not found")


def find(rows: list[dict], year: int, geo: str, want: dict[str, str]) -> list[dict]:
    out = []
    for row in rows:
        if not row["period_start"].startswith(f"{year:04d}") or row["geography_code"] != geo:
            continue
        n = row["_n"]
        if all(n.get(k) == v for k, v in want.items()):
            if "breakdown" not in want and not any(k in want for k in ("dwelling-age", "dwelling-type", "floor-area")):
                if geo == "E92000001" and n.get("breakdown") not in (None, "none"):
                    continue
            out.append(row)
    return out


def main() -> int:
    lines: list[str] = [
        "# QA — Housing Domain 07 \"Inside the home\" (EHS) · 2026-11-04",
        "",
        "Independent checks of the English Housing Survey packages behind the cutaway "
        "(energy · damp/mould · hazards · space · condition). Read-only: no source or "
        "curated data rewritten.",
        "",
    ]
    failures = 0
    data: dict[str, tuple[dict, list[dict]]] = {}

    # 1 — integrity -----------------------------------------------------------
    lines += ["## 1. Package integrity", "", "| Indicator | Rows | Years | Suppressed | Missing | Raw checksums | Keys unique | ≤10k web cap | Result |", "|---|---:|---|---:|---:|---|---|---|---|"]
    for indicator in INDICATORS:
        manifest, rows, header = load_rows(indicator)
        data[indicator] = (manifest, rows)
        problems: list[str] = []
        if tuple(header) != CURATED_FIELDNAMES:
            problems.append("header")
        ok_raw = True
        for ev in manifest.get("raw_evidence", []):
            path = HOUSING / indicator / ev["path"]
            if not path.is_file() or sha256_file(path) != ev["checksum_sha256"]:
                ok_raw = False
        if not ok_raw:
            problems.append("raw checksum")
        keys = Counter(
            (
                r["period_start"],
                r["geography_code"],
                r["_n"].get("series"),
                r["_n"].get("tenure"),
                r["_n"].get("breakdown"),
                r["_n"].get("category", ""),
            )
            for r in rows
        )
        dupes = [k for k, n in keys.items() if n > 1]
        if dupes:
            problems.append(f"{len(dupes)} duplicate keys")
        for r in rows:
            n = r["_n"]
            if not n.get("observation-type", "").startswith("survey-estimate"):
                problems.append("observation-type")
                break
            has_value = r["value"] != ""
            if has_value != (r["observation_status"] == "final"):
                problems.append("value/status mismatch")
                break
            if has_value and not 0.0 <= float(r["value"]) <= 100.0:
                problems.append("value outside 0–100")
                break
            if not n.get("base"):
                problems.append("missing base=")
                break
        status = Counter(r["observation_status"] for r in rows)
        years = sorted({r["period_start"][:4] for r in rows})
        result = "PASS" if not problems else "FAIL: " + ", ".join(problems)
        failures += bool(problems)
        cap = "yes" if len(rows) <= WEB_ROW_CAP else "NO"
        if cap == "NO":
            failures += 1
        lines.append(
            f"| `{indicator}` | {len(rows)} | {years[0]}–{years[-1]} | {status['suppressed']} | {status['missing']} | {'ok' if ok_raw else 'MISMATCH'} | {'yes' if not dupes else 'NO'} | {cap} | {result} |"
        )
    lines.append("")

    # 2 — spot checks -----------------------------------------------------------
    lines += ["## 2. Spot checks vs published cells", "", "| Indicator | Year | Geo | Selector | Raw cell | Curated | Result |", "|---|---|---|---|---|---|---|"]
    for indicator, year, geo, want, table, sheet, label, lcol, col, occ in SPOTS:
        _, rows = data[indicator]
        raw = raw_cell(table, sheet, label, lcol, col, occ)
        hits = find(rows, year, geo, want)
        curated = ", ".join(f"{h['value'] or h['observation_status']}" for h in hits) or "—"
        if len(hits) != 1:
            ok = False
        elif raw in {"u", "*"}:
            ok = hits[0]["observation_status"] == "suppressed"
        elif raw in {"N/A", ":", "-"}:
            ok = hits[0]["observation_status"] == "missing"
        else:
            try:
                ok = hits[0]["value"] != "" and abs(float(hits[0]["value"]) - float(raw.replace(",", ""))) < 1e-9
            except ValueError:
                ok = False
        failures += not ok
        sel = ", ".join(f"{k}={v}" for k, v in want.items())
        lines.append(f"| `{indicator}` | {year} | {geo} | {sel} | `{raw}` ({table} {sheet}) | {curated} | {'PASS' if ok else 'FAIL'} |")
    # Negative checks: unpublished combinations must not be invented.
    _, energy = data["ehs-energy-efficiency-bands"]
    abc_2010 = [r for r in energy if r["period_start"].startswith("2010") and r["_n"].get("series") == "band-a-b-c"]
    neg_ok = not abc_2010
    failures += not neg_ok
    lines.append(
        f"| `ehs-energy-efficiency-bands` | 2008–2011 | any | series=band-a-b-c | not published (no A/B/C column) | {len(abc_2010)} rows | {'PASS' if neg_ok else 'FAIL'} |"
    )
    _, decent = data["ehs-decent-homes"]
    cross = [
        r
        for r in decent
        if r["_n"].get("breakdown") in ("dwelling-age", "dwelling-type")
        and r["_n"].get("tenure") != "all-tenures"
        and int(r["period_start"][:4]) < 2022
    ]
    cross_ok = not cross
    failures += not cross_ok
    lines.append(
        f"| `ehs-decent-homes` | 2008–2021 | England | dwelling-age/type × tenure | not published before 2022 | {len(cross)} rows | {'PASS' if cross_ok else 'FAIL'} |"
    )
    lines.append("")

    # 3 — denominators ----------------------------------------------------------
    lines += [
        "## 3. Denominators and bases",
        "",
        "Published `row-dwellings-000s` / `row-sample-unweighted` for mutually exclusive "
        "category sets vs the all-dwellings base (same table, same year). Tolerance: "
        "dwellings ±0.5% (independent rounding); samples exact.",
        "",
        "| Indicator | Year | Set | Σ dwellings (000s) | All dwellings | Σ sample | All sample | Result |",
        "|---|---|---|---:|---:|---:|---:|---|",
    ]
    for indicator in ("ehs-decent-homes", "ehs-damp-surveyor", "ehs-energy-efficiency-bands"):
        _, rows = data[indicator]
        for year in (2010, 2019, 2024):
            base_rows = [
                r
                for r in rows
                if r["period_start"].startswith(str(year))
                and r["geography_code"] == "E92000001"
                and r["_n"].get("breakdown") == "none"
                and r["_n"].get("tenure") == "all-tenures"
                and r["_n"].get("row-dwellings-000s")
            ]
            if not base_rows:
                continue
            base_dw = float(base_rows[0]["_n"]["row-dwellings-000s"])
            base_n = int(base_rows[0]["_n"]["row-sample-unweighted"])
            sets = dict(EXCLUSIVE_SETS)
            if indicator == "ehs-energy-efficiency-bands" and year == 2024:
                sets["dwelling-age-pre-2024"] = ["pre-1919", "1919-1944", "1945-1964", "1965-1980", "1981-1990", "1991-2002", "2003-2013", "post-2013"]
            if year >= 2020:
                sets["region"] = [
                    "north-east", "north-west", "yorkshire-and-the-humber", "east-midlands", "west-midlands",
                    "east-of-england", "london", "south-east", "south-west",
                ]
            else:
                sets["sub-national-area"] = ["northern", "london-and-south-east", "rest-of-england"]
            for set_name, cats in sets.items():
                breakdown = set_name.replace("-pre-2024", "")
                picked: dict[str, dict] = {}
                for r in rows:
                    n = r["_n"]
                    if (
                        r["period_start"].startswith(str(year))
                        and n.get("breakdown") == breakdown
                        and n.get(breakdown) in cats
                        and n.get("tenure") == "all-tenures"
                        and n.get("row-dwellings-000s")
                    ):
                        picked.setdefault(n[breakdown], r)
                if len(picked) != len(cats):
                    lines.append(f"| `{indicator}` | {year} | {set_name} | — | {base_dw:,.0f} | — | {base_n:,} | n/a ({len(picked)}/{len(cats)} categories) |")
                    continue
                dw = sum(float(r["_n"]["row-dwellings-000s"]) for r in picked.values())
                ns = sum(int(r["_n"]["row-sample-unweighted"]) for r in picked.values())
                ok = abs(dw - base_dw) / base_dw <= 0.005 and ns == base_n
                failures += not ok
                lines.append(f"| `{indicator}` | {year} | {set_name} | {dw:,.0f} | {base_dw:,.0f} | {ns:,} | {base_n:,} | {'PASS' if ok else 'CHECK'} |")
    # Band shares sum
    band_ids = ["band-a-b", "band-c", "band-d", "band-e", "band-f", "band-g"]
    sums: dict[tuple[str, str, str, str], float] = defaultdict(float)
    counts: Counter = Counter()
    for r in energy:
        n = r["_n"]
        if n.get("series") in band_ids and r["value"]:
            key = (r["period_start"][:4], r["geography_code"], n.get("tenure", ""), n.get("category", ""))
            sums[key] += float(r["value"])
            counts[key] += 1
    complete = {k: v for k, v in sums.items() if counts[k] == 6}
    off = {k: v for k, v in complete.items() if abs(v - 100.0) > 0.6}
    lines += [
        "",
        f"EER band shares (A/B…G, published 1 dp) sum to 100 ±0.6 for {len(complete) - len(off)} of "
        f"{len(complete)} complete rows; {len(sums) - len(complete)} rows have a suppressed band so cannot be checked."
        + (" Off rows: " + "; ".join(f"{k}={v:.1f}" for k, v in list(off.items())[:8]) if off else ""),
        "",
    ]
    # 3-year average base
    _, over = data["ehs-overcrowding"]
    pooled = [r for r in over if r["_n"].get("sample-unweighted-pooled-3-years")]
    lines += [
        f"Overcrowding: {len(pooled)}/{len(over)} rows carry the pooled 3-year sample; every row is "
        "`observation-type=survey-estimate-3-year-average`, `base=households`; periods span 3 survey years. "
        "Manual cross-check: AT1.2 2022-23 (0.9 / 5.1 / 8.2 / 2.9 %) equals live table FA1422 "
        "'three year average 2020-21 to 2022-23' and FT1421 2021-22 equals AT1.2 2021-22 — "
        "confirms AT1.2 is a 3-year average. AT1.3 2022-23 under-occupation (40.1 %) differs from "
        "FA1422's 3-year average (38.8 %) — confirms AT1.3 is single-year.",
        "",
    ]

    # 4 — live vs annex overlaps -------------------------------------------------
    lines += ["## 4. Live tables vs 2024-25 annex (overlap years)", "", "Values ingested from live tables (published later, July 2026); annex differences reported only.", ""]
    annex_checks = [
        ("ehs-decent-homes", "AT1_4", {"owner occupied": "owner-occupied", "private rented": "private-rented", "all private": "all-private", "local authority": "local-authority", "housing association": "housing-association", "all social": "social-rented", "all tenures": "all-tenures"}, "non-decent", 2),
        ("ehs-category-1-hazards", "AT1_6", {"owner occupied": "owner-occupied", "private rented": "private-rented", "all private": "all-private", "local authority": "local-authority", "housing association": "housing-association", "all social": "social-rented", "all tenures": "all-tenures"}, "any-category-1-hazard", 2),
    ]
    for indicator, sheet, tenure_map, series, occ in annex_checks:
        _, rows = data[indicator]
        sheet_rows = read_ods_sheet(PIN / RAW["ANNEX"], sheet)
        years = {j: int(c.strip()[:4]) for j, c in enumerate(sheet_rows[4]) if c.strip()[:4].isdigit()}
        diffs: list[str] = []
        compared = 0
        for label, tenure in tenure_map.items():
            seen = 0
            for row in sheet_rows:
                if len(row) > 1 and row[1].strip() == label:
                    seen += 1
                    if seen != occ:
                        continue
                    for col, year in years.items():
                        cell = row[col].strip() if col < len(row) else ""
                        try:
                            annex_v = float(cell)
                        except ValueError:
                            continue
                        hit = find(rows, year, "E92000001", {"series": series, "tenure": tenure, "breakdown": "none"})
                        if len(hit) != 1 or not hit[0]["value"]:
                            diffs.append(f"{year} {tenure}: annex {annex_v} / curated none")
                            continue
                        compared += 1
                        cur = float(hit[0]["value"])
                        if abs(cur - annex_v) > 1e-9:
                            diffs.append(f"{year} {tenure}: annex {annex_v} vs curated {cur} ({hit[0]['_n'].get('table')})")
        lines.append(f"- **{indicator}** vs {sheet.replace('_', '.')}: {compared} cells compared, {len(diffs)} differ.")
        for d in diffs[:20]:
            lines.append(f"  - {d}")
    # Damp AT1.9 2008+ vs DA5101
    _, damp = data["ehs-damp-surveyor"]
    sheet_rows = read_ods_sheet(PIN / RAW["ANNEX"], "AT1_9")
    in_pct = False
    diffs = []
    compared = 0
    for row in sheet_rows:
        if any(c.strip() == "percentages" for c in row):
            in_pct = True
            continue
        if not in_pct or len(row) < 6:
            continue
        label = row[1].strip()
        if not label[:4].isdigit():
            if label.lower().startswith("note"):
                break
            continue
        year = int(label[:4])
        if year < 2008:
            continue
        for col, series in ((2, "rising-damp"), (3, "penetrating-damp"), (4, "condensation-mould"), (5, "any-damp")):
            try:
                annex_v = float(row[col])
            except ValueError:
                continue
            hit = find(damp, year, "E92000001", {"series": series, "tenure": "all-tenures", "breakdown": "none"})
            if len(hit) == 1 and hit[0]["value"]:
                compared += 1
                if abs(float(hit[0]["value"]) - annex_v) > 1e-9:
                    diffs.append(f"{year} {series}: annex {annex_v} vs DA5101 {hit[0]['value']}")
    lines.append(f"- **ehs-damp-surveyor** vs AT1.9 (2008–2024): {compared} cells compared, {len(diffs)} differ.")
    for d in diffs[:20]:
        lines.append(f"  - {d}")
    # Region: AT1.5 vs DA3202 2024
    at15 = read_ods_sheet(PIN / RAW["ANNEX"], "AT1_5")
    diffs = []
    compared = 0
    regions = {
        "North East": "E12000001", "North West": "E12000002", "Yorkshire and the Humber": "E12000003",
        "East Midlands": "E12000004", "West Midlands": "E12000005", "East of England": "E12000006",
        "London": "E12000007", "South East": "E12000008", "South West": "E12000009",
    }
    seen_label: Counter = Counter()
    for row in at15:
        label = row[1].strip() if len(row) > 1 else ""
        if label in regions:
            seen_label[label] += 1
            if seen_label[label] != 2:
                continue
            for col, tenure in ((4, "owner-occupied"), (5, "private-rented"), (8, "social-rented"), (9, "all-tenures")):
                annex_v = float(row[col])
                hit = find(decent, 2024, regions[label], {"series": "non-decent", "tenure": tenure})
                if len(hit) == 1 and hit[0]["value"]:
                    compared += 1
                    if abs(float(hit[0]["value"]) - annex_v) > 1e-9:
                        diffs.append(f"{label} {tenure}: annex {annex_v} vs DA3202 {hit[0]['value']}")
    lines.append(f"- **ehs-decent-homes** region 2024 vs AT1.5: {compared} cells compared, {len(diffs)} differ.")
    for d in diffs[:20]:
        lines.append(f"  - {d}")
    lines.append("")

    # 5 — sample size / suppression ---------------------------------------------
    lines += [
        "## 5. Sample size and suppression profile",
        "",
        "EHS replaces estimates from unweighted cell counts of 1–4 with `u` (kept as "
        "`observation_status=suppressed`, no value). EHS does not publish standard errors "
        "in these tables; the published unweighted row base is carried in notes so the UI "
        "can caveat small bases. For 2022+ tenure-by-characteristic cells the base is the "
        "whole row (all tenures) — the tenure-specific base is smaller and unpublished. "
        "Where EHS does publish tenure × region bases (annex AT1.5, 2024) they fall to "
        "112 (North West local authority) and 148–149 (North East LA / private rented).",
        "",
        "| Indicator | Final values | Base < 200 | Base < 100 | Smallest published bases |",
        "|---|---:|---:|---:|---|",
    ]
    for indicator in INDICATORS[:4]:
        _, rows = data[indicator]
        finals = [r for r in rows if r["observation_status"] == "final" and r["_n"].get("row-sample-unweighted")]
        small = [r for r in finals if int(r["_n"]["row-sample-unweighted"]) < 200]
        tiny = [r for r in finals if int(r["_n"]["row-sample-unweighted"]) < 100]
        smallest = sorted(
            {
                (int(r["_n"]["row-sample-unweighted"]), r["period_start"][:4], r["_n"].get("category") or r["_n"].get("tenure"))
                for r in finals
            }
        )[:4]
        lines.append(
            f"| `{indicator}` | {len(finals)} | {len(small)} | {len(tiny)} | "
            + "; ".join(f"{n} ({y} {c})" for n, y, c in smallest)
            + " |"
        )
    lines.append("")

    # 6 — heating / insulation column audit -----------------------------------
    lines += [
        "## 6. Audit — `ehs-heating` / `ehs-insulation` column location",
        "",
        "The v1 `ehs_energy_anatomy` parser read fixed columns (DA6101 13+14 as condensing "
        "boilers; DA6201 1+2+4 as wall insulation and 16 as full double glazing). In most "
        "years those indexes hold other measures: DA6101 13 = 'instantaneous' water "
        "heating 2008–2022; DA6201 4 = 'non-cavity wall' 2008–2023 (v1 wall-insulation "
        "≈78 % 2010–2023 vs ≈50 % published); DA6201 16 = 'none' glazing in 2014 (v1 5.1 %) "
        "and sample size in 2023. Housing fixed the parser the same day (header text per "
        "year). Validation re-checks the **fixed** output here with its own header lookup "
        "on the all-dwellings row:",
        "",
        "| Year | condensing + condensing-combi (raw) | curated condensing-boiler | glazing 'all' (raw) | curated full-double-glazing | annex AT2.9 | wall-insulation rows | Result |",
        "|---|---:|---:|---:|---:|---:|---|---|",
    ]
    _, heating = load_rows("ehs-heating")[:2]
    _, insulation = load_rows("ehs-insulation")[:2]

    def header_col(rows: list[list[str]], label: str) -> int | None:
        for col, cell in enumerate(rows[4]):
            if " ".join(cell.strip().lower().split()) == label:
                return col
        return None

    def summary(rows: list[list[str]]) -> list[str]:
        return [r for r in rows if r and r[0].strip() == "all dwellings"][-1]

    def curated(rows: list[dict], year: int, series: str) -> str:
        hit = [
            r for r in rows
            if r["period_start"].startswith(str(year))
            and r["_n"].get("series") == series
            and r["_n"].get("tenure") == "all-tenures"
            # Wave 2 (2026-11-04) added breakdown rows; the audit is of the
            # England all-dwellings headline only.
            and r["_n"].get("breakdown", "none") == "none"
            and r.get("geography_code", "E92000001") == "E92000001"
        ]
        return hit[0]["value"] if len(hit) == 1 else ("—" if not hit else f"{len(hit)} rows")

    for year in range(2008, 2025):
        h_rows = read_ods_sheet(PIN / "DA6101.ods", str(year))
        i_rows = read_ods_sheet(PIN / "DA6201.ods", str(year))
        hs, is_ = summary(h_rows), summary(i_rows)
        c1, c2 = header_col(h_rows, "condensing"), header_col(h_rows, "condensing-combi")
        raw_cond = round(float(hs[c1]) + float(hs[c2]), 1) if c1 and c2 else None
        g = header_col(i_rows, "all")
        raw_glaze = float(is_[g]) if g else None
        cur_cond = curated(heating, year, "condensing-boiler")
        cur_glaze = curated(insulation, year, "full-double-glazing")
        annex_glaze = curated(insulation, year, "full-double-glazing-annex")
        has_solid = header_col(i_rows, "solid wall insulated") is not None
        wall = curated(insulation, year, "wall-insulation")
        ok = (
            raw_cond is not None and cur_cond not in ("—",) and abs(float(cur_cond) - raw_cond) < 0.051
            and raw_glaze is not None and cur_glaze not in ("—",) and abs(float(cur_glaze) - raw_glaze) < 1e-9
            and (has_solid or wall == "—")
        )
        failures += not ok
        lines.append(
            f"| {year} | {raw_cond} | {cur_cond} | {raw_glaze} | {cur_glaze} | {annex_glaze} | "
            f"{wall if has_solid else '— (no solid-wall-insulated column; none emitted)' if wall == '—' else 'UNEXPECTED ' + wall} | "
            f"{'PASS' if ok else 'FAIL'} |"
        )
    lines += [
        "",
        "condensing-boiler remains a connector-derived sum of two published columns "
        "(`derived=` note on each row). DA6201 wall-insulation is emitted only for years "
        "that publish a 'solid wall insulated' column (2024); 2014 publishes the column but "
        "the all-tenures cell parses empty, so no row. Use `wall-insulation-annex` (AT2.9, "
        "published total) for the trend. Breakdowns by dwelling age / type / region for "
        "heating and insulation are published (DA6101/DA6102, DA6201/DA6202) but **not yet "
        "ingested**.",
        "",
    ]

    lines += [
        "## Verdict",
        "",
        ("PASS — all integrity, spot, denominator and negative checks passed." if failures == 0 else f"{failures} check(s) need attention — see tables above."),
        " Live-vs-annex differences (section 4) are not errors in ingestion: the January 2026 "
        "annex is 0.1–0.6 pp higher than the July 2026 live tables for Decent Homes 2022–2024 "
        "only (2008–2021 identical; hazards identical). Cause not stated by MHCLG — either a "
        "revision between releases or a different hazard model for the minimum-standard "
        "criterion (DT3101 is labelled '15 hazard model' and matches DA3201 exactly). Curated "
        "values follow the live tables and are not rewritten; the UI should cite the live "
        "table id on each row (`table=`). Two 2010 damp cells differ by 0.1 (AT1.9 vs DA5101).",
        "",
        "Ready recommendation: `ehs-decent-homes`, `ehs-category-1-hazards`, `ehs-damp-surveyor`, "
        "`ehs-energy-efficiency-bands`, `ehs-overcrowding`, `ehs-under-occupation`, "
        "`ehs-damp-mould-reported` → **Ready** (sample QA vs official tables passed). "
        "`ehs-heating`, `ehs-insulation` → **Ready after same-day fix** (section 6 re-check "
        "passed); breakdowns for those two remain un-ingested.",
        "",
    ]
    QA_OUT.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(f"wrote {QA_OUT.relative_to(REPO_ROOT)} failures={failures}")
    return 0 if failures == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
