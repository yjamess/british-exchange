"""Shared helpers for the PSS July 2026 outturn pins.

Four Economy indicators share one accredited HM Treasury release:

- ``tes-by-function`` — Chapter 5, Table 5.4 (TES / COFOG, nominal £ million)
- ``tme-del-ame`` — Chapter 1, Table 1.1 (Total DEL, Departmental AME, Other AME)
- ``tme-del-ame-real`` — Chapter 1, Table 1.2 (those control totals in 2025-26 prices)
- ``tes-by-function-real`` — Chapter 4, Table 4.3 (functions in 2025-26 prices, £ billion)

Real-terms helpers live here. They do not deflate monthly EBFT.

What this module does, and why:

1. Lock the five outturn financial years (no PESA plan years).
2. Turn a financial-year label such as ``2024-25`` into 1 April–31 March dates.
3. Read whole £ million cells and fail if a cell is blank or not a whole number.
4. Build ``key=value`` notes so later loaders can filter on series and classification.
5. Read the Ready monthly EBFT pin **without writing it**, so each package can
   document the financial-year gap. These HMT tables are not a split of EBFT.

Each indicator still has its own connector, workbook, and ``data/economy`` folder.
Best practices: pathlib, type hints, fail loudly.
https://docs.python.org/3/library/pathlib.html
https://docs.python.org/3/library/typing.html
https://peps.python.org/pep-0008/
"""

from __future__ import annotations

import csv
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Sequence

import openpyxl
import yaml

from britain_exchange.checksum import sha256_file
from britain_exchange.observation import ObservationStatus
from britain_exchange.paths import ECONOMY_DATA

# Accredited outturn release. First published 16 Jul 2026, file updated 29 Jul 2026.
PSS_LANDING_URL = (
    "https://www.gov.uk/government/statistics/public-spending-statistics-release-july-2026"
)
OFFICIAL_RELEASE_DATE = "2026-07-29"
SOURCE_VERSION = "PSS July 2026 (updated 2026-07-29)"
LICENCE = "Open Government Licence v3.0"
PUBLISHER = "HM Treasury"

# ONS UK code. The tables are public-sector financial-year totals, not a region.
GEO_CODE = "K02000001"
GEO_LABEL = "United Kingdom"

UNIT = "£ million, nominal, financial year"

# Real-terms tables use this price base. 2025-26 real equals 2025-26 nominal.
PRICE_BASE_YEAR = "2025-26"
GDP_DEFLATOR_NOTE = (
    "Real-terms figures are the nominal figures adjusted to 2025-26 price levels "
    "using GDP deflators from the Office for National Statistics (released 30 June 2026)."
)
OBR_PLAN_DEFLATOR_NOTE = (
    "PESA plan years are not in these pins. Where PESA prints plan years, it also "
    "uses OBR GDP deflator forecasts from the 3 March 2026 Economic and fiscal outlook. "
    "That forecast deflator is not applied here."
)
REAL_NOT_EBFT_NOTE = (
    "These rows are official HMT real-terms financial-year tables. "
    "They are not monthly EBFT divided by CPIH or by the GDP deflator. "
    "Do not treat real HMT table TME as a real monthly EBFT series."
)

# PSS outturn only. PESA plan years (2026-27 onward) must not enter these pins.
OUTTURN_YEARS: tuple[str, ...] = (
    "2021-22",
    "2022-23",
    "2023-24",
    "2024-25",
    "2025-26",
)
FIRST_ESTIMATE_YEAR = "2025-26"

# Same outturn total on Table 5.4 and Table 1.1. Not monthly EBFT.
PUBLISHED_TABLE_TME: dict[str, float] = {
    "2021-22": 1_040_888.0,
    "2022-23": 1_160_692.0,
    "2023-24": 1_230_807.0,
    "2024-25": 1_290_012.0,
    "2025-26": 1_360_122.0,
}

# Discovery comparison (PSF release 2026-10-20), quoted only as a cross-check
# against a fresh read of the Ready pin. Do not rescale HMT rows onto these.
DISCOVERY_EBFT_FY_SUMS: dict[str, float] = {
    "2023-24": 1_258_195.0,
    "2024-25": 1_294_828.0,
}

