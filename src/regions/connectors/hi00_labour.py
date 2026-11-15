"""HI00 regional Labour Force Survey headline rates.

One ONS workbook feeds three indicators. The parser lives here so each
indicator takes the column inside the correct age block.

Why that matters: each persons sheet has two "Employment rate (%)" columns.
The first is everyone aged 16 and over. The regional bulletin's employment
rate is the later column, people aged 16 to 64. Taking the first match
labels a 16-and-over rate as if it were 16 to 64.

Official headline trio (Labour market in the regions of the UK, October 2026,
Table 1), persons, seasonally adjusted:

- employment rate — aged 16 to 64, share of that population
- ILO unemployment rate — aged 16 and over, share of the economically active
- economic inactivity rate — aged 16 to 64, share of that population

Claimant Count is not in these sheets and is not ILO unemployment.
UK and Great Britain appear in the bulletin table but not in this workbook.
"""

from __future__ import annotations

import calendar
import re
import shutil
import sys
from dataclasses import dataclass
from decimal import Decimal, ROUND_HALF_UP
from pathlib import Path
from typing import ClassVar, Literal, Sequence

import httpx
import openpyxl

from britain_exchange.connector import Connector
from britain_exchange.manifest import Manifest, RawEvidence
from britain_exchange.observation import Observation, mark_latest_months_provisional
from britain_exchange.paths import REGIONS_DATA
from regions.connectors._util import evidence_from_file

PINNED = "raw/2026-11-15/regionaltable1s.xlsx"
# Same bytes as the 2026-11-03 manifest pin. Re-downloaded 2026-11-15.
EXPECTED_SHA256 = "ff374cf96c5fa18a60f4540318b03a24fc06e9b0cd6af502c9dd205dcdc4967d"
OFFICIAL_RELEASE_DATE = "2026-10-20"
SOURCE_VERSION = "ONS HI00 2026-10-20"
SOURCE_LANDING = (
    "https://www.ons.gov.uk/employmentandlabourmarket/peopleinwork/"
    "employmentandemployeetypes/datasets/"
    "headlinelabourforcesurveyindicatorsforallregionshi00"
)
SOURCE_ASSET = (
    "https://www.ons.gov.uk/file?uri=/employmentandlabourmarket/peopleinwork/"
    "employmentandemployeetypes/datasets/"
    "headlinelabourforcesurveyindicatorsforallregionshi00/current/regionaltable1s.xlsx"
)
BULLETIN_URL = (
    "https://www.ons.gov.uk/employmentandlabourmarket/peopleinwork/"
    "employmentandemployeetypes/bulletins/regionallabourmarket/october2026"
)

# Geography codes published on the HI00 Index sheet (GSS / ITL1).
# There is no UK (K02000001) or Great Britain (K03000001) sheet.
EXPECTED_GEOGRAPHY_CODES = frozenset(
    {
        "E12000001",
        "E12000002",
        "E12000003",
        "E12000004",
        "E12000005",
        "E12000006",
        "E12000007",
        "E12000008",
        "E12000009",
        "E92000001",
        "W92000004",
        "S92000003",
        "N92000002",
    }
)

PERIOD_RE = re.compile(
    r"^(?P<m1>[A-Za-z]{3})-(?P<m2>[A-Za-z]{3})\s+(?P<y>\d{4})$"
)
CODE_RE = re.compile(r"^[A-Z]\d{8}$")
CDID_RE = re.compile(r"^[A-Z][A-Z0-9]{3}$")

_MONTH = {
    "jan": 1,
    "feb": 2,
    "mar": 3,
    "apr": 4,
    "may": 5,
    "jun": 6,
    "jul": 7,
    "aug": 8,
    "sep": 9,
    "oct": 10,
    "nov": 11,
    "dec": 12,
}

