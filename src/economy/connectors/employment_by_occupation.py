"""Employment by occupation — SOC 2020 major groups, UK, people aged 16+ (APS via Nomis).

Why Nomis and not EMP04: ONS discontinued the LFS table EMP04 "Employment by
occupation" after the April–June 2018 edition and now points users to the
Annual Population Survey on Nomis (dataset NM_17_5, report aps210). This is
the official successor, published under the Open Government Licence.

Approach (plain language):
1. Download one Nomis CSV: United Kingdom, the nine "% all in employment who
   are - N: ..." SOC2020 variables, three measures (share, numerator people,
   denominator people), every available twelve-month window.
2. Keep the three measures as separate series per occupation group. Share is
   the published percentage; people is the published numerator; employment is
   the published denominator (stored once per window).
3. Check share ≈ people ÷ employment × 100 for every cell. Stop if it is not.

Windows are rolling twelve months ending each quarter (e.g. Jul 2025–Jun 2026).
SOC2020 values start with the Jan–Dec 2021 window; earlier windows are empty
on Nomis for these codes and are not stored.

Nomis API: https://www.nomisweb.co.uk/api/v01/help
"""

from __future__ import annotations

import csv
import io
import re
from datetime import date, datetime, timezone
from pathlib import Path
from typing import Sequence

import httpx

from britain_exchange.checksum import sha256_bytes, sha256_file
from britain_exchange.connector import Connector
from britain_exchange.manifest import Manifest, RawEvidence
from britain_exchange.observation import Observation, mark_latest_months_provisional
from britain_exchange.paths import ECONOMY_DATA
from economy.connectors.ons_timeseries import month_bounds

INDICATOR_ID = "employment-by-occupation"
DATASET_ID = "NM_17_5"
LANDING_URL = (
    "https://www.nomisweb.co.uk/datasets/aps210/reports/"
    "employment-by-status-and-occupation?compare=K02000001"
)
ONS_EMP04_URL = (
    "https://www.ons.gov.uk/employmentandlabourmarket/peopleinwork/"
    "employmentandemployeetypes/datasets/employmentbyoccupationemp04"
)
API_BASE = f"https://www.nomisweb.co.uk/api/v01/dataset/{DATASET_ID}.data.csv"
RAW_NAME = "aps_occupation_uk.csv"
PIN_DATE = date(2026, 11, 15)
# Nomis "LastUpdated" annotation on NM_17_5 at pin time (APS Jul 2025–Jun 2026).
OFFICIAL_RELEASE_DATE = "2026-10-20"

UK_NOMIS_GEOGRAPHY = "2092957697"
UK_GEOGRAPHY_CODE = "K02000001"
UK_GEOGRAPHY_LABEL = "United Kingdom"

# Nomis variable code → SOC 2020 major group number and plain label.
SOC_MAJOR_GROUPS: tuple[tuple[str, str, str], ...] = (
    ("1815", "1", "Managers, directors and senior officials"),
    ("1816", "2", "Professional occupations"),
    ("1817", "3", "Associate professional occupations"),
    ("1818", "4", "Administrative and secretarial occupations"),
    ("1819", "5", "Skilled trades occupations"),
    ("1820", "6", "Caring, leisure and other service occupations"),
    ("1821", "7", "Sales and customer service occupations"),
    ("1822", "8", "Process, plant and machine operatives"),
    ("1823", "9", "Elementary occupations"),
)
MEASURE_SHARE = "20599"
MEASURE_PEOPLE = "21001"
MEASURE_EMPLOYMENT = "21002"

UNIT_SHARE = "% of people in employment, APS (aged 16 and over)"
UNIT_PEOPLE = "People, APS (aged 16 and over)"
UNIT_EMPLOYMENT = "People in employment, APS (aged 16 and over)"

# Nomis shares are published to one decimal place; numerators to the nearest 100.
_SHARE_TOLERANCE_PP = 0.06
_WINDOW = re.compile(r"^([A-Z][a-z]{2}) (\d{4})-([A-Z][a-z]{2}) (\d{4})$")
_MONTHS = {
    "Jan": 1, "Feb": 2, "Mar": 3, "Apr": 4, "May": 5, "Jun": 6,
    "Jul": 7, "Aug": 8, "Sep": 9, "Oct": 10, "Nov": 11, "Dec": 12,
}


def download_url() -> str:
    variables = ",".join(code for code, _, _ in SOC_MAJOR_GROUPS)
    return (
        f"{API_BASE}?geography={UK_NOMIS_GEOGRAPHY}&variable={variables}"
        f"&measures={MEASURE_SHARE},{MEASURE_PEOPLE},{MEASURE_EMPLOYMENT}"
        "&date=latestMINUS86-latest"
    )


def _window_bounds(label: str) -> tuple[str, str]:
    """'Jul 2025-Jun 2026' → ('2025-07-01', '2026-06-30')."""
    match = _WINDOW.match(label.strip())
    if not match:
        raise ValueError(f"Unrecognised Nomis window label: {label!r}")
    start_month, start_year, end_month, end_year = match.groups()
    start, _ = month_bounds(int(start_year), _MONTHS[start_month])
    _, end = month_bounds(int(end_year), _MONTHS[end_month])
    return start, end


