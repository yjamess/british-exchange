"""Shared helpers for ONS ASHE Table connectors (Economy Domain 02).

Approach (plain language):
- One place for suppressions, sheet parsing, and zip member lookup.
- CV rule: omit cells published as ``x``, ``:``, or ``..`` — never invent zero.
  Colour-coded CV quality in the workbook is not read; we only honour suppressions.

Best practices: pathlib + typing
(https://docs.python.org/3/library/pathlib.html,
https://docs.python.org/3/library/typing.html).
"""

from __future__ import annotations

import re
import zipfile
from dataclasses import dataclass
from datetime import date
from typing import Literal

from openpyxl.worksheet.worksheet import Worksheet

EditionKind = Literal["provisional", "revised"]
ObservationStatus = Literal["final", "provisional"]

PERCENTILE_IDS: tuple[tuple[int, str], ...] = (
    (10, "p10"),
    (20, "p20"),
    (25, "p25"),
    (30, "p30"),
    (40, "p40"),
    (60, "p60"),
    (70, "p70"),
    (75, "p75"),
    (80, "p80"),
    (90, "p90"),
)

# English regions + devolved nations used by Table 5 "REGION, INDUSTRY" rows.
# Match longest prefixes first (EAST MIDLANDS before EAST).
REGION_PREFIX_CODES: tuple[tuple[str, str, str], ...] = (
    ("YORKSHIRE AND THE HUMBER", "E12000003", "Yorkshire and The Humber"),
    ("NORTHERN IRELAND", "N92000002", "Northern Ireland"),
    ("EAST MIDLANDS", "E12000004", "East Midlands"),
    ("WEST MIDLANDS", "E12000005", "West Midlands"),
    ("NORTH EAST", "E12000001", "North East"),
    ("NORTH WEST", "E12000002", "North West"),
    ("SOUTH EAST", "E12000008", "South East"),
    ("SOUTH WEST", "E12000009", "South West"),
    ("SCOTLAND", "S92000003", "Scotland"),
    ("LONDON", "E12000007", "London"),
    ("WALES", "W92000004", "Wales"),
    ("EAST", "E12000006", "East"),
)


@dataclass(frozen=True, slots=True)
class AsheEdition:
    """One pinned ASHE zip edition."""

    year: int
    kind: EditionKind
    zip_name: str
    release_date: str  # ISO date of the ONS release that published this file

    @property
    def observation_status(self) -> ObservationStatus:
        return "provisional" if self.kind == "provisional" else "final"

    @property
    def edition_tag(self) -> str:
        return f"{self.year}{self.kind}"

    @property
    def period_start(self) -> date:
        return date(self.year, 4, 1)

    @property
    def period_end(self) -> date:
        return date(self.year, 4, 30)

    def source_version(self, table: str) -> str:
        return f"ASHE-{table}-{self.year}-{self.kind}"


def as_float(raw: object) -> float | None:
    """Parse a numeric cell; suppressions become None (never zero)."""
    if raw is None or raw in (":", "x", "x ", "..", ""):
        return None
    if isinstance(raw, (int, float)):
        return float(raw)
    try:
        return float(str(raw).replace(",", ""))
    except ValueError:
        return None


def clean_code(raw: object) -> str | None:
    """Strip ONS leading quotes from GSS / SIC codes."""
    if raw is None:
        return None
    text = str(raw).strip().strip("'").strip()
    if not text or text.lower() in {"none", "nan"}:
        return None
    return text


def find_header_row(ws: Worksheet) -> int:
    for idx, row in enumerate(ws.iter_rows(max_row=12, values_only=True), 1):
        cells = [str(c).strip().lower() if c is not None else "" for c in row[:8]]
        if cells[:2] == ["description", "code"] and "median" in cells:
            return idx
    raise ValueError(f"ASHE header row not found in sheet {ws.title}")


def member_name(zf: zipfile.ZipFile, table_fragment: str) -> str:
    """Find the estimates workbook (``.xlsx``), never the CV companion."""
    matches = [
        name
        for name in zf.namelist()
        if table_fragment in name
        and name.lower().endswith(".xlsx")
        and "cv" not in name.lower()
    ]
    if len(matches) != 1:
        raise ValueError(f"Expected one workbook for {table_fragment}, found {matches}")
    return matches[0]


def percentile_stats_from_row(
    header: list[object],
    data: tuple[object, ...] | list[object],
) -> dict[str, float]:
    """Median, mean, and published percentiles from one ASHE estimates row."""
    median = as_float(data[3])
    mean = as_float(data[5])
    if median is None:
        return {}
    stats: dict[str, float] = {"median": median}
    if mean is not None:
        stats["mean"] = mean
    lookup = dict(PERCENTILE_IDS)
    for col_idx, cell in enumerate(header):
        if isinstance(cell, (int, float)) and int(cell) in lookup:
            sid = lookup[int(cell)]
            val = as_float(data[col_idx])
            if val is not None:
                stats[sid] = val
    return stats


def is_sic_section(code: str) -> bool:
    return bool(re.fullmatch(r"[A-U]", code, flags=re.IGNORECASE))


def match_region_prefix(description: str) -> tuple[str, str, str] | None:
    """Return (gss_code, geo_label, remainder) for ``REGION, industry…`` rows."""
    upper = description.strip().upper()
    for prefix, code, label in REGION_PREFIX_CODES:
        needle = f"{prefix},"
        if upper.startswith(needle):
            rest = description.strip()[len(prefix) + 1 :].strip()
            return code, label, rest
    return None
