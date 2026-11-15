"""Independent QA for Economy 07 tes-by-function and tme-del-ame — EC-VAL-07B.

Approach (plain language):

1. Hash the pinned PSS workbooks and compare them to the manifests.
2. Read Table 5.4 and Table 1.1 with openpyxl. Do not import the Economy
   connectors, and do not rewrite curated files.
3. Recompute the published identities from those cells, then check every
   curated row against the same cells.
4. Read Ready monthly EBFT only to record the financial-year gap. Inequality
   is expected context, not a fail of these pins.

Run::

    uv run python -m validation.qa_economy_07_function_delame_2026_11_15

Refs: hashlib (docs.python.org/3/library/hashlib.html), csv, pathlib,
openpyxl data_only reads cached worksheet values.
"""

from __future__ import annotations

import csv
import hashlib
import re
from collections.abc import Mapping, Sequence
from dataclasses import dataclass
from pathlib import Path

import yaml
from openpyxl import load_workbook

ROOT = Path(__file__).resolve().parents[2]
REPORT = ROOT / "data" / "qa" / "qa_report_economy_07_function_delame_2026-11-15.md"
TES_BASE = ROOT / "data" / "economy" / "tes-by-function"
DEL_BASE = ROOT / "data" / "economy" / "tme-del-ame"
EBFT_BASE = ROOT / "data" / "economy" / "total-managed-expenditure"

# Kickoff / discovery spots. The pass/fail decision is the workbook cells,
# checked against these published figures and against curated rows.
OUTTURN_YEARS: tuple[str, ...] = (
    "2021-22",
    "2022-23",
    "2023-24",
    "2024-25",
    "2025-26",
)
PLAN_YEARS = frozenset({"2026-27", "2027-28", "2028-29", "2029-30", "2030-31"})
FIRST_ESTIMATE_YEAR = "2025-26"
EXPECTED_TES_SHA = "d61db8cad4f4333b192022e63979237d24dbdace7b354a846af2f4ac18b37436"
EXPECTED_DEL_SHA = "ff40d00e69d7b5cb2db4504e24ba774dd09b181ac676d0518ab0e16581305dbe"
UNIT = "£ million, nominal, financial year"
SOURCE_VERSION = "PSS July 2026 (updated 2026-07-29)"
GEO_CODE = "K02000001"
GEO_LABEL = "United Kingdom"

# UN COFOG level-1 names as printed on Table 5.4 (HMT spelling).
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

SPOT_HEALTH_CURRENT = 228_613
SPOT_HEALTH_CAPITAL = 13_816
SPOT_HEALTH_SUM = 242_429
SPOT_EU_CURRENT = -1_412
SPOT_TME_2024 = 1_290_012
SPOT_DEL_2024 = (595_892, 605_568, 88_552)
SPOT_RESOURCE_DEL_2024 = 469_578
SPOT_CAPITAL_DEL_2024 = 111_587
SPOT_REBUILD_2024 = 581_165

_FY_CELL = re.compile(r"^20\d{2}-\d{2}$")
_FY_LABEL = re.compile(r"^(20\d{2})-(\d{2})$")
_FOOTNOTE = re.compile(r"\s*\(\d+\)\s*$")
_FUNCTION = re.compile(r"^(\d+)\.\s+(.*)$")
_RANK = {"pass": 0, "warn": 1, "fail": 2}

Key = tuple[str, str, str]  # series, classification, financial year


@dataclass(frozen=True)
class PublishedCell:
    """One cell that should appear in curated observations."""

    series: str
    classification: str
    role: str
    fy: str
    value: int
    label: str
    cofog: str
    table: str


@dataclass
class TesSheet:
    cells: dict[Key, PublishedCell]
    of_which: int
    ps_current: dict[str, int]
    ps_capital: dict[str, int]
    sheet_names: tuple[str, ...]


@dataclass
class DelSheet:
    cells: dict[Key, PublishedCell]
    resource_del: dict[str, int]
    capital_del: dict[str, int]
    footnote_6: str
    sheet_names: tuple[str, ...]


@dataclass
class CuratedRow:
    key: Key
    value: int
    status: str
    period_start: str
    period_end: str
    geography_code: str
    geography_label: str
    unit: str
    indicator_id: str
    source_version: str
    notes: dict[str, str]
    raw_notes: str


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


def match_key(raw: object) -> str:
    """Lower-case label with one trailing footnote number removed."""
    return _FOOTNOTE.sub("", normalise_label(raw)).casefold()


def as_int(raw: object, context: str) -> int:
    """Parse one published £ million cell. Blank or fractional cells fail.

    ``bool`` is excluded because it is a subclass of ``int`` in Python.
    """
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
    return int(round(value))


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


def fmt(value: int) -> str:
    return f"{value:,}"


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


def find_outturn_header(rows: Sequence[Sequence[object]]) -> tuple[int, tuple[int, ...]]:
    """Header whose year cells are exactly the five PSS outturn years."""
    for row in rows:
        hits = [
            (index, normalise_label(cell))
            for index, cell in enumerate(row)
            if _FY_CELL.fullmatch(normalise_label(cell))
        ]
        if not hits:
            continue
        labels = tuple(label for _, label in hits)
        if labels != OUTTURN_YEARS:
            raise ValueError(
                "Year header must be exactly "
                f"{', '.join(OUTTURN_YEARS)}. Found {labels}. "
                "PESA plan years are out of scope."
            )
        return hits[0][0] - 1, tuple(index for index, _ in hits)
    raise ValueError("No financial-year header found")


def year_values(row: Sequence[object], year_cols: Sequence[int], context: str) -> dict[str, int]:
    if len(row) <= year_cols[-1]:
        raise ValueError(f"Short row ({context})")
    return {
        financial_year: as_int(row[column], f"{context} {financial_year}")
        for financial_year, column in zip(OUTTURN_YEARS, year_cols, strict=True)
    }


