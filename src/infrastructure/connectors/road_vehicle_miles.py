"""Road vehicle miles — DfT TRA0101 (Great Britain).

Approach:
1. Pin TRA0101 ODS (vehicle miles by vehicle type).
2. Keep All Motor Vehicles annual series for GB (billion vehicle miles).
3. Emit one observation per calendar year.
"""

from __future__ import annotations

import re
from pathlib import Path
from typing import Sequence

from britain_exchange.connector import Connector
from britain_exchange.manifest import Manifest, RawEvidence
from britain_exchange.observation import Observation
from britain_exchange.paths import INFRASTRUCTURE_DATA
from infrastructure.connectors._ods import read_ods_rows
from infrastructure.connectors._util import evidence_from_file, year_bounds

INDICATOR_ID = "road-vehicle-miles"
GB_CODE, GB_LABEL = "K03000001", "Great Britain"
PINNED = "raw/2026-11-03/tra0101-miles-by-vehicle-type.ods"
SOURCE_LANDING = (
    "https://www.gov.uk/government/statistical-data-sets/road-traffic-estimates-tra"
)
SOURCE_ASSET = (
    "https://assets.publishing.service.gov.uk/media/"
    "6a0b7b9ec75cc34a8ff8f481/tra0101-miles-by-vehicle-type.ods"
)
UNIT = "billion vehicle miles"


def parse_tra0101(path: Path) -> list[Observation]:
    rows = read_ods_rows(path, table_name="TRA0101")
    header_idx = None
    for i, row in enumerate(rows[:20]):
        if row and str(row[0]).strip().lower() == "year":
            header_idx = i
            break
    if header_idx is None:
        raise ValueError("Could not find Year header row in TRA0101")

    header = rows[header_idx]
    try:
        total_col = next(
            i
            for i, cell in enumerate(header)
            if str(cell).strip().lower() == "all motor vehicles"
        )
    except StopIteration as exc:
        raise ValueError("All Motor Vehicles column missing in TRA0101") from exc

    observations: list[Observation] = []
    for row in rows[header_idx + 1 :]:
        year_text = str(row[0]).strip()
        if not re.fullmatch(r"(19|20)\d{2}", year_text):
            continue
        year = int(year_text)
        raw = row[total_col] if total_col < len(row) else ""
        if raw is None or str(raw).strip() in {"", "-", "–", ".."}:
            continue
        value = float(str(raw).replace(",", ""))
        start, end = year_bounds(year)
        observations.append(
            Observation(
                indicator_id=INDICATOR_ID,
                period_start=start,
                period_end=end,
                geography_code=GB_CODE,
                geography_label=GB_LABEL,
                value=value,
                unit=UNIT,
                observation_status="final",
                source_version="DfT TRA0101",
                notes=f"series=TRA0101; vehicle=All Motor Vehicles; year={year}",
            )
        )
    if not observations:
        raise ValueError("No TRA0101 annual values parsed")
    return observations


class RoadVehicleMilesConnector(Connector):
    def __init__(self, data_root: Path | None = None) -> None:
        super().__init__(data_root or (INFRASTRUCTURE_DATA / INDICATOR_ID))

    @property
    def indicator_id(self) -> str:
        return INDICATOR_ID

    def build_manifest(self, evidence: Sequence[RawEvidence]) -> Manifest:
        return Manifest(
            indicator_id=self.indicator_id,
            title="Road vehicle miles",
            sector="infrastructure",
            publisher="Department for Transport",
            source_url=SOURCE_LANDING,
            series_id="TRA0101 Road traffic (vehicle miles) by vehicle type",
            geography="Great Britain (K03000001); Northern Ireland excluded",
            frequency="annual",
            unit=UNIT,
            definition=(
                "Annual motor vehicle traffic on Great Britain roads in billion "
                "vehicle miles (All Motor Vehicles) from DfT TRA0101."
            ),
            licence="Open Government Licence v3.0",
            agent_owner="infrastructure",
            connector_module="infrastructure.connectors.road_vehicle_miles",
            curated_path="curated/observations.csv",
            update_cadence="annual (DfT road traffic estimates)",
            raw_evidence=list(evidence),
            notion_registry_url="https://app.notion.com/40d65471768581ad9663fa630a1434fa",
            transformations=(
                "Parse TRA0101 data sheet; keep Year + All Motor Vehicles columns."
            ),
            caveats=(
                "GB only. Pedal cycles are a separate TRA series. Units are billion "
                "vehicle miles as published."
            ),
            revision_notes="Pinned TRA0101 ODS on 2026-11-03 (May 2026 update).",
        )

    def evidence_from_pinned_raw(self) -> RawEvidence:
        return evidence_from_file(
            self.data_root,
            PINNED,
            source_url=SOURCE_ASSET,
            content_type="application/vnd.oasis.opendocument.spreadsheet",
            official_release_date="2026-05-20",
        )

    def transform(self, evidence: Sequence[RawEvidence]) -> list[Observation]:
        if not evidence:
            raise ValueError("transform() requires RawEvidence")
        return parse_tra0101(self.data_root / evidence[0].path)


def main() -> None:
    connector = RoadVehicleMilesConnector()
    evidence = connector.evidence_from_pinned_raw()
    observations = connector.transform([evidence])
    manifest_path, curated_path = connector.write_hand_off([evidence], observations)
    print(f"indicator_id: {connector.indicator_id} rows={len(observations)}")
    print(manifest_path, curated_path)


if __name__ == "__main__":
    main()
