"""Shared parse helpers for DESNZ ET 1.3 'dependency & low carbon' sheets.

One workbook feeds several indicators (import dependency, fossil fuel dependency,
low carbon share). Each indicator keeps its own package; this module only parses.

Plain language: find the right column on the Annual/Quarter sheets, keep workbook
ratios as decimals, and fail if headers move.
"""

from __future__ import annotations

import calendar
import re
from pathlib import Path
from typing import Literal

import openpyxl
from openpyxl.worksheet.worksheet import Worksheet

from britain_exchange.observation import Observation, ObservationStatus

UK_GEOGRAPHY_CODE = "K02000001"
UK_GEOGRAPHY_LABEL = "United Kingdom"

PINNED_RAW_RELATIVE = "raw/2026-11-03/ET_1.3_SEP_26.xlsx"
SOURCE_LANDING_URL = (
    "https://www.gov.uk/government/statistics/total-energy-section-1-energy-trends"
)
PINNED_ASSET_URL = (
    "https://assets.publishing.service.gov.uk/media/"
    "6abe1eb626660e5f62a7f1d3/ET_1.3_SEP_26.xlsx"
)
OFFICIAL_RELEASE_DATE = "2026-09-29"
SOURCE_VERSION = "ET_1.3_SEP_26"
EXPECTED_CHECKSUM = (
    "7e3d230e7cdcc45f3eef2b1ec5c866a30ffc26218fdd486cbae59f55eb34bf81"
)

ANNUAL_SHEET = "Annual dependency & low carbon"
QUARTER_SHEET = "Quarter dependency & low carbon"
HEADER_ROW = 5
YEAR_COL = 1
QUARTER_COL = 1

# Column index (1-based) → expected header fragment (casefold match).
RATIO_COLUMNS: dict[str, tuple[int, str]] = {
    "import_dependency": (16, "import dependency"),
    "fossil_fuel_dependency": (8, "fossil fuel dependency"),
    "low_carbon_share": (9, "low carbon share"),
}

QUARTER_RE = re.compile(
    r"^Quarter\s+([1-4])\s+(\d{4})(?:\s*\[([^\]]+)\])?\s*$",
    re.IGNORECASE,
)
MISSING_MARKERS = {"[x]", "[z]", "..", "…"}

MeasureKey = Literal["import_dependency", "fossil_fuel_dependency", "low_carbon_share"]


def _quarter_bounds(year: int, quarter: int) -> tuple[str, str]:
    start_month = 1 + (quarter - 1) * 3
    end_month = start_month + 2
    start = f"{year:04d}-{start_month:02d}-01"
    end_day = calendar.monthrange(year, end_month)[1]
    end = f"{year:04d}-{end_month:02d}-{end_day:02d}"
    return start, end


def _year_bounds(year: int) -> tuple[str, str]:
    return f"{year:04d}-01-01", f"{year:04d}-12-31"


def _parse_quarter_label(raw: object) -> tuple[str, str, ObservationStatus] | None:
    if raw is None:
        return None
    text = str(raw).strip()
    match = QUARTER_RE.match(text)
    if not match:
        return None
    quarter = int(match.group(1))
    year = int(match.group(2))
    flag = (match.group(3) or "").strip().lower()
    start, end = _quarter_bounds(year, quarter)
    status: ObservationStatus = "provisional" if "provisional" in flag else "final"
    return start, end, status


def _parse_year_label(raw: object) -> tuple[str, str, ObservationStatus] | None:
    if raw is None:
        return None
    if isinstance(raw, (int, float)):
        year = int(raw)
        return (*_year_bounds(year), "final")
    text = str(raw).strip()
    match = re.match(r"^(\d{4})(?:\s*\[([^\]]+)\])?\s*$", text)
    if not match:
        return None
    year = int(match.group(1))
    flag = (match.group(2) or "").strip().lower()
    status: ObservationStatus = "provisional" if "provisional" in flag else "final"
    return (*_year_bounds(year), status)


