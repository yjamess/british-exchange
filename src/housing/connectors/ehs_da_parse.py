"""Header-driven parser for English Housing Survey DA live tables.

EHS DA tables (``DA3201`` Decent Homes, ``DA4101`` HHSRS, ``DA5101`` damp,
``DA7101`` energy and their ``…02`` *areas* siblings) are published as one
sheet per dwelling-stock year. Two layouts exist and both are handled here:

* **legacy** (DA32/41/51 2008–2021, DA71 all years): tenure is a *row group*
  (owner occupied · private rented · local authority · housing association ·
  all private · all social). Characteristic rows (dwelling age, type, floor
  area, region) are *all tenures* only.
* **modern** (DA32/41/51 2022+): tenure is a *column block* (owner occupied ·
  private rented · social rented · all tenures) repeated for every measure, so
  each characteristic row is published by tenure.

Column positions move between years (e.g. DA7101 gained an ``A/B/C`` column
in 2012), so measures are located by normalised header text — never by fixed
index. Cells keep their published status: ``u``/``*`` = suppressed (unweighted
count 1–4), ``N/A``/``:``/``-`` = not collected / not available.

Nothing here derives, sums or models values — every emitted value is a
published cell.
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from collections.abc import Callable
from pathlib import Path
from typing import Literal

from housing.connectors.ehs_table_parse import year_sheets
from housing.ods_util import read_ods_sheet

CellStatus = Literal["final", "suppressed", "missing"]
ColumnResolver = Callable[[list[list[str]]], tuple[int, list[tuple[int, str]]]]

SUPPRESSED = {"u", "U", "*"}
NOT_AVAILABLE = {"N/A", "n/a", ":", "..", "-", "–", "—"}

# Row-group header label → breakdown key. Groups not listed are skipped
# (occupancy status, area type, deprived local areas …).
GROUPS: dict[str, str] = {
    "tenure": "tenure",
    "dwelling age": "dwelling-age",
    "dwelling type": "dwelling-type",
    "total usable floor area": "floor-area",
    "government office region": "region",
    # 2008–2019 areas tables publish three sub-national areas, not regions.
    "sub-national area": "sub-national-area",
}
SKIPPED_GROUPS = {
    "occupancy status",
    "area type",
    "deprived local areas",
    "local area deprivation",
}

LEGACY_TENURE: dict[str, tuple[str, str]] = {
    # published label → (slug, published label kept in notes)
    "owner occupied": ("owner-occupied", "owner occupied"),
    "private rented": ("private-rented", "private rented"),
    "local authority": ("local-authority", "local authority"),
    "housing association": ("housing-association", "housing association"),
    "all private": ("all-private", "all private"),
    # Same population as the modern "social rented" block (LA + HA); one slug
    # keeps the series continuous across the 2021/2022 layout change.
    "all social": ("social-rented", "all social"),
}
MODERN_TENURE_BLOCKS: tuple[str, ...] = (
    "owner-occupied",
    "private-rented",
    "social-rented",
    "all-tenures",
)

DWELLING_AGE: dict[str, str] = {
    "pre-1919": "pre-1919",
    "1919-44": "1919-1944",
    "1945-64": "1945-1964",
    "1965-80": "1965-1980",
    "1981-90": "1981-1990",
    "post 1990": "post-1990",
    "1991-2002": "1991-2002",
    "2003-2013": "2003-2013",
    "post-2013": "post-2013",
    "post 2013": "post-2013",
}
DWELLING_TYPE: dict[str, str] = {
    "end terrace": "end-terrace",
    "mid terrace": "mid-terrace",
    "small terraced house": "small-terraced-house",
    "medium/large terraced house": "medium-large-terraced-house",
    "all terrace": "all-terrace",
    "semi-detached": "semi-detached",
    "detached": "detached",
    "bungalow": "bungalow",
    "converted flat": "converted-flat",
    "purpose built flat, low rise": "purpose-built-flat-low-rise",
    "purpose built flat, high rise": "purpose-built-flat-high-rise",
    "all houses": "all-houses",
    "all flats": "all-flats",
}
# Overlapping groupings published side by side — tag so the UI never sums them.
DWELLING_TYPE_GROUPING: dict[str, str] = {
    "end-terrace": "terrace-position",
    "mid-terrace": "terrace-position",
    "small-terraced-house": "terrace-size",
    "medium-large-terraced-house": "terrace-size",
    "all-terrace": "aggregate",
    "all-houses": "aggregate",
    "all-flats": "aggregate",
}
FLOOR_AREA: dict[str, str] = {
    "less than 50m2": "under-50m2",
    "50 to 69m2": "50-69m2",
    "70 to 89m2": "70-89m2",
    "90 to 109m2": "90-109m2",
    "110m2or more": "110m2-plus",
    "110m2 or more": "110m2-plus",
}
# EHS "government office region" == ONS region (former GOR), exact boundaries.
REGIONS: dict[str, tuple[str, str, str]] = {
    "north east": ("north-east", "E12000001", "North East"),
    "north west": ("north-west", "E12000002", "North West"),
    "yorkshire and the humber": ("yorkshire-and-the-humber", "E12000003", "Yorkshire and The Humber"),
    "east midlands": ("east-midlands", "E12000004", "East Midlands"),
    "west midlands": ("west-midlands", "E12000005", "West Midlands"),
    "east of england": ("east-of-england", "E12000006", "East of England"),
    "east": ("east-of-england", "E12000006", "East of England"),
    "london": ("london", "E12000007", "London"),
    "south east": ("south-east", "E12000008", "South East"),
    "south west": ("south-west", "E12000009", "South West"),
}

# Published aggregates of ONS regions (no ONS code exists for these groupings).
SUB_NATIONAL: dict[str, tuple[str, str, str]] = {
    "northern": (
        "northern",
        "EHS-SNA-NORTHERN",
        "Northern (North East, North West, Yorkshire and The Humber)",
    ),
    "london and south east": (
        "london-and-south-east",
        "EHS-SNA-LONDON-SE",
        "London and South East",
    ),
    "rest of england": (
        "rest-of-england",
        "EHS-SNA-REST-OF-ENGLAND",
        "Rest of England (East Midlands, West Midlands, East of England, South West)",
    ),
}

GROUP_MAPS: dict[str, dict[str, str]] = {
    "dwelling-age": DWELLING_AGE,
    "dwelling-type": DWELLING_TYPE,
    "floor-area": FLOOR_AREA,
}


@dataclass(frozen=True, slots=True)
class DaCell:
    """One published cell from a DA year sheet."""

    table: str
    year: int
    sheet_title: str
    group: str  # all | tenure | dwelling-age | dwelling-type | floor-area | region
    category: str  # slug of the row label ('' for group 'all')
    category_label: str
    tenure: str
    tenure_label: str
    measure: str
    raw: str
    value: float | None
    status: CellStatus
    row_dwellings_000s: float | None
    row_sample: int | None
    sample_scope: str  # row | row-all-tenures
    layout: str  # legacy | modern


def normalise_header(text: str) -> str:
    """``'anyfalls1,2'`` → ``'anyfalls'``; ``'modern facilitiesand services2'`` → ``'modernfacilitiesandservices'``."""
    compact = re.sub(r"\s+", "", text.strip().lower())
    if re.fullmatch(r"[\d\-]+", compact):
        return compact
    return re.sub(r"[\d,*]+$", "", compact)


def _number(text: str) -> float | None:
    cleaned = text.strip().replace(",", "")
    if not cleaned:
        return None
    try:
        return float(cleaned)
    except ValueError:
        return None


def parse_cell(raw: str) -> tuple[float | None, CellStatus] | None:
    """Return ``(value, status)``; ``None`` when the cell is blank."""
    text = raw.strip()
    if not text:
        return None
    if text in SUPPRESSED:
        return None, "suppressed"
    if text in NOT_AVAILABLE:
        return None, "missing"
    value = _number(text)
    if value is None:
        return None, "missing"
    return value, "final"


def _find_measure_header(
    rows: list[list[str]], measure_map: dict[str, str]
) -> tuple[int, list[tuple[int, str]]]:
    best_idx, best_cols = -1, []
    for idx in range(1, min(len(rows), 10)):
        cols = [
            (col, measure_map[normalise_header(cell)])
            for col, cell in enumerate(rows[idx])
            if col > 0 and normalise_header(cell) in measure_map
        ]
        if len(cols) > len(best_cols):
            best_idx, best_cols = idx, cols
    if best_idx < 0:
        raise ValueError("measure header row not found")
    return best_idx, best_cols


def _layout(
    cols: list[tuple[int, str]], *, dedupe: bool = True
) -> tuple[str, list[tuple[int, str, str | None]]]:
    """Assign tenure blocks: modern when every measure repeats exactly 4 times.

    ``dedupe=False`` (resolver-located columns, already unique per measure)
    keeps every column in legacy layout instead of stopping at a repeat.
    """
    counts: dict[str, int] = {}
    for _, key in cols:
        counts[key] = counts.get(key, 0) + 1
    if counts and all(n == 4 for n in counts.values()):
        seen: dict[str, int] = {}
        out: list[tuple[int, str, str | None]] = []
        for col, key in cols:
            block = seen.get(key, 0)
            seen[key] = block + 1
            out.append((col, key, MODERN_TENURE_BLOCKS[block]))
        return "modern", out
    if not dedupe:
        return "legacy", [(col, key, None) for col, key in cols]
    # Legacy: keep first occurrence only (DA7101 repeats band labels for EIR).
    first: list[tuple[int, str, str | None]] = []
    taken: set[str] = set()
    for col, key in cols:
        if key in taken:
            break
        taken.add(key)
        first.append((col, key, None))
    return "legacy", first


def _base_columns(summary: list[str], last_measure_col: int) -> tuple[int | None, int | None]:
    numeric = [
        col
        for col, cell in enumerate(summary)
        if col > last_measure_col and _number(cell) is not None
    ]
    if len(numeric) < 2:
        return None, None
    return numeric[-2], numeric[-1]


def _known_label(group: str, label: str) -> bool:
    if group == "tenure":
        return label in LEGACY_TENURE
    if group == "region":
        return label in REGIONS
    if group == "sub-national-area":
        return label in SUB_NATIONAL
    return label in GROUP_MAPS.get(group, {})


def parse_da_table(
    path: Path,
    *,
    table: str,
    measure_map: dict[str, str],
    groups: set[str] | None = None,
    columns: ColumnResolver | None = None,
    skipped: list[str] | None = None,
) -> list[DaCell]:
    """Parse every year sheet of one DA table into published cells.

    ``columns`` overrides header lookup for tables whose measure labels repeat
    across header groups (DA6201: 'none' is both a loft depth and a glazing
    extent). It receives the sheet rows and returns ``(header_row_index,
    [(col, measure), …])`` with each measure at most once (or exactly four
    times for the modern tenure-block layout).

    ``skipped``: when given, a row whose label is not a known category of its
    group is recorded there (``"<table> <year> <group>: <label>"``) and left
    out instead of raising — used where a published row is mislabelled
    (DA6102 2008 'Rest of England' carries a footnote as its label). Nothing
    is inferred for such rows; QA reports them.
    """
    wanted = groups or set(GROUPS.values()) | {"all"}
    cells: list[DaCell] = []
    for sheet in year_sheets(path):
        year = int(sheet)
        rows = read_ods_sheet(path, sheet)
        title = rows[0][0].strip() if rows and rows[0] else ""
        if columns is None:
            header_idx, header_cols = _find_measure_header(rows, measure_map)
            layout, cols = _layout(header_cols)
        else:
            header_idx, header_cols = columns(rows)
            if not header_cols:
                raise ValueError(f"{table} {year}: column resolver found no measures")
            layout, cols = _layout(header_cols, dedupe=False)
        if layout == "modern":
            # Tenure labels sit directly above the measures (DA32/41/51) or one
            # row higher, above a measure-group row (DA5201 2022+).
            tenure_row = " ".join(
                " ".join(rows[i]) for i in range(max(0, header_idx - 2), header_idx)
            ).lower()
            if "owner occupied" not in tenure_row or "all tenures" not in tenure_row:
                raise ValueError(f"{table} {year}: modern layout without tenure header")
        last_col = max(col for col, _, _ in cols)

        summary_idx = next(
            (
                i
                for i, row in enumerate(rows)
                if i > header_idx and row and row[0].strip().lower() == "all dwellings"
            ),
            None,
        )
        if summary_idx is None:
            raise ValueError(f"{table} {year}: no all-dwellings summary row")
        group_col, sample_col = _base_columns(rows[summary_idx], last_col)

        group = ""
        for i in range(header_idx + 1, summary_idx + 1):
            row = rows[i]
            if not row or not row[0].strip():
                continue
            label_raw = row[0].strip()
            label = label_raw.lower()
            if label in GROUPS:
                group = GROUPS[label]
                continue
            if label in SKIPPED_GROUPS:
                group = "skip"
                continue
            has_values = any(c.strip() for c in row[1 : last_col + 1])
            if not has_values:
                group = "skip"  # unknown group header → skip until a known one
                continue
            if i == summary_idx:
                row_group, category, category_label = "all", "", "all dwellings"
            elif group in ("", "skip") or group not in wanted:
                continue
            elif group == "tenure" and layout == "modern":
                # DA5201 2022 repeats tenure as rows inside tenure column
                # blocks (every cell N/A): tenure is already the block.
                continue
            else:
                row_group = group
                category_label = label_raw
                if skipped is not None and not _known_label(group, label):
                    skipped.append(f"{table} {year} {group}: {label_raw}")
                    continue
                if group == "tenure":
                    if label not in LEGACY_TENURE:
                        raise ValueError(f"{table} {year}: unknown tenure row {label_raw!r}")
                    category = LEGACY_TENURE[label][0]
                elif group == "region":
                    if label not in REGIONS:
                        raise ValueError(f"{table} {year}: unknown region {label_raw!r}")
                    category = REGIONS[label][0]
                elif group == "sub-national-area":
                    if label not in SUB_NATIONAL:
                        raise ValueError(f"{table} {year}: unknown sub-national area {label_raw!r}")
                    category = SUB_NATIONAL[label][0]
                else:
                    mapping = GROUP_MAPS[group]
                    if label not in mapping:
                        raise ValueError(f"{table} {year}: unknown {group} row {label_raw!r}")
                    category = mapping[label]
            if row_group not in wanted:
                continue

            dwellings = _number(row[group_col]) if group_col is not None and group_col < len(row) else None
            sample_raw = _number(row[sample_col]) if sample_col is not None and sample_col < len(row) else None
            sample = int(sample_raw) if sample_raw is not None else None

            for col, measure, block_tenure in cols:
                if col >= len(row):
                    continue
                parsed = parse_cell(row[col])
                if parsed is None:
                    continue
                value, status = parsed
                if row_group == "tenure":
                    tenure, tenure_label = category, LEGACY_TENURE[label][1]
                elif block_tenure is not None:
                    tenure, tenure_label = block_tenure, block_tenure.replace("-", " ")
                else:
                    tenure, tenure_label = "all-tenures", "all tenures"
                if value is not None and not 0.0 <= value <= 100.0:
                    raise ValueError(
                        f"{table} {year} {label_raw!r} {measure}: {value} is not a percentage"
                    )
                cells.append(
                    DaCell(
                        table=table,
                        year=year,
                        sheet_title=title,
                        group=row_group,
                        category=category,
                        category_label=category_label,
                        tenure=tenure,
                        tenure_label=tenure_label,
                        measure=measure,
                        raw=row[col].strip(),
                        value=value,
                        status=status,
                        row_dwellings_000s=dwellings,
                        row_sample=sample,
                        sample_scope=(
                            "row-all-tenures"
                            if layout == "modern"
                            else "row"
                        ),
                        layout=layout,
                    )
                )
    return cells


def area_geography(group: str, slug: str) -> tuple[str, str]:
    """``(geography_code, geography_label)`` for region / sub-national rows."""
    table = REGIONS if group == "region" else SUB_NATIONAL
    for area_slug, code, label in table.values():
        if area_slug == slug:
            return code, label
    raise KeyError(slug)