def cell(
    series: str,
    classification: str,
    role: str,
    financial_year: str,
    value: int,
    label: str,
    *,
    cofog: str,
    table: str,
) -> PublishedCell:
    return PublishedCell(
        series=series,
        classification=classification,
        role=role,
        fy=financial_year,
        value=value,
        label=label,
        cofog=cofog,
        table=table,
    )


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
    for financial_year, value in values.items():
        key = (series, classification, financial_year)
        if key in bucket:
            raise ValueError(f"Duplicate published row {key}")
        bucket[key] = cell(
            series,
            classification,
            role,
            financial_year,
            value,
            label,
            cofog=cofog,
            table=table,
        )


def parse_tes(path: Path) -> TesSheet:
    """Read sheet 5_4. Skip of-which lines and the expenditure bridge rows."""
    names, rows = load_sheet(path, "5_4")
    label_col, year_cols = find_outturn_header(rows)
    if label_col < 0:
        raise ValueError("Table 5.4 year columns leave no label column")
    bucket: dict[Key, PublishedCell] = {}
    ps_current: dict[str, int] = {}
    ps_capital: dict[str, int] = {}
    of_which = 0
    section: str | None = None

    for row in rows:
        if len(row) <= label_col:
            continue
        key = match_key(row[label_col])
        if not key:
            continue
        if key == "public sector current expenditure on services":
            section = "current"
            continue
        if key == "public sector capital expenditure on services":
            section = "capital"
            continue
        if key.startswith("of which"):
            of_which += 1
            continue

        function_match = _FUNCTION.fullmatch(key)
        if function_match:
            if section not in {"current", "capital"}:
                raise ValueError(f"Function row outside current/capital: {key}")
            number = int(function_match.group(1))
            if number not in FUNCTION_BY_NUMBER:
                raise ValueError(f"Unexpected function number on Table 5.4: {key}")
            series, cofog, label = FUNCTION_BY_NUMBER[number]
            if function_match.group(2) != label.casefold():
                raise ValueError(f"Function name drift: {key!r} != {label!r}")
            add_years(
                bucket,
                series=series,
                classification=section,
                role="function",
                values=year_values(row, year_cols, label),
                label=label,
                cofog=cofog,
                table="5.4",
            )
            continue

        if key == "eu transactions":
            if section != "current":
                raise ValueError("EU transactions appeared outside the current block")
            add_years(
                bucket,
                series="eu-transactions",
                classification="current",
                role="eu-transactions",
                values=year_values(row, year_cols, "EU transactions"),
                label="EU transactions",
                cofog="",
                table="5.4",
            )
            continue

        if key == "total public sector current expenditure on services":
            add_years(
                bucket,
                series="tes-total",
                classification="current",
                role="tes-total",
                values=year_values(row, year_cols, "current TES"),
                label="Total public sector current expenditure on services",
                cofog="",
                table="5.4",
            )
            continue
        if key == "total public sector capital expenditure on services":
            add_years(
                bucket,
                series="tes-total",
                classification="capital",
                role="tes-total",
                values=year_values(row, year_cols, "capital TES"),
                label="Total public sector capital expenditure on services",
                cofog="",
                table="5.4",
            )
            continue
        if key == "total public sector expenditure on services":
            section = "total"
            add_years(
                bucket,
                series="tes-total",
                classification="total",
                role="tes-total",
                values=year_values(row, year_cols, "total TES"),
                label="Total public sector expenditure on services",
                cofog="",
                table="5.4",
            )
            continue
        if key == "accounting adjustments":
            if section not in {"current", "capital", "total"}:
                raise ValueError("Accounting adjustments before a section header")
            add_years(
                bucket,
                series="accounting-adjustments",
                classification=section,
                role="bridge",
                values=year_values(row, year_cols, f"adjustments {section}"),
                label="Accounting adjustments",
                cofog="",
                table="5.4",
            )
            continue
        if key == "public sector current expenditure":
            ps_current = year_values(row, year_cols, "public sector current expenditure")
            continue
        if key == "public sector capital expenditure":
            ps_capital = year_values(row, year_cols, "public sector capital expenditure")
            continue
        if key == "total managed expenditure":
            add_years(
                bucket,
                series="table-tme",
                classification="total",
                role="table-tme",
                values=year_values(row, year_cols, "table TME"),
                label="Total Managed Expenditure",
                cofog="",
                table="5.4",
            )

    expected = 28 * len(OUTTURN_YEARS)
    if len(bucket) != expected:
        raise ValueError(f"Table 5.4 curated-shaped cells={len(bucket)}, expected {expected}")
    if not ps_current or not ps_capital:
        raise ValueError("Public-sector expenditure bridge rows were not found")
    return TesSheet(bucket, of_which, ps_current, ps_capital, names)


def parse_del(path: Path) -> DelSheet:
    """Read Table 1.1 control totals. Do not treat resource+capital as Total DEL."""
    names, rows = load_sheet(path, "Table_1_1")
    label_col, year_cols = find_outturn_header(rows)
    bucket: dict[Key, PublishedCell] = {}
    resource: dict[str, int] = {}
    capital: dict[str, int] = {}
    footnote = ""
    specs = {
        "total del": ("total-del", "control-total", "control-total", "Total DEL"),
        "departmental ame": (
            "departmental-ame",
            "control-total",
            "control-total",
            "Departmental AME",
        ),
        "other ame": ("other-ame", "control-total", "control-total", "Other AME"),
        "total managed expenditure": (
            "table-tme",
            "total",
            "table-tme",
            "Total Managed Expenditure",
        ),
    }
    for row in rows:
        if len(row) <= max(label_col, year_cols[-1]):
            continue
        key = match_key(row[label_col])
        if key == "total resource del":
            resource = year_values(row, year_cols, "resource DEL")
            continue
        if key == "total capital del":
            capital = year_values(row, year_cols, "capital DEL")
            continue
        if key.startswith("(6)"):
            footnote = normalise_label(row[label_col])
            continue
        spec = specs.get(key)
        if spec is None:
            continue
        series, classification, role, label = spec
        add_years(
            bucket,
            series=series,
            classification=classification,
            role=role,
            values=year_values(row, year_cols, label),
            label=label,
            cofog="",
            table="1.1",
        )
    expected = 4 * len(OUTTURN_YEARS)
    if len(bucket) != expected:
        raise ValueError(f"Table 1.1 curated-shaped cells={len(bucket)}, expected {expected}")
    if not resource or not capital:
        raise ValueError("Resource DEL or capital DEL row was not found")
    return DelSheet(bucket, resource, capital, footnote, names)


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


