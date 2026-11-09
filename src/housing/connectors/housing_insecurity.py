"""Housing Domain 08 — Housing Insecurity (England H-CLIC / TA / rough sleeping / Table 600).

Approach (beginner-friendly):
1. Pin the official MHCLG ODS files under each indicator's ``raw/`` folder.
2. Parse England time-series sheets for duties (flows) and temporary accommodation (stocks).
3. Parse the latest detailed LA pack for geography, duration and out-of-area placements.
4. Parse rough sleeping autumn snapshot + Live Table 600 waiting lists.
5. Tag every observation with ``measure=stock|flow`` and ``series=`` so Pathways /
   Temporary Life never confuse cohorts or periods.

Refs:
- Live tables on homelessness: https://www.gov.uk/government/statistical-data-sets/live-tables-on-homelessness
- Connector contract: docs/connector-contract.md
- PEP 8 naming: https://peps.python.org/pep-0008/
"""

from __future__ import annotations

import calendar
import re
import shutil
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Callable, Sequence

from britain_exchange.checksum import sha256_file
from britain_exchange.connector import Connector
from britain_exchange.manifest import Manifest, RawEvidence
from britain_exchange.observation import Observation, ObservationStatus
from britain_exchange.paths import HOUSING_DATA
from housing.ods_util import read_ods_sheet

PIN_DIR = "raw/2026-11-04"
STAGING = HOUSING_DATA / "_insecurity_pin" / "2026-11-04"
ENGLAND_CODE = "E92000001"
ENGLAND_LABEL = "England"
SOURCE_HOMELESSNESS = (
    "https://www.gov.uk/government/statistical-data-sets/live-tables-on-homelessness"
)
SOURCE_ROUGH = (
    "https://www.gov.uk/government/statistical-data-sets/tables-on-rough-sleeping"
)
SOURCE_600 = (
    "https://www.gov.uk/government/statistical-data-sets/"
    "live-tables-on-rents-lettings-and-tenancies"
)
OFFICIAL_HOMELESSNESS = "2026-08-13"  # Jan–Mar 2026 statutory homelessness
OFFICIAL_ROUGH = "2026-02-26"
OFFICIAL_600 = "2026-06-25"
SOURCE_VERSION_HCLIC = "H-CLIC / statutory homelessness England time series 202603"
SOURCE_VERSION_LA = "Detailed LA tables Jan–Mar 2026 (202603)"
SOURCE_VERSION_ROUGH = "Rough sleeping snapshot autumn 2025"
SOURCE_VERSION_600 = "Live Table 600 (registers to 31 Mar 2025)"

MISSING = {"", "[x]", "[z]", "[u]", "[c]", "..", "…", "[n]"}

FILE_ENGLAND_TS = "Statutory_Homelessness_England_Time_Series_202603.ods"
FILE_LA = "Statutory_Homelessness_Detailed_Local_Authority_Data_202603.ods"
FILE_ROUGH = "Rough_sleeping_snapshot_in_England__autumn_2025.ods"
FILE_600 = "Live_Table_600.ods"

URL_ENGLAND_TS = (
    "https://assets.publishing.service.gov.uk/media/"
    "6a82eee63bd75b81e2329a7b/Statutory_Homelessness_England_Time_Series_202603.ods"
)
URL_LA = (
    "https://assets.publishing.service.gov.uk/media/"
    "6a82ee2c92ec93e1e0329a7f/Statutory_Homelessness_Detailed_Local_Authority_Data_202603.ods"
)
URL_ROUGH = (
    "https://assets.publishing.service.gov.uk/media/"
    "699daac73e672177d0bc759b/Rough_sleeping_snapshot_in_England__autumn_2025.ods"
)
URL_600 = (
    "https://assets.publishing.service.gov.uk/media/"
    "6a2be263e50716856ed4afc4/Live_Table_600.ods"
)


@dataclass(frozen=True, slots=True)
class IndicatorSpec:
    indicator_id: str
    title: str
    unit: str
    frequency: str
    definition: str
    source_url: str
    series_id: str
    official_release_date: str
    source_version: str
    files: tuple[str, ...]
    file_urls: dict[str, str]
    parse: str  # key into PARSERS
    geography: str
    caveats: str


def _parse_number(raw: str) -> tuple[float | None, ObservationStatus]:
    text = raw.strip().replace(",", "").replace(" ", "")
    status: ObservationStatus = "final"
    if text.endswith("[p]"):
        status = "provisional"
        text = text[:-3]
    if text.endswith("[r]"):
        text = text[:-3]
    if not text or text in MISSING:
        return None, "missing"
    try:
        return float(text), status
    except ValueError:
        return None, "missing"


def _status_from_cell(raw: str) -> ObservationStatus:
    text = raw.strip().lower()
    if "[p]" in text:
        return "provisional"
    return "final"


def _quarter_bounds(code: str) -> tuple[str, str] | None:
    """``202603`` → Jan–Mar 2026; ``2018_19`` annual FY skipped for quarterly series."""
    if re.fullmatch(r"\d{6}", code):
        year = int(code[:4])
        month = int(code[4:])
        if month not in {3, 6, 9, 12}:
            return None
        start_month = month - 2
        last_day = calendar.monthrange(year, month)[1]
        return f"{year:04d}-{start_month:02d}-01", f"{year:04d}-{month:02d}-{last_day:02d}"
    return None


def _fy_bounds(code: str) -> tuple[str, str] | None:
    """``2018_19`` → 2018-04-01 … 2019-03-31."""
    m = re.fullmatch(r"(\d{4})_(\d{2})", code)
    if not m:
        return None
    y0 = int(m.group(1))
    y1 = y0 + 1
    return f"{y0:04d}-04-01", f"{y1:04d}-03-31"


def _stock_date_bounds(label: str) -> tuple[str, str] | None:
    """``31 March 2026`` → same-day stock bounds."""
    m = re.match(
        r"(\d{1,2})\s+(January|February|March|April|May|June|July|August|"
        r"September|October|November|December)\s+(\d{4})",
        label.strip(),
        re.I,
    )
    if not m:
        return None
    day = int(m.group(1))
    month = {
        "january": 1,
        "february": 2,
        "march": 3,
        "april": 4,
        "may": 5,
        "june": 6,
        "july": 7,
        "august": 8,
        "september": 9,
        "october": 10,
        "november": 11,
        "december": 12,
    }[m.group(2).lower()]
    year = int(m.group(3))
    iso = f"{year:04d}-{month:02d}-{day:02d}"
    return iso, iso


