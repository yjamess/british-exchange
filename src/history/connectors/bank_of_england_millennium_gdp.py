"""Bank of England millennium GDP — A8 UK real GDP at market prices.

Approach:
1. Pin BoE 'A millennium of macroeconomic data' workbook (v3.1).
2. Read sheet A8 market-prices CVM £mn column (geographically consistent UK).
3. Link to Economy real-gdp (ABMI) via related_indicator_ids — do not fork ABMI.
"""

from __future__ import annotations

from pathlib import Path
from typing import Sequence

import openpyxl

from britain_exchange.connector import Connector
from britain_exchange.manifest import Manifest, RawEvidence
from britain_exchange.observation import Observation
from britain_exchange.paths import HISTORY_DATA
from history.connectors._util import evidence_from_file, year_bounds

INDICATOR_ID = "bank-of-england-millennium-gdp"
UK_CODE, UK_LABEL = "K02000001", "United Kingdom (historical borders composite)"
PINNED = "raw/2026-11-03/a-millennium-of-macroeconomic-data-for-the-uk.xlsx"
SOURCE_LANDING = "https://www.bankofengland.co.uk/statistics/research-datasets"
SOURCE_ASSET = (
    "https://www.bankofengland.co.uk/-/media/boe/files/statistics/research-datasets/"
    "a-millennium-of-macroeconomic-data-for-the-uk.xlsx"
)
UNIT = "£ million CVM (2013 prices), market prices"
SOURCE_VERSION = "BoE Millennium macro data v3.1 A8"


def parse_a8_market_prices(path: Path) -> list[Observation]:
    wb = openpyxl.load_workbook(path, read_only=True, data_only=True)
    try:
        ws = wb["A8. UK Real GDP(A)"]
        observations: list[Observation] = []
        # Row 5 describes columns; market prices for UK headline is column index 3 (0-based D)
        # From inspection: col0 year, col1 factor cost, col2 basic prices, col3 market prices
        for row in ws.iter_rows(min_row=6, max_col=4, values_only=True):
            year_raw, _fc, _bp, market = row[0], row[1], row[2], row[3]
            if year_raw is None or not str(year_raw).isdigit():
                continue
            if market is None or market == "":
                continue
            year = int(year_raw)
            start, end = year_bounds(year)
            observations.append(
                Observation(
                    indicator_id=INDICATOR_ID,
                    period_start=start,
                    period_end=end,
                    geography_code=UK_CODE,
                    geography_label=UK_LABEL,
                    value=float(market),
                    unit=UNIT,
                    observation_status="final",
                    source_version=SOURCE_VERSION,
                    notes="series=A8 market prices; geographically-consistent UK composite",
                )
            )
        if not observations:
            raise ValueError("No A8 market-price GDP values parsed")
        return observations
    finally:
        wb.close()


class BankOfEnglandMillenniumGdpConnector(Connector):
    def __init__(self, data_root: Path | None = None) -> None:
        super().__init__(data_root or (HISTORY_DATA / INDICATOR_ID))

    @property
    def indicator_id(self) -> str:
        return INDICATOR_ID

    def build_manifest(self, evidence: Sequence[RawEvidence]) -> Manifest:
        return Manifest(
            indicator_id=self.indicator_id,
            title="Bank of England millennium GDP",
            sector="history-change",
            publisher="Bank of England",
            source_url=SOURCE_LANDING,
            series_id="A8 UK Real GDP(A) market prices CVM 2013",
            geography="UK historical composite (GB+NI constant-border construct)",
            frequency="annual",
            unit=UNIT,
            definition=(
                "Long-run UK real GDP at market prices from the Bank of England "
                "millennium of macroeconomic data (sheet A8), chained volume £m "
                "reference 2013. Companion to modern ONS Real GDP (ABMI) — not a "
                "duplicate pipeline."
            ),
            licence="Open Government Licence v3.0",
            agent_owner="history",
            connector_module="history.connectors.bank_of_england_millennium_gdp",
            curated_path="curated/observations.csv",
            update_cadence="ad_hoc (research dataset; last updated through 2016)",
            raw_evidence=list(evidence),
            notion_registry_url="https://app.notion.com/40d6547176858156a350d150bf841936",
            transformations=(
                "Parse A8. UK Real GDP(A); keep market-prices CVM column; annual rows only."
            ),
            caveats=(
                "Ends 2016 in v3.1. Method/geography differ from ONS ABMI quarterly "
                "real-gdp — chart joins need an overlap splice note. Do not overwrite "
                "Economy real-gdp curated files."
            ),
            related_indicator_ids=["real-gdp"],
            revision_notes="Pinned BoE millennium xlsx 2026-11-03.",
        )

    def evidence_from_pinned_raw(self) -> RawEvidence:
        return evidence_from_file(
            self.data_root,
            PINNED,
            source_url=SOURCE_ASSET,
            content_type=(
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            ),
            official_release_date="2017-01-01",
        )

    def transform(self, evidence: Sequence[RawEvidence]) -> list[Observation]:
        if not evidence:
            raise ValueError("transform() requires RawEvidence")
        return parse_a8_market_prices(self.data_root / evidence[0].path)


def main() -> None:
    connector = BankOfEnglandMillenniumGdpConnector()
    evidence = connector.evidence_from_pinned_raw()
    observations = connector.transform([evidence])
    connector.write_hand_off([evidence], observations)
    print(f"indicator_id: {connector.indicator_id} rows={len(observations)}")


if __name__ == "__main__":
    main()
