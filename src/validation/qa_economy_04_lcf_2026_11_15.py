"""Independent QA — Economy Domain 04 LCF Cost of Living / Ledger packs.

What this script does (plain language)
--------------------------------------
It re-reads the **pinned** ONS Family Spending FYE 2025 workbooks itself,
with its own parsers (it does **not** import the Economy connectors for the
primary comparison). It then checks curated CSVs, manifests, and Ledger Notes
against those official cells. Curated Economy files are never rewritten.

Packages
--------
1. ``family-spending-by-category``  Workbook 1 Table 4.1 (real £/week)
2. ``family-spending-by-income``    Workbook 1 Tables 3.1E5 + 3.2E5
                                    (two-adult OECD, left block only)

Run from repo root::

    PYTHONPATH=src uv run python -m validation.qa_economy_04_lcf_2026_11_15

Refs: hashlib (https://docs.python.org/3/library/hashlib.html),
csv / pathlib / re (standard library),
openpyxl (https://openpyxl.readthedocs.io/),
PEP 8 (https://peps.python.org/pep-0008/).
"""

from __future__ import annotations

import csv
import hashlib
import re
from collections import Counter
from pathlib import Path
from typing import Any

import openpyxl
import yaml

ROOT = Path(__file__).resolve().parents[2]
REPORT = ROOT / "data" / "qa" / "qa_report_economy_04_lcf_2026-11-15.md"

CAT_DIR = ROOT / "data" / "economy" / "family-spending-by-category"
INC_DIR = ROOT / "data" / "economy" / "family-spending-by-income"

WB1_CAT = CAT_DIR / "raw" / "2026-11-15" / "workbook1detailedexpenditureandtrends.xlsx"
WB1_INC = INC_DIR / "raw" / "2026-11-15" / "workbook1detailedexpenditureandtrends.xlsx"
WB2_INC = INC_DIR / "raw" / "2026-11-15" / "workbook2expenditurebyincome.xlsx"

WB1_SHA = "af8d4a4464c0cc0a49195495a6e665667234379ac08293037a69e065d8931076"
WB2_SHA = "2c5d57c9b1afb97533105a83fbc0b92627154ccf62a8ef15fb483e1cb8aa2978"

CAT_N = 390
INC_N = 180
HEADLINE_N = 15
YEAR_N = 26

# Kickoff / bulletin spots (ONS Family Spending FYE 2025, released 11 Jun 2026).
SPOT_TOTAL = 676.6
SPOT_HOUSING = 118.4
SPOT_FOOD = 73.7
SPOT_TRANSPORT = 96.4
SPOT_FOOD_2001 = 82.7
SPOT_TOTAL_2001 = 756.2
SPOT_Q1_TOTAL = 407.3
SPOT_Q5_TOTAL = 1083.6
SPOT_Q1_FOOD_SHARE = 15.2
SPOT_Q1_HOUSING_SHARE = 25.7
SPOT_ALL_FOOD_SHARE = 10.9
SPOT_ALL_HOUSING_SHARE = 17.5  # published 3.2E5; bulletin rounds housing to 18%

CLASSIFICATION_FROM_CODE: dict[str, str] = {
    "1": "food",
    "2": "alcohol_tobacco",
    "3": "clothing",
    "4": "housing_fuel_power",
    "5": "household_goods",
    "6": "health",
    "7": "transport",
    "8": "communication",
    "9": "recreation",
    "10": "education",
    "11": "restaurants_hotels",
    "12": "miscellaneous",
    "1-12": "all_1_12",
    "13": "other_items",
    "total": "total",
}

QUINTILE_BANDS: tuple[str, ...] = ("lowest", "2nd", "3rd", "4th", "highest", "all")
# Left block Lowest…All = Excel columns E–J (1-based 5–10 → 0-based 4–9).
QUINTILE_COLS: tuple[int, ...] = (4, 5, 6, 7, 8, 9)

HEADLINE_CODE_RE = re.compile(r"^(?:[1-9]|1[0-3]|1-12)$")
FY_HEADER_RE = re.compile(r"^(20\d{2})-(\d{2})\d*$")


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1 << 20), b""):
            digest.update(chunk)
    return digest.hexdigest()


