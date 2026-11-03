"""Historical coal production — DESNZ DUKES historical coal data 1853–.

Approach:
1. Pin Coal_since_1853.xls.
2. Parse Coal Production sheet Total Output (million tonnes).
3. Distinct from Energy primary-energy-production (ET 1.1 Mtoe monthly) — link, don't fork.
"""

from __future__ import annotations

import re
from pathlib import Path
from typing import Sequence

import xlrd

from britain_exchange.connector import Connector
from britain_exchange.manifest import Manifest, RawEvidence
from britain_exchange.observation import Observation
from britain_exchange.paths import HISTORY_DATA
from history.connectors._util import evidence_from_file, year_bounds

INDICATOR_ID = "historical-coal-production"
UK_CODE, UK_LABEL = "K02000001", "United Kingdom"
PINNED = "raw/2026-11-03/Coal_since_1853.xls"
SOURCE_LANDING = (
    "https://www.gov.uk/government/statistical-data-sets/"
    "historical-coal-data-coal-production-availability-and-consumption"
)
SOURCE_ASSET = (
    "https://assets.publishing.service.gov.uk/media/"
    "6a69e3284dda8076771a4323/Coal_since_1853.xls"
)
UNIT = "million tonnes"
SOURCE_VERSION = "DESNZ historical coal data 1853-2025"


def parse_coal_production(path: Path) -> list[Observation]:
    book = xlrd.open_workbook(path)
    sheet = book.sheet_by_name("Coal Production")
    observations: list[Observation] = []
    # Columns from inspection: Year | ... | Total Output (col 4)
    for r in range(sheet.nrows):
        year_cell = sheet.cell_value(r, 0)
        total = sheet.cell_value(r, 4)
        year_text = str(year_cell).strip()
        # Accept single years; for decade averages like 1853-1862 take midpoint note
        if re.fullmatch(r"\d{4}", year_text.split(".")[0] if isinstance(year_cell, float) else year_text):
            year = int(float(year_cell)) if isinstance(year_cell, float) else int(year_text)
            if not isinstance(total, (int, float)) or total == "":
                continue
            start, end = year_bounds(year)
            observations.append(
                Observation(
                    indicator_id=INDICATOR_ID,
                    period_start=start,
                    period_end=end,
                    geography_code=UK_CODE,
                    geography_label=UK_LABEL,
                    value=float(total),
                    unit=UNIT,
                    observation_status="final",
                    source_version=SOURCE_VERSION,
                    notes="series=Coal Production Total Output; unit=million tonnes",
                )
            )
            continue
        # Decade / multi-year labels: keep as estimated mid-period annualised? Skip — keep single years only
    if not observations:
        raise ValueError("No annual coal production rows parsed (single years)")
    return observations


class HistoricalCoalProductionConnector(Connector):
    def __init__(self, data_root: Path | None = None) -> None:
        super().__init__(data_root or (HISTORY_DATA / INDICATOR_ID))

    @property
    def indicator_id(self) -> str:
        return INDICATOR_ID

    def build_manifest(self, evidence: Sequence[RawEvidence]) -> Manifest:
        return Manifest(
            indicator_id=self.indicator_id,
            title="Historical coal production",
            sector="history-change",
            publisher="DESNZ",
            source_url=SOURCE_LANDING,
            series_id="Historical coal data — Coal Production Total Output",
            geography="United Kingdom (K02000001)",
            frequency="annual",
            unit=UNIT,
            definition=(
                "UK coal production (total output, million tonnes) from DESNZ "
                "historical coal statistics (DUKES companion series from 1853)."
            ),
            licence="Open Government Licence v3.0",
            agent_owner="history",
            connector_module="history.connectors.historical_coal_production",
            curated_path="curated/observations.csv",
            update_cadence="annual with DUKES (July)",
            raw_evidence=list(evidence),
            notion_registry_url="https://app.notion.com/40d654717685810db26fe5add2ed8e1e",
            transformations=(
                "Parse Coal Production sheet; keep single calendar-year rows; "
                "Total Output column (million tonnes). Decade averages omitted."
            ),
            caveats=(
                "Distinct from Energy primary-energy-production (ET 1.1 Mtoe). "
                "Early decade averages in the workbook are not expanded here."
            ),
            related_indicator_ids=["primary-energy-production"],
            revision_notes="Pinned Coal_since_1853.xls 2026-11-03 (updated 30 Jul 2026).",
        )

    def evidence_from_pinned_raw(self) -> RawEvidence:
        return evidence_from_file(
            self.data_root,
            PINNED,
            source_url=SOURCE_ASSET,
            content_type="application/vnd.ms-excel",
            official_release_date="2026-07-30",
        )

    def transform(self, evidence: Sequence[RawEvidence]) -> list[Observation]:
        if not evidence:
            raise ValueError("transform() requires RawEvidence")
        return parse_coal_production(self.data_root / evidence[0].path)


def main() -> None:
    connector = HistoricalCoalProductionConnector()
    evidence = connector.evidence_from_pinned_raw()
    observations = connector.transform([evidence])
    connector.write_hand_off([evidence], observations)
    print(f"indicator_id: {connector.indicator_id} rows={len(observations)}")


if __name__ == "__main__":
    main()