_FY_CELL = re.compile(r"^20\d{2}-\d{2}$")
_FY_LABEL = re.compile(r"^(20\d{2})-(\d{2})$")
_FOOTNOTE = re.compile(r"\s*\(\d+\)\s*$")

EBFT_CURATED = ECONOMY_DATA / "total-managed-expenditure" / "curated" / "observations.csv"
EBFT_MANIFEST = ECONOMY_DATA / "total-managed-expenditure" / "manifest.yaml"


def normalise_label(raw: object) -> str:
    """Collapse whitespace so merged Excel labels match stable keys."""
    text = str(raw or "").replace("\xa0", " ").replace("\n", " ")
    return re.sub(r"\s+", " ", text).strip()


def strip_trailing_footnote(text: str) -> str:
    """Remove one trailing ``(n)`` footnote marker, with or without a space.

    ``Total DEL (6)`` and ``Defence(2)`` both lose the marker.
    ``Total resource DEL`` is unchanged — there is no footnote to remove.
    """
    return _FOOTNOTE.sub("", text)


def match_key(raw: object) -> str:
    """Lower-case label with one trailing footnote number removed.

    ``Total DEL (6)`` and ``Total DEL`` are the same published row.
    ``Total resource DEL`` stays different — that is not Total DEL.
    """
    return strip_trailing_footnote(normalise_label(raw)).casefold()


def financial_year_bounds(financial_year: str) -> tuple[str, str]:
    """Map ``2024-25`` to 2024-04-01 .. 2025-03-31 (UK financial year)."""
    match = _FY_LABEL.fullmatch(financial_year.strip())
    if not match:
        raise ValueError(f"Unexpected financial-year label: {financial_year!r}")
    start_year = int(match.group(1))
    end_short = int(match.group(2))
    if (start_year + 1) % 100 != end_short:
        raise ValueError(f"Financial year does not span twelve months: {financial_year}")
    return f"{start_year:04d}-04-01", f"{start_year + 1:04d}-03-31"


def status_for_year(financial_year: str) -> ObservationStatus:
    """2025-26 is HMT's first estimate. Earlier pinned years are outturn."""
    if financial_year == FIRST_ESTIMATE_YEAR:
        return "estimated"
    if financial_year in OUTTURN_YEARS:
        return "final"
    raise ValueError(f"Year {financial_year} is outside the PSS outturn pin")


def as_million(raw: object, *, context: str) -> float:
    """Parse one published £ million cell. Blank or fractional cells fail."""
    if isinstance(raw, str):
        text = raw.strip().replace(",", "")
        if text in {"", "-", "..", "…"}:
            raise ValueError(f"Missing £ million value ({context})")
        value = float(text)
    elif isinstance(raw, bool) or raw is None:
        raise ValueError(f"Missing £ million value ({context})")
    elif isinstance(raw, (int, float)):
        value = float(raw)
    else:
        raise ValueError(f"Unexpected cell {raw!r} ({context})")
    if abs(value - round(value)) > 1e-6:
        raise ValueError(f"Expected a whole £ million, got {raw!r} ({context})")
    return float(round(value))


def as_billion(raw: object, *, context: str) -> float:
    """Parse one published £ billion cell printed to one decimal place.

    Whole numbers such as ``94`` are kept as ``94.0``. A second decimal fails.
    Values are returned as tenths divided by 10 so ``250.8`` stays ``250.8``.
    """
    if isinstance(raw, str):
        text = raw.strip().replace(",", "")
        if text in {"", "-", "..", "…"}:
            raise ValueError(f"Missing £ billion value ({context})")
        value = float(text)
    elif isinstance(raw, bool) or raw is None:
        raise ValueError(f"Missing £ billion value ({context})")
    elif isinstance(raw, (int, float)):
        value = float(raw)
    else:
        raise ValueError(f"Unexpected cell {raw!r} ({context})")
    scaled = value * 10
    tenths = round(scaled)
    if abs(scaled - tenths) > 1e-4:
        raise ValueError(
            f"Expected £ billion to 1 decimal place, got {raw!r} ({context})"
        )
    return tenths / 10


