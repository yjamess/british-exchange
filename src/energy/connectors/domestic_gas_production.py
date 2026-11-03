"""DESNZ Energy Trends ET 4.2 — UK indigenous (gross) natural gas production (GWh).

Approach (plain language):
1. Prefer the pinned raw XLSX under data/energy/.../raw/ (immutable evidence).
2. Parse Month (GWh) sheet: one Observation per calendar month from Gross production.
3. Write curated CSV + manifest via Connector.write_hand_off.

Best practices:
- pathlib.Path (https://docs.python.org/3/library/pathlib.html)
- type hints (https://docs.python.org/3/library/typing.html)
- Fail loudly on missing sheets / unexpected headers; never invent numbers.
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

PINNED_RAW_RELATIVE = "raw/2026-11-03/ET_4.2_OCT_26.xlsx"
SOURCE_LANDING_URL = (
    "https://www.gov.uk/government/statistics/gas-section-4-energy-trends"
)
PINNED_ASSET_URL = (
    "https://assets.publishing.service.gov.uk/media/"
    "6ae0cb29779378370fd80a69/ET_4.2_OCT_26.xlsx"
)
OFFICIAL_RELEASE_DATE = "2026-10-29"
SOURCE_VERSION = "ET_4.2_OCT_26"

MONTH_SHEET = "Month (GWh)"
HEADER_ROW = 8  # Month | Gross production | ...
GROSS_PRODUCTION_COL = 2
MONTH_RE = re.compile(
    r"^(?:\[([^\]]+)\]\s*)?"
    r"(January|February|March|April|May|June|July|August|September|"
    r"October|November|December)\s+(\d{4})\s*$",
    re.IGNORECASE,
)
MISSING_MARKERS = {"[x]", "[z]", "..", "…"}

MONTH_NAME_TO_NUM = {
    name.lower(): idx
    for idx, name in enumerate(calendar.month_name)
    if name
}


def _month_bounds(year: int, month: int) -> tuple[str, str]:
    last = calendar.monthrange(year, month)[1]
    return f"{year:04d}-{month:02d}-01", f"{year:04d}-{month:02d}-{last:02d}"


def _parse_month_label(raw: object) -> tuple[str, str, ObservationStatus] | None:
    if raw is None:
        return None
    text = str(raw).strip()
    match = MONTH_RE.match(text)
    if not match:
        return None
    flag = (match.group(1) or "").strip().lower()
    month = MONTH_NAME_TO_NUM[match.group(2).lower()]
    year = int(match.group(3))
    start, end = _month_bounds(year, month)
    status: ObservationStatus = "provisional" if "provisional" in flag else "final"
    return start, end, status


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
    try:
        return float(text.replace(",", "")), None
    except ValueError:
        return None, "missing"


def _assert_gross_production_header(ws: Worksheet) -> None:
    header = str(ws.cell(HEADER_ROW, GROSS_PRODUCTION_COL).value or "")
    if "gross production" not in header.casefold():
        raise ValueError(
            f"Expected Gross production in col {GROSS_PRODUCTION_COL} "
            f"row {HEADER_ROW}; got {header!r}"
        )
    month_header = str(ws.cell(HEADER_ROW, 1).value or "").strip()
    if month_header.casefold() != "month":
        raise ValueError(f"Expected Month header; got {month_header!r}")


def parse_et42_month_gross_production_gwh(workbook_path: Path) -> list[Observation]:
    """Parse Month (GWh) Gross production → monthly UK observations."""
    wb = openpyxl.load_workbook(workbook_path, data_only=True, read_only=False)
    try:
        if MONTH_SHEET not in wb.sheetnames:
            raise ValueError(
                f"Expected sheet {MONTH_SHEET!r} in {workbook_path.name}; "
                f"got {wb.sheetnames}"
            )
        ws: Worksheet = wb[MONTH_SHEET]
        _assert_gross_production_header(ws)

        observations: list[Observation] = []
        for row_idx in range(HEADER_ROW + 1, (ws.max_row or HEADER_ROW) + 1):
            period = _parse_month_label(ws.cell(row_idx, 1).value)
            if period is None:
                continue
            period_start, period_end, row_status = period
            value, missing_status = _parse_numeric_cell(
                ws.cell(row_idx, GROSS_PRODUCTION_COL).value
            )
            status: ObservationStatus = missing_status or row_status
            observations.append(
                Observation(
                    indicator_id="domestic-gas-production",
                    period_start=period_start,
                    period_end=period_end,
                    geography_code=UK_GEOGRAPHY_CODE,
                    geography_label=UK_GEOGRAPHY_LABEL,
                    value=value,
                    unit="GWh",
                    observation_status=status,
                    source_version=SOURCE_VERSION,
                    notes="measure=gross_production",
                )
            )
        if not observations:
            raise ValueError(f"No monthly rows parsed from {workbook_path}")
        return observations
    finally:
        wb.close()


class DomesticGasProductionConnector(Connector):
    """DESNZ UK indigenous (gross) natural gas production (ET 4.2)."""

    def __init__(self, data_root: Path | None = None) -> None:
        root = data_root or (ENERGY_DATA / "domestic-gas-production")
        super().__init__(root)

    @property
    def indicator_id(self) -> str:
        return "domestic-gas-production"

    def build_manifest(self, evidence: Sequence[RawEvidence]) -> Manifest:
        return Manifest(
            indicator_id=self.indicator_id,
            title="Domestic gas production",
            sector="energy-industry",
            publisher="DESNZ",
            source_url=SOURCE_LANDING_URL,
            series_id="ET 4.2 (Gross production / indigenous production, GWh)",
            geography="UK (K02000001)",
            frequency="monthly",
            unit="GWh",
            definition=(
                "UK indigenous (gross) natural gas production in gigawatt hours "
                "(GWh) from Energy Trends table ET 4.2 Month (GWh) sheet, "
                "Gross production column. Gross production includes gas used by "
                "gas producers (Note 1). One observation per calendar month."
            ),
            licence="Open Government Licence v3.0",
            agent_owner="energy",
            connector_module="energy.connectors.domestic_gas_production",
            curated_path="curated/observations.csv",
            update_cadence=(
                "Monthly — Energy Trends ET 4.2, last Thursday of each month "
                "(data two months in arrears)"
            ),
            raw_evidence=list(evidence),
            notion_registry_url="https://app.notion.com/40d65471768581f78387e9f7006eabd4",
            transformations=(
                "Parse Month (GWh)!Gross production. Long-format: one CSV row per "
                "month. Labels like '[provisional] August 2026' → "
                "observation_status=provisional. Map [x] → value null + missing. "
                "mcm sheets and demand columns not ingested."
            ),
            caveats=(
                "Official Statistics in Development (ET 4.2). Unit is GWh (not Mtoe). "
                "Distinct from primary-energy-production Natural gas (Mtoe, ET 1.1). "
                "Gross production includes producers' own use. GOV.UK asset URLs "
                "change each release; pin checksummed raw snapshots."
            ),
            revision_notes=(
                "ET_4.2_OCT_26 published 29 Oct 2026; data through August 2026 "
                "(provisional); revisions period July 2026 per cover sheet."
            ),
            open_questions=[
                "Optional: also curate mcm Gross production for volume charts.",
            ],
        )

    def evidence_from_pinned_raw(self) -> RawEvidence:
        relative = PINNED_RAW_RELATIVE
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
            source_url=PINNED_ASSET_URL,
        )

    def transform(self, evidence: Sequence[RawEvidence]) -> list[Observation]:
        if not evidence:
            raise ValueError("transform() requires at least one RawEvidence entry")
        workbook = self.data_root / evidence[0].path
        if not workbook.is_file():
            raise FileNotFoundError(f"Raw workbook not found: {workbook}")
        return parse_et42_month_gross_production_gwh(workbook)


def main() -> None:
    connector = DomesticGasProductionConnector()
    evidence = connector.evidence_from_pinned_raw()
    observations = connector.transform([evidence])
    manifest_path, curated_path = connector.write_hand_off([evidence], observations)
    print(f"indicator_id: {connector.indicator_id}")
    print(f"raw: {evidence.path} sha256={evidence.checksum_sha256}")
    print(f"observations: {len(observations)}")
    print(f"manifest: {manifest_path}")
    print(f"curated: {curated_path}")


if __name__ == "__main__":
    main()
