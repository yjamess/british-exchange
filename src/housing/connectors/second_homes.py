"""MHCLG Council Taxbase Table 4 — second homes in England.

Approach:
1. Pin Tables 1–5 from the Council Taxbase 2025 release (revised 21 January 2026).
2. Keep four dwelling counts: the total, homes with neither a discount nor a
   premium, homes with a discount, and homes charged the second-homes premium.
3. Table 4 prints a year, not a day. Each row is stored as 1 October of that
   year, which is the month of the council-tax snapshot. The 2025 release
   dates that snapshot as 6 October 2025.

These are furnished dwellings with nobody living in them as a main home.
They are not Live Table 615 vacants, and they exclude holiday lets on
business rates.
"""

from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path
from typing import Sequence

from britain_exchange.checksum import sha256_file
from britain_exchange.connector import Connector
from britain_exchange.manifest import Manifest, RawEvidence
from britain_exchange.observation import Observation, ObservationStatus
from britain_exchange.paths import HOUSING_DATA
from housing.ods_util import read_ods_sheet

PINNED_RAW = "raw/2026-11-05/Tables_1_-_5_2025.ods"
SOURCE_LANDING = "https://www.gov.uk/government/statistics/council-taxbase-2025-in-england"
PINNED_URL = (
    "https://assets.publishing.service.gov.uk/media/"
    "6a7eef0b0ad4bc475be7de98/Tables_1_-_5_2025.ods"
)
OFFICIAL_RELEASE_DATE = "2026-01-21"
SOURCE_VERSION = "Council Taxbase 2025 Table 4 (revised 2026-01-21)"
UNIT = "dwellings"
# Published England total for 2025 in the revised Table 4. A wrong sheet fails here.
PINNED_TOTAL_2025 = 267_894
MISSING = {"[x]", "[z]", "..", "…", "", "[p]", "[r]"}

# Label prefix on Table 4 → series slug. Discount bands and percentages stay out:
# they are either a split of "subject-to-discount" or a different unit.
SERIES_PREFIXES: tuple[tuple[str, str], ...] = (
    ("Total number of dwellings classed as second homes", "total"),
    (
        "Number of second homes not subject to a discount or charged a premium",
        "no-discount-or-premium",
    ),
    ("Number of second homes subject to a discount", "subject-to-discount"),
    ("Number of second homes charged a premium", "charged-premium"),
)


def _parse_number(raw: str) -> tuple[float | None, ObservationStatus]:
    text = raw.strip().replace(",", "").replace("%", "")
    if not text or text in MISSING:
        return None, "missing"
    return float(text), "final"


def _series_for(label: str) -> str | None:
    for prefix, slug in SERIES_PREFIXES:
        if label.startswith(prefix):
            return slug
    return None


def parse_table_4(path: Path) -> list[Observation]:
    rows = read_ods_sheet(path, "Table_4")
    header: list[str] | None = None
    for row in rows:
        if row and row[0].strip() == "Year":
            header = row
            break
    if header is None:
        raise ValueError("Table 4 year header not found")

    years: list[tuple[int, int]] = []
    for idx, cell in enumerate(header):
        text = cell.strip()
        if text.isdigit():
            years.append((idx, int(text)))
    if not years:
        raise ValueError("Table 4 has no year columns")

    observations: list[Observation] = []
    for row in rows:
        if not row:
            continue
        slug = _series_for(row[0].strip())
        if slug is None:
            continue
        for idx, year in years:
            raw = row[idx] if idx < len(row) else ""
            value, status = _parse_number(raw)
            # 1 October stands in for the Table 4 year. See the module docstring.
            period = f"{year:04d}-10-01"
            observations.append(
                Observation(
                    indicator_id="second-homes",
                    period_start=period,
                    period_end=period,
                    geography_code="E92000001",
                    geography_label="England",
                    value=value,
                    unit=UNIT,
                    observation_status=status,
                    source_version=SOURCE_VERSION,
                    notes=(
                        f"series={slug}; snapshot=Council Taxbase October; "
                        "Table 4 publishes the year only"
                    ),
                )
            )

    total_2025 = next(
        (
            row
            for row in observations
            if row.period_start == "2025-10-01" and row.notes.startswith("series=total;")
        ),
        None,
    )
    if total_2025 is None or total_2025.value != PINNED_TOTAL_2025:
        raise ValueError(
            "Table 4 2025 second-homes total does not match the revised release "
            f"({PINNED_TOTAL_2025})"
        )
    observations.sort(key=lambda row: (row.notes, row.period_start))
    return observations


class SecondHomesConnector(Connector):
    def __init__(self, data_root: Path | None = None) -> None:
        super().__init__(data_root or (HOUSING_DATA / "second-homes"))

    @property
    def indicator_id(self) -> str:
        return "second-homes"

    def build_manifest(self, evidence: Sequence[RawEvidence]) -> Manifest:
        return Manifest(
            indicator_id=self.indicator_id,
            title="Second homes",
            sector="housing-land",
            publisher="MHCLG",
            source_url=SOURCE_LANDING,
            series_id="Council Taxbase Table 4",
            geography="England (E92000001)",
            frequency="annual (October council-tax snapshot)",
            unit=UNIT,
            definition=(
                "Dwellings recorded as second homes for council tax: furnished, "
                "with nobody living in them as a main residence. Holiday lets on "
                "business rates are excluded. Not Live Table 615 vacants."
            ),
            licence="Open Government Licence v3.0",
            agent_owner="housing",
            connector_module="housing.connectors.second_homes",
            curated_path="curated/observations.csv",
            update_cadence="annual",
            raw_evidence=list(evidence),
            related_indicator_ids=["vacant-dwellings"],
            transformations=(
                "Parse Table_4 year columns into series=total, "
                "no-discount-or-premium, subject-to-discount, charged-premium. "
                "Year stored as 1 October. [x] → missing."
            ),
            caveats=(
                "England only, 2021–2025. The second-homes premium starts in "
                "2025, so earlier premium cells are missing. A 2021–2024 drop "
                "in 'no discount or premium' is the premium starting, not homes "
                "disappearing. Not comparable with the English Housing Survey "
                "second-homes definition."
            ),
            revision_notes=(
                "Pinned Tables_1_-_5_2025.ods revised 21 January 2026. "
                "2025 England total checked at 267,894."
            ),
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
        return parse_table_4(self.data_root / evidence[0].path)


def main() -> None:
    connector = SecondHomesConnector()
    evidence = connector.evidence_from_pinned_raw()
    observations = connector.transform([evidence])
    manifest_path, curated_path = connector.write_hand_off([evidence], observations)
    valued = [row for row in observations if row.value is not None]
    print(f"indicator_id: {connector.indicator_id}")
    print(f"observations: {len(observations)} (valued {len(valued)})")
    print(f"manifest: {manifest_path}")
    print(f"curated: {curated_path}")


if __name__ == "__main__":
    main()
