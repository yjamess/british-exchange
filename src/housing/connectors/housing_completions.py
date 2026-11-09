"""MHCLG Live Table 213 — England permanent dwelling completions (quarterly).

Approach:
1. Pin LiveTable213.ods.
2. Parse LT_213_quarterly completion columns (all + tenure) for England.
3. Emit quarterly observations with series= tenure slugs (England only — not UK).
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
from britain_exchange.observation import Observation, ObservationStatus
from britain_exchange.paths import HOUSING_DATA
from housing.ods_util import read_ods_sheet

PINNED_RAW = "raw/2026-11-03/LiveTable213.ods"
SOURCE_LANDING = (
    "https://www.gov.uk/government/statistical-data-sets/live-tables-on-house-building"
)
PINNED_URL = (
    "https://assets.publishing.service.gov.uk/media/"
    "6ab3e256a9c3d267bcccedc1/LiveTable213.ods"
)
OFFICIAL_RELEASE_DATE = "2026-09-24"
SOURCE_VERSION = "LiveTable213 2026-09-24"
ENGLAND_CODE = "E92000001"
ENGLAND_LABEL = "England"
UNIT = "dwellings (completions)"
PERIOD_RE = re.compile(r"^(\d{4})\s+Q([1-4])$")
MISSING = {"[x]", "[z]", "..", "…", ""}

COMPLETION_COLUMNS: tuple[tuple[str, str], ...] = (
    ("All Completions", "all-completions"),
    ("Private Enterprise Completions", "private-enterprise"),
    ("Housing Association Completions", "housing-association"),
    ("Local Authority Completions", "local-authority"),
)


def _quarter_bounds(year: int, quarter: int) -> tuple[str, str]:
    start_month = 1 + (quarter - 1) * 3
    end_month = start_month + 2
    start = f"{year:04d}-{start_month:02d}-01"
    end_day = calendar.monthrange(year, end_month)[1]
    end = f"{year:04d}-{end_month:02d}-{end_day:02d}"
    return start, end


def _parse_number(raw: str) -> tuple[float | None, ObservationStatus]:
    text = raw.strip()
    if not text or text in MISSING:
        return None, "missing"
    provisional = text.endswith("P") or "[provisional]" in text.lower()
    cleaned = (
        text.replace(",", "")
        .replace("P", "")
        .replace("R", "")
        .replace("[provisional]", "")
        .strip()
    )
    if cleaned in MISSING or not cleaned:
        return None, "missing"
    value = float(cleaned)
    status: ObservationStatus = "provisional" if provisional else "final"
    return value, status


def parse_live_table_213(path: Path) -> list[Observation]:
    rows = read_ods_sheet(path, "LT_213_quarterly")
    header_idx = None
    col_map: dict[str, int] = {}
    for i, row in enumerate(rows):
        if row and row[0].strip() == "Period":
            header_idx = i
            for header, _slug in COMPLETION_COLUMNS:
                try:
                    col_map[header] = row.index(header)
                except ValueError as exc:
                    raise ValueError(f"Missing column {header}: {row}") from exc
            break
    if header_idx is None:
        raise ValueError("Could not find LT_213_quarterly header row")

    observations: list[Observation] = []
    for row in rows[header_idx + 1 :]:
        if not row or not row[0].strip():
            continue
        match = PERIOD_RE.match(row[0].strip())
        if not match:
            continue
        year, quarter = int(match.group(1)), int(match.group(2))
        start, end = _quarter_bounds(year, quarter)
        for header, series in COMPLETION_COLUMNS:
            idx = col_map[header]
            cell = row[idx] if idx < len(row) else ""
            value, status = _parse_number(cell)
            if value is None and status == "missing":
                continue
            observations.append(
                Observation(
                    indicator_id="housing-completions",
                    period_start=start,
                    period_end=end,
                    geography_code=ENGLAND_CODE,
                    geography_label=ENGLAND_LABEL,
                    value=value,
                    unit=UNIT,
                    observation_status=status,
                    source_version=SOURCE_VERSION,
                    notes=(
                        f"series={series}; "
                        f"column={header}; "
                        "source=MHCLG Live Table 213; "
                        "geography=England only"
                    ),
                )
            )
    if not observations:
        raise ValueError("No quarterly completions rows parsed")
    observations.sort(key=lambda obs: (obs.period_start, obs.notes))
    return observations


class HousingCompletionsConnector(Connector):
    def __init__(self, data_root: Path | None = None) -> None:
        super().__init__(data_root or (HOUSING_DATA / "housing-completions"))

    @property
    def indicator_id(self) -> str:
        return "housing-completions"

    def build_manifest(self, evidence: Sequence[RawEvidence]) -> Manifest:
        return Manifest(
            indicator_id=self.indicator_id,
            title="Housing completions",
            sector="housing-land",
            publisher="MHCLG",
            source_url=SOURCE_LANDING,
            series_id="Live Table 213 Completions (England quarterly, by tenure)",
            geography="England (E92000001) — not UK",
            frequency="quarterly",
            unit=UNIT,
            definition=(
                "Permanent dwellings completed in England by tenure "
                "(private enterprise, housing association, local authority, all), "
                "from MHCLG Live Table 213."
            ),
            licence="Open Government Licence v3.0",
            agent_owner="housing",
            connector_module="housing.connectors.housing_completions",
            curated_path="curated/observations.csv",
            update_cadence="quarterly",
            raw_evidence=list(evidence),
            notion_registry_url="https://app.notion.com/40d654717685810187d8ce37fdff8fcf",
            transformations=(
                "Parse LT_213_quarterly completion columns; "
                "series=all-completions|private-enterprise|housing-association|local-authority."
            ),
            caveats=(
                "England-only new-build completions; not net additional dwellings "
                "and not a UK total. Filter series=all-completions for the headline total."
            ),
            revision_notes="Pinned LiveTable213 published 24 September 2026; tenure columns added 2026-11-04.",
            related_indicator_ids=["housing-starts"],
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
        return parse_live_table_213(self.data_root / evidence[0].path)


def main() -> None:
    connector = HousingCompletionsConnector()
    evidence = connector.evidence_from_pinned_raw()
    observations = connector.transform([evidence])
    connector.write_hand_off([evidence], observations)
    print(f"observations: {len(observations)} last={observations[-1].value}")


if __name__ == "__main__":
    main()
