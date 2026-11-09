"""MHCLG Live Table 109 — dwelling stock by tenure and English region.

Approach:
1. Pin LiveTable109.ods sheet LT_109c_unrounded.
2. Emit annual observations per region × tenure slug.
3. Prefer years with regional values (from 2002); keep England for all years.
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

PINNED_RAW = "raw/2026-11-04/LiveTable109.ods"
SOURCE_LANDING = (
    "https://www.gov.uk/government/statistical-data-sets/"
    "live-tables-on-dwelling-stock-including-vacants"
)
PINNED_URL = (
    "https://assets.publishing.service.gov.uk/media/"
    "6ac3c719c9bd185c481eca13/LiveTable109.ods"
)
OFFICIAL_RELEASE_DATE = "2026-05-21"
SOURCE_VERSION = "Live Table 109c unrounded 2026-05-21"
UNIT = "dwellings"
MISSING = {"[x]", "[z]", "..", "…", ""}

TENURE_MAP = {
    "Owner occupied": "owner-occupied",
    "Rented privately or with a job or business": "private-rented",
    "Rented from private registered providers": "private-registered-provider",
    "Rented from local authorities": "local-authority",
    "Other public sector dwellings": "other-public-sector",
    "All dwellings": "all-dwellings",
}

REGION_CODES = {
    "England": "E92000001",
    "North East": "E12000001",
    "North West": "E12000002",
    "Yorkshire and the Humber": "E12000003",
    "East Midlands": "E12000004",
    "West Midlands": "E12000005",
    "East of England": "E12000006",
    "London": "E12000007",
    "South East": "E12000008",
    "South West": "E12000009",
}


def _parse_number(raw: str) -> tuple[float | None, ObservationStatus]:
    text = raw.strip().replace(",", "")
    if not text or text in MISSING:
        return None, "missing"
    return float(text), "final"


def parse_table_109(path: Path) -> list[Observation]:
    rows = read_ods_sheet(path, "LT_109c_unrounded")
    header_idx = None
    for i, row in enumerate(rows):
        if row and row[0].strip() == "Tenure":
            header_idx = i
            break
    if header_idx is None:
        raise ValueError("LT_109c header not found")
    header = rows[header_idx]
    region_cols: list[tuple[int, str, str]] = []
    for idx, name in enumerate(header[2:], start=2):
        label = name.strip()
        code = REGION_CODES.get(label)
        if code:
            region_cols.append((idx, code, label))

    observations: list[Observation] = []
    for row in rows[header_idx + 1 :]:
        if not row or len(row) < 3:
            continue
        tenure_raw = row[0].strip()
        tenure = TENURE_MAP.get(tenure_raw)
        year_raw = row[1].strip()
        if not tenure or not year_raw.isdigit():
            continue
        year = int(year_raw)
        for idx, code, label in region_cols:
            raw = row[idx] if idx < len(row) else ""
            value, status = _parse_number(raw)
            observations.append(
                Observation(
                    indicator_id="dwelling-stock-by-region",
                    period_start=f"{year:04d}-03-31",
                    period_end=f"{year:04d}-03-31",
                    geography_code=code,
                    geography_label=label,
                    value=value,
                    unit=UNIT,
                    observation_status=status,
                    source_version=SOURCE_VERSION,
                    notes=(
                        f"tenure={tenure}; series=LiveTable109; "
                        "snapshot=31 March; England regions"
                    ),
                )
            )
    if not observations:
        raise ValueError("No dwelling-stock-by-region observations")
    observations.sort(key=lambda o: (o.period_start, o.geography_code, o.notes))
    return observations


class DwellingStockByRegionConnector(Connector):
    def __init__(self, data_root: Path | None = None) -> None:
        super().__init__(data_root or (HOUSING_DATA / "dwelling-stock-by-region"))

    @property
    def indicator_id(self) -> str:
        return "dwelling-stock-by-region"

    def build_manifest(self, evidence: Sequence[RawEvidence]) -> Manifest:
        return Manifest(
            indicator_id=self.indicator_id,
            title="Dwelling stock by tenure and region",
            sector="housing-land",
            publisher="MHCLG",
            source_url=SOURCE_LANDING,
            series_id="Live Table 109c (unrounded)",
            geography="England and English regions",
            frequency="annual (31 March)",
            unit=UNIT,
            definition=(
                "Estimated dwelling stock by tenure for England and English regions, "
                "31 March each year."
            ),
            licence="Open Government Licence v3.0",
            agent_owner="housing",
            connector_module="housing.connectors.dwelling_stock_by_region",
            curated_path="curated/observations.csv",
            update_cadence="annual",
            raw_evidence=list(evidence),
            transformations="Parse LT_109c_unrounded; tenure=* notes per region.",
            caveats=(
                "Dwelling stock estimates (census + net additions). "
                "Regional tenure splits incomplete before ~2002. "
                "Not household tenure (Census)."
            ),
            revision_notes="Pinned LiveTable109.ods 2026-11-04 (to 31 March 2025).",
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
        return parse_table_109(self.data_root / evidence[0].path)


def main() -> None:
    connector = DwellingStockByRegionConnector()
    evidence = connector.evidence_from_pinned_raw()
    observations = connector.transform([evidence])
    manifest_path, curated_path = connector.write_hand_off([evidence], observations)
    print(f"indicator_id: {connector.indicator_id}")
    print(f"observations: {len(observations)}")
    print(f"manifest: {manifest_path}")
    print(f"curated: {curated_path}")


if __name__ == "__main__":
    main()
