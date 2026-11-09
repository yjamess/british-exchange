"""DESNZ QEP 2.3.4 — domestic gas unit rates and fixed costs.

Approach (plain language):
1. Download (or reuse pinned) QEP table 2.3.4 XLSX under data/energy/.../raw/.
2. Parse sheet ``2.3.4`` (calendar-year gas) only — not the financial-year twin.
3. One Observation per year × region × payment × measure (unit_price | fixed_cost).
4. Write curated CSV + manifest via Connector.write_hand_off.

Formula (publisher): reconstructed bill ≈ fixed_cost + (unit_price × kWh).
Fixed cost already bundles standing charge and the first-block premium.

Twin of ``domestic_electricity_unit_standing`` (QEP 2.2.4). Do not mix with
electricity 3,400 kWh assumptions — gas uses 11,200 kWh on Dissected Bill.

Best practices:
- pathlib.Path (https://docs.python.org/3/library/pathlib.html)
- type hints (https://docs.python.org/3/library/typing.html)
- Fail loudly on missing sheets / unexpected headers; never invent numbers.
"""

from __future__ import annotations

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

INDICATOR_ID = "domestic-gas-unit-standing"
SHEET_NAME = "2.3.4"
HEADER_ROW = 7

SOURCE_LANDING_URL = (
    "https://www.gov.uk/government/statistical-data-sets/"
    "annual-domestic-energy-price-statistics"
)
ASSET_URL = (
    "https://assets.publishing.service.gov.uk/media/"
    "6a424620b9f58f0eb4c13f1b/table_234__1_.xlsx"
)
OFFICIAL_RELEASE_DATE = "2026-06-30"
SOURCE_VERSION = "QEP_2.3.4_JUN_26"

# Credit in 2.3.4 ≡ Standard credit on bill tables.
COLUMN_DIMENSIONS: dict[int, tuple[str, str]] = {
    4: ("Standard credit", "unit_price"),
    5: ("Standard credit", "fixed_cost"),
    6: ("Direct debit", "unit_price"),
    7: ("Direct debit", "fixed_cost"),
    8: ("Prepayment", "unit_price"),
    9: ("Prepayment", "fixed_cost"),
    10: ("Overall", "unit_price"),
    11: ("Overall", "fixed_cost"),
}

EXPECTED_HEADERS: dict[int, str] = {
    1: "Year",
    2: "Region",
    3: "LDZ area",
    4: "Credit: Average variable unit price (£/kWh)",
    5: "Credit: Average fixed cost (£/year)",
    6: "Direct debit: Average variable unit price (£/kWh)",
    7: "Direct debit: Average fixed cost (£/year)",
    8: "Prepayment: Average variable unit price (£/kWh)",
    9: "Prepayment: Average fixed cost (£/year)",
    10: "Overall: Average variable unit price (£/kWh)",
    11: "Overall: Average fixed cost (£/year)",
}

NOTE_MARKER_RE = re.compile(r"\s*\[note[^\]]*\]", re.IGNORECASE)
MISSING_MARKERS = {"[x]", "[z]", "..", "…", "-"}


def _clean_header(raw: object) -> str:
    text = str(raw).strip().replace("\n", " ")
    text = NOTE_MARKER_RE.sub("", text)
    return " ".join(text.split())


def _parse_year_cell(raw: object) -> tuple[int | None, ObservationStatus]:
    if raw is None:
        return None, "final"
    if isinstance(raw, (int, float)):
        return int(raw), "final"
    text = str(raw).strip()
    status: ObservationStatus = "final"
    if re.search(r"\bp\b", text, flags=re.IGNORECASE):
        status = "provisional"
    text = re.sub(r"\s*[rp]\s*$", "", text, flags=re.IGNORECASE).strip()
    text = re.sub(r"[rp]$", "", text, flags=re.IGNORECASE).strip()
    try:
        return int(float(text)), status
    except ValueError:
        return None, status


