"""Full-fibre broadband coverage — Ofcom Connected Nations.

Approach:
1. Pin Connected Nations fixed coverage ZIP; use UK/nations CSV.
2. Keep Location=UK, Premise type=Residential (or All), Rurality=Total, Speed=Full Fibre.
3. Emit snapshot observation(s) by Date field.
"""

from __future__ import annotations

import csv
import re
from pathlib import Path
from typing import Sequence

from britain_exchange.connector import Connector
from britain_exchange.manifest import Manifest, RawEvidence
from britain_exchange.observation import Observation
from britain_exchange.paths import INFRASTRUCTURE_DATA
from infrastructure.connectors._util import evidence_from_file, month_bounds

INDICATOR_ID = "full-fibre-broadband-coverage"
UK_CODE, UK_LABEL = "K02000001", "United Kingdom"
PINNED = "raw/2026-11-03/202507_fixed_coverage_UK_and_nations_r01.csv"
SOURCE_LANDING = (
    "https://www.ofcom.org.uk/phones-and-broadband/coverage-and-speeds/"
    "connected-nations-20252/data-downloads-2025"
)
SOURCE_ASSET = (
    "https://www.ofcom.org.uk/siteassets/resources/documents/research-and-data/"
    "multi-sector/infrastructure-research/connected-nations-2025/"
    "202507_fixed_broadband_coverage_r01.zip"
)
UNIT = "% of premises with full-fibre coverage"


_MONTHS = {
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


def _parse_mon_yy(raw: str) -> tuple[int, int]:
    match = re.fullmatch(r"([A-Za-z]{3})-(\d{2})", raw.strip())
    if not match:
        raise ValueError(f"Unexpected Ofcom date label: {raw!r}")
    month = _MONTHS[match.group(1).lower()[:3]]
    year = 2000 + int(match.group(2))
    return year, month


def parse_full_fibre(path: Path) -> list[Observation]:
    with path.open(encoding="utf-8", newline="") as handle:
        rows = list(csv.DictReader(handle))
    observations: list[Observation] = []
    for row in rows:
        if row.get("Location") != "UK":
            continue
        if row.get("Speed") != "Full Fibre":
            continue
        if row.get("Rurality") != "Total":
            continue
        premise = row.get("Premise type") or ""
        if premise not in {"Residential", "All"}:
            continue
        year, month = _parse_mon_yy(row["Date"])
        start, end = month_bounds(year, month)
        observations.append(
            Observation(
                indicator_id=INDICATOR_ID,
                period_start=start,
                period_end=end,
                geography_code=UK_CODE,
                geography_label=UK_LABEL,
                value=float(row["% Premises"]),
                unit=UNIT,
                observation_status="final",
                source_version="Ofcom Connected Nations 2025 (Jul-25 snapshot)",
                notes=(
                    f"premise_type={premise}; premises={row.get('Premises')}; "
                    f"date_label={row.get('Date')}"
                ),
            )
        )
    if not observations:
        raise ValueError("No UK Full Fibre coverage rows parsed")
    # Prefer Residential if both present; keep both with notes
    return sorted(observations, key=lambda obs: (obs.period_start, obs.notes))


class FullFibreBroadbandCoverageConnector(Connector):
    def __init__(self, data_root: Path | None = None) -> None:
        super().__init__(data_root or (INFRASTRUCTURE_DATA / INDICATOR_ID))

    @property
    def indicator_id(self) -> str:
        return INDICATOR_ID

    def build_manifest(self, evidence: Sequence[RawEvidence]) -> Manifest:
        return Manifest(
            indicator_id=self.indicator_id,
            title="Full-fibre broadband coverage",
            sector="infrastructure",
            publisher="Ofcom",
            source_url=SOURCE_LANDING,
            series_id="Connected Nations fixed coverage — Full Fibre % premises",
            geography="United Kingdom (K02000001); nations also in raw CSV",
            frequency="ad_hoc",
            unit=UNIT,
            definition=(
                "Percentage of UK premises with access to a full-fibre fixed "
                "broadband network from Ofcom Connected Nations coverage tables."
            ),
            licence="Open Government Licence v3.0",
            agent_owner="infrastructure",
            connector_module="infrastructure.connectors.full_fibre_broadband_coverage",
            curated_path="curated/observations.csv",
            update_cadence="Connected Nations annual + spring updates",
            raw_evidence=list(evidence),
            notion_registry_url="https://app.notion.com/40d6547176858177a17bcb8e5a586886",
            transformations=(
                "From UK_and_nations CSV keep Location=UK, Speed=Full Fibre, "
                "Rurality=Total; emit Residential and All premise_type rows."
            ),
            caveats=(
                "Snapshot dates (e.g. Jul-25) are not calendar-year averages. "
                "Coverage ≠ take-up. Gigabit-capable is a wider measure."
            ),
            revision_notes="Pinned Connected Nations 2025 coverage extract 2026-11-03.",
        )

    def evidence_from_pinned_raw(self) -> RawEvidence:
        return evidence_from_file(
            self.data_root,
            PINNED,
            source_url=SOURCE_ASSET,
            content_type="text/csv",
            official_release_date="2025-11-19",
        )

    def transform(self, evidence: Sequence[RawEvidence]) -> list[Observation]:
        if not evidence:
            raise ValueError("transform() requires RawEvidence")
        return parse_full_fibre(self.data_root / evidence[0].path)


def main() -> None:
    connector = FullFibreBroadbandCoverageConnector()
    evidence = connector.evidence_from_pinned_raw()
    observations = connector.transform([evidence])
    manifest_path, curated_path = connector.write_hand_off([evidence], observations)
    print(f"indicator_id: {connector.indicator_id} rows={len(observations)}")
    print(manifest_path, curated_path)


if __name__ == "__main__":
    main()
