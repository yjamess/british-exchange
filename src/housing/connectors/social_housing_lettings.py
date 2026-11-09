"""MHCLG CORE — social housing lettings (Domain 08 Waiting for a Home).

Approach:
1. Pin the Social Housing Lettings tenancies summary ODS.
2. Emit England annual flow of new lettings (Table 1a total + rent/provider splits).
3. Pair with Table 600 stocks in the UI — never invent wait times from 600÷lettings.

Ref: https://www.gov.uk/government/statistics/social-housing-lettings-in-england-april-2024-to-march-2025
"""

from __future__ import annotations

import re
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
STAGING_FILE = "CORE_social_housing_lettings_tenancies_2024-25.ods"
PINNED_URL = (
    "https://assets.publishing.service.gov.uk/media/"
    "69147610eba5bda2026fc827/"
    "Social_Housing_Lettings_in_England__Tenancies_Summary_Tables__2024-25.ods"
)
SOURCE_LANDING = (
    "https://www.gov.uk/government/statistics/"
    "social-housing-lettings-in-england-april-2024-to-march-2025"
)
OFFICIAL_RELEASE_DATE = "2025-11-13"
SOURCE_VERSION = "CORE social housing lettings tenancies 2024-25"
ENGLAND_CODE = "E92000001"
ENGLAND_LABEL = "England"
MISSING = {"", "[nc]", "[x]", "[z]", ".."}


def _parse_number(raw: str) -> tuple[float | None, ObservationStatus]:
    text = raw.strip().replace(",", "")
    if text in MISSING:
        return None, "missing"
    try:
        return float(text), "final"
    except ValueError:
        return None, "missing"


def _fy_bounds(label: str) -> tuple[str, str] | None:
    """``2024/25`` → 2024-04-01 … 2025-03-31."""
    m = re.fullmatch(r"(\d{4})/(\d{2})", label.strip())
    if not m:
        return None
    y0 = int(m.group(1))
    return f"{y0:04d}-04-01", f"{y0 + 1:04d}-03-31"


def parse_table_1a(path: Path) -> list[Observation]:
    rows = read_ods_sheet(path, "Table_1a")
    header_idx = None
    for i, row in enumerate(rows):
        if row and row[0].strip() == "Financial year":
            header_idx = i
            break
    if header_idx is None:
        raise ValueError("CORE Table_1a header not found")
    header = rows[header_idx]
    # Col 1 = Total; remaining = product/provider splits.
    series_cols: list[tuple[int, str]] = [(1, "lettings-total")]
    for idx, name in enumerate(header[2:], start=2):
        low = re.sub(r"\[note[^\]]*\]", "", name, flags=re.I).strip().lower()
        slug = re.sub(r"[^a-z0-9]+", "-", low).strip("-")[:50]
        if slug:
            series_cols.append((idx, slug))

    out: list[Observation] = []
    for row in rows[header_idx + 1 :]:
        if not row or not row[0].strip():
            continue
        bounds = _fy_bounds(row[0])
        if bounds is None:
            continue
        for col, series in series_cols:
            if col >= len(row):
                continue
            value, status = _parse_number(row[col])
            out.append(
                Observation(
                    indicator_id="social-housing-lettings",
                    period_start=bounds[0],
                    period_end=bounds[1],
                    geography_code=ENGLAND_CODE,
                    geography_label=ENGLAND_LABEL,
                    value=value,
                    unit="lettings",
                    observation_status=status,
                    source_version=SOURCE_VERSION,
                    notes=f"series={series}; measure=flow; table=Table_1a",
                )
            )
    if not out:
        raise ValueError("No CORE lettings observations")
    out.sort(key=lambda o: (o.period_start, o.notes))
    return out


class SocialHousingLettingsConnector(Connector):
    def __init__(self, data_root: Path | None = None) -> None:
        super().__init__(data_root or (HOUSING_DATA / "social-housing-lettings"))

    @property
    def indicator_id(self) -> str:
        return "social-housing-lettings"

    def build_manifest(self, evidence: Sequence[RawEvidence]) -> Manifest:
        return Manifest(
            indicator_id=self.indicator_id,
            title="Social housing lettings (CORE)",
            sector="housing-land",
            publisher="MHCLG",
            source_url=SOURCE_LANDING,
            series_id="CORE Table 1a — new social housing lettings",
            geography="England (E92000001)",
            frequency="annual financial year (flow)",
            unit="lettings",
            definition=(
                "New social housing lettings recorded in CORE for the financial year "
                "(Social Rent / Affordable Rent × General Needs / Supported × LA/PRP)."
            ),
            licence="Open Government Licence v3.0",
            agent_owner="housing",
            connector_module="housing.connectors.social_housing_lettings",
            curated_path="curated/observations.csv",
            update_cadence="annual",
            raw_evidence=list(evidence),
            transformations="Parse Table_1a; series=lettings-total plus product splits.",
            caveats=(
                "Flow of new lettings — not stock on the register. Do not divide "
                "Table 600 by lettings to invent an individual waiting time. "
                "Coverage and weighting notes in CORE technical notes."
            ),
            revision_notes="Domain 08 ingest 2026-11-04.",
            related_indicator_ids=["social-housing-waiting-list"],
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
        return parse_table_1a(self.data_root / evidence[0].path)


def main() -> None:
    staging = HOUSING_DATA / "_insecurity_pin" / "2026-11-04" / STAGING_FILE
    dest_dir = HOUSING_DATA / "social-housing-lettings" / PIN_DIR
    dest_dir.mkdir(parents=True, exist_ok=True)
    dest = dest_dir / STAGING_FILE
    if not staging.is_file():
        raise FileNotFoundError(staging)
    if not dest.is_file() or sha256_file(dest) != sha256_file(staging):
        shutil.copy2(staging, dest)

    connector = SocialHousingLettingsConnector()
    evidence = connector.evidence_from_pinned()
    observations = connector.transform([evidence])
    connector.write_hand_off([evidence], observations)
    latest = [
        o
        for o in observations
        if o.period_start.startswith("2024") and "lettings-total" in o.notes
    ]
    print(f"social-housing-lettings: obs={len(observations)}")
    print("2024/25 total:", latest[0].value if latest else None)


if __name__ == "__main__":
    main()
