"""DESNZ Energy Trends ET 1.3 — UK energy import dependency (ratio).

Approach (plain language):
1. Prefer the pinned raw XLSX under data/energy/.../raw/ (immutable evidence).
2. Parse Annual + Quarter 'dependency & low carbon' sheets for Import dependency.
3. Keep workbook values as ratios (0.43 ≈ 43%); negative = net exporter years.
4. notes use basis=annual|quarterly so loaders can filter without inventing fuels.
5. Write curated CSV + manifest via Connector.write_hand_off.

Best practices:
- pathlib.Path (https://docs.python.org/3/library/pathlib.html)
- type hints (https://docs.python.org/3/library/typing.html)
- Fail loudly on missing sheets / unexpected headers; never invent numbers.
- Dependency is not a vulnerability score (Domain 05 statistical safeguard).
"""

from __future__ import annotations

import calendar
import re
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

PINNED_RAW_RELATIVE = "raw/2026-11-03/ET_1.3_SEP_26.xlsx"
# Same release already QA'd for Ready energy-imports-and-exports — copy, don't re-download.
SIBLING_RAW = (
    ENERGY_DATA / "energy-imports-and-exports" / PINNED_RAW_RELATIVE
)
SOURCE_LANDING_URL = (
    "https://www.gov.uk/government/statistics/total-energy-section-1-energy-trends"
)
PINNED_ASSET_URL = (
    "https://assets.publishing.service.gov.uk/media/"
    "6abe1eb626660e5f62a7f1d3/ET_1.3_SEP_26.xlsx"
)
OFFICIAL_RELEASE_DATE = "2026-09-29"
SOURCE_VERSION = "ET_1.3_SEP_26"
EXPECTED_CHECKSUM = (
    "7e3d230e7cdcc45f3eef2b1ec5c866a30ffc26218fdd486cbae59f55eb34bf81"
)

ANNUAL_SHEET = "Annual dependency & low carbon"
QUARTER_SHEET = "Quarter dependency & low carbon"
HEADER_ROW = 5
IMPORT_DEPENDENCY_COL = 16  # 'Import dependency [note 6]'
YEAR_COL = 1
QUARTER_COL = 1

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


def _year_bounds(year: int) -> tuple[str, str]:
    return f"{year:04d}-01-01", f"{year:04d}-12-31"


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


def _parse_year_label(raw: object) -> tuple[str, str, ObservationStatus] | None:
    if raw is None:
        return None
    if isinstance(raw, (int, float)):
        year = int(raw)
        return (*_year_bounds(year), "final")
    text = str(raw).strip()
    match = re.match(r"^(\d{4})(?:\s*\[([^\]]+)\])?\s*$", text)
    if not match:
        return None
    year = int(match.group(1))
    flag = (match.group(2) or "").strip().lower()
    status: ObservationStatus = "provisional" if "provisional" in flag else "final"
    return (*_year_bounds(year), status)


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


def _assert_dependency_header(ws: Worksheet, *, period_header: str) -> None:
    got_period = str(ws.cell(HEADER_ROW, YEAR_COL).value or "").strip()
    if got_period.casefold() != period_header.casefold():
        raise ValueError(
            f"Expected period header {period_header!r} at col 1; got {got_period!r}"
        )
    got_dep = str(ws.cell(HEADER_ROW, IMPORT_DEPENDENCY_COL).value or "").strip()
    if "import dependency" not in got_dep.casefold():
        raise ValueError(
            f"Expected Import dependency header at col {IMPORT_DEPENDENCY_COL}; "
            f"got {got_dep!r}"
        )


def parse_et13_import_dependency(workbook_path: Path) -> list[Observation]:
    """Parse annual + quarterly Import dependency ratios from ET 1.3."""
    wb = openpyxl.load_workbook(workbook_path, data_only=True, read_only=False)
    try:
        for sheet in (ANNUAL_SHEET, QUARTER_SHEET):
            if sheet not in wb.sheetnames:
                raise ValueError(
                    f"Expected sheet {sheet!r} in {workbook_path.name}; "
                    f"got {wb.sheetnames}"
                )

        observations: list[Observation] = []

        annual: Worksheet = wb[ANNUAL_SHEET]
        _assert_dependency_header(annual, period_header="Year")
        for row_idx in range(HEADER_ROW + 1, (annual.max_row or HEADER_ROW) + 1):
            period = _parse_year_label(annual.cell(row_idx, YEAR_COL).value)
            if period is None:
                continue
            period_start, period_end, row_status = period
            value, missing_status = _parse_numeric_cell(
                annual.cell(row_idx, IMPORT_DEPENDENCY_COL).value
            )
            status: ObservationStatus = missing_status or row_status
            observations.append(
                Observation(
                    indicator_id="energy-import-dependency",
                    period_start=period_start,
                    period_end=period_end,
                    geography_code=UK_GEOGRAPHY_CODE,
                    geography_label=UK_GEOGRAPHY_LABEL,
                    value=value,
                    unit="ratio",
                    observation_status=status,
                    source_version=SOURCE_VERSION,
                    notes="measure=import_dependency; basis=annual",
                )
            )

        quarterly: Worksheet = wb[QUARTER_SHEET]
        _assert_dependency_header(quarterly, period_header="Quarter")
        for row_idx in range(HEADER_ROW + 1, (quarterly.max_row or HEADER_ROW) + 1):
            period = _parse_quarter_label(quarterly.cell(row_idx, QUARTER_COL).value)
            if period is None:
                continue
            period_start, period_end, row_status = period
            value, missing_status = _parse_numeric_cell(
                quarterly.cell(row_idx, IMPORT_DEPENDENCY_COL).value
            )
            status = missing_status or row_status
            observations.append(
                Observation(
                    indicator_id="energy-import-dependency",
                    period_start=period_start,
                    period_end=period_end,
                    geography_code=UK_GEOGRAPHY_CODE,
                    geography_label=UK_GEOGRAPHY_LABEL,
                    value=value,
                    unit="ratio",
                    observation_status=status,
                    source_version=SOURCE_VERSION,
                    notes="measure=import_dependency; basis=quarterly",
                )
            )

        if not observations:
            raise ValueError(f"No import dependency rows parsed from {workbook_path}")
        return observations
    finally:
        wb.close()


