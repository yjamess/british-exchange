"""ONS median house price to workplace-based earnings ratio (England).

Approach:
1. Pin the official AFF1 workbook under raw/<date>/.
2. Read Table 1c median affordability ratios for England (E92000001).
3. Emit one annual Observation per year (skip the 5-year average column).
"""

from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path
from typing import Sequence

from openpyxl import load_workbook

from britain_exchange.checksum import sha256_file
from britain_exchange.connector import Connector
from britain_exchange.manifest import Manifest, RawEvidence
from britain_exchange.observation import Observation
from britain_exchange.paths import HOUSING_DATA

PINNED_RAW = "raw/2026-11-03/aff1_ratio_workplace.xlsx"
SOURCE_LANDING = (
    "https://www.ons.gov.uk/peoplepopulationandcommunity/housing/datasets/"
    "ratioofhousepricetoworkplacebasedearningslowerquartileandmedian"
)
PINNED_URL = (
    "https://www.ons.gov.uk/file?uri=/peoplepopulationandcommunity/housing/"
    "datasets/ratioofhousepricetoworkplacebasedearningslowerquartileandmedian/"
    "current/aff1ratioofhousepricetoworkplacebasedearnings.xlsx"
)
OFFICIAL_RELEASE_DATE = "2026-03-26"
SOURCE_VERSION = "AFF1 workplace-based median 2026-03-26"
ENGLAND_CODE = "E92000001"
ENGLAND_LABEL = "England"
UNIT = "ratio (median house price / median workplace earnings)"


def parse_england_median_ratio(workbook: Path) -> list[Observation]:
    wb = load_workbook(workbook, data_only=True, read_only=True)
    try:
        if "1c" not in wb.sheetnames:
            raise ValueError(f"Expected sheet 1c; got {wb.sheetnames}")
        ws = wb["1c"]
        header_row = [cell.value for cell in next(ws.iter_rows(min_row=2, max_row=2))]
        england = None
        for row in ws.iter_rows(min_row=3, values_only=True):
            if row and str(row[0]).strip() == ENGLAND_CODE:
                england = row
                break
        if england is None:
            raise ValueError("England (E92000001) row missing from Table 1c")

        observations: list[Observation] = []
        for idx, header in enumerate(header_row):
            if header is None:
                continue
            text = str(header).strip()
            if not text.isdigit():
                continue
            year = int(text)
            value_raw = england[idx]
            if value_raw is None or value_raw == "":
                continue
            observations.append(
                Observation(
                    indicator_id="house-price-to-earnings-ratio",
                    period_start=f"{year:04d}-01-01",
                    period_end=f"{year:04d}-12-31",
                    geography_code=ENGLAND_CODE,
                    geography_label=ENGLAND_LABEL,
                    value=float(value_raw),
                    unit=UNIT,
                    observation_status="final",
                    source_version=SOURCE_VERSION,
                    notes=(
                        "series=AFF1 Table 1c median workplace-based; "
                        "geography=England only (not UK); "
                        "house prices year ending September"
                    ),
                )
            )
        if not observations:
            raise ValueError("No England median affordability years parsed")
        observations.sort(key=lambda obs: obs.period_start)
        return observations
    finally:
        wb.close()


class HousePriceToEarningsConnector(Connector):
    def __init__(self, data_root: Path | None = None) -> None:
        super().__init__(data_root or (HOUSING_DATA / "house-price-to-earnings-ratio"))

    @property
    def indicator_id(self) -> str:
        return "house-price-to-earnings-ratio"

    def build_manifest(self, evidence: Sequence[RawEvidence]) -> Manifest:
        return Manifest(
            indicator_id=self.indicator_id,
            title="House price to earnings ratio",
            sector="housing-land",
            publisher="ONS",
            source_url=SOURCE_LANDING,
            series_id="AFF1 Table 1c (median workplace-based, England)",
            geography="England (E92000001) — not UK; Wales published separately",
            frequency="annual",
            unit=UNIT,
            definition=(
                "Ratio of median house price (year ending September) to median "
                "gross annual workplace-based full-time earnings (April ASHE) "
                "for England."
            ),
            licence="Open Government Licence v3.0",
            agent_owner="housing",
            connector_module="housing.connectors.house_price_to_earnings",
            curated_path="curated/observations.csv",
            update_cadence="annual (March housing affordability release)",
            raw_evidence=list(evidence),
            notion_registry_url="https://app.notion.com/40d6547176858148bf14f0fe3d88fd62",
            transformations=(
                "Parse AFF1 workbook sheet 1c. Keep England E92000001 median "
                "ratio columns for calendar years only; drop 5-year average."
            ),
            caveats=(
                "England-only. Workplace-based earnings (not residence-based). "
                "House prices are year ending September; earnings are April ASHE."
            ),
            revision_notes="Pinned release 26 March 2026 (Housing affordability 2025).",
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
        return parse_england_median_ratio(self.data_root / evidence[0].path)


def main() -> None:
    connector = HousePriceToEarningsConnector()
    evidence = connector.evidence_from_pinned_raw()
    observations = connector.transform([evidence])
    manifest_path, curated_path = connector.write_hand_off([evidence], observations)
    print(f"indicator_id: {connector.indicator_id}")
    print(f"observations: {len(observations)}")
    print(f"range: {observations[0].period_start} → {observations[-1].period_start}")
    print(f"manifest: {manifest_path}")
    print(f"curated: {curated_path}")


if __name__ == "__main__":
    main()
