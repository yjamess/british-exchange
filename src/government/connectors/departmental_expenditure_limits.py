"""Total Departmental Expenditure Limits — HMT PESA Table 1.9.

Approach:
1. Pin PESA Chapter 1 tables workbook.
2. Read Table_1_9 Total DEL cash (£ million) — Total DEL row only (UK aggregate).
3. Emit annual fiscal-year observations (outturn + plans flagged in notes).
"""

from __future__ import annotations

from pathlib import Path
from typing import Sequence

import openpyxl

from britain_exchange.connector import Connector
from britain_exchange.manifest import Manifest, RawEvidence
from britain_exchange.observation import Observation, ObservationStatus
from britain_exchange.paths import GOVERNMENT_DATA
from government.connectors._util import evidence_from_file, fiscal_year_bounds

INDICATOR_ID = "departmental-expenditure-limits"
UK_CODE, UK_LABEL = "K02000001", "United Kingdom"
PINNED = "raw/2026-11-03/PESA_2026_CP_Chapter_1_tables.xlsx"
SOURCE_LANDING = (
    "https://www.gov.uk/government/statistics/public-expenditure-statistical-analyses-2026"
)
SOURCE_ASSET = (
    "https://assets.publishing.service.gov.uk/media/"
    "6a57728b822fbe6b8245c9a1/PESA_2026_CP_Chapter_1_tables.xlsx"
)
UNIT = "£ million (cash Total DEL)"
SOURCE_VERSION = "PESA 2026 Table 1.9"


def parse_total_del(path: Path) -> list[Observation]:
    wb = openpyxl.load_workbook(path, data_only=True)
    try:
        ws = wb["Table_1_9"]
        years = [ws.cell(4, c).value for c in range(2, 12)]
        kinds = [ws.cell(5, c).value for c in range(2, 12)]
        total_row = None
        for row in range(1, (ws.max_row or 1) + 1):
            label = ws.cell(row, 1).value
            if label and str(label).strip() == "Total DEL":
                total_row = row
                break
        if total_row is None:
            raise ValueError("Total DEL row not found in Table_1_9")

        observations: list[Observation] = []
        for col_offset, year_label in enumerate(years):
            if year_label is None:
                continue
            label = str(year_label).strip()
            if not label or not label[:4].isdigit():
                continue
            raw = ws.cell(total_row, col_offset + 2).value
            if raw is None or raw == "-" or raw == "":
                continue
            kind = str(kinds[col_offset] or "").strip().lower()
            status: ObservationStatus = "provisional" if "plan" in kind else "final"
            start, end = fiscal_year_bounds(label)
            observations.append(
                Observation(
                    indicator_id=INDICATOR_ID,
                    period_start=start,
                    period_end=end,
                    geography_code=UK_CODE,
                    geography_label=UK_LABEL,
                    value=float(raw),
                    unit=UNIT,
                    observation_status=status,
                    source_version=SOURCE_VERSION,
                    notes=f"series=PESA Table 1.9; fiscal_year={label}; kind={kind or 'unknown'}",
                )
            )
        if not observations:
            raise ValueError("No Total DEL values parsed")
        return observations
    finally:
        wb.close()


class DepartmentalExpenditureLimitsConnector(Connector):
    def __init__(self, data_root: Path | None = None) -> None:
        super().__init__(data_root or (GOVERNMENT_DATA / INDICATOR_ID))

    @property
    def indicator_id(self) -> str:
        return INDICATOR_ID

    def build_manifest(self, evidence: Sequence[RawEvidence]) -> Manifest:
        return Manifest(
            indicator_id=self.indicator_id,
            title="Departmental expenditure limits",
            sector="government-politics",
            publisher="HM Treasury",
            source_url=SOURCE_LANDING,
            series_id="PESA Table 1.9 Total Departmental Expenditure Limits (cash)",
            geography="United Kingdom (K02000001); departmental groups aggregate",
            frequency="annual",
            unit=UNIT,
            definition=(
                "UK Total Departmental Expenditure Limits (Total DEL) in cash "
                "£ million from HMT Public Expenditure Statistical Analyses "
                "Table 1.9. Resource DEL + Capital DEL aggregate (see table notes)."
            ),
            licence="Open Government Licence v3.0",
            agent_owner="government",
            connector_module="government.connectors.departmental_expenditure_limits",
            curated_path="curated/observations.csv",
            update_cadence="annual (PESA, typically July)",
            raw_evidence=list(evidence),
            notion_registry_url="https://app.notion.com/40d654717685816695ecf1915b9d206e",
            transformations=(
                "Parse Table_1_9; keep Total DEL row only (not departmental groups). "
                "Map fiscal year labels to 1 Apr–31 Mar ISO bounds. Plans → provisional."
            ),
            caveats=(
                "Distinct from Economy Total Managed Expenditure (TME). Real-terms "
                "counterpart is Table 1.10 (not ingested here). Plans years revise."
            ),
            related_indicator_ids=[],
            revision_notes="PESA 2026 Chapter 1 tables pinned 2026-11-03.",
        )

    def evidence_from_pinned_raw(self) -> RawEvidence:
        return evidence_from_file(
            self.data_root,
            PINNED,
            source_url=SOURCE_ASSET,
            content_type=(
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            ),
            official_release_date="2026-07-16",
        )

    def transform(self, evidence: Sequence[RawEvidence]) -> list[Observation]:
        if not evidence:
            raise ValueError("transform() requires RawEvidence")
        return parse_total_del(self.data_root / evidence[0].path)


def main() -> None:
    connector = DepartmentalExpenditureLimitsConnector()
    evidence = connector.evidence_from_pinned_raw()
    observations = connector.transform([evidence])
    manifest_path, curated_path = connector.write_hand_off([evidence], observations)
    print(f"indicator_id: {connector.indicator_id} rows={len(observations)}")
    print(manifest_path, curated_path)


if __name__ == "__main__":
    main()