class EnergyImportDependencyConnector(Connector):
    """DESNZ UK energy import dependency ratio (ET 1.3)."""

    def __init__(self, data_root: Path | None = None) -> None:
        root = data_root or (ENERGY_DATA / "energy-import-dependency")
        super().__init__(root)

    @property
    def indicator_id(self) -> str:
        return "energy-import-dependency"

    def ensure_pinned_raw(self) -> Path:
        """Copy sibling Ready raw if missing; refuse checksum drift."""
        target = self.data_root / PINNED_RAW_RELATIVE
        if not target.is_file():
            if not SIBLING_RAW.is_file():
                raise FileNotFoundError(
                    f"Pinned raw missing at {target} and sibling {SIBLING_RAW}. "
                    "Restore energy-imports-and-exports raw or re-fetch ET 1.3."
                )
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(SIBLING_RAW, target)
        checksum = sha256_file(target)
        if checksum != EXPECTED_CHECKSUM:
            raise RuntimeError(
                f"Pinned raw checksum mismatch for {target}: "
                f"got {checksum}, expected {EXPECTED_CHECKSUM}"
            )
        return target

    def build_manifest(self, evidence: Sequence[RawEvidence]) -> Manifest:
        return Manifest(
            indicator_id=self.indicator_id,
            title="Energy import dependency",
            sector="energy-industry",
            publisher="DESNZ",
            source_url=SOURCE_LANDING_URL,
            series_id=(
                "ET 1.3 (Import dependency, ratio, annual + quarterly)"
            ),
            geography="UK (K02000001)",
            frequency="annual+quarterly",
            unit="ratio",
            definition=(
                "UK energy import dependency from Energy Trends table ET 1.3 sheets "
                "'Annual dependency & low carbon' and 'Quarter dependency & low carbon', "
                "column 'Import dependency [note 6]'. Values are workbook ratios "
                "(e.g. 0.43 ≈ 43%); negative values mean net exports relative to the "
                "DESNZ denominator. Notes: measure=import_dependency; "
                "basis=annual|quarterly. This is not a vulnerability or resilience score."
            ),
            licence="Open Government Licence v3.0",
            agent_owner="energy",
            connector_module="energy.connectors.energy_import_dependency",
            curated_path="curated/observations.csv",
            update_cadence=(
                "Quarterly — Energy Trends ET 1.3, last Thursday of Mar/Jun/Sep/Dec "
                "(data one quarter in arrears)"
            ),
            raw_evidence=list(evidence),
            notion_registry_url=(
                "https://app.notion.com/41165471768581f1b20de3b144f17d52"
            ),
            transformations=(
                "Parse Import dependency [note 6] from Annual and Quarter dependency "
                "& low carbon sheets. Preserve Excel decimal ratios (do not ×100). "
                "Long-format: one CSV row per period × basis. Map [x] → missing. "
                "Fossil fuel dependency and low carbon share columns not ingested."
            ),
            caveats=(
                "Unit is ratio as stored by DESNZ (not percentage points). Negative "
                "dependency = net exporter period. All-fuels aggregate only — not by "
                "fuel. Dependency ≠ supply vulnerability, price exposure, or diversity. "
                "Same workbook as Ready energy-imports-and-exports; distinct indicator. "
                "GOV.UK asset URLs change each release."
            ),
            revision_notes=(
                "ET_1.3_SEP_26 published 29 Sep 2026; Q2 2026 marked provisional on "
                "quarter sheet."
            ),
            related_indicator_ids=["energy-imports-and-exports"],
            open_questions=[
                "Gate 3: by-fuel dependency / long-run fuel-split trade.",
                "Gate 3: NESO interconnector flows and capacities.",
            ],
        )

    def evidence_from_pinned_raw(self) -> RawEvidence:
        path = self.ensure_pinned_raw()
        relative = PINNED_RAW_RELATIVE
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
        return parse_et13_import_dependency(workbook)


def main() -> None:
    connector = EnergyImportDependencyConnector()
    evidence = connector.evidence_from_pinned_raw()
    observations = connector.transform([evidence])
    manifest_path, curated_path = connector.write_hand_off([evidence], observations)
    annual = sum(1 for o in observations if "basis=annual" in o.notes)
    quarterly = sum(1 for o in observations if "basis=quarterly" in o.notes)
    print(f"indicator_id: {connector.indicator_id}")
    print(f"raw: {evidence.path} sha256={evidence.checksum_sha256}")
    print(f"observations: {len(observations)} (annual={annual}, quarterly={quarterly})")
    print(f"manifest: {manifest_path}")
    print(f"curated: {curated_path}")


if __name__ == "__main__":
    main()