def parse_nomis_csv(payload: bytes, *, source_version: str) -> list[Observation]:
    reader = csv.DictReader(io.StringIO(payload.decode("utf-8-sig")))
    groups = {code: (soc, label) for code, soc, label in SOC_MAJOR_GROUPS}
    cells: dict[tuple[str, str, str], float] = {}
    windows: dict[str, str] = {}
    for row in reader:
        if row.get("GEOGRAPHY_CODE") != UK_GEOGRAPHY_CODE:
            raise ValueError(f"Unexpected geography {row.get('GEOGRAPHY_CODE')!r}")
        variable = row["VARIABLE_CODE"]
        if variable not in groups:
            raise ValueError(f"Unexpected Nomis variable {variable!r}")
        raw_value = (row.get("OBS_VALUE") or "").strip()
        if not raw_value:
            continue  # pre-SOC2020 windows are empty for these codes
        windows[row["DATE"]] = row["DATE_NAME"]
        cells[(row["DATE"], variable, row["MEASURES"])] = float(raw_value)
    if not cells:
        raise ValueError("Nomis CSV has no valued SOC2020 occupation cells")

    observations: list[Observation] = []
    for date_code in sorted(windows):
        label = windows[date_code]
        period_start, period_end = _window_bounds(label)
        employment_values = {
            cells.get((date_code, code, MEASURE_EMPLOYMENT)) for code, _, _ in SOC_MAJOR_GROUPS
        }
        employment_values.discard(None)
        if len(employment_values) != 1:
            raise ValueError(f"{label}: denominators differ across groups: {employment_values}")
        employment = employment_values.pop()
        assert employment is not None
        if employment <= 0:
            raise ValueError(f"{label}: employment denominator is not positive")

        for code, soc, group_label in SOC_MAJOR_GROUPS:
            share = cells.get((date_code, code, MEASURE_SHARE))
            people = cells.get((date_code, code, MEASURE_PEOPLE))
            if share is None or people is None:
                raise ValueError(f"{label}: group {soc} is missing share or people")
            computed = people / employment * 100.0
            if abs(computed - share) > _SHARE_TOLERANCE_PP:
                raise ValueError(
                    f"{label} group {soc}: {people} / {employment} × 100 = {computed:.3f}, "
                    f"published share {share}. Refusing to store."
                )
            base_notes = (
                f"soc={soc}; occupation={group_label}; classification=SOC2020; "
                f"window={label}; age=16+; adjustment=NSA"
            )
            observations.append(
                Observation(
                    indicator_id=INDICATOR_ID,
                    period_start=period_start,
                    period_end=period_end,
                    geography_code=UK_GEOGRAPHY_CODE,
                    geography_label=UK_GEOGRAPHY_LABEL,
                    value=people,
                    unit=UNIT_PEOPLE,
                    observation_status="final",
                    source_version=source_version,
                    notes=f"series=people; {base_notes}",
                )
            )
            observations.append(
                Observation(
                    indicator_id=INDICATOR_ID,
                    period_start=period_start,
                    period_end=period_end,
                    geography_code=UK_GEOGRAPHY_CODE,
                    geography_label=UK_GEOGRAPHY_LABEL,
                    value=share,
                    unit=UNIT_SHARE,
                    observation_status="final",
                    source_version=source_version,
                    notes=f"series=share; {base_notes}",
                )
            )
        observations.append(
            Observation(
                indicator_id=INDICATOR_ID,
                period_start=period_start,
                period_end=period_end,
                geography_code=UK_GEOGRAPHY_CODE,
                geography_label=UK_GEOGRAPHY_LABEL,
                value=employment,
                unit=UNIT_EMPLOYMENT,
                observation_status="final",
                source_version=source_version,
                notes=(
                    f"series=employment; soc=all; occupation=All in employment; "
                    f"classification=SOC2020; window={label}; age=16+; adjustment=NSA"
                ),
            )
        )
    return observations


def _series_key(obs: Observation) -> str:
    parts = dict(
        piece.strip().split("=", 1) for piece in obs.notes.split(";") if "=" in piece
    )
    return f"{parts.get('series', '')}:{parts.get('soc', '')}"


