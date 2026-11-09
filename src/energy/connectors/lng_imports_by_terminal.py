"""DESNZ DUKES 4.6 — UK LNG imports by terminal (GWh).

Approach (plain language):
1. Download (or reuse pinned) DUKES_4.6.xlsx under data/energy/.../raw/.
2. Parse sheet ``4.6`` — terminals × calendar years (GWh).
3. One Observation per year × terminal; dimensions in notes.
4. Write curated CSV + manifest via Connector.write_hand_off.

Why this series (Gate 3 Lifelines):
- Official OGL LNG entry-point volumes (terminals named by DESNZ).
- Complements gas-trade-by-partner (country of origin) without inventing landfalls.

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

INDICATOR_ID = "lng-imports-by-terminal"
SHEET_NAME = "4.6"
HEADER_ROW = 6
TERMINAL_COL = 1
FIRST_YEAR_COL = 2

SOURCE_LANDING_URL = (
    "https://www.gov.uk/government/statistics/"
    "natural-gas-chapter-4-digest-of-united-kingdom-energy-statistics-dukes"
)
ASSET_URL = (
    "https://assets.publishing.service.gov.uk/media/"
    "6a69f46eb5fc953081705fea/DUKES_4.6.xlsx"
)
OFFICIAL_RELEASE_DATE = "2026-07-30"
SOURCE_VERSION = "DUKES_4.6_JUL_26"

NOTE_MARKER_RE = re.compile(r"\s*\[note[^\]]*\]", re.IGNORECASE)
YEAR_RE = re.compile(r"^(\d{4})")
MISSING_MARKERS = {"[x]", "[z]", "..", "…", "-"}

EXPECTED_TERMINALS: tuple[str, ...] = (
    "Dragon (Milford Haven)",
    "Isle of Grain",
    "South Hook (Milford Haven)",
    "Teeside GasPort (Teeside)",
    "Total LNG imports",
)


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


def _assert_layout(ws: Worksheet) -> dict[int, int]:
    """Return mapping of openpyxl column index → calendar year."""
    terminal_h = _clean_label(ws.cell(HEADER_ROW, TERMINAL_COL).value)
    if terminal_h.casefold() != "lng import terminal":
        raise ValueError(
            f"Unexpected terminal header {terminal_h!r}; expected 'LNG Import Terminal'"
        )
    year_cols: dict[int, int] = {}
    for col in range(FIRST_YEAR_COL, (ws.max_column or FIRST_YEAR_COL) + 1):
        year = _parse_year_header(ws.cell(HEADER_ROW, col).value)
        if year is None:
            continue
        year_cols[col] = year
    if not year_cols:
        raise ValueError("No year columns found on DUKES 4.6 header row")
    return year_cols


def parse_dukes_46_lng_by_terminal(workbook_path: Path) -> list[Observation]:
    """Parse DUKES 4.6 LNG imports by terminal (GWh)."""
    wb = openpyxl.load_workbook(workbook_path, data_only=True, read_only=False)
    try:
        if SHEET_NAME not in wb.sheetnames:
            raise ValueError(
                f"Expected sheet {SHEET_NAME!r} in {workbook_path.name}; "
                f"got {wb.sheetnames}"
            )
        ws = wb[SHEET_NAME]
        year_cols = _assert_layout(ws)

        observations: list[Observation] = []
        seen_terminals: list[str] = []
        for row_idx in range(HEADER_ROW + 1, (ws.max_row or HEADER_ROW) + 1):
            terminal = _clean_label(ws.cell(row_idx, TERMINAL_COL).value)
            if not terminal:
                continue
            seen_terminals.append(terminal)
            is_aggregate = terminal.casefold().startswith("total lng")
            kind = "aggregate" if is_aggregate else "terminal"

            for col, year in year_cols.items():
                value, missing_status = _parse_numeric_cell(ws.cell(row_idx, col).value)
                status: ObservationStatus = missing_status or "final"
                if value is None:
                    continue
                observations.append(
                    Observation(
                        indicator_id=INDICATOR_ID,
                        period_start=f"{year:04d}-01-01",
                        period_end=f"{year:04d}-12-31",
                        geography_code=UK_GEOGRAPHY_CODE,
                        geography_label=UK_GEOGRAPHY_LABEL,
                        value=value,
                        unit="GWh",
                        observation_status=status,
                        source_version=SOURCE_VERSION,
                        notes=(
                            f"terminal={terminal}; kind={kind}; "
                            f"fuel=LNG; mode=LNG"
                        ),
                    )
                )

        expected_set = {t.casefold() for t in EXPECTED_TERMINALS}
        got_set = {t.casefold() for t in seen_terminals}
        if got_set != expected_set:
            raise ValueError(
                f"Unexpected terminal set: got {seen_terminals!r}, "
                f"expected {list(EXPECTED_TERMINALS)!r}"
            )
        if not observations:
            raise ValueError(f"No LNG terminal rows from {workbook_path}")
        return observations
    finally:
        wb.close()


class LngImportsByTerminalConnector(Connector):
    """DESNZ DUKES 4.6 UK LNG imports by terminal (GWh)."""

    def __init__(self, data_root: Path | None = None) -> None:
        root = data_root or (ENERGY_DATA / INDICATOR_ID)
        super().__init__(root)

    @property
    def indicator_id(self) -> str:
        return INDICATOR_ID

    def build_manifest(self, evidence: Sequence[RawEvidence]) -> Manifest:
        return Manifest(
            indicator_id=self.indicator_id,
            title="LNG imports by terminal",
            sector="energy-industry",
            publisher="DESNZ",
            source_url=SOURCE_LANDING_URL,
            series_id="DUKES 4.6 (Liquefied Natural Gas imports by terminal, GWh)",
            geography=(
                "United Kingdom (K02000001); terminal names are publisher facility "
                "labels (Milford Haven / Kent / Teeside) — not invented landfalls"
            ),
            frequency="annual",
            unit="GWh",
            definition=(
                "UK annual LNG import volumes in gigawatt-hours (GWh) by import "
                "terminal from DUKES table 4.6. Terminals: Dragon (Milford Haven), "
                "Isle of Grain, South Hook (Milford Haven), Teeside GasPort (Teeside), "
                "plus Total LNG imports (kind=aggregate). notes use terminal=<name>; "
                "kind=terminal|aggregate; fuel=LNG; mode=LNG."
            ),
            licence="Open Government Licence v3.0",
            agent_owner="energy",
            connector_module="energy.connectors.lng_imports_by_terminal",
            curated_path="curated/observations.csv",
            update_cadence="Annual with DUKES natural gas chapter 4 (typically late July)",
            raw_evidence=list(evidence),
            transformations=(
                "Parse sheet 4.6 header row 6. Long-format: one CSV row per terminal × "
                "calendar year. Strip [note N] from terminal and year headers. Keep "
                "zeros (pre-commissioning / idle years). Total LNG imports marked "
                "kind=aggregate."
            ),
            caveats=(
                "Entry-point honesty: only DESNZ-named LNG terminals — do not invent "
                "pipeline landfalls. From 2016, methodology includes additional cargoes "
                "(Note 2 series break). Teeside GasPort has near-zero recent volumes "
                "but remains in the published table. Distinct from gas-trade-by-partner "
                "(country of origin) and electricity-interconnector-flows. OGL v3.0."
            ),
            revision_notes=(
                "DUKES_4.6.xlsx published 30 July 2026; years 2000–2025; Cover Sheet "
                "states no revisions in this table."
            ),
            related_indicator_ids=[
                "gas-trade-by-partner",
                "oil-imports-by-country",
                "energy-import-dependency",
                "electricity-interconnector-flows",
            ],
            open_questions=[
                "Optional join to DUKES 4.5b facility capacity (mm3/day) as a separate "
                "non-time-series register — not this indicator.",
                "Map coordinates for terminals require a separate authoritative GIS "
                "source; do not invent from location text.",
            ],
        )

    def fetch_latest(self, *, retrieved_date: str | None = None) -> RawEvidence:
        day = retrieved_date or datetime.now(timezone.utc).date().isoformat()
        relative = f"raw/{day}/DUKES_4.6.xlsx"
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
        return parse_dukes_46_lng_by_terminal(workbook)


def main() -> None:
    connector = LngImportsByTerminalConnector()
    evidence = connector.fetch_latest()
    observations = connector.transform([evidence])
    manifest_path, curated_path = connector.write_hand_off([evidence], observations)
    terminals = sorted(
        {
            part.removeprefix("terminal=")
            for obs in observations
            for part in obs.notes.split("; ")
            if part.startswith("terminal=")
        }
    )
    years = sorted({obs.period_start[:4] for obs in observations})
    print(f"indicator_id: {connector.indicator_id}")
    print(f"raw: {evidence.path} sha256={evidence.checksum_sha256}")
    print(f"observations: {len(observations)}")
    print(f"years: {years[0]}–{years[-1]} ({len(years)} years)")
    print(f"terminals: {', '.join(terminals)}")
    print(f"manifest: {manifest_path}")
    print(f"curated: {curated_path}")


if __name__ == "__main__":
    main()
