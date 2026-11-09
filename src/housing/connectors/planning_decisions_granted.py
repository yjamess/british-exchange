"""MHCLG Live Table P120 — England district planning applications (quarterly).

Approach:
1. Pin Tables P120–P138 ODS from planning application live tables.
2. Parse LT_P120 quarterly rows for received, decided, and granted (England).
3. Emit series=applications-received | applications-decided | decisions-granted.

Caveat: same-quarter received and granted are unmatched sets of applications.
"""

from __future__ import annotations

import calendar
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Sequence

from britain_exchange.checksum import sha256_file
from britain_exchange.connector import Connector
from britain_exchange.manifest import Manifest, RawEvidence
from britain_exchange.observation import Observation
from britain_exchange.paths import HOUSING_DATA
from housing.ods_util import read_ods_sheet

PINNED_RAW = "raw/2026-11-04/Tables_P120_to_P138_MJPSI_PIPTDCC.ods"
SOURCE_LANDING = (
    "https://www.gov.uk/government/statistical-data-sets/"
    "live-tables-on-planning-application-statistics"
)
PINNED_URL = (
    "https://assets.publishing.service.gov.uk/media/"
    "6ab2cc778cb3c0580e501005/Tables_P120_to_P138_MJPSI_PIPTDCC.ods"
)
OFFICIAL_RELEASE_DATE = "2026-09-24"
SOURCE_VERSION = "Planning live tables P120–P138 2026 Q2"
ENGLAND_CODE = "E92000001"
ENGLAND_LABEL = "England"
UNIT = "applications / decisions"
QUARTER_RE = re.compile(r"^(\d{4})\s+Q([1-4])$")

# Column index → series slug (0=Year, 1=Quarter)
P120_SERIES: tuple[tuple[int, str, str], ...] = (
    (2, "applications-received", "applications received"),
    (3, "applications-decided", "applications decided"),
    (4, "decisions-granted", "decisions granted"),
)


def _quarter_bounds(year: int, quarter: int) -> tuple[str, str]:
    start_month = 1 + (quarter - 1) * 3
    end_month = start_month + 2
    start = f"{year:04d}-{start_month:02d}-01"
    end_day = calendar.monthrange(year, end_month)[1]
    end = f"{year:04d}-{end_month:02d}-{end_day:02d}"
    return start, end


def _parse_count(raw: str) -> float | None:
    text = raw.strip().replace(",", "").strip()
    if not text or text in {"-", "–", "—"}:
        return None
    return float(text)


def parse_p120(path: Path) -> list[Observation]:
    rows = read_ods_sheet(path, "LT_P120")
    header_idx = next(
        (i for i, row in enumerate(rows) if row and row[0].strip() == "Year"),
        None,
    )
    if header_idx is None:
        raise ValueError("LT_P120 header not found")
    observations: list[Observation] = []
    for row in rows[header_idx + 1 :]:
        if len(row) < 5:
            continue
        quarter_label = row[1].strip()
        match = QUARTER_RE.match(quarter_label)
        if not match:
            # Skip annual summary rows (Year filled, Quarter empty)
            continue
        year, quarter = int(match.group(1)), int(match.group(2))
        start, end = _quarter_bounds(year, quarter)
        for col, series, label in P120_SERIES:
            value = _parse_count(row[col] if col < len(row) else "")
            if value is None:
                continue
            observations.append(
                Observation(
                    indicator_id="planning-decisions-granted",
                    period_start=start,
                    period_end=end,
                    geography_code=ENGLAND_CODE,
                    geography_label=ENGLAND_LABEL,
                    value=value,
                    unit=UNIT,
                    observation_status="final",
                    source_version=SOURCE_VERSION,
                    notes=(
                        f"series={series}; "
                        f"measure={label}; "
                        "sheet=LT_P120; "
                        "authority=district planning authorities; "
                        "geography=England; "
                        "received-vs-granted are unmatched application sets"
                    ),
                )
            )
    if not observations:
        raise ValueError("No quarterly planning-decision rows parsed")
    observations.sort(key=lambda o: (o.period_start, o.notes))
    return observations


class PlanningDecisionsGrantedConnector(Connector):
    def __init__(self, data_root: Path | None = None) -> None:
        super().__init__(data_root or (HOUSING_DATA / "planning-decisions-granted"))

    @property
    def indicator_id(self) -> str:
        return "planning-decisions-granted"

    def build_manifest(self, evidence: Sequence[RawEvidence]) -> Manifest:
        return Manifest(
            indicator_id=self.indicator_id,
            title="Planning decisions granted",
            sector="housing-land",
            publisher="MHCLG",
            source_url=SOURCE_LANDING,
            series_id="Live Table P120 received / decided / granted (England)",
            geography="England (E92000001) — district planning authorities",
            frequency="quarterly",
            unit=UNIT,
            definition=(
                "District planning authority applications received, decided, and "
                "decisions granted in England each quarter (Live Table P120). "
                "Filter series=decisions-granted for the headline grants series."
            ),
            licence="Open Government Licence v3.0",
            agent_owner="housing",
            connector_module="housing.connectors.planning_decisions_granted",
            curated_path="curated/observations.csv",
            update_cadence="quarterly",
            raw_evidence=list(evidence),
            transformations=(
                "Parse LT_P120 quarterly rows; emit series=applications-received|"
                "applications-decided|decisions-granted."
            ),
            caveats=(
                "England district planning authorities only — not county matters "
                "and not UK. Applications received and decisions granted in the "
                "same quarter are not a matched cohort. A grant is not a dwelling "
                "completion. Indicator id retained for registry continuity."
            ),
            revision_notes="Expanded to received/decided/granted 2026-11-04 (Domain 06).",
            related_indicator_ids=["green-belt-area", "land-use-stock", "housing-completions"],
            notion_registry_url="https://app.notion.com/p/40e6547176858140a0bfc32ab8d9aa7a",
        )

    def evidence_from_pinned_raw(self) -> RawEvidence:
        path = self.data_root / PINNED_RAW
        if not path.is_file():
            raise FileNotFoundError(path)
        return RawEvidence(
            path=PINNED_RAW,
            retrieved_at=datetime.now(timezone.utc).isoformat(),
            checksum_sha256=sha256_file(path),
            content_type="application/vnd.oasis.opendocument.spreadsheet",
            official_release_date=OFFICIAL_RELEASE_DATE,
            source_url=PINNED_URL,
        )

    def transform(self, evidence: Sequence[RawEvidence]) -> list[Observation]:
        if not evidence:
            raise ValueError("transform() requires RawEvidence")
        return parse_p120(self.data_root / evidence[0].path)


def main() -> None:
    connector = PlanningDecisionsGrantedConnector()
    evidence = connector.evidence_from_pinned_raw()
    observations = connector.transform([evidence])
    connector.write_hand_off([evidence], observations)
    print(
        f"observations={len(observations)} "
        f"first={observations[0].period_start}:{observations[0].value} "
        f"last={observations[-1].period_start}:{observations[-1].value}"
    )


if __name__ == "__main__":
    main()
