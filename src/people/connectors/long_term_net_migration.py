"""ONS long-term international net migration (UK, YE rolling).

Approach:
1. Pin May 2026 LTIM provisional workbook.
2. Sheet 1 Net migration rows; All Nationalities estimate.
3. Map YE Mon YY periods to ISO year-ending bounds.
"""

from __future__ import annotations

import calendar
import re
from datetime import date, datetime, timezone
from pathlib import Path
from typing import Sequence

from openpyxl import load_workbook

from britain_exchange.checksum import sha256_file
from britain_exchange.connector import Connector
from britain_exchange.manifest import Manifest, RawEvidence
from britain_exchange.observation import Observation, ObservationStatus
from britain_exchange.paths import PEOPLE_DATA

PINNED_RAW = "raw/2026-11-03/ltim_ye_dec_2025.xlsx"
SOURCE_LANDING = (
    "https://www.ons.gov.uk/peoplepopulationandcommunity/populationandmigration/"
    "internationalmigration/datasets/"
    "longterminternationalimmigrationemigrationandnetmigrationflowsprovisional"
)
PINNED_URL = (
    "https://www.ons.gov.uk/file?uri=/peoplepopulationandcommunity/"
    "populationandmigration/internationalmigration/datasets/"
    "longterminternationalimmigrationemigrationandnetmigrationflowsprovisional/"
    "yearendingdecember2025/may2026publicationspreadsheet.xlsx"
)
OFFICIAL_RELEASE_DATE = "2026-05-21"
SOURCE_VERSION = "LTIM provisional YE Dec 2025 (May 2026)"
UK_CODE = "K02000001"
UK_LABEL = "United Kingdom"
UNIT = "persons (net migration, YE)"
PERIOD_RE = re.compile(
    r"^YE\s+(Jun|Sep|Dec|Mar)\s+(\d{2})(?:\s+([PR]+(?:\s+[PR]+)?))?$",
    re.IGNORECASE,
)
MONTH = {"Jun": 6, "Sep": 9, "Dec": 12, "Mar": 3}


def _year_ending_bounds(month_name: str, yy: int) -> tuple[str, str]:
    """Year ending Month 20YY covers the prior 12 months ending that month."""
    end_month = MONTH[month_name]
    end_year = 2000 + yy
    end_day = calendar.monthrange(end_year, end_month)[1]
    end = date(end_year, end_month, end_day)
    # start = day after previous year's same month-end
    if end_month == 12:
        start = date(end_year, 1, 1)
    else:
        prev_year = end_year - 1
        start_month = end_month + 1
        start = date(prev_year, start_month, 1)
    return start.isoformat(), end.isoformat()


def parse_ltim_net_migration(workbook: Path) -> list[Observation]:
    wb = load_workbook(workbook, data_only=True, read_only=False)
    try:
        ws = wb["1"]
        observations: list[Observation] = []
        for row in ws.iter_rows(values_only=True):
            if not row or row[0] is None:
                continue
            if str(row[0]).strip() != "Net migration":
                continue
            period_raw = str(row[1]).strip()
            match = PERIOD_RE.match(period_raw)
            if not match:
                raise ValueError(f"Unrecognised LTIM period: {period_raw!r}")
            mon, yy_s, flags = match.group(1), match.group(2), (match.group(3) or "")
            start, end = _year_ending_bounds(mon.title(), int(yy_s))
            value = None if row[2] is None else float(row[2])
            flags_u = flags.upper()
            status: ObservationStatus
            if value is None:
                status = "missing"
            elif "P" in flags_u:
                status = "provisional"
            else:
                status = "final"
            observations.append(
                Observation(
                    indicator_id="long-term-international-net-migration",
                    period_start=start,
                    period_end=end,
                    geography_code=UK_CODE,
                    geography_label=UK_LABEL,
                    value=value,
                    unit=UNIT,
                    observation_status=status,
                    source_version=SOURCE_VERSION,
                    notes=(
                        f"series=LTIM Table1 Net migration All Nationalities; "
                        f"period={period_raw}"
                    ),
                )
            )
        if not observations:
            raise ValueError("No Net migration rows found")
        observations.sort(key=lambda obs: obs.period_end)
        return observations
    finally:
        wb.close()


class LongTermNetMigrationConnector(Connector):
    def __init__(self, data_root: Path | None = None) -> None:
        super().__init__(
            data_root or (PEOPLE_DATA / "long-term-international-net-migration")
        )

    @property
    def indicator_id(self) -> str:
        return "long-term-international-net-migration"

    def build_manifest(self, evidence: Sequence[RawEvidence]) -> Manifest:
        return Manifest(
            indicator_id=self.indicator_id,
            title="Long-term international net migration",
            sector="people-society",
            publisher="ONS",
            source_url=SOURCE_LANDING,
            series_id="LTIM Table 1 Net migration (All Nationalities)",
            geography="United Kingdom (K02000001)",
            frequency="quarterly",
            unit=UNIT,
            definition=(
                "UK long-term international net migration (immigration minus "
                "emigration) for year-ending periods, admin-based LTIM estimates "
                "(official statistics in development)."
            ),
            licence="Open Government Licence v3.0",
            agent_owner="people",
            connector_module="people.connectors.long_term_net_migration",
            curated_path="curated/observations.csv",
            update_cadence="twice yearly (May / November provisional)",
            raw_evidence=list(evidence),
            notion_registry_url="https://app.notion.com/40d654717685810cacfaf24d3cf55862",
            transformations=(
                "Sheet 1 Net migration rows; All Nationalities column; YE period "
                "→ ISO bounds; P flag → provisional."
            ),
            caveats=(
                "Official statistics in development; regularly revised (R flags). "
                "Not comparable with pre-2012 IPS-only historical series."
            ),
            revision_notes="Pinned May 2026 publication (YE December 2025).",
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
        return parse_ltim_net_migration(self.data_root / evidence[0].path)


def main() -> None:
    connector = LongTermNetMigrationConnector()
    evidence = connector.evidence_from_pinned_raw()
    observations = connector.transform([evidence])
    connector.write_hand_off([evidence], observations)
    print(f"observations: {len(observations)} last={observations[-1].value}")


if __name__ == "__main__":
    main()