def _find_header(rows: list[list[str]], first_cell: str) -> int:
    for i, row in enumerate(rows):
        if row and row[0].strip() == first_cell:
            return i
    raise ValueError(f"Header starting with {first_cell!r} not found")


def _clean_header(cell: str) -> str:
    return re.sub(r"\[note[^\]]*\]", "", cell, flags=re.I).strip()


def _obs(
    *,
    indicator_id: str,
    period_start: str,
    period_end: str,
    value: float | None,
    unit: str,
    status: ObservationStatus,
    source_version: str,
    series: str,
    measure: str,
    geography_code: str = ENGLAND_CODE,
    geography_label: str = ENGLAND_LABEL,
    extra_notes: str = "",
) -> Observation:
    notes = f"series={series}; measure={measure}"
    if extra_notes:
        notes = f"{notes}; {extra_notes}"
    return Observation(
        indicator_id=indicator_id,
        period_start=period_start,
        period_end=period_end,
        geography_code=geography_code,
        geography_label=geography_label,
        value=value,
        unit=unit,
        observation_status=status,
        source_version=source_version,
        notes=notes,
    )


def parse_england_flow_sheet(
    path: Path,
    *,
    sheet: str,
    indicator_id: str,
    series_cols: Sequence[tuple[int, str]],
    unit: str,
    include_annual: bool = False,
) -> list[Observation]:
    """Parse A1 / P1 / R1 / MD1 style quarterly (and optional FY) England rows."""
    rows = read_ods_sheet(path, sheet)
    header_idx = _find_header(rows, "Time period")
    out: list[Observation] = []
    for row in rows[header_idx + 1 :]:
        if not row or len(row) < 4:
            continue
        code = row[1].strip()
        bounds = _quarter_bounds(code)
        if bounds is None and include_annual:
            bounds = _fy_bounds(code)
        if bounds is None:
            continue
        status = _status_from_cell(row[2] if len(row) > 2 else "")
        for col, series in series_cols:
            if col >= len(row):
                continue
            value, cell_status = _parse_number(row[col])
            obs_status = cell_status if cell_status == "missing" else status
            out.append(
                _obs(
                    indicator_id=indicator_id,
                    period_start=bounds[0],
                    period_end=bounds[1],
                    value=value,
                    unit=unit,
                    status=obs_status,
                    source_version=SOURCE_VERSION_HCLIC,
                    series=series,
                    measure="flow",
                    extra_notes=f"table={sheet}; period_code={code}",
                )
            )
    if not out:
        raise ValueError(f"No flow observations from {sheet}")
    out.sort(key=lambda o: (o.period_start, o.notes))
    return out


def parse_ta1_england(path: Path) -> list[Observation]:
    """TA1 England stock: households, households with children, children, type mix."""
    rows = read_ods_sheet(path, "TA1")
    header_idx = _find_header(rows, "Time period")
    header = [_clean_header(c) for c in rows[header_idx]]
    # Fixed columns verified on 202603 file.
    col_map: list[tuple[int, str, str]] = [
        (3, "temporary-accommodation-households", "households-total"),
        (4, "temporary-accommodation-households", "households-with-children"),
        (5, "temporary-accommodation-children", "children-total"),
        (6, "temporary-accommodation-by-type", "bb-shared-annexes"),
        (11, "temporary-accommodation-by-type", "nightly-paid-privately-managed"),
    ]
    # Discover remaining type columns by header keywords.
    for idx, name in enumerate(header):
        low = name.lower()
        if idx < 6:
            continue
        series = None
        if "hostels" in low:
            series = "hostels"
        elif "private sector accommodation leased" in low or "leased by" in low:
            series = "private-sector-leased"
        elif "local authority or housing association" in low or "la/ha stock" in low:
            series = "la-ha-stock"
        elif "other" in low and "temporary" in low:
            series = "other-temporary"
        if series:
            col_map.append((idx, "temporary-accommodation-by-type", series))

    # One column per (indicator, series) — header text can match a type twice.
    seen_type: set[tuple[str, str]] = set()
    deduped: list[tuple[int, str, str]] = []
    for col, ind, series in col_map:
        key = (ind, series)
        if key in seen_type:
            continue
        seen_type.add(key)
        deduped.append((col, ind, series))

    out: list[Observation] = []
    for row in rows[header_idx + 1 :]:
        if not row or not row[0].strip():
            continue
        bounds = _stock_date_bounds(row[0])
        if bounds is None:
            continue
        status = _status_from_cell(row[2] if len(row) > 2 else "")
        for col, indicator_id, series in deduped:
            if col >= len(row):
                continue
            value, cell_status = _parse_number(row[col])
            unit = "children" if indicator_id.endswith("children") else "households"
            out.append(
                _obs(
                    indicator_id=indicator_id,
                    period_start=bounds[0],
                    period_end=bounds[1],
                    value=value,
                    unit=unit,
                    status=cell_status if cell_status == "missing" else status,
                    source_version=SOURCE_VERSION_HCLIC,
                    series=series,
                    measure="stock",
                    extra_notes="table=TA1",
                )
            )
    if not out:
        raise ValueError("No TA1 England observations")
    out.sort(key=lambda o: (o.indicator_id, o.period_start, o.notes))
    return out


def parse_la_ta_geography(path: Path) -> list[Observation]:
    """Latest-quarter LA/region TA stocks + rates from detailed pack TA1."""
    rows = read_ods_sheet(path, "TA1")
    header_idx = None
    for i, row in enumerate(rows):
        if row and row[0].strip() == "Organisation Identification Code":
            header_idx = i
            break
    if header_idx is None:
        raise ValueError("LA TA1 header not found")
    out: list[Observation] = []
    # Snapshot date for this pack = 31 March 2026.
    start, end = "2026-03-31", "2026-03-31"
    # MHCLG LA pack repeats London in the region block — keep first row only.
    seen_geo: set[tuple[str, str]] = set()
    for row in rows[header_idx + 1 :]:
        if not row or len(row) < 7:
            continue
        code = row[0].strip()
        label = row[1].strip().title() if row[1].strip() != "ENGLAND" else "England"
        if code == "[z]":
            # Rest of England aggregate — keep with synthetic code.
            if "rest of england" in label.lower():
                code = "E92000001-rest"
                label = "Rest of England"
            else:
                continue
        if not (code.startswith("E") or code.endswith("-rest")):
            continue
        hh, st1 = _parse_number(row[2])
        rate, st2 = _parse_number(row[4])
        children, st3 = _parse_number(row[6])
        for value, status, series, unit, indicator_id in (
            (hh, st1, "households-total", "households", "temporary-accommodation-households"),
            (rate, st2, "households-per-thousand", "households per thousand", "temporary-accommodation-households"),
            (children, st3, "children-total", "children", "temporary-accommodation-children"),
        ):
            key = (code, series)
            if key in seen_geo:
                continue
            seen_geo.add(key)
            out.append(
                _obs(
                    indicator_id=indicator_id,
                    period_start=start,
                    period_end=end,
                    value=value,
                    unit=unit,
                    status=status,
                    source_version=SOURCE_VERSION_LA,
                    series=series,
                    measure="stock",
                    geography_code=code,
                    geography_label=label,
                    extra_notes="table=TA1; grain=authority-or-region",
                )
            )
    if not out:
        raise ValueError("No LA TA geography observations")
    return out