def load_rows(path: Path) -> list[dict[str, str]]:
    with path.open(newline="", encoding="utf-8") as handle:
        return list(csv.DictReader(handle))


def load_yaml(path: Path) -> dict[str, Any]:
    return yaml.safe_load(path.read_text(encoding="utf-8"))


def notes_map(notes: str) -> dict[str, str]:
    out: dict[str, str] = {}
    for part in notes.split(";"):
        part = part.strip()
        if "=" in part:
            key, value = part.split("=", 1)
            out[key.strip()] = value.strip()
    return out


def blob(paths: list[Path]) -> str:
    """Lowercased package text with YAML line-wrap collapsed to spaces."""
    raw = "\n".join(p.read_text(encoding="utf-8") if p.is_file() else "" for p in paths)
    return " ".join(raw.lower().split())


def published_number(raw: object) -> float | None:
    """Parse a published Family Spending cell. Bracketed ``[x]`` still counts."""
    if raw is None or raw == "":
        return None
    if isinstance(raw, bool):
        return None
    if isinstance(raw, (int, float)):
        return float(raw)
    text = str(raw).strip()
    if text in {"..", ":", "~", "-"}:
        return None
    if text.startswith("[") and text.endswith("]"):
        text = text[1:-1].strip()
    text = text.replace(",", "")
    try:
        return float(text)
    except ValueError:
        return None


def headline_code(raw: object) -> str | None:
    if raw is None:
        return None
    if isinstance(raw, (int, float)) and not isinstance(raw, bool):
        as_int = int(raw)
        if raw == as_int and 1 <= as_int <= 13:
            return str(as_int)
    text = str(raw).strip()
    if text.lower() == "total expenditure":
        return "total"
    if HEADLINE_CODE_RE.match(text):
        return text
    return None


def is_continued(raw: object) -> bool:
    return isinstance(raw, str) and "continued" in raw.lower()


def year_spec(raw: object) -> dict[str, str] | None:
    """Map Table 4.1 headers (including integer calendar years) to periods."""
    if raw is None or raw == "":
        return None
    if isinstance(raw, int) and 2000 < raw < 2100:
        token = str(raw)
    else:
        token = str(raw).strip()
    if token in {"20062", "20063"}:
        variant = "census1991_weights" if token == "20062" else "census2001_weights"
        return {
            "year_label": "2006",
            "year_variant": variant,
            "period_start": "2006-01-01",
            "period_end": "2006-12-31",
            "published_header": token,
        }
    if re.fullmatch(r"20\d{2}", token):
        year = int(token)
        return {
            "year_label": token,
            "year_variant": "calendar",
            "period_start": f"{year}-01-01",
            "period_end": f"{year}-12-31",
            "published_header": token,
        }
    fy = FY_HEADER_RE.fullmatch(token)
    if fy:
        start_y = int(fy.group(1))
        end_yy = int(fy.group(2))
        end_y = start_y + 1
        if end_yy != end_y % 100:
            return None
        return {
            "year_label": f"{start_y}-{end_yy:02d}",
            "year_variant": "financial",
            "period_start": f"{start_y}-04-01",
            "period_end": f"{end_y}-03-31",
            "published_header": token,
        }
    return None


def check(
    checks: list[tuple[str, str, str, str]],
    check_id: str,
    name: str,
    ok: bool,
    notes: str,
    *,
    warn: bool = False,
) -> None:
    if ok:
        result = "pass"
    elif warn:
        result = "warn"
    else:
        result = "fail"
    checks.append((check_id, name, result, notes))


def near(actual: float | None, expected: float, tol: float = 0.051) -> bool:
    return actual is not None and abs(actual - expected) <= tol


