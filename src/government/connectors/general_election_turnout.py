"""UK general election turnout — Parliament electionresults open CSV.

Approach:
1. Pin general-elections.csv from electionresults.parliament.uk.
2. Keep non-notional rows; turnout % = valid votes / electorate × 100.
3. Emit one Observation per UK general election.
"""

from __future__ import annotations

import csv
from pathlib import Path
from typing import Sequence

from britain_exchange.connector import Connector
from britain_exchange.manifest import Manifest, RawEvidence
from britain_exchange.observation import Observation
from britain_exchange.paths import GOVERNMENT_DATA
from government.connectors._util import evidence_from_file

INDICATOR_ID = "general-election-turnout"
UK_CODE, UK_LABEL = "K02000001", "United Kingdom"
PINNED = "raw/2026-11-03/general-elections.csv"
SOURCE_URL = "https://electionresults.parliament.uk/general-elections.csv"
UNIT = "% of registered electorate (valid votes)"


def parse_turnout(path: Path) -> list[Observation]:
    text = path.read_text(encoding="utf-8-sig")
    rows = list(csv.DictReader(text.splitlines()))
    if not rows:
        raise ValueError(f"Empty elections CSV: {path}")
    observations: list[Observation] = []
    for row in rows:
        if str(row.get("Is notional", "")).strip().lower() == "true":
            continue
        date = (row.get("Polling date") or "").strip()
        if not date:
            raise ValueError(f"Missing polling date: {row!r}")
        electorate = float(row["Total electorate"])
        valid = float(row["Total valid vote count"])
        if electorate <= 0:
            raise ValueError(f"Non-positive electorate on {date}")
        turnout = 100.0 * valid / electorate
        parliament = (row.get("Parliament number") or "").strip()
        observations.append(
            Observation(
                indicator_id=INDICATOR_ID,
                period_start=date,
                period_end=date,
                geography_code=UK_CODE,
                geography_label=UK_LABEL,
                value=round(turnout, 2),
                unit=UNIT,
                observation_status="final",
                source_version="electionresults.parliament.uk general-elections.csv",
                notes=(
                    f"parliament={parliament}; electorate={int(electorate)}; "
                    f"valid_votes={int(valid)}; notional=false"
                ),
            )
        )
    observations.sort(key=lambda obs: obs.period_start)
    if not observations:
        raise ValueError("No non-notional election rows parsed")
    return observations


class GeneralElectionTurnoutConnector(Connector):
    def __init__(self, data_root: Path | None = None) -> None:
        super().__init__(data_root or (GOVERNMENT_DATA / INDICATOR_ID))

    @property
    def indicator_id(self) -> str:
        return INDICATOR_ID

    def build_manifest(self, evidence: Sequence[RawEvidence]) -> Manifest:
        return Manifest(
            indicator_id=self.indicator_id,
            title="General election turnout",
            sector="government-politics",
            publisher="UK Parliament (electionresults.parliament.uk)",
            source_url="https://electionresults.parliament.uk/general-elections",
            series_id="general-elections.csv (non-notional UK totals)",
            geography="United Kingdom (K02000001)",
            frequency="ad_hoc",
            unit=UNIT,
            definition=(
                "UK-wide general election turnout: total valid votes divided by "
                "total registered electorate, as percent. Notional boundary "
                "rows excluded."
            ),
            licence="Open Parliament Licence",
            agent_owner="government",
            connector_module="government.connectors.general_election_turnout",
            curated_path="curated/observations.csv",
            update_cadence="after each UK general election",
            raw_evidence=list(evidence),
            notion_registry_url="https://app.notion.com/40d65471768581869a06c08d6ffa500f",
            transformations=(
                "Parse electionresults.parliament.uk general-elections.csv. Drop "
                "Is notional=true. Turnout=100*valid/electorate."
            ),
            caveats=(
                "Open machine-readable national totals currently cover recent "
                "elections (from 2010 in this feed). Longer Commons Library "
                "1918– series was HTTP 403 at ingest time — extend when OPL "
                "download is reachable."
            ),
            revision_notes="Pinned 2026-11-03 from electionresults.parliament.uk.",
            open_questions=[
                "Backfill 1918–2005 from Commons Library CBP-8060/CBP-8647 when accessible.",
            ],
        )

    def evidence_from_pinned_raw(self) -> RawEvidence:
        return evidence_from_file(
            self.data_root,
            PINNED,
            source_url=SOURCE_URL,
            content_type="text/csv",
            official_release_date="2024-07-04",
        )

    def transform(self, evidence: Sequence[RawEvidence]) -> list[Observation]:
        if not evidence:
            raise ValueError("transform() requires RawEvidence")
        return parse_turnout(self.data_root / evidence[0].path)


def main() -> None:
    connector = GeneralElectionTurnoutConnector()
    evidence = connector.evidence_from_pinned_raw()
    observations = connector.transform([evidence])
    manifest_path, curated_path = connector.write_hand_off([evidence], observations)
    print(f"indicator_id: {connector.indicator_id} rows={len(observations)}")
    print(manifest_path, curated_path)


if __name__ == "__main__":
    main()
