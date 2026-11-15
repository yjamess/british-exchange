"""Independent QA for Economy 07 real-terms pins — EC-VAL-07C.

Approach (plain language):

1. Hash the pinned PSS workbooks and compare them to the manifests.
2. Read Table 1.2, Table 1.1, Table 4.3, and Table 4.2 with openpyxl.
   Do not import the Economy connectors, and do not rewrite curated files.
3. Recompute the published identities from those cells, then check every
   curated row against the same cells.
4. 2025-26 real equalling nominal is the price-base year. Earlier years
   differing is correct. Missing monthly real EBFT is not a fail.

Run::

    uv run python -m validation.qa_economy_07_real_2026_11_15

Refs: hashlib (https://docs.python.org/3/library/hashlib.html), csv, pathlib,
openpyxl data_only reads cached worksheet values.
https://docs.python.org/3/library/functions.html#round
"""

from __future__ import annotations

import csv
import hashlib
import re
from collections.abc import Mapping, Sequence
from dataclasses import dataclass, field
from pathlib import Path

import yaml
from openpyxl import load_workbook

ROOT = Path(__file__).resolve().parents[2]
REPORT = ROOT / "data" / "qa" / "qa_report_economy_07_real_2026-11-15.md"
DEL_BASE = ROOT / "data" / "economy" / "tme-del-ame-real"
TES_BASE = ROOT / "data" / "economy" / "tes-by-function-real"
NOMINAL_DEL_BASE = ROOT / "data" / "economy" / "tme-del-ame"

DEL_YEARS: tuple[str, ...] = (
    "2021-22",
    "2022-23",
    "2023-24",
    "2024-25",
    "2025-26",
)
PRICE_BASE_YEAR = "2025-26"
EARLIER_DEL_YEARS = tuple(year for year in DEL_YEARS if year != PRICE_BASE_YEAR)
TES_YEARS: tuple[str, ...] = tuple(
    f"{year}-{(year + 1) % 100:02d}" for year in range(2003, 2026)
)
PLAN_START_YEAR = 2026
FIRST_ESTIMATE_YEAR = "2025-26"

EXPECTED_CH1_SHA = "ff40d00e69d7b5cb2db4504e24ba774dd09b181ac676d0518ab0e16581305dbe"
EXPECTED_CH4_SHA = "573625f73c0e311ff68c5635691801be955fd466cd9b5b4a0e00b8173852195c"

DEL_UNIT = "£ million, 2025-26 prices, financial year"
TES_UNIT = "£ billion, 2025-26 prices, financial year"
SOURCE_VERSION = "PSS July 2026 (updated 2026-07-29)"
GEO_CODE = "K02000001"
GEO_LABEL = "United Kingdom"

# Kickoff spots. The pass/fail decision is the workbook cells.
SPOT_RESOURCE_DEL = 496_670
SPOT_OTHER_AME_2021 = -202_678
SPOT_HEALTH_REAL = 2508  # £ billion tenths: 250.8
SPOT_HEALTH_NOMINAL = 2424  # 242.4
SPOT_REBUILD_YEAR = "2024-25"
# 2024-25 resource + capital, their sum, and published Total DEL.
SPOT_REBUILD = (485_757, 115_432, 601_189, 616_422)

MAX_LEAF_TENTHS = 2  # £0.2 billion
MAX_BRIDGE_TENTHS = 1  # £0.1 billion
EXPECTED_DEL_ROWS = 20
EXPECTED_TES_ROWS = 322
EXPECTED_OF_WHICH = 8

FUNCTIONS: tuple[tuple[int, str, str, str], ...] = (
    (1, "cofog-01-general-public-services", "GF01", "General public services"),
    (2, "cofog-02-defence", "GF02", "Defence"),
    (3, "cofog-03-public-order-and-safety", "GF03", "Public order and safety"),
    (4, "cofog-04-economic-affairs", "GF04", "Economic affairs"),
    (5, "cofog-05-environment-protection", "GF05", "Environment protection"),
    (6, "cofog-06-housing-and-community-amenities", "GF06", "Housing and community amenities"),
    (7, "cofog-07-health", "GF07", "Health"),
    (8, "cofog-08-recreation-culture-and-religion", "GF08", "Recreation, culture and religion"),
    (9, "cofog-09-education", "GF09", "Education"),
    (10, "cofog-10-social-protection", "GF10", "Social protection"),
)
FUNCTION_BY_NUMBER = {number: (series, cofog, label) for number, series, cofog, label in FUNCTIONS}
TES_SERIES: tuple[str, ...] = tuple(series for _, series, _, _ in FUNCTIONS) + (
    "eu-transactions",
    "tes-total",
    "accounting-adjustments",
    "table-tme",
)
DEL_SERIES: tuple[tuple[str, str, str, str], ...] = (
    ("total-del", "control-total", "control-total", "Total DEL"),
    ("departmental-ame", "control-total", "control-total", "Departmental AME"),
    ("other-ame", "control-total", "control-total", "Other AME"),
    ("table-tme", "total", "table-tme", "Total Managed Expenditure"),
)
DEL_KEYS = {match: spec for match, *spec in (
    ("total del", *DEL_SERIES[0]),
    ("departmental ame", *DEL_SERIES[1]),
    ("other ame", *DEL_SERIES[2]),
    ("total managed expenditure", *DEL_SERIES[3]),
)}

_FY_CELL = re.compile(r"^20\d{2}-\d{2}$")
_FY_LABEL = re.compile(r"^(20\d{2})-(\d{2})$")
_FOOTNOTE = re.compile(r"(?:\s*\(\d+\))+\s*$")
_FUNCTION = re.compile(r"^(\d+)\.\s+(.*)$")
_RANK = {"pass": 0, "warn": 1, "fail": 2}
CHECKS = ("R1", "R2", "R3", "R4", "R5", "R6", "R7", "C-extra")

Key = tuple[str, str]  # series, financial year


@dataclass(frozen=True)
class PublishedCell:
    """One published cell that should appear in curated observations."""

    series: str
    classification: str
    role: str
    fy: str
    amount: int
    label: str
    cofog: str
    table: str


@dataclass
class ControlSheet:
    """Table 1.1 or Table 1.2 control totals, plus the DEL lines we do not add."""

    cells: dict[Key, PublishedCell]
    resource_del: dict[str, int]
    capital_del: dict[str, int]
    footnote_deflator: str
    footnote_total_del: str
    sheet_names: tuple[str, ...]


@dataclass
class FunctionSheet:
    """Table 4.2 or Table 4.3. Amounts are tenths of a £ billion."""

    cells: dict[Key, PublishedCell]
    of_which: int
    footnote_deflator: str
    sheet_names: tuple[str, ...]


@dataclass
class CuratedRow:
    key: Key
    amount: int
    status: str
    period_start: str
    period_end: str
    geography_code: str
    geography_label: str
    unit: str
    indicator_id: str
    source_version: str
    notes: dict[str, str]


@dataclass
class GapYear:
    fy: str
    leaf: int
    tes: int
    adjustments: int
    tme: int

    @property
    def leaf_gap(self) -> int:
        return self.leaf - self.tes

    @property
    def bridge_gap(self) -> int:
        return self.tes + self.adjustments - self.tme