def _parse_numeric_cell(
    raw: object,
) -> tuple[float | None, ObservationStatus | None]:
    if raw is None:
        return None, "missing"
    if isinstance(raw, (int, float)):
        return float(raw), None
    text = str(raw).strip()
    if not text or text.lower() in MISSING_MARKERS:
        return None, "missing"
    try:
        return float(text.replace(",", "")), None
    except ValueError:
        return None, "missing"


def _assert_ratio_header(ws: Worksheet, *, period_header: str, measure: MeasureKey) -> None:
    got_period = str(ws.cell(HEADER_ROW, YEAR_COL).value or "").strip()
    if got_period.casefold() != period_header.casefold():
        raise ValueError(
            f"Expected period header {period_header!r} at col 1; got {got_period!r}"
        )
    col, needle = RATIO_COLUMNS[measure]
    got = str(ws.cell(HEADER_ROW, col).value or "").strip()
    if needle not in got.casefold():
        raise ValueError(
            f"Expected header containing {needle!r} at col {col}; got {got!r}"
        )


def parse_et13_ratio_column(
    workbook_path: Path,
    *,
    indicator_id: str,
    measure: MeasureKey,
) -> list[Observation]:
    """Parse annual + quarterly ratio column from ET 1.3 dependency sheets."""
    col, _ = RATIO_COLUMNS[measure]
    wb = openpyxl.load_workbook(workbook_path, data_only=True, read_only=False)
    try:
        for sheet in (ANNUAL_SHEET, QUARTER_SHEET):
            if sheet not in wb.sheetnames:
                raise ValueError(
                    f"Expected sheet {sheet!r} in {workbook_path.name}; "
                    f"got {wb.sheetnames}"
                )

        observations: list[Observation] = []

        annual: Worksheet = wb[ANNUAL_SHEET]
        _assert_ratio_header(annual, period_header="Year", measure=measure)
        for row_idx in range(HEADER_ROW + 1, (annual.max_row or HEADER_ROW) + 1):
            period = _parse_year_label(annual.cell(row_idx, YEAR_COL).value)
            if period is None:
                continue
            period_start, period_end, row_status = period
            value, missing_status = _parse_numeric_cell(annual.cell(row_idx, col).value)
            status: ObservationStatus = missing_status or row_status
            observations.append(
                Observation(
                    indicator_id=indicator_id,
                    period_start=period_start,
                    period_end=period_end,
                    geography_code=UK_GEOGRAPHY_CODE,
                    geography_label=UK_GEOGRAPHY_LABEL,
                    value=value,
                    unit="ratio",
                    observation_status=status,
                    source_version=SOURCE_VERSION,
                    notes=f"measure={measure}; basis=annual",
                )
            )

        quarterly: Worksheet = wb[QUARTER_SHEET]
        _assert_ratio_header(quarterly, period_header="Quarter", measure=measure)
        for row_idx in range(HEADER_ROW + 1, (quarterly.max_row or HEADER_ROW) + 1):
            period = _parse_quarter_label(quarterly.cell(row_idx, QUARTER_COL).value)
            if period is None:
                continue
            period_start, period_end, row_status = period
            value, missing_status = _parse_numeric_cell(
                quarterly.cell(row_idx, col).value
            )
            status = missing_status or row_status
            observations.append(
                Observation(
                    indicator_id=indicator_id,
                    period_start=period_start,
                    period_end=period_end,
                    geography_code=UK_GEOGRAPHY_CODE,
                    geography_label=UK_GEOGRAPHY_LABEL,
                    value=value,
                    unit="ratio",
                    observation_status=status,
                    source_version=SOURCE_VERSION,
                    notes=f"measure={measure}; basis=quarterly",
                )
            )

        if not observations:
            raise ValueError(f"No {measure} rows parsed from {workbook_path}")
        return observations
    finally:
        wb.close()
