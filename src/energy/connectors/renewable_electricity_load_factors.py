"""DESNZ DUKES 6.3 — UK renewable electricity load factors (percent).

Approach (plain language):
1. Prefer the pinned raw XLSX under data/energy/.../raw/ (immutable evidence).
2. Parse sheet ``6.3`` — two stacked tables (average capacity vs unchanged config).
3. Emit one observation per technology × year × basis; unit = percent.
4. ``[x]`` → missing (value None). Put technology in notes as ``fuel=<Label>``.
5. Write curated CSV + manifest via Connector.write_hand_off.

Nuclear is **not** in this table (renewables only). Do not claim REPD coverage.

Best practices:
- pathlib.Path (https://docs.python.org/3/library/pathlib.html)
- type hints (https://docs.python.org/3/library/typing.html)
- Fail loudly on missing sheets / headers; never invent numbers.
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

INDICATOR_ID = "renewable-electricity-load-factors"
UK_GEOGRAPHY_CODE = "K02000001"
UK_GEOGRAPHY_LABEL = "United Kingdom"

PINNED_RAW_RELATIVE = "raw/2026-11-07/DUKES_6.3.xlsx"
SOURCE_LANDING_URL = (
    "https://www.gov.uk/government/statistics/"
    "renewable-sources-of-energy-chapter-6-digest-of-united-kingdom-energy-statistics-dukes"
)
PINNED_ASSET_URL = (
    "https://assets.publishing.service.gov.uk/media/"
    "6a6a276f8319ab05f7caa1cf/DUKES_6.3.xlsx"
)
OFFICIAL_RELEASE_DATE = "2026-07-30"
SOURCE_VERSION = "DUKES_6.3_2026"
SHEET_NAME = "6.3"
UNIT = "percent"

#: Header text → basis key written into notes (stable for API filters).
TABLE_HEADERS: dict[str, str] = {
    "Load factors - based on average of beginning and end of year capacity [note 1]": (
        "average_boe_capacity"
    ),
    "Load factors - for schemes operating on an unchanged configuration basis [note 2]": (
        "unchanged_configuration"
    ),
}


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


def _clean_label(raw: object) -> str:
    return str(raw).strip()


def _parse_cell(cell: object) -> tuple[float | None, ObservationStatus]:
    """Return (value, status). ``[x]`` is publisher-unavailable → missing."""
    if cell is None or cell == "":
        return None, "missing"
    if isinstance(cell, str):
        text = cell.strip()
        if text in {"[x]", "x", ".."}:
            return None, "missing"
        # Some releases may store numbers as strings.
        try:
            return float(text), "final"
        except ValueError as exc:
            raise ValueError(f"Unrecognised load-factor cell: {cell!r}") from exc
    if isinstance(cell, (int, float)):
        return float(cell), "final"
    raise ValueError(f"Unrecognised load-factor cell type: {cell!r}")


def parse_dukes_63_load_factors(workbook_path: Path) -> list[Observation]:
    """Parse both DUKES 6.3 tables into long-format observations."""
    wb = openpyxl.load_workbook(workbook_path, data_only=True, read_only=True)
    try:
        if SHEET_NAME not in wb.sheetnames:
            raise ValueError(f"Expected sheet {SHEET_NAME!r} in {workbook_path.name}")
        ws: Worksheet = wb[SHEET_NAME]
        rows = list(ws.iter_rows(values_only=True))
    finally:
        wb.close()

    observations: list[Observation] = []
    basis: str | None = None
    years: list[int] = []
    year_cols: list[int] = []

    for row in rows:
        if not row:
            continue
        first = row[0]
        if first is None:
            # Blank separator between the two stacked tables.
            basis = None
            years = []
            year_cols = []
            continue

        label = _clean_label(first)
        if label in TABLE_HEADERS:
            basis = TABLE_HEADERS[label]
            years = []
            year_cols = []
            for col, cell in enumerate(row):
                if col == 0:
                    continue
                y = _is_year(cell)
                if y is not None:
                    years.append(y)
                    year_cols.append(col)
            if not years:
                raise ValueError(f"No year columns found for table header {label!r}")
            continue

        if basis is None or not years:
            # Cover / intro rows above the first table.
            continue

        fuel = label
        for year, col in zip(years, year_cols, strict=True):
            cell = row[col] if col < len(row) else None
            value, status = _parse_cell(cell)
            start_d, end_d = _year_bounds(year)
            observations.append(
                Observation(
                    indicator_id=INDICATOR_ID,
                    period_start=start_d,
                    period_end=end_d,
                    geography_code=UK_GEOGRAPHY_CODE,
                    geography_label=UK_GEOGRAPHY_LABEL,
                    value=value,
                    unit=UNIT,
                    observation_status=status,
                    source_version=SOURCE_VERSION,
                    notes=f"fuel={fuel}; basis={basis}",
                )
            )

    if not observations:
        raise ValueError("No load-factor observations parsed from DUKES 6.3")
    return observations


class RenewableElectricityLoadFactorsConnector(Connector):
    """DESNZ DUKES renewable electricity load factors (UK, annual %)."""

    def __init__(self, data_root: Path | None = None) -> None:
        root = data_root or (ENERGY_DATA / INDICATOR_ID)
        super().__init__(root)

    @property
    def indicator_id(self) -> str:
        return INDICATOR_ID

    def build_manifest(self, evidence: Sequence[RawEvidence]) -> Manifest:
        return Manifest(
            indicator_id=self.indicator_id,
            title="Renewable electricity load factors",
            sector="energy-industry",
            publisher="DESNZ",
            source_url=SOURCE_LANDING_URL,
            series_id=(
                "DUKES 6.3 (Load factors for renewable electricity generation, percent)"
            ),
            geography="UK (K02000001)",
            frequency="annual",
            unit=UNIT,
            definition=(
                "UK annual load factors for renewable electricity generation from "
                "DUKES table 6.3: generation as a percentage of maximum possible "
                "generation. Two bases are published: (1) average of beginning- and "
                "end-of-year capacity [note 1]; (2) unchanged-configuration schemes "
                "[note 2]. Technology labels are taken from the sheet. Nuclear is "
                "not included — this is a renewables table only."
            ),
            licence="Open Government Licence v3.0",
            agent_owner="energy",
            connector_module="energy.connectors.renewable_electricity_load_factors",
            curated_path="curated/observations.csv",
            update_cadence="Annual — DUKES renewables chapter, final Thursday of July",
            raw_evidence=list(evidence),
            notion_registry_url=(
                "https://app.notion.com/41165471768581dfbb30e984c9aa01ba"
            ),
            transformations=(
                "Parse sheet 6.3. For each of the two stacked tables, read year "
                "columns from the header row and emit one Observation per technology "
                "× year. notes=fuel=<Label>; basis=average_boe_capacity|unchanged_configuration. "
                "Publisher [x] → observation_status=missing with empty value. "
                "Parent aggregates (Wind, Hydro, Bioenergy, All renewable technologies) "
                "are retained alongside child technologies."
            ),
            caveats=(
                "Unit is percent (0–100 scale as published), not a 0–1 fraction. "
                "Do not confuse the two bases — prefer average_boe_capacity for "
                "headline Capacity ≠ Output unless the UI labels unchanged "
                "configuration explicitly. Nuclear load factors are in DUKES 5.10 "
                "(MPP plant loads), not this series. REPD does not publish load "
                "factors and does not cover nuclear."
            ),
            related_indicator_ids=[
                "electricity-capacity-by-technology",
                "electricity-generation-by-source",
                "renewable-energy-planning-operational",
            ],
            open_questions=[
                "Optional Gate 3: regional standard load factors "
                "(Regional Renewable Statistics).",
                "Optional: MPP nuclear load factor from DUKES 5.10 as a separate "
                "low-carbon companion series.",
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
        return parse_dukes_63_load_factors(workbook)


def main() -> None:
    """Pinned raw → curated observations + manifest."""
    connector = RenewableElectricityLoadFactorsConnector()
    evidence = connector.evidence_from_pinned_raw()
    observations = connector.transform([evidence])
    manifest_path, curated_path = connector.write_hand_off([evidence], observations)
    fuels = sorted(
        {
            part.removeprefix("fuel=")
            for obs in observations
            for part in obs.notes.split("; ")
            if part.startswith("fuel=")
        }
    )
    valued = sum(1 for o in observations if o.value is not None)
    missing = sum(1 for o in observations if o.observation_status == "missing")
    print(f"indicator_id: {connector.indicator_id}")
    print(f"raw: {evidence.path} sha256={evidence.checksum_sha256}")
    print(f"observations: {len(observations)} (valued={valued}, missing={missing})")
    print(f"technologies ({len(fuels)}): {', '.join(fuels)}")
    print(f"manifest: {manifest_path}")
    print(f"curated: {curated_path}")


if __name__ == "__main__":
    main()