# June to August 2026, rounded to 1 decimal place as in the October 2026
# regional bulletin Table 1. Keys are indicator_id, then GSS code.
BULLETIN_JUN_AUG_2026: dict[str, dict[str, str]] = {
    "employment-rate-by-region": {
        "E12000001": "70.5",
        "E12000002": "74.9",
        "E12000003": "72.9",
        "E12000004": "76.3",
        "E12000005": "72.5",
        "E12000006": "77.7",
        "E12000007": "74.5",
        "E12000008": "78.6",
        "E12000009": "79.2",
        "E92000001": "75.6",
        "W92000004": "73.3",
        "S92000003": "74.0",
        "N92000002": "72.5",
    },
    "unemployment-rate-by-region": {
        "E12000001": "4.7",
        "E12000002": "4.6",
        "E12000003": "5.2",
        "E12000004": "4.7",
        "E12000005": "5.7",
        "E12000006": "3.9",
        "E12000007": "6.6",
        "E12000008": "4.2",
        "E12000009": "3.8",
        "E92000001": "4.9",
        "W92000004": "3.4",
        "S92000003": "4.3",
        "N92000002": "2.1",
    },
    "economic-inactivity-rate-by-region": {
        "E12000001": "25.5",
        "E12000002": "21.6",
        "E12000003": "23.0",
        "E12000004": "20.0",
        "E12000005": "22.8",
        "E12000006": "19.0",
        "E12000007": "20.1",
        "E12000008": "17.9",
        "E12000009": "17.5",
        "E92000001": "20.4",
        "W92000004": "24.0",
        "S92000003": "22.6",
        "N92000002": "25.9",
    },
}

AgeGroup = Literal["16-64", "16-and-over"]
MeasureKey = Literal["employment-rate", "unemployment-rate", "inactivity-rate"]

_SHARED_CAVEAT = (
    "LFS sample sizes are smaller for regions than for the UK, so short-term "
    "moves are noisy. Persons sheets only (men and women are in the workbook "
    "and are not ingested). Seasonally adjusted rolling three-month periods, "
    "published monthly. HI00 has no UK or Great Britain sheet — do not invent "
    "those rows by adding regions. Claimant Count is not in this workbook and "
    "is not ILO unemployment. These rates are resident LFS people, not BRES "
    "employee jobs. Next HI00 release 17 November 2026."
)


@dataclass(frozen=True, slots=True)
class Hi00Measure:
    """One headline rate taken from the shared HI00 persons sheets."""

    indicator_id: str
    title: str
    age_group: AgeGroup
    measure_key: MeasureKey
    unit: str
    series_id: str
    definition: str
    denominator: str
    caveats: str
    notion_registry_url: str
    related_indicator_ids: tuple[str, ...]


EMPLOYMENT = Hi00Measure(
    indicator_id="employment-rate-by-region",
    title="Employment rate by region",
    age_group="16-64",
    measure_key="employment-rate",
    unit="% of population aged 16-64, SA",
    series_id="HI00 employment rate aged 16-64 SA (persons)",
    definition=(
        "Labour Force Survey employment rate for people aged 16 to 64 by "
        "UK country and English region. Share of the population aged 16 to 64 "
        "who are in employment (employees and self-employed). Persons, "
        "seasonally adjusted. HI00 headline sheet, 16-to-64 block."
    ),
    denominator="population-16-64",
    caveats=(
        "Same age and denominator idea as Economy employment-rate (LF24), "
        "but geography is a nation or English region, not the UK. The workbook "
        "also contains an employment rate for everyone aged 16 and over; that "
        "column is not this indicator. "
        + _SHARED_CAVEAT
    ),
    notion_registry_url="https://app.notion.com/p/40d654717685815691ebe6f62ca7a4e2",
    related_indicator_ids=(
        "unemployment-rate-by-region",
        "economic-inactivity-rate-by-region",
    ),
)

UNEMPLOYMENT = Hi00Measure(
    indicator_id="unemployment-rate-by-region",
    title="Unemployment rate by region",
    age_group="16-and-over",
    measure_key="unemployment-rate",
    unit="% of economically active aged 16 and over, SA",
    series_id="HI00 ILO unemployment rate aged 16 and over SA (persons)",
    definition=(
        "Labour Force Survey ILO unemployment rate for people aged 16 and over "
        "by UK country and English region. Share of the economically active "
        "aged 16 and over who are ILO unemployed. Persons, seasonally adjusted. "
        "This is the regional bulletin headline, not the 16-to-64 unemployment "
        "rate and not the Claimant Count."
    ),
    denominator="economically-active-16-and-over",
    caveats=(
        "Age break versus Economy unemployment-rate (LF2Q): LF2Q is UK, aged "
        "16 to 64. This indicator is aged 16 and over, matching the regional "
        "bulletin and the UK 16-and-over headline (4.7% in June to August 2026), "
        "not LF2Q (4.9%). HI00 also has a 16-to-64 unemployment rate (sheet "
        "column 17); it is not the published regional headline and is not "
        "ingested. Do not add this rate to the 16-to-64 employment or "
        "inactivity rates — different age and a different denominator. "
        + _SHARED_CAVEAT
    ),
    notion_registry_url="https://app.notion.com/p/41965471768581128c18ee73f2921996",
    related_indicator_ids=(
        "employment-rate-by-region",
        "economic-inactivity-rate-by-region",
    ),
)

