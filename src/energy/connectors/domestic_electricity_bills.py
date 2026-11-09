"""DESNZ QEP 2.2.1 — average annual domestic standard electricity bills (UK).

Approach (plain language):
1. Download (or reuse pinned) QEP table 2.2.1 XLSX under data/energy/.../raw/.
2. Parse sheet ``2.2.1`` — cash-terms bills at fixed 3,400 kWh/year.
3. One Observation per year × payment method × tariff class; dimensions in notes.
4. Write curated CSV + manifest via Connector.write_hand_off.

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

INDICATOR_ID = "domestic-electricity-bills"
SHEET_NAME = "2.2.1"
HEADER_ROW = 13
CONSUMPTION_KWH = 3400

SOURCE_LANDING_URL = (
    "https://www.gov.uk/government/statistical-data-sets/"
    "annual-domestic-energy-price-statistics"
)
ASSET_URL = (
    "https://assets.publishing.service.gov.uk/media/"
    "6a4245907ac6fd9c6a94aae0/table_221__1_.xlsx"
)
OFFICIAL_RELEASE_DATE = "2026-06-30"
SOURCE_VERSION = "QEP_2.2.1_JUN_26"

# Column index → (payment_method, tariff_class)
COLUMN_DIMENSIONS: dict[int, tuple[str, str]] = {
    2: ("Standard credit", "Fixed"),
    3: ("Standard credit", "Variable"),
    4: ("Standard credit", "All"),
    5: ("Direct debit", "Fixed"),
    6: ("Direct debit", "Variable"),
    7: ("Direct debit", "All"),
    8: ("Prepayment", "Fixed"),
    9: ("Prepayment", "Variable"),
    10: ("Prepayment", "All"),
    11: ("Overall", "Fixed"),
    12: ("Overall", "Variable"),
    13: ("Overall", "All"),
}

EXPECTED_HEADERS: dict[int, str] = {
    1: "Year",
    2: "Standard credit: Fixed tariffs (pounds)",
    3: "Standard credit: Variable tariffs (pounds)",
    4: "Standard credit: All Tariffs (pounds)",
    5: "Direct debit: Fixed tariffs (pounds)",
    6: "Direct debit: Variable tariffs (pounds)",
    7: "Direct debit: All Tariffs (pounds)",
    8: "Prepayment: Fixed tariffs (pounds)",
    9: "Prepayment: Variable tariffs (pounds)",
    10: "Prepayment: All Tariffs (pounds)",
    11: "Overall: Fixed tariffs (pounds)",
    12: "Overall: Variable tariffs (pounds)",
    13: "Overall: All Tariffs (pounds)",
}

NOTE_MARKER_RE = re.compile(r"\s*\[note[^\]]*\]", re.IGNORECASE)
MISSING_MARKERS = {"[x]", "[z]", "..", "…", "-"}


def _clean_header(raw: object) -> str:
    text = str(raw).strip().replace("\n", " ")
    text = NOTE_MARKER_RE.sub("", text)
    return " ".join(text.split())


def _parse_year_cell(raw: object) -> tuple[int | None, ObservationStatus]:
    """Return calendar year and row-level status from Year cell (may carry r/p)."""
    if raw is None:
        return None, "final"
    if isinstance(raw, (int, float)):
        return int(raw), "final"
    text = str(raw).strip()
    status: ObservationStatus = "final"
    if re.search(r"\bp\b", text, flags=re.IGNORECASE):
        status = "provisional"
    # Strip trailing revision/provisional markers before parsing the year.
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
                f"Unexpected 2.2.1 header col {col}: got {got!r}, expected {expected!r}"
            )


def parse_qep221_standard_electricity_bills(workbook_path: Path) -> list[Observation]:
    """Parse QEP 2.2.1 standard electricity bills (GBP/year at 3,400 kWh)."""
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
            period_start = f"{year:04d}-01-01"
            period_end = f"{year:04d}-12-31"

            for col, (payment, tariff) in COLUMN_DIMENSIONS.items():
                value, missing_status = _parse_numeric_cell(
                    ws.cell(row_idx, col).value
                )
                status: ObservationStatus = missing_status or row_status
                # Fixed/Variable are blank for 2014–2021 by design — skip empties
                # rather than flooding curated with structural missing rows.
                if value is None:
                    continue
                observations.append(
                    Observation(
                        indicator_id=INDICATOR_ID,
                        period_start=period_start,
                        period_end=period_end,
                        geography_code=UK_GEOGRAPHY_CODE,
                        geography_label=UK_GEOGRAPHY_LABEL,
                        value=value,
                        unit="GBP",
                        observation_status=status,
                        source_version=SOURCE_VERSION,
                        notes=(
                            f"fuel=Electricity; meter=Standard; "
                            f"payment={payment}; tariff={tariff}; "
                            f"consumption_kwh={CONSUMPTION_KWH}"
                        ),
                    )
                )
        if not observations:
            raise ValueError(f"No domestic electricity bill rows from {workbook_path}")
        return observations
    finally:
        wb.close()


class DomesticElectricityBillsConnector(Connector):
    """DESNZ average annual domestic standard electricity bills (QEP 2.2.1)."""

    def __init__(self, data_root: Path | None = None) -> None:
        root = data_root or (ENERGY_DATA / INDICATOR_ID)
        super().__init__(root)

    @property
    def indicator_id(self) -> str:
        return INDICATOR_ID

    def build_manifest(self, evidence: Sequence[RawEvidence]) -> Manifest:
        return Manifest(
            indicator_id=self.indicator_id,
            title="Domestic electricity bills",
            sector="energy-industry",
            publisher="DESNZ",
            source_url=SOURCE_LANDING_URL,
            series_id=(
                "QEP 2.2.1 (Average annual domestic Standard Electricity bills, "
                "cash terms, 3,400 kWh/year, UK)"
            ),
            geography="United Kingdom (K02000001)",
            frequency="annual",
            unit="GBP",
            definition=(
                "Average annual domestic Standard Electricity bill in cash terms "
                "(pounds) for United Kingdom households, based on a fixed annual "
                "consumption of 3,400 kWh. From DESNZ Quarterly Energy Prices table "
                "2.2.1. One observation per calendar year × payment method "
                "(Standard credit / Direct debit / Prepayment / Overall) × tariff "
                "class (Fixed / Variable / All). Fixed/Variable breakdowns are "
                "official statistics in development and available from 2022."
            ),
            licence="Open Government Licence v3.0",
            agent_owner="energy",
            connector_module="energy.connectors.domestic_electricity_bills",
            curated_path="curated/observations.csv",
            update_cadence=(
                "At least quarterly with QEP domestic tables; calendar-year "
                "finals typically firm up in the March release"
            ),
            raw_evidence=list(evidence),
            notion_registry_url=(
                "https://app.notion.com/411654717685810ca44cff374a0b7d24"
            ),
            related_indicator_ids=["industrial-electricity-prices"],
            transformations=(
                "Parse sheet 2.2.1 only (Standard Electricity, 3,400 kWh). "
                "Long-format: one CSV row per year × payment × tariff with value. "
                "Blank Fixed/Variable cells for 2014–2021 omitted (not published). "
                "Geography coded as UK (K02000001). Economy 7 / financial-year / "
                "historic-consumption sheets not ingested in this indicator."
            ),
            caveats=(
                "Bills use fixed DESNZ consumption assumptions (3,400 kWh from "
                "2024; historic sheets used 3,600 kWh — not mixed into this series). "
                "Not the same as Ofgem Typical Domestic Consumption Values (TDCV). "
                "Incorporates Energy Price Guarantee from Oct 2022 but excludes "
                "Energy Bills Support Scheme £200. Fixed vs Variable tariff split "
                "is official statistics in development. Distinct from industrial "
                "QEP 3.1.2 (p/kWh, GB manufacturing). Do not equate with Ofgem "
                "price-cap levels (unit rates/standing charges, GB regions)."
            ),
            revision_notes=(
                "table_221__1_.xlsx Cover Sheet publication date 30/06/2026 "
                "(QEP June 2026 domestic bills update)."
            ),
            open_questions=[
                "Gate 3: ingest QEP 2.2.1 Economy 7 (4,800 kWh) as related series.",
                "Gate 3: QEP 2.3.1 domestic gas bills by payment type.",
                "Gate 3: Ofgem default tariff cap levels (per-period XLSX models; "
                "no single clean historic CSV on ofgem.gov.uk).",
                "Gate 3: QEP 2.2.4 unit + standing charges for bill dissection.",
            ],
        )

    def fetch_latest(self, *, retrieved_date: str | None = None) -> RawEvidence:
        """Download current GOV.UK asset into dated raw/ and return evidence."""
        day = retrieved_date or datetime.now(timezone.utc).date().isoformat()
        relative = f"raw/{day}/table_221.xlsx"
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
        return parse_qep221_standard_electricity_bills(workbook)


def main() -> None:
    connector = DomesticElectricityBillsConnector()
    evidence = connector.fetch_latest()
    observations = connector.transform([evidence])
    manifest_path, curated_path = connector.write_hand_off([evidence], observations)
    payments = sorted(
        {
            n.split("payment=", 1)[1].split(";", 1)[0]
            for obs in observations
            if "payment=" in (n := obs.notes)
        }
    )
    years = sorted({obs.period_start[:4] for obs in observations})
    print(f"indicator_id: {connector.indicator_id}")
    print(f"raw: {evidence.path} sha256={evidence.checksum_sha256}")
    print(f"observations: {len(observations)}")
    print(f"years: {years[0]}–{years[-1]} ({len(years)} years)")
    print(f"payments: {', '.join(payments)}")
    print(f"manifest: {manifest_path}")
    print(f"curated: {curated_path}")


if __name__ == "__main__":
    main()
