"""DESNZ Energy Trends ET 1.3 — UK energy Imports and Exports (ktoe).

Approach (plain language):
1. Prefer the pinned raw XLSX under data/energy/.../raw/ (immutable evidence).
2. Parse 'Quarter supply and use of fuels': one Observation per flow × quarter.
3. Put flow=Imports or flow=Exports in notes; keep DESNZ signed export values.
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

UK_GEOGRAPHY_CODE = "K02000001"
UK_GEOGRAPHY_LABEL = "United Kingdom"

PINNED_RAW_RELATIVE = "raw/2026-11-03/ET_1.3_SEP_26.xlsx"
SOURCE_LANDING_URL = (
    "https://www.gov.uk/government/statistics/total-energy-section-1-energy-trends"
)
PINNED_ASSET_URL = (
    "https://assets.publishing.service.gov.uk/media/"
    "6abe1eb626660e5f62a7f1d3/ET_1.3_SEP_26.xlsx"
)
OFFICIAL_RELEASE_DATE = "2026-09-29"
SOURCE_VERSION = "ET_1.3_SEP_26"

QUARTER_SHEET = "Quarter supply and use of fuels"
HEADER_ROW = 5  # Quarter | Indigenous production | Imports | Exports | ...
FLOW_COLUMNS: tuple[tuple[int, str], ...] = (
    (3, "Imports"),
    (4, "Exports"),
)
QUARTER_RE = re.compile(
    r"^Quarter\s+([1-4])\s+(\d{4})(?:\s*\[([^\]]+)\])?\s*$",
    re.IGNORECASE,
)
MISSING_MARKERS = {"[x]", "[z]", "..", "…"}


def _quarter_bounds(year: int, quarter: int) -> tuple[str, str]:
    start_month = 1 + (quarter - 1) * 3
    end_month = start_month + 2
    start = f"{year:04d}-{start_month:02d}-01"
    end_day = calendar.monthrange(year, end_month)[1]
    end = f"{year:04d}-{end_month:02d}-{end_day:02d}"
    return start, end


def _parse_quarter_label(raw: object) -> tuple[str, str, ObservationStatus] | None:
    if raw is None:
        return None
    text = str(raw).strip()
    match = QUARTER_RE.match(text)
    if not match:
        return None
    quarter = int(match.group(1))
    year = int(match.group(2))
    flag = (match.group(3) or "").strip().lower()
    start, end = _quarter_bounds(year, quarter)
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


def _assert_trade_headers(ws: Worksheet) -> None:
    headers = {
        col: str(ws.cell(HEADER_ROW, col).value or "").strip()
        for col, _ in FLOW_COLUMNS
    }
    for col, expected in FLOW_COLUMNS:
        if headers[col].casefold() != expected.casefold():
            raise ValueError(
                f"Expected header {expected!r} at col {col}; got {headers[col]!r}"
            )
    quarter_header = str(ws.cell(HEADER_ROW, 1).value or "").strip()
    if quarter_header.casefold() != "quarter":
        raise ValueError(f"Expected Quarter header; got {quarter_header!r}")


def parse_et13_quarter_trade_ktoe(workbook_path: Path) -> list[Observation]:
    """Parse quarterly Imports/Exports (ktoe) from ET 1.3."""
    wb = openpyxl.load_workbook(workbook_path, data_only=True, read_only=False)
    try:
        if QUARTER_SHEET not in wb.sheetnames:
            raise ValueError(
                f"Expected sheet {QUARTER_SHEET!r} in {workbook_path.name}; "
                f"got {wb.sheetnames}"
            )
        ws: Worksheet = wb[QUARTER_SHEET]
        _assert_trade_headers(ws)

        observations: list[Observation] = []
        for row_idx in range(HEADER_ROW + 1, (ws.max_row or HEADER_ROW) + 1):
            period = _parse_quarter_label(ws.cell(row_idx, 1).value)
            if period is None:
                continue
            period_start, period_end, row_status = period
            for col, flow in FLOW_COLUMNS:
                value, missing_status = _parse_numeric_cell(ws.cell(row_idx, col).value)
                status: ObservationStatus = missing_status or row_status
                observations.append(
                    Observation(
                        indicator_id="energy-imports-and-exports",
                        period_start=period_start,
                        period_end=period_end,
                        geography_code=UK_GEOGRAPHY_CODE,
                        geography_label=UK_GEOGRAPHY_LABEL,
                        value=value,
                        unit="ktoe",
                        observation_status=status,
                        source_version=SOURCE_VERSION,
                        notes=f"flow={flow}",
                    )
                )
        if not observations:
            raise ValueError(f"No quarterly trade rows parsed from {workbook_path}")
        return observations
    finally:
        wb.close()


class EnergyImportsAndExportsConnector(Connector):
    """DESNZ UK energy Imports and Exports (ET 1.3)."""

    def __init__(self, data_root: Path | None = None) -> None:
        root = data_root or (ENERGY_DATA / "energy-imports-and-exports")
        super().__init__(root)

    @property
    def indicator_id(self) -> str:
        return "energy-imports-and-exports"

    def build_manifest(self, evidence: Sequence[RawEvidence]) -> Manifest:
        return Manifest(
            indicator_id=self.indicator_id,
            title="Energy imports and exports",
            sector="energy-industry",
            publisher="DESNZ",
            source_url=SOURCE_LANDING_URL,
            series_id="ET 1.3 (Imports and Exports, ktoe, quarterly)",
            geography="UK (K02000001)",
            frequency="quarterly",
            unit="ktoe",
            definition=(
                "UK aggregate energy Imports and Exports in thousand tonnes of oil "
                "equivalent (ktoe) from Energy Trends table ET 1.3 sheet "
                "'Quarter supply and use of fuels'. One observation per flow × "
                "calendar quarter; flow label in notes as flow=Imports|Exports. "
                "Exports retain DESNZ commodity-balance sign (typically negative)."
            ),
            licence="Open Government Licence v3.0",
            agent_owner="energy",
            connector_module="energy.connectors.energy_imports_and_exports",
            curated_path="curated/observations.csv",
            update_cadence=(
                "Quarterly — Energy Trends ET 1.3, last Thursday of Mar/Jun/Sep/Dec "
                "(data one quarter in arrears)"
            ),
            raw_evidence=list(evidence),
            notion_registry_url="https://app.notion.com/40d6547176858157b47ad6027387bc4e",
            transformations=(
                "Parse Quarter supply and use of fuels!Imports and Exports columns. "
                "Long-format: one CSV row per flow × quarter. Preserve signed export "
                "values from the source balance. Map [x] → missing. Annual and "
                "by-fuel sheets not ingested in this hand-off."
            ),
            caveats=(
                "Unit is ktoe (not Mtoe). Exports are negative in DESNZ balance "
                "convention — do not absolute them without documenting. Aggregate "
                "all-fuels total only (not by fuel). Distinct from gas-only ET 4.3/4.4 "
                "and DUKES G.1 foreign trade. GOV.UK asset URLs change each release."
            ),
            revision_notes=(
                "ET_1.3_SEP_26 published 29 Sep 2026; revisions period Q1 2026 "
                "per cover sheet."
            ),
            open_questions=[
                "Optional: by-fuel Imports/Exports from Table 1.3b quarterly by fuel.",
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
        return parse_et13_quarter_trade_ktoe(workbook)


def main() -> None:
    connector = EnergyImportsAndExportsConnector()
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