def _ta4_type_slug(header: str) -> str | None:
    low = header.lower()
    if "b&b" in low or "shared annexe" in low:
        return "bb"
    if "nightly paid" in low:
        return "nightly-paid"
    if "hostel" in low:
        return "hostels"
    if "private sector" in low:
        return "private-sector"
    if "la/ha" in low:
        return "la-ha-stock"
    if "other ta" in low or "other temporary" in low:
        return "other"
    if low.startswith("households in ta") or low == "households in tatotal":
        return "all-ta"
    return None


def _ta4_band_slug(header: str) -> str | None:
    low = header.lower()
    if "less than 6 months" in low:
        return "under-6-months"
    if "6 months to 1 year" in low:
        return "6-months-to-1-year"
    if "1 to 2 years" in low:
        return "1-to-2-years"
    if "2 to 5 years" in low:
        return "2-to-5-years"
    if "5 or more years" in low or "5 or more year" in low:
        return "5-or-more-years"
    if low.endswith("total") or "total[note" in low.replace(" ", ""):
        return "total"
    return None


def parse_la_duration(path: Path) -> list[Observation]:
    """TA4 type×duration bands (England) + TA7 mean/median days (LA-level)."""
    out: list[Observation] = []
    start, end = "2026-03-31", "2026-03-31"

    rows = read_ods_sheet(path, "TA4")
    header_idx = None
    header: list[str] = []
    for i, row in enumerate(rows):
        if row and row[0].strip() == "Organisation Identification Code":
            header_idx = i
            header = [_clean_header(c) for c in row]
            break
    if header_idx is None:
        raise ValueError("TA4 header not found")
    eng = next((r for r in rows[header_idx + 1 :] if r and r[0].strip() == ENGLAND_CODE), None)
    if eng is None:
        raise ValueError("England row missing on TA4")

    band_totals: dict[str, float] = {}
    for idx, name in enumerate(header[2:], start=2):
        ta_type = _ta4_type_slug(name)
        band = _ta4_band_slug(name)
        if not ta_type or not band or idx >= len(eng):
            continue
        value, status = _parse_number(eng[idx])
        series = f"{ta_type}-{band}"
        out.append(
            _obs(
                indicator_id="temporary-accommodation-duration",
                period_start=start,
                period_end=end,
                value=value,
                unit="households",
                status=status,
                source_version=SOURCE_VERSION_LA,
                series=series,
                measure="stock",
                extra_notes="table=TA4; grain=england",
            )
        )
        # Sum duration bands across accommodation types (exclude type totals + all-ta).
        if (
            value is not None
            and ta_type != "all-ta"
            and band != "total"
        ):
            band_totals[band] = band_totals.get(band, 0.0) + value

    for band, total in sorted(band_totals.items()):
        out.append(
            _obs(
                indicator_id="temporary-accommodation-duration",
                period_start=start,
                period_end=end,
                value=total,
                unit="households",
                status="final",
                source_version=SOURCE_VERSION_LA,
                series=f"all-types-{band}",
                measure="stock",
                extra_notes="table=TA4; grain=england; derived=sum-across-ta-types",
            )
        )

    # TA7: LA-level mean/median days by accommodation type (no England row published).
    rows = read_ods_sheet(path, "TA7")
    header_idx = None
    for i, row in enumerate(rows):
        if row and row[0].strip() == "Organisation Identification Code":
            header_idx = i
            header = [_clean_header(c) for c in row]
            break
    if header_idx is not None:
        for row in rows[header_idx + 1 :]:
            if not row or not row[0].startswith("E"):
                continue
            code = row[0].strip()
            label = row[1].strip().title() if row[1].strip() != "ENGLAND" else "England"
            for idx, name in enumerate(header[2:], start=2):
                if idx >= len(row):
                    continue
                low = name.lower()
                if "mean" in low:
                    stat = "mean"
                elif "median" in low:
                    stat = "median"
                else:
                    continue
                type_slug = re.sub(r"(mean|median).*$", "", low, flags=re.I)
                type_slug = re.sub(r"[^a-z0-9]+", "-", type_slug).strip("-")[:40] or "type"
                value, status = _parse_number(row[idx])
                if value is None:
                    continue
                out.append(
                    _obs(
                        indicator_id="temporary-accommodation-duration",
                        period_start=start,
                        period_end=end,
                        value=value,
                        unit="days",
                        status=status,
                        source_version=SOURCE_VERSION_LA,
                        series=f"{type_slug}-{stat}-days",
                        measure="stock",
                        geography_code=code,
                        geography_label=label,
                        extra_notes="table=TA7; grain=local-authority",
                    )
                )

    if not out:
        raise ValueError("No duration observations from TA4/TA7")
    # Deduplicate on natural key.
    unique: dict[tuple[str, str, str], Observation] = {}
    for obs in out:
        series = next(
            (p.split("=", 1)[1] for p in obs.notes.split(";") if p.strip().startswith("series=")),
            "",
        )
        unique[(obs.geography_code, obs.period_start, series)] = obs
    return sorted(unique.values(), key=lambda o: (o.geography_code, o.period_start, o.notes))