def parse_table_4_1(path: Path) -> list[dict[str, Any]]:
    """Independent parse of Workbook 1 Table 4.1 headline groups × years."""
    book = openpyxl.load_workbook(path, data_only=True, read_only=True)
    rows = list(book["4.1"].iter_rows(values_only=True))
    book.close()
    if len(rows) < 21:
        raise ValueError("Table 4.1 is shorter than expected")
    year_cols = [
        (idx, spec)
        for idx, cell in enumerate(rows[6])
        if (spec := year_spec(cell)) is not None
    ]
    out: list[dict[str, Any]] = []
    seen_total = False
    for row in rows[18:]:
        if not row:
            continue
        code = headline_code(row[0])
        label = row[1] if len(row) > 1 else None
        if code is None or is_continued(label):
            continue
        if code == "total" and seen_total:
            continue
        if code == "total":
            seen_total = True
        slug = CLASSIFICATION_FROM_CODE[code]
        for col_idx, spec in year_cols:
            value = published_number(row[col_idx] if col_idx < len(row) else None)
            if value is None:
                continue
            out.append(
                {
                    "classification": slug,
                    "classification_code": code,
                    "period_start": spec["period_start"],
                    "period_end": spec["period_end"],
                    "year_variant": spec["year_variant"],
                    "year_label": spec["year_label"],
                    "value": value,
                }
            )
    return out


def parse_quintile_table(path: Path, sheet: str) -> list[dict[str, Any]]:
    """Independent parse of the left (2-adult OECD) block of 3.1E5 / 3.2E5."""
    book = openpyxl.load_workbook(path, data_only=True, read_only=True)
    rows = list(book[sheet].iter_rows(values_only=True))
    book.close()
    title = " ".join(str(c) for c in (rows[1][:8] if len(rows) > 1 else []) if c)
    scale = str(rows[2][0] if len(rows) > 2 else "")
    if "2-adult" not in f"{title} {scale}".lower():
        raise ValueError(f"{sheet} left title is not 2-adult OECD: {title!r} {scale!r}")
    out: list[dict[str, Any]] = []
    for row in rows:
        if not row:
            continue
        code = headline_code(row[0])
        label = row[1] if len(row) > 1 else None
        if code is None or is_continued(label):
            continue
        slug = CLASSIFICATION_FROM_CODE[code]
        for band, col in zip(QUINTILE_BANDS, QUINTILE_COLS, strict=True):
            value = published_number(row[col] if col < len(row) else None)
            if value is None:
                continue
            out.append(
                {
                    "table": sheet,
                    "classification": slug,
                    "classification_code": code,
                    "band": band,
                    "value": value,
                }
            )
    return out


def lookup_cat(
    parsed: list[dict[str, Any]],
    classification: str,
    period_start: str,
    year_variant: str | None = None,
) -> float | None:
    matches = [
        row
        for row in parsed
        if row["classification"] == classification
        and row["period_start"] == period_start
        and (year_variant is None or row["year_variant"] == year_variant)
    ]
    if not matches:
        return None
    return float(matches[0]["value"])


def lookup_inc(
    parsed: list[dict[str, Any]],
    table: str,
    classification: str,
    band: str,
) -> float | None:
    matches = [
        row
        for row in parsed
        if row["table"] == table
        and row["classification"] == classification
        and row["band"] == band
    ]
    if not matches:
        return None
    return float(matches[0]["value"])


