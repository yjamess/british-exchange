"""DESNZ DUKES 4.4a — UK natural gas stock and storage capacity (GWh).

Approach (plain language):
1. Download (or reuse pinned) DUKES_4.4.xlsx under data/energy/.../raw/.
2. Parse sheet ``4.4a`` — Stock, Stock change, Storage capacity × calendar years.
3. One Observation per year × measure; measure name in notes.
4. Write curated CSV + manifest via Connector.write_hand_off.

Why this series (Domain 05 Resilience):
- Official storage stock / capacity companion — not a fabricated security score.
- Distinct from gas trade partners (4.5a) and LNG terminals (4.6).
- Sheet 4.4b site register is a static facility list — not this annual series.

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

from britain_exchange.checksum import sha256_file
from britain_exchange.connector import Connector
from britain_exchange.manifest import Manifest, RawEvidence
from britain_exchange.observation import Observation, ObservationStatus
from britain_exchange.paths import ENERGY_DATA

UK_GEOGRAPHY_CODE = "K02000001"
UK_GEOGRAPHY_LABEL = "United Kingdom"

INDICATOR_ID = "natural-gas-storage"
SHEET_NAME = "4.4a"
HEADER_ROW = 6
LABEL_COL = 1
FIRST_YEAR_COL = 2

SOURCE_LANDING_URL = (
    "https://www.gov.uk/government/statistics/"
    "natural-gas-chapter-4-digest-of-united-kingdom-energy-statistics-dukes"
)
ASSET_URL = (
    "https://assets.publishing.service.gov.uk/media/"
    "6a69f4561bcde42205705fec/DUKES_4.4.xlsx"
)
OFFICIAL_RELEASE_DATE = "2026-07-30"
SOURCE_VERSION = "DUKES_4.4_JUL_26"

NOTE_MARKER_RE = re.compile(r"\s*\[note[^\]]*\]", re.IGNORECASE)
YEAR_RE = re.compile(r"^(\d{4})")
MISSING_MARKERS = {"[x]", "[z]", "..", "…", "-"}

# Publisher row label → measure key in notes.
MEASURE_MAP = {
    "stock": "stock",
    "stock change": "stock_change",
    "storage capacity": "storage_capacity",
}


def _clean_label(raw: object) -> str:
    text = str(raw or "").strip().replace("\n", " ")
    text = NOTE_MARKER_RE.sub("", text)
    return " ".join(text.split())


def _parse_year_header(raw: object) -> int | None:
    text = _clean_label(raw)
    match = YEAR_RE.match(text)
    if not match:
        return None
    return int(match.group(1))


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


def parse_dukes_44a_gas_storage(workbook_path: Path) -> list[Observation]:
    """Parse DUKES 4.4a natural gas stock / stock change / storage capacity (GWh)."""
    wb = openpyxl.load_workbook(workbook_path, data_only=True, read_only=True)
    try:
        if SHEET_NAME not in wb.sheetnames:
            raise ValueError(f"Missing sheet {SHEET_NAME!r} in {workbook_path.name}")
        ws = wb[SHEET_NAME]

        header_cells = list(
            ws.iter_rows(
                min_row=HEADER_ROW,
                max_row=HEADER_ROW,
                min_col=FIRST_YEAR_COL,
                values_only=True,
            )
        )
        if not header_cells:
            raise ValueError(f"Empty header on DUKES 4.4a row {HEADER_ROW}")
        years: list[tuple[int, int]] = []  # (col_1based, year)
        for offset, raw in enumerate(header_cells[0]):
            year = _parse_year_header(raw)
            if year is None:
                continue
            years.append((FIRST_YEAR_COL + offset, year))
        if not years:
            raise ValueError("No year columns found on DUKES 4.4a header row")

        observations: list[Observation] = []
        for row in ws.iter_rows(min_row=HEADER_ROW + 1, values_only=False):
            label_cell = row[LABEL_COL - 1] if len(row) >= LABEL_COL else None
            label = _clean_label(label_cell.value if label_cell else None).lower()
            if not label:
                continue
            measure = MEASURE_MAP.get(label)
            if measure is None:
                continue
            for col, year in years:
                cell = row[col - 1] if len(row) >= col else None
                value, status = _parse_numeric_cell(cell.value if cell else None)
                if status == "missing" and value is None:
                    continue
                if year >= 2016:
                    notes = (
                        f"measure={measure}; fuel=Gas; table=DUKES 4.4a; "
                        "series_break_2016=note1"
                    )
                else:
                    notes = f"measure={measure}; fuel=Gas; table=DUKES 4.4a"
                observations.append(
                    Observation(
                        indicator_id=INDICATOR_ID,
                        period_start=f"{year}-01-01",
                        period_end=f"{year}-12-31",
                        geography_code=UK_GEOGRAPHY_CODE,
                        geography_label=UK_GEOGRAPHY_LABEL,
                        value=value,
                        unit="GWh",
                        observation_status=status or "final",
                        source_version=SOURCE_VERSION,
                        notes=notes,
                    )
                )
        if not observations:
            raise ValueError(f"No natural-gas-storage rows from {workbook_path}")
        return observations
    finally:
        wb.close()


class NaturalGasStorageConnector(Connector):
    """DESNZ DUKES 4.4a UK natural gas stock and storage capacity (GWh)."""

    def __init__(self, data_root: Path | None = None) -> None:
        root = data_root or (ENERGY_DATA / INDICATOR_ID)
        super().__init__(root)

    @property
    def indicator_id(self) -> str:
        return INDICATOR_ID

    def build_manifest(self, evidence: Sequence[RawEvidence]) -> Manifest:
        return Manifest(
            indicator_id=self.indicator_id,
            title="Natural gas stock and storage capacity",
            sector="energy-industry",
            publisher="DESNZ",
            source_url=SOURCE_LANDING_URL,
            series_id="DUKES 4.4a (Natural gas stock, GWh)",
            geography="United Kingdom (K02000001)",
            frequency="annual",
            unit="GWh",
            definition=(
                "UK annual natural gas Stock, Stock change and Storage capacity in "
                "gigawatt-hours (GWh) from DUKES table 4.4a. notes use "
                "measure=stock|stock_change|storage_capacity; fuel=Gas. "
                "Positive stock change = gas taken from storage (available for demand); "
                "negative = gas put into storage (Note 2). Not a security score."
            ),
            licence="Open Government Licence v3.0",
            agent_owner="energy",
            connector_module="energy.connectors.natural_gas_storage",
            curated_path="curated/observations.csv",
            update_cadence="Annual with DUKES natural gas chapter 4 (typically late July)",
            raw_evidence=list(evidence),
            transformations=(
                "Parse sheet 4.4a header row 6. Long-format: one CSV row per "
                "measure × year. Strip [note N] from labels. Sheet 4.4b (storage "
                "sites register, mcm) not ingested — facility snapshot, not the "
                "annual stock/capacity series."
            ),
            caveats=(
                "From 2016, stock data are sourced from National Grid and include "
                "medium-range, long-range and LNG stock; prior to 2016 LNG stock is "
                "not included (Note 1) — series break. Storage capacity also jumps "
                "around Rough / methodology changes; do not treat pre-/post-2016 as "
                "one continuous level without the break label. Distinct from "
                "gas-trade-by-partner (flows) and electricity storage / REPD. "
                "Never average with import dependency into one score. OGL v3.0."
            ),
            revision_notes=(
                "DUKES_4.4.xlsx published 30 July 2026; years 2008–2025. Cover Sheet: "
                "revisions 2008–2024 due to reconciliation and methodological updates."
            ),
            related_indicator_ids=[
                "gas-trade-by-partner",
                "lng-imports-by-terminal",
                "energy-import-dependency",
                "fossil-fuel-dependency",
                "low-carbon-energy-share",
            ],
            open_questions=[
                "Optional separate indicator for DUKES 4.4b site capacities (mcm) — "
                "static register, not annual GWh stock.",
            ],
        )

    def fetch_latest(self, *, retrieved_date: str | None = None) -> RawEvidence:
        day = retrieved_date or datetime.now(timezone.utc).date().isoformat()
        relative = f"raw/{day}/DUKES_4.4.xlsx"
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
        return parse_dukes_44a_gas_storage(workbook)


def main() -> None:
    connector = NaturalGasStorageConnector()
    evidence = connector.fetch_latest()
    observations = connector.transform([evidence])
    manifest_path, curated_path = connector.write_hand_off([evidence], observations)
    measures = sorted(
        {
            part.removeprefix("measure=")
            for obs in observations
            for part in obs.notes.split("; ")
            if part.startswith("measure=")
        }
    )
    years = sorted({obs.period_start[:4] for obs in observations})
    print(f"indicator_id: {connector.indicator_id}")
    print(f"raw: {evidence.path} sha256={evidence.checksum_sha256}")
    print(f"observations: {len(observations)}")
    print(f"years: {years[0]}–{years[-1]} ({len(years)} years)")
    print(f"measures: {', '.join(measures)}")
    print(f"manifest: {manifest_path}")
    print(f"curated: {curated_path}")


if __name__ == "__main__":
    main()
