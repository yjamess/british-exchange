"""DESNZ ECUK Table C1 — UK final energy consumption by sector and fuel (ktoe).

Approach (plain language):
1. Prefer the shared ECUK Consumption pin under energy-consumption-ecuk (or local raw/).
2. Table C1 lays five sector blocks side by side (Industry → All final users).
3. One Observation per sector × fuel × year; notes ``sector=<id>;fuel=<label>``.
4. ``fuel=Total`` is an aggregate — charts must not stack it with components.

Extends the Industry-only ``industrial-energy-consumption`` series for Domain 02.
"""

from __future__ import annotations

import shutil
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

PINNED_RAW_RELATIVE = "raw/2026-11-06/ECUK_2026_Consumption_tables.xlsx"
SHARED_PIN = (
    ENERGY_DATA / "energy-consumption-ecuk" / "raw" / "2026-11-06" / "ECUK_2026_Consumption_tables.xlsx"
)
SOURCE_LANDING_URL = (
    "https://www.gov.uk/government/statistics/energy-consumption-in-the-uk-2026"
)
PINNED_ASSET_URL = (
    "https://assets.publishing.service.gov.uk/media/"
    "6aac02112f29b38884818687/ECUK_2026_Consumption_tables.xlsx"
)
OFFICIAL_RELEASE_DATE = "2026-09-24"
SOURCE_VERSION = "ECUK_2026_Consumption"
SHEET_NAME = "Table C1"
MISSING_MARKERS = {"[x]", "[z]", "..", "…"}

# Banner row 5 / Year row 6 column starts (1-based), from Gate 1 inspection.
SECTOR_BLOCKS: tuple[tuple[str, str, int], ...] = (
    ("industry", "Industry", 1),
    ("transport", "Transport", 13),
    ("domestic", "Domestic", 27),
    ("services", "Services and other final users", 37),
    ("all-final", "All final users", 46),
)


def _clean_header(raw: object) -> str:
    text = str(raw).strip().replace("\n", " ")
    while "[" in text and "]" in text:
        start = text.index("[")
        end = text.index("]", start)
        text = (text[:start] + text[end + 1 :]).strip()
    return " ".join(text.split())


def _parse_numeric(raw: object) -> tuple[float | None, ObservationStatus]:
    if raw is None:
        return None, "missing"
    if isinstance(raw, (int, float)):
        return float(raw), "final"
    text = str(raw).strip()
    if not text or text.casefold() in MISSING_MARKERS:
        return None, "missing"
    try:
        return float(text.replace(",", "")), "final"
    except ValueError:
        return None, "missing"


def _fuels_for_block(ws: Worksheet, header_row: int, year_col: int) -> list[str]:
    fuels: list[str] = []
    for col in range(year_col + 1, (ws.max_column or year_col) + 1):
        raw = ws.cell(header_row, col).value
        if raw is None or not str(raw).strip():
            break
        if str(raw).strip().casefold() == "year":
            break
        fuels.append(_clean_header(raw))
    if not fuels:
        raise ValueError(f"No fuel columns at year_col={year_col}")
    if not any(f.casefold().startswith("total") for f in fuels):
        raise ValueError(f"Expected Total in fuels {fuels!r}")
    return fuels


def parse_ecuk_c1_all_sectors(workbook_path: Path) -> list[Observation]:
    """Parse all five C1 sector blocks into long-format observations."""
    wb = openpyxl.load_workbook(workbook_path, data_only=True, read_only=False)
    try:
        if SHEET_NAME not in wb.sheetnames:
            raise ValueError(f"Expected sheet {SHEET_NAME!r}; got {wb.sheetnames}")
        ws = wb[SHEET_NAME]
        # Banner + Year header live on rows 5–6 in ECUK 2026.
        banner_row, header_row = 5, 6
        banner = str(ws.cell(banner_row, 1).value or "")
        if "industry" not in banner.casefold():
            raise ValueError(f"Unexpected C1 banner at row {banner_row}: {banner!r}")

        block_fuels = {
            sid: _fuels_for_block(ws, header_row, year_col) for sid, _, year_col in SECTOR_BLOCKS
        }
        observations: list[Observation] = []
        for row_idx in range(header_row + 1, (ws.max_row or header_row) + 1):
            year_raw = ws.cell(row_idx, 1).value
            if year_raw is None:
                break
            try:
                year = int(year_raw)
            except (TypeError, ValueError):
                break
            period_start, period_end = f"{year:04d}-01-01", f"{year:04d}-12-31"
            for sector_id, _label, year_col in SECTOR_BLOCKS:
                # Each block repeats the year in its Year column — trust Industry year.
                fuels = block_fuels[sector_id]
                for offset, fuel in enumerate(fuels):
                    col = year_col + 1 + offset
                    value, status = _parse_numeric(ws.cell(row_idx, col).value)
                    fuel_label = "Total" if fuel.casefold().startswith("total") else fuel
                    observations.append(
                        Observation(
                            indicator_id="final-energy-consumption-by-sector",
                            period_start=period_start,
                            period_end=period_end,
                            geography_code=UK_GEOGRAPHY_CODE,
                            geography_label=UK_GEOGRAPHY_LABEL,
                            value=value,
                            unit="ktoe",
                            observation_status=status,
                            source_version=SOURCE_VERSION,
                            notes=f"sector={sector_id};fuel={fuel_label}",
                        )
                    )
        if not observations:
            raise ValueError(f"No C1 rows parsed from {workbook_path}")
        return observations
    finally:
        wb.close()


