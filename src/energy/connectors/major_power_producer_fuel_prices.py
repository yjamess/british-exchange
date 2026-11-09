"""DESNZ QEP 3.2.1 — fuels purchased by major UK power producers (generator input prices).

Approach (plain language):
1. Pin table_321.xlsx under data/energy/major-power-producer-fuel-prices/raw/.
2. Parse quarterly sheet ``3.2.1`` cash terms — coal / oil / MPP natural gas in p/kWh.
3. These are generator fuel *input* prices, not household bills and not day-ahead power.
4. Write curated CSV + manifest via Connector.write_hand_off.

Best practices:
- pathlib.Path (https://docs.python.org/3/library/pathlib.html)
- type hints (https://docs.python.org/3/library/typing.html)
"""

from __future__ import annotations

import calendar
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Sequence

import openpyxl
from openpyxl.worksheet.worksheet import Worksheet

from britain_exchange.checksum import sha256_file
from britain_exchange.connector import Connector
from britain_exchange.manifest import Manifest, RawEvidence
from britain_exchange.observation import Observation, ObservationStatus
from britain_exchange.paths import ENERGY_DATA

UK_GEOGRAPHY_CODE = "K02000001"
UK_GEOGRAPHY_LABEL = "United Kingdom"

INDICATOR_ID = "major-power-producer-fuel-prices"
SHEET_NAME = "3.2.1"
HEADER_ROW = 11

SOURCE_LANDING_URL = (
    "https://www.gov.uk/government/statistical-data-sets/"
    "prices-of-fuels-purchased-by-major-power-producers"
)
ASSET_URL = (
    "https://assets.publishing.service.gov.uk/media/"
    "6ab54240734e2435f202f060/table_321.xlsx"
)
OFFICIAL_RELEASE_DATE = "2026-09-29"
SOURCE_VERSION = "QEP_3.2.1_SEP_26"
PINNED_RAW = "raw/2026-11-07/table_321.xlsx"

# Column → (measure_id, unit) — p/kWh fuels only (wholesale-adjacent for Prices).
MEASURE_COLUMNS: dict[int, tuple[str, str]] = {
    4: ("coal_p_kwh", "p/kWh"),
    6: ("oil_p_kwh", "p/kWh"),
    7: ("gas_mpp_p_kwh", "p/kWh"),
}

QUARTER_BOUNDS: dict[str, tuple[int, int]] = {
    "Jan to Mar": (1, 3),
    "Apr to Jun": (4, 6),
    "Jul to Sep": (7, 9),
    "Oct to Dec": (10, 12),
}

NOTE_MARKER_RE = re.compile(r"\s*\[note[^\]]*\]", re.IGNORECASE)
MISSING_MARKERS = {"[x]", "[z]", "..", "…", "-", "–"}


def _clean(raw: object) -> str:
    text = str(raw).strip().replace("\n", " ")
    text = NOTE_MARKER_RE.sub("", text)
    return " ".join(text.split())


def _parse_year(raw: object) -> tuple[int | None, ObservationStatus]:
    if raw is None:
        return None, "final"
    if isinstance(raw, (int, float)):
        return int(raw), "final"
    text = str(raw).strip()
    status: ObservationStatus = "provisional" if re.search(r"\bp\b", text, flags=re.I) else "final"
    text = re.sub(r"\s*[rp]\s*$", "", text, flags=re.I).strip()
    try:
        return int(float(text)), status
    except ValueError:
        return None, status


def _parse_num(raw: object) -> float | None:
    if raw is None:
        return None
    if isinstance(raw, (int, float)):
        return float(raw)
    text = str(raw).strip()
    if not text or text.lower() in MISSING_MARKERS:
        return None
    text = re.sub(r"[rp]$", "", text, flags=re.I).strip()
    try:
        return float(text.replace(",", ""))
    except ValueError:
        return None


def _validate_headers(ws: Worksheet) -> None:
    expected = {
        1: "Year",
        2: "Quarter",
        4: "Major power producers: Coal (pence per kWh)",
        6: "Major power producers: Oil (pence per kWh)",
        7: "Major power producers: Natural gas (pence per kWh)",
    }
    for col, exp in expected.items():
        got = _clean(ws.cell(HEADER_ROW, col).value)
        if not got.casefold().startswith(exp.casefold()):
            raise ValueError(f"Unexpected 3.2.1 header col {col}: {got!r} (expected {exp!r})")


