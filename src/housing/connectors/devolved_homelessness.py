"""Devolved-nation temporary accommodation stocks (Domain 08).

Scotland / Wales / Northern Ireland publish under different legal frameworks.
This connector emits jurisdiction-specific stocks from published bulletins —
never merge into an England or UK rate.

Pinned evidence is a small curated CSV transcribed from official releases
(with source URLs in notes). Prefer machine-readable feeds when SPARQL/ODS
endpoints are stable.
"""

from __future__ import annotations

import csv
import shutil
from datetime import datetime, timezone
from pathlib import Path
from typing import Sequence

from britain_exchange.checksum import sha256_file
from britain_exchange.connector import Connector
from britain_exchange.manifest import Manifest, RawEvidence
from britain_exchange.observation import Observation
from britain_exchange.paths import HOUSING_DATA

PIN_DIR = "raw/2026-11-04"
STAGING_FILE = "devolved_ta_stocks.csv"
SOURCE_LANDING = "https://app.notion.com/p/40e65471768581a2a277cc76f104f990"

# Transcribed from official releases (retrieval 2026-11-04).
ROWS: tuple[tuple[str, str, str, str, float, str, str], ...] = (
    # code, label, start, end, value, series, source
    (
        "S92000003",
        "Scotland",
        "2025-03-31",
        "2025-03-31",
        17240.0,
        "households-in-ta",
        "https://www.gov.scot/publications/homelessness-in-scotland-2024-25/pages/temporary-accommodation/",
    ),
    (
        "S92000003",
        "Scotland",
        "2025-09-30",
        "2025-09-30",
        18092.0,
        "households-in-ta",
        "https://www.gov.scot/publications/homelessness-in-scotland-update-to-30-september-2025/pages/temporary-accommodation/",
    ),
    (
        "W92000004",
        "Wales",
        "2025-03-31",
        "2025-03-31",
        6285.0,
        "households-in-ta",
        "https://www.gov.wales/homelessness-april-2024-march-2025-html",
    ),
    (
        "W92000004",
        "Wales",
        "2025-09-30",
        "2025-09-30",
        6426.0,
        "households-in-ta",
        "https://www.gov.wales/homelessness-april-september-2025-html",
    ),
    (
        "W92000004",
        "Wales",
        "2026-03-31",
        "2026-03-31",
        6201.0,
        "households-in-ta",
        "https://www.gov.wales/homelessness-april-2025-march-2026-html",
    ),
    (
        "N92000002",
        "Northern Ireland",
        "2025-10-01",
        "2025-10-01",
        5408.0,
        "households-in-ta",
        "https://datavis.nisra.gov.uk/communities/northern-ireland-homelessness-bulletin-april-september-2025.html",
    ),
)


def write_staging_csv(path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.writer(handle)
        writer.writerow(
            [
                "geography_code",
                "geography_label",
                "period_start",
                "period_end",
                "value",
                "series",
                "source_url",
            ]
        )
        for row in ROWS:
            writer.writerow(row)


def parse_csv(path: Path) -> list[Observation]:
    out: list[Observation] = []
    with path.open(newline="", encoding="utf-8") as handle:
        for row in csv.DictReader(handle):
            out.append(
                Observation(
                    indicator_id="homelessness-devolved-ta",
                    period_start=row["period_start"],
                    period_end=row["period_end"],
                    geography_code=row["geography_code"],
                    geography_label=row["geography_label"],
                    value=float(row["value"]),
                    unit="households",
                    observation_status="final",
                    source_version="Devolved TA bulletin transcription 2026-11-04",
                    notes=(
                        f"series={row['series']}; measure=stock; "
                        f"jurisdiction={row['geography_label']}; "
                        f"source_url={row['source_url']}"
                    ),
                )
            )
    if not out:
        raise ValueError("No devolved TA observations")
    return out


class DevolvedHomelessnessConnector(Connector):
    def __init__(self, data_root: Path | None = None) -> None:
        super().__init__(data_root or (HOUSING_DATA / "homelessness-devolved-ta"))

    @property
    def indicator_id(self) -> str:
        return "homelessness-devolved-ta"

    def build_manifest(self, evidence: Sequence[RawEvidence]) -> Manifest:
        return Manifest(
            indicator_id=self.indicator_id,
            title="Temporary accommodation — devolved nations",
            sector="housing-land",
            publisher="Scottish Government / Welsh Government / NISRA",
            source_url=SOURCE_LANDING,
            series_id="Jurisdiction TA stocks (bulletin transcription)",
            geography="Scotland, Wales, Northern Ireland (separate series)",
            frequency="point-in-time stock (bulletin dates)",
            unit="households",
            definition=(
                "Households in temporary accommodation under each nation's "
                "homelessness legislation. Distinct legal definitions — do not "
                "sum with England H-CLIC TA or compute a UK rate."
            ),
            licence="Open Government Licence v3.0",
            agent_owner="housing",
            connector_module="housing.connectors.devolved_homelessness",
            curated_path="curated/observations.csv",
            update_cadence="with each national bulletin",
            raw_evidence=list(evidence),
            transformations="Curated CSV from published bulletin headlines; one row per jurisdiction×date.",
            caveats=(
                "Transcription of published headlines pending full ODS/SPARQL "
                "connectors. Never compare levels across nations as if definitions match."
            ),
            revision_notes="Domain 08 initial pin 2026-11-04.",
            related_indicator_ids=["temporary-accommodation-households"],
        )

    def evidence_from_pinned(self) -> RawEvidence:
        rel = f"{PIN_DIR}/{STAGING_FILE}"
        path = self.data_root / rel
        if not path.is_file():
            raise FileNotFoundError(path)
        return RawEvidence(
            path=rel,
            retrieved_at=datetime.now(timezone.utc).isoformat(),
            checksum_sha256=sha256_file(path),
            content_type="text/csv",
            official_release_date="2026-11-04",
            source_url=SOURCE_LANDING,
        )

    def transform(self, evidence: Sequence[RawEvidence]) -> list[Observation]:
        if not evidence:
            raise ValueError("transform() requires RawEvidence")
        return parse_csv(self.data_root / evidence[0].path)


def main() -> None:
    staging_dir = HOUSING_DATA / "_insecurity_pin" / "2026-11-04"
    staging = staging_dir / STAGING_FILE
    write_staging_csv(staging)
    dest_dir = HOUSING_DATA / "homelessness-devolved-ta" / PIN_DIR
    dest_dir.mkdir(parents=True, exist_ok=True)
    shutil.copy2(staging, dest_dir / STAGING_FILE)
    connector = DevolvedHomelessnessConnector()
    evidence = connector.evidence_from_pinned()
    observations = connector.transform([evidence])
    connector.write_hand_off([evidence], observations)
    print(f"homelessness-devolved-ta: obs={len(observations)}")
    for o in observations:
        print(f"  {o.geography_label} {o.period_start}: {o.value}")


if __name__ == "__main__":
    main()