class FinalEnergyConsumptionBySectorConnector(Connector):
    """ECUK C1 final consumption — all sectors — for Domain 02 Metabolism."""

    def __init__(self, data_root: Path | None = None) -> None:
        root = data_root or (ENERGY_DATA / "final-energy-consumption-by-sector")
        super().__init__(root)

    @property
    def indicator_id(self) -> str:
        return "final-energy-consumption-by-sector"

    def ensure_pinned_raw(self) -> Path:
        """Copy shared Gate 1 pin into this package if missing."""
        dest = self.data_root / PINNED_RAW_RELATIVE
        dest.parent.mkdir(parents=True, exist_ok=True)
        if not dest.is_file():
            if not SHARED_PIN.is_file():
                raise FileNotFoundError(f"Shared ECUK pin missing: {SHARED_PIN}")
            shutil.copy2(SHARED_PIN, dest)
        return dest

    def build_manifest(self, evidence: Sequence[RawEvidence]) -> Manifest:
        return Manifest(
            indicator_id=self.indicator_id,
            title="Final energy consumption by sector",
            sector="energy-industry",
            publisher="DESNZ",
            source_url=SOURCE_LANDING_URL,
            series_id="ECUK Table C1 — final energy consumption by sector and fuel (ktoe)",
            geography="United Kingdom (K02000001)",
            frequency="annual",
            unit="ktoe",
            definition=(
                "UK final energy consumption (ktoe) from ECUK Table C1 for Industry, "
                "Transport, Domestic, Services and other final users, and All final users. "
                "One observation per sector × fuel × calendar year; "
                "notes sector=<id>;fuel=<label>. fuel=Total is the sector aggregate."
            ),
            licence="Open Government Licence v3.0",
            agent_owner="energy",
            connector_module="energy.connectors.final_energy_consumption_by_sector",
            curated_path="curated/observations.csv",
            update_cadence="Annual — ECUK typically each September",
            raw_evidence=list(evidence),
            notion_registry_url="",
            transformations=(
                "Parse five horizontal C1 blocks (banner row 5, Year row 6). "
                "Long-format observations; [x] → missing. Do not stack fuel=Total with components."
            ),
            caveats=(
                "Unit is ktoe (not Mtoe). All final users Total must not be summed with sector "
                "Totals. Transport fuels are mode-prefixed. Industry block overlaps "
                "industrial-energy-consumption — same source, Industry scope only there. "
                "Distinct from subnational final consumption (2005–2024)."
            ),
            revision_notes="ECUK 2026 Consumption tables; series through 2025.",
            open_questions=[],
        )

    def evidence_from_pinned_raw(self) -> RawEvidence:
        path = self.ensure_pinned_raw()
        return RawEvidence(
            path=PINNED_RAW_RELATIVE,
            retrieved_at=datetime.now(timezone.utc).isoformat(),
            checksum_sha256=sha256_file(path),
            content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            official_release_date=OFFICIAL_RELEASE_DATE,
            http_status=200,
            source_url=PINNED_ASSET_URL,
        )

    def transform(self, evidence: Sequence[RawEvidence]) -> list[Observation]:
        if not evidence:
            raise ValueError("transform() requires RawEvidence")
        path = self.data_root / evidence[0].path
        return parse_ecuk_c1_all_sectors(path)


def main() -> None:
    connector = FinalEnergyConsumptionBySectorConnector()
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