INACTIVITY = Hi00Measure(
    indicator_id="economic-inactivity-rate-by-region",
    title="Economic inactivity rate by region",
    age_group="16-64",
    measure_key="inactivity-rate",
    unit="% of population aged 16-64, SA",
    series_id="HI00 economic inactivity rate aged 16-64 SA (persons)",
    definition=(
        "Labour Force Survey economic inactivity rate for people aged 16 to 64 "
        "by UK country and English region. Share of the population aged 16 to "
        "64 who are economically inactive. Persons, seasonally adjusted. HI00 "
        "headline sheet, 16-to-64 block."
    ),
    denominator="population-16-64",
    caveats=(
        "Same age and denominator idea as Economy economic-inactivity-rate "
        "(LF2S), but geography is a nation or English region, not the UK. "
        "Do not add this rate to unemployment-rate-by-region: that series is "
        "aged 16 and over and uses the economically active as the denominator. "
        + _SHARED_CAVEAT
    ),
    notion_registry_url="https://app.notion.com/p/4196547176858186bbd1da3479a67ed8",
    related_indicator_ids=(
        "employment-rate-by-region",
        "unemployment-rate-by-region",
    ),
)

MEASURES: tuple[Hi00Measure, ...] = (EMPLOYMENT, UNEMPLOYMENT, INACTIVITY)
_MEASURE_BY_ID = {item.indicator_id: item for item in MEASURES}


def canonical_workbook() -> Path:
    """Employment package holds the one downloaded workbook."""
    return REGIONS_DATA / EMPLOYMENT.indicator_id / PINNED


def download_if_missing(dest: Path) -> None:
    """Save the current ONS file only when the pin is absent.

    Refuses to overwrite. A new vintage is a deliberate pin change
    (path, checksum, bulletin spots), not a silent refresh.
    """
    if dest.is_file():
        print(f"pin exists, not overwriting: {dest}")
        return
    dest.parent.mkdir(parents=True, exist_ok=True)
    with httpx.Client(timeout=120.0, follow_redirects=True) as client:
        response = client.get(SOURCE_ASSET)
        response.raise_for_status()
        dest.write_bytes(response.content)


def ensure_pin(data_root: Path) -> Path:
    """Return this package's workbook, copying the canonical pin if needed."""
    dest = data_root / PINNED
    if dest.is_file():
        return dest
    source = canonical_workbook()
    if source.is_file() and source.resolve() != dest.resolve():
        dest.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(source, dest)
        return dest
    raise FileNotFoundError(
        f"Pinned HI00 workbook missing: {dest}. "
        "Run `uv run python -m regions.connectors.hi00_labour --download` "
        "or place regionaltable1s.xlsx at that path. "
        f"Landing page: {SOURCE_LANDING}"
    )


def published_1dp(value: float) -> str:
    """One decimal place, half up, as the regional bulletin prints rates.

    ``round`` uses banker's rounding, so this uses ``Decimal`` instead.
    See https://docs.python.org/3/library/decimal.html#decimal.ROUND_HALF_UP
    """
    quantized = Decimal(str(value)).quantize(Decimal("0.1"), rounding=ROUND_HALF_UP)
    return f"{quantized:.1f}"


def _norm(value: object) -> str:
    return "".join(str(value or "").lower().split())


def _rolling_quarter_bounds(label: str) -> tuple[str, str]:
    match = PERIOD_RE.match(label.strip())
    if match is None:
        raise ValueError(f"Not a rolling three-month label: {label!r}")
    start_month = _MONTH[match.group("m1").lower()]
    end_month = _MONTH[match.group("m2").lower()]
    end_year = int(match.group("y"))
    # Dec-Feb is labelled with the year of February. December is the year before.
    start_year = end_year - 1 if start_month > end_month else end_year
    end_day = calendar.monthrange(end_year, end_month)[1]
    return (
        f"{start_year:04d}-{start_month:02d}-01",
        f"{end_year:04d}-{end_month:02d}-{end_day:02d}",
    )


