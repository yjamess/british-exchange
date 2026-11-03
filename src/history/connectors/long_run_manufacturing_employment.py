"""Long-run manufacturing employment — BoE millennium A53 (industry employment).

Prefer linking: uses BoE historical research dataset rather than forking Energy
modern manufacturing employment pipelines.
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

INDICATOR_ID = "long-run-manufacturing-employment"
UK_CODE, UK_LABEL = "K02000001", "United Kingdom / GB historical"
PINNED = "raw/2026-11-03/a-millennium-of-macroeconomic-data-for-the-uk.xlsx"
SOURCE_LANDING = "https://www.bankofengland.co.uk/statistics/research-datasets"
SOURCE_ASSET = (
    "https://www.bankofengland.co.uk/-/media/boe/files/statistics/research-datasets/"
    "a-millennium-of-macroeconomic-data-for-the-uk.xlsx"
)
UNIT = "thousands of workers (see BoE A53 notes)"
SOURCE_VERSION = "BoE Millennium macro data v3.1 A53"


def _ensure_local_raw(data_root: Path) -> Path:
    target = data_root / PINNED
    if target.is_file():
        return target
    sibling = HISTORY_DATA / "bank-of-england-millennium-gdp" / PINNED
    if sibling.is_file():
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(sibling.read_bytes())
        return target
    raise FileNotFoundError(f"Missing BoE raw workbook at {target}")


def parse_a53_manufacturing(path: Path) -> list[Observation]:
    """Manufacturing block starts at col 21; prefer a spliced numeric series nearby."""
    wb = openpyxl.load_workbook(path, read_only=True, data_only=True)
    try:
        ws = wb["A53. Employment by industry"]
        header = next(ws.iter_rows(min_row=6, max_row=6, max_col=45, values_only=True))
        manuf_start = None
        for i, cell in enumerate(header):
            if cell and str(cell).strip().lower() == "manufacturing":
                manuf_start = i
                break
        if manuf_start is None:
            raise ValueError("Manufacturing header not found on A53 row 6")

        # Within manufacturing block (~10 cols), prefer a 'Spliced' column from row 8
        row8 = next(ws.iter_rows(min_row=8, max_row=8, max_col=45, values_only=True))
        manuf_col = None
        for i in range(manuf_start, min(manuf_start + 12, len(row8))):
            if row8[i] and "spliced" in str(row8[i]).lower():
                manuf_col = i
                break
        if manuf_col is None:
            # Fall back to first numeric-friendly column in the block (Working Population)
            manuf_col = manuf_start + 1

        observations: list[Observation] = []
        for row in ws.iter_rows(min_row=9, max_col=manuf_col + 1, values_only=True):
            year_raw = row[0]
            if year_raw is None:
                continue
            year_text = str(year_raw).strip()
            # Skip labelled England-only early benchmarks like '1381 (England)'
            if not year_text.isdigit() and not (
                isinstance(year_raw, (int, float)) and float(year_raw).is_integer()
            ):
                continue
            year = int(float(year_raw))
            if year < 1700 or year > 2100:
                continue
            value_raw = row[manuf_col] if manuf_col < len(row) else None
            if value_raw is None or value_raw == "":
                continue
            try:
                value = float(value_raw)
            except (TypeError, ValueError):
                continue
            start, end = year_bounds(year)
            observations.append(
                Observation(
                    indicator_id=INDICATOR_ID,
                    period_start=start,
                    period_end=end,
                    geography_code=UK_CODE,
                    geography_label=UK_LABEL,
                    value=value,
                    unit=UNIT,
                    observation_status="final",
                    source_version=SOURCE_VERSION,
                    notes=f"series=A53 manufacturing; col={manuf_col}",
                )
            )
        if not observations:
            raise ValueError("No A53 manufacturing employment values parsed")
        return observations
    finally:
        wb.close()


class LongRunManufacturingEmploymentConnector(Connector):
    def __init__(self, data_root: Path | None = None) -> None:
        super().__init__(data_root or (HISTORY_DATA / INDICATOR_ID))

    @property
    def indicator_id(self) -> str:
        return INDICATOR_ID

    def build_manifest(self, evidence: Sequence[RawEvidence]) -> Manifest:
        return Manifest(
            indicator_id=self.indicator_id,
            title="Long-run manufacturing employment",
            sector="history-change",
            publisher="Bank of England",
            source_url=SOURCE_LANDING,
            series_id="A53 Employment by industry — Manufacturing",
            geography="UK / GB historical (see BoE notes)",
            frequency="annual",
            unit=UNIT,
            definition=(
                "Long-run manufacturing employment from BoE millennium dataset "
                "sheet A53. Links conceptually to Energy/Industry modern "
                "manufacturing employment — does not fork that pipeline."
            ),
            licence="Open Government Licence v3.0",
            agent_owner="history",
            connector_module="history.connectors.long_run_manufacturing_employment",
            curated_path="curated/observations.csv",
            update_cadence="ad_hoc (research dataset)",
            raw_evidence=list(evidence),
            notion_registry_url="https://app.notion.com/40d6547176858174966ee75293fc068c",
            transformations="Parse A53; locate Manufacturing column; annual numeric rows.",
            caveats=(
                "Industry definitions shift over time. Prefer Energy modern "
                "manufacturing employment indicator for contemporary levels."
            ),
            related_indicator_ids=[],
            revision_notes="Linked BoE millennium raw (copy if needed); no Energy data/ tree writes.",
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
        return parse_a53_manufacturing(self.data_root / evidence[0].path)


def main() -> None:
    connector = LongRunManufacturingEmploymentConnector()
    evidence = connector.evidence_from_pinned_raw()
    observations = connector.transform([evidence])
    connector.write_hand_off([evidence], observations)
    print(f"indicator_id: {connector.indicator_id} rows={len(observations)}")


if __name__ == "__main__":
    main()