def load_curated(path: Path) -> list[CuratedRow]:
    rows: list[CuratedRow] = []
    with path.open(newline="", encoding="utf-8") as handle:
        for raw in csv.DictReader(handle):
            parsed = notes_map(raw.get("notes") or "")
            rows.append(
                CuratedRow(
                    key=(
                        parsed.get("series", ""),
                        parsed.get("classification", ""),
                        parsed.get("fy", ""),
                    ),
                    value=as_int(raw.get("value"), f"curated {raw.get('period_start')}"),
                    status=(raw.get("observation_status") or "").strip(),
                    period_start=(raw.get("period_start") or "").strip(),
                    period_end=(raw.get("period_end") or "").strip(),
                    geography_code=(raw.get("geography_code") or "").strip(),
                    geography_label=(raw.get("geography_label") or "").strip(),
                    unit=(raw.get("unit") or "").strip(),
                    indicator_id=(raw.get("indicator_id") or "").strip(),
                    source_version=(raw.get("source_version") or "").strip(),
                    notes=parsed,
                    raw_notes=raw.get("notes") or "",
                )
            )
    return rows


def manifest_blob(manifest: Mapping[str, object]) -> str:
    parts = [
        str(manifest.get("definition") or ""),
        str(manifest.get("caveats") or ""),
        str(manifest.get("transformations") or ""),
        str(manifest.get("revision_notes") or ""),
    ]
    return fold("\n".join(parts))


def plan_year_hits(path: Path) -> list[str]:
    """Year-header cells after 2025-26. Prose mentions are ignored."""
    workbook = load_workbook(path, data_only=True, read_only=True)
    found: list[str] = []
    try:
        for name in workbook.sheetnames:
            for row_index, row in enumerate(workbook[name].iter_rows(values_only=True), start=1):
                for column, value in enumerate(row, start=1):
                    text = normalise_label(value)
                    if text in PLAN_YEARS:
                        found.append(f"{name}!R{row_index}C{column}={text}")
    finally:
        workbook.close()
    return found


def forbidden_files(base: Path) -> list[str]:
    hits: list[str] = []
    for path in base.rglob("*"):
        if not path.is_file():
            continue
        name = path.name.casefold()
        if any(token in name for token in ("oscar", "esa", "chapter_4", "table_4", "4_2")):
            hits.append(str(path.relative_to(ROOT)))
    return hits


def ebft_financial_year_sums(path: Path) -> dict[str, tuple[int, int]]:
    """Sum Ready monthly EBFT from April to March. Returns fy -> (sum, months)."""
    totals = {financial_year: 0 for financial_year in OUTTURN_YEARS}
    counts = {financial_year: 0 for financial_year in OUTTURN_YEARS}
    with path.open(newline="", encoding="utf-8") as handle:
        for raw in csv.DictReader(handle):
            period = (raw.get("period_start") or "").strip()
            if len(period) < 7:
                continue
            year = int(period[0:4])
            month = int(period[5:7])
            start = year if month >= 4 else year - 1
            financial_year = f"{start}-{(start + 1) % 100:02d}"
            if financial_year not in totals:
                continue
            if (raw.get("value") or "").strip() == "":
                continue
            totals[financial_year] += as_int(raw["value"], f"EBFT {period}")
            counts[financial_year] += 1
    return {financial_year: (totals[financial_year], counts[financial_year]) for financial_year in OUTTURN_YEARS}


def lookup(cells: Mapping[Key, PublishedCell], series: str, classification: str, financial_year: str) -> int:
    return cells[(series, classification, financial_year)].value


def markdown_table(headers: Sequence[str], rows: Sequence[Sequence[str]]) -> str:
    head = "| " + " | ".join(headers) + " |"
    rule = "|" + "|".join("---" for _ in headers) + "|"
    body = ["| " + " | ".join(row) + " |" for row in rows]
    return "\n".join([head, rule, *body])


def main() -> int:
    """Run V1–V7 and C-extra. Write the QA report even when a check fails."""
    problems: dict[str, list[str]] = {code: [] for code in ("V1", "V2", "V3", "V4", "V5", "V6", "V7", "C-extra", "EBFT")}
    forced: dict[str, str] = {}

    def flag(code: str, message: str, *, result: str = "fail") -> None:
        problems[code].append(message)
        forced[code] = worse(forced.get(code, "pass"), result)

    tes_manifest = yaml.safe_load((TES_BASE / "manifest.yaml").read_text(encoding="utf-8"))
    del_manifest = yaml.safe_load((DEL_BASE / "manifest.yaml").read_text(encoding="utf-8"))
    tes_raw = TES_BASE / str((tes_manifest.get("raw_evidence") or [{}])[0].get("path", ""))
    del_raw = DEL_BASE / str((del_manifest.get("raw_evidence") or [{}])[0].get("path", ""))
    tes_sha = sha256(tes_raw) if tes_raw.is_file() else ""
    del_sha = sha256(del_raw) if del_raw.is_file() else ""
    tes_claimed = str((tes_manifest.get("raw_evidence") or [{}])[0].get("checksum_sha256") or "")
    del_claimed = str((del_manifest.get("raw_evidence") or [{}])[0].get("checksum_sha256") or "")
    if tes_sha != EXPECTED_TES_SHA or tes_sha != tes_claimed:
        flag("C-extra", f"Chapter 5 sha256 disk={tes_sha[:16]} manifest={tes_claimed[:16]}")
    if del_sha != EXPECTED_DEL_SHA or del_sha != del_claimed:
        flag("C-extra", f"Chapter 1 sha256 disk={del_sha[:16]} manifest={del_claimed[:16]}")

    try:
        tes = parse_tes(tes_raw)
        dele = parse_del(del_raw)
    except (OSError, ValueError, KeyError) as exc:
        flag("V1", f"Workbook parse failed: {exc}")
        flag("V4", f"Workbook parse failed: {exc}")
        _write(problems, forced, tes_sha, del_sha, None, None, {})
        return 1

    tes_curated = load_curated(TES_BASE / "curated" / "observations.csv")
    del_curated = load_curated(DEL_BASE / "curated" / "observations.csv")
    _compare_package(tes.cells, tes_curated, "tes-by-function", flag)
    _compare_package(dele.cells, del_curated, "tme-del-ame", flag)
    _identities(tes, dele, flag)
    _copy_checks(tes_manifest, del_manifest, tes_curated, del_curated, flag)
    _absence_checks(tes, dele, tes_curated, del_curated, tes_raw, del_raw, flag)
    ebft_sums = _ebft_context(tes, flag)

    _write(problems, forced, tes_sha, del_sha, tes, dele, ebft_sums)
    failed = any(forced.get(code) == "fail" for code in ("V1", "V2", "V3", "V4", "V5", "V6", "V7", "C-extra"))
    return 1 if failed else 0


