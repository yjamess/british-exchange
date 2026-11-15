"""EMP16 underemployment level and rate (UK, aged 16+, not seasonally adjusted).

Approach (plain language):
1. Download the official EMP16 workbook.
2. Keep the headline underemployment level, the matching employment total,
   and the unadjusted underemployment rate.
3. Store the cells as published. Do not turn the rate into a headcount.

The sheet banner says "Levels, thousands", but the cells are people.
Check: level ÷ employment × 100 equals the published rate. If that
identity breaks, the connector stops rather than guessing the unit.

This is not involuntary part-time (YCCX) and not all part-time work (YCBH).
Overemployment columns are left in the workbook and not curated.

Best practices: pathlib, type hints, fail loudly
(https://docs.python.org/3/library/pathlib.html).
``.xls`` needs xlrd (https://xlrd.readthedocs.io/en/latest/).
"""

from __future__ import annotations

import re
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from typing import Sequence

import xlrd

from britain_exchange.connector import Connector
from britain_exchange.manifest import Manifest, RawEvidence
from britain_exchange.observation import Observation, mark_latest_months_provisional
from britain_exchange.paths import ECONOMY_DATA
from economy.connectors.ons_timeseries import quarter_bounds
from economy.connectors.ons_workbook import download_ons_file

INDICATOR_ID = "underemployment"
LANDING_URL = (
    "https://www.ons.gov.uk/employmentandlabourmarket/peopleinwork/"
    "employmentandemployeetypes/datasets/underemploymentandoveremploymentemp16"
)
SOURCE_FILE_URI = (
    "/employmentandlabourmarket/peopleinwork/employmentandemployeetypes/"
    "datasets/underemploymentandoveremploymentemp16/current/emp16aug2026.xls"
)
SOURCE_FILE_URL = f"https://www.ons.gov.uk/file?uri={SOURCE_FILE_URI}"
RAW_NAME = "emp16.xls"

UK_GEOGRAPHY_CODE = "K02000001"
UK_GEOGRAPHY_LABEL = "United Kingdom"

# Excel's 1900 date system, same convention xlrd uses.
_EXCEL_EPOCH = date(1899, 12, 30)
_QUARTER = re.compile(r"^(Jan-Mar|Apr-Jun|Jul-Sep|Oct-Dec)\s+(\d{4})$")
# ONS glues a footnote number onto some labels ("Jan-Mar 20191", "Jan-Mar 20194").
# The extra digit is the footnote, not part of the year. Levels uses 1, Rates uses 4.
_QUARTER_WITH_FOOTNOTE = re.compile(
    r"^(Jan-Mar|Apr-Jun|Jul-Sep|Oct-Dec)\s+(\d{4})(\d)$"
)
_QUARTER_NUMBER = {"Jan-Mar": 1, "Apr-Jun": 2, "Jul-Sep": 3, "Oct-Dec": 4}

# Levels sheet columns (row of names is found in code, these are the labels).
_LEVEL_UNDER = "Underemployment level"
_LEVEL_EMPLOYMENT = "Total in employment"
# Rates sheet: footnote 1 — proportion of total employment, unknowns not removed.
_RATE_UNDER = "Underemployment rate1"

# The published rate is a full float. Allow a tiny binary-float gap.
_RATE_TOLERANCE_PP = 0.0001


def _excel_date(serial: object) -> str:
    if not isinstance(serial, (int, float)) or isinstance(serial, bool):
        raise ValueError(f"EMP16 publication date is not a number: {serial!r}")
    found = _EXCEL_EPOCH + timedelta(days=int(serial))
    return found.isoformat()


def _as_float(raw: object) -> float | None:
    if raw is None or raw == "":
        return None
    if isinstance(raw, (int, float)) and not isinstance(raw, bool):
        return float(raw)
    text = str(raw).strip().replace(",", "")
    if text in {"", "-", "..", "…"}:
        return None
    return float(text)


def _find_label_row(sheet: xlrd.sheet.Sheet, required: str) -> int:
    for row_index in range(min(20, sheet.nrows)):
        for col in range(sheet.ncols):
            if str(sheet.cell_value(row_index, col)).strip() == required:
                return row_index
    raise ValueError(f"EMP16 sheet {sheet.name!r} has no column {required!r}")


