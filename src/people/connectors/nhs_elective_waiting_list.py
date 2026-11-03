"""NHS England RTT incomplete pathways (elective waiting list), England.

Approach:
1. Pin RTT Overview Timeseries (with estimates for missing trusts).
2. Take column 'Total waiting (mil) with estimates for missing data' — values
   are absolute pathway counts despite the historic '(mil)' label.
3. Geography: England only.
"""

from __future__ import annotations

import calendar
from datetime import date, datetime, timezone
from pathlib import Path
from typing import Sequence

from openpyxl import load_workbook

from britain_exchange.checksum import sha256_file
from britain_exchange.connector import Connector
from britain_exchange.manifest import Manifest, RawEvidence
from britain_exchange.observation import Observation, ObservationStatus
from britain_exchange.paths import PEOPLE_DATA

PINNED_RAW = "raw/2026-11-03/rtt_overview_timeseries_aug26.xlsx"
SOURCE_LANDING = (
    "https://www.england.nhs.uk/statistics/statistical-work-areas/rtt-waiting-times/"
)
PINNED_URL = (
    "https://www.england.nhs.uk/statistics/wp-content/uploads/sites/2/2026/10/"
    "RTT-Overview-Timeseries-Including-Estimates-for-Missing-Trusts-Aug26-XLS-139K-vjgRdG.xlsx"
)
OFFICIAL_RELEASE_DATE = "2026-10-08"
SOURCE_VERSION = "RTT Overview Timeseries Aug26 (est. missing trusts)"
ENGLAND_CODE = "E92000001"
ENGLAND_LABEL = "England"
UNIT = "incomplete RTT pathways"
# Column 23 in the overview workbook (1-based): total waiting with estimates.
VALUE_COL = 23


def _month_bounds(d: date) -> tuple[str, str]:
    last = calendar.monthrange(d.year, d.month)[1]
    return f"{d.year:04d}-{d.month:02d}-01", f"{d.year:04d}-{d.month:02d}-{last:02d}"


def parse_rtt_overview(workbook: Path) -> list[Observation]:
    wb = load_workbook(workbook, data_only=True, read_only=False)
    try:
        ws = wb["Full Time Series"]
        observations: list[Observation] = []
        for row_idx in range(13, ws.max_row + 1):
            month_val = ws.cell(row_idx, 3).value
            if not isinstance(month_val, datetime):
                continue
            value_raw = ws.cell(row_idx, VALUE_COL).value
            if value_raw in (None, "", "-"):
                # Future placeholder months after latest published month.
                continue
            value = float(value_raw)
            start, end = _month_bounds(month_val.date())
            status: ObservationStatus = "provisional"
            observations.append(
                Observation(
                    indicator_id="nhs-elective-waiting-list",
                    period_start=start,
                    period_end=end,
                    geography_code=ENGLAND_CODE,
                    geography_label=ENGLAND_LABEL,
                    value=value,
                    unit=UNIT,
                    observation_status=status,
                    source_version=SOURCE_VERSION,
                    notes=(
                        "series=RTT incomplete pathways with estimates for missing "
                        "trusts; commissioner basis; England only"
                    ),
                )
            )
        if not observations:
            raise ValueError("No RTT waiting-list months parsed")
        observations.sort(key=lambda obs: obs.period_start)
        return observations
    finally:
        wb.close()


class NhsElectiveWaitingListConnector(Connector):
    def __init__(self, data_root: Path | None = None) -> None:
        super().__init__(data_root or (PEOPLE_DATA / "nhs-elective-waiting-list"))

    @property
    def indicator_id(self) -> str:
        return "nhs-elective-waiting-list"

    def build_manifest(self, evidence: Sequence[RawEvidence]) -> Manifest:
        return Manifest(
            indicator_id=self.indicator_id,
            title="NHS elective waiting list",
            sector="people-society",
            publisher="NHS England",
            source_url=SOURCE_LANDING,
            series_id="RTT Overview Timeseries incomplete pathways (est. missing)",
            geography="England (E92000001) — not UK",
            frequency="monthly",
            unit=UNIT,
            definition=(
                "Number of consultant-led Referral to Treatment (RTT) incomplete "
                "pathways in England at month-end, including NHS England estimates "
                "for non-reporting trusts."
            ),
            licence="Open Government Licence v3.0",
            agent_owner="people",
            connector_module="people.connectors.nhs_elective_waiting_list",
            curated_path="curated/observations.csv",
            update_cadence="monthly",
            raw_evidence=list(evidence),
            notion_registry_url="https://app.notion.com/40d65471768581149f0be9818104ab79",
            transformations=(
                "Parse Full Time Series; column Total waiting with estimates for "
                "missing data (absolute pathway counts)."
            ),
            caveats=(
                "England-only. Pathways ≠ unique patients. Method breaks include "
                "Feb-2024 community pathway removal and periodic validation "
                "exercises. Series revises about every six months."
            ),
            revision_notes="Pinned Aug 2026 overview published 8 Oct 2026.",
        )

    def evidence_from_pinned_raw(self) -> RawEvidence:
        path = self.data_root / PINNED_RAW
        if not path.is_file():
            raise FileNotFoundError(path)
        return RawEvidence(
            path=PINNED_RAW,
            retrieved_at=datetime.now(timezone.utc).isoformat(),
            checksum_sha256=sha256_file(path),
            content_type=(
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            ),
            official_release_date=OFFICIAL_RELEASE_DATE,
            source_url=PINNED_URL,
        )

    def transform(self, evidence: Sequence[RawEvidence]) -> list[Observation]:
        if not evidence:
            raise ValueError("transform() requires RawEvidence")
        return parse_rtt_overview(self.data_root / evidence[0].path)


def main() -> None:
    connector = NhsElectiveWaitingListConnector()
    evidence = connector.evidence_from_pinned_raw()
    observations = connector.transform([evidence])
    connector.write_hand_off([evidence], observations)
    print(f"observations: {len(observations)} last={observations[-1].value}")


if __name__ == "__main__":
    main()
