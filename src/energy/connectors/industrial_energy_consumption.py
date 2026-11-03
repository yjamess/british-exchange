"""DESNZ ECUK Table C1 — UK industrial final energy consumption (ktoe).

Approach (plain language):
1. Prefer the pinned raw XLSX under data/energy/.../raw/ (immutable evidence).
2. Parse Table C1 Industry section: one Observation per fuel × calendar year.
3. Put fuel in notes as fuel=<Label>; Total is an aggregate (do not stack it).
4. Write curated CSV + manifest via Connector.write_hand_off.

Best practices:
- pathlib.Path (https://docs.python.org/3/library/pathlib.html)
- type hints (https://docs.python.org/3/library/typing.html)
- Fail loudly on missing sheets / unexpected headers; never invent numbers.
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

PINNED_RAW_RELATIVE = "raw/2026-11-03/ECUK_2026_Consumption_tables.xlsx"
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
INDUSTRY_SECTION_TITLE = "Industry [Note 1]"
MISSING_MARKERS = {"[x]", "[z]", "..", "…"}


def _clean_fuel_header(raw: object) -> str:
    text = str(raw).strip().replace("\n", " ")
    # Drop note markers like [Note 2]
    while "[" in text and "]" in text:
        start = text.index("[")
        end = text.index("]", start)
        text = (text[:start] + text[end + 1 :]).strip()
    return " ".join(text.split())


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


def _find_industry_block(ws: Worksheet) -> tuple[int, int, list[str]]:
    """Return (header_row, first_data_row, fuel_headers) for Industry section.

    Industry block starts at a title row, then a Year header row, then data until
    the next sector title (e.g. Transport) or blank Year column end.
    """
    title_row: int | None = None
    for row_idx in range(1, (ws.max_row or 1) + 1):
        cell = ws.cell(row_idx, 1).value
        if cell is not None and "industry" in str(cell).casefold():
            title_row = row_idx
            break
    if title_row is None:
        raise ValueError(f"Could not find Industry section on {SHEET_NAME}")

    header_row = title_row + 1
    if str(ws.cell(header_row, 1).value or "").strip().casefold() != "year":
        raise ValueError(
            f"Expected Year header under Industry at row {header_row}; "
            f"got {ws.cell(header_row, 1).value!r}"
        )

    fuels: list[str] = []
    for col in range(2, (ws.max_column or 2) + 1):
        raw = ws.cell(header_row, col).value
        if raw is None or not str(raw).strip():
            break
        # Stop at the next repeated Year column that starts another sector table
        # laid out horizontally on the same sheet.
        if str(raw).strip().casefold() == "year":
            break
        fuels.append(_clean_fuel_header(raw))
    if not fuels:
        raise ValueError("No fuel columns found in Industry block")
    if not any(f.casefold().startswith("total") for f in fuels):
        raise ValueError(f"Expected Total fuel column among {fuels!r}")
    return header_row, header_row + 1, fuels


def parse_ecuk_c1_industry_ktoe(workbook_path: Path) -> list[Observation]:
    """Parse ECUK Table C1 Industry final energy consumption (ktoe)."""
    wb = openpyxl.load_workbook(workbook_path, data_only=True, read_only=False)
    try:
        if SHEET_NAME not in wb.sheetnames:
            raise ValueError(
                f"Expected sheet {SHEET_NAME!r} in {workbook_path.name}; "
                f"got {wb.sheetnames}"
            )
        ws: Worksheet = wb[SHEET_NAME]
        header_row, data_start, fuels = _find_industry_block(ws)

        observations: list[Observation] = []
        for row_idx in range(data_start, (ws.max_row or data_start) + 1):
            year_raw = ws.cell(row_idx, 1).value
            if year_raw is None:
                # End of vertical Industry block (other sectors use other Year cols).
                break
            # Next sector title rows have text in col A and blanks in fuel cols.
            if isinstance(year_raw, str) and not year_raw.strip().isdigit():
                break
            try:
                year = int(year_raw)
            except (TypeError, ValueError):
                break
            period_start = f"{year:04d}-01-01"
            period_end = f"{year:04d}-12-31"
            for fuel_offset, fuel in enumerate(fuels, start=2):
                value, missing_status = _parse_numeric_cell(
                    ws.cell(row_idx, fuel_offset).value
                )
                status: ObservationStatus = missing_status or "final"
                # Normalise Total label (may include note residue already stripped).
                fuel_label = "Total" if fuel.casefold().startswith("total") else fuel
                observations.append(
                    Observation(
                        indicator_id="industrial-energy-consumption",
                        period_start=period_start,
                        period_end=period_end,
                        geography_code=UK_GEOGRAPHY_CODE,
                        geography_label=UK_GEOGRAPHY_LABEL,
                        value=value,
                        unit="ktoe",
                        observation_status=status,
                        source_version=SOURCE_VERSION,
                        notes=f"fuel={fuel_label}",
                    )
                )
        if not observations:
            raise ValueError(f"No Industry consumption rows from {workbook_path}")
        return observations
    finally:
        wb.close()


class IndustrialEnergyConsumptionConnector(Connector):
    """DESNZ ECUK industrial final energy consumption (Table C1 Industry)."""

    def __init__(self, data_root: Path | None = None) -> None:
        root = data_root or (ENERGY_DATA / "industrial-energy-consumption")
        super().__init__(root)

    @property
    def indicator_id(self) -> str:
        return "industrial-energy-consumption"

    def build_manifest(self, evidence: Sequence[RawEvidence]) -> Manifest:
        return Manifest(
            indicator_id=self.indicator_id,
            title="Industrial energy consumption",
            sector="energy-industry",
            publisher="DESNZ",
            source_url=SOURCE_LANDING_URL,
            series_id="ECUK Table C1 (Industry final energy consumption, ktoe)",
            geography="UK (K02000001)",
            frequency="annual",
            unit="ktoe",
            definition=(
                "UK industrial final energy consumption by fuel in thousand tonnes "
                "of oil equivalent (ktoe) from Energy Consumption in the UK (ECUK) "
                f"Table C1 section {INDUSTRY_SECTION_TITLE}. One observation per "
                "fuel × calendar year; fuel label in notes as fuel=<Label>. "
                "Aligned with DUKES industrial final consumption."
            ),
            licence="Open Government Licence v3.0",
            agent_owner="energy",
            connector_module="energy.connectors.industrial_energy_consumption",
            curated_path="curated/observations.csv",
            update_cadence="Annual — ECUK typically each September",
            raw_evidence=list(evidence),
            notion_registry_url="https://app.notion.com/40d654717685817592b0c0ba7d49aa52",
            transformations=(
                "Parse Table C1 Industry block (Year + fuel columns until next "
                "horizontal Year header). Long-format: one CSV row per fuel × year. "
                "Map [x] → missing. Sub-sector Table C2 and end-use tables not "
                "ingested in this hand-off."
            ),
            caveats=(
                "Unit is ktoe (not Mtoe). fuel=Total is an aggregate — never sum "
                "with component fuels. Industry definition follows DUKES/SIC "
                "(see ECUK methodology note). Distinct from Energy Trends quarterly "
                "industrial consumption in ET 1.3c. GOV.UK asset URLs change each "
                "release; pin checksummed raw."
            ),
            revision_notes=(
                "ECUK 2026 Consumption tables published 24 Sep 2026; industry "
                "series through 2025."
            ),
            open_questions=[
                "Optional: Table C2 industrial consumption by sub-sector.",
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
        return parse_ecuk_c1_industry_ktoe(workbook)


def main() -> None:
    connector = IndustrialEnergyConsumptionConnector()
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