def _column(sheet: xlrd.sheet.Sheet, row_index: int, label: str) -> int:
    for col in range(sheet.ncols):
        if str(sheet.cell_value(row_index, col)).strip() == label:
            return col
    raise ValueError(f"EMP16 sheet {sheet.name!r} missing {label!r}")


def _publication_date(sheet: xlrd.sheet.Sheet) -> str:
    """Read 'Date of publication' from the top of a sheet."""
    for row_index in range(min(6, sheet.nrows)):
        if str(sheet.cell_value(row_index, 0)).strip().startswith("Date of publication"):
            return _excel_date(sheet.cell_value(row_index, 1))
    raise ValueError(f"EMP16 sheet {sheet.name!r} has no publication date")


def parse_emp16(path: Path) -> tuple[str, list[Observation]]:
    """Return (release date, observations) for the three headline series."""
    book = xlrd.open_workbook(path)
    for name in ("Levels", "Rates"):
        if name not in book.sheet_names():
            raise ValueError(f"EMP16 missing sheet {name!r}")
    levels = book.sheet_by_name("Levels")
    rates = book.sheet_by_name("Rates")
    release = _publication_date(levels)
    if _publication_date(rates) != release:
        raise ValueError("EMP16 Levels and Rates publication dates differ")
    source_version = f"EMP16 {release}"

    level_header = _find_label_row(levels, _LEVEL_UNDER)
    rate_header = _find_label_row(rates, _RATE_UNDER)
    level_col = _column(levels, level_header, _LEVEL_UNDER)
    employment_col = _column(levels, level_header, _LEVEL_EMPLOYMENT)
    rate_col = _column(rates, rate_header, _RATE_UNDER)

    level_by_period = _read_quarter_column(
        levels, level_header + 1, level_col, source_version=source_version,
        series="underemployment_level",
        unit="People, NSA (aged 16 and over)",
    )
    employment_by_period = _read_quarter_column(
        levels, level_header + 1, employment_col, source_version=source_version,
        series="employment_level",
        unit="People in employment, NSA (aged 16 and over)",
    )
    rate_by_period = _read_quarter_column(
        rates, rate_header + 1, rate_col, source_version=source_version,
        series="underemployment_rate",
        unit="% of people in employment, NSA, unadjusted for unknowns",
    )
    _check_rate_identity(level_by_period, employment_by_period, rate_by_period)
    _check_same_periods(level_by_period, employment_by_period, rate_by_period)

    observations = [
        *level_by_period.values(),
        *employment_by_period.values(),
        *rate_by_period.values(),
    ]
    observations.sort(key=lambda obs: (obs.period_start, obs.notes))
    return release, observations


def _read_quarter_column(
    sheet: xlrd.sheet.Sheet,
    start_row: int,
    col: int,
    *,
    source_version: str,
    series: str,
    unit: str,
) -> dict[str, Observation]:
    found: dict[str, Observation] = {}
    for row_index in range(start_row, sheet.nrows):
        raw_period = str(sheet.cell_value(row_index, 0)).replace("\xa0", " ").strip()
        if not raw_period:
            continue
        match = _QUARTER.match(raw_period)
        footnote_match = _QUARTER_WITH_FOOTNOTE.match(raw_period)
        source_label = ""
        if match:
            quarter_name, year_text = match.group(1), match.group(2)
        elif footnote_match:
            quarter_name, year_text = footnote_match.group(1), footnote_match.group(2)
            source_label = raw_period
        elif raw_period.lower().startswith(("note", "source")) or raw_period[0].isdigit():
            if found:
                break
            continue
        else:
            raise ValueError(f"Unrecognised EMP16 period label: {raw_period!r}")
        year = int(year_text)
        period_start, period_end = quarter_bounds(year, _QUARTER_NUMBER[quarter_name])
        value = _as_float(sheet.cell_value(row_index, col))
        notes = (
            f"series={series}; adjustment=NSA; age=16+; "
            f"sheet_banner=says_thousands_cells_are_people"
        )
        if source_label:
            notes += f"; source_label={source_label}"
        found[period_start] = Observation(
            indicator_id=INDICATOR_ID,
            period_start=period_start,
            period_end=period_end,
            geography_code=UK_GEOGRAPHY_CODE,
            geography_label=UK_GEOGRAPHY_LABEL,
            value=value,
            unit=unit,
            observation_status="missing" if value is None else "final",
            source_version=source_version,
            notes=notes,
        )
    if not found:
        raise ValueError(f"EMP16 column {series} produced no quarters")
    return found