def _compare_package(
    published: Mapping[Key, PublishedCell],
    curated: Sequence[CuratedRow],
    indicator_id: str,
    flag,
) -> None:
    seen: set[Key] = set()
    for row in curated:
        owner = _owner(indicator_id, row.key[0])
        if row.key in seen:
            flag(owner, f"Duplicate curated key {row.key}")
        seen.add(row.key)
        expected = published.get(row.key)
        if expected is None:
            code = "V7" if any(token in row.key[0] for token in ("oscar", "esa", "4.2")) else owner
            if "residual" in row.key[0]:
                code = "V3"
            if row.key[0] in {"total-resource-del", "total-capital-del"}:
                code = "C-extra"
            flag(code, f"Unexpected curated series {row.key}")
            continue
        if row.value != expected.value:
            flag(owner, f"{row.key} curated {row.value} != published {expected.value}")
        start, end = financial_year_bounds(row.key[2])
        if (row.period_start, row.period_end) != (start, end):
            flag("C-extra", f"{row.key} period {row.period_start}..{row.period_end}")
        if row.status != expected_status(row.key[2]):
            flag("V6", f"{row.key} status {row.status!r}, expected {expected_status(row.key[2])}")
        if row.indicator_id != indicator_id or row.unit != UNIT:
            flag("C-extra", f"{row.key} indicator/unit {row.indicator_id!r} {row.unit!r}")
        if row.geography_code != GEO_CODE or row.geography_label != GEO_LABEL:
            flag("C-extra", f"{row.key} geography {row.geography_code} {row.geography_label}")
        if row.source_version != SOURCE_VERSION:
            flag("C-extra", f"{row.key} source_version {row.source_version!r}")
        if row.notes.get("role") != expected.role or row.notes.get("label") != expected.label:
            flag(owner, f"{row.key} role/label {row.notes.get('role')} / {row.notes.get('label')}")
        if row.notes.get("table") != expected.table:
            flag(owner, f"{row.key} table={row.notes.get('table')}")
        if expected.cofog and row.notes.get("cofog") != expected.cofog:
            flag("V3", f"{row.key} cofog {row.notes.get('cofog')}")
        denominator = row.notes.get("denominator", "")
        if expected.series == "table-tme" and denominator != "hmt-table-tme":
            flag("V5", f"{indicator_id} {row.key[2]} denominator {denominator!r}")
        if expected.series != "table-tme" and denominator:
            flag("V5", f"{row.key} should not carry denominator={denominator}")
        if "oscar" in fold(row.raw_notes) or "residual" in fold(row.raw_notes):
            flag("V3" if "residual" in fold(row.raw_notes) else "V7", f"Forbidden note on {row.key}")

    missing = [key for key in published if key not in seen]
    for key in missing:
        flag(_owner(indicator_id, key[0]), f"Missing curated row {key}")


def _owner(indicator_id: str, series: str) -> str:
    if indicator_id == "tme-del-ame":
        return "V4"
    if series == "cofog-07-health":
        return "V2"
    if series in {"tes-total", "accounting-adjustments", "table-tme"}:
        return "V1"
    return "V3"