def _as_float(raw: object) -> float | None:
    if raw is None or raw == "":
        return None
    if isinstance(raw, bool):
        return None
    if isinstance(raw, (int, float)):
        return float(raw)
    text = str(raw).strip().replace(",", "")
    if text in {"..", ":", "-", "x", "[x]", "*"}:
        return None
    try:
        return float(text)
    except ValueError:
        return None


def _load_people_geographies(path: Path) -> dict[str, tuple[str, str]]:
    """Map persons sheet name to (GSS code, label) from the Index sheet."""
    workbook = openpyxl.load_workbook(path, read_only=True, data_only=True)
    try:
        if "Index" not in workbook.sheetnames:
            raise ValueError(f"HI00 workbook has no Index sheet: {path}")
        found: dict[str, tuple[str, str]] = {}
        for row in workbook["Index"].iter_rows(values_only=True):
            code = str(row[0] or "").strip() if row else ""
            if not CODE_RE.match(code):
                continue
            label = str(row[1] or "").strip()
            sheet = str(row[2] or "").strip()
            if not label or not sheet:
                raise ValueError(f"Index row for {code} is missing a label or sheet")
            found[sheet] = (code, label)
        codes = {code for code, _label in found.values()}
        if codes != EXPECTED_GEOGRAPHY_CODES:
            raise ValueError(
                "HI00 Index geographies do not match the pinned region list. "
                f"missing={sorted(EXPECTED_GEOGRAPHY_CODES - codes)} "
                f"unexpected={sorted(codes - EXPECTED_GEOGRAPHY_CODES)}"
            )
        return found
    finally:
        workbook.close()


def _column_index(header: Sequence[object], start: int, end: int, measure_key: MeasureKey) -> int:
    """Find a rate column inside one age block.

    Matching ignores spaces so "Economic inactivity rate(%)" and
    "Economic inactivity rate (%)" both count.
    """
    wanted = {
        "employment-rate": "employmentrate(%)",
        "unemployment-rate": "unemploymentrate(%)",
        "inactivity-rate": "economicinactivityrate(%)",
    }[measure_key]
    hits = [
        index
        for index in range(start, end)
        if index < len(header) and _norm(header[index]) == wanted
    ]
    if len(hits) != 1:
        raise ValueError(
            f"Expected one {measure_key} column between {start} and {end}, found {hits}"
        )
    return hits[0]


def _locate_measure_column(
    rows: Sequence[Sequence[object]],
    measure: Hi00Measure,
) -> tuple[int, int]:
    """Return (header row index, value column) for this measure's age block."""
    group_idx = None
    for index, row in enumerate(rows[:25]):
        cells = [_norm(cell) for cell in row]
        has_16_plus = any(cell in {"all16&over", "allaged16&over"} for cell in cells)
        has_16_64 = any("16to64" in cell or cell == "16-64" for cell in cells)
        if has_16_plus and has_16_64:
            group_idx = index
            break
    if group_idx is None:
        raise ValueError("Could not find the 16-and-over and 16-to-64 header groups")

    group = rows[group_idx]
    plus_at = next(index for index, cell in enumerate(group) if _norm(cell) in {"all16&over", "allaged16&over"})
    aged_at = next(index for index, cell in enumerate(group) if "16to64" in _norm(cell))
    if plus_at >= aged_at:
        raise ValueError("16-and-over block does not sit before the 16-to-64 block")

    header_idx = group_idx + 1
    header = rows[header_idx]
    width = max(len(group), len(header))
    if measure.age_group == "16-and-over":
        column = _column_index(header, plus_at, aged_at, measure.measure_key)
    else:
        column = _column_index(header, aged_at, width, measure.measure_key)
    return header_idx, column


def _cdid_for_column(rows: Sequence[Sequence[object]], header_idx: int, column: int) -> str:
    for row in rows[header_idx + 1 : header_idx + 5]:
        if column >= len(row):
            continue
        text = str(row[column] or "").strip()
        if CDID_RE.match(text):
            return text
    return ""


def _sheet_is_seasonally_adjusted(rows: Sequence[Sequence[object]]) -> None:
    blob = " ".join(str(cell) for row in rows[:8] for cell in row if cell is not None)
    if "seasonally adjusted" not in blob.lower():
        raise ValueError("HI00 sheet is not marked seasonally adjusted")
    if "labour force survey" not in blob.lower() and "lfs" not in blob.lower():
        raise ValueError("HI00 sheet is not marked as Labour Force Survey")


