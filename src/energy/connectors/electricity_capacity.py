"""DESNZ DUKES 5.12.C — UK plant installed capacity by generator type (MW).

Approach (plain language):
1. Prefer the pinned raw XLSX under data/energy/.../raw/ (immutable evidence).
2. Parse sheet ``5.12`` table **5.12.C** (UK total by connection).
3. For each generator type × year, sum Transmission + Distribution MW.
4. Skip aggregate ``Total`` rows. Put the fuel in notes as ``fuel=<Label>``.
5. Write curated CSV + manifest via Connector.write_hand_off.

This is **installed** (nameplate) capacity, not DUKES 5.7 de-rated capacity.

Best practices:
- pathlib.Path (https://docs.python.org/3/library/pathlib.html)
- type hints (https://docs.python.org/3/library/typing.html)
- Fail loudly on missing tables; never invent numbers.
"""

from __future__ import annotations

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

PINNED_RAW_RELATIVE = "raw/2026-11-06/DUKES_5.12.xlsx"
SOURCE_LANDING_URL = (
    "https://www.gov.uk/government/statistics/"
    "electricity-chapter-5-digest-of-united-kingdom-energy-statistics-dukes"
)
PINNED_ASSET_URL = (
    "https://assets.publishing.service.gov.uk/media/"
    "6a6a3668862aaf18d9c629ed/DUKES_5.12.xlsx"
)
OFFICIAL_RELEASE_DATE = "2026-07-30"
SOURCE_VERSION = "DUKES_5.12_2026"
SHEET_NAME = "5.12"
TABLE_MARKER = "Table 5.12.C"
AGGREGATE_FUELS = {"Total [note 3]", "Total"}


def _year_bounds(year: int) -> tuple[str, str]:
    return f"{year:04d}-01-01", f"{year:04d}-12-31"


def _is_year(cell: object) -> int | None:
    if isinstance(cell, int) and 1900 <= cell <= 2100:
        return cell
    if isinstance(cell, float) and cell.is_integer() and 1900 <= int(cell) <= 2100:
        return int(cell)
    if isinstance(cell, str) and cell.strip().isdigit():
        y = int(cell.strip())
        if 1900 <= y <= 2100:
            return y
    return None


def _clean_fuel(raw: object) -> str:
    return str(raw).strip()


def parse_dukes_512c_uk_installed_mw(workbook_path: Path) -> list[Observation]:
    """Parse Table 5.12.C: UK installed capacity MW by fuel (Tx + Dx summed)."""
    wb = openpyxl.load_workbook(workbook_path, data_only=True, read_only=True)
    try:
        if SHEET_NAME not in wb.sheetnames:
            raise ValueError(f"Expected sheet {SHEET_NAME!r} in {workbook_path.name}")
        ws: Worksheet = wb[SHEET_NAME]
        rows = list(ws.iter_rows(values_only=True))
    finally:
        wb.close()

    start = None
    for i, row in enumerate(rows):
        first = row[0] if row else None
        if isinstance(first, str) and TABLE_MARKER in first:
            start = i
            break
    if start is None:
        raise ValueError(f"{TABLE_MARKER} not found in {workbook_path.name}")

    header_idx = None
    years: list[int] = []
    year_cols: list[int] = []
    for i in range(start + 1, min(start + 6, len(rows))):
        row = rows[i]
        if not row:
            continue
        if row[0] == "Network type" and row[1] == "Generator type":
            header_idx = i
            for col, cell in enumerate(row):
                y = _is_year(cell)
                if y is not None:
                    years.append(y)
                    year_cols.append(col)
            break
    if header_idx is None or not years:
        raise ValueError(f"Year header row not found after {TABLE_MARKER}")

    # fuel -> year -> MW sum
    totals: dict[str, dict[int, float]] = {}
    for row in rows[header_idx + 1 :]:
        if not row or row[0] is None:
            # Next table or blank — stop at next Table marker
            if isinstance(row[0] if row else None, str) and str(row[0]).startswith("Table"):
                break
            if not row or all(c is None for c in row):
                continue
        network = row[0]
        fuel_raw = row[1] if len(row) > 1 else None
        if network not in ("Transmission", "Distribution"):
            if isinstance(network, str) and network.startswith("Table"):
                break
            continue
        fuel = _clean_fuel(fuel_raw)
        if not fuel or fuel in AGGREGATE_FUELS or fuel.startswith("Total"):
            continue
        bucket = totals.setdefault(fuel, {})
        for year, col in zip(years, year_cols, strict=True):
            cell = row[col] if col < len(row) else None
            if cell is None or cell == "":
                continue
            if not isinstance(cell, (int, float)):
                continue
            bucket[year] = bucket.get(year, 0.0) + float(cell)

    observations: list[Observation] = []
    for fuel, by_year in sorted(totals.items()):
        for year in sorted(by_year):
            start_d, end_d = _year_bounds(year)
            status: ObservationStatus = "final"
            observations.append(
                Observation(
                    indicator_id="electricity-capacity-by-technology",
                    period_start=start_d,
                    period_end=end_d,
                    geography_code=UK_GEOGRAPHY_CODE,
                    geography_label=UK_GEOGRAPHY_LABEL,
                    value=by_year[year],
                    unit="MW",
                    observation_status=status,
                    source_version=SOURCE_VERSION,
                    notes=f"fuel={fuel}",
                )
            )
    if not observations:
        raise ValueError("No capacity observations parsed from Table 5.12.C")
    return observations