def _check_same_periods(*columns: dict[str, Observation]) -> None:
    """Fail if the level, employment and rate columns cover different quarters."""
    periods = [set(column) for column in columns]
    if not periods[0] or any(found != periods[0] for found in periods[1:]):
        raise ValueError("EMP16 level, employment and rate do not cover the same quarters")
    indexes = sorted(
        int(period[:4]) * 4 + (int(period[5:7]) - 1) // 3 for period in periods[0]
    )
    if indexes != list(range(indexes[0], indexes[-1] + 1)):
        raise ValueError("EMP16 is missing a quarter between the first and last row")


def _check_rate_identity(
    levels: dict[str, Observation],
    employment: dict[str, Observation],
    rates: dict[str, Observation],
) -> None:
    """Stop if level / employment * 100 is not the published rate.

    That identity is how we know the cells are people, not thousands.
    """
    periods = sorted(set(levels) & set(employment) & set(rates))
    if not periods:
        raise ValueError("EMP16 level, employment and rate share no periods")
    for period in periods:
        level = levels[period].value
        employed = employment[period].value
        rate = rates[period].value
        if level is None or employed is None or rate is None:
            continue
        if employed == 0:
            raise ValueError(f"EMP16 employment is 0 on {period}")
        computed = level / employed * 100.0
        if abs(computed - rate) > _RATE_TOLERANCE_PP:
            raise ValueError(
                f"EMP16 rate identity failed on {period}: "
                f"{level} / {employed} * 100 = {computed}, published {rate}. "
                "Refusing to rescale the cells."
            )