@dataclass
class Bundle:
    """Figures recomputed from the workbooks. None until parsing succeeds."""

    ch1_sha: str
    ch4_sha: str
    nominal_sha: str
    real_del: ControlSheet | None = None
    nominal_del: ControlSheet | None = None
    real_tes: FunctionSheet | None = None
    nominal_tes: FunctionSheet | None = None
    gaps: list[GapYear] = field(default_factory=list)
    earlier_unequal: int = 0
    earlier_cells: int = 0
    earlier_equal: list[str] = field(default_factory=list)
    del_rows: int = 0
    tes_rows: int = 0
    nominal_ready: dict[Key, int] = field(default_factory=dict)


def sha256(path: Path) -> str:
    """Hash a file in chunks. See docs.python.org/3/library/hashlib.html."""
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1 << 20), b""):
            digest.update(chunk)
    return digest.hexdigest()


def fold(text: str) -> str:
    """Case-fold and treat the unicode minus in 'Tax−Spend' as a hyphen."""
    return text.casefold().replace("−", "-").replace("–", "-")


def normalise_label(raw: object) -> str:
    text = str(raw or "").replace("\xa0", " ").replace("\n", " ")
    return re.sub(r"\s+", " ", text).strip()


def strip_footnote(label: str) -> str:
    """Drop a trailing ``(7)`` or ``(2)`` so ``Defence(2)`` matches Defence."""
    return _FOOTNOTE.sub("", label).strip()


def match_key(raw: object) -> str:
    return strip_footnote(normalise_label(raw)).casefold()


def as_number(raw: object, context: str) -> float:
    """Read a published number. ``bool`` is excluded because it subclasses ``int``."""
    if isinstance(raw, str):
        text = raw.strip().replace(",", "")
        if text in {"", "-", "..", "…"}:
            raise ValueError(f"Missing value ({context})")
        return float(text)
    if isinstance(raw, bool) or raw is None:
        raise ValueError(f"Missing value ({context})")
    if isinstance(raw, (int, float)):
        return float(raw)
    raise ValueError(f"Unexpected cell {raw!r} ({context})")


def as_million(raw: object, context: str) -> int:
    """Parse one published £ million cell. Fractional cells fail."""
    value = as_number(raw, context)
    if abs(value - round(value)) > 1e-6:
        raise ValueError(f"Expected a whole £ million, got {raw!r} ({context})")
    return int(round(value))


def as_tenths(raw: object, context: str) -> int:
    """Parse one £ billion cell as an integer number of tenths.

    ``250.8`` becomes ``2508``. A second decimal place fails. The 1e-4
    tolerance absorbs binary float noise; a real extra decimal is 0.1 away.
    ``round`` is the built-in half-even helper:
    https://docs.python.org/3/library/functions.html#round
    """
    value = as_number(raw, context)
    scaled = value * 10
    tenths = round(scaled)
    if abs(scaled - tenths) > 1e-4:
        raise ValueError(f"Expected £ billion to 1 decimal place, got {raw!r} ({context})")
    return int(tenths)


def financial_year_bounds(financial_year: str) -> tuple[str, str]:
    """Map ``2024-25`` to 2024-04-01 .. 2025-03-31."""
    match = _FY_LABEL.fullmatch(financial_year)
    if not match:
        raise ValueError(f"Unexpected financial-year label: {financial_year!r}")
    start_year = int(match.group(1))
    if (start_year + 1) % 100 != int(match.group(2)):
        raise ValueError(f"Financial year does not span twelve months: {financial_year}")
    return f"{start_year:04d}-04-01", f"{start_year + 1:04d}-03-31"


def expected_status(financial_year: str) -> str:
    if financial_year == FIRST_ESTIMATE_YEAR:
        return "estimated"
    return "final"


def fmt_million(value: int) -> str:
    return f"{value:,}"


def fmt_tenths(tenths: int) -> str:
    sign = "-" if tenths < 0 else ""
    whole, frac = divmod(abs(tenths), 10)
    return f"{sign}{whole:,}.{frac}"


def worse(left: str, right: str) -> str:
    return left if _RANK[left] >= _RANK[right] else right


def load_sheet(path: Path, sheet_name: str) -> tuple[tuple[str, ...], list[tuple[object, ...]]]:
    workbook = load_workbook(path, data_only=True, read_only=True)
    try:
        names = tuple(workbook.sheetnames)
        if sheet_name not in names:
            raise ValueError(f"{path.name} has no sheet {sheet_name!r}; sheets={names}")
        rows = [tuple(row) for row in workbook[sheet_name].iter_rows(values_only=True)]
    finally:
        workbook.close()
    return names, rows


def find_year_header(
    rows: Sequence[Sequence[object]],
    expected_years: Sequence[str],
) -> tuple[int, tuple[int, ...]]:
    """Return the label column and year columns when the header matches exactly."""
    expected = tuple(expected_years)
    for row in rows:
        hits = [
            (index, normalise_label(cell))
            for index, cell in enumerate(row)
            if _FY_CELL.fullmatch(normalise_label(cell))
        ]
        if not hits:
            continue
        labels = tuple(label for _, label in hits)
        if labels != expected:
            raise ValueError(
                "Year header must be exactly "
                f"{expected[0]} to {expected[-1]} ({len(expected)} years). "
                f"Found {labels[0]} to {labels[-1]} ({len(labels)})."
            )
        columns = tuple(index for index, _ in hits)
        if columns[0] < 1:
            raise ValueError("Year columns leave no label column")
        return columns[0] - 1, columns
    raise ValueError("No financial-year header found")


def year_amounts(
    row: Sequence[object],
    year_cols: Sequence[int],
    years: Sequence[str],
    context: str,
    *,
    scale: str,
) -> dict[str, int]:
    if len(row) <= year_cols[-1]:
        raise ValueError(f"Short row ({context})")
    parser = as_million if scale == "million" else as_tenths
    return {
        financial_year: parser(row[column], f"{context} {financial_year}")
        for financial_year, column in zip(years, year_cols, strict=True)
    }


def row_has_amount(row: Sequence[object], year_cols: Sequence[int]) -> bool:
    return any(column < len(row) and row[column] not in (None, "") for column in year_cols)


def footnote_text(rows: Sequence[Sequence[object]], marker: str) -> str:
    """First footnote cell whose text starts with ``(1)`` or ``(7)``."""
    prefix = f"({marker})"
    for row in rows:
        if not row:
            continue
        text = normalise_label(row[0])
        if text.startswith(prefix):
            return text
    return ""


def add_years(
    bucket: dict[Key, PublishedCell],
    *,
    series: str,
    classification: str,
    role: str,
    values: Mapping[str, int],
    label: str,
    cofog: str,
    table: str,
) -> None:
    for financial_year, amount in values.items():
        key = (series, financial_year)
        if key in bucket:
            raise ValueError(f"Duplicate published row {key}")
        bucket[key] = PublishedCell(
            series=series,
            classification=classification,
            role=role,
            fy=financial_year,
            amount=amount,
            label=label,
            cofog=cofog,
            table=table,
        )


