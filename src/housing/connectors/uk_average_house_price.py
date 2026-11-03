"""UK HPI average house price — United Kingdom monthly series.

Approach:
1. Pin HM Land Registry / ONS UK HPI full CSV.
2. Keep rows where RegionName == 'United Kingdom' (AreaCode K02000001).
3. Emit AveragePrice as monthly observations.
"""

from __future__ import annotations

import csv
from datetime import date, datetime, timezone
from pathlib import Path
from typing import Sequence

from britain_exchange.checksum import sha256_file
from britain_exchange.connector import Connector
from britain_exchange.manifest import Manifest, RawEvidence
from britain_exchange.observation import Observation, ObservationStatus
from britain_exchange.paths import HOUSING_DATA

PINNED_RAW = "raw/2026-11-03/UK-HPI-full-file-2026-08.csv"
SOURCE_LANDING = (
    "https://www.gov.uk/government/statistical-data-sets/"
    "uk-house-price-index-data-downloads-august-2026--2"
)
PINNED_URL = (
    "https://publicdata.landregistry.gov.uk/market-trend-data/"
    "house-price-index-data/UK-HPI-full-file-2026-08.csv"
)
OFFICIAL_RELEASE_DATE = "2026-10-21"
SOURCE_VERSION = "UK-HPI-full-file-2026-08"
UK_CODE = "K02000001"
UK_LABEL = "United Kingdom"
UNIT = "£ (average house price, UK HPI)"


def _month_bounds(d: date) -> tuple[str, str]:
    import calendar

    last = calendar.monthrange(d.year, d.month)[1]
    return f"{d.year:04d}-{d.month:02d}-01", f"{d.year:04d}-{d.month:02d}-{last:02d}"


def _parse_uk_date(raw: str) -> date:
    # UK HPI uses DD/MM/YYYY
    return datetime.strptime(raw.strip(), "%d/%m/%Y").date()


def parse_uk_hpi_average_price(csv_path: Path) -> list[Observation]:
    observations: list[Observation] = []
    with csv_path.open(newline="", encoding="utf-8") as handle:
        reader = csv.DictReader(handle)
        for row in reader:
            if (row.get("RegionName") or "").strip() != "United Kingdom":
                continue
            area = (row.get("AreaCode") or "").strip()
            if area and area != UK_CODE:
                raise ValueError(f"Unexpected UK AreaCode {area!r}")
            price_raw = (row.get("AveragePrice") or "").strip()
            if not price_raw:
                status: ObservationStatus = "missing"
                value = None
            else:
                value = float(price_raw.replace(",", ""))
                status = "provisional"
            period = _parse_uk_date(row["Date"])
            start, end = _month_bounds(period)
            observations.append(
                Observation(
                    indicator_id="uk-average-house-price",
                    period_start=start,
                    period_end=end,
                    geography_code=UK_CODE,
                    geography_label=UK_LABEL,
                    value=value,
                    unit=UNIT,
                    observation_status=status,
                    source_version=SOURCE_VERSION,
                    notes="series=UK HPI AveragePrice; region=United Kingdom",
                )
            )
    if not observations:
        raise ValueError("No United Kingdom rows in UK HPI CSV")
    observations.sort(key=lambda obs: obs.period_start)
    return observations


class UkAverageHousePriceConnector(Connector):
    def __init__(self, data_root: Path | None = None) -> None:
        super().__init__(data_root or (HOUSING_DATA / "uk-average-house-price"))

    @property
    def indicator_id(self) -> str:
        return "uk-average-house-price"

    def build_manifest(self, evidence: Sequence[RawEvidence]) -> Manifest:
        return Manifest(
            indicator_id=self.indicator_id,
            title="UK average house price",
            sector="housing-land",
            publisher="HM Land Registry / ONS",
            source_url=SOURCE_LANDING,
            series_id="UK HPI AveragePrice (United Kingdom)",
            geography="United Kingdom (K02000001)",
            frequency="monthly",
            unit=UNIT,
            definition=(
                "UK House Price Index average house price for the United Kingdom. "
                "Calculated by ONS from HM Land Registry, Registers of Scotland and "
                "LPS Northern Ireland sales; published via Land Registry open data."
            ),
            licence="Open Government Licence v3.0",
            agent_owner="housing",
            connector_module="housing.connectors.uk_average_house_price",
            curated_path="curated/observations.csv",
            update_cadence="monthly (UK HPI)",
            raw_evidence=list(evidence),
            notion_registry_url="https://app.notion.com/40d654717685819bb393f7daf628b952",
            transformations=(
                "Filter UK-HPI-full-file CSV to RegionName=United Kingdom. "
                "Map Date (DD/MM/YYYY) to calendar month bounds; value=AveragePrice."
            ),
            caveats=(
                "Latest ~12 months of UK HPI are provisional and revise. "
                "Northern Ireland contributes quarterly within the UK aggregate."
            ),
            revision_notes="Pinned UK-HPI-full-file-2026-08 published 21 Oct 2026.",
        )

    def evidence_from_pinned_raw(self) -> RawEvidence:
        path = self.data_root / PINNED_RAW
        if not path.is_file():
            raise FileNotFoundError(path)
        return RawEvidence(
            path=PINNED_RAW,
            retrieved_at=datetime.now(timezone.utc).isoformat(),
            checksum_sha256=sha256_file(path),
            content_type="text/csv",
            official_release_date=OFFICIAL_RELEASE_DATE,
            source_url=PINNED_URL,
        )

    def transform(self, evidence: Sequence[RawEvidence]) -> list[Observation]:
        if not evidence:
            raise ValueError("transform() requires RawEvidence")
        return parse_uk_hpi_average_price(self.data_root / evidence[0].path)


def main() -> None:
    connector = UkAverageHousePriceConnector()
    evidence = connector.evidence_from_pinned_raw()
    observations = connector.transform([evidence])
    manifest_path, curated_path = connector.write_hand_off([evidence], observations)
    print(f"indicator_id: {connector.indicator_id}")
    print(f"observations: {len(observations)}")
    print(f"last: {observations[-1].period_start}={observations[-1].value}")
    print(f"manifest: {manifest_path}")
    print(f"curated: {curated_path}")


if __name__ == "__main__":
    main()