class UnderemploymentConnector(Connector):
    """Headline EMP16 underemployment for the UK, aged 16+, NSA."""

    def __init__(self, data_root: Path | None = None) -> None:
        root = data_root or (ECONOMY_DATA / INDICATOR_ID)
        super().__init__(root)

    @property
    def indicator_id(self) -> str:
        return INDICATOR_ID

    def build_manifest(self, evidence: Sequence[RawEvidence]) -> Manifest:
        release = evidence[0].official_release_date if evidence else ""
        return Manifest(
            indicator_id=self.indicator_id,
            title="Underemployment (aged 16 and over)",
            sector="economy-public-finance",
            publisher="ONS",
            source_url=LANDING_URL,
            series_id=f"EMP16 NSA · release {release}".strip(),
            geography="United Kingdom (K02000001); aged 16 and over",
            frequency="quarterly",
            unit=(
                "People, NSA (underemployment level and employment denominator); "
                "% of people in employment, NSA (rate, unknowns not removed)"
            ),
            definition=(
                "UK underemployment from ONS table EMP16: people aged 16 and "
                "over who want more hours, are available to start within two "
                "weeks, and work at or below the hours threshold. Not "
                "seasonally adjusted. Labour Force Survey. Stores the headline "
                "level (people), total employment (people, the rate's "
                "denominator), and the unadjusted rate (percent of total "
                "employment). The workbook banner says thousands; the cells "
                "are people, proved by level / employment × 100 = the rate."
            ),
            licence="Open Government Licence v3.0",
            agent_owner="economy",
            connector_module="economy.connectors.underemployment",
            curated_path="curated/observations.csv",
            update_cadence="quarterly (ONS EMP16; file name changes each edition)",
            raw_evidence=list(evidence),
            notion_registry_url=(
                "https://app.notion.com/p/419654717685811983cddc434dd85f7b"
            ),
            transformations=(
                "Download EMP16 xls. From sheet Levels keep 'Underemployment "
                "level' and 'Total in employment'. From sheet Rates keep "
                "'Underemployment rate1' (footnote 1: share of total "
                "employment, no adjustment for unknowns). Map Jan-Mar / "
                "Apr-Jun / Jul-Sep / Oct-Dec to calendar quarters. Do not "
                "divide by 1,000. Fail if level / employment × 100 misses "
                "the published rate by more than 0.0001 percentage points. "
                "Notes: series=underemployment_level|employment_level|"
                "underemployment_rate; adjustment=NSA; age=16+. Latest "
                "quarter per series marked provisional. Publication date "
                "read from the workbook. Footnote digits glued onto a year "
                "('Jan-Mar 20191' on Levels, 'Jan-Mar 20194' on Rates) are "
                "2019 Q1; notes keep source_label."
            ),
            revision_notes=(
                "LFS underemployment revises when the survey is reweighted. "
                "EMP16 is not seasonally adjusted — compare the same quarter "
                "across years (ONS note on the sheet). January–March 2019 "
                "onward has a reweighting step change. This pin's file is "
                "emp16aug2026.xls."
            ),
            caveats=(
                "NSA, aged 16 and over, quarterly. Not the 16–64 SA labour "
                "market. Not involuntary part-time (involuntary-part-time / "
                "YCCX: could not find a full-time job, thousands, SA). Not "
                "all part-time employment (YCBH). Cells are people even "
                "though the banner says thousands — do not divide by 1,000. "
                "The rate's denominator is total employment, including people "
                "whose underemployment status is unknown (EMP16 footnote 1). "
                "Overemployment and the hours sub-components are not curated."
            ),
            related_indicator_ids=[
                "involuntary-part-time",
                "employment-part-time",
                "employment-full-time",
                "average-actual-weekly-hours",
            ],
            open_questions=[
                "ONS does not publish an SA underemployment twin in EMP16.",
            ],
        )

    def fetch_latest(self, *, retrieved_on: date | None = None) -> RawEvidence:
        day = retrieved_on or datetime.now(timezone.utc).date()
        relative = f"raw/{day.isoformat()}/{RAW_NAME}"
        # Release date is inside the workbook. Fill it after transform sees
        # the file; fetch records a placeholder then transform's caller
        # replaces it. We peek here so evidence and manifest agree.
        evidence = download_ons_file(
            SOURCE_FILE_URL,
            self.data_root / relative,
            relative_path=relative,
            official_release_date="",
        )
        release, _observations = parse_emp16(self.data_root / relative)
        return RawEvidence(
            path=evidence.path,
            retrieved_at=evidence.retrieved_at,
            checksum_sha256=evidence.checksum_sha256,
            content_type=evidence.content_type,
            official_release_date=release,
            http_status=evidence.http_status,
            source_url=evidence.source_url,
        )

    def transform(self, evidence: Sequence[RawEvidence]) -> list[Observation]:
        if not evidence:
            raise ValueError("transform() requires RawEvidence")
        raw_path = self.data_root / evidence[0].path
        if not raw_path.is_file():
            raise FileNotFoundError(raw_path)
        _release, observations = parse_emp16(raw_path)

        def _series(obs: Observation) -> str:
            for part in obs.notes.split(";"):
                piece = part.strip()
                if piece.startswith("series="):
                    return piece.split("=", 1)[1].strip()
            return ""

        return mark_latest_months_provisional(observations, months=1, group_key=_series)


def main() -> None:
    """Fetch → transform → write the underemployment pack."""
    connector = UnderemploymentConnector()
    evidence = connector.fetch_latest()
    observations = connector.transform([evidence])
    manifest_path, curated_path = connector.write_hand_off([evidence], observations)
    latest = max(obs.period_start for obs in observations)
    print(f"indicator_id: {connector.indicator_id}")
    print(f"raw: {evidence.path}")
    print(f"sha256: {evidence.checksum_sha256}")
    print(f"official_release_date: {evidence.official_release_date}")
    print(f"observations: {len(observations)}")
    for obs in observations:
        if obs.period_start == latest:
            print(f"latest {obs.period_start} {obs.notes.split(';')[0]} value={obs.value} unit={obs.unit}")
    print(f"manifest: {manifest_path}")
    print(f"curated: {curated_path}")


if __name__ == "__main__":
    main()