def parse_control(path: Path, sheet_name: str, table: str) -> ControlSheet:
    """Read the four control totals. Do not treat resource+capital as Total DEL."""
    names, rows = load_sheet(path, sheet_name)
    label_col, year_cols = find_year_header(rows, DEL_YEARS)
    bucket: dict[Key, PublishedCell] = {}
    resource: dict[str, int] = {}
    capital: dict[str, int] = {}
    seen: set[str] = set()
    for row in rows:
        if len(row) <= label_col:
            continue
        key = match_key(row[label_col])
        if key == "total resource del":
            resource = year_amounts(row, year_cols, DEL_YEARS, "resource DEL", scale="million")
            continue
        if key == "total capital del":
            capital = year_amounts(row, year_cols, DEL_YEARS, "capital DEL", scale="million")
            continue
        spec = DEL_KEYS.get(key)
        if spec is None:
            continue
        series, classification, role, label = spec
        if series in seen:
            raise ValueError(f"Duplicate {sheet_name} control row {label!r}")
        seen.add(series)
        add_years(
            bucket,
            series=series,
            classification=classification,
            role=role,
            values=year_amounts(row, year_cols, DEL_YEARS, label, scale="million"),
            label=label,
            cofog="",
            table=table,
        )
    missing = {spec[0] for spec in DEL_SERIES} - seen
    if missing:
        raise ValueError(f"{sheet_name} missing control rows: {sorted(missing)}")
    if not resource or not capital:
        raise ValueError(f"{sheet_name} is missing resource DEL or capital DEL")
    return ControlSheet(
        bucket,
        resource,
        capital,
        footnote_text(rows, "1") if table == "1.2" else "",
        footnote_text(rows, "7") if table == "1.2" else footnote_text(rows, "6"),
        names,
    )


def bridge_row(key: str) -> tuple[str, str, str, str] | None:
    """Return series, classification, role, label for a non-function total."""
    if key == "eu transactions":
        return ("eu-transactions", "total", "eu-transactions", "EU transactions")
    if key == "public sector expenditure on services":
        return (
            "tes-total",
            "total",
            "tes-total",
            "Public sector expenditure on services",
        )
    if key == "accounting adjustments":
        return ("accounting-adjustments", "total", "bridge", "Accounting adjustments")
    if key == "total managed expenditure":
        return ("table-tme", "total", "table-tme", "Total Managed Expenditure")
    return None


def parse_function(path: Path, sheet_name: str, table: str) -> FunctionSheet:
    """Read a Chapter 4 function sheet. Of-which lines are counted and skipped."""
    names, rows = load_sheet(path, sheet_name)
    label_col, year_cols = find_year_header(rows, TES_YEARS)
    bucket: dict[Key, PublishedCell] = {}
    of_which = 0
    header_seen = False
    for row in rows:
        if not header_seen:
            labels = [
                normalise_label(cell)
                for cell in row
                if _FY_CELL.fullmatch(normalise_label(cell))
            ]
            if tuple(labels) == TES_YEARS:
                header_seen = True
            continue
        if len(row) <= label_col:
            continue
        label = normalise_label(row[label_col])
        if not label:
            continue
        key = match_key(label)
        if key.startswith("of which"):
            of_which += 1
            continue
        spec = bridge_row(key)
        cofog = ""
        if spec is None:
            function_match = _FUNCTION.fullmatch(strip_footnote(label))
            if function_match:
                number = int(function_match.group(1))
                if number not in FUNCTION_BY_NUMBER:
                    raise ValueError(f"Unexpected function number on {sheet_name}: {label!r}")
                series, cofog, locked = FUNCTION_BY_NUMBER[number]
                if function_match.group(2).casefold() != locked.casefold():
                    raise ValueError(f"Function name drift on {sheet_name}: {label!r}")
                spec = (series, "total", "function", locked)
        if spec is None:
            if row_has_amount(row, year_cols):
                raise ValueError(f"Unrecognised valued row on {sheet_name}: {label!r}")
            continue
        series, classification, role, locked_label = spec
        add_years(
            bucket,
            series=series,
            classification=classification,
            role=role,
            values=year_amounts(row, year_cols, TES_YEARS, locked_label, scale="tenth"),
            label=locked_label,
            cofog=cofog,
            table=table,
        )
    expected = set(TES_SERIES)
    found = {series for series, _ in bucket}
    if found != expected:
        raise ValueError(
            f"{sheet_name} series mismatch. Missing {sorted(expected - found)} "
            f"extra {sorted(found - expected)}"
        )
    if len(bucket) != len(TES_SERIES) * len(TES_YEARS):
        raise ValueError(f"{sheet_name} cell count {len(bucket)}")
    return FunctionSheet(
        bucket,
        of_which,
        footnote_text(rows, "1") if table == "4.3" else "",
        names,
    )


def notes_map(notes: str) -> dict[str, str]:
    out: dict[str, str] = {}
    for part in notes.split(";"):
        chunk = part.strip()
        if "=" not in chunk:
            continue
        key, value = chunk.split("=", 1)
        key = key.strip()
        if key and key not in out:
            out[key] = value.strip()
    return out


def load_curated(path: Path, *, scale: str) -> list[CuratedRow]:
    parser = as_million if scale == "million" else as_tenths
    rows: list[CuratedRow] = []
    with path.open(newline="", encoding="utf-8-sig") as handle:
        for raw in csv.DictReader(handle):
            parsed = notes_map(raw.get("notes") or "")
            rows.append(
                CuratedRow(
                    key=(parsed.get("series", ""), parsed.get("fy", "")),
                    amount=parser(raw.get("value"), f"curated {raw.get('period_start')}"),
                    status=(raw.get("observation_status") or "").strip(),
                    period_start=(raw.get("period_start") or "").strip(),
                    period_end=(raw.get("period_end") or "").strip(),
                    geography_code=(raw.get("geography_code") or "").strip(),
                    geography_label=(raw.get("geography_label") or "").strip(),
                    unit=(raw.get("unit") or "").strip(),
                    indicator_id=(raw.get("indicator_id") or "").strip(),
                    source_version=(raw.get("source_version") or "").strip(),
                    notes=parsed,
                )
            )
    return rows


def manifest_blob(manifest: Mapping[str, object]) -> str:
    parts = [
        str(manifest.get("definition") or ""),
        str(manifest.get("caveats") or ""),
        str(manifest.get("transformations") or ""),
        str(manifest.get("revision_notes") or ""),
        str(manifest.get("status_note") or ""),
        str(manifest.get("unit") or ""),
        " ".join(str(item) for item in (manifest.get("open_questions") or [])),
    ]
    return fold("\n".join(parts))


def raw_path(base: Path, manifest: Mapping[str, object]) -> tuple[Path, str]:
    evidence = manifest.get("raw_evidence") or [{}]
    first = evidence[0] if isinstance(evidence, list) and evidence else {}
    if not isinstance(first, dict):
        first = {}
    relative = str(first.get("path") or "")
    claimed = str(first.get("checksum_sha256") or "")
    return base / relative, claimed


def plan_year_hits(path: Path) -> list[str]:
    """Year-header cells from 2026-27 onward. Prose mentions are ignored."""
    workbook = load_workbook(path, data_only=True, read_only=True)
    found: list[str] = []
    try:
        for name in workbook.sheetnames:
            for row_index, row in enumerate(workbook[name].iter_rows(values_only=True), start=1):
                for column, value in enumerate(row, start=1):
                    text = normalise_label(value)
                    match = _FY_LABEL.fullmatch(text)
                    if match and int(match.group(1)) >= PLAN_START_YEAR:
                        found.append(f"{name}!R{row_index}C{column}={text}")
    finally:
        workbook.close()
    return found