def _parse_numeric_cell(
    raw: object,
) -> tuple[float | None, ObservationStatus | None]:
    if raw is None:
        return None, "missing"
    if isinstance(raw, (int, float)):
        return float(raw), None
    text = str(raw).strip()
    if not text or text.lower() in MISSING_MARKERS:
        return None, "missing"
    text = re.sub(r"[rp]$", "", text, flags=re.IGNORECASE).strip()
    try:
        return float(text.replace(",", "")), None
    except ValueError:
        return None, "missing"


def _validate_headers(ws: Worksheet) -> None:
    for col, expected in EXPECTED_HEADERS.items():
        got = _clean_header(ws.cell(HEADER_ROW, col).value)
        if got.casefold() != expected.casefold():
            raise ValueError(
                f"Unexpected 2.3.4 header col {col}: got {got!r}, expected {expected!r}"
            )


def parse_qep234_gas(workbook_path: Path) -> list[Observation]:
    """Parse QEP 2.3.4 calendar-year gas unit + fixed costs."""
    wb = openpyxl.load_workbook(workbook_path, data_only=True, read_only=False)
    try:
        if SHEET_NAME not in wb.sheetnames:
            raise ValueError(
                f"Expected sheet {SHEET_NAME!r} in {workbook_path.name}; "
                f"got {wb.sheetnames}"
            )
        ws: Worksheet = wb[SHEET_NAME]
        _validate_headers(ws)

        observations: list[Observation] = []
        for row_idx in range(HEADER_ROW + 1, (ws.max_row or HEADER_ROW) + 1):
            year, row_status = _parse_year_cell(ws.cell(row_idx, 1).value)
            if year is None:
                continue
            region = str(ws.cell(row_idx, 2).value or "").strip()
            ldz = str(ws.cell(row_idx, 3).value or "").strip()
            if not region:
                continue
            period_start = f"{year:04d}-01-01"
            period_end = f"{year:04d}-12-31"

            for col, (payment, measure) in COLUMN_DIMENSIONS.items():
                value, missing_status = _parse_numeric_cell(
                    ws.cell(row_idx, col).value
                )
                if value is None:
                    continue
                status: ObservationStatus = missing_status or row_status
                unit = "GBP_per_kWh" if measure == "unit_price" else "GBP_per_year"
                observations.append(
                    Observation(
                        indicator_id=INDICATOR_ID,
                        period_start=period_start,
                        period_end=period_end,
                        geography_code=UK_GEOGRAPHY_CODE,
                        geography_label=UK_GEOGRAPHY_LABEL,
                        value=value,
                        unit=unit,
                        observation_status=status,
                        source_version=SOURCE_VERSION,
                        notes=(
                            f"fuel=Gas; payment={payment}; measure={measure}; "
                            f"region={region}; ldz={ldz}"
                        ),
                    )
                )
        if not observations:
            raise ValueError(f"No observations parsed from {workbook_path}")
        return observations
    finally:
        wb.close()