def parse_la_out_of_area(path: Path) -> list[Observation]:
    """TA9 out-of-area placements — England + authorities."""
    rows = read_ods_sheet(path, "TA9")
    header_idx = None
    for i, row in enumerate(rows):
        if row and row[0].strip() == "Organisation Identification Code":
            header_idx = i
            break
    if header_idx is None:
        raise ValueError("TA9 header not found")
    start, end = "2026-03-31", "2026-03-31"
    out: list[Observation] = []
    seen: set[str] = set()
    for row in rows[header_idx + 1 :]:
        if not row or len(row) < 3:
            continue
        code = row[0].strip()
        label = row[1].strip().title() if row[1].strip() != "ENGLAND" else "England"
        if not code.startswith("E"):
            continue
        if code in seen:
            continue
        seen.add(code)
        # Prefer a clear "out of area" total column — usually col 2 or labelled.
        value, status = _parse_number(row[2])
        out.append(
            _obs(
                indicator_id="temporary-accommodation-out-of-area",
                period_start=start,
                period_end=end,
                value=value,
                unit="households",
                status=status,
                source_version=SOURCE_VERSION_LA,
                series="out-of-area-placements",
                measure="stock",
                geography_code=code,
                geography_label=label,
                extra_notes="table=TA9",
            )
        )
    if not out:
        raise ValueError("No TA9 observations")
    return out


def parse_rough_sleeping(path: Path) -> list[Observation]:
    rows = read_ods_sheet(path, "Table_1_Total")
    header_idx = None
    for i, row in enumerate(rows):
        if row and row[0].strip() == "Local Authority Code":
            header_idx = i
            break
    if header_idx is None:
        raise ValueError("Rough sleeping Table_1 header not found")
    header = rows[header_idx]
    year_cols: list[tuple[int, str]] = []
    for idx, cell in enumerate(header):
        if re.fullmatch(r"20\d{2}", cell.strip()):
            year_cols.append((idx, cell.strip()))
    out: list[Observation] = []
    for row in rows[header_idx + 1 :]:
        if not row or len(row) < 4:
            continue
        # Prefer region/England code in col 2 when LA code is [z]
        la_code = row[0].strip()
        region_code = row[2].strip()
        if la_code.startswith("E"):
            code, label = la_code, row[1].strip()
        elif region_code.startswith("E"):
            code, label = region_code, row[3].strip()
        else:
            continue
        for idx, year in year_cols:
            if idx >= len(row):
                continue
            value, status = _parse_number(row[idx])
            # Autumn snapshot — use 15 Nov as conventional mid-window date.
            day = f"{year}-11-15"
            out.append(
                _obs(
                    indicator_id="rough-sleeping-snapshot",
                    period_start=day,
                    period_end=day,
                    value=value,
                    unit="people (estimate)",
                    status=status,
                    source_version=SOURCE_VERSION_ROUGH,
                    series="autumn-single-night",
                    measure="stock",
                    geography_code=code,
                    geography_label=label,
                    extra_notes="table=Table_1_Total; window=1-Oct-to-30-Nov",
                )
            )
    if not out:
        raise ValueError("No rough sleeping observations")
    return out


def parse_table_600(path: Path) -> list[Observation]:
    """Housing registers — Regional_Data (incl. England sum) + Local_Authority_Data."""
    out: list[Observation] = []

    # Regions
    rows = read_ods_sheet(path, "Regional_Data")
    header_idx = None
    for i, row in enumerate(rows):
        if row and row[0].strip() == "Area code":
            header_idx = i
            break
    if header_idx is None:
        raise ValueError("Table 600 Regional_Data header not found")
    header = rows[header_idx]
    year_cols = [
        (i, c.strip())
        for i, c in enumerate(header)
        if re.fullmatch(r"19\d{2}|20\d{2}", c.strip())
    ]
    region_totals: dict[str, float] = {}
    for row in rows[header_idx + 1 :]:
        if not row or not row[0].startswith("E12"):
            continue
        code = row[0].strip()
        label = row[3].strip() if len(row) > 3 else code
        for idx, year in year_cols:
            if idx >= len(row):
                continue
            value, status = _parse_number(row[idx])
            # 31 March stock of year Y
            day = f"{year}-03-31"
            out.append(
                _obs(
                    indicator_id="social-housing-waiting-list",
                    period_start=day,
                    period_end=day,
                    value=value,
                    unit="households on register",
                    status=status,
                    source_version=SOURCE_VERSION_600,
                    series="housing-register",
                    measure="stock",
                    geography_code=code,
                    geography_label=label,
                    extra_notes="table=600; grain=region",
                )
            )
            if year == year_cols[-1][1] and value is not None:
                region_totals[year] = region_totals.get(year, 0.0) + value

    # England = sum of regions for each year (no England row on Regional sheet).
    for idx, year in year_cols:
        total = 0.0
        missing = False
        for row in rows[header_idx + 1 :]:
            if not row or not row[0].startswith("E12"):
                continue
            if idx >= len(row):
                missing = True
                break
            value, _ = _parse_number(row[idx])
            if value is None:
                missing = True
                break
            total += value
        if missing:
            continue
        day = f"{year}-03-31"
        out.append(
            _obs(
                indicator_id="social-housing-waiting-list",
                period_start=day,
                period_end=day,
                value=total,
                unit="households on register",
                status="final",
                source_version=SOURCE_VERSION_600,
                series="housing-register",
                measure="stock",
                extra_notes="table=600; grain=england; derived=sum-of-regions",
            )
        )

    # Local authorities (latest years only would still be huge — emit all; loader can filter).
    rows = read_ods_sheet(path, "Local_Authority_Data")
    header_idx = None
    for i, row in enumerate(rows):
        if row and row[0].strip().lower().startswith("local authority code"):
            header_idx = i
            break
    if header_idx is None:
        raise ValueError("Table 600 Local_Authority_Data header not found")
    header = rows[header_idx]
    # Years sit after region columns — detect numeric year headers.
    year_cols = [
        (i, c.strip())
        for i, c in enumerate(header)
        if re.fullmatch(r"19\d{2}|20\d{2}", c.strip())
    ]
    for row in rows[header_idx + 1 :]:
        if not row or not row[0].startswith("E"):
            continue
        code = row[0].strip()
        label = row[1].strip()
        for idx, year in year_cols:
            if idx >= len(row):
                continue
            value, status = _parse_number(row[idx])
            day = f"{year}-03-31"
            out.append(
                _obs(
                    indicator_id="social-housing-waiting-list",
                    period_start=day,
                    period_end=day,
                    value=value,
                    unit="households on register",
                    status=status,
                    source_version=SOURCE_VERSION_600,
                    series="housing-register",
                    measure="stock",
                    geography_code=code,
                    geography_label=label,
                    extra_notes="table=600; grain=local-authority",
                )
            )

    if not out:
        raise ValueError("No Table 600 observations")
    return out