def lookup(cells: Mapping[Key, PublishedCell], series: str, financial_year: str) -> int:
    return cells[(series, financial_year)].amount


def markdown_table(headers: Sequence[str], rows: Sequence[Sequence[str]]) -> str:
    head = "| " + " | ".join(headers) + " |"
    rule = "|" + "|".join("---" for _ in headers) + "|"
    body = ["| " + " | ".join(row) + " |" for row in rows]
    return "\n".join([head, rule, *body])


def _result(code: str, problems: Mapping[str, list[str]], forced: Mapping[str, str], blurbs: Mapping[str, str]) -> tuple[str, str]:
    result = forced.get(code, "pass")
    if result == "pass":
        return "pass", blurbs.get(code, "Checked")
    note = "; ".join(problems[code]).replace("|", "/")
    return result, note


def compare_curated(
    published: Mapping[Key, PublishedCell],
    curated: Sequence[CuratedRow],
    *,
    indicator_id: str,
    unit: str,
    table: str,
    code: str,
    flag,
) -> None:
    """Check every curated row against the published cell. Extra rows fail."""
    seen: set[Key] = set()
    for row in curated:
        if row.key in seen:
            flag(code, f"Duplicate curated key {row.key}")
        seen.add(row.key)
        expected = published.get(row.key)
        series = row.notes.get("series", "")
        if any(token in series for token in ("oscar", "residual", "of-which", "nato")):
            flag("R7", f"Forbidden curated series {series}")
        if series in {"total-resource-del", "total-capital-del"}:
            flag("R2", f"Resource or capital DEL was curated: {row.key}")
        if expected is None:
            flag(code, f"Unexpected curated row {row.key}")
            continue
        if row.amount != expected.amount:
            flag(code, f"{row.key} curated {row.amount} != published {expected.amount}")
        if row.indicator_id != indicator_id:
            flag(code, f"{row.key} indicator_id {row.indicator_id}")
        if row.unit != unit:
            flag("R6", f"{row.key} unit {row.unit!r}")
        if row.status != expected_status(row.key[1]):
            flag("R6", f"{row.key} status {row.status}")
        start, end = financial_year_bounds(row.key[1])
        if (row.period_start, row.period_end) != (start, end):
            flag("R6", f"{row.key} period {row.period_start}..{row.period_end}")
        if row.geography_code != GEO_CODE or row.geography_label != GEO_LABEL:
            flag("R6", f"{row.key} geography {row.geography_code}")
        if row.source_version != SOURCE_VERSION:
            flag("R6", f"{row.key} source_version {row.source_version}")
        notes = row.notes
        if notes.get("classification") != expected.classification:
            flag(code, f"{row.key} classification {notes.get('classification')}")
        if notes.get("role") != expected.role:
            flag(code, f"{row.key} role {notes.get('role')}")
        if notes.get("label") != expected.label:
            flag(code, f"{row.key} label {notes.get('label')}")
        if notes.get("table") != table:
            flag("R6", f"{row.key} table {notes.get('table')}")
        if notes.get("price_base") != "2025-26" or notes.get("terms") != "real":
            flag("R5", f"{row.key} price_base/terms {notes.get('price_base')} {notes.get('terms')}")
        if expected.cofog and notes.get("cofog") != expected.cofog:
            flag(code, f"{row.key} cofog {notes.get('cofog')}")
        if expected.role == "table-tme" and notes.get("denominator") != "hmt-table-tme":
            flag("R5", f"{row.key} denominator {notes.get('denominator')}")
        if expected.role != "table-tme" and "denominator" in notes:
            flag("R5", f"{row.key} unexpected denominator")
        if "ebft" in fold(row.notes.get("series", "")):
            flag("R5", f"{row.key} is an EBFT series")
    missing = set(published) - seen
    for key in sorted(missing)[:8]:
        flag(code, f"Missing curated row {key}")
    if len(missing) > 8:
        flag(code, f"{len(missing) - 8} further curated rows missing")


def check_identity(real: ControlSheet, flag) -> None:
    for financial_year in DEL_YEARS:
        total_del = lookup(real.cells, "total-del", financial_year)
        departmental = lookup(real.cells, "departmental-ame", financial_year)
        other = lookup(real.cells, "other-ame", financial_year)
        table_tme = lookup(real.cells, "table-tme", financial_year)
        if total_del + departmental + other != table_tme:
            flag(
                "R1",
                f"{financial_year} sum {total_del + departmental + other} != TME {table_tme}",
            )
    other_2021 = lookup(real.cells, "other-ame", "2021-22")
    if other_2021 != SPOT_OTHER_AME_2021:
        flag("R1", f"2021-22 Other AME is {other_2021}, expected {SPOT_OTHER_AME_2021}")


def check_price_base(
    real: ControlSheet,
    nominal: ControlSheet,
    ready: Mapping[Key, int],
    flag,
) -> None:
    if real.resource_del.get(PRICE_BASE_YEAR) != SPOT_RESOURCE_DEL:
        flag(
            "R2",
            f"Table 1.2 resource DEL 2025-26 is {real.resource_del.get(PRICE_BASE_YEAR)}",
        )
    if nominal.resource_del.get(PRICE_BASE_YEAR) != SPOT_RESOURCE_DEL:
        flag(
            "R2",
            f"Table 1.1 resource DEL 2025-26 is {nominal.resource_del.get(PRICE_BASE_YEAR)}",
        )
    if real.resource_del.get(PRICE_BASE_YEAR) != nominal.resource_del.get(PRICE_BASE_YEAR):
        flag("R2", "2025-26 resource DEL real != nominal")
    for series, _, _, label in DEL_SERIES:
        real_amount = lookup(real.cells, series, PRICE_BASE_YEAR)
        nominal_amount = lookup(nominal.cells, series, PRICE_BASE_YEAR)
        if real_amount != nominal_amount:
            flag("R2", f"2025-26 {label} real {real_amount} != Table 1.1 {nominal_amount}")
        ready_amount = ready.get((series, PRICE_BASE_YEAR))
        if ready_amount is None:
            flag("R2", f"Ready tme-del-ame has no 2025-26 {series}")
        elif ready_amount != real_amount:
            flag("R2", f"2025-26 {label} real {real_amount} != Ready nominal {ready_amount}")
    for financial_year in EARLIER_DEL_YEARS:
        real_tme = lookup(real.cells, "table-tme", financial_year)
        nominal_tme = lookup(nominal.cells, "table-tme", financial_year)
        if real_tme == nominal_tme:
            flag("R2", f"{financial_year} real table TME equals nominal {real_tme}")
        ready_tme = ready.get(("table-tme", financial_year))
        if ready_tme is not None and ready_tme != nominal_tme:
            flag("R2", f"{financial_year} Ready TME {ready_tme} != Table 1.1 {nominal_tme}")
    resource = real.resource_del.get(SPOT_REBUILD_YEAR)
    capital = real.capital_del.get(SPOT_REBUILD_YEAR)
    published = lookup(real.cells, "total-del", SPOT_REBUILD_YEAR)
    if (resource, capital, (resource or 0) + (capital or 0), published) != SPOT_REBUILD:
        flag(
            "R2",
            f"2024-25 rebuild {resource}+{capital} vs Total DEL {published}, expected {SPOT_REBUILD}",
        )
    for financial_year in DEL_YEARS:
        rebuilt = real.resource_del[financial_year] + real.capital_del[financial_year]
        published_total = lookup(real.cells, "total-del", financial_year)
        if rebuilt == published_total:
            flag("R2", f"{financial_year} Total DEL equals resource+capital {rebuilt}")