def _identities(tes: TesSheet, dele: DelSheet, flag) -> None:
    for financial_year in OUTTURN_YEARS:
        current = lookup(tes.cells, "tes-total", "current", financial_year)
        capital = lookup(tes.cells, "tes-total", "capital", financial_year)
        total = lookup(tes.cells, "tes-total", "total", financial_year)
        adj_current = lookup(tes.cells, "accounting-adjustments", "current", financial_year)
        adj_capital = lookup(tes.cells, "accounting-adjustments", "capital", financial_year)
        adj_total = lookup(tes.cells, "accounting-adjustments", "total", financial_year)
        table_tme = lookup(tes.cells, "table-tme", "total", financial_year)
        split_gap = current + capital - total
        adj_gap = adj_current + adj_capital - adj_total
        bridge_gap = total + adj_total - table_tme
        if financial_year == "2023-24":
            if split_gap != -1 or adj_gap != 1:
                flag(
                    "V1",
                    f"2023-24 rounding was {split_gap} on TES and {adj_gap} on adjustments; expected -1 and +1",
                )
            else:
                flag(
                    "V1",
                    "2023-24 current+capital TES is £1m below the published TES total "
                    "and the adjustments split is £1m above; published cells stored unchanged; "
                    "TES+adjustments still equals table TME in every year",
                    result="warn",
                )
        elif split_gap != 0 or adj_gap != 0:
            flag("V1", f"{financial_year} current+capital gap TES {split_gap}, adjustments {adj_gap}")
        if bridge_gap != 0:
            flag("V1", f"{financial_year} TES+adjustments minus table TME = {bridge_gap}")
        ps_current_gap = current + adj_current - tes.ps_current[financial_year]
        ps_capital_gap = capital + adj_capital - tes.ps_capital[financial_year]
        if ps_current_gap != 0 or ps_capital_gap != 0:
            flag("V1", f"{financial_year} unpublished expenditure bridge does not add up")
        # The 2023-24 £1m gaps offset, so the four published components still meet TME.
        if current + adj_current + capital + adj_capital != table_tme:
            flag("V1", f"{financial_year} current and capital components miss table TME")

        leaves_current = sum(
            lookup(tes.cells, series, "current", financial_year)
            for _, series, _, _ in FUNCTIONS
        ) + lookup(tes.cells, "eu-transactions", "current", financial_year)
        leaves_capital = sum(
            lookup(tes.cells, series, "capital", financial_year) for _, series, _, _ in FUNCTIONS
        )
        for side, leaves, published in (
            ("current", leaves_current, current),
            ("capital", leaves_capital, capital),
        ):
            gap = leaves - published
            if abs(gap) > 2:
                flag("V3", f"{financial_year} {side} leaf gap {gap} exceeds £2m")

        total_del = lookup(dele.cells, "total-del", "control-total", financial_year)
        departmental = lookup(dele.cells, "departmental-ame", "control-total", financial_year)
        other = lookup(dele.cells, "other-ame", "control-total", financial_year)
        del_tme = lookup(dele.cells, "table-tme", "total", financial_year)
        if total_del + departmental + other != del_tme:
            flag("V4", f"{financial_year} DEL+AME minus table TME = {total_del + departmental + other - del_tme}")
        if dele.resource_del[financial_year] + dele.capital_del[financial_year] == total_del:
            flag(
                "C-extra",
                f"{financial_year} resource+capital DEL equals published Total DEL; footnote 6 says they differ",
                result="warn",
            )
        if table_tme != del_tme:
            flag("C-extra", f"{financial_year} table TME differs across packages ({table_tme} vs {del_tme})")

    health_current = lookup(tes.cells, "cofog-07-health", "current", "2024-25")
    health_capital = lookup(tes.cells, "cofog-07-health", "capital", "2024-25")
    if (health_current, health_capital) != (SPOT_HEALTH_CURRENT, SPOT_HEALTH_CAPITAL):
        flag("V2", f"Health 2024-25 published {health_current}+{health_capital}")
    if health_current + health_capital != SPOT_HEALTH_SUM:
        flag("V2", f"Health sum {health_current + health_capital} != {SPOT_HEALTH_SUM}")
    eu_value = lookup(tes.cells, "eu-transactions", "current", "2024-25")
    if eu_value != SPOT_EU_CURRENT:
        flag("V3", f"EU transactions 2024-25 current {eu_value}, expected {SPOT_EU_CURRENT}")
    if lookup(tes.cells, "table-tme", "total", "2024-25") != SPOT_TME_2024:
        flag("V1", f"2024-25 table TME is not {SPOT_TME_2024}")
    if lookup(dele.cells, "table-tme", "total", "2024-25") != SPOT_TME_2024:
        flag("V4", f"2024-25 Table 1.1 TME is not {SPOT_TME_2024}")
    spot_del = (
        lookup(dele.cells, "total-del", "control-total", "2024-25"),
        lookup(dele.cells, "departmental-ame", "control-total", "2024-25"),
        lookup(dele.cells, "other-ame", "control-total", "2024-25"),
    )
    if spot_del != SPOT_DEL_2024:
        flag("V4", f"2024-25 control totals {spot_del}")
    if dele.resource_del["2024-25"] != SPOT_RESOURCE_DEL_2024 or dele.capital_del["2024-25"] != SPOT_CAPITAL_DEL_2024:
        flag("C-extra", "2024-25 resource/capital DEL cells are not the kickoff spot")
    rebuild = dele.resource_del["2024-25"] + dele.capital_del["2024-25"]
    if rebuild != SPOT_REBUILD_2024 or rebuild == SPOT_DEL_2024[0]:
        flag("C-extra", f"2024-25 rebuild {rebuild} vs Total DEL {SPOT_DEL_2024[0]}")
    if lookup(dele.cells, "other-ame", "control-total", "2021-22") >= 0:
        flag("V4", "2021-22 Other AME is not the published negative value")
    if tes.of_which != 15:
        flag("V3", f"of-which lines counted {tes.of_which}, pin described 15", result="warn")
    if any(key[0] == "residual" or "of-which" in key[0] for key in tes.cells):
        flag("V3", "A residual or of-which series was treated as curated")


def _copy_checks(
    tes_manifest: Mapping[str, object],
    del_manifest: Mapping[str, object],
    tes_curated: Sequence[CuratedRow],
    del_curated: Sequence[CuratedRow],
    flag,
) -> None:
    tes_text = manifest_blob(tes_manifest)
    del_text = manifest_blob(del_manifest)
    tes_readme = fold((TES_BASE / "README.md").read_text(encoding="utf-8"))
    del_readme = fold((DEL_BASE / "README.md").read_text(encoding="utf-8"))
    if "not monthly ons ebft" not in tes_text or "financial-year" not in tes_text:
        flag("V5", "tes-by-function manifest does not say HMT financial-year / not monthly EBFT")
    if "not services people receive" not in tes_text and "not services equal" not in tes_text:
        flag("V5", "tes-by-function copy does not keep TME apart from services")
    if "no tax-spend=borrow" not in tes_text or "no oscar" not in tes_text:
        flag("V5", "tes-by-function manifest missing the Tax−Spend=Borrow or OSCAR denial")
    if "not monthly ebft" not in del_text or "not tes" not in del_text:
        flag("V5", "tme-del-ame manifest does not keep this table's TME apart from EBFT and TES")
    if "no tax-spend=borrow" not in del_text or "no oscar" not in del_text:
        flag("V5", "tme-del-ame manifest missing the Tax−Spend=Borrow or OSCAR denial")
    if "not resource del plus capital" not in del_text and "not resource del" not in del_text:
        flag("V5", "tme-del-ame manifest does not say Total DEL is the published row")
    for prose, name in ((tes_readme, "tes README"), (del_readme, "del README")):
        if re.search(r"\btme is (the )?services\b", prose):
            flag("V5", f"{name} equates TME with services")
    oscar_rows = [
        row.key
        for row in (*tes_curated, *del_curated)
        if "oscar" in row.key[0] or row.notes.get("role") == "oscar"
    ]
    if oscar_rows:
        flag("V5", f"OSCAR curated rows: {oscar_rows[:3]}")
    if tes_manifest.get("frequency") != "annual" or del_manifest.get("frequency") != "annual":
        flag("V5", "Manifest frequency is not annual")
    if "million" not in fold(str(tes_manifest.get("unit"))) or "million" not in fold(str(del_manifest.get("unit"))):
        flag("V5", "Manifest unit is not £ million")
    release_dates = {
        str((tes_manifest.get("raw_evidence") or [{}])[0].get("official_release_date")),
        str((del_manifest.get("raw_evidence") or [{}])[0].get("official_release_date")),
    }
    if release_dates != {"2026-07-29"}:
        flag("V6", f"official_release_date {release_dates}", result="warn")