LA_QUARTER = ("2026-01-01", "2026-03-31", "202603")

# Latest-quarter H-CLIC flows by authority and region (detailed LA pack). England is taken from
# the time series only, so the LA pack's England row is skipped (no duplicate observations).
LA_FLOW_SHEETS: dict[str, tuple[str, tuple[tuple[int, str], ...]]] = {
    "A1": (
        "statutory-homelessness-assessments",
        (
            (2, "initial-assessments-total"),
            (3, "owed-prevention-or-relief"),
            (4, "prevention-duty-owed"),
            (6, "relief-duty-owed"),
        ),
    ),
    "P1": (
        "homelessness-prevention-outcomes",
        ((2, "prevention-duty-ended-total"), (3, "secured-accommodation")),
    ),
    "R1": (
        "homelessness-relief-outcomes",
        (
            (2, "relief-duty-ended-total"),
            (3, "secured-accommodation-6-months"),
            (4, "56-days-elapsed"),
        ),
    ),
    "MD1": (
        "homelessness-main-duty",
        (
            (2, "main-duty-decisions-total"),
            (3, "priority-need-unintentionally-homeless"),
            (4, "priority-need-intentionally-homeless"),
            (5, "homeless-no-priority-need"),
            (6, "not-homeless"),
        ),
    ),
}


def parse_la_flow_sheet(path: Path, sheet: str) -> list[Observation]:
    """A1 / P1 / R1 / MD1 for Jan–Mar 2026 by region (E12) and local authority (E06–E09).

    Authorities that did not submit ([x]) stay missing — never zero.
    """
    indicator_id, series_cols = LA_FLOW_SHEETS[sheet]
    rows = read_ods_sheet(path, sheet)
    header_idx = _find_header(rows, "Organisation Identification Code")
    start, end, code_q = LA_QUARTER
    out: list[Observation] = []
    seen: set[str] = set()
    for row in rows[header_idx + 1 :]:
        if not row or len(row) < 3:
            continue
        code = row[0].strip()
        if not code.startswith(("E06", "E07", "E08", "E09", "E12")) or code in seen:
            continue
        seen.add(code)
        grain = "region" if code.startswith("E12") else "local-authority"
        for col, series in series_cols:
            value, status = _parse_number(row[col] if col < len(row) else "")
            out.append(
                _obs(
                    indicator_id=indicator_id,
                    period_start=start,
                    period_end=end,
                    value=value,
                    unit="households",
                    status=status,
                    source_version=SOURCE_VERSION_LA,
                    series=series,
                    measure="flow",
                    geography_code=code,
                    geography_label=row[1].strip(),
                    extra_notes=f"table={sheet}; period_code={code_q}; grain={grain}",
                )
            )
    if not out:
        raise ValueError(f"No LA flow observations from {sheet}")
    return out


def parse_prevention_relief_main(path: Path) -> list[Observation]:
    """Combine P1 / R1 / MD1 headline series for pathways."""
    out: list[Observation] = []
    out.extend(
        parse_england_flow_sheet(
            path,
            sheet="P1",
            indicator_id="homelessness-prevention-outcomes",
            series_cols=(
                (3, "prevention-duty-ended-total"),
                (4, "secured-accommodation"),
            ),
            unit="households",
        )
    )
    out.extend(
        parse_england_flow_sheet(
            path,
            sheet="R1",
            indicator_id="homelessness-relief-outcomes",
            series_cols=(
                (3, "relief-duty-ended-total"),
                (4, "secured-accommodation-6-months"),
                (5, "56-days-elapsed"),
            ),
            unit="households",
        )
    )
    out.extend(
        parse_england_flow_sheet(
            path,
            sheet="MD1",
            indicator_id="homelessness-main-duty",
            series_cols=(
                (3, "main-duty-decisions-total"),
                (4, "priority-need-unintentionally-homeless"),
                (5, "priority-need-intentionally-homeless"),
                (6, "homeless-no-priority-need"),
                (7, "not-homeless"),
            ),
            unit="households",
            include_annual=False,
        )
    )
    return out


def parse_assessments(path: Path) -> list[Observation]:
    return parse_england_flow_sheet(
        path,
        sheet="A1",
        indicator_id="statutory-homelessness-assessments",
        series_cols=(
            (3, "initial-assessments-total"),
            (4, "owed-prevention-or-relief"),
            (5, "prevention-duty-owed"),
            (7, "relief-duty-owed"),
        ),
        unit="households",
    )


def parse_support_needs(path: Path) -> list[Observation]:
    return parse_england_flow_sheet(
        path,
        sheet="A3",
        indicator_id="homelessness-support-needs",
        series_cols=(
            (3, "owed-total"),
            (4, "no-support-needs"),
            (6, "one-or-more-support-needs"),
        ),
        unit="households",
    )


def parse_priority_need(path: Path) -> list[Observation]:
    return parse_england_flow_sheet(
        path,
        sheet="MD3",
        indicator_id="homelessness-priority-need",
        series_cols=(
            (3, "main-duty-total"),
            (4, "includes-dependent-children"),
            (7, "vulnerable-households-total"),
        ),
        unit="households",
    )


def parse_ta2_household_type(path: Path) -> list[Observation]:
    """TA2 England stock by household composition."""
    rows = read_ods_sheet(path, "TA2")
    header_idx = _find_header(rows, "Time period")
    col_map = (
        (3, "households-total"),
        (4, "with-dependent-children"),
        (5, "one-adult-with-children"),
        (9, "two-adults-with-children"),
        (11, "adult-only"),
    )
    out: list[Observation] = []
    for row in rows[header_idx + 1 :]:
        if not row or not row[0].strip():
            continue
        bounds = _stock_date_bounds(row[0])
        if bounds is None:
            continue
        status = _status_from_cell(row[2] if len(row) > 2 else "")
        for col, series in col_map:
            if col >= len(row):
                continue
            value, cell_status = _parse_number(row[col])
            out.append(
                _obs(
                    indicator_id="temporary-accommodation-households",
                    period_start=bounds[0],
                    period_end=bounds[1],
                    value=value,
                    unit="households",
                    status=cell_status if cell_status == "missing" else status,
                    source_version=SOURCE_VERSION_HCLIC,
                    series=series,
                    measure="stock",
                    extra_notes="table=TA2",
                )
            )
    if not out:
        raise ValueError("No TA2 observations")
    return out