def structured_notes(fields: Sequence[tuple[str, str]]) -> str:
    """Join notes as ``key=value; key2=value2`` (connector contract).

    Values cannot contain ``;`` or ``=`` — those characters are the grammar.
    See docs/connector-contract.md.
    """
    pieces: list[str] = []
    for key, value in fields:
        if value == "":
            continue
        if ";" in value or "=" in value:
            raise ValueError(f"Notes value must not contain ';' or '=': {key}={value!r}")
        pieces.append(f"{key}={value}")
    return "; ".join(pieces)


def notes_map(notes: str) -> dict[str, str]:
    """Split structured notes. First value wins if a key is repeated."""
    out: dict[str, str] = {}
    for part in notes.split(";"):
        chunk = part.strip()
        if not chunk or "=" not in chunk:
            continue
        key, value = chunk.split("=", 1)
        key = key.strip()
        if key and key not in out:
            out[key] = value.strip()
    return out


def find_outturn_header(
    rows: Sequence[Sequence[object]],
) -> tuple[int, int, tuple[int, ...]]:
    """Find the header row whose year cells are exactly the five outturn years.

    Returns ``(header_row_index, label_column, year_columns)``.
    A wider header (PESA plans) is a hard error, not something we trim.
    """
    for row_index, row in enumerate(rows):
        hits: list[tuple[int, str]] = []
        for col_index, cell in enumerate(row):
            text = normalise_label(cell)
            if _FY_CELL.fullmatch(text):
                hits.append((col_index, text))
        if not hits:
            continue
        labels = tuple(label for _, label in hits)
        if labels != OUTTURN_YEARS:
            raise ValueError(
                "Year header must be exactly "
                f"{', '.join(OUTTURN_YEARS)} (PSS outturn only). "
                f"Row {row_index + 1} has {labels}. PESA plan years are out of scope."
            )
        label_col = hits[0][0] - 1
        if label_col < 0:
            raise ValueError("Year columns start at column A; there is no label column")
        year_cols = tuple(col for col, _ in hits)
        return row_index, label_col, year_cols
    raise ValueError("No financial-year header found in the worksheet")


def find_year_header(
    rows: Sequence[Sequence[object]],
    expected_years: Sequence[str],
) -> tuple[int, int, tuple[int, ...]]:
    """Find a header whose year cells are exactly ``expected_years``, in order.

    Same rule as :func:`find_outturn_header`, for a longer outturn span such as
    Table 4.3 (2003-04 to 2025-26). A wider header that includes plan years fails.
    """
    expected = tuple(expected_years)
    if not expected:
        raise ValueError("expected_years is empty")
    for row_index, row in enumerate(rows):
        hits: list[tuple[int, str]] = []
        for col_index, cell in enumerate(row):
            text = normalise_label(cell)
            if _FY_CELL.fullmatch(text):
                hits.append((col_index, text))
        if not hits:
            continue
        labels = tuple(label for _, label in hits)
        if labels != expected:
            raise ValueError(
                "Year header must be exactly "
                f"{expected[0]} to {expected[-1]} "
                f"({len(expected)} outturn years, no plan years). "
                f"Row {row_index + 1} starts {labels[0]} and has {len(labels)} years."
            )
        label_col = hits[0][0] - 1
        if label_col < 0:
            raise ValueError("Year columns start at column A; there is no label column")
        year_cols = tuple(col for col, _ in hits)
        return row_index, label_col, year_cols
    raise ValueError("No financial-year header found in the worksheet")


def financial_year_span(first: str, last: str) -> tuple[str, ...]:
    """Inclusive list of financial-year labels from ``first`` through ``last``."""
    start_match = _FY_LABEL.fullmatch(first.strip())
    end_match = _FY_LABEL.fullmatch(last.strip())
    if not start_match or not end_match:
        raise ValueError(f"Need financial-year labels, got {first!r} .. {last!r}")
    start_year = int(start_match.group(1))
    end_year = int(end_match.group(1))
    if end_year < start_year:
        raise ValueError(f"Financial-year span runs backwards: {first} .. {last}")
    labels: list[str] = []
    for year in range(start_year, end_year + 1):
        label = f"{year}-{str(year + 1)[-2:]}"
        financial_year_bounds(label)
        labels.append(label)
    return tuple(labels)


