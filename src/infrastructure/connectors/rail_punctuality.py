"""GB rail punctuality (PPM) — ORR Table 3113a quarterly.

Approach:
1. Pin ORR Table 3113 ODS.
2. Parse quarterly table: Time period × Great Britain PPM %.
3. Emit one Observation per quarter for GB.
"""

from __future__ import annotations

import calendar
import re
from pathlib import Path
from typing import Sequence

from britain_exchange.connector import Connector
from britain_exchange.manifest import Manifest, RawEvidence
from britain_exchange.observation import Observation, ObservationStatus
from britain_exchange.paths import INFRASTRUCTURE_DATA
from infrastructure.connectors._ods import read_ods_rows
from infrastructure.connectors._util import evidence_from_file

INDICATOR_ID = "rail-punctuality"
GB_CODE, GB_LABEL = "K03000001", "Great Britain"
PINNED = "raw/2026-11-03/table-3113-ppm.ods"
SOURCE_URL = (
    "https://dataportal.orr.gov.uk/statistics/performance/passenger-rail-performance/"
    "table-3113-public-performance-measure-by-operator-and-sector"
)
SOURCE_ASSET = (
    "https://dataportal.orr.gov.uk/media/1428/"
    "table-3113-public-performance-measure-by-operator-and-sector.ods"
)
UNIT = "% PPM (trains arriving on time)"

_MONTH = {
    "jan": 1,
    "feb": 2,
    "mar": 3,
    "apr": 4,
    "may": 5,
    "jun": 6,
    "jul": 7,
    "aug": 8,
    "sep": 9,
    "oct": 10,
    "nov": 11,
    "dec": 12,
}
PERIOD_RE = re.compile(
    r"^(?P<m1>[A-Za-z]{3})\s+to\s+(?P<m2>[A-Za-z]{3})\s+(?P<y>\d{4})",
    re.I,
)


def _period_bounds(label: str) -> tuple[str, str] | None:
    match = PERIOD_RE.match(label.strip())
    if not match:
        return None
    m1 = _MONTH[match.group("m1").lower()[:3]]
    m2 = _MONTH[match.group("m2").lower()[:3]]
    year = int(match.group("y"))
    start = f"{year:04d}-{m1:02d}-01"
    end = f"{year:04d}-{m2:02d}-{calendar.monthrange(year, m2)[1]:02d}"
    return start, end


def parse_ppm(path: Path) -> list[Observation]:
    rows = read_ods_rows(path, table_name="3113_PPM_(quarterly)")
    header_idx = None
    for i, row in enumerate(rows[:30]):
        if row and str(row[0]).strip().lower() == "time period":
            header_idx = i
            break
    if header_idx is None:
        raise ValueError("Time period header not found in Table 3113")

    header = rows[header_idx]
    try:
        gb_col = next(
            i for i, cell in enumerate(header) if str(cell).strip().lower() == "great britain"
        )
    except StopIteration as exc:
        raise ValueError("Great Britain column missing") from exc

    observations: list[Observation] = []
    for row in rows[header_idx + 1 :]:
        label = str(row[0] or "").strip()
        if not label or label.lower().startswith("table "):
            # Stop at moving-annual-average second table
            if "moving annual" in label.lower() or "table 3113b" in label.lower():
                break
            continue
        bounds = _period_bounds(label)
        if bounds is None:
            if "moving annual" in label.lower() or label.lower().startswith("time period"):
                break
            continue
        raw = str(row[gb_col] if gb_col < len(row) else "").strip()
        status: ObservationStatus = "final"
        if raw.endswith("[p]") or "[p]" in raw:
            status = "provisional"
            raw = raw.replace("[p]", "").strip()
        if raw.endswith("[r]"):
            raw = raw.replace("[r]", "").strip()
        if raw in {"", "[z]", "-", "–"}:
            continue
        start, end = bounds
        observations.append(
            Observation(
                indicator_id=INDICATOR_ID,
                period_start=start,
                period_end=end,
                geography_code=GB_CODE,
                geography_label=GB_LABEL,
                value=float(raw),
                unit=UNIT,
                observation_status=status,
                source_version="ORR Table 3113a",
                notes=f"series=PPM quarterly; period_label={label}",
            )
        )
    if not observations:
        raise ValueError("No PPM quarterly GB values parsed from Table 3113a")
    return observations


class RailPunctualityConnector(Connector):
    def __init__(self, data_root: Path | None = None) -> None:
        super().__init__(data_root or (INFRASTRUCTURE_DATA / INDICATOR_ID))

    @property
    def indicator_id(self) -> str:
        return INDICATOR_ID

    def build_manifest(self, evidence: Sequence[RawEvidence]) -> Manifest:
        return Manifest(
            indicator_id=self.indicator_id,
            title="Rail punctuality",
            sector="infrastructure",
            publisher="Office of Rail and Road",
            source_url=SOURCE_URL,
            series_id="Table 3113a Public Performance Measure (PPM), Great Britain",
            geography="Great Britain (K03000001)",
            frequency="quarterly",
            unit=UNIT,
            definition=(
                "Passenger rail Public Performance Measure (PPM): percentage of "
                "franchised passenger trains arriving at destination on time "
                "(within 5/10 minutes by sector), Great Britain."
            ),
            licence="Open Government Licence v3.0",
            agent_owner="infrastructure",
            connector_module="infrastructure.connectors.rail_punctuality",
            curated_path="curated/observations.csv",
            update_cadence="quarterly (ORR passenger rail performance)",
            raw_evidence=list(evidence),
            notion_registry_url="https://app.notion.com/40d6547176858149bef8d2f64488a024",
            transformations=(
                "Parse 3113_PPM_(quarterly) sheet Table 3113a; keep Great Britain "
                "column; map 'Mon to Mon YYYY' labels to ISO bounds."
            ),
            caveats=(
                "PPM differs from On Time at all recorded stops. Moving annual "
                "average table (3113b) omitted. Northern Ireland excluded."
            ),
            revision_notes="Pinned ORR Table 3113 ODS on 2026-11-03 (published 17 Sep 2026).",
        )

    def evidence_from_pinned_raw(self) -> RawEvidence:
        return evidence_from_file(
            self.data_root,
            PINNED,
            source_url=SOURCE_ASSET,
            content_type="application/vnd.oasis.opendocument.spreadsheet",
            official_release_date="2026-09-17",
        )

    def transform(self, evidence: Sequence[RawEvidence]) -> list[Observation]:
        if not evidence:
            raise ValueError("transform() requires RawEvidence")
        return parse_ppm(self.data_root / evidence[0].path)


def main() -> None:
    connector = RailPunctualityConnector()
    evidence = connector.evidence_from_pinned_raw()
    observations = connector.transform([evidence])
    manifest_path, curated_path = connector.write_hand_off([evidence], observations)
    print(f"indicator_id: {connector.indicator_id} rows={len(observations)}")
    print(manifest_path, curated_path)


if __name__ == "__main__":
    main()