ParseFn = Callable[[Path], list[Observation]]


def _parse_for_spec(spec: IndicatorSpec, roots: dict[str, Path]) -> list[Observation]:
    """Dispatch parsers and filter to this indicator id where shared parsers emit many."""
    key = spec.parse
    if key == "assessments":
        return parse_assessments(roots[FILE_ENGLAND_TS]) + parse_la_flow_sheet(roots[FILE_LA], "A1")
    if key == "support_needs":
        return parse_support_needs(roots[FILE_ENGLAND_TS])
    if key == "priority_need":
        return parse_priority_need(roots[FILE_ENGLAND_TS])
    if key == "prevention_relief_main":
        sheet = next(sh for sh, (ind, _) in LA_FLOW_SHEETS.items() if ind == spec.indicator_id)
        return [
            o
            for o in parse_prevention_relief_main(roots[FILE_ENGLAND_TS])
            if o.indicator_id == spec.indicator_id
        ] + parse_la_flow_sheet(roots[FILE_LA], sheet)
    if key == "ta_england":
        return [
            o for o in parse_ta1_england(roots[FILE_ENGLAND_TS]) if o.indicator_id == spec.indicator_id
        ]
    if key == "ta_geography":
        return [
            o
            for o in parse_la_ta_geography(roots[FILE_LA])
            if o.indicator_id == spec.indicator_id
        ]
    if key == "ta_duration":
        return parse_la_duration(roots[FILE_LA])
    if key == "ta_out_of_area":
        return parse_la_out_of_area(roots[FILE_LA])
    if key == "rough":
        return parse_rough_sleeping(roots[FILE_ROUGH])
    if key == "waiting_list":
        return parse_table_600(roots[FILE_600])
    raise KeyError(key)


