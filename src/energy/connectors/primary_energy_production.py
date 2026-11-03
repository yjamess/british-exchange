"""DESNZ Energy Trends ET 1.1 — indigenous production of primary fuels (Mtoe).

Approach (plain language):
1. Prefer the pinned raw XLSX under data/energy/.../raw/ (immutable evidence).
2. Parse the Month sheet long-format: one Observation per fuel × calendar month.
3. Put the fuel in notes as fuel=<Label>; Total is an aggregate (do not stack it).
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

PINNED_RAW_RELATIVE = "raw/2026-11-03/ET_1.1_OCT_26.xlsx"
SOURCE_LANDING_URL = (
    "https://www.gov.uk/government/statistics/total-energy-section-1-energy-trends"
)
PINNED_ASSET_URL = (
    "https://assets.publishing.service.gov.uk/media/"
    "6ae0c9f87cf9b224890467db/ET_1.1_OCT_26.xlsx"
)
OFFICIAL_RELEASE_DATE = "2026-10-29"
SOURCE_VERSION = "ET_1.1_OCT_26"

MONTH_SHEET = "Month"
HEADER_ROW = 6  # 1-based: Month | Total | Coal | ...
MONTH_RE = re.compile(
    r"^(January|February|March|April|May|June|July|August|September|"
    r"October|November|December)\s+(\d{4})(?:\s*\[([^\]]+)\])?\s*$",
    re.IGNORECASE,
)
NOTE_MARKER_RE = re.compile(r"\s*\[note\s+\d+\]", re.IGNORECASE)
MISSING_MARKERS = {"[x]", "[z]", "..", "…"}

MONTH_NAME_TO_NUM = {
    name.lower(): idx
    for idx, name in enumerate(calendar.month_name)
    if name
}


def _clean_fuel_header(raw: object) -> str:
    """Strip DESNZ [note N] markers from column headers."""
    text = str(raw).strip()
    text = NOTE_MARKER_RE.sub("", text)
    return " ".join(text.split())


def _month_bounds(year: int, month: int) -> tuple[str, str]:
    last = calendar.monthrange(year, month)[1]
    return f"{year:04d}-{month:02d}-01", f"{year:04d}-{month:02d}-{last:02d}"


def _parse_month_label(raw: object) -> tuple[str, str, ObservationStatus] | None:
    if raw is None:
        return None
    text = str(raw).strip()
    match = MONTH_RE.match(text)
    if not match:
        return None
    month = MONTH_NAME_TO_NUM[match.group(1).lower()]
    year = int(match.group(2))
    flag = (match.group(3) or "").strip().lower()
    start, end = _month_bounds(year, month)
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


def parse_et11_month_production_mtoe(workbook_path: Path) -> list[Observation]:
    """Parse Month sheet → observations (Mtoe, one row per fuel × month)."""
    wb = openpyxl.load_workbook(workbook_path, data_only=True, read_only=False)
    try:
        if MONTH_SHEET not in wb.sheetnames:
            raise ValueError(
                f"Expected sheet {MONTH_SHEET!r} in {workbook_path.name}; "
                f"got {wb.sheetnames}"
            )
        ws: Worksheet = wb[MONTH_SHEET]
        headers: list[str] = []
        for col in range(1, (ws.max_column or 1) + 1):
            cell = ws.cell(HEADER_ROW, col).value
            if cell is None or not str(cell).strip():
                break
            headers.append(_clean_fuel_header(cell))
        if not headers or headers[0].casefold() != "month":
            raise ValueError(
                f"Unexpected Month header row {HEADER_ROW}: {headers[:8]!r}"
            )
        fuels = headers[1:]
        if "Total" not in fuels:
            raise ValueError(f"Expected Total column among fuels: {fuels!r}")

        observations: list[Observation] = []
        for row_idx in range(HEADER_ROW + 1, (ws.max_row or HEADER_ROW) + 1):
            period = _parse_month_label(ws.cell(row_idx, 1).value)
            if period is None:
                continue
            period_start, period_end, row_status = period
            for fuel_offset, fuel in enumerate(fuels, start=2):
                value, missing_status = _parse_numeric_cell(
                    ws.cell(row_idx, fuel_offset).value
                )
                status: ObservationStatus = missing_status or row_status
                observations.append(
                    Observation(
                        indicator_id="primary-energy-production",
                        period_start=period_start,
                        period_end=period_end,
                        geography_code=UK_GEOGRAPHY_CODE,
                        geography_label=UK_GEOGRAPHY_LABEL,
                        value=value,
                        unit="Mtoe",
                        observation_status=status,
                        source_version=SOURCE_VERSION,
                        notes=f"fuel={fuel}",
                    )
                )
        if not observations:
            raise ValueError(f"No monthly rows parsed from {workbook_path}")
        return observations
    finally:
        wb.close()


class PrimaryEnergyProductionConnector(Connector):
    """DESNZ indigenous production of primary fuels (ET 1.1)."""

    def __init__(self, data_root: Path | None = None) -> None:
        root = data_root or (ENERGY_DATA / "primary-energy-production")
        super().__init__(root)

    @property
    def indicator_id(self) -> str:
        return "primary-energy-production"

    def build_manifest(self, evidence: Sequence[RawEvidence]) -> Manifest:
        return Manifest(
            indicator_id=self.indicator_id,
            title="Primary energy production",
            sector="energy-industry",
            publisher="DESNZ",
            source_url=SOURCE_LANDING_URL,
            series_id="ET 1.1 (Indigenous production of primary fuels, Mtoe)",
            geography="UK (K02000001)",
            frequency="monthly",
            unit="Mtoe",
            definition=(
                "UK indigenous production of primary fuels in million tonnes of oil "
                "equivalent (Mtoe) from Energy Trends table ET 1.1 Month sheet. "
                "One observation per fuel × calendar month; fuel label in notes as "
                "fuel=<Label>. Indigenous production = extraction/capture of primary "
                "fuels (oil, gas, coal, bioenergy & waste, primary electricity)."
            ),
            licence="Open Government Licence v3.0",
            agent_owner="energy",
            connector_module="energy.connectors.primary_energy_production",
            curated_path="curated/observations.csv",
            update_cadence=(
                "Monthly — Energy Trends ET 1.1, last Thursday of each month "
                "(data two months in arrears)"
            ),
            raw_evidence=list(evidence),
            notion_registry_url="https://app.notion.com/40d654717685819db323cce12ec97c72",
            transformations=(
                "Parse Month sheet from header row (Month + fuel columns). Strip "
                "[note N] from fuel headers. Long-format: one CSV row per fuel × "
                "month. Map [x] → value null + observation_status=missing. Period "
                "labels containing [provisional] → observation_status=provisional. "
                "Quarter and Annual sheets not ingested in this hand-off."
            ),
            caveats=(
                "Unit is Mtoe (not TWh). Nuclear and wind/solar/hydro use IEA heat "
                "content conventions (see workbook Note 7). Bioenergy & waste as a "
                "separate category from March 2014. fuel=Total is an aggregate — "
                "never sum with component fuels (API include_aggregates=false). "
                "Distinct from Domestic gas production (ET 4.x) and Historical coal "
                "(DUKES). GOV.UK asset URLs change each release; pin checksummed raw."
            ),
            revision_notes=(
                "ET_1.1_OCT_26 published 29 Oct 2026; data through August 2026; "
                "revisions period July 2026 per cover sheet."
            ),
            open_questions=[
                "Optional: also curate Quarter sheet for quarterly charts.",
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
        return parse_et11_month_production_mtoe(workbook)


def main() -> None:
    connector = PrimaryEnergyProductionConnector()
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
