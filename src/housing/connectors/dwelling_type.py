"""Census 2021 TS044 — accommodation type (households).

Approach:
1. Pin Nomis bulk census2021-ts044.zip.
2. Read country + region CSVs.
3. Emit one Observation per geography × accommodation type
   (demographic=detached|semi-detached|…).

Unit is households (Census), not dwellings — labelled clearly in the manifest.
"""

from __future__ import annotations

import csv
import zipfile
from datetime import datetime, timezone
from io import StringIO
from pathlib import Path
from typing import Sequence

from britain_exchange.checksum import sha256_file
from britain_exchange.connector import Connector
from britain_exchange.manifest import Manifest, RawEvidence
from britain_exchange.observation import Observation
from britain_exchange.paths import HOUSING_DATA

PINNED_RAW = "raw/2026-11-04/census2021-ts044.zip"
SOURCE_LANDING = "https://www.ons.gov.uk/datasets/TS044"
PINNED_URL = "https://www.nomisweb.co.uk/output/census/2021/census2021-ts044.zip"
OFFICIAL_RELEASE_DATE = "2023-03-28"
SOURCE_VERSION = "Census 2021 TS044 v4 (Nomis bulk)"
UNIT = "households"

# CSV column suffix → demographic slug
TYPE_COLUMNS: tuple[tuple[str, str], ...] = (
    ("Accommodation type: Detached", "detached"),
    ("Accommodation type: Semi-detached", "semi-detached"),
    ("Accommodation type: Terraced", "terraced"),
    (
        "Accommodation type: In a purpose-built block of flats or tenement",
        "purpose-built-flat",
    ),
    (
        "Accommodation type: Part of a converted or shared house, including bedsits",
        "converted-or-shared",
    ),
    (
        "Accommodation type: Part of another converted building, for example, former school, church or warehouse",
        "converted-other-building",
    ),
    (
        "Accommodation type: In a commercial building, for example, in an office building, hotel or over a shop",
        "commercial-building",
    ),
    (
        "Accommodation type: A caravan or other mobile or temporary structure",
        "caravan-or-temporary",
    ),
    ("Accommodation type: Total: All households", "all-households"),
)


def _read_members(zip_path: Path, names: Sequence[str]) -> list[Observation]:
    observations: list[Observation] = []
    with zipfile.ZipFile(zip_path) as archive:
        for member in names:
            text = archive.read(member).decode("utf-8-sig")
            reader = csv.DictReader(StringIO(text))
            for row in reader:
                code = (row.get("geography code") or "").strip()
                label = (row.get("geography") or "").strip()
                if not code:
                    continue
                # Keep England, Wales, E&W, and English regions only for the explorer.
                if not (
                    code in {"E92000001", "W92000004", "K04000001"}
                    or code.startswith("E12")
                ):
                    continue
                for col, demo in TYPE_COLUMNS:
                    raw = (row.get(col) or "").strip()
                    if not raw:
                        continue
                    observations.append(
                        Observation(
                            indicator_id="dwelling-type",
                            period_start="2021-03-21",
                            period_end="2021-03-21",
                            geography_code=code,
                            geography_label=label,
                            value=float(raw),
                            unit=UNIT,
                            observation_status="final",
                            source_version=SOURCE_VERSION,
                            notes=(
                                f"demographic={demo}; series=TS044; "
                                "unit=households (Census); census_day=2021-03-21"
                            ),
                        )
                    )
    return observations


def parse_ts044(zip_path: Path) -> list[Observation]:
    observations = _read_members(
        zip_path,
        ("census2021-ts044-ctry.csv", "census2021-ts044-rgn.csv"),
    )
    if not observations:
        raise ValueError("No dwelling-type observations parsed from TS044")
    # Nomis ctry extract can repeat Wales; keep first row per geo × notes.
    deduped: dict[tuple[str, str], Observation] = {}
    for obs in observations:
        key = (obs.geography_code, obs.notes)
        deduped.setdefault(key, obs)
    observations = sorted(deduped.values(), key=lambda o: (o.geography_code, o.notes))
    return observations


class DwellingTypeConnector(Connector):
    def __init__(self, data_root: Path | None = None) -> None:
        super().__init__(data_root or (HOUSING_DATA / "dwelling-type"))

    @property
    def indicator_id(self) -> str:
        return "dwelling-type"

    def build_manifest(self, evidence: Sequence[RawEvidence]) -> Manifest:
        return Manifest(
            indicator_id=self.indicator_id,
            title="Dwelling type (accommodation type)",
            sector="housing-land",
            publisher="ONS",
            source_url=SOURCE_LANDING,
            series_id="Census 2021 TS044 Accommodation type",
            geography="England, Wales, E&W and English regions",
            frequency="census (2021)",
            unit=UNIT,
            definition=(
                "Census 2021 households by accommodation type (detached, "
                "semi-detached, terraced, flats and other categories)."
            ),
            licence="Open Government Licence v3.0",
            agent_owner="housing",
            connector_module="housing.connectors.dwelling_type",
            curated_path="curated/observations.csv",
            update_cadence="decennial census",
            raw_evidence=list(evidence),
            transformations=(
                "Parse Nomis bulk ctry + rgn CSVs; demographic=* notes."
            ),
            caveats=(
                "HOUSEHOLDS, not dwellings. Not comparable to Live Table 104. "
                "Census Day 21 March 2021. Definition changes vs 2011."
            ),
            revision_notes="Pinned Nomis bulk zip 2026-11-04 (TS044 v4).",
        )

    def evidence_from_pinned_raw(self) -> RawEvidence:
        path = self.data_root / PINNED_RAW
        if not path.is_file():
            raise FileNotFoundError(path)
        return RawEvidence(
            path=PINNED_RAW,
            retrieved_at=datetime.now(timezone.utc).isoformat(),
            checksum_sha256=sha256_file(path),
            content_type="application/zip",
            official_release_date=OFFICIAL_RELEASE_DATE,
            source_url=PINNED_URL,
        )

    def transform(self, evidence: Sequence[RawEvidence]) -> list[Observation]:
        if not evidence:
            raise ValueError("transform() requires RawEvidence")
        return parse_ts044(self.data_root / evidence[0].path)


def main() -> None:
    connector = DwellingTypeConnector()
    evidence = connector.evidence_from_pinned_raw()
    observations = connector.transform([evidence])
    manifest_path, curated_path = connector.write_hand_off([evidence], observations)
    print(f"indicator_id: {connector.indicator_id}")
    print(f"observations: {len(observations)}")
    print(f"manifest: {manifest_path}")
    print(f"curated: {curated_path}")


if __name__ == "__main__":
    main()