SPECS: tuple[IndicatorSpec, ...] = (
    IndicatorSpec(
        indicator_id="statutory-homelessness-assessments",
        title="Statutory homelessness assessments (H-CLIC A1)",
        unit="households",
        frequency="quarterly (flow)",
        definition=(
            "Households assessed in the quarter; includes those owed a prevention "
            "or relief duty. Flow measure — not a stock of homeless households."
        ),
        source_url=SOURCE_HOMELESSNESS,
        series_id="H-CLIC Table A1",
        official_release_date=OFFICIAL_HOMELESSNESS,
        source_version=SOURCE_VERSION_HCLIC,
        files=(FILE_ENGLAND_TS, FILE_LA),
        file_urls={FILE_ENGLAND_TS: URL_ENGLAND_TS, FILE_LA: URL_LA},
        parse="assessments",
        geography="England (E92000001) time series; regions and local authorities for Jan–Mar 2026",
        caveats="HRA duties from Apr 2018; not comparable with pre-2018 P1E.",
    ),
    IndicatorSpec(
        indicator_id="homelessness-support-needs",
        title="Support needs of households owed a homelessness duty (H-CLIC A3)",
        unit="households",
        frequency="quarterly (flow)",
        definition=(
            "Households owed a prevention or relief duty by recorded support-need "
            "status (none / one or more). Households at risk — not a clinical caseload."
        ),
        source_url=SOURCE_HOMELESSNESS,
        series_id="H-CLIC Table A3",
        official_release_date=OFFICIAL_HOMELESSNESS,
        source_version=SOURCE_VERSION_HCLIC,
        files=(FILE_ENGLAND_TS,),
        file_urls={FILE_ENGLAND_TS: URL_ENGLAND_TS},
        parse="support_needs",
        geography="England (E92000001)",
        caveats="Support needs are as recorded by local authorities; unknown category exists.",
    ),
    IndicatorSpec(
        indicator_id="homelessness-priority-need",
        title="Main duty priority need categories (H-CLIC MD3)",
        unit="households",
        frequency="quarterly (flow)",
        definition=(
            "Households owed a main homelessness duty by priority-need category "
            "(dependent children, vulnerable households, and related published splits)."
        ),
        source_url=SOURCE_HOMELESSNESS,
        series_id="H-CLIC Table MD3",
        official_release_date=OFFICIAL_HOMELESSNESS,
        source_version=SOURCE_VERSION_HCLIC,
        files=(FILE_ENGLAND_TS,),
        file_urls={FILE_ENGLAND_TS: URL_ENGLAND_TS},
        parse="priority_need",
        geography="England (E92000001)",
        caveats="Priority-need categories are England HRA definitions; not UK-comparable.",
    ),
    IndicatorSpec(
        indicator_id="homelessness-prevention-outcomes",
        title="Homelessness prevention duty outcomes (H-CLIC P1)",
        unit="households",
        frequency="quarterly (flow)",
        definition="Households whose prevention duty ended in the quarter, by outcome.",
        source_url=SOURCE_HOMELESSNESS,
        series_id="H-CLIC Table P1",
        official_release_date=OFFICIAL_HOMELESSNESS,
        source_version=SOURCE_VERSION_HCLIC,
        files=(FILE_ENGLAND_TS, FILE_LA),
        file_urls={FILE_ENGLAND_TS: URL_ENGLAND_TS, FILE_LA: URL_LA},
        parse="prevention_relief_main",
        geography="England (E92000001) time series; regions and local authorities for Jan–Mar 2026",
        caveats="Outcomes are flows for the quarter; not the same cohort as TA stocks.",
    ),
    IndicatorSpec(
        indicator_id="homelessness-relief-outcomes",
        title="Homelessness relief duty outcomes (H-CLIC R1)",
        unit="households",
        frequency="quarterly (flow)",
        definition="Households whose relief duty ended in the quarter, by outcome.",
        source_url=SOURCE_HOMELESSNESS,
        series_id="H-CLIC Table R1",
        official_release_date=OFFICIAL_HOMELESSNESS,
        source_version=SOURCE_VERSION_HCLIC,
        files=(FILE_ENGLAND_TS, FILE_LA),
        file_urls={FILE_ENGLAND_TS: URL_ENGLAND_TS, FILE_LA: URL_LA},
        parse="prevention_relief_main",
        geography="England (E92000001) time series; regions and local authorities for Jan–Mar 2026",
        caveats="56-days-elapsed is an outcome category, not a duration stock.",
    ),
    IndicatorSpec(
        indicator_id="homelessness-main-duty",
        title="Main homelessness duty decisions (H-CLIC MD1)",
        unit="households",
        frequency="quarterly (flow)",
        definition="Main duty decisions for eligible households in the quarter.",
        source_url=SOURCE_HOMELESSNESS,
        series_id="H-CLIC Table MD1",
        official_release_date=OFFICIAL_HOMELESSNESS,
        source_version=SOURCE_VERSION_HCLIC,
        files=(FILE_ENGLAND_TS, FILE_LA),
        file_urls={FILE_ENGLAND_TS: URL_ENGLAND_TS, FILE_LA: URL_LA},
        parse="prevention_relief_main",
        geography="England (E92000001) time series; regions and local authorities for Jan–Mar 2026",
        caveats="Long MD1 history includes pre-HRA years; H-CLIC quarterly from 2018.",
    ),
    IndicatorSpec(
        indicator_id="temporary-accommodation-households",
        title="Households in temporary accommodation",
        unit="households",
        frequency="quarterly stock (England) + latest LA snapshot",
        definition=(
            "Households in temporary accommodation at quarter end (stock). "
            "LA pack adds rates per thousand households for 31 March 2026."
        ),
        source_url=SOURCE_HOMELESSNESS,
        series_id="H-CLIC Tables TA1",
        official_release_date=OFFICIAL_HOMELESSNESS,
        source_version=SOURCE_VERSION_HCLIC,
        files=(FILE_ENGLAND_TS, FILE_LA),
        file_urls={FILE_ENGLAND_TS: URL_ENGLAND_TS, FILE_LA: URL_LA},
        parse="ta_combined_households",
        geography="England, regions and local authorities",
        caveats="Stock at quarter end — not the same as quarterly assessment flows.",
    ),
    IndicatorSpec(
        indicator_id="temporary-accommodation-children",
        title="Children in temporary accommodation",
        unit="children",
        frequency="quarterly stock + latest LA snapshot",
        definition="Dependent children in households in temporary accommodation at quarter end.",
        source_url=SOURCE_HOMELESSNESS,
        series_id="H-CLIC Table TA1 (children)",
        official_release_date=OFFICIAL_HOMELESSNESS,
        source_version=SOURCE_VERSION_HCLIC,
        files=(FILE_ENGLAND_TS, FILE_LA),
        file_urls={FILE_ENGLAND_TS: URL_ENGLAND_TS, FILE_LA: URL_LA},
        parse="ta_combined_children",
        geography="England, regions and local authorities",
        caveats="Children count is a stock; do not add to household counts.",
    ),
    IndicatorSpec(
        indicator_id="temporary-accommodation-by-type",
        title="Temporary accommodation by type",
        unit="households",
        frequency="quarterly stock",
        definition="Households in temporary accommodation by accommodation type (England).",
        source_url=SOURCE_HOMELESSNESS,
        series_id="H-CLIC Table TA1 (type columns)",
        official_release_date=OFFICIAL_HOMELESSNESS,
        source_version=SOURCE_VERSION_HCLIC,
        files=(FILE_ENGLAND_TS,),
        file_urls={FILE_ENGLAND_TS: URL_ENGLAND_TS},
        parse="ta_england",
        geography="England (E92000001)",
        caveats="Type categories follow MHCLG TA1 definitions.",
    ),
    IndicatorSpec(
        indicator_id="temporary-accommodation-duration",
        title="Length of stay in temporary accommodation",
        unit="households / average days",
        frequency="quarterly stock snapshot (31 Mar 2026)",
        definition="Duration bands (TA4) and average length of stay (TA7) for England.",
        source_url=SOURCE_HOMELESSNESS,
        series_id="H-CLIC Tables TA4 / TA7",
        official_release_date=OFFICIAL_HOMELESSNESS,
        source_version=SOURCE_VERSION_LA,
        files=(FILE_LA,),
        file_urls={FILE_LA: URL_LA},
        parse="ta_duration",
        geography="England (E92000001)",
        caveats="Duration bands are stocks at quarter end, not completed-spell flows.",
    ),
    IndicatorSpec(
        indicator_id="temporary-accommodation-out-of-area",
        title="Out-of-area temporary accommodation placements",
        unit="households",
        frequency="quarterly stock snapshot (31 Mar 2026)",
        definition="Households placed in temporary accommodation outside the placing authority (TA9).",
        source_url=SOURCE_HOMELESSNESS,
        series_id="H-CLIC Table TA9",
        official_release_date=OFFICIAL_HOMELESSNESS,
        source_version=SOURCE_VERSION_LA,
        files=(FILE_LA,),
        file_urls={FILE_LA: URL_LA},
        parse="ta_out_of_area",
        geography="England and local authorities",
        caveats="Aggregate placements only — never map identifiable household moves.",
    ),
    IndicatorSpec(
        indicator_id="rough-sleeping-snapshot",
        title="Rough sleeping autumn snapshot",
        unit="people (estimate)",
        frequency="annual (single night autumn)",
        definition=(
            "Estimated people sleeping rough on a single night between 1 Oct and "
            "30 Nov. Not a count of all homelessness."
        ),
        source_url=SOURCE_ROUGH,
        series_id="Rough sleeping snapshot Table 1",
        official_release_date=OFFICIAL_ROUGH,
        source_version=SOURCE_VERSION_ROUGH,
        files=(FILE_ROUGH,),
        file_urls={FILE_ROUGH: URL_ROUGH},
        parse="rough",
        geography="England, regions and local authorities",
        caveats="Estimate with method variation by LA; distinct from H-CLIC and TA stocks.",
    ),
    IndicatorSpec(
        indicator_id="social-housing-waiting-list",
        title="Households on local authority housing registers",
        unit="households on register",
        frequency="annual stock (31 March)",
        definition=(
            "Households on local authority housing registers (waiting lists). "
            "Not the number of unique households needing social housing nationwide."
        ),
        source_url=SOURCE_600,
        series_id="Live Table 600",
        official_release_date=OFFICIAL_600,
        source_version=SOURCE_VERSION_600,
        files=(FILE_600,),
        file_urls={FILE_600: URL_600},
        parse="waiting_list",
        geography="England (sum of regions), regions and local authorities",
        caveats=(
            "Registers overstate unique need (multi-LA listing, review frequency). "
            "Never divide by lettings to invent an individual wait time."
        ),
    ),
)