def main() -> int:
    checks: list[tuple[str, str, str, str]] = []

    cat_manifest = load_yaml(CAT_DIR / "manifest.yaml")
    inc_manifest = load_yaml(INC_DIR / "manifest.yaml")
    curated_cat = load_rows(CAT_DIR / "curated" / "observations.csv")
    curated_inc = load_rows(INC_DIR / "curated" / "observations.csv")

    # --- files + checksums ---
    check(
        checks,
        "C1",
        "Category files + connector",
        WB1_CAT.is_file()
        and (CAT_DIR / "manifest.yaml").is_file()
        and cat_manifest.get("connector_module")
        == "economy.connectors.family_spending_by_category",
        str(CAT_DIR),
    )
    check(
        checks,
        "C1",
        "Income files + connector",
        WB1_INC.is_file()
        and WB2_INC.is_file()
        and inc_manifest.get("connector_module")
        == "economy.connectors.family_spending_by_income",
        str(INC_DIR),
    )

    disk_wb1_cat = sha256(WB1_CAT)
    disk_wb1_inc = sha256(WB1_INC)
    disk_wb2 = sha256(WB2_INC)
    cat_ev = (cat_manifest.get("raw_evidence") or [{}])[0]
    inc_ev = {e["path"]: e for e in (inc_manifest.get("raw_evidence") or [])}

    check(
        checks,
        "C1",
        "Workbook 1 SHA-256 (category pin)",
        disk_wb1_cat == WB1_SHA == cat_ev.get("checksum_sha256"),
        f"disk={disk_wb1_cat}",
    )
    check(
        checks,
        "C1",
        "Workbook 1 SHA-256 (income pin, same file)",
        disk_wb1_inc == WB1_SHA == disk_wb1_cat,
        f"disk={disk_wb1_inc}",
    )
    check(
        checks,
        "C1",
        "Workbook 2 SHA-256 (income landing pin)",
        disk_wb2 == WB2_SHA
        == inc_ev.get("raw/2026-11-15/workbook2expenditurebyincome.xlsx", {}).get(
            "checksum_sha256"
        ),
        f"disk={disk_wb2}",
    )
    check(
        checks,
        "C1",
        "Official release 2026-06-11 + OGL v3.0",
        cat_ev.get("official_release_date") == "2026-06-11"
        and "open government licence v3.0" in str(cat_manifest.get("licence", "")).lower()
        and "open government licence v3.0" in str(inc_manifest.get("licence", "")).lower(),
        f"licence_cat={cat_manifest.get('licence')}",
    )

    # --- independent workbook parse ---
    parsed_41 = parse_table_4_1(WB1_CAT)
    parsed_31 = parse_quintile_table(WB1_INC, "3.1E5")
    parsed_32 = parse_quintile_table(WB1_INC, "3.2E5")

    check(
        checks,
        "C4",
        "Table 4.1 parsed cell count (15 × 26)",
        len(parsed_41) == CAT_N,
        f"parsed={len(parsed_41)} expected={CAT_N}",
    )
    check(
        checks,
        "C4",
        "Category curated row count",
        len(curated_cat) == CAT_N,
        f"curated={len(curated_cat)} expected={CAT_N}",
    )
    check(
        checks,
        "C4",
        "Tables 3.1E5+3.2E5 parsed cell count (90+90)",
        len(parsed_31) == 90 and len(parsed_32) == 90,
        f"3.1E5={len(parsed_31)} 3.2E5={len(parsed_32)}",
    )
    check(
        checks,
        "C4",
        "Income curated row count",
        len(curated_inc) == INC_N,
        f"curated={len(curated_inc)} expected={INC_N}",
    )

    # Full recon: Table 4.1 vs curated
    cat_index: dict[tuple[str, str, str], float] = {}
    for row in curated_cat:
        parts = notes_map(row.get("notes", ""))
        key = (
            parts.get("classification", ""),
            row["period_start"],
            parts.get("year_variant", ""),
        )
        cat_index[key] = float(row["value"])
    cat_mismatches: list[str] = []
    for cell in parsed_41:
        key = (cell["classification"], cell["period_start"], cell["year_variant"])
        curated_val = cat_index.get(key)
        if curated_val is None or abs(curated_val - cell["value"]) > 1e-9:
            cat_mismatches.append(
                f"{key}: workbook={cell['value']} curated={curated_val}"
            )
    extra_cat = set(cat_index) - {
        (c["classification"], c["period_start"], c["year_variant"]) for c in parsed_41
    }
    check(
        checks,
        "C1",
        "Table 4.1 workbook cells == curated (full recon)",
        not cat_mismatches and not extra_cat,
        f"mismatches={len(cat_mismatches)} extra={len(extra_cat)}",
    )

    inc_index: dict[tuple[str, str, str], float] = {}
    for row in curated_inc:
        parts = notes_map(row.get("notes", ""))
        table = parts.get("table", "")
        inc_index[(table, parts.get("classification", ""), parts.get("band", ""))] = float(
            row["value"]
        )
    inc_mismatches: list[str] = []
    for cell in parsed_31 + parsed_32:
        key = (cell["table"], cell["classification"], cell["band"])
        curated_val = inc_index.get(key)
        if curated_val is None or abs(curated_val - cell["value"]) > 1e-9:
            inc_mismatches.append(
                f"{key}: workbook={cell['value']} curated={curated_val}"
            )
    extra_inc = set(inc_index) - {
        (c["table"], c["classification"], c["band"]) for c in parsed_31 + parsed_32
    }
    check(
        checks,
        "C1",
        "Tables 3.1E5/3.2E5 left block == curated (full recon)",
        not inc_mismatches and not extra_inc,
        f"mismatches={len(inc_mismatches)} extra={len(extra_inc)}",
    )

    # --- bulletin / kickoff spots ---
    total_fye = lookup_cat(parsed_41, "total", "2024-04-01")
    housing_fye = lookup_cat(parsed_41, "housing_fuel_power", "2024-04-01")
    food_fye = lookup_cat(parsed_41, "food", "2024-04-01")
    transport_fye = lookup_cat(parsed_41, "transport", "2024-04-01")
    check(
        checks,
        "C2",
        "FYE 2025 all-household total £676.60 (Table 4.1 / bulletin)",
        near(total_fye, SPOT_TOTAL),
        f"workbook={total_fye} bulletin=676.60",
    )
    check(
        checks,
        "C2",
        "FYE 2025 housing (net), fuel & power £118.40",
        near(housing_fye, SPOT_HOUSING),
        f"workbook={housing_fye} bulletin=118.40",
    )
    check(
        checks,
        "C2",
        "FYE 2025 food & non-alcoholic drinks £73.70",
        near(food_fye, SPOT_FOOD),
        f"workbook={food_fye} (bulletin quotes YoY change, not this level)",
    )
    check(
        checks,
        "C2",
        "FYE 2025 transport £96.40",
        near(transport_fye, SPOT_TRANSPORT),
        f"workbook={transport_fye} bulletin=96.40",
    )
    check(
        checks,
        "C2",
        "2001-02 food £82.70 and total £756.20 (Table 4.1)",
        near(lookup_cat(parsed_41, "food", "2001-04-01"), SPOT_FOOD_2001)
        and near(lookup_cat(parsed_41, "total", "2001-04-01"), SPOT_TOTAL_2001),
        "history cells vs workbook (not in FYE 2025 bulletin headline)",
    )

    q1 = lookup_inc(parsed_31, "3.1E5", "total", "lowest")
    q5 = lookup_inc(parsed_31, "3.1E5", "total", "highest")
    all_tot = lookup_inc(parsed_31, "3.1E5", "total", "all")
    food_share_q1 = lookup_inc(parsed_32, "3.2E5", "food", "lowest")
    housing_share_q1 = lookup_inc(parsed_32, "3.2E5", "housing_fuel_power", "lowest")
    food_share_all = lookup_inc(parsed_32, "3.2E5", "food", "all")
    housing_share_all = lookup_inc(parsed_32, "3.2E5", "housing_fuel_power", "all")
    check(
        checks,
        "C2",
        "Quintile totals £407.30 / £1,083.60 / all £676.60 (3.1E5 left)",
        near(q1, SPOT_Q1_TOTAL) and near(q5, SPOT_Q5_TOTAL) and near(all_tot, SPOT_TOTAL),
        f"lowest={q1} highest={q5} all={all_tot}",
    )
    ratio = (q5 / q1) if q1 else None
    check(
        checks,
        "C2",
        "Highest/lowest total ratio ≈ 2.7 (bulletin)",
        ratio is not None and abs(ratio - 2.66) < 0.02,
        f"ratio={ratio:.2f} if computed; bulletin says 2.7 times",
    )
    check(
        checks,
        "C2",
        "Lowest quintile food share 15.2% (3.2E5 left)",
        near(food_share_q1, SPOT_Q1_FOOD_SHARE),
        f"workbook={food_share_q1}",
    )
    check(
        checks,
        "C2",
        "Lowest quintile housing (net) share 25.7% (3.2E5 left)",
        near(housing_share_q1, SPOT_Q1_HOUSING_SHARE),
        f"workbook={housing_share_q1}",
    )
    check(
        checks,
        "C2",
        "All-household food share 10.9% and housing share 17.5% (3.2E5)",
        near(food_share_all, SPOT_ALL_FOOD_SHARE)
        and near(housing_share_all, SPOT_ALL_HOUSING_SHARE),
        f"food={food_share_all} housing={housing_share_all}",
    )
    # Bulletin rounds housing to 18%; published cell is 17.5%. Documented, not a fail.
    housing_share_from_levels = 100 * SPOT_HOUSING / SPOT_TOTAL
    check(
        checks,
        "C2",
        "Bulletin 18% housing is rounded vs 3.2E5 17.5%",
        abs(housing_share_from_levels - 17.5) < 0.05 and near(housing_share_all, 17.5),
        f"118.40/676.60={housing_share_from_levels:.2f}%; bulletin states 18%; package stores 17.5%",
    )

    # --- method: real £, equivalisation, housing footnote, no 1-adult block ---
    cat_units = {r["unit"] for r in curated_cat}
    check(
        checks,
        "C3",
        "Category unit is real £/week, FYE 2025 prices",
        cat_units == {"£ per week (household average, FYE 2025 prices)"}
        and "fye 2025 prices" in blob([CAT_DIR / "manifest.yaml"]),
        f"units={cat_units}",
    )
    two_2006 = sum(
        1
        for r in curated_cat
        if r["period_start"] == "2006-01-01"
        and notes_map(r["notes"]).get("classification") == "total"
    )
    check(
        checks,
        "C3",
        "Two calendar-2006 weighting versions kept separate",
        two_2006 == 2,
        f"total_2006_rows={two_2006}",
    )
    geos = {r["geography_code"] for r in curated_cat} | {
        r["geography_code"] for r in curated_inc
    }
    check(
        checks,
        "C3",
        "UK geography K02000001 on all curated rows",
        geos == {"K02000001"},
        f"codes={sorted(geos)}",
    )

    eq_values = {notes_map(r["notes"]).get("equivalisation") for r in curated_inc}
    one_adult = [
        r
        for r in curated_inc
        if "one_adult" in notes_map(r["notes"]).get("equivalisation", "")
        or "1-adult" in r.get("notes", "").lower()
        or "one-adult" in r.get("notes", "").lower()
    ]
    check(
        checks,
        "C3",
        "2-adult OECD only — no 1-adult-reference right block",
        eq_values == {"modified_OECD_two_adult_reference"} and not one_adult,
        f"equivalisation={eq_values} one_adult_rows={len(one_adult)}",
    )
    periods_inc = {(r["period_start"], r["period_end"]) for r in curated_inc}
    check(
        checks,
        "C3",
        "Income package is FYE 2025 only (2024-04-01 → 2025-03-31)",
        periods_inc == {("2024-04-01", "2025-03-31")},
        f"periods={sorted(periods_inc)}",
    )

    cat_notes_blob = blob(
        [CAT_DIR / "manifest.yaml", CAT_DIR / "README.md", CAT_DIR / "source_register.csv"]
    )
    inc_notes_blob = blob(
        [INC_DIR / "manifest.yaml", INC_DIR / "README.md", INC_DIR / "source_register.csv"]
    )
    housing_ok = (
        "mortgage" in cat_notes_blob
        and "council tax" in cat_notes_blob
        and "mortgage" in inc_notes_blob
        and "council tax" in inc_notes_blob
    )
    check(
        checks,
        "C3",
        "Housing (net) footnote: mortgage interest / Council Tax not in group 4",
        housing_ok,
        "manifest/README document COICOP other-items placement",
    )

    # Recompute a couple of published shares from 3.1E5 £ cells (rounding).
    q1_food_gbp = lookup_inc(parsed_31, "3.1E5", "food", "lowest")
    q1_housing_gbp = lookup_inc(parsed_31, "3.1E5", "housing_fuel_power", "lowest")
    share_food_re = 100 * q1_food_gbp / q1 if q1 and q1_food_gbp else None
    share_housing_re = 100 * q1_housing_gbp / q1 if q1 and q1_housing_gbp else None
    check(
        checks,
        "C4",
        "Lowest-quintile food/housing shares round from 3.1E5 £ cells",
        share_food_re is not None
        and share_housing_re is not None
        and abs(share_food_re - SPOT_Q1_FOOD_SHARE) < 0.15
        and abs(share_housing_re - SPOT_Q1_HOUSING_SHARE) < 0.15,
        f"food_re={share_food_re:.2f} housing_re={share_housing_re:.2f} vs published 15.2 / 25.7",
    )

    mix_cat = Counter(notes_map(r["notes"]).get("classification_code") for r in curated_cat)
    check(
        checks,
        "C4",
        "Category mix: 15 headline codes × 26 years",
        len(mix_cat) == HEADLINE_N and set(mix_cat.values()) == {YEAR_N},
        str(dict(mix_cat)),
    )
    mix_inc = Counter(
        (notes_map(r["notes"]).get("table"), notes_map(r["notes"]).get("measure"))
        for r in curated_inc
    )
    check(
        checks,
        "C4",
        "Income mix: 90 weekly £ + 90 published shares",
        mix_inc.get(("3.1E5", "weekly_gbp")) == 90
        and mix_inc.get(("3.2E5", "share_of_total_expenditure")) == 90,
        str(dict(mix_inc)),
    )

    # WB2 is landing/inventory only — no all-households equivalised quintile table.
    wb2 = openpyxl.load_workbook(WB2_INC, read_only=True)
    wb2_sheets = wb2.sheetnames
    wb2.close()
    check(
        checks,
        "C4",
        "Workbook 2 has 3.3E/3.7E subsets, not 3.1E5 all-households",
        "3.1E5" not in wb2_sheets
        and "3.2E5" not in wb2_sheets
        and "3.3E" in wb2_sheets
        and "3.7E" in wb2_sheets,
        f"wb2_sheets={wb2_sheets}",
    )
    check(
        checks,
        "C4",
        "Source register: 3.3E/3.7E and 1-adult block inventoried, not curated",
        "not curated" in inc_notes_blob
        and "3.3e" in inc_notes_blob
        and "3.7e" in inc_notes_blob,
        "income source_register.csv",
    )

    # --- no invented essentials; Ledger forbid stitching ---
    invented = any(
        "essential" in r.get("notes", "").lower() for r in curated_cat + curated_inc
    )
    check(
        checks,
        "C5",
        "No invented essentials share (published 3.2E5 cells only)",
        not invented and "not a derived essentials" in inc_notes_blob,
        "source_register: published shares only; no custom basket",
    )

    stitch_needles = ("etb", "rhdi", "dgd8", "effects-of-taxes-and-benefits")
    cat_has = all(n in cat_notes_blob for n in ("etb", "rhdi"))
    inc_has = all(n in inc_notes_blob for n in stitch_needles)
    forbid = (
        ("do not" in cat_notes_blob or "not etb" in cat_notes_blob)
        and ("do not reconcile" in inc_notes_blob or "never" in inc_notes_blob)
        and "adjacent" in inc_notes_blob
    )
    check(
        checks,
        "C7",
        "Ledger Notes forbid stitching LCF + ETB + RHDI/DGD8",
        cat_has and inc_has and forbid,
        "README/manifest treat ETB as adjacent only; no reconciled budget",
    )
    check(
        checks,
        "C5",
        "Buffer/Debt packs not re-Readied by this ticket",
        True,
        "out of scope: household-financial-wealth, consumer-credit-outstanding",
    )

    price_basis = {notes_map(r["notes"]).get("price_basis") for r in curated_cat}
    check(
        checks,
        "C3",
        "Category notes price_basis=fye_2025_prices on every row",
        price_basis == {"fye_2025_prices"},
        f"price_basis={price_basis}",
    )

    passed = sum(1 for *_, result, __ in checks if result == "pass")
    warned = sum(1 for *_, result, __ in checks if result == "warn")
    failed = sum(1 for *_, result, __ in checks if result == "fail")
    verdict = "pass" if failed == 0 else "fail"
    ready = failed == 0

    lines = [
        "# QA report — Economy 04 LCF Cost / Ledger · 2026-11-15",
        "",
        "## Scope",
        "",
        "- Domain: 04 · Household Finances & Living Standards — Cost of Living / Ledger",
        "- Kickoff: `docs/agent-kickoff-validation-economy-04-lcf.md`",
        "- Handover: `docs/handover-economy-04-household-deepen.md` (Cost/Ledger section)",
        "- Packages: `family-spending-by-category` (ONS Family Spending WB1 Table 4.1),",
        "  `family-spending-by-income` (WB1 Tables 3.1E5 + 3.2E5, two-adult OECD)",
        "- Script: `validation.qa_economy_04_lcf_2026_11_15`",
        "- Out of scope: WAS Buffer (`household-financial-wealth`); BoE Weight of Debt",
        "  (`consumer-credit-outstanding`); Domain 06 ETB; UKEA RHDI / DGD8;",
        "  frontend / work-plan edits; curated rewrites.",
        "",
        "## Independence",
        "",
        "Pinned raw SHA-256 checked against manifests. Table 4.1 and the **left-hand**",
        "2-adult OECD blocks of 3.1E5 / 3.2E5 were recomputed from",
        "`workbook1detailedexpenditureandtrends.xlsx` with a Validation parser that",
        "does not import Economy connectors. Workbook 2 was opened only to confirm it",
        "is a landing/inventory pin (3.3E / 3.7E subsets). Curated CSVs were not edited.",
        "",
        "ONS bulletin (Family spending in the UK: April 2024 to March 2025, released",
        "11 June 2026) independently quotes £676.60 all-household weekly total;",
        "housing (net), fuel and power £118.40 (stated as 18%); transport £96.40;",
        "lowest / highest equivalised fifths £407.30 / £1,083.60 (2.7 times).",
        "Food £73.70 and quintile **shares** 15.2% / 25.7% are published workbook",
        "cells (3.1E5 / 3.2E5), not bulletin headline levels.",
        "",
        "## Checks",
        "",
        "| ID | Check | Result | Notes |",
        "|----|-------|--------|-------|",
    ]
    for check_id, name, result, notes in checks:
        safe = notes.replace("|", "/")
        lines.append(f"| {check_id} | {name} | **{result}** | {safe} |")

    lines.extend(
        [
            "",
            "## Method notes",
            "",
            "- **Cost of Living (category history)** is UK (`K02000001`) LCF private",
            "  households, **real** £/week at **FYE 2025 prices** (COICOP-specific CPI",
            "  deflators; group 13 also uses RPI for mortgage interest / Council Tax).",
            "  Table 4.3 current prices is inventoried, not curated. Two calendar-2006",
            "  columns are different census weighting versions, not a revision of one year.",
            "- **Ledger (income quintiles)** ranks households with the **modified OECD**",
            "  scale on a **two-adult reference** (FYE 2025 methodology update). Only the",
            "  left-hand block of 3.1E5 / 3.2E5 is curated. The right-hand 1-adult",
            "  comparison block and WB2 Tables 3.3E / 3.7E (non-retired subsets) stay raw.",
            "  £ figures are unequivalised household means.",
            "- **Housing (net), fuel and power** excludes mortgage interest, Council Tax",
            "  and Northern Ireland rates; those sit in group 13 / other expenditure items",
            "  (bulletin Figure 3 note; Table 4.1 footnote).",
            "- Bulletin housing **18%** is a rounded share of £118.40 / £676.60; Table",
            "  3.2E5 publishes **17.5%**. The package stores the published cell.",
            "- **No essentials basket** is derived. Shares are published 3.2E5 cells.",
            "- **Ledger stitching is forbidden.** LCF weekly £ must not be added to Domain",
            "  06 `effects-of-taxes-and-benefits` (ETB, FYE 2024) or to UKEA RHDI / DGD8.",
            "  Different surveys, years, and income concepts. Follow chips / adjacent view",
            "  only. A reconciled Household Ledger remains Blocked on the handover.",
            "",
            "## Summary",
            "",
            f"- **Verdict: {verdict}** ({passed} pass / {warned} warn / {failed} fail)",
        ]
    )
    if ready:
        lines.extend(
            [
                "- Recommend registry **Ready** on these two ids only:",
                "  `family-spending-by-category`, `family-spending-by-income`.",
                "- Do **not** re-Ready Buffer (`household-financial-wealth`) or Debt",
                "  (`consumer-credit-outstanding`) from this ticket.",
            ]
        )
    else:
        lines.extend(
            [
                "- Do **not** Ready these ids until fails are fixed by Economy.",
                "- Do **not** re-Ready Buffer/Debt from this ticket.",
            ]
        )
    lines.extend(
        [
            "",
            "## Blockers",
            "",
            "- None for Ready on these two pins."
            if failed == 0
            else "- See fail rows above (owner: Economy).",
            "",
            "## Economy fix tasks",
            "",
            "- None required to pass this vintage."
            if failed == 0
            else "- Owner: Economy — see fail notes; Validation will not edit curated files.",
            "",
        ]
    )
    REPORT.parent.mkdir(parents=True, exist_ok=True)
    REPORT.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(f"Wrote {REPORT.relative_to(ROOT)} — {verdict} ({passed}/{warned}/{failed})")
    return 0 if failed == 0 else 1


if __name__ == "__main__":
    raise SystemExit(main())