def check_health(real: FunctionSheet, nominal: FunctionSheet, flag) -> None:
    real_health = lookup(real.cells, "cofog-07-health", SPOT_REBUILD_YEAR)
    nominal_health = lookup(nominal.cells, "cofog-07-health", SPOT_REBUILD_YEAR)
    if real_health != SPOT_HEALTH_REAL:
        flag("R3", f"Table 4.3 Health 2024-25 is {fmt_tenths(real_health)}, expected 250.8")
    if nominal_health != SPOT_HEALTH_NOMINAL:
        flag("R3", f"Table 4.2 Health 2024-25 is {fmt_tenths(nominal_health)}, expected 242.4")
    if real_health == nominal_health:
        flag("R3", "2024-25 real Health equals nominal Health")


def check_function_price_base(real: FunctionSheet, nominal: FunctionSheet, bundle: Bundle, flag) -> None:
    mismatches: list[str] = []
    unequal = 0
    compared = 0
    equal_cells: list[str] = []
    for series in TES_SERIES:
        real_amount = lookup(real.cells, series, PRICE_BASE_YEAR)
        nominal_amount = lookup(nominal.cells, series, PRICE_BASE_YEAR)
        if real_amount != nominal_amount:
            mismatches.append(f"{series} {fmt_tenths(real_amount)} != {fmt_tenths(nominal_amount)}")
        for financial_year in TES_YEARS:
            if financial_year == PRICE_BASE_YEAR:
                continue
            compared += 1
            real_earlier = lookup(real.cells, series, financial_year)
            nominal_earlier = lookup(nominal.cells, series, financial_year)
            if real_earlier != nominal_earlier:
                unequal += 1
            else:
                label = real.cells[(series, financial_year)].label
                equal_cells.append(f"{financial_year} {label} ({fmt_tenths(real_earlier)})")
    bundle.earlier_unequal = unequal
    bundle.earlier_cells = compared
    bundle.earlier_equal = equal_cells
    for message in mismatches[:8]:
        flag("R4", f"2025-26 {message}")
    if compared and unequal == 0:
        flag("R4", "Every earlier Table 4.3 cell equals Table 4.2; the price base was not applied")


def check_manifests(del_manifest: Mapping[str, object], tes_manifest: Mapping[str, object], real_del: ControlSheet, real_tes: FunctionSheet, flag) -> None:
    for name, manifest in (("tme-del-ame-real", del_manifest), ("tes-by-function-real", tes_manifest)):
        blob = manifest_blob(manifest)
        if "2025-26 price" not in blob:
            flag("R5", f"{name} manifest does not name 2025-26 prices")
        if "gdp deflator" not in blob or "30 june 2026" not in blob:
            flag("R5", f"{name} manifest is missing the ONS GDP deflator note")
        if "not monthly ebft" not in blob:
            flag("R5", f"{name} manifest does not say these rows are not monthly EBFT")
        if "do not deflate" not in blob:
            flag("R5", f"{name} manifest does not forbid deflating monthly EBFT")
        if "not applied" not in blob or "obr" not in blob:
            flag("R5", f"{name} manifest does not say the OBR plan-year deflator is not applied")
        if str(manifest.get("frequency") or "").casefold() != "annual":
            flag("R5", f"{name} frequency is {manifest.get('frequency')!r}")
    needles = ("2025-26 price", "gdp deflator", "30 june 2026", "office for national statistics")
    for label, text in (
        ("Table 1.2 footnote (1)", real_del.footnote_deflator),
        ("Table 4.3 footnote (1)", real_tes.footnote_deflator),
    ):
        folded = fold(text)
        if not all(needle in folded for needle in needles):
            flag("R5", f"{label} does not carry the ONS deflator sentence")
    if "resource del plus capital del" not in fold(real_del.footnote_total_del):
        flag("R2", "Table 1.2 footnote (7) does not describe Total DEL")
    for base in (DEL_BASE, TES_BASE):
        if any("oscar" in path.name.casefold() for path in base.rglob("*") if path.is_file()):
            flag("R7", f"OSCAR file under {base.name}")
    for filename in ("tme_del_ame_real.py", "tes_by_function_real.py"):
        connector = ROOT / "src" / "economy" / "connectors" / filename
        text = connector.read_text(encoding="utf-8") if connector.is_file() else ""
        if "data/economy/total-managed-expenditure" in text.replace("\\", "/"):
            flag("R5", f"{filename} reads the monthly EBFT dataset")


def check_scope(
    del_curated: Sequence[CuratedRow],
    tes_curated: Sequence[CuratedRow],
    ch1: Path,
    ch4: Path,
    flag,
) -> None:
    for row in (*del_curated, *tes_curated):
        match = _FY_LABEL.fullmatch(row.key[1])
        if match and int(match.group(1)) >= PLAN_START_YEAR:
            flag("R6", f"Plan year curated: {row.key}")
        if "£ billion" in row.unit and row.indicator_id == "tme-del-ame-real":
            flag("R6", f"£ billion mixed into tme-del-ame-real {row.key}")
        if "£ million" in row.unit and row.indicator_id == "tes-by-function-real":
            flag("R6", f"£ million mixed into tes-by-function-real {row.key}")
    del_years = {row.key[1] for row in del_curated}
    tes_years = {row.key[1] for row in tes_curated}
    if del_years != set(DEL_YEARS):
        flag("R6", f"tme-del-ame-real years {sorted(del_years)}")
    if tes_years != set(TES_YEARS):
        flag("R6", f"tes-by-function-real year span is not 2003-04 to 2025-26")
    for path in (ch1, ch4):
        hits = plan_year_hits(path)
        for hit in hits[:6]:
            flag("R6", f"Plan year cell {hit}")


def check_checksums_and_gaps(
    bundle: Bundle,
    del_claimed: str,
    tes_claimed: str,
    tes_manifest_text: str,
    tes_validation_text: str,
    flag,
) -> None:
    if bundle.ch1_sha != EXPECTED_CH1_SHA or bundle.ch1_sha != del_claimed:
        flag("R7", f"Chapter 1 sha256 disk={bundle.ch1_sha[:16]} manifest={del_claimed[:16]}")
    if bundle.ch4_sha != EXPECTED_CH4_SHA or bundle.ch4_sha != tes_claimed:
        flag("R7", f"Chapter 4 sha256 disk={bundle.ch4_sha[:16]} manifest={tes_claimed[:16]}")
    if bundle.nominal_sha and bundle.nominal_sha != bundle.ch1_sha:
        flag("R7", "Real Chapter 1 sha256 differs from the Ready tme-del-ame workbook")
    if bundle.real_tes is None:
        return
    if any(abs(gap.leaf_gap) > MAX_LEAF_TENTHS for gap in bundle.gaps):
        flag("R7", "A level-1 + EU gap exceeds £0.2 billion")
    if any(abs(gap.bridge_gap) > MAX_BRIDGE_TENTHS for gap in bundle.gaps):
        flag("R7", "A TES + adjustments gap exceeds £0.1 billion")
    if bundle.del_rows != EXPECTED_DEL_ROWS or bundle.tes_rows != EXPECTED_TES_ROWS:
        flag(
            "C-extra",
            f"Row counts del={bundle.del_rows} tes={bundle.tes_rows}, expected 20 and 322",
        )
    of_which = bundle.real_tes.of_which
    if of_which != EXPECTED_OF_WHICH:
        flag("C-extra", f"Table 4.3 of-which lines counted {of_which}, expected 8")
    documented = fold(tes_manifest_text + "\n" + tes_validation_text)
    if "of-which" not in documented and "of which" not in documented:
        flag("C-extra", "Of-which skip is not documented")
    elif "skipped 8" not in documented and "8" not in tes_validation_text:
        flag("C-extra", "Of-which count 8 is not written in the package notes", result="warn")


