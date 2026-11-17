"""Shared helpers for ONS Family Spending FYE 2025 workbooks.

Approach (plain language):
- Parse headline COICOP groups only (codes 1–13, the 1–12 subtotal, and total).
- Keep notes as ``key=value`` so loaders can promote dimensions
  (https://docs.python.org/3/library/pathlib.html, PEP 8).
- Do not invent “essentials” baskets or stitch LCF to ETB/UKEA.

ONS numbering in these tables is sequential Family Spending codes, not raw
COICOP digits (publisher footnote on Table A1 / 4.1).
"""

from __future__ import annotations

import re
from typing import Any

HEADLINE_CODES: tuple[str, ...] = (
    "1",
    "2",
    "3",
    "4",
    "5",
    "6",
    "7",
    "8",
    "9",
    "10",
    "11",
    "12",
    "1-12",
    "13",
    "total",
)

CLASSIFICATION_SLUGS: dict[str, str] = {
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

QUINTILE_BANDS: tuple[tuple[str, str], ...] = (
    ("lowest", "Lowest twenty per cent"),
    ("2nd", "Second quintile group"),
    ("3rd", "Third quintile group"),
    ("4th", "Fourth quintile group"),
    ("highest", "Highest twenty per cent"),
    ("all", "All households"),
)

# Table 3.1E5 / 3.2E5 left block: Lowest … All in columns E–J (1-based 5–10).
QUINTILE_VALUE_COLS: tuple[int, ...] = (5, 6, 7, 8, 9, 10)

UK_GEOGRAPHY_CODE = "K02000001"
UK_GEOGRAPHY_LABEL = "United Kingdom"

PIN_DATE = "2026-11-15"
OFFICIAL_RELEASE_DATE = "2026-06-11"
SOURCE_VERSION = "Family Spending FYE 2025 · released 2026-06-11"
FYE_2025_START = "2024-04-01"
FYE_2025_END = "2025-03-31"

WB1_LANDING_URL = (
    "https://www.ons.gov.uk/peoplepopulationandcommunity/"
    "personalandhouseholdfinances/expenditure/datasets/"
    "familyspendingworkbook1detailedexpenditureandtrends"
)
WB2_LANDING_URL = (
    "https://www.ons.gov.uk/peoplepopulationandcommunity/"
    "personalandhouseholdfinances/expenditure/datasets/"
    "familyspendingworkbook2expenditurebyincome"
)
WB1_FILE_URL = (
    "https://www.ons.gov.uk/file?uri=/peoplepopulationandcommunity/"
    "personalandhouseholdfinances/expenditure/datasets/"
    "familyspendingworkbook1detailedexpenditureandtrends/fye2025/"
    "workbook1detailedexpenditureandtrends.xlsx"
)
WB2_FILE_URL = (
    "https://www.ons.gov.uk/file?uri=/peoplepopulationandcommunity/"
    "personalandhouseholdfinances/expenditure/datasets/"
    "familyspendingworkbook2expenditurebyincome/fye2025/"
    "workbook2expenditurebyincome.xlsx"
)
BULLETIN_URL = (
    "https://www.ons.gov.uk/peoplepopulationandcommunity/"
    "personalandhouseholdfinances/expenditure/bulletins/"
    "familyspendingintheuk/april2024tomarch2025"
)

_HEADLINE_CODE_RE = re.compile(r"^(?:[1-9]|1[0-3]|1-12)$")
_TOTAL_RE = re.compile(r"^total expenditure\s*$", re.IGNORECASE)


def notes(**parts: str) -> str:
    """Build parseable ``key=value; …`` notes (connector contract)."""
    return "; ".join(f"{k}={v}" for k, v in parts.items())


def parse_published_number(raw: object) -> tuple[float, bool] | None:
    """Return (value, small_sample_flag) or None if suppressed / missing.

    Bracketed cells ``[x]`` are published with extra caution (<20 reporting
    households). ``..`` / ``:`` / ``~`` are not turned into numbers.
    """
    if raw is None or raw == "":
        return None
    if isinstance(raw, (int, float)):
        return float(raw), False
    text = str(raw).strip()
    if text in {"..", ":", "~", "-"}:
        return None
    small = text.startswith("[") and text.endswith("]")
    if small:
        text = text[1:-1].strip()
    text = text.replace(",", "")
    try:
        return float(text), small
    except ValueError:
        return None


def headline_code_from_cell(raw: object) -> str | None:
    """Map column A to a headline code, or None for detail rows."""
    if raw is None:
        return None
    text = str(raw).strip()
    if _TOTAL_RE.match(text):
        return "total"
    if _HEADLINE_CODE_RE.match(text):
        return text
    return None


def clean_category_label(raw: object, code: str) -> str:
    if code == "total":
        return "Total expenditure"
    if raw is None or str(raw).strip() == "":
        return CLASSIFICATION_SLUGS[code]
    label = str(raw).replace("\n", " ").strip()
    label = re.sub(r"\s+", " ", label)
    label = re.sub(r"\d+$", "", label).strip()  # drop trailing footnote digits
    label = label.replace("(net)", "(net)")
    return label


def is_continued_label(raw: object) -> bool:
    return isinstance(raw, str) and "continued" in raw.lower()


def parse_table_4_year_header(raw: object) -> dict[str, str] | None:
    """Turn Table 4.1 column headers into period + grain.

    Two calendar-2006 columns exist (weighting versions). They share dates but
    must differ in ``year_variant`` so observation identity stays unique.
    """
    if raw is None or raw == "":
        return None
    token = str(raw).strip()
    if token in {"20062", "20063"}:
        variant = "census1991_weights" if token == "20062" else "census2001_weights"
        return {
            "year_label": "2006",
            "year_variant": variant,
            "published_header": token,
            "period_start": "2006-01-01",
            "period_end": "2006-12-31",
            "grain": "calendar_year",
        }
    if re.fullmatch(r"20\d{2}", token):
        year = int(token)
        return {
            "year_label": token,
            "year_variant": "calendar",
            "published_header": token,
            "period_start": f"{year}-01-01",
            "period_end": f"{year}-12-31",
            "grain": "calendar_year",
        }
    # Financial years: 2001-02, 2014-15, or 2020-217 (footnote digit glued on).
    fy = re.fullmatch(r"(20\d{2})-(\d{2})(\d*)", token)
    if fy:
        start_y = int(fy.group(1))
        end_yy = int(fy.group(2))
        end_y = start_y + 1
        if end_yy != end_y % 100:
            raise ValueError(f"Unexpected financial-year header {token!r}")
        return {
            "year_label": f"{start_y}-{end_yy:02d}",
            "year_variant": "financial",
            "published_header": token,
            "period_start": f"{start_y}-04-01",
            "period_end": f"{end_y}-03-31",
            "grain": "financial_year",
        }
    return None


def year_columns_from_header_row(header: tuple[Any, ...] | list[Any]) -> list[tuple[int, dict[str, str]]]:
    """Return (0-based column index, year spec) for Table 4.* year headers."""
    out: list[tuple[int, dict[str, str]]] = []
    for idx, cell in enumerate(header):
        spec = parse_table_4_year_header(cell)
        if spec is not None:
            out.append((idx, spec))
    return out


def lookup_notes(obs_notes: str) -> dict[str, str]:
    return {
        part.split("=", 1)[0]: part.split("=", 1)[1]
        for part in obs_notes.split("; ")
        if "=" in part
    }
