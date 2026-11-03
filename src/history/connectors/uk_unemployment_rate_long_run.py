"""UK unemployment rate long-run — BoE millennium A1 / A50.

Approach:
1. Reuse pinned BoE millennium workbook (same raw as millennium GDP).
2. Read A1 Headline series unemployment rate column.
3. Link to Economy unemployment when Ready — do not fork modern LMS pipeline.
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

INDICATOR_ID = "uk-unemployment-rate-long-run"
UK_CODE, UK_LABEL = "K02000001", "United Kingdom"
PINNED = "raw/2026-11-03/a-millennium-of-macroeconomic-data-for-the-uk.xlsx"
# Same physical file may live under millennium-gdp; also accept local copy via symlink/copy.
SOURCE_LANDING = "https://www.bankofengland.co.uk/statistics/research-datasets"
SOURCE_ASSET = (
    "https://www.bankofengland.co.uk/-/media/boe/files/statistics/research-datasets/"
    "a-millennium-of-macroeconomic-data-for-the-uk.xlsx"
)
UNIT = "% unemployment rate"
SOURCE_VERSION = "BoE Millennium macro data v3.1 A1"


def _ensure_local_raw(data_root: Path) -> Path:
    target = data_root / PINNED
    if target.is_file():
        return target
    sibling = (
        HISTORY_DATA
        / "bank-of-england-millennium-gdp"
        / PINNED
    )
    if sibling.is_file():
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(sibling.read_bytes())
        return target
    raise FileNotFoundError(
        f"Missing BoE raw workbook at {target} (and sibling {sibling})"
    )


def parse_a50_unemployment(path: Path) -> list[Observation]:
    """A50 col 9 is unemployment rate (% of workforce), annual from 1855."""
    wb = openpyxl.load_workbook(path, read_only=True, data_only=True)
    try:
        ws = wb["A50. Employment & unemployment"]
        observations: list[Observation] = []
        for row in ws.iter_rows(min_row=6, max_col=11, values_only=True):
            year_raw = row[0]
            if year_raw is None or not str(year_raw).isdigit():
                continue
            value_raw = row[9]
            if value_raw is None or value_raw == "":
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
                    value=float(value_raw),
                    unit=UNIT,
                    observation_status="final",
                    source_version="BoE Millennium macro data v3.1 A50",
                    notes="series=A50 Unemployment rate % of total UK workforce",
                )
            )
        if not observations:
            raise ValueError("No A50 unemployment rate values parsed")
        return observations
    finally:
        wb.close()


class UkUnemploymentRateLongRunConnector(Connector):
    def __init__(self, data_root: Path | None = None) -> None:
        super().__init__(data_root or (HISTORY_DATA / INDICATOR_ID))

    @property
    def indicator_id(self) -> str:
        return INDICATOR_ID

    def build_manifest(self, evidence: Sequence[RawEvidence]) -> Manifest:
        return Manifest(
            indicator_id=self.indicator_id,
            title="UK unemployment rate long-run",
            sector="history-change",
            publisher="Bank of England",
            source_url=SOURCE_LANDING,
            series_id="A50 Employment & unemployment — Unemployment rate",
            geography="United Kingdom (historical composite)",
            frequency="annual",
            unit=UNIT,
            definition=(
                "Long-run UK unemployment rate (% of workforce) from BoE "
                "millennium sheet A50. Historical companion to modern ONS LFS "
                "unemployment — not a fork of the Economy pipeline."
            ),
            licence="Open Government Licence v3.0",
            agent_owner="history",
            connector_module="history.connectors.uk_unemployment_rate_long_run",
            curated_path="curated/observations.csv",
            update_cadence="ad_hoc (research dataset through 2016)",
            raw_evidence=list(evidence),
            notion_registry_url="https://app.notion.com/40d6547176858126a378fbaf1b18f2d4",
            transformations="Parse A50; keep unemployment rate column (share of workforce).",
            caveats=(
                "Definitions change across centuries; see BoE notes. Prefer Economy "
                "LFS series for post-1971 operational use."
            ),
            related_indicator_ids=[],
            revision_notes="Uses same pinned BoE workbook as millennium GDP (link, no Energy/Economy fork).",
        )

    def evidence_from_pinned_raw(self) -> RawEvidence:
        _ensure_local_raw(self.data_root)
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
        return parse_a50_unemployment(self.data_root / evidence[0].path)


def main() -> None:
    connector = UkUnemploymentRateLongRunConnector()
    evidence = connector.evidence_from_pinned_raw()
    observations = connector.transform([evidence])
    connector.write_hand_off([evidence], observations)
    print(f"indicator_id: {connector.indicator_id} rows={len(observations)}")


if __name__ == "__main__":
    main()
