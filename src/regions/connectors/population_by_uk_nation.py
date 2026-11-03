"""Population by UK nation — ONS mid-year estimates time series (pop.csv).

Approach:
1. Pin ONS population estimates time series CSV.
2. Keep nation CDIDs: ENPOP, WAPOP, SCPOP, NIPOP (plus UKPOP for reference).
3. Emit annual mid-year observations (30 Jun).
"""

from __future__ import annotations

import csv
from pathlib import Path
from typing import Sequence

from britain_exchange.connector import Connector
from britain_exchange.manifest import Manifest, RawEvidence
from britain_exchange.observation import Observation
from britain_exchange.paths import REGIONS_DATA
from regions.connectors._util import evidence_from_file

INDICATOR_ID = "population-by-uk-nation"
PINNED = "raw/2026-11-03/pop.csv"
SOURCE_LANDING = (
    "https://www.ons.gov.uk/peoplepopulationandcommunity/populationandmigration/"
    "populationestimates/datasets/populationestimatestimeseriesdataset"
)
SOURCE_ASSET = (
    "https://www.ons.gov.uk/file?uri=/peoplepopulationandcommunity/"
    "populationandmigration/populationestimates/datasets/"
    "populationestimatestimeseriesdataset/current/pop.csv"
)
UNIT = "persons (mid-year estimate)"

SERIES = {
    "ENPOP": ("E92000001", "England"),
    "WAPOP": ("W92000004", "Wales"),
    "SCPOP": ("S92000003", "Scotland"),
    "NIPOP": ("N92000002", "Northern Ireland"),
    "UKPOP": ("K02000001", "United Kingdom"),
}


def parse_pop(path: Path) -> list[Observation]:
    with path.open(encoding="utf-8", newline="") as handle:
        rows = list(csv.reader(handle))
    if len(rows) < 8:
        raise ValueError("Unexpected pop.csv shape")
    # Row with CDID labels
    cdid_row = next(r for r in rows if r and r[0] == "CDID")
    series_ids = cdid_row[1:]
    observations: list[Observation] = []
    for row in rows:
        if not row or not str(row[0]).isdigit():
            continue
        year = int(row[0])
        for idx, series_id in enumerate(series_ids):
            if series_id not in SERIES:
                continue
            raw = row[idx + 1] if idx + 1 < len(row) else ""
            if raw in {"", None}:
                continue
            code, label = SERIES[series_id]
            observations.append(
                Observation(
                    indicator_id=INDICATOR_ID,
                    period_start=f"{year:04d}-06-30",
                    period_end=f"{year:04d}-06-30",
                    geography_code=code,
                    geography_label=label,
                    value=float(str(raw).replace(",", "")),
                    unit=UNIT,
                    observation_status="final",
                    source_version="ONS pop.csv mid-year estimates",
                    notes=f"series={series_id}; mid-year usually resident population",
                )
            )
    if not observations:
        raise ValueError("No population observations parsed")
    observations.sort(key=lambda obs: (obs.geography_code, obs.period_start))
    return observations


class PopulationByUkNationConnector(Connector):
    def __init__(self, data_root: Path | None = None) -> None:
        super().__init__(data_root or (REGIONS_DATA / INDICATOR_ID))

    @property
    def indicator_id(self) -> str:
        return INDICATOR_ID

    def build_manifest(self, evidence: Sequence[RawEvidence]) -> Manifest:
        return Manifest(
            indicator_id=self.indicator_id,
            title="Population by UK nation",
            sector="regions-places",
            publisher="ONS",
            source_url=SOURCE_LANDING,
            series_id="ENPOP/WAPOP/SCPOP/NIPOP/UKPOP mid-year estimates",
            geography="UK nations + UK total",
            frequency="annual",
            unit=UNIT,
            definition=(
                "Official mid-year usually resident population estimates for the "
                "UK and constituent countries (30 June reference)."
            ),
            licence="Open Government Licence v3.0",
            agent_owner="regions",
            connector_module="regions.connectors.population_by_uk_nation",
            curated_path="curated/observations.csv",
            update_cadence="annual (ONS / NRS / NISRA mid-year estimates)",
            raw_evidence=list(evidence),
            notion_registry_url="https://app.notion.com/40d654717685818d9252d9c2b2b9d7b4",
            transformations=(
                "Parse ONS pop.csv; keep nation CDIDs + UKPOP; period fixed to mid-year date."
            ),
            caveats=(
                "Scotland rebases may lag UK compilation in some vintages — see ONS notices. "
                "May overlap People sector national population rows; geography grain is nations."
            ),
            revision_notes="Pinned pop.csv 2026-11-03 (release date in file 01-10-2026).",
        )

    def evidence_from_pinned_raw(self) -> RawEvidence:
        return evidence_from_file(
            self.data_root,
            PINNED,
            source_url=SOURCE_ASSET,
            content_type="text/csv",
            official_release_date="2026-10-01",
        )

    def transform(self, evidence: Sequence[RawEvidence]) -> list[Observation]:
        if not evidence:
            raise ValueError("transform() requires RawEvidence")
        return parse_pop(self.data_root / evidence[0].path)


def main() -> None:
    connector = PopulationByUkNationConnector()
    evidence = connector.evidence_from_pinned_raw()
    observations = connector.transform([evidence])
    connector.write_hand_off([evidence], observations)
    print(f"indicator_id: {connector.indicator_id} rows={len(observations)}")


if __name__ == "__main__":
    main()