def status_for_pinned_year(financial_year: str, allowed: Sequence[str]) -> ObservationStatus:
    """Mark the first-estimate year estimated. Every earlier pinned year is final.

    A start year after 2025 is a PESA plan year and fails even if it was passed in.
    """
    if financial_year not in set(allowed):
        raise ValueError(
            f"Year {financial_year} is outside this pin. PESA plan years are out of scope."
        )
    start_year = int(financial_year[:4])
    if start_year > 2025:
        raise ValueError(f"Plan year {financial_year} is out of scope")
    if financial_year == FIRST_ESTIMATE_YEAR:
        return "estimated"
    return "final"


# Table 4.2 / 4.3 history. Outturn only, through the 2025-26 price-base year.
LONG_RUN_OUTTURN_YEARS: tuple[str, ...] = financial_year_span("2003-04", FIRST_ESTIMATE_YEAR)


def load_sheet_rows(path: Path, sheet_name: str) -> list[tuple[object, ...]]:
    """Load one worksheet with openpyxl. Values only — formulas are not kept.

    ``data_only=True`` reads cached numbers. PSS files store values, not
    formulas that need Excel to recalculate.
    https://openpyxl.readthedocs.io/en/stable/api/openpyxl.reader.excel.html
    """
    workbook = openpyxl.load_workbook(path, read_only=True, data_only=True)
    try:
        if sheet_name not in workbook.sheetnames:
            raise ValueError(
                f"Sheet {sheet_name!r} is not in {path.name}. "
                f"Sheets: {workbook.sheetnames}"
            )
        worksheet = workbook[sheet_name]
        return [tuple(row) for row in worksheet.iter_rows(values_only=True)]
    finally:
        workbook.close()


def require_pinned_checksum(path: Path, expected_sha256: str) -> str:
    """Re-hash the file on disk and refuse a different PSS workbook."""
    digest = sha256_file(path)
    if digest != expected_sha256:
        raise RuntimeError(
            f"Checksum mismatch for {path.name}. Got {digest}, "
            f"expected pinned {expected_sha256}. "
            "Refusing to curate a different PSS file."
        )
    return digest


def require_xlsx(path: Path) -> None:
    """Reject an HTML error page saved with an .xlsx name."""
    signature = path.read_bytes()[:4]
    if signature != b"PK\x03\x04":
        raise RuntimeError(f"{path.name} is not an xlsx zip (missing PK header)")


def format_million(value: float) -> str:
    """Whole £ million with a thousands separator, keeping the sign."""
    return f"{value:,.0f}"


def format_billion(value: float) -> str:
    """£ billion at one decimal place, with a thousands separator."""
    return f"{value:,.1f}"


@dataclass(frozen=True, slots=True)
class EbftYearComparison:
    """One derived April–March sum of monthly EBFT, beside HMT table TME."""

    financial_year: str
    hmt_table_tme: float
    ebft_months: int
    ebft_sum: float | None
    difference: float | None
    complete: bool


@dataclass(frozen=True, slots=True)
class EbftGapNote:
    """Read-only comparison. ``read_error`` is set when the Ready pin is absent."""

    curated_path: str
    official_release_date: str
    years: tuple[EbftYearComparison, ...]
    read_error: str = ""


def _ebft_release_date() -> str:
    if not EBFT_MANIFEST.is_file():
        return ""
    with EBFT_MANIFEST.open(encoding="utf-8") as handle:
        data = yaml.safe_load(handle)
    if not isinstance(data, dict):
        return ""
    evidence = data.get("raw_evidence") or []
    if evidence and isinstance(evidence[0], dict):
        return str(evidence[0].get("official_release_date") or "")
    return ""