def parse_hi00(path: Path, measure: Hi00Measure) -> list[Observation]:
    """Read persons sheets and return one indicator's observations."""
    geographies = _load_people_geographies(path)
    workbook = openpyxl.load_workbook(path, read_only=True, data_only=True)
    try:
        observations: list[Observation] = []
        for sheet_name, (code, label) in sorted(geographies.items(), key=lambda item: item[1][0]):
            if sheet_name not in workbook.sheetnames:
                raise ValueError(f"Index lists sheet {sheet_name} but it is missing")
            observations.extend(
                _parse_sheet(workbook[sheet_name], sheet_name, code, label, measure)
            )
        if not observations:
            raise ValueError(f"No rows parsed for {measure.indicator_id}")
        observations.sort(key=lambda obs: (obs.geography_code, obs.period_start))
        return mark_latest_months_provisional(observations, months=1)
    finally:
        workbook.close()


def _parse_sheet(ws, sheet_name: str, code: str, label: str, measure: Hi00Measure) -> list[Observation]:
    rows = list(ws.iter_rows(values_only=True))
    _sheet_is_seasonally_adjusted(rows)
    header_idx, column = _locate_measure_column(rows, measure)
    cdid = _cdid_for_column(rows, header_idx, column)
    age_note = "16-64" if measure.age_group == "16-64" else "16-and-over"

    observations: list[Observation] = []
    seen_periods: set[str] = set()
    for row in rows[header_idx + 1 :]:
        period = str(row[0] or "").strip()
        if not PERIOD_RE.match(period):
            continue
        if period in seen_periods:
            raise ValueError(f"Duplicate period {period} on {sheet_name}")
        seen_periods.add(period)
        raw = row[column] if column < len(row) else None
        value = _as_float(raw)
        if value is None:
            continue
        start, end = _rolling_quarter_bounds(period)
        notes = (
            f"series=HI00; sheet={sheet_name}; sex=persons; age={age_note}; "
            f"adjustment=SA; denominator={measure.denominator}; "
            f"measure={measure.measure_key}; period_label={period}"
        )
        if cdid:
            notes = f"{notes}; cdid={cdid}"
        observations.append(
            Observation(
                indicator_id=measure.indicator_id,
                period_start=start,
                period_end=end,
                geography_code=code,
                geography_label=label,
                value=value,
                unit=measure.unit,
                observation_status="final",
                source_version=SOURCE_VERSION,
                notes=notes,
            )
        )
    if len(observations) != 411:
        raise ValueError(
            f"{sheet_name} produced {len(observations)} {measure.indicator_id} rows; expected 411"
        )
    return observations


def assert_jun_aug_2026(observations: Sequence[Observation], indicator_id: str) -> None:
    """Fail if June to August 2026 does not match the October 2026 bulletin."""
    expected = BULLETIN_JUN_AUG_2026[indicator_id]
    found = {
        obs.geography_code: obs.value
        for obs in observations
        if obs.period_start == "2026-06-01" and obs.period_end == "2026-08-31"
    }
    mismatches: list[str] = []
    for code, want in expected.items():
        value = found.get(code)
        got = None if value is None else published_1dp(value)
        if got != want:
            mismatches.append(f"{code}: got {got}, bulletin {want}")
    if mismatches:
        raise ValueError(
            f"{indicator_id} does not match the October 2026 regional bulletin "
            f"Table 1 (June to August 2026): {mismatches}"
        )