def build_gaps(real: FunctionSheet) -> list[GapYear]:
    gaps: list[GapYear] = []
    for financial_year in TES_YEARS:
        leaf = sum(lookup(real.cells, series, financial_year) for _, series, _, _ in FUNCTIONS)
        leaf += lookup(real.cells, "eu-transactions", financial_year)
        gaps.append(
            GapYear(
                fy=financial_year,
                leaf=leaf,
                tes=lookup(real.cells, "tes-total", financial_year),
                adjustments=lookup(real.cells, "accounting-adjustments", financial_year),
                tme=lookup(real.cells, "table-tme", financial_year),
            )
        )
    return gaps


def load_ready_nominal(path: Path) -> dict[Key, int]:
    ready: dict[Key, int] = {}
    if not path.is_file():
        return ready
    for row in load_curated(path, scale="million"):
        if row.key[0] in {spec[0] for spec in DEL_SERIES}:
            ready[row.key] = row.amount
    return ready


def pass_blurbs(bundle: Bundle) -> dict[str, str]:
    """One-line pass notes. Failed checks replace these with the failure text."""
    real = bundle.real_del
    tes = bundle.real_tes
    if real is None or tes is None:
        return {code: "Workbook parse did not finish" for code in CHECKS}
    resource = real.resource_del[SPOT_REBUILD_YEAR]
    capital = real.capital_del[SPOT_REBUILD_YEAR]
    nonzero = sum(1 for gap in bundle.gaps if gap.leaf_gap or gap.bridge_gap)
    max_leaf = max((abs(gap.leaf_gap) for gap in bundle.gaps), default=0)
    max_bridge = max((abs(gap.bridge_gap) for gap in bundle.gaps), default=0)
    return {
        "R1": (
            "Total DEL + Departmental AME + Other AME = table TME in all five years; "
            f"2021-22 Other AME is {fmt_million(lookup(real.cells, 'other-ame', '2021-22'))}"
        ),
        "R2": (
            f"Resource DEL 2025-26 is {fmt_million(real.resource_del[PRICE_BASE_YEAR])} "
            "on Table 1.2 and Table 1.1; "
            f"2024-25 resource {fmt_million(resource)} + capital {fmt_million(capital)} "
            f"= {fmt_million(resource + capital)}, not Total DEL "
            f"{fmt_million(lookup(real.cells, 'total-del', SPOT_REBUILD_YEAR))}; "
            "earlier real table TME is not nominal"
        ),
        "R3": (
            f"Table 4.3 Health 2024-25 is {fmt_tenths(lookup(tes.cells, 'cofog-07-health', '2024-25'))}; "
            f"Table 4.2 Health is {fmt_tenths(SPOT_HEALTH_NOMINAL)} and is not curated"
        ),
        "R4": (
            f"All {len(TES_SERIES)} curated Table 4.3 series equal Table 4.2 in 2025-26; "
            f"{bundle.earlier_unequal} of {bundle.earlier_cells} earlier cells differ"
        ),
        "R5": (
            "Manifests name 2025-26 prices, the ONS GDP deflator (30 June 2026), "
            "and that these rows are not deflated monthly EBFT"
        ),
        "R6": (
            "2025-26 is estimated on both packages; no plan-year cells; "
            "£ million and £ billion stay in their own packages"
        ),
        "R7": (
            "sha256 matches both manifests; no OSCAR; no residual function; "
            f"leaf gap at most {fmt_tenths(max_leaf)} and bridge gap at most {fmt_tenths(max_bridge)}; "
            f"{nonzero} of {len(bundle.gaps)} years are not exact at one decimal"
        ),
        "C-extra": (
            f"{bundle.del_rows} and {bundle.tes_rows} curated rows; "
            f"{tes.of_which} of-which lines skipped and documented"
        ),
    }


