"""DESNZ Energy Trends ET 5.6 — UK electricity interconnector flows (GWh).

Approach (plain language):
1. Prefer the pinned raw XLSX under data/energy/.../raw/ (immutable evidence).
2. Parse 'Quarterly imports and exports': one Observation per corridor × flow × quarter.
3. Put corridor= and flow= in notes so loaders can filter without inventing topology.
4. Keep [x] as missing; mark provisional quarters from the Quarter label.
5. Write curated CSV + manifest via Connector.write_hand_off.

Why this series (Wave B2):
- Official OGL quarterly electricity trade by interconnector corridor.
- Complements (does not fork) energy-imports-and-exports (ET 1.3 ktoe all-fuels)
  and gb-generation-mix-half-hourly (GB NESO Imports fuel component).

Best practices:
- pathlib.Path (https://docs.python.org/3/library/pathlib.html)
- type hints (https://docs.python.org/3/library/typing.html)
- Fail loudly on missing sheets / unexpected headers; never invent numbers.
"""

from __future__ import annotations

import calendar
import json
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

PINNED_RAW_RELATIVE = "raw/2026-11-07/ET_5.6_SEP_26.xlsx"
PINNED_META_RELATIVE = "raw/2026-11-07/retrieval.json"
SOURCE_LANDING_URL = (
    "https://www.gov.uk/government/statistics/electricity-section-5-energy-trends"
)
PINNED_ASSET_URL = (
    "https://assets.publishing.service.gov.uk/media/"
    "6aba6e128cb3c0580e50128a/ET_5.6_SEP_26.xlsx"
)
OFFICIAL_RELEASE_DATE = "2026-09-29"
SOURCE_VERSION = "ET_5.6_SEP_26"
EXPECTED_CHECKSUM = (
    "f9ce73f5adaec1f84cb463479567964f185733c1eed1d506075ce6328b9c46f9"
)

QUARTER_SHEET = "Quarterly imports and exports"
HEADER_ROW = 6

# (column_index, corridor_id, flow_label) — 1-based openpyxl columns.
# France = IFA + IFA2 + ElecLink combined (ET 5.6 Note 2).
MEASURE_COLUMNS: tuple[tuple[int, str, str], ...] = (
    (3, "UK-total", "Imports"),
    (4, "UK-total", "Exports"),
    (5, "UK-total", "Net imports"),
    (6, "France-UK", "Imports"),
    (7, "France-UK", "Exports"),
    (8, "France-UK", "Net imports"),
    (9, "Ireland-NI", "Imports"),
    (10, "Ireland-NI", "Exports"),
    (11, "Ireland-NI", "Net imports"),
    (12, "Netherlands-UK", "Imports"),
    (13, "Netherlands-UK", "Exports"),
    (14, "Netherlands-UK", "Net imports"),
    (15, "Ireland-Wales", "Imports"),
    (16, "Ireland-Wales", "Exports"),
    (17, "Ireland-Wales", "Net imports"),
    (18, "Belgium-UK", "Imports"),
    (19, "Belgium-UK", "Exports"),
    (20, "Belgium-UK", "Net imports"),
    (21, "Norway-UK", "Imports"),
    (22, "Norway-UK", "Exports"),
    (23, "Norway-UK", "Net imports"),
    (24, "Denmark-UK", "Imports"),
    (25, "Denmark-UK", "Exports"),
    (26, "Denmark-UK", "Net imports"),
)

EXPECTED_HEADERS: dict[int, str] = {
    1: "Year",
    2: "Quarter",
    3: "UK total imports",
    4: "UK total exports",
    5: "UK total net imports",
    6: "Imports \n(France to UK) [note 2]",
    7: "Exports \n(UK to France) [note 2]",
    8: "Net imports\n(France to UK) [note 2]",
    9: "Imports\n(Ireland to NI)",
    10: "Exports\n(NI to Ireland)",
    11: "Net imports\n(Ireland to NI)",
    12: "Imports\n(Netherlands to UK)",
    13: "Exports\n(UK to Netherlands)",
    14: "Net imports\n(Netherlands to UK)",
    15: "Imports\n(Ireland to Wales)",
    16: "Exports\n(Wales to Ireland)",
    17: "Net imports\n(Ireland to Wales)",
    18: "Imports\n(Belgium to UK) [note 3]",
    19: "Exports\n(UK to Belgium) [note 3]",
    20: "Net imports\n(Belgium to UK) [note 3]",
    21: "Imports\n(Norway to UK) [note 4]",
    22: "Exports\n(UK to Norway) [note 4]",
    23: "Net imports\n(Norway to UK) [note 4]",
    24: "Imports\n(Denmark to UK) [note 7]",
    25: "Exports\n(UK to Denmark) [note 7]",
    26: "Net imports\n(Denmark to UK) [note 7]",
}