def _combined_ta(spec: IndicatorSpec, roots: dict[str, Path]) -> list[Observation]:
    eng = [o for o in parse_ta1_england(roots[FILE_ENGLAND_TS]) if o.indicator_id == spec.indicator_id]
    if spec.indicator_id == "temporary-accommodation-households":
        eng.extend(parse_ta2_household_type(roots[FILE_ENGLAND_TS]))
    geo = [o for o in parse_la_ta_geography(roots[FILE_LA]) if o.indicator_id == spec.indicator_id]
    # Prefer England time series for E92000001 households-total / children-total;
    # keep LA pack for non-England and for per-thousand rates.
    eng_keys = {
        (o.period_start, o.geography_code, o.notes.split(";")[0])  # series=
        for o in eng
    }
    merged = list(eng)
    for o in geo:
        series = next((p.split("=", 1)[1] for p in o.notes.split(";") if p.strip().startswith("series=")), "")
        key = (o.period_start, o.geography_code, f"series={series}")
        if o.geography_code == ENGLAND_CODE and series in {"households-total", "children-total"}:
            continue  # time series already has England totals
        if key in eng_keys:
            continue
        merged.append(o)
    # Deduplicate natural keys (TA1 + TA2 both emit households-total).
    unique: dict[tuple[str, str, str], Observation] = {}
    for o in merged:
        series = next(
            (p.split("=", 1)[1] for p in o.notes.split(";") if p.strip().startswith("series=")),
            "",
        )
        unique[(o.period_start, o.geography_code, series)] = o
    return sorted(unique.values(), key=lambda o: (o.period_start, o.geography_code, o.notes))


class HousingInsecurityConnector(Connector):
    def __init__(self, spec: IndicatorSpec, data_root: Path | None = None) -> None:
        self.spec = spec
        super().__init__(data_root or (HOUSING_DATA / spec.indicator_id))

    @property
    def indicator_id(self) -> str:
        return self.spec.indicator_id

    def build_manifest(self, evidence: Sequence[RawEvidence]) -> Manifest:
        related = [s.indicator_id for s in SPECS if s.indicator_id != self.indicator_id]
        return Manifest(
            indicator_id=self.spec.indicator_id,
            title=self.spec.title,
            sector="housing-land",
            publisher="MHCLG",
            source_url=self.spec.source_url,
            series_id=self.spec.series_id,
            geography=self.spec.geography,
            frequency=self.spec.frequency,
            unit=self.spec.unit,
            definition=self.spec.definition,
            licence="Open Government Licence v3.0",
            agent_owner="housing",
            connector_module="housing.connectors.housing_insecurity",
            curated_path="curated/observations.csv",
            update_cadence="quarterly / annual by source",
            raw_evidence=list(evidence),
            transformations=(
                "Parse pinned ODS; emit measure=stock|flow and series= notes; "
                "England time series + LA snapshot where listed."
            ),
            caveats=self.spec.caveats,
            revision_notes="Domain 08 initial ingest 2026-11-04.",
            related_indicator_ids=related,
        )

    def evidence_from_pinned(self) -> list[RawEvidence]:
        evidence: list[RawEvidence] = []
        for name in self.spec.files:
            rel = f"{PIN_DIR}/{name}"
            path = self.data_root / rel
            if not path.is_file():
                raise FileNotFoundError(path)
            evidence.append(
                RawEvidence(
                    path=rel,
                    retrieved_at=datetime.now(timezone.utc).isoformat(),
                    checksum_sha256=sha256_file(path),
                    content_type="application/vnd.oasis.opendocument.spreadsheet",
                    official_release_date=self.spec.official_release_date,
                    source_url=self.spec.file_urls[name],
                )
            )
        return evidence

    def transform(self, evidence: Sequence[RawEvidence]) -> list[Observation]:
        if not evidence:
            raise ValueError("transform() requires RawEvidence")
        roots = {Path(e.path).name: self.data_root / e.path for e in evidence}
        # Fill missing shared files from sibling pin if needed
        for name in self.spec.files:
            if name not in roots:
                roots[name] = self.data_root / PIN_DIR / name
        if self.spec.parse == "ta_combined_households":
            return _combined_ta(self.spec, roots)
        if self.spec.parse == "ta_combined_children":
            return _combined_ta(self.spec, roots)
        return _parse_for_spec(self.spec, roots)


def ensure_pinned_from_staging(staging: Path = STAGING) -> None:
    for spec in SPECS:
        dest_dir = HOUSING_DATA / spec.indicator_id / PIN_DIR
        dest_dir.mkdir(parents=True, exist_ok=True)
        for name in spec.files:
            source = staging / name
            if not source.is_file():
                raise FileNotFoundError(source)
            dest = dest_dir / name
            if not dest.is_file() or sha256_file(dest) != sha256_file(source):
                shutil.copy2(source, dest)


def main() -> None:
    ensure_pinned_from_staging()
    # Verify research headlines against England series before writing.
    ts = STAGING / FILE_ENGLAND_TS
    a1 = parse_assessments(ts)
    owed = [
        o
        for o in a1
        if o.period_start == "2026-01-01" and "owed-prevention-or-relief" in o.notes
    ]
    ta = parse_ta1_england(ts)
    hh = [
        o
        for o in ta
        if o.period_start == "2026-03-31"
        and o.indicator_id == "temporary-accommodation-households"
        and "households-total" in o.notes
    ]
    ch = [
        o
        for o in ta
        if o.period_start == "2026-03-31"
        and o.indicator_id == "temporary-accommodation-children"
        and "children-total" in o.notes
    ]
    rough = [
        o
        for o in parse_rough_sleeping(STAGING / FILE_ROUGH)
        if o.geography_code == ENGLAND_CODE and o.period_start.startswith("2025")
    ]
    print("VERIFY owed Q1 2026:", owed[0].value if owed else None, "(expect 83850)")
    print("VERIFY TA hh 31 Mar 2026:", hh[0].value if hh else None, "(expect 135580)")
    print("VERIFY TA children:", ch[0].value if ch else None, "(expect 177530)")
    print("VERIFY rough 2025:", rough[0].value if rough else None, "(expect 4793)")

    for spec in SPECS:
        connector = HousingInsecurityConnector(spec)
        evidence = connector.evidence_from_pinned()
        observations = connector.transform(evidence)
        connector.write_hand_off(evidence, observations)
        eng = [
            o
            for o in observations
            if o.geography_code == ENGLAND_CODE and o.value is not None
        ]
        print(f"{spec.indicator_id}: obs={len(observations)} england_valued={len(eng)}")


if __name__ == "__main__":
    main()
