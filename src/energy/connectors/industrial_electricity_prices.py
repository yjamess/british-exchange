"""DESNZ QEP 3.1.2 — manufacturing industry electricity prices (p/kWh, GB).

Approach (plain language):
1. Prefer the pinned raw XLSX under data/energy/.../raw/ (immutable evidence).
2. Parse sheet 3.1.2 Electricity size-band columns → one Observation per band × quarter.
3. Band label in notes as band=<Label>; geography is Great Britain (survey coverage).
4. Write curated CSV + manifest via Connector.write_hand_off.

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

# Manufacturing QFI covers Great Britain, not Northern Ireland.
GB_GEOGRAPHY_CODE = "K03000001"
GB_GEOGRAPHY_LABEL = "Great Britain"

PINNED_RAW_RELATIVE = "raw/2026-11-03/table_311_314.xlsx"
SOURCE_LANDING_URL = (
    "https://www.gov.uk/government/statistical-data-sets/"
    "prices-of-fuels-purchased-by-manufacturing-industry"
)
PINNED_ASSET_URL = (
    "https://assets.publishing.service.gov.uk/media/"
    "6ab541bf734e2435f202f05e/table_311_314.xlsx"
)
OFFICIAL_RELEASE_DATE = "2026-09-29"
SOURCE_VERSION = "QEP_3.1.1-3.1.4_SEP_26"

SHEET_NAME = "3.1.2"
HEADER_ROW = 6
NOTE_MARKER_RE = re.compile(r"\s*\[note[^\]]*\]", re.IGNORECASE)
QUARTER_RE = re.compile(
    r"^(Jan to Mar|Apr to Jun|Jul to Sep|Oct to Dec)\s*$",
    re.IGNORECASE,
)
QUARTER_TO_NUM = {
    "jan to mar": 1,
    "apr to jun": 2,
    "jul to sep": 3,
    "oct to dec": 4,
}
MISSING_MARKERS = {"[x]", "[z]", "..", "…"}


def _clean_header(raw: object) -> str:
    text = str(raw).strip().replace("\n", " ")
    text = NOTE_MARKER_RE.sub("", text)
    return " ".join(text.split())


def _quarter_bounds(year: int, quarter: int) -> tuple[str, str]:
    start_month = 1 + (quarter - 1) * 3
    end_month = start_month + 2
    start = f"{year:04d}-{start_month:02d}-01"
    end_day = calendar.monthrange(year, end_month)[1]
    end = f"{year:04d}-{end_month:02d}-{end_day:02d}"
    return start, end


def _parse_quarter_label(raw: object) -> int | None:
    if raw is None:
        return None
    text = str(raw).strip()
    # Strip a trailing standalone revision marker (" r" / " p"), not letters
    # inside month names (Mar / Sep). See PEP 8 preference for clear intent:
    # https://peps.python.org/pep-0008/
    text = re.sub(r"\s+[rp]\s*$", "", text, flags=re.IGNORECASE).strip()
    match = QUARTER_RE.match(text)
    if not match:
        return None
    return QUARTER_TO_NUM[match.group(1).casefold()]


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
    # Strip trailing revision marker letters sometimes glued to numbers.
    text = re.sub(r"[rp]$", "", text, flags=re.IGNORECASE).strip()
    try:
        return float(text.replace(",", "")), None
    except ValueError:
        return None, "missing"


def _electricity_band_columns(ws: Worksheet) -> list[tuple[int, str]]:
    """Return (col_idx, band_label) for Electricity size-band columns only."""
    bands: list[tuple[int, str]] = []
    for col in range(1, (ws.max_column or 1) + 1):
        header = _clean_header(ws.cell(HEADER_ROW, col).value)
        if not header.casefold().startswith("electricity:"):
            continue
        # Skip decile/median distribution columns — keep size bands + Average.
        lower = header.casefold()
        if "decile" in lower or "median" in lower:
            continue
        band = header.split(":", 1)[1].strip()
        bands.append((col, band))
    if not bands:
        raise ValueError("No Electricity size-band columns found on sheet 3.1.2")
    if not any(b.casefold() == "average" for _, b in bands):
        raise ValueError(f"Expected Electricity: Average among bands: {bands!r}")
    return bands


def parse_qep312_electricity_p_kwh(workbook_path: Path) -> list[Observation]:
    """Parse QEP 3.1.2 manufacturing electricity prices (p/kWh)."""
    wb = openpyxl.load_workbook(workbook_path, data_only=True, read_only=False)
    try:
        if SHEET_NAME not in wb.sheetnames:
            raise ValueError(
                f"Expected sheet {SHEET_NAME!r} in {workbook_path.name}; "
                f"got {wb.sheetnames}"
            )
        ws: Worksheet = wb[SHEET_NAME]
        year_h = _clean_header(ws.cell(HEADER_ROW, 1).value)
        quarter_h = _clean_header(ws.cell(HEADER_ROW, 2).value)
        if year_h.casefold() != "year" or quarter_h.casefold() != "quarter":
            raise ValueError(
                f"Unexpected 3.1.2 headers: year={year_h!r} quarter={quarter_h!r}"
            )
        bands = _electricity_band_columns(ws)

        observations: list[Observation] = []
        for row_idx in range(HEADER_ROW + 1, (ws.max_row or HEADER_ROW) + 1):
            year_raw = ws.cell(row_idx, 1).value
            if year_raw is None:
                continue
            try:
                year = int(year_raw)
            except (TypeError, ValueError):
                continue
            quarter = _parse_quarter_label(ws.cell(row_idx, 2).value)
            if quarter is None:
                continue
            period_start, period_end = _quarter_bounds(year, quarter)
            # Only treat an explicit trailing " p" token as provisional (not "Sep").
            quarter_text = str(ws.cell(row_idx, 2).value or "")
            row_status: ObservationStatus = (
                "provisional"
                if re.search(r"\s+p\s*$", quarter_text, flags=re.IGNORECASE)
                else "final"
            )

            for col, band in bands:
                value, missing_status = _parse_numeric_cell(ws.cell(row_idx, col).value)
                status: ObservationStatus = missing_status or row_status
                observations.append(
                    Observation(
                        indicator_id="industrial-electricity-prices",
                        period_start=period_start,
                        period_end=period_end,
                        geography_code=GB_GEOGRAPHY_CODE,
                        geography_label=GB_GEOGRAPHY_LABEL,
                        value=value,
                        unit="p/kWh",
                        observation_status=status,
                        source_version=SOURCE_VERSION,
                        notes=f"band={band}; ccl=excluding",
                    )
                )
        if not observations:
            raise ValueError(f"No quarterly electricity price rows from {workbook_path}")
        return observations
    finally:
        wb.close()


class IndustrialElectricityPricesConnector(Connector):
    """DESNZ manufacturing industry electricity prices (QEP 3.1.2)."""

    def __init__(self, data_root: Path | None = None) -> None:
        root = data_root or (ENERGY_DATA / "industrial-electricity-prices")
        super().__init__(root)

    @property
    def indicator_id(self) -> str:
        return "industrial-electricity-prices"

    def build_manifest(self, evidence: Sequence[RawEvidence]) -> Manifest:
        return Manifest(
            indicator_id=self.indicator_id,
            title="Industrial electricity prices",
            sector="energy-industry",
            publisher="DESNZ",
            source_url=SOURCE_LANDING_URL,
            series_id=(
                "QEP 3.1.2 (Average prices of fuels purchased by manufacturing "
                "industry excl. CCL, electricity, p/kWh)"
            ),
            geography="Great Britain (K03000001)",
            frequency="quarterly",
            unit="p/kWh",
            definition=(
                "Average prices of electricity purchased by manufacturing industry "
                "in Great Britain, excluding Climate Change Levy, in pence per "
                "kilowatt hour (p/kWh). From Quarterly Energy Prices table 3.1.2. "
                "One observation per size band × calendar quarter; band in notes as "
                "band=<Label>. Size bands: Small, Medium, Large (+ Extra/Moderately "
                "large splits), Average."
            ),
            licence="Open Government Licence v3.0",
            agent_owner="energy",
            connector_module="energy.connectors.industrial_electricity_prices",
            curated_path="curated/observations.csv",
            update_cadence=(
                "Quarterly — Quarterly Energy Prices manufacturing tables "
                "(provisional ~3 months in arrears; final ~6 months)"
            ),
            raw_evidence=list(evidence),
            notion_registry_url="https://app.notion.com/40d65471768581f9ba3aefefe8eab198",
            transformations=(
                "Parse sheet 3.1.2 Electricity:* columns excluding decile/median. "
                "Long-format: one CSV row per band × quarter. Blank cells → missing. "
                "Geography coded as GB (K03000001). Coal/oil/gas columns not ingested."
            ),
            caveats=(
                "Geography is Great Britain (manufacturing Quarterly Fuels Inquiry), "
                "not UK — Northern Ireland excluded. Prices exclude CCL and VAT. "
                "band=Average is a weighted aggregate — do not stack with size bands. "
                "Distinct from QEP 3.4.1 non-domestic (UK) electricity prices. "
                "GOV.UK asset URLs change each release; pin checksummed raw."
            ),
            revision_notes=(
                "table_311_314.xlsx published with QEP September 2026 "
                "(29 Sep 2026); new provisional data for Q2 2026."
            ),
            open_questions=[
                "Optional: also curate QEP 3.4.1 UK non-domestic electricity Average.",
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
        return parse_qep312_electricity_p_kwh(workbook)


def main() -> None:
    connector = IndustrialElectricityPricesConnector()
    evidence = connector.evidence_from_pinned_raw()
    observations = connector.transform([evidence])
    manifest_path, curated_path = connector.write_hand_off([evidence], observations)
    bands = sorted(
        {
            n.split("band=", 1)[1].split(";", 1)[0]
            for obs in observations
            if (n := obs.notes).startswith("band=")
        }
    )
    print(f"indicator_id: {connector.indicator_id}")
    print(f"raw: {evidence.path} sha256={evidence.checksum_sha256}")
    print(f"observations: {len(observations)}")
    print(f"bands ({len(bands)}): {', '.join(bands)}")
    print(f"manifest: {manifest_path}")
    print(f"curated: {curated_path}")


if __name__ == "__main__":
    main()