def write_report(
    problems: Mapping[str, list[str]],
    forced: Mapping[str, str],
    bundle: Bundle,
) -> tuple[str, int, int, int]:
    names = {
        "R1": "Table 1.2 Total DEL + Departmental AME + Other AME = table TME",
        "R2": "Resource DEL 2025-26 = 496,670; Total DEL is the published row",
        "R3": "Table 4.3 Health 2024-25 = 250.8; Table 4.2 Health 242.4 is context",
        "R4": "2025-26 real = nominal for every curated Table 4.3 series",
        "R5": "2025-26 prices, ONS deflator, not monthly EBFT, no Exchange deflator",
        "R6": "2025-26 estimated; no plan years; £ million and £ billion not mixed",
        "R7": "Raw sha256; no OSCAR; no residual function for the leaf gap",
        "C-extra": "Row counts 20 and 322; of-which skip documented",
    }
    blurbs = pass_blurbs(bundle)
    rows = [(code, names[code], *_result(code, problems, forced, blurbs)) for code in CHECKS]
    passed = sum(1 for code in CHECKS if _result(code, problems, forced, blurbs)[0] == "pass")
    warned = sum(1 for code in CHECKS if _result(code, problems, forced, blurbs)[0] == "warn")
    failed = sum(1 for code in CHECKS if _result(code, problems, forced, blurbs)[0] == "fail")
    verdict = "pass" if failed == 0 else "fail"
    ready = verdict == "pass"

    lines = [
        "# QA report — Economy 07 real-terms pins · 2026-11-15",
        "",
        "## Scope",
        "",
        "- Work plan: `EC-VAL-07C`",
        "- Indicators: `tme-del-ame-real` (PSS July 2026 Table 1.2, £ million, 2025-26 prices) and `tes-by-function-real` (Table 4.3, £ billion, 2025-26 prices)",
        "- Handover: `docs/handover-economy-07-real-pin.md`",
        "- Kickoff: `docs/agent-kickoff-validation-economy-07-real.md`",
        "- Script: `validation.qa_economy_07_real_2026_11_15`",
        "- Vintage: raw `2026-11-15` · HMT file updated **2026-07-29**",
        "- Read-only context: Ready `tme-del-ame` (Table 1.1) and Table 4.2 in the same Chapter 4 workbook. Table 4.2 is not a curated series.",
        "",
        "## Independence",
        "",
        "Validation read the pinned Chapter 1 and Chapter 4 workbooks and the curated CSVs.",
        "It did not import the Economy connectors and did not edit `data/economy/`.",
        "Economy self-QA JSON was not used as the source of the figures below.",
        "2025-26 real equalling nominal is the price-base year. Earlier years differing is correct.",
        "These pins do not contain a monthly real EBFT series. That absence is not a fail.",
        "",
        "## Checks",
        "",
        markdown_table(("ID", "Check", "Result", "Notes"), rows),
        "",
        "## Spots recomputed from the workbooks",
        "",
    ]

    real = bundle.real_del
    nominal = bundle.nominal_del
    tes = bundle.real_tes
    nominal_tes = bundle.nominal_tes
    if real is None or nominal is None or tes is None or nominal_tes is None:
        lines.append("Workbook parse did not finish, so spot tables were not built.")
        lines.append("")
    else:
        lines.extend(["### R1 — DEL, AME, and this table's real TME", ""])
        identity_rows = []
        for financial_year in DEL_YEARS:
            total_del = lookup(real.cells, "total-del", financial_year)
            departmental = lookup(real.cells, "departmental-ame", financial_year)
            other = lookup(real.cells, "other-ame", financial_year)
            table_tme = lookup(real.cells, "table-tme", financial_year)
            identity_rows.append(
                (
                    financial_year,
                    fmt_million(total_del),
                    fmt_million(departmental),
                    fmt_million(other),
                    fmt_million(total_del + departmental + other - table_tme),
                    fmt_million(table_tme),
                )
            )
        lines.append(
            markdown_table(
                (
                    "Financial year",
                    "Total DEL",
                    "Departmental AME",
                    "Other AME",
                    "Sum minus TME",
                    "Table TME",
                ),
                identity_rows,
            )
        )
        lines.extend(
            [
                "",
                "Other AME is curated, including the negative 2021-22 value. "
                "The identity is exact in £ million.",
                "",
                "### R2 — price base, and Total DEL not rebuilt",
                "",
                "Unit: £ million. In 2025-26 the price base means real equals nominal.",
                "",
            ]
        )
        price_rows = []
        for financial_year in DEL_YEARS:
            resource = real.resource_del[financial_year]
            capital = real.capital_del[financial_year]
            published = lookup(real.cells, "total-del", financial_year)
            real_tme = lookup(real.cells, "table-tme", financial_year)
            nominal_tme = lookup(nominal.cells, "table-tme", financial_year)
            price_rows.append(
                (
                    financial_year,
                    fmt_million(resource),
                    fmt_million(nominal.resource_del[financial_year]),
                    fmt_million(resource + capital),
                    fmt_million(published),
                    fmt_million(real_tme),
                    fmt_million(nominal_tme),
                )
            )
        lines.append(
            markdown_table(
                (
                    "Financial year",
                    "Real resource DEL",
                    "Nominal resource DEL",
                    "Resource + capital",
                    "Published Total DEL",
                    "Real table TME",
                    "Nominal table TME",
                ),
                price_rows,
            )
        )
        lines.extend(
            [
                "",
                f"2024-25 resource DEL {fmt_million(SPOT_REBUILD[0])} + capital DEL "
                f"{fmt_million(SPOT_REBUILD[1])} = **{fmt_million(SPOT_REBUILD[2])}**, "
                f"not published Total DEL **{fmt_million(SPOT_REBUILD[3])}**. "
                "Those two lines are not curated.",
                "",
                f"Footnote (7): {real.footnote_total_del or '(7) not found'}",
                "",
                "Ready `tme-del-ame` 2025-26 control totals match Table 1.2. "
                "Earlier real table TME does not match that nominal pin.",
                "",
                "### R3 — Health, 2024-25",
                "",
                f"Table 4.3 Health is **{fmt_tenths(lookup(tes.cells, 'cofog-07-health', '2024-25'))}** "
                "£ billion, 2025-26 prices. "
                f"Table 4.2 Health is **{fmt_tenths(lookup(nominal_tes.cells, 'cofog-07-health', '2024-25'))}**. "
                "The nominal figure is context. It is not a curated row. "
                "The two figures differ, which is correct outside the price-base year.",
                "",
                "### R4 — 2025-26 real equals nominal Table 4.2",
                "",
            ]
        )
        twin_rows = []
        for series in TES_SERIES:
            cell = tes.cells[(series, PRICE_BASE_YEAR)]
            twin_rows.append(
                (
                    cell.label,
                    fmt_tenths(cell.amount),
                    fmt_tenths(lookup(nominal_tes.cells, series, PRICE_BASE_YEAR)),
                )
            )
        lines.append(markdown_table(("Series", "Table 4.3 2025-26", "Table 4.2 2025-26"), twin_rows))
        lines.extend(
            [
                "",
                f"Earlier cells that differ: **{bundle.earlier_unequal}** of **{bundle.earlier_cells}**. "
                "Inequality before 2025-26 is the price base at work. "
                + (
                    "The earlier cell that is also equal: " + "; ".join(bundle.earlier_equal) + "."
                    if bundle.earlier_equal
                    else "Every earlier cell differs."
                ),
                "",
                "### R7 — published rounding, no residual",
                "",
                "Level-1 leaves plus EU can miss published TES by up to £0.2 billion. "
                "TES plus accounting adjustments can miss this table's TME by up to £0.1 billion. "
                "The published cells are stored. No residual function was added.",
                "",
            ]
        )
        gap_rows = [
            (
                gap.fy,
                fmt_tenths(gap.leaf),
                fmt_tenths(gap.tes),
                fmt_tenths(gap.leaf_gap),
                fmt_tenths(gap.adjustments),
                fmt_tenths(gap.tme),
                fmt_tenths(gap.bridge_gap),
            )
            for gap in bundle.gaps
        ]
        lines.append(
            markdown_table(
                (
                    "Financial year",
                    "Leaves + EU",
                    "Published TES",
                    "Leaf gap",
                    "Adjustments",
                    "Table TME",
                    "Bridge gap",
                ),
                gap_rows,
            )
        )
        health_year = next(gap for gap in bundle.gaps if gap.fy == "2024-25")
        lines.extend(
            [
                "",
                f"2024-25: EU transactions **{fmt_tenths(lookup(tes.cells, 'eu-transactions', '2024-25'))}**, "
                f"TES **{fmt_tenths(health_year.tes)}**, adjustments **{fmt_tenths(health_year.adjustments)}**, "
                f"table TME **{fmt_tenths(health_year.tme)}**, bridge gap **{fmt_tenths(health_year.bridge_gap)}**. "
                f"Of-which lines on Table 4.3: **{tes.of_which}**, none curated.",
                "",
                "### Units are not spliced",
                "",
                "Table 1.2 and Table 4.3 share an HMT concept at different rounding. "
                "The £ million series is not divided into the £ billion series.",
                "",
            ]
        )
        splice_rows = []
        for financial_year in DEL_YEARS:
            million = lookup(real.cells, "table-tme", financial_year)
            billion = lookup(tes.cells, "table-tme", financial_year)
            splice_rows.append(
                (
                    financial_year,
                    fmt_million(million),
                    f"{million / 1000:,.3f}",
                    fmt_tenths(billion),
                )
            )
        lines.append(
            markdown_table(
                ("Financial year", "Table 1.2 (£ million)", "÷ 1,000", "Table 4.3 (£ billion)"),
                splice_rows,
            )
        )
        lines.extend(
            [
                "",
                "### C-extra — checksums and row counts",
                "",
                f"- Chapter 1 sha256: `{bundle.ch1_sha}`",
                f"- Chapter 4 sha256: `{bundle.ch4_sha}`",
                f"- Ready `tme-del-ame` Chapter 1 sha256: `{bundle.nominal_sha or 'not found'}`",
                f"- Curated rows: `tme-del-ame-real` **{bundle.del_rows}**, `tes-by-function-real` **{bundle.tes_rows}**",
                f"- Table 4.3 of-which lines skipped: **{tes.of_which}**",
                "",
            ]
        )

    lines.extend(
        [
            "## Method notes",
            "",
            "- Geography on the curated rows is United Kingdom (`K02000001`). Frequency is annual. `tme-del-ame-real` is £ million. `tes-by-function-real` is £ billion. Both are 2025-26 prices.",
            "- Workbook footnote (1) on Table 1.2 and Table 4.3 says real-terms figures are the nominal figures adjusted to 2025-26 price levels using GDP deflators from the Office for National Statistics (released 30 June 2026). The manifests say the OBR forecast deflator used for PESA plan years is not applied.",
            "- The workbook header stamps 2025-26 as outturn. `observation_status=estimated` matches the PSS July 2026 bulletin: this release is the first estimate of 2025-26, and later editions can still revise it. Earlier pinned years are `final`.",
            "- Defence is the UN COFOG row. Public-sector debt interest stays inside General public services as an of-which line.",
            "- Real HMT table TME is not monthly `total-managed-expenditure` divided by CPIH or by a GDP deflator. No monthly real EBFT series is required here.",
            "- The next PSS key-series update sits in the November, February, and April cycle. That is a later re-pin, not a fail of this vintage.",
            "",
            "## Summary",
            "",
            f"- **Verdict: {verdict}** on R1–R7 + C-extra ({passed} pass / {warned} warn / {failed} fail).",
            (
                "- **Recommend Ready: yes** for `tme-del-ame-real` and `tes-by-function-real` on this PSS July 2026 vintage. Orchestrator flips the registry. Validation did not edit Notion."
                if ready
                else "- **Recommend Ready: no.** Economy should fix the failed checks. Validation did not edit curated data or Notion."
            ),
            "- Do not drop Other AME, invent a residual function, or rebuild Total DEL from resource DEL + capital DEL.",
            "- Do not splice £ million Table 1.2 onto £ billion Table 4.3, and do not deflate monthly EBFT to match these tables.",
            "",
            "## Blockers",
            "",
        ]
    )
    if failed:
        lines.append("- Failed checks are for Economy. See the table above. Curated files were left unchanged.")
    else:
        lines.append("- None that block Ready on this vintage.")
    lines.extend(
        [
            "- 2025-26 remains a first estimate and can move at the next PSS release (November, February, and April cycle).",
            "- Table 4.3 rounding is up to £0.2 billion on the leaf sum and £0.1 billion on TES + adjustments versus TME. Store the published cells.",
            "- Real HMT table TME is not a real monthly EBFT series.",
            "",
            "## Reproduce",
            "",
            "```bash",
            "uv run python -m validation.qa_economy_07_real_2026_11_15",
            "```",
            "",
        ]
    )
    REPORT.parent.mkdir(parents=True, exist_ok=True)
    REPORT.write_text("\n".join(lines), encoding="utf-8")
    print(f"Wrote {REPORT.relative_to(ROOT)} — {verdict} ({passed} pass / {warned} warn / {failed} fail)")
    return verdict, passed, warned, failed


