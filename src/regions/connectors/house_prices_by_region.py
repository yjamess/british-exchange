"""House prices by region — HM Land Registry UK HPI average prices.

Approach:
1. Pin Average-prices CSV from Land Registry publicdata.
2. Keep ITL1-style region Area_Codes (E120000xx nations + UK).
3. Emit monthly average price observations.
"""

from __future__ import annotations

import csv
from datetime import date
from pathlib import Path
from typing import Sequence

from britain_exchange.connector import Connector
from britain_exchange.manifest import Manifest, RawEvidence
from britain_exchange.observation import Observation
from britain_exchange.paths import REGIONS_DATA
from regions.connectors._util import evidence_from_file, month_bounds

INDICATOR_ID = "house-prices-by-region"
PINNED = "raw/2026-11-03/Average-prices-2026-08.csv"
SOURCE_LANDING = (
    "https://www.gov.uk/government/statistical-data-sets/"
    "uk-house-price-index-data-downloads-august-2026--2"
)
SOURCE_ASSET = (
    "https://publicdata.landregistry.gov.uk/market-trend-data/"
    "house-price-index-data/Average-prices-2026-08.csv"
)
UNIT = "£ average price (UK HPI)"

# Nations, English regions, UK — exclude local authorities for this indicator.
KEEP_PREFIXES = ("K020", "E920", "W920", "S920", "N920", "E120")


def _keep_geography(code: str) -> bool:
    return code.startswith(KEEP_PREFIXES)


def parse_average_prices(path: Path) -> list[Observation]:
    with path.open(encoding="utf-8", newline="") as handle:
        rows = list(csv.DictReader(handle))
    if not rows:
        raise ValueError("Empty UK HPI average prices CSV")
    observations: list[Observation] = []
    for row in rows:
        code = (row.get("Area_Code") or row.get("AreaCode") or "").strip()
        if not code or not _keep_geography(code):
            continue
        label = (row.get("Region_Name") or row.get("RegionName") or "").strip()
        date_raw = (row.get("Date") or "").strip()
        price_raw = row.get("Average_Price") or row.get("AveragePrice")
        if not date_raw or price_raw in {None, ""}:
            continue
        period = date.fromisoformat(date_raw[:10])
        start, end = month_bounds(period.year, period.month)
        observations.append(
            Observation(
                indicator_id=INDICATOR_ID,
                period_start=start,
                period_end=end,
                geography_code=code,
                geography_label=label,
                value=float(str(price_raw).replace(",", "")),
                unit=UNIT,
                observation_status="provisional",
                source_version="UK HPI Average-prices-2026-08",
                notes="series=UK HPI average price; geography=nation/ITL1/UK",
            )
        )
    if not observations:
        raise ValueError("No regional average price rows kept")
    observations.sort(key=lambda obs: (obs.geography_code, obs.period_start))
    return observations


class HousePricesByRegionConnector(Connector):
    def __init__(self, data_root: Path | None = None) -> None:
        super().__init__(data_root or (REGIONS_DATA / INDICATOR_ID))

    @property
    def indicator_id(self) -> str:
        return INDICATOR_ID

    def build_manifest(self, evidence: Sequence[RawEvidence]) -> Manifest:
        return Manifest(
            indicator_id=self.indicator_id,
            title="House prices by region",
            sector="regions-places",
            publisher="HM Land Registry / ONS (UK HPI)",
            source_url=SOURCE_LANDING,
            series_id="UK HPI Average price by Region_Name / Area_Code",
            geography="UK, nations, English ITL1 regions",
            frequency="monthly",
            unit=UNIT,
            definition=(
                "UK House Price Index average price estimates for the UK, "
                "constituent countries, and English regions."
            ),
            licence="Open Government Licence v3.0",
            agent_owner="regions",
            connector_module="regions.connectors.house_prices_by_region",
            curated_path="curated/observations.csv",
            update_cadence="monthly (UK HPI)",
            raw_evidence=list(evidence),
            notion_registry_url="https://app.notion.com/40d6547176858173a6a9d50b1e04c399",
            transformations=(
                "Parse Average-prices CSV; keep Area_Code prefixes for UK/nations/"
                "English regions; drop local authorities."
            ),
            caveats=(
                "Links to Housing UK average house price indicator; this row keeps "
                "regional grain. Early years for Scotland/NI start later than England."
            ),
            related_indicator_ids=[],
            revision_notes="Pinned Average-prices-2026-08.csv on 2026-11-03.",
        )

    def evidence_from_pinned_raw(self) -> RawEvidence:
        return evidence_from_file(
            self.data_root,
            PINNED,
            source_url=SOURCE_ASSET,
            content_type="text/csv",
            official_release_date="2026-10-21",
        )

    def transform(self, evidence: Sequence[RawEvidence]) -> list[Observation]:
        if not evidence:
            raise ValueError("transform() requires RawEvidence")
        return parse_average_prices(self.data_root / evidence[0].path)


def main() -> None:
    connector = HousePricesByRegionConnector()
    evidence = connector.evidence_from_pinned_raw()
    observations = connector.transform([evidence])
    connector.write_hand_off([evidence], observations)
    print(f"indicator_id: {connector.indicator_id} rows={len(observations)}")


if __name__ == "__main__":
    main()