class EmploymentByOccupationConnector(Connector):
    """APS employment by SOC 2020 major group for the UK, people aged 16+."""

    def __init__(self, data_root: Path | None = None) -> None:
        root = data_root or (ECONOMY_DATA / INDICATOR_ID)
        super().__init__(root, timeout_s=120.0)

    @property
    def indicator_id(self) -> str:
        return INDICATOR_ID

    def build_manifest(self, evidence: Sequence[RawEvidence]) -> Manifest:
        release = evidence[0].official_release_date if evidence else ""
        return Manifest(
            indicator_id=self.indicator_id,
            title="Employment by occupation (SOC 2020 major groups, aged 16 and over)",
            sector="economy-public-finance",
            publisher="ONS via Nomis",
            source_url=LANDING_URL,
            series_id=f"{DATASET_ID} variables 1815–1823 · measures 20599/21001/21002 · release {release}".strip(),
            geography="United Kingdom (K02000001); aged 16 and over",
            frequency="quarterly",
            unit=(
                "People, APS (share numerator); % of people in employment (share); "
                "people in employment (denominator). Rolling twelve-month windows."
            ),
            definition=(
                "People in employment by Standard Occupational Classification 2020 "
                "major group (1–9), United Kingdom, aged 16 and over, from the Annual "
                "Population Survey on Nomis (NM_17_5, report aps210). Each window is "
                "twelve months ending in a calendar quarter. Stores the published "
                "share of all in employment, the published numerator (people) and the "
                "published denominator (all in employment). The nine groups sum to "
                "slightly under 100% because some respondents' occupation is not "
                "classified."
            ),
            licence="Open Government Licence v3.0",
            agent_owner="economy",
            connector_module="economy.connectors.employment_by_occupation",
            curated_path="curated/observations.csv",
            update_cadence="quarterly (Nomis APS, about three months after each window ends)",
            raw_evidence=list(evidence),
            transformations=(
                "Download one Nomis CSV (UK, variables 1815–1823, measures 20599 share, "
                "21001 numerator, 21002 denominator, all windows). Skip empty cells "
                "(windows before Jan–Dec 2021 carry no SOC2020 value). Window label "
                "'Jul 2025-Jun 2026' → period_start first day of the start month, "
                "period_end last day of the end month. Fail if numerator ÷ denominator "
                "× 100 differs from the published share by more than 0.06 points, or if "
                "denominators differ across groups within a window. Notes carry "
                "series=people|share|employment; soc=1..9|all; occupation=; window=. "
                "Latest window per series marked provisional; older windows final."
            ),
            revision_notes=(
                "ONS discontinued LFS table EMP04 after April–June 2018 and directs "
                "users to the APS on Nomis. APS estimates revise when the survey is "
                "reweighted (Nomis LastRevised 2023-01-27). Re-pin on each quarterly "
                "APS update (Nomis LastUpdated at pin: 2026-10-20)."
            ),
            caveats=(
                "People, not jobs — do not compare with Workforce Jobs (JOBS02 / DYDC). "
                "APS, aged 16 and over, not seasonally adjusted, rolling twelve-month "
                "windows that overlap — compare the same window end across years. "
                "Numerators are published to the nearest 100 and shares to one decimal "
                "place. Groups sum to about 99.5–99.8% of the denominator; the rest is "
                "unclassified occupation. Not the 16–64 seasonally adjusted LFS workforce."
            ),
            related_indicator_ids=[
                "employment-level",
                "workforce-jobs-by-industry",
                "employment-full-time",
                "employment-part-time",
            ],
            open_questions=[
                "SOC2010 windows (2004–2020) exist under different Nomis variable codes; not bridged here.",
            ],
        )

    def fetch_latest(self, *, retrieved_on: date | None = None) -> RawEvidence:
        day = retrieved_on or PIN_DATE
        relative = f"raw/{day.isoformat()}/{RAW_NAME}"
        target = self.data_root / relative
        url = download_url()
        if target.is_file() and target.stat().st_size > 500:
            return RawEvidence(
                path=relative,
                retrieved_at=datetime.now(timezone.utc).isoformat(),
                checksum_sha256=sha256_file(target),
                content_type="text/csv",
                official_release_date=OFFICIAL_RELEASE_DATE,
                http_status=200,
                source_url=url,
            )
        with httpx.Client(timeout=self.timeout_s, follow_redirects=True) as client:
            response = client.get(url)
            response.raise_for_status()
            payload = response.content
        if b"DATE" not in payload[:800] or b"VARIABLE_CODE" not in payload[:800]:
            raise RuntimeError("Nomis response does not look like a data CSV")
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(payload)
        return RawEvidence(
            path=relative,
            retrieved_at=datetime.now(timezone.utc).isoformat(),
            checksum_sha256=sha256_bytes(payload),
            content_type=response.headers.get("content-type", "text/csv"),
            official_release_date=OFFICIAL_RELEASE_DATE,
            http_status=response.status_code,
            source_url=url,
        )

    def transform(self, evidence: Sequence[RawEvidence]) -> list[Observation]:
        if not evidence:
            raise ValueError("transform() requires RawEvidence")
        raw_path = self.data_root / evidence[0].path
        if not raw_path.is_file():
            raise FileNotFoundError(raw_path)
        source_version = f"Nomis {DATASET_ID} {evidence[0].official_release_date}".strip()
        observations = parse_nomis_csv(raw_path.read_bytes(), source_version=source_version)
        return mark_latest_months_provisional(observations, months=1, group_key=_series_key)


def main() -> None:
    """Fetch → transform → write the employment-by-occupation pack."""
    connector = EmploymentByOccupationConnector()
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
        if obs.period_start == latest and "series=share" in obs.notes:
            print(f"latest {obs.period_start} {obs.notes.split(';')[1].strip()} share={obs.value}")
    print(f"manifest: {manifest_path}")
    print(f"curated: {curated_path}")


if __name__ == "__main__":
    main()