class DomesticGasUnitStandingConnector(Connector):
    """DESNZ QEP 2.3.4 unit rates and fixed costs (domestic gas)."""

    def __init__(self, data_root: Path | None = None) -> None:
        root = data_root or (ENERGY_DATA / INDICATOR_ID)
        super().__init__(root)

    @property
    def indicator_id(self) -> str:
        return INDICATOR_ID

    def build_manifest(self, evidence: Sequence[RawEvidence]) -> Manifest:
        return Manifest(
            indicator_id=self.indicator_id,
            title="Domestic gas unit rates and standing charges",
            sector="energy-industry",
            publisher="DESNZ",
            source_url=SOURCE_LANDING_URL,
            series_id=(
                "QEP 2.3.4 (Average variable unit costs and fixed costs, "
                "gas, UK regions, calendar year)"
            ),
            geography=(
                "United Kingdom (K02000001); LDZ / PES-aligned regions in notes"
            ),
            frequency="annual",
            unit="GBP_per_kWh (unit_price) or GBP_per_year (fixed_cost)",
            definition=(
                "Average variable unit price (£/kWh) and average fixed cost (£/year) "
                "for UK domestic gas by region and payment method. Fixed cost includes "
                "standing charge and the first-block premium (unit1−unit2)×split. "
                "Official statistics in development. Reconstruct: fixed_cost + unit_price × kWh "
                "(Dissected Bill uses 11,200 kWh)."
            ),
            licence="Open Government Licence v3.0",
            agent_owner="energy",
            connector_module="energy.connectors.domestic_gas_unit_standing",
            curated_path="curated/observations.csv",
            update_cadence="At least quarterly with QEP domestic tables",
            raw_evidence=list(evidence),
            related_indicator_ids=[
                "domestic-gas-bills",
                "domestic-electricity-unit-standing",
                "domestic-electricity-bills",
            ],
            transformations=(
                "Parse sheet 2.3.4 only (calendar-year gas). Long-format: year × region × "
                "payment × measure. Credit→Standard credit. Financial-year sheet not ingested. "
                "Geography code fixed to UK; region and LDZ live in notes."
            ),
            caveats=(
                "Official statistics in development. Not suitable for consumption below "
                "the modal gas split (~2,680 kWh). Weighted quarterly average — not a live "
                "spot tariff. Do not treat as Ofgem price-cap levels. Do not mix with "
                "electricity 3,400 kWh Dissected Bill layers."
            ),
            revision_notes=(
                f"table_234__1_.xlsx Cover Sheet publication date {OFFICIAL_RELEASE_DATE} "
                "(QEP June 2026)."
            ),
            open_questions=[
                "Ingest financial-year 2.3.4 twin as a sibling indicator?",
                "When to promote regional LDZ/PES cuts into Regional Price Anatomy UI?",
            ],
        )

    def fetch_latest(self, *, retrieved_date: str | None = None) -> RawEvidence:
        day = retrieved_date or datetime.now(timezone.utc).date().isoformat()
        relative = f"raw/{day}/table_234.xlsx"
        result = self.fetch_url(
            ASSET_URL,
            relative,
            official_release_date=OFFICIAL_RELEASE_DATE,
        )
        return result.evidence

    def evidence_from_pinned_raw(self, relative: str) -> RawEvidence:
        path = self.data_root / relative
        if not path.is_file():
            raise FileNotFoundError(
                f"Pinned raw workbook missing: {path}. Re-run fetch or restore pin."
            )
        return RawEvidence(
            path=relative,
            retrieved_at=datetime.now(timezone.utc).isoformat(),
            checksum_sha256=sha256_file(path),
            content_type=(
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            ),
            official_release_date=OFFICIAL_RELEASE_DATE,
            http_status=None,
            source_url=ASSET_URL,
        )

    def transform(self, evidence: Sequence[RawEvidence]) -> list[Observation]:
        if not evidence:
            raise ValueError("transform() requires at least one RawEvidence entry")
        workbook = self.data_root / evidence[0].path
        if not workbook.is_file():
            raise FileNotFoundError(f"Raw workbook not found: {workbook}")
        return parse_qep234_gas(workbook)


def main() -> None:
    connector = DomesticGasUnitStandingConnector()
    pinned = "raw/2026-11-07/table_234.xlsx"
    if (connector.data_root / pinned).is_file():
        evidence = connector.evidence_from_pinned_raw(pinned)
    else:
        evidence = connector.fetch_latest()
    observations = connector.transform([evidence])
    manifest_path, curated_path = connector.write_hand_off([evidence], observations)
    uk = [
        o
        for o in observations
        if "region=United Kingdom" in (o.notes or "") and "payment=Overall" in (o.notes or "")
    ]
    print(f"indicator_id: {connector.indicator_id}")
    print(f"raw: {evidence.path} sha256={evidence.checksum_sha256}")
    print(f"observations: {len(observations)}")
    print(f"UK Overall cuts: {len(uk)}")
    print(f"manifest: {manifest_path}")
    print(f"curated: {curated_path}")


if __name__ == "__main__":
    main()