def main() -> int:
    """Run R1–R7 and C-extra. Write the QA report even when a check fails."""
    problems: dict[str, list[str]] = {code: [] for code in CHECKS}
    forced: dict[str, str] = {}

    def flag(code: str, message: str, *, result: str = "fail") -> None:
        problems[code].append(message)
        forced[code] = worse(forced.get(code, "pass"), result)

    del_manifest = yaml.safe_load((DEL_BASE / "manifest.yaml").read_text(encoding="utf-8"))
    tes_manifest = yaml.safe_load((TES_BASE / "manifest.yaml").read_text(encoding="utf-8"))
    nominal_manifest_path = NOMINAL_DEL_BASE / "manifest.yaml"
    nominal_manifest = (
        yaml.safe_load(nominal_manifest_path.read_text(encoding="utf-8"))
        if nominal_manifest_path.is_file()
        else {}
    )
    ch1, del_claimed = raw_path(DEL_BASE, del_manifest)
    ch4, tes_claimed = raw_path(TES_BASE, tes_manifest)
    nominal_raw, _nominal_claimed = raw_path(NOMINAL_DEL_BASE, nominal_manifest)
    bundle = Bundle(
        ch1_sha=sha256(ch1) if ch1.is_file() else "",
        ch4_sha=sha256(ch4) if ch4.is_file() else "",
        nominal_sha=sha256(nominal_raw) if nominal_raw.is_file() else "",
    )
    tes_validation = TES_BASE / "validation_report.md"
    tes_validation_text = tes_validation.read_text(encoding="utf-8") if tes_validation.is_file() else ""

    try:
        bundle.real_del = parse_control(ch1, "Table_1_2", "1.2")
        bundle.nominal_del = parse_control(ch1, "Table_1_1", "1.1")
        bundle.real_tes = parse_function(ch4, "4_3", "4.3")
        bundle.nominal_tes = parse_function(ch4, "4_2", "4.2")
        bundle.gaps = build_gaps(bundle.real_tes)
    except (OSError, ValueError, KeyError) as exc:
        flag("R1", f"Workbook parse failed: {exc}")
        flag("R3", f"Workbook parse failed: {exc}")
        flag("R4", f"Workbook parse failed: {exc}")
        check_checksums_and_gaps(
            bundle,
            del_claimed,
            tes_claimed,
            manifest_blob(tes_manifest),
            tes_validation_text,
            flag,
        )
        verdict, _passed, _warned, failed = write_report(problems, forced, bundle)
        return 1 if failed or verdict == "fail" else 0

    del_curated = load_curated(DEL_BASE / "curated" / "observations.csv", scale="million")
    tes_curated = load_curated(TES_BASE / "curated" / "observations.csv", scale="tenth")
    bundle.del_rows = len(del_curated)
    bundle.tes_rows = len(tes_curated)
    bundle.nominal_ready = load_ready_nominal(NOMINAL_DEL_BASE / "curated" / "observations.csv")

    check_identity(bundle.real_del, flag)
    check_price_base(bundle.real_del, bundle.nominal_del, bundle.nominal_ready, flag)
    check_health(bundle.real_tes, bundle.nominal_tes, flag)
    check_function_price_base(bundle.real_tes, bundle.nominal_tes, bundle, flag)
    compare_curated(
        bundle.real_del.cells,
        del_curated,
        indicator_id="tme-del-ame-real",
        unit=DEL_UNIT,
        table="1.2",
        code="R1",
        flag=flag,
    )
    compare_curated(
        bundle.real_tes.cells,
        tes_curated,
        indicator_id="tes-by-function-real",
        unit=TES_UNIT,
        table="4.3",
        code="R4",
        flag=flag,
    )
    check_manifests(del_manifest, tes_manifest, bundle.real_del, bundle.real_tes, flag)
    check_scope(del_curated, tes_curated, ch1, ch4, flag)
    check_checksums_and_gaps(
        bundle,
        del_claimed,
        tes_claimed,
        manifest_blob(tes_manifest),
        tes_validation_text,
        flag,
    )
    _verdict, _passed, _warned, failed = write_report(problems, forced, bundle)
    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(main())
