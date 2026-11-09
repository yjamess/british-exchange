"""MoJ mortgage and landlord possession statistics (Domain 08).

Approach:
1. Pin the latest quarterly MoJ ODS tables.
2. Emit England & Wales quarterly flows for mortgage and landlord:
   claims, orders (total), warrants, bailiff repossessions.
3. Tag ``tenure_path=mortgage|landlord`` via series= so Pathways can separate them.

Geography is England & Wales combined (MoJ Tables 1 and 4) — never labelled as
England-only. Table 8/9 split England vs Wales later if needed.

Ref: https://www.gov.uk/government/collections/mortgage-and-landlord-possession-statistics
"""

from __future__ import annotations

import calendar
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
STAGING_FILE = "MoJ_possession_tables_202606.ods"
PINNED_URL = (
    "https://assets.publishing.service.gov.uk/media/"
    "6a7c8afb764399f224d83235/"
    "Mortgage_and_Landlord_Possession_Tables_Q2_April_to_June_2026.ods"
)
SOURCE_LANDING = (
    "https://www.gov.uk/government/statistics/"
    "mortgage-and-landlord-possession-statistics-april-to-june-2026"
)
OFFICIAL_RELEASE_DATE = "2026-08-13"
SOURCE_VERSION = "MoJ possession tables Q2 2026"
GEO_CODE = "K04000001"  # England and Wales
GEO_LABEL = "England and Wales"
MISSING = {"", "..", "-", "[z]", "[x]"}

# Table_1 mortgage / Table_4 landlord: after header, cols are
# year, quarter, (status), claims, outright, suspended, orders_total, warrants, repossessions
# Verified on 2026 Q2 file for quarterly rows.
SERIES_COLS: tuple[tuple[int, str], ...] = (
    (3, "claims"),
    (6, "orders-total"),
    (7, "warrants"),
    (8, "bailiff-repossessions"),
)


def _parse_number(raw: str) -> tuple[float | None, ObservationStatus]:
    text = raw.strip().replace(",", "")
    if text in MISSING:
        return None, "missing"
    try:
        return float(text), "final"
    except ValueError:
        return None, "missing"


def _quarter_bounds(year: int, quarter: str) -> tuple[str, str] | None:
    q = quarter.strip().upper()
    if q not in {"Q1", "Q2", "Q3", "Q4"}:
        return None
    end_month = {"Q1": 3, "Q2": 6, "Q3": 9, "Q4": 12}[q]
    start_month = end_month - 2
    last = calendar.monthrange(year, end_month)[1]
    return f"{year:04d}-{start_month:02d}-01", f"{year:04d}-{end_month:02d}-{last:02d}"


def parse_possession_table(path: Path, sheet: str, path_key: str) -> list[Observation]:
    rows = read_ods_sheet(path, sheet)
    out: list[Observation] = []
    for row in rows:
        if not row or len(row) < 9:
            continue
        year_raw = row[0].strip()
        if not year_raw.isdigit():
            continue
        year = int(year_raw)
        quarter = row[1].strip()
        bounds = _quarter_bounds(year, quarter)
        if bounds is None:
            continue  # skip annual calendar totals
        status_cell = row[2].strip().lower()
        status: ObservationStatus = "provisional" if "(p)" in status_cell else "final"
        for col, series in SERIES_COLS:
            value, cell_status = _parse_number(row[col] if col < len(row) else "")
            out.append(
                Observation(
                    indicator_id="possession-claims",
                    period_start=bounds[0],
                    period_end=bounds[1],
                    geography_code=GEO_CODE,
                    geography_label=GEO_LABEL,
                    value=value,
                    unit="court actions",
                    observation_status=cell_status if cell_status == "missing" else status,
                    source_version=SOURCE_VERSION,
                    notes=(
                        f"series={path_key}-{series}; measure=flow; "
                        f"table={sheet}; path={path_key}"
                    ),
                )
            )
    if not out:
        raise ValueError(f"No quarterly possession rows on {sheet}")
    return out


def parse_all(path: Path) -> list[Observation]:
    mortgage = parse_possession_table(path, "Table_1", "mortgage")
    landlord = parse_possession_table(path, "Table_4", "landlord")
    return sorted(mortgage + landlord, key=lambda o: (o.period_start, o.notes))


class PossessionClaimsConnector(Connector):
    def __init__(self, data_root: Path | None = None) -> None:
        super().__init__(data_root or (HOUSING_DATA / "possession-claims"))

    @property
    def indicator_id(self) -> str:
        return "possession-claims"

    def build_manifest(self, evidence: Sequence[RawEvidence]) -> Manifest:
        return Manifest(
            indicator_id=self.indicator_id,
            title="Mortgage and landlord possession actions",
            sector="housing-land",
            publisher="Ministry of Justice",
            source_url=SOURCE_LANDING,
            series_id="MoJ Tables 1 (mortgage) + 4 (landlord)",
            geography="England and Wales (combined national)",
            frequency="quarterly (flow)",
            unit="court actions",
            definition=(
                "County court possession claims, orders, warrants and bailiff "
                "repossessions for mortgage lenders and landlords. Flow of court "
                "actions — not a count of households made homeless."
            ),
            licence="Open Government Licence v3.0",
            agent_owner="housing",
            connector_module="housing.connectors.possession_claims",
            curated_path="curated/observations.csv",
            update_cadence="quarterly",
            raw_evidence=list(evidence),
            transformations=(
                "Parse quarterly rows from Table_1 and Table_4; skip annual totals; "
                "series=mortgage-*|landlord-*."
            ),
            caveats=(
                "England & Wales combined — not England-only. Claims ≠ repossessions. "
                "COVID-era quarters show sharp drops due to stays on possession."
            ),
            revision_notes="Domain 08 ingest 2026-11-04 (Q2 2026 tables).",
            related_indicator_ids=[
                "statutory-homelessness-assessments",
                "temporary-accommodation-households",
            ],
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
        return parse_all(self.data_root / evidence[0].path)


def main() -> None:
    staging = HOUSING_DATA / "_insecurity_pin" / "2026-11-04" / STAGING_FILE
    dest_dir = HOUSING_DATA / "possession-claims" / PIN_DIR
    dest_dir.mkdir(parents=True, exist_ok=True)
    dest = dest_dir / STAGING_FILE
    if not staging.is_file():
        raise FileNotFoundError(staging)
    if not dest.is_file() or sha256_file(dest) != sha256_file(staging):
        shutil.copy2(staging, dest)

    connector = PossessionClaimsConnector()
    evidence = connector.evidence_from_pinned()
    observations = connector.transform([evidence])
    connector.write_hand_off([evidence], observations)
    latest = [o for o in observations if o.period_start.startswith("2026-04")]
    print(f"possession-claims: obs={len(observations)} 2026Q2={len(latest)}")
    for o in latest:
        print(f"  {o.notes.split(';')[0]} = {o.value}")


if __name__ == "__main__":
    main()