def _financial_year_from_month(period_start: str) -> str | None:
    """Calendar month start → UK financial year. April starts the year."""
    if len(period_start) < 7:
        return None
    year = int(period_start[:4])
    month = int(period_start[5:7])
    if month >= 4:
        return f"{year}-{str(year + 1)[-2:]}"
    return f"{year - 1}-{str(year)[-2:]}"


def read_ebft_gap(hmt_table_tme: dict[str, float]) -> EbftGapNote:
    """Sum Ready monthly EBFT over each pinned financial year. Do not write it.

    A 12-month sum is a derived total, not an official financial-year series.
    Incomplete years stay ``ebft_sum=None`` so we do not invent a gap.
    """
    release = _ebft_release_date()
    path_text = str(EBFT_CURATED.relative_to(ECONOMY_DATA.parents[1]))
    if not EBFT_CURATED.is_file():
        empty = tuple(
            EbftYearComparison(fy, hmt_table_tme[fy], 0, None, None, False)
            for fy in OUTTURN_YEARS
        )
        return EbftGapNote(
            curated_path=path_text,
            official_release_date=release,
            years=empty,
            read_error=f"Ready EBFT curated file is not on disk: {EBFT_CURATED}",
        )

    sums: dict[str, float] = {fy: 0.0 for fy in OUTTURN_YEARS}
    counts: dict[str, int] = {fy: 0 for fy in OUTTURN_YEARS}
    with EBFT_CURATED.open(encoding="utf-8", newline="") as handle:
        for row in csv.DictReader(handle):
            if row.get("indicator_id") != "total-managed-expenditure":
                continue
            if row.get("geography_code") not in {"", GEO_CODE}:
                continue
            raw_value = (row.get("value") or "").strip()
            if raw_value == "":
                continue
            financial_year = _financial_year_from_month(row.get("period_start") or "")
            if financial_year not in sums:
                continue
            sums[financial_year] += float(raw_value)
            counts[financial_year] += 1

    years: list[EbftYearComparison] = []
    for financial_year in OUTTURN_YEARS:
        count = counts[financial_year]
        complete = count == 12
        ebft_sum = sums[financial_year] if complete else None
        hmt = hmt_table_tme[financial_year]
        difference = None if ebft_sum is None else ebft_sum - hmt
        years.append(
            EbftYearComparison(
                financial_year=financial_year,
                hmt_table_tme=hmt,
                ebft_months=count,
                ebft_sum=ebft_sum,
                difference=difference,
                complete=complete,
            )
        )
    return EbftGapNote(
        curated_path=path_text,
        official_release_date=release,
        years=tuple(years),
    )


def ebft_gap_sentences(note: EbftGapNote) -> str:
    """One manifest caveat paragraph. States the gap and forbids rescaling."""
    if note.read_error:
        return (
            "Financial-year HMT table TME is not monthly ONS EBFT "
            "(total-managed-expenditure). The Ready EBFT pin could not be "
            f"re-read this run ({note.read_error}). Discovery sums for PSF "
            "2026-10-20 were about 1,258,195 (2023-24) and 1,294,828 (2024-25) "
            "against HMT table TME 1,230,807 and 1,290,012. Do not rescale "
            "these rows onto EBFT."
        )
    bits: list[str] = []
    for year in note.years:
        if year.financial_year not in {"2023-24", "2024-25"} or year.ebft_sum is None:
            continue
        bits.append(
            f"{year.financial_year} summed EBFT {format_million(year.ebft_sum)} "
            f"vs HMT table TME {format_million(year.hmt_table_tme)} "
            f"(difference {format_million(year.difference or 0.0)})"
        )
    detail = "; ".join(bits) if bits else "see the package README"
    release = note.official_release_date or "unknown release"
    return (
        "These totals are HMT financial-year table TME / TES, not monthly ONS "
        f"EBFT (total-managed-expenditure, PSF {release}). Derived April–March "
        f"sums of that Ready pin: {detail}. Different vintage, the HMT footnote "
        "excluding temporary effects of banks classified to the public sector, "
        "and a derived monthly sum rather than an official financial-year "
        "series. Do not rescale COFOG or DEL shares onto EBFT."
    )
