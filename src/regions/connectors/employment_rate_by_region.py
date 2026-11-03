"""Employment rate by region — ONS HI00 regional LFS workbook.

Approach:
1. Pin HI00 regionaltable1s.xlsx.
2. From each ``*_p`` (persons) sheet, extract employment rate (% aged 16-64, SA)
   quarterly/annual cells that are clearly labelled.
3. Prefer quarterly seasonally adjusted employment rate rows.
"""

from __future__ import annotations

import re
from pathlib import Path
from typing import Sequence

import openpyxl

from britain_exchange.connector import Connector
from britain_exchange.manifest import Manifest, RawEvidence
from britain_exchange.observation import Observation
from britain_exchange.paths import REGIONS_DATA
from regions.connectors._util import evidence_from_file

INDICATOR_ID = "employment-rate-by-region"
PINNED = "raw/2026-11-03/regionaltable1s.xlsx"
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
UNIT = "% employment rate (aged 16-64, SA)"

SHEET_GEO = {
    "neast_p": ("E12000001", "North East"),
    "nwest_p": ("E12000002", "North West"),
    "ykhu_p": ("E12000003", "Yorkshire and The Humber"),
    "emids_p": ("E12000004", "East Midlands"),
    "wmids_p": ("E12000005", "West Midlands"),
    "east_p": ("E12000006", "East of England"),
    "lon_p": ("E12000007", "London"),
    "seast_p": ("E12000008", "South East"),
    "swest_p": ("E12000009", "South West"),
    "wal_p": ("W92000004", "Wales"),
    "scot_p": ("S92000003", "Scotland"),
    "nire_p": ("N92000002", "Northern Ireland"),
    "eng_p": ("E92000001", "England"),
}

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
PERIOD_RE = re.compile(
    r"^(?P<m1>[A-Za-z]{3})-(?P<m2>[A-Za-z]{3})\s+(?P<y>\d{4})$"
)


def _rolling_quarter_bounds(label: str) -> tuple[str, str] | None:
    match = PERIOD_RE.match(label.strip())
    if not match:
        return None
    m1 = _MONTH[match.group("m1").lower()[:3]]
    m2 = _MONTH[match.group("m2").lower()[:3]]
    year = int(match.group("y"))
    # Dec-Feb spans year boundary: end year is ``year``, start is previous year
    start_year = year - 1 if m1 > m2 else year
    end_year = year
    import calendar

    start = f"{start_year:04d}-{m1:02d}-01"
    end = f"{end_year:04d}-{m2:02d}-{calendar.monthrange(end_year, m2)[1]:02d}"
    return start, end


def _parse_hi00_sheet(ws, geography_code: str, geography_label: str) -> list[Observation]:
    rows = list(ws.iter_rows(values_only=True))
    # Prefer aged 16-64 employment rate block when present; else 16+ header.
    header_idx = None
    emp_col = None
    for i, row in enumerate(rows[:80]):
        joined = " ".join(str(c) for c in row if c is not None).lower()
        if "16-64" in joined.replace(" ", "") or "aged 16 to 64" in joined:
            # look ahead a few rows for Employment rate (%)
            for j in range(i, min(i + 6, len(rows))):
                for col, cell in enumerate(rows[j]):
                    if str(cell or "").strip().lower() == "employment rate (%)":
                        header_idx = j
                        emp_col = col
                        break
                if emp_col is not None:
                    break
        if emp_col is not None:
            break
    if emp_col is None:
        for i, row in enumerate(rows[:20]):
            for col, cell in enumerate(row):
                if str(cell or "").strip().lower() == "employment rate (%)":
                    header_idx = i
                    emp_col = col
                    break
            if emp_col is not None:
                break
    if emp_col is None or header_idx is None:
        return []

    observations: list[Observation] = []
    for row in rows[header_idx + 1 :]:
        period_raw = row[0]
        if period_raw is None:
            continue
        period = str(period_raw).strip()
        bounds = _rolling_quarter_bounds(period)
        if bounds is None:
            continue
        value_raw = row[emp_col] if emp_col < len(row) else None
        if value_raw is None or value_raw == "":
            continue
        try:
            value = float(value_raw)
        except (TypeError, ValueError):
            continue
        start, end = bounds
        observations.append(
            Observation(
                indicator_id=INDICATOR_ID,
                period_start=start,
                period_end=end,
                geography_code=geography_code,
                geography_label=geography_label,
                value=value,
                unit=UNIT,
                observation_status="provisional",
                source_version="ONS HI00",
                notes=f"series=HI00; period_label={period}; employment rate %",
            )
        )
    return observations