QUARTER_RE = re.compile(
    r"^Quarter\s+([1-4])\s*(?:\[([^\]]+)\])?\s*$",
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


def _parse_year(raw: object) -> int | None:
    if raw is None:
        return None
    if isinstance(raw, (int, float)):
        return int(raw)
    text = str(raw).strip()
    match = re.match(r"^(\d{4})", text)
    if not match:
        return None
    return int(match.group(1))


def _parse_quarter_label(raw: object) -> tuple[int, ObservationStatus] | None:
    if raw is None:
        return None
    text = str(raw).strip()
    match = QUARTER_RE.match(text)
    if not match:
        return None
    quarter = int(match.group(1))
    flag = (match.group(2) or "").strip().lower()
    status: ObservationStatus = "provisional" if "provisional" in flag else "final"
    return quarter, status


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
    # Percent-change rows use '(+)' etc. — treat as non-numeric.
    if text.startswith("(") or "%" in text:
        return None, "missing"
    try:
        return float(text.replace(",", "")), None
    except ValueError:
        return None, "missing"


def _normalise_header(value: object) -> str:
    return str(value or "").replace("\r\n", "\n").strip()


def _assert_headers(ws: Worksheet) -> None:
    for col, expected in EXPECTED_HEADERS.items():
        got = _normalise_header(ws.cell(HEADER_ROW, col).value)
        if got != expected:
            raise ValueError(
                f"ET 5.6 header mismatch at col {col}: expected {expected!r}, got {got!r}"
            )


def parse_et56_quarterly_gwh(workbook_path: Path) -> list[Observation]:
    """Parse quarterly interconnector Imports/Exports/Net imports (GWh)."""
    wb = openpyxl.load_workbook(workbook_path, data_only=True, read_only=False)
    try:
        if QUARTER_SHEET not in wb.sheetnames:
            raise ValueError(
                f"Expected sheet {QUARTER_SHEET!r} in {workbook_path.name}; "
                f"got {wb.sheetnames}"
            )
        ws = wb[QUARTER_SHEET]
        _assert_headers(ws)

        observations: list[Observation] = []
        for row in range(HEADER_ROW + 1, ws.max_row + 1):
            year = _parse_year(ws.cell(row, 1).value)
            quarter_parsed = _parse_quarter_label(ws.cell(row, 2).value)
            if year is None or quarter_parsed is None:
                continue
            quarter, row_status = quarter_parsed
            period_start, period_end = _quarter_bounds(year, quarter)

            for col, corridor, flow in MEASURE_COLUMNS:
                value, missing_status = _parse_numeric_cell(ws.cell(row, col).value)
                status: ObservationStatus = missing_status or row_status
                observations.append(
                    Observation(
                        indicator_id="electricity-interconnector-flows",
                        period_start=period_start,
                        period_end=period_end,
                        geography_code=UK_GEOGRAPHY_CODE,
                        geography_label=UK_GEOGRAPHY_LABEL,
                        value=value,
                        unit="GWh",
                        observation_status=status,
                        source_version=SOURCE_VERSION,
                        notes=f"corridor={corridor}; flow={flow}",
                    )
                )

        if not observations:
            raise ValueError(f"No quarterly interconnector rows parsed from {workbook_path}")
        return observations
    finally:
        wb.close()


class ElectricityInterconnectorFlowsConnector(Connector):
    """DESNZ ET 5.6 UK electricity imports/exports by interconnector (GWh)."""

    def __init__(self, data_root: Path | None = None) -> None:
        root = data_root or (ENERGY_DATA / "electricity-interconnector-flows")
        super().__init__(root)

    @property
    def indicator_id(self) -> str:
        return "electricity-interconnector-flows"

    def build_manifest(self, evidence: Sequence[RawEvidence]) -> Manifest:
        return Manifest(
            indicator_id=self.indicator_id,
            title="Electricity interconnector flows",
            sector="energy-industry",
            publisher="DESNZ",
            source_url=SOURCE_LANDING_URL,
            series_id="ET 5.6 (Quarterly imports and exports, GWh, by corridor)",
            geography=(
                "UK (K02000001); includes NI–Republic of Ireland. "
                "Not GB-only NESO operational geography."
            ),
            frequency="quarterly",
            unit="GWh",
            definition=(
                "UK electricity Imports, Exports and Net imports in gigawatt-hours "
                "(GWh) from Energy Trends table ET 5.6 sheet "
                "'Quarterly imports and exports'. One observation per corridor × "
                "flow × calendar quarter. Corridors: UK-total, France-UK (IFA+IFA2+"
                "ElecLink per Note 2), Ireland-NI, Netherlands-UK, Ireland-Wales, "
                "Belgium-UK, Norway-UK, Denmark-UK. notes use corridor=<id>; "
                "flow=Imports|Exports|Net imports."
            ),
            licence="Open Government Licence v3.0",
            agent_owner="energy",
            connector_module="energy.connectors.electricity_interconnector_flows",
            curated_path="curated/observations.csv",
            update_cadence=(
                "Quarterly — Energy Trends ET 5.6 with section 5 electricity tables, "
                "last Thursday of Mar/Jun/Sep/Dec (data one quarter in arrears)"
            ),
            raw_evidence=list(evidence),
            notion_registry_url=(
                "https://app.notion.com/4116547176858128b5cde0c291d4674c"
            ),
            transformations=(
                "Parse Quarterly imports and exports header row 6. Long-format: one "
                "CSV row per corridor × flow × quarter. Map [x] → missing. Preserve "
                "publisher Net imports (can be negative). Annual sheet and ET 5.6B "
                "internal transfers not ingested in this hand-off."
            ),
            caveats=(
                "France-UK is the published sum of three interconnectors (Note 2), "
                "not a single cable. Geography is UK Official Statistics — do not "
                "blend with GB NESO half-hourly Imports without a labelled break. "
                "Distinct from ET 1.3 all-fuels ktoe trade "
                "(energy-imports-and-exports). Internal Scotland↔England / "
                "Scotland↔NI transfers live on separate ET 5.6B sheets (Gate 3). "
                "GOV.UK asset URLs change each release."
            ),
            revision_notes=(
                "ET_5.6_SEP_26 published 29 Sep 2026; latest quarter "
                "2026-Q2 marked provisional in source."
            ),
            related_indicator_ids=[
                "gb-generation-mix-half-hourly",
                "energy-imports-and-exports",
            ],
            open_questions=[
                "Optional annual sheet companion or ET 5.6B internal transfers series.",
                "NESO Interconnector Register MW capacity as separate capacity indicator.",
                "Thermal constraint costs (NESO) for Where Power Bottlenecks — Gate 3.",
            ],
        )

    def evidence_from_pinned_raw(self) -> RawEvidence:
        path = self.data_root / PINNED_RAW_RELATIVE
        if not path.is_file():
            raise FileNotFoundError(
                f"Pinned raw workbook missing: {path}. Re-run fetch or restore pin."
            )
        checksum = sha256_file(path)
        if checksum != EXPECTED_CHECKSUM:
            raise ValueError(
                f"Pinned checksum mismatch for {path.name}: "
                f"got {checksum}, expected {EXPECTED_CHECKSUM}"
            )
        retrieved = datetime.now(timezone.utc).isoformat()
        source_url = PINNED_ASSET_URL
        meta_path = self.data_root / PINNED_META_RELATIVE
        if meta_path.is_file():
            meta = json.loads(meta_path.read_text(encoding="utf-8"))
            retrieved = str(meta.get("retrieved_at") or retrieved)
            source_url = str(meta.get("source_url") or source_url)
        return RawEvidence(
            path=PINNED_RAW_RELATIVE,
            retrieved_at=retrieved,
            checksum_sha256=checksum,
            content_type=(
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            ),
            official_release_date=OFFICIAL_RELEASE_DATE,
            http_status=200,
            source_url=source_url,
        )

    def transform(self, evidence: Sequence[RawEvidence]) -> list[Observation]:
        if not evidence:
            raise ValueError("transform() requires at least one RawEvidence entry")
        workbook = self.data_root / evidence[0].path
        if not workbook.is_file():
            raise FileNotFoundError(f"Raw workbook not found: {workbook}")
        return parse_et56_quarterly_gwh(workbook)


def main() -> None:
    """Pinned raw → curated quarterly observations + manifest."""
    connector = ElectricityInterconnectorFlowsConnector()
    evidence = connector.evidence_from_pinned_raw()
    observations = connector.transform([evidence])
    manifest_path, curated_path = connector.write_hand_off([evidence], observations)
    valued = sum(1 for obs in observations if obs.value is not None)
    corridors = sorted(
        {
            part.removeprefix("corridor=")
            for obs in observations
            for part in obs.notes.split("; ")
            if part.startswith("corridor=")
        }
    )
    print(f"indicator_id: {connector.indicator_id}")
    print(f"raw: {evidence.path} sha256={evidence.checksum_sha256}")
    print(f"observations: {len(observations)} (valued={valued})")
    print(f"corridors ({len(corridors)}): {', '.join(corridors)}")
    print(f"manifest: {manifest_path}")
    print(f"curated: {curated_path}")


if __name__ == "__main__":
    main()
