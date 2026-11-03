"""UK Public General Acts passed per calendar year — legislation.gov.uk.

Approach:
1. Pin annual result counts scraped from legislation.gov.uk/ukpga/{year}.
2. Emit one Observation per year (count of Public General Acts).
3. Write curated CSV + manifest via shared Connector.write_hand_off.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Sequence

from britain_exchange.connector import Connector
from britain_exchange.manifest import Manifest, RawEvidence
from britain_exchange.observation import Observation
from britain_exchange.paths import GOVERNMENT_DATA
from government.connectors._util import evidence_from_file, year_bounds

INDICATOR_ID = "acts-of-parliament-passed"
UK_CODE, UK_LABEL = "K02000001", "United Kingdom"
PINNED = "raw/2026-11-03/ukpga_annual_counts.json"
SOURCE_URL = "https://www.legislation.gov.uk/ukpga"
UNIT = "count of Public General Acts"


def parse_annual_counts(path: Path) -> list[Observation]:
    payload = json.loads(path.read_text(encoding="utf-8"))
    counts = payload.get("counts") or {}
    if not isinstance(counts, dict) or not counts:
        raise ValueError(f"No counts in {path}")
    version = f"legislation.gov.uk ukpga counts {payload.get('retrieved_at', '')[:10]}"
    observations: list[Observation] = []
    for year_str, value in sorted(counts.items(), key=lambda item: int(item[0])):
        year = int(year_str)
        start, end = year_bounds(year)
        observations.append(
            Observation(
                indicator_id=INDICATOR_ID,
                period_start=start,
                period_end=end,
                geography_code=UK_CODE,
                geography_label=UK_LABEL,
                value=float(value),
                unit=UNIT,
                observation_status="final",
                source_version=version,
                notes="series=ukpga; type=Public General Acts; calendar year",
            )
        )
    return observations


class ActsOfParliamentPassedConnector(Connector):
    def __init__(self, data_root: Path | None = None) -> None:
        super().__init__(data_root or (GOVERNMENT_DATA / INDICATOR_ID))

    @property
    def indicator_id(self) -> str:
        return INDICATOR_ID

    def build_manifest(self, evidence: Sequence[RawEvidence]) -> Manifest:
        return Manifest(
            indicator_id=self.indicator_id,
            title="Acts of Parliament passed",
            sector="government-politics",
            publisher="The National Archives (legislation.gov.uk)",
            source_url=SOURCE_URL,
            series_id="ukpga (Public General Acts, annual count)",
            geography="United Kingdom (K02000001); UK Parliament primary legislation",
            frequency="annual",
            unit=UNIT,
            definition=(
                "Number of UK Public General Acts (ukpga) listed for each calendar "
                "year on legislation.gov.uk. Excludes local/personal/private acts "
                "and devolved primary legislation."
            ),
            licence="Open Government Licence v3.0",
            agent_owner="government",
            connector_module="government.connectors.acts_of_parliament_passed",
            curated_path="curated/observations.csv",
            update_cadence="annual (re-scrape legislation.gov.uk ukpga year indexes)",
            raw_evidence=list(evidence),
            notion_registry_url="https://app.notion.com/40d65471768581339892e8838be8f6db",
            transformations=(
                "For each calendar year, read the HTML results count on "
                "/ukpga/{year} and store year→count JSON. Emit annual observations."
            ),
            caveats=(
                "Count is the catalogue listing of Public General Acts, not page "
                "length or SI volume. Early years and numbering quirks follow "
                "legislation.gov.uk. Devolved Acts are excluded."
            ),
            revision_notes="Pinned 2026-11-03 from live legislation.gov.uk year indexes.",
        )

    def evidence_from_pinned_raw(self) -> RawEvidence:
        return evidence_from_file(
            self.data_root,
            PINNED,
            source_url=SOURCE_URL,
            content_type="application/json",
            official_release_date="2026-11-03",
        )

    def transform(self, evidence: Sequence[RawEvidence]) -> list[Observation]:
        if not evidence:
            raise ValueError("transform() requires RawEvidence")
        return parse_annual_counts(self.data_root / evidence[0].path)


def main() -> None:
    connector = ActsOfParliamentPassedConnector()
    evidence = connector.evidence_from_pinned_raw()
    observations = connector.transform([evidence])
    manifest_path, curated_path = connector.write_hand_off([evidence], observations)
    print(f"indicator_id: {connector.indicator_id}")
    print(f"observations: {len(observations)}")
    print(f"manifest: {manifest_path}")
    print(f"curated: {curated_path}")


if __name__ == "__main__":
    main()
