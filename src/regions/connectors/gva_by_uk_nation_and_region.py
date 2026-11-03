"""GVA by UK nation and region — ONS regional GVA(B) Table 1b (CVM £m).

Approach:
1. Pin ONS regional GVA balanced workbook (all ITL regions).
2. Keep Table 1b rows where SIC07=Total (all industries) at ITL1 + UK.
3. Emit annual observations per geography × year.
"""

from __future__ import annotations

from pathlib import Path
from typing import Sequence

import openpyxl

from britain_exchange.connector import Connector
from britain_exchange.manifest import Manifest, RawEvidence
from britain_exchange.observation import Observation
from britain_exchange.paths import REGIONS_DATA
from regions.connectors._util import evidence_from_file, year_bounds

INDICATOR_ID = "gva-by-uk-nation-and-region"
PINNED = "raw/2026-11-03/regional_gva_balanced.xlsx"
SOURCE_LANDING = (
    "https://www.ons.gov.uk/economy/grossvalueaddedgva/datasets/"
    "nominalandrealregionalgrossvalueaddedbalancedbyindustry"
)
SOURCE_ASSET = (
    "https://www.ons.gov.uk/file?uri=/economy/grossvalueaddedgva/datasets/"
    "nominalandrealregionalgrossvalueaddedbalancedbyindustry/current/"
    "regionalgrossvalueaddedbalancedbyindustryandallitlregions.xlsx"
)
UNIT = "£ million chained volume (2019 money value)"
SOURCE_VERSION = "ONS regional GVA(B) Table 1b"


def parse_gva_itl1_total(path: Path) -> list[Observation]:
    wb = openpyxl.load_workbook(path, read_only=True, data_only=True)
    try:
        ws = wb["Table 1b"]
        rows = list(ws.iter_rows(values_only=True))
        if len(rows) < 3:
            raise ValueError("Table 1b empty")
        header = rows[1]
        year_cols: list[tuple[int, int]] = []
        for idx, cell in enumerate(header):
            if isinstance(cell, (int, float)) and 1900 < int(cell) < 2100:
                year_cols.append((idx, int(cell)))
            elif isinstance(cell, str) and cell.isdigit() and 1900 < int(cell) < 2100:
                year_cols.append((idx, int(cell)))
        if not year_cols:
            raise ValueError("No year columns in Table 1b header")

        observations: list[Observation] = []
        for row in rows[2:]:
            if not row or row[2] != "Total":
                continue
            code = str(row[0] or "").strip()
            label = str(row[1] or "").strip()
            if not code or not label:
                continue
            # ITL1 codes are typically TLx / UK / short codes; keep UK + ITL1-length
            if code != "UK" and not (
                code.startswith("TL") or code.startswith("K") or len(code) <= 3
            ):
                # Table 1b is ITL1 & UK only per Contents — keep all Total rows
                pass
            for col, year in year_cols:
                raw = row[col] if col < len(row) else None
                if raw is None or raw == "" or raw == "..":
                    continue
                start, end = year_bounds(year)
                observations.append(
                    Observation(
                        indicator_id=INDICATOR_ID,
                        period_start=start,
                        period_end=end,
                        geography_code=code if code != "UK" else "K02000001",
                        geography_label=label if code != "UK" else "United Kingdom",
                        value=float(raw),
                        unit=UNIT,
                        observation_status="provisional",
                        source_version=SOURCE_VERSION,
                        notes="series=GVA(B) Table 1b; sic=Total all industries; CVM 2019 money",
                    )
                )
        if not observations:
            raise ValueError("No ITL1 Total GVA rows parsed")
        observations.sort(key=lambda obs: (obs.geography_code, obs.period_start))
        return observations
    finally:
        wb.close()


class GvaByUkNationAndRegionConnector(Connector):
    def __init__(self, data_root: Path | None = None) -> None:
        super().__init__(data_root or (REGIONS_DATA / INDICATOR_ID))

    @property
    def indicator_id(self) -> str:
        return INDICATOR_ID

    def build_manifest(self, evidence: Sequence[RawEvidence]) -> Manifest:
        return Manifest(
            indicator_id=self.indicator_id,
            title="GVA by UK nation and region",
            sector="regions-places",
            publisher="ONS",
            source_url=SOURCE_LANDING,
            series_id="Regional GVA(B) Table 1b — ITL1 & UK CVM £m (2019 money)",
            geography="UK + ITL1 nations/regions",
            frequency="annual",
            unit=UNIT,
            definition=(
                "Balanced regional gross value added (GVA(B)) for UK and ITL1 "
                "areas, all industries total, chained volume measures in 2019 "
                "money values (£ million)."
            ),
            licence="Open Government Licence v3.0",
            agent_owner="regions",
            connector_module="regions.connectors.gva_by_uk_nation_and_region",
            curated_path="curated/observations.csv",
            update_cadence="annual (ONS regional accounts)",
            raw_evidence=list(evidence),
            notion_registry_url="https://app.notion.com/40d65471768581cb9cebe333e6dc4d38",
            transformations=(
                "Parse Table 1b; keep SIC07 code Total; one row per geography × year. "
                "Map UK→K02000001."
            ),
            caveats=(
                "ITL2/ITL3 issues flagged by ONS in 2026 notice do not affect ITL1. "
                "CVM levels revise with Blue Book / regional accounts updates."
            ),
            revision_notes="Pinned ONS current workbook 2026-11-03 (release 23 Sep 2026 family).",
        )

    def evidence_from_pinned_raw(self) -> RawEvidence:
        return evidence_from_file(
            self.data_root,
            PINNED,
            source_url=SOURCE_ASSET,
            content_type=(
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            ),
            official_release_date="2026-09-23",
        )

    def transform(self, evidence: Sequence[RawEvidence]) -> list[Observation]:
        if not evidence:
            raise ValueError("transform() requires RawEvidence")
        return parse_gva_itl1_total(self.data_root / evidence[0].path)


def main() -> None:
    connector = GvaByUkNationAndRegionConnector()
    evidence = connector.evidence_from_pinned_raw()
    observations = connector.transform([evidence])
    manifest_path, curated_path = connector.write_hand_off([evidence], observations)
    print(f"indicator_id: {connector.indicator_id} rows={len(observations)}")
    print(manifest_path, curated_path)


if __name__ == "__main__":
    main()
