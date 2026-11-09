"""MHCLG RO4 — local authority homelessness expenditure (Domain 08).

Approach:
1. Pin Revenue Outturn housing services (RO4) for 2024-25.
2. Read the published England row (ONS code E92000001). Do not sum
   authorities yourself — the workbook already estimates the England total.
3. Emit net and gross current expenditure (£ thousand) for temporary
   accommodation types and for total homelessness.

These are annual flows of money, not stocks of households.

Ref: https://www.gov.uk/government/statistics/local-authority-revenue-expenditure-and-financing-england-2024-to-2025-individual-local-authority-data-outturn
"""

from __future__ import annotations

import shutil
from datetime import datetime, timezone
from pathlib import Path
from typing import Sequence

from britain_exchange.checksum import sha256_file
from britain_exchange.connector import Connector
from britain_exchange.manifest import Manifest, RawEvidence
from britain_exchange.observation import Observation, ObservationStatus
from britain_exchange.paths import HOUSING_DATA
from housing.ods_util import read_ods_sheet

PIN_DIR = "raw/2026-11-04"
STAGING_FILE = "RO4_LA_Data_2024-25.ods"
PINNED_URL = (
    "https://assets.publishing.service.gov.uk/media/"
    "6a291b65e371d9d2c0052b83/RO4_LA_Data_2024-25_data_by_LA.ods"
)
SOURCE_LANDING = (
    "https://www.gov.uk/government/statistics/"
    "local-authority-revenue-expenditure-and-financing-england-2024-to-2025-"
    "individual-local-authority-data-outturn"
)
OFFICIAL_RELEASE_DATE = "2026-06-11"
SOURCE_VERSION = "RO4 housing services 2024-25 outturn"
ENGLAND_CODE = "E92000001"
ENGLAND_LABEL = "England"
# Financial year 2024-25 ends 31 March 2025.
PERIOD_START = "2024-04-01"
PERIOD_END = "2025-03-31"
SHEET = "RO4_LA_Data_202425"

# (column index, series slug) on the England row. Indices from the header row.
# Net = C7; gross = C3. Units are £ thousand.
SERIES_COLUMNS: tuple[tuple[int, str], ...] = (
    (37, "nightly-paid-gross"),
    (41, "nightly-paid-net"),
    (44, "private-leased-gross"),
    (48, "private-leased-net"),
    (51, "hostels-gross"),
    (55, "hostels-net"),
    (58, "bed-and-breakfast-gross"),
    (62, "bed-and-breakfast-net"),
    (65, "la-or-ha-stock-gross"),
    (69, "la-or-ha-stock-net"),
    (72, "other-temporary-gross"),
    (76, "other-temporary-net"),
    (79, "ta-administration-gross"),
    (83, "ta-administration-net"),
    (86, "homelessness-reduction-act-gross"),
    (90, "homelessness-reduction-act-net"),
    (93, "non-homelessness-reduction-act-gross"),
    (97, "non-homelessness-reduction-act-net"),
    (100, "homelessness-total-gross"),
    (104, "homelessness-total-net"),
)


def _parse_number(raw: str) -> tuple[float | None, ObservationStatus]:
    text = raw.strip().replace(",", "")
    if text in {"", "[x]", "[z]", "[n]", "[Y]", ".."}:
        return None, "missing"
    try:
        return float(text), "final"
    except ValueError:
        return None, "missing"


def parse_england_spend(path: Path) -> list[Observation]:
    rows = read_ods_sheet(path, SHEET)
    england = None
    for row in rows:
        if len(row) > 2 and row[1].strip() == ENGLAND_CODE:
            england = row
            break
    if england is None:
        raise ValueError("RO4 England row (E92000001) not found")

    out: list[Observation] = []
    for col, series in SERIES_COLUMNS:
        if col >= len(england):
            raise ValueError(f"RO4 column {col} missing for {series}")
        value, status = _parse_number(england[col])
        out.append(
            Observation(
                indicator_id="temporary-accommodation-spend",
                period_start=PERIOD_START,
                period_end=PERIOD_END,
                geography_code=ENGLAND_CODE,
                geography_label=ENGLAND_LABEL,
                value=value,
                unit="gbp-thousands",
                observation_status=status,
                source_version=SOURCE_VERSION,
                notes=(
                    f"series={series}; measure=flow; "
                    "basis=non-IAS19; unit=gbp-thousands"
                ),
            )
        )
    return out


class TemporaryAccommodationSpendConnector(Connector):
    def __init__(self, data_root: Path | None = None) -> None:
        super().__init__(data_root or (HOUSING_DATA / "temporary-accommodation-spend"))

    @property
    def indicator_id(self) -> str:
        return "temporary-accommodation-spend"

    def build_manifest(self, evidence: Sequence[RawEvidence]) -> Manifest:
        return Manifest(
            indicator_id=self.indicator_id,
            title="Temporary accommodation and homelessness expenditure (RO4)",
            sector="housing-land",
            publisher="MHCLG",
            source_url=SOURCE_LANDING,
            series_id="RO4 housing services — homelessness lines",
            geography="England (E92000001)",
            frequency="annual financial year (flow)",
            unit="£ thousand",
            definition=(
                "Local authority General Fund net and gross current expenditure "
                "on homelessness and temporary accommodation, England total as "
                "published on the RO4 outturn workbook."
            ),
            licence="Open Government Licence v3.0",
            agent_owner="housing",
            connector_module="housing.connectors.temporary_accommodation_spend",
            curated_path="curated/observations.csv",
            update_cadence="annual",
            raw_evidence=list(evidence),
            transformations=(
                "Read the published England row. Do not re-sum local authorities. "
                "Series are TA type and total homelessness, gross (C3) and net (C7)."
            ),
            caveats=(
                "Annual money flow, not a stock of households. £ thousand, "
                "non-IAS19. Do not add to household counts. Reporting categories "
                "inside temporary accommodation changed between years — compare "
                "the total homelessness line, not a single TA type, across years."
            ),
            revision_notes="Domain 08 ingest 2026-11-04. One financial year (2024-25).",
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
            content_type="application/vnd.oasis.opendocument.spreadsheet",
            official_release_date=OFFICIAL_RELEASE_DATE,
            source_url=PINNED_URL,
        )

    def transform(self, evidence: Sequence[RawEvidence]) -> list[Observation]:
        if not evidence:
            raise ValueError("transform() requires RawEvidence")
        return parse_england_spend(self.data_root / evidence[0].path)


def main() -> None:
    staging = HOUSING_DATA / "_insecurity_pin" / "2026-11-04" / STAGING_FILE
    dest_dir = HOUSING_DATA / "temporary-accommodation-spend" / PIN_DIR
    dest_dir.mkdir(parents=True, exist_ok=True)
    dest = dest_dir / STAGING_FILE
    if not staging.is_file():
        raise FileNotFoundError(staging)
    if not dest.is_file() or sha256_file(dest) != sha256_file(staging):
        shutil.copy2(staging, dest)

    connector = TemporaryAccommodationSpendConnector()
    evidence = connector.evidence_from_pinned()
    observations = connector.transform([evidence])
    connector.write_hand_off([evidence], observations)
    net = next(o for o in observations if "homelessness-total-net" in o.notes)
    gross = next(o for o in observations if "homelessness-total-gross" in o.notes)
    print(f"temporary-accommodation-spend: obs={len(observations)}")
    print(f"2024-25 England net £000: {net.value}")
    print(f"2024-25 England gross £000: {gross.value}")


if __name__ == "__main__":
    main()