def parse_hi00(path: Path) -> list[Observation]:
    wb = openpyxl.load_workbook(path, read_only=True, data_only=True)
    try:
        observations: list[Observation] = []
        available = set(wb.sheetnames)
        for sheet_name, (code, label) in SHEET_GEO.items():
            if sheet_name not in available:
                continue
            observations.extend(_parse_hi00_sheet(wb[sheet_name], code, label))
        if not observations:
            raise ValueError(
                f"No employment-rate rows parsed from HI00; sheets={wb.sheetnames[:20]}"
            )
        observations.sort(key=lambda obs: (obs.geography_code, obs.period_start))
        return observations
    finally:
        wb.close()


class EmploymentRateByRegionConnector(Connector):
    def __init__(self, data_root: Path | None = None) -> None:
        super().__init__(data_root or (REGIONS_DATA / INDICATOR_ID))

    @property
    def indicator_id(self) -> str:
        return INDICATOR_ID

    def build_manifest(self, evidence: Sequence[RawEvidence]) -> Manifest:
        return Manifest(
            indicator_id=self.indicator_id,
            title="Employment rate by region",
            sector="regions-places",
            publisher="ONS",
            source_url=SOURCE_LANDING,
            series_id="HI00 regional LFS employment rate (aged 16-64)",
            geography="UK ITL1 / nations (HI00 persons sheets)",
            frequency="quarterly",
            unit=UNIT,
            definition=(
                "Labour Force Survey employment rate for people aged 16 to 64 by "
                "UK country and English region (HI00 headline indicators)."
            ),
            licence="Open Government Licence v3.0",
            agent_owner="regions",
            connector_module="regions.connectors.employment_rate_by_region",
            curated_path="curated/observations.csv",
            update_cadence="monthly release of HI00 (LFS)",
            raw_evidence=list(evidence),
            notion_registry_url="https://app.notion.com/40d654717685815691ebe6f62ca7a4e2",
            transformations=(
                "Parse each HI00 *_p sheet; locate Employment rate 16-64 column; "
                "prefer quarterly period labels."
            ),
            caveats=(
                "LFS reweighting and SA revisions affect levels. Links to Economy "
                "national employment rate when that row is Ready — this indicator "
                "keeps regional grain."
            ),
            revision_notes="Pinned HI00 regionaltable1s.xlsx on 2026-11-03.",
        )

    def evidence_from_pinned_raw(self) -> RawEvidence:
        return evidence_from_file(
            self.data_root,
            PINNED,
            source_url=SOURCE_ASSET,
            content_type=(
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            ),
            official_release_date="2026-10-20",
        )

    def transform(self, evidence: Sequence[RawEvidence]) -> list[Observation]:
        if not evidence:
            raise ValueError("transform() requires RawEvidence")
        return parse_hi00(self.data_root / evidence[0].path)


def main() -> None:
    connector = EmploymentRateByRegionConnector()
    evidence = connector.evidence_from_pinned_raw()
    observations = connector.transform([evidence])
    connector.write_hand_off([evidence], observations)
    print(f"indicator_id: {connector.indicator_id} rows={len(observations)}")


if __name__ == "__main__":
    main()