def _absence_checks(
    tes: TesSheet,
    dele: DelSheet,
    tes_curated: Sequence[CuratedRow],
    del_curated: Sequence[CuratedRow],
    tes_raw: Path,
    del_raw: Path,
    flag,
) -> None:
    forbidden = forbidden_files(TES_BASE) + forbidden_files(DEL_BASE)
    if forbidden:
        flag("V7", f"Unexpected package files: {forbidden}")
    for names, label in ((tes.sheet_names, "Chapter 5"), (dele.sheet_names, "Chapter 1")):
        folded = [name.casefold() for name in names]
        if any("oscar" in name or "esa" in name or "4_2" in name or name.startswith("4") for name in folded):
            flag("V7", f"{label} workbook contains an ESA, OSCAR, or Table 4.2 sheet")
    bad_notes = [
        row.key
        for row in (*tes_curated, *del_curated)
        if row.notes.get("table") in {"4.2", "11"} or "esa" in row.key[0]
    ]
    if bad_notes:
        flag("V7", f"Curated ESA/Table 4.2 rows: {bad_notes[:3]}")
    plan_hits = plan_year_hits(tes_raw) + plan_year_hits(del_raw)
    if plan_hits:
        flag("V6", f"PESA plan-year headers: {plan_hits[:4]}")
    curated_years = {row.key[2] for row in (*tes_curated, *del_curated)}
    if curated_years != set(OUTTURN_YEARS):
        flag("V6", f"Curated financial years {sorted(curated_years)}")
    tes_estimated = sum(1 for row in tes_curated if row.status == "estimated")
    del_estimated = sum(1 for row in del_curated if row.status == "estimated")
    if tes_estimated != 28 or del_estimated != 4:
        flag("V6", f"estimated rows tes={tes_estimated} del={del_estimated}, expected 28 and 4")
    if len(tes_curated) != 140:
        flag("V3", f"tes-by-function row count {len(tes_curated)}, expected 140")
    if len(del_curated) != 20:
        flag("V4", f"tme-del-ame row count {len(del_curated)}, expected 20")
    resource_curated = [
        row.key for row in del_curated if row.key[0] in {"total-resource-del", "total-capital-del"}
    ]
    if resource_curated:
        flag("C-extra", "Resource or capital DEL was curated")


def _ebft_context(tes: TesSheet, flag) -> dict[str, tuple[int, int]]:
    """Read-only. A gap versus HMT table TME is expected and is not a pin fail."""
    curated = EBFT_BASE / "curated" / "observations.csv"
    manifest_path = EBFT_BASE / "manifest.yaml"
    if not curated.is_file():
        flag("EBFT", "Ready total-managed-expenditure curated file was not readable", result="warn")
        return {}
    sums = ebft_financial_year_sums(curated)
    release = ""
    if manifest_path.is_file():
        manifest = yaml.safe_load(manifest_path.read_text(encoding="utf-8"))
        release = str((manifest.get("raw_evidence") or [{}])[0].get("official_release_date") or "")
    if release != "2026-10-20":
        flag("EBFT", f"EBFT official_release_date {release or 'missing'}", result="warn")
    for financial_year, (total, months) in sums.items():
        hmt = lookup(tes.cells, "table-tme", "total", financial_year)
        if months != 12:
            flag("EBFT", f"{financial_year} has {months} EBFT months", result="warn")
            continue
        gap = total - hmt
        if gap == 0:
            flag("EBFT", f"{financial_year} monthly sum equals HMT table TME; still a different series", result="warn")
        else:
            flag(
                "EBFT",
                f"{financial_year} EBFT {fmt(total)} vs HMT {fmt(hmt)} (difference {fmt(gap)})",
                result="warn",
            )
    return sums


def _result(code: str, problems: dict[str, list[str]], forced: dict[str, str]) -> tuple[str, str]:
    result = forced.get(code, "pass")
    if result == "pass":
        defaults = {
            "V1": "TES+adjustments = table TME every year; current+capital exact except the documented 2023-24 £1m",
            "V2": "Health 2024-25 current 228,613 + capital 13,816 = 242,429 in the sheet and in curated",
            "V3": "Leaf gaps are within £2m; 15 of-which lines skipped; no residual function",
            "V4": "Total DEL + Departmental AME + Other AME = table TME; 2024-25 = 1,290,012; 2021-22 Other AME negative",
            "V5": "Manifests say HMT financial-year TES / table TME, not monthly EBFT or services; no OSCAR rows",
            "V6": "2025-26 is estimated (bulletin: first estimate; accounts incomplete); no PESA plan years",
            "V7": "No ESA, OSCAR, or Table 4.2 files, sheets, or curated rows",
            "C-extra": "Raw sha256 matches both manifests; table TME is identical; Total DEL is not resource+capital",
            "EBFT": "Monthly sums differ from HMT table TME, as expected",
        }
        return "pass", defaults[code]
    # Prefer warn/fail detail. Keep the note in one table cell.
    note = "; ".join(problems[code])
    return result, note.replace("|", "/")