class ElectricityCapacityConnector(Connector):
    """DESNZ DUKES installed electricity capacity by technology (UK)."""

    def __init__(self, data_root: Path | None = None) -> None:
        root = data_root or (ENERGY_DATA / "electricity-capacity-by-technology")
        super().__init__(root)

    @property
    def indicator_id(self) -> str:
        return "electricity-capacity-by-technology"

    def build_manifest(self, evidence: Sequence[RawEvidence]) -> Manifest:
        return Manifest(
            indicator_id=self.indicator_id,
            title="Electricity capacity by technology",
            sector="energy-industry",
            publisher="DESNZ",
            source_url=SOURCE_LANDING_URL,
            series_id="DUKES 5.12.C (Plant installed capacity by connection, UK total, MW)",
            geography="UK (K02000001)",
            frequency="annual",
            unit="MW",
            definition=(
                "UK plant installed (nameplate) generating capacity in megawatts from "
                "DUKES table 5.12.C. Transmission and Distribution connection capacities "
                "are summed for each generator type × calendar year. Aggregate Total "
                "rows are excluded."
            ),
            licence="Open Government Licence v3.0",
            agent_owner="energy",
            connector_module="energy.connectors.electricity_capacity",
            curated_path="curated/observations.csv",
            update_cadence="Annual — DUKES electricity chapter, final Thursday of July",
            raw_evidence=list(evidence),
            notion_registry_url="https://app.notion.com/4106547176858180a305ffa706cffc4b",
            transformations=(
                "Parse sheet 5.12 Table 5.12.C. For each Generator type that is not a "
                "Total row, sum Transmission + Distribution MW across year columns. "
                "One CSV row per fuel × year; notes=fuel=<Label>. Empty cells skipped "
                "(not applicable)."
            ),
            caveats=(
                "Installed capacity (MW), not de-rated — do not confuse with DUKES 5.7. "
                "Not generation (TWh). Connection split (Transmission/Distribution) is "
                "collapsed into a UK total per fuel. Fuel labels differ from ET 5.1 "
                "generation labels — map carefully in the UI. History from 2011 in this "
                "workbook. GOV.UK asset URLs change each release; pin checksummed raw."
            ),
            open_questions=[
                "Optional secondary series from DUKES 5.7 (de-rated) if the Capacity "
                "apparatus needs intermittency-adjusted capacity.",
            ],
        )

    def evidence_from_pinned_raw(self) -> RawEvidence:
        path = self.data_root / PINNED_RAW_RELATIVE
        if not path.is_file():
            raise FileNotFoundError(f"Pinned raw workbook missing: {path}")
        return RawEvidence(
            path=PINNED_RAW_RELATIVE,
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
        return parse_dukes_512c_uk_installed_mw(workbook)


def main() -> None:
    """Pinned raw → curated observations + manifest."""
    connector = ElectricityCapacityConnector()
    evidence = connector.evidence_from_pinned_raw()
    observations = connector.transform([evidence])
    manifest_path, curated_path = connector.write_hand_off([evidence], observations)
    fuels = sorted(
        {
            obs.notes.removeprefix("fuel=")
            for obs in observations
            if obs.notes.startswith("fuel=")
        }
    )
    print(f"indicator_id: {connector.indicator_id}")
    print(f"raw: {evidence.path} sha256={evidence.checksum_sha256}")
    print(f"observations: {len(observations)}")
    print(f"fuels ({len(fuels)}): {', '.join(fuels)}")
    print(f"manifest: {manifest_path}")
    print(f"curated: {curated_path}")


if __name__ == "__main__":
    main()
