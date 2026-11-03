"""ONS national life tables — UK period life expectancy at birth.

Approach:
1. Pin National life tables: UK workbook.
2. For each three-year sheet, take age 0 ex for males and females.
3. Long format with sex= in notes; period = three-year window.
"""

from __future__ import annotations

import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Sequence

from openpyxl import load_workbook

from britain_exchange.checksum import sha256_file
from britain_exchange.connector import Connector
from britain_exchange.manifest import Manifest, RawEvidence
from britain_exchange.observation import Observation
from britain_exchange.paths import PEOPLE_DATA

PINNED_RAW = "raw/2026-11-03/nlt_uk.xlsx"
SOURCE_LANDING = (
    "https://www.ons.gov.uk/peoplepopulationandcommunity/birthsdeathsandmarriages/"
    "lifeexpectancies/datasets/nationallifetablesunitedkingdomreferencetables"
)
PINNED_URL = (
    "https://www.ons.gov.uk/file?uri=/peoplepopulationandcommunity/"
    "birthsdeathsandmarriages/lifeexpectancies/datasets/"
    "nationallifetablesunitedkingdomreferencetables/current/nltuk198020223.xlsx"
)
OFFICIAL_RELEASE_DATE = "2025-12-10"
SOURCE_VERSION = "National life tables UK 2022-2024 release"
UK_CODE = "K02000001"
UK_LABEL = "United Kingdom"
UNIT = "years (period life expectancy at birth)"
SHEET_RE = re.compile(r"^(\d{4})-(\d{4})$")


def parse_national_life_tables(workbook: Path) -> list[Observation]:
    wb = load_workbook(workbook, data_only=True, read_only=False)
    try:
        observations: list[Observation] = []
        for sheet_name in wb.sheetnames:
            match = SHEET_RE.match(sheet_name)
            if not match:
                continue
            start_year, end_year = int(match.group(1)), int(match.group(2))
            ws = wb[sheet_name]
            # Row 7 is age 0 (after headers on rows 5-6).
            male_ex = ws.cell(7, 6).value
            female_ex = ws.cell(7, 13).value
            if male_ex is None or female_ex is None:
                raise ValueError(f"Missing age-0 ex on sheet {sheet_name}")
            period_start = f"{start_year:04d}-01-01"
            period_end = f"{end_year:04d}-12-31"
            for sex, value in (("male", float(male_ex)), ("female", float(female_ex))):
                observations.append(
                    Observation(
                        indicator_id="life-expectancy-at-birth",
                        period_start=period_start,
                        period_end=period_end,
                        geography_code=UK_CODE,
                        geography_label=UK_LABEL,
                        value=value,
                        unit=UNIT,
                        observation_status="final",
                        source_version=SOURCE_VERSION,
                        notes=f"sex={sex}; series=national life tables UK; age=0",
                    )
                )
        if not observations:
            raise ValueError("No life-table sheets parsed")
        observations.sort(key=lambda obs: (obs.period_start, obs.notes))
        return observations
    finally:
        wb.close()


class LifeExpectancyAtBirthConnector(Connector):
    def __init__(self, data_root: Path | None = None) -> None:
        super().__init__(data_root or (PEOPLE_DATA / "life-expectancy-at-birth"))

    @property
    def indicator_id(self) -> str:
        return "life-expectancy-at-birth"

    def build_manifest(self, evidence: Sequence[RawEvidence]) -> Manifest:
        return Manifest(
            indicator_id=self.indicator_id,
            title="Life expectancy at birth",
            sector="people-society",
            publisher="ONS",
            source_url=SOURCE_LANDING,
            series_id="National life tables UK — ex at age 0",
            geography="United Kingdom (K02000001)",
            frequency="annual",
            unit=UNIT,
            definition=(
                "Period life expectancy at birth (ex at age 0) for males and "
                "females from ONS three-year national life tables for the UK."
            ),
            licence="Open Government Licence v3.0",
            agent_owner="people",
            connector_module="people.connectors.life_expectancy_at_birth",
            curated_path="curated/observations.csv",
            update_cadence="annual",
            raw_evidence=list(evidence),
            notion_registry_url="https://app.notion.com/40d65471768581de9f5ccb61cf6b27aa",
            transformations=(
                "Each YYYY-YYYY sheet → two observations (sex=male/female) for age 0 ex."
            ),
            caveats=(
                "Period (not cohort) life expectancy based on three consecutive "
                "years of mortality. UK aggregate; nation breakdowns in sibling datasets."
            ),
            revision_notes="Pinned release 10 December 2025 (tables 2022-2024).",
        )

    def evidence_from_pinned_raw(self) -> RawEvidence:
        path = self.data_root / PINNED_RAW
        if not path.is_file():
            raise FileNotFoundError(path)
        return RawEvidence(
            path=PINNED_RAW,
            retrieved_at=datetime.now(timezone.utc).isoformat(),
            checksum_sha256=sha256_file(path),
            content_type=(
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            ),
            official_release_date=OFFICIAL_RELEASE_DATE,
            source_url=PINNED_URL,
        )

    def transform(self, evidence: Sequence[RawEvidence]) -> list[Observation]:
        if not evidence:
            raise ValueError("transform() requires RawEvidence")
        return parse_national_life_tables(self.data_root / evidence[0].path)


def main() -> None:
    connector = LifeExpectancyAtBirthConnector()
    evidence = connector.evidence_from_pinned_raw()
    observations = connector.transform([evidence])
    connector.write_hand_off([evidence], observations)
    print(f"observations: {len(observations)}")


if __name__ == "__main__":
    main()
