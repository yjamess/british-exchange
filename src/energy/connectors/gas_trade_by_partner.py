"""DESNZ DUKES 4.5a — UK natural gas imports/exports by partner (GWh).

Approach (plain language):
1. Download (or reuse pinned) DUKES_4.5.xlsx under data/energy/.../raw/.
2. Parse sheet ``4.5a`` — flow × mode × partner × calendar years (GWh).
3. One Observation per year × partner × flow × mode; dimensions in notes.
4. Write curated CSV + manifest via Connector.write_hand_off.

Why this series (Gate 3 Lifelines):
- Official OGL gas partner-country geography (pipeline + LNG origin/destination).
- Complements lng-imports-by-terminal (entry facilities) without inventing landfalls.
- DUKES 4.5b facility capacity register is out of scope (static; not annual flows).

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

INDICATOR_ID = "gas-trade-by-partner"
SHEET_NAME = "4.5a"
HEADER_ROW = 6
FLOW_COL = 1
MODE_COL = 2
PARTNER_COL = 3
FIRST_YEAR_COL = 4

SOURCE_LANDING_URL = (
    "https://www.gov.uk/government/statistics/"
    "natural-gas-chapter-4-digest-of-united-kingdom-energy-statistics-dukes"
)
ASSET_URL = (
    "https://assets.publishing.service.gov.uk/media/"
    "6aba96a9734e2435f202f1d6/DUKES_4.5.xlsx"
)
OFFICIAL_RELEASE_DATE = "2026-07-30"
SOURCE_VERSION = "DUKES_4.5_JUL_26"

NOTE_MARKER_RE = re.compile(r"\s*\[note[^\]]*\]", re.IGNORECASE)
YEAR_RE = re.compile(r"^(\d{4})")
MISSING_MARKERS = {"[x]", "[z]", "..", "…", "-"}

# Rows that already sum other partners — mark kind=aggregate.
AGGREGATE_PARTNERS = frozenset(
    {
        "total pipeline",
        "total lng",
        "total imports",
        "total exports",
        "net imports",
    }
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


def _normalise_flow(raw: str) -> str:
    text = raw.strip()
    lower = text.casefold()
    if lower == "import":
        return "Imports"
    if lower == "export":
        return "Exports"
    if lower == "net":
        return "Net imports"
    return text


def _normalise_mode(raw: str) -> str:
    text = raw.strip()
    lower = text.casefold()
    if lower == "pipeline":
        return "Pipeline"
    if lower == "lng":
        return "LNG"
    if lower == "total":
        return "Total"
    if lower == "net":
        return "Net"
    return text


def _assert_layout(ws: Worksheet) -> dict[int, int]:
    expected = {
        FLOW_COL: "Import/ export",
        MODE_COL: "Pipeline/ LNG",
        PARTNER_COL: "Country of origin/ destination",
    }
    for col, label in expected.items():
        got = _clean_label(ws.cell(HEADER_ROW, col).value)
        if got.casefold() != label.casefold():
            raise ValueError(
                f"DUKES 4.5a header col {col}: got {got!r}, expected {label!r}"
            )
    year_cols: dict[int, int] = {}
    for col in range(FIRST_YEAR_COL, (ws.max_column or FIRST_YEAR_COL) + 1):
        year = _parse_year_header(ws.cell(HEADER_ROW, col).value)
        if year is None:
            continue
        year_cols[col] = year
    if not year_cols:
        raise ValueError("No year columns found on DUKES 4.5a header row")
    return year_cols


def parse_dukes_45a_gas_trade(workbook_path: Path) -> list[Observation]:
    """Parse DUKES 4.5a gas imports/exports by partner (GWh)."""
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
        for row_idx in range(HEADER_ROW + 1, (ws.max_row or HEADER_ROW) + 1):
            flow_raw = _clean_label(ws.cell(row_idx, FLOW_COL).value)
            mode_raw = _clean_label(ws.cell(row_idx, MODE_COL).value)
            partner = _clean_label(ws.cell(row_idx, PARTNER_COL).value)
            if not flow_raw or not partner:
                continue

            flow = _normalise_flow(flow_raw)
            mode = _normalise_mode(mode_raw)
            partner_key = partner.casefold()
            is_aggregate = any(
                partner_key.startswith(agg) for agg in AGGREGATE_PARTNERS
            ) or mode in {"Total", "Net"}
            kind = "aggregate" if is_aggregate else "partner"

            for col, year in year_cols.items():
                value, missing_status = _parse_numeric_cell(ws.cell(row_idx, col).value)
                status: ObservationStatus = missing_status or "final"
                if value is None:
                    continue
                # Skip structural zeros for ordinary partner×mode cells.
                if value == 0.0 and not is_aggregate:
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
                            f"partner={partner}; flow={flow}; mode={mode}; "
                            f"kind={kind}; fuel=Gas"
                        ),
                    )
                )
        if not observations:
            raise ValueError(f"No gas-trade rows from {workbook_path}")
        return observations
    finally:
        wb.close()


class GasTradeByPartnerConnector(Connector):
    """DESNZ DUKES 4.5a UK gas imports/exports by partner country (GWh)."""

    def __init__(self, data_root: Path | None = None) -> None:
        root = data_root or (ENERGY_DATA / INDICATOR_ID)
        super().__init__(root)

    @property
    def indicator_id(self) -> str:
        return INDICATOR_ID

    def build_manifest(self, evidence: Sequence[RawEvidence]) -> Manifest:
        return Manifest(
            indicator_id=self.indicator_id,
            title="Gas trade by partner",
            sector="energy-industry",
            publisher="DESNZ",
            source_url=SOURCE_LANDING_URL,
            series_id="DUKES 4.5a (Natural gas imports and exports by country, GWh)",
            geography=(
                "United Kingdom (K02000001) as trading territory; partner countries "
                "are origin/destination labels in notes — not pipeline landfall coords"
            ),
            frequency="annual",
            unit="GWh",
            definition=(
                "UK annual natural gas Imports, Exports and Net imports in "
                "gigawatt-hours (GWh) by partner country and mode (Pipeline / LNG) "
                "from DUKES table 4.5a. notes use partner=<Country>; "
                "flow=Imports|Exports|Net imports; mode=Pipeline|LNG|Total|Net; "
                "kind=partner|aggregate; fuel=Gas. Zero partner cells omitted; "
                "publisher totals (Total pipeline / Total LNG / Total imports / "
                "Total exports / Net imports) kept as kind=aggregate."
            ),
            licence="Open Government Licence v3.0",
            agent_owner="energy",
            connector_module="energy.connectors.gas_trade_by_partner",
            curated_path="curated/observations.csv",
            update_cadence="Annual with DUKES natural gas chapter 4 (typically late July)",
            raw_evidence=list(evidence),
            transformations=(
                "Parse sheet 4.5a header row 6. Long-format: one CSV row per "
                "flow × mode × partner × year. Strip [note N] from labels. Omit "
                "ordinary partner zeros. Sheet 4.5b (facility capacity mm3/day) "
                "not ingested — static register, not annual trade flows."
            ),
            caveats=(
                "Partner labels are statistical country of origin/destination — not "
                "a pipeline landfall atlas (Langeled/BBL endpoints live only on 4.5b "
                "as descriptive text). From 2016 LNG methodology break (Note 2). "
                "Belgium pipeline note covers Bacton-Zeebrugge physical flows "
                "(Note 1). LNG Reloads are re-exports, not UK liquefaction (Note 4). "
                "Negative Net imports = net exporter (Note 5). Distinct from "
                "lng-imports-by-terminal (facility volumes) and "
                "energy-imports-and-exports (ET 1.3 all-fuels ktoe). OGL v3.0."
            ),
            revision_notes=(
                "DUKES_4.5.xlsx published 30 July 2026; years 2000–2025. Cover Sheet: "
                "revisions 1998–2024; 2025 LNG origin corrections (Brazil/Mexico → USA)."
            ),
            related_indicator_ids=[
                "lng-imports-by-terminal",
                "oil-imports-by-country",
                "energy-import-dependency",
                "electricity-interconnector-flows",
            ],
            open_questions=[
                "Optional separate indicator for DUKES 4.5b facility max flow rates "
                "(mm3/day) — capacity snapshot, not annual GWh.",
                "Authoritative GIS for pipeline UK landfalls (Bacton, Easington, "
                "St Fergus) — do not invent from 4.5b location text.",
            ],
        )

    def fetch_latest(self, *, retrieved_date: str | None = None) -> RawEvidence:
        day = retrieved_date or datetime.now(timezone.utc).date().isoformat()
        relative = f"raw/{day}/DUKES_4.5.xlsx"
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
        return parse_dukes_45a_gas_trade(workbook)


def main() -> None:
    connector = GasTradeByPartnerConnector()
    evidence = connector.fetch_latest()
    observations = connector.transform([evidence])
    manifest_path, curated_path = connector.write_hand_off([evidence], observations)
    partners = sorted(
        {
            part.removeprefix("partner=")
            for obs in observations
            for part in obs.notes.split("; ")
            if part.startswith("partner=") and "kind=partner" in obs.notes
        }
    )
    years = sorted({obs.period_start[:4] for obs in observations})
    print(f"indicator_id: {connector.indicator_id}")
    print(f"raw: {evidence.path} sha256={evidence.checksum_sha256}")
    print(f"observations: {len(observations)}")
    print(f"years: {years[0]}–{years[-1]} ({len(years)} years)")
    print(f"partners (kind=partner): {len(partners)}")
    print(f"manifest: {manifest_path}")
    print(f"curated: {curated_path}")


if __name__ == "__main__":
    main()