class Hi00Connector(Connector):
    """Shared fetch/transform behaviour. Subclasses set ``measure``."""

    measure: ClassVar[Hi00Measure]

    def __init__(self, data_root: Path | None = None) -> None:
        super().__init__(data_root or (REGIONS_DATA / self.measure.indicator_id))

    @property
    def indicator_id(self) -> str:
        return self.measure.indicator_id

    def build_manifest(self, evidence: Sequence[RawEvidence]) -> Manifest:
        measure = self.measure
        return Manifest(
            indicator_id=measure.indicator_id,
            title=measure.title,
            sector="regions-places",
            publisher="ONS",
            source_url=SOURCE_LANDING,
            series_id=measure.series_id,
            geography=(
                "UK countries and English regions (GSS / ITL1). "
                "No UK or Great Britain total in HI00. Persons."
            ),
            frequency="monthly",
            unit=measure.unit,
            definition=measure.definition,
            licence="Open Government Licence v3.0",
            agent_owner="regions",
            connector_module="regions.connectors.hi00_labour",
            curated_path="curated/observations.csv",
            update_cadence="monthly HI00 release (LFS regional headlines)",
            raw_evidence=list(evidence),
            notion_registry_url=measure.notion_registry_url,
            transformations=(
                "Read HI00 Index for GSS code, label, and persons sheet. "
                "On each sheet, find the age-group header, then take only the "
                f"{measure.measure_key} column inside the {measure.age_group} block. "
                "Ignore men and women sheets. Do not read Claimant Count. "
                "Keep workbook precision. Mark only the latest rolling quarter provisional."
            ),
            caveats=measure.caveats,
            revision_notes=(
                "Pinned regionaltable1s.xlsx on 2026-11-15. "
                f"sha256 {EXPECTED_SHA256}. "
                "Same file as the 2026-11-03 pin (official release 2026-10-20). "
                "Employment parsing now uses the 16-to-64 block. The previous "
                "parser took the first Employment rate (%) column, which is aged "
                "16 and over. Not Ready until Validation."
            ),
            status_note=(
                "Pinned to the 20 October 2026 HI00 release. "
                "The next regional labour market release is 17 November 2026."
            ),
            related_indicator_ids=list(measure.related_indicator_ids),
            open_questions=[
                "UK and Great Britain headline rates are in the regional bulletin table but not in HI00. Left to Economy national series; do not sum regions.",
                "HI00 column 17 is a 16-to-64 ILO unemployment rate (closer to Economy LF2Q on age) but it is not the published regional headline, so it is not ingested.",
                "Level cells are people (they reproduce the rates). A corner label says thousands. Levels are not ingested until that label is reconciled.",
                "Workbook footnotes shade some estimates as small samples. That flag is not copied onto rows.",
                "Local authority Annual Population Survey geography is out of scope for this pin.",
            ],
        )

    def evidence_from_pinned_raw(self) -> RawEvidence:
        ensure_pin(self.data_root)
        evidence = evidence_from_file(
            self.data_root,
            PINNED,
            source_url=SOURCE_ASSET,
            content_type=(
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            ),
            official_release_date=OFFICIAL_RELEASE_DATE,
        )
        if evidence.checksum_sha256 != EXPECTED_SHA256:
            raise ValueError(
                "HI00 checksum does not match the 20 October 2026 pin "
                f"({EXPECTED_SHA256}). Got {evidence.checksum_sha256}. "
                "Refusing to curate a different vintage."
            )
        return evidence

    def transform(self, evidence: Sequence[RawEvidence]) -> list[Observation]:
        if not evidence:
            raise ValueError("transform() requires RawEvidence")
        observations = parse_hi00(self.data_root / evidence[0].path, self.measure)
        assert_jun_aug_2026(observations, self.measure.indicator_id)
        return observations


class EmploymentRateByRegionConnector(Hi00Connector):
    measure = EMPLOYMENT


class UnemploymentRateByRegionConnector(Hi00Connector):
    measure = UNEMPLOYMENT


class EconomicInactivityRateByRegionConnector(Hi00Connector):
    measure = INACTIVITY


def run_connector(connector_cls: type[Hi00Connector]) -> int:
    """Write one package. Returns the curated row count."""
    connector = connector_cls()
    evidence = connector.evidence_from_pinned_raw()
    observations = connector.transform([evidence])
    connector.write_hand_off([evidence], observations)
    provisional = sum(1 for obs in observations if obs.observation_status == "provisional")
    print(
        f"indicator_id: {connector.indicator_id} rows={len(observations)} "
        f"provisional={provisional} sha256={evidence.checksum_sha256}"
    )
    return len(observations)


def main(argv: Sequence[str] | None = None) -> None:
    args = list(sys.argv[1:] if argv is None else argv)
    if "--download" in args:
        download_if_missing(canonical_workbook())
    for connector_cls in (
        EmploymentRateByRegionConnector,
        UnemploymentRateByRegionConnector,
        EconomicInactivityRateByRegionConnector,
    ):
        run_connector(connector_cls)


if __name__ == "__main__":
    main()