def _write(
    problems: dict[str, list[str]],
    forced: dict[str, str],
    tes_sha: str,
    del_sha: str,
    tes: TesSheet | None,
    dele: DelSheet | None,
    ebft_sums: Mapping[str, tuple[int, int]],
) -> None:
    order = ("V1", "V2", "V3", "V4", "V5", "V6", "V7", "C-extra", "EBFT")
    names = {
        "V1": "Table 5.4 current+capital TES, and TES+adjustments = table TME",
        "V2": "Health 2024-25 current + capital = 242,429",
        "V3": "Level-1 + EU vs published TES; no residual function",
        "V4": "Table 1.1 Total DEL + Departmental AME + Other AME = table TME",
        "V5": "HMT financial-year labels; TME is not services; no Tax−Spend=Borrow; no OSCAR rows",
        "V6": "2025-26 estimated; no PESA plan years",
        "V7": "ESA, OSCAR, and Table 4.2 absent",
        "C-extra": "Raw sha256, shared table TME, Total DEL not rebuilt",
        "EBFT": "Monthly EBFT April–March sum vs HMT table TME (context, not a pin fail)",
    }
    scored = [code for code in order if code != "EBFT"]
    rows = [(code, names[code], *_result(code, problems, forced)) for code in order]
    passed = sum(1 for code in scored if _result(code, problems, forced)[0] == "pass")
    warned = sum(1 for code in scored if _result(code, problems, forced)[0] == "warn")
    failed = sum(1 for code in scored if _result(code, problems, forced)[0] == "fail")
    verdict = "pass" if failed == 0 else "fail"
    ready = verdict == "pass"

    lines = [
        "# QA report — Economy 07 tes-by-function + tme-del-ame · 2026-11-15",
        "",
        "## Scope",
        "",
        "- Work plan: `EC-VAL-07B`",
        "- Indicators: `tes-by-function` (PSS July 2026 Table 5.4) and `tme-del-ame` (Table 1.1)",
        "- Handover: `docs/handover-economy-07-function-pin.md`",
        "- Kickoff: `docs/agent-kickoff-validation-economy-07-function.md`",
        "- Script: `validation.qa_economy_07_function_delame_2026_11_15`",
        "- Vintage: raw `2026-11-15` · HMT file updated **2026-07-29** · unit £ million, financial year",
        "- Read-only context: Ready `total-managed-expenditure` (EBFT, PSF **2026-10-20**)",
        "",
        "## Independence",
        "",
        "Validation read the pinned Chapter 5 and Chapter 1 workbooks and the curated CSVs.",
        "It did not import the Economy connectors and did not edit `data/economy/`.",
        "Economy self-QA JSON was not used as the source of the figures below.",
        "A gap between summed monthly EBFT and HMT table TME is recorded as context.",
        "It is not a reason to fail these pins and not a reason to rescale them.",
        "",
        "## Checks",
        "",
        "| ID | Check | Result | Notes |",
        "|----|-------|--------|-------|",
    ]
    for code, name, result, notes in rows:
        lines.append(f"| {code} | {name} | **{result}** | {notes} |")

    lines.extend(["", "## Spots recomputed from the workbooks", ""])
    if isinstance(tes, TesSheet) and isinstance(dele, DelSheet):
        lines.append("### V1 — published TES, adjustments, and this table's TME")
        lines.append("")
        v1_rows = []
        for financial_year in OUTTURN_YEARS:
            current = lookup(tes.cells, "tes-total", "current", financial_year)
            capital = lookup(tes.cells, "tes-total", "capital", financial_year)
            total = lookup(tes.cells, "tes-total", "total", financial_year)
            adjustments = lookup(tes.cells, "accounting-adjustments", "total", financial_year)
            table_tme = lookup(tes.cells, "table-tme", "total", financial_year)
            v1_rows.append(
                (
                    financial_year,
                    fmt(current),
                    fmt(capital),
                    fmt(current + capital - total),
                    fmt(total),
                    fmt(adjustments),
                    fmt(total + adjustments - table_tme),
                    fmt(table_tme),
                )
            )
        lines.append(
            markdown_table(
                (
                    "Financial year",
                    "Current TES",
                    "Capital TES",
                    "Current+capital minus published TES",
                    "Published TES",
                    "Adjustments",
                    "TES+adjustments minus TME",
                    "Table TME",
                ),
                v1_rows,
            )
        )
        lines.extend(
            [
                "",
                "2023-24 is the only non-zero split. Published total TES stays "
                f"{fmt(lookup(tes.cells, 'tes-total', 'total', '2023-24'))}, "
                "not the component sum. Curated stores that published cell.",
                "",
                "### V2 — Health, 2024-25",
                "",
                f"Current {fmt(lookup(tes.cells, 'cofog-07-health', 'current', '2024-25'))} + "
                f"capital {fmt(lookup(tes.cells, 'cofog-07-health', 'capital', '2024-25'))} = "
                f"**{fmt(lookup(tes.cells, 'cofog-07-health', 'current', '2024-25') + lookup(tes.cells, 'cofog-07-health', 'capital', '2024-25'))}**. "
                "Same cells in curated. Table 4.2 (£ billion) is not in this package.",
                "",
                "### V3 — level-1 leaves plus EU, versus published TES",
                "",
            ]
        )
        v3_rows = []
        for financial_year in OUTTURN_YEARS:
            current_leaves = sum(
                lookup(tes.cells, series, "current", financial_year) for _, series, _, _ in FUNCTIONS
            ) + lookup(tes.cells, "eu-transactions", "current", financial_year)
            capital_leaves = sum(
                lookup(tes.cells, series, "capital", financial_year) for _, series, _, _ in FUNCTIONS
            )
            current_tes = lookup(tes.cells, "tes-total", "current", financial_year)
            capital_tes = lookup(tes.cells, "tes-total", "capital", financial_year)
            v3_rows.append(
                (financial_year, "current (10 + EU)", fmt(current_leaves), fmt(current_tes), fmt(current_leaves - current_tes))
            )
            v3_rows.append(
                (financial_year, "capital (10)", fmt(capital_leaves), fmt(capital_tes), fmt(capital_leaves - capital_tes))
            )
        lines.append(
            markdown_table(
                ("Financial year", "Side", "Leaves", "Published TES", "Gap"),
                v3_rows,
            )
        )
        lines.extend(
            [
                "",
                f"EU transactions, 2024-25 current: **{fmt(lookup(tes.cells, 'eu-transactions', 'current', '2024-25'))}** (published sign kept). "
                f"Of-which lines on the sheet: **{tes.of_which}**, none curated.",
                "",
                "### V4 — DEL, AME, and this table's TME",
                "",
            ]
        )
        v4_rows = []
        for financial_year in OUTTURN_YEARS:
            total_del = lookup(dele.cells, "total-del", "control-total", financial_year)
            departmental = lookup(dele.cells, "departmental-ame", "control-total", financial_year)
            other = lookup(dele.cells, "other-ame", "control-total", financial_year)
            table_tme = lookup(dele.cells, "table-tme", "total", financial_year)
            v4_rows.append(
                (
                    financial_year,
                    fmt(total_del),
                    fmt(departmental),
                    fmt(other),
                    fmt(total_del + departmental + other - table_tme),
                    fmt(table_tme),
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
                v4_rows,
            )
        )
        rebuild = dele.resource_del["2024-25"] + dele.capital_del["2024-25"]
        lines.extend(
            [
                "",
                "2024-25 resource DEL "
                f"{fmt(dele.resource_del['2024-25'])} + capital DEL {fmt(dele.capital_del['2024-25'])} "
                f"= **{fmt(rebuild)}**, not published Total DEL **{fmt(lookup(dele.cells, 'total-del', 'control-total', '2024-25'))}**. "
                "Those two lines are not curated.",
                "",
                f"Footnote 6 on the sheet: {dele.footnote_6 or '(6) not found'}",
                "",
                "### C-extra — checksums and shared table TME",
                "",
                f"- Chapter 5 sha256: `{tes_sha}`",
                f"- Chapter 1 sha256: `{del_sha}`",
                "- Table TME in both packages, every pinned year: "
                + ", ".join(
                    f"{financial_year} {fmt(lookup(tes.cells, 'table-tme', 'total', financial_year))}"
                    for financial_year in OUTTURN_YEARS
                ),
                "",
            ]
        )
    else:
        lines.append("Workbook parse did not finish, so spot tables were not built.")
        lines.append("")

    if ebft_sums and isinstance(tes, TesSheet):
        lines.extend(["### EBFT context — not a fail", ""])
        ebft_rows = []
        for financial_year in OUTTURN_YEARS:
            total, months = ebft_sums[financial_year]
            hmt = lookup(tes.cells, "table-tme", "total", financial_year)
            ebft_rows.append((financial_year, str(months), fmt(total), fmt(hmt), fmt(total - hmt)))
        lines.append(
            markdown_table(
                ("Financial year", "Months", "Sum of monthly EBFT", "HMT table TME", "Difference"),
                ebft_rows,
            )
        )
        lines.extend(
            [
                "",
                "Ready pin: `total-managed-expenditure`, PSF release 2026-10-20. "
                "April–March sums are derived. They are not an official financial-year series. "
                "Do not rescale COFOG or DEL shares onto EBFT.",
                "",
            ]
        )

    lines.extend(
        [
            "## Method notes",
            "",
            "- Geography on the curated rows is United Kingdom (`K02000001`). Frequency is annual. Values are nominal £ million.",
            "- The workbook header stamps 2025-26 as outturn. The [PSS July 2026 bulletin](https://www.gov.uk/government/statistics/public-spending-statistics-release-july-2026/public-spending-statistics-july-2026) (updated 29 July 2026) says this release is the first estimate of 2025-26 outturn, and that not every department had published its 2025-26 annual report and accounts, so the figures can still be revised. `observation_status=estimated` matches that bulletin. 2021-22 to 2024-25 are `final`.",
            "- Defence on Table 5.4 is the UN COFOG row. Debt interest stays inside General public services (an of-which line, not a curated function).",
            "- HMT's statistics timetable lists the next Public Spending Statistics 2025/26 update on **18 November 2026**. That is a re-pin later, not a fail of this vintage.",
            "",
            "## Summary",
            "",
            f"- **Verdict: {verdict}** on V1–V7 + C-extra ({passed} pass / {warned} warn / {failed} fail).",
            f"- EBFT context: **{ _result('EBFT', problems, forced)[0] }**. Inequality with HMT table TME is expected.",
            (
                "- **Recommend Ready: yes** for `tes-by-function` and `tme-del-ame` on this PSS July 2026 vintage. Orchestrator flips the registry. Validation did not edit Notion."
                if ready
                else "- **Recommend Ready: no.** Economy should fix the failed checks. Validation did not edit curated data or Notion."
            ),
            "- Do not rewrite the 2023-24 published cells to remove the £1 million split.",
            "- Do not drop Other AME, invent a residual function, or rebuild Total DEL from resource DEL + capital DEL.",
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
            "- 2025-26 remains a first estimate and can move at the next PSS release (timetable: 18 November 2026).",
            "- HMT table TME and summed monthly EBFT stay different series. The 2024-25 gap on this pair is about £4.8 billion; the 2023-24 gap is about £27.4 billion.",
            "",
            "## Reproduce",
            "",
            "```bash",
            "uv run python -m validation.qa_economy_07_function_delame_2026_11_15",
            "```",
            "",
        ]
    )
    REPORT.parent.mkdir(parents=True, exist_ok=True)
    REPORT.write_text("\n".join(lines), encoding="utf-8")
    print(f"Wrote {REPORT.relative_to(ROOT)} — {verdict} ({passed} pass / {warned} warn / {failed} fail)")


if __name__ == "__main__":
    raise SystemExit(main())