def parse_qep321_quarterly(workbook_path: Path) -> list[Observation]:
    wb = openpyxl.load_workbook(workbook_path, data_only=True, read_only=False)
    try:
        if SHEET_NAME not in wb.sheetnames:
            raise ValueError(f"Missing sheet {SHEET_NAME!r}; got {wb.sheetnames}")
        ws = wb[SHEET_NAME]
        _validate_headers(ws)
        observations: list[Observation] = []
        for row_idx in range(HEADER_ROW + 1, (ws.max_row or HEADER_ROW) + 1):
            year, status = _parse_year(ws.cell(row_idx, 1).value)
            if year is None:
                continue
            quarter = _clean(ws.cell(row_idx, 2).value)
            bounds = QUARTER_BOUNDS.get(quarter)
            if bounds is None:
                continue
            start_m, end_m = bounds
            period_start = f"{year:04d}-{start_m:02d}-01"
            last_day = calendar.monthrange(year, end_m)[1]
            period_end = f"{year:04d}-{end_m:02d}-{last_day:02d}"
            for col, (measure, unit) in MEASURE_COLUMNS.items():
                value = _parse_num(ws.cell(row_idx, col).value)
                if value is None:
                    continue
                observations.append(
                    Observation(
                        indicator_id=INDICATOR_ID,
                        period_start=period_start,
                        period_end=period_end,
                        geography_code=UK_GEOGRAPHY_CODE,
                        geography_label=UK_GEOGRAPHY_LABEL,
                        value=round(value, 4),
                        unit=unit,
                        observation_status=status,
                        source_version=SOURCE_VERSION,
                        notes=f"measure={measure}; terms=cash; publisher=DESNZ QEP 3.2.1",
                    )
                )
        if not observations:
            raise ValueError(f"No MPP fuel-price rows from {workbook_path}")
        return observations
    finally:
        wb.close()


class MajorPowerProducerFuelPricesConnector(Connector):
    """DESNZ QEP 3.2.1 generator fuel input prices (wholesale-adjacent)."""

    def __init__(self, data_root: Path | None = None) -> None:
        super().__init__(data_root or (ENERGY_DATA / INDICATOR_ID))

    @property
    def indicator_id(self) -> str:
        return INDICATOR_ID

    def build_manifest(self, evidence: Sequence[RawEvidence]) -> Manifest:
        return Manifest(
            indicator_id=self.indicator_id,
            title="Major power producer fuel prices",
            sector="energy-industry",
            publisher="DESNZ",
            source_url=SOURCE_LANDING_URL,
            series_id="QEP 3.2.1 (cash, quarterly p/kWh — coal, oil, MPP natural gas)",
            geography="United Kingdom (K02000001)",
            frequency="quarterly",
            unit="p/kWh",
            definition=(
                "Average prices of fuels purchased by major UK power producers "
                "(coal, oil, natural gas) in cash terms, pence per kWh, from DESNZ "
                "Quarterly Energy Prices table 3.2.1. Generator fuel *input* prices — "
                "not household retail bills, not Ofgem caps, and not day-ahead wholesale "
                "power exchange prices."
            ),
            licence="Open Government Licence v3.0",
            agent_owner="energy",
            connector_module="energy.connectors.major_power_producer_fuel_prices",
            curated_path="curated/observations.csv",
            update_cadence="Quarterly with QEP non-domestic tables",
            raw_evidence=list(evidence),
            related_indicator_ids=[
                "industrial-electricity-prices",
                "domestic-electricity-bills",
                "ofgem-default-tariff-cap",
            ],
            transformations=(
                "Parse sheet 3.2.1 quarterly cash terms. Emit p/kWh measures only "
                "(coal_p_kwh, oil_p_kwh, gas_mpp_p_kwh). Tonne columns omitted. "
                "UK delivery-point gas series discontinued after Apr 2004 — not curated."
            ),
            caveats=(
                "Long-term generator contracts; not spot wholesale. Excludes CPS levy "
                "on coal/gas. Do not plot on the same unmarked axis as GBP household bills."
            ),
            revision_notes="table_321.xlsx Cover sheet publication date 29/09/2026.",
            open_questions=[],
        )

    def evidence_from_pinned_raw(self, relative: str = PINNED_RAW) -> RawEvidence:
        path = self.data_root / relative
        if not path.is_file():
            raise FileNotFoundError(f"Pinned raw missing: {path}")
        return RawEvidence(
            path=relative,
            retrieved_at=datetime.now(timezone.utc).isoformat(),
            checksum_sha256=sha256_file(path),
            content_type=(
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            ),
            official_release_date=OFFICIAL_RELEASE_DATE,
            http_status=200,
            source_url=ASSET_URL,
        )

    def transform(self, evidence: Sequence[RawEvidence]) -> list[Observation]:
        workbook = self.data_root / evidence[0].path
        return parse_qep321_quarterly(workbook)


def main() -> None:
    connector = MajorPowerProducerFuelPricesConnector()
    evidence = connector.evidence_from_pinned_raw()
    observations = connector.transform([evidence])
    manifest_path, curated_path = connector.write_hand_off([evidence], observations)
    print(f"indicator_id: {INDICATOR_ID}")
    print(f"observations: {len(observations)}")
    print(f"manifest: {manifest_path}")
    print(f"curated: {curated_path}")


if __name__ == "__main__":
    main()
