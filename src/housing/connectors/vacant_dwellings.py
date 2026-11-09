"""MHCLG Live Table 615 — vacant dwellings (all + long-term).

Approach:
1. Pin Live_Table_615.ods.
2. Emit England (+ region + LA) annual observations for All_vacants and
   All_long_term_vacants sheets.
3. Tag series=all-vacants | long-term-vacants in notes.
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

PINNED_RAW = "raw/2026-11-04/Live_Table_615.ods"
SOURCE_LANDING = (
    "https://www.gov.uk/government/statistical-data-sets/"
    "live-tables-on-dwelling-stock-including-vacants"
)
PINNED_URL = (
    "https://assets.publishing.service.gov.uk/media/"
    "6a2bf816e50716856ed4afdd/Live_Table_615.ods"
)
OFFICIAL_RELEASE_DATE = "2025-11-30"
SOURCE_VERSION = "Live Table 615 (vacants to Oct 2025)"
UNIT = "dwellings (vacant)"
MISSING = {"[x]", "[z]", "..", "…", ""}

SHEETS: tuple[tuple[str, str], ...] = (
    ("All_vacants", "all-vacants"),
    ("All_long_term_vacants", "long-term-vacants"),
)


def _parse_number(raw: str) -> tuple[float | None, ObservationStatus]:
    text = raw.strip().replace(",", "")
    if not text or text in MISSING:
        return None, "missing"
    return float(text), "final"


def _parse_date_header(raw: str) -> tuple[str, str] | None:
    # e.g. 06/10/2025
    text = raw.strip()
    parts = text.split("/")
    if len(parts) != 3:
        return None
    d, m, y = parts
    if not (d.isdigit() and m.isdigit() and y.isdigit()):
        return None
    day, month, year = int(d), int(m), int(y)
    start = f"{year:04d}-{month:02d}-{day:02d}"
    return start, start


def parse_table_615(path: Path) -> list[Observation]:
    observations: list[Observation] = []
    for sheet, series in SHEETS:
        rows = read_ods_sheet(path, sheet)
        header_idx = None
        for i, row in enumerate(rows):
            if row and row[0].strip() == "ONS code":
                header_idx = i
                break
        if header_idx is None:
            raise ValueError(f"No header on {sheet}")
        header = rows[header_idx]
        year_cols: list[tuple[int, str, str]] = []
        for idx, cell in enumerate(header[2:], start=2):
            bounds = _parse_date_header(cell)
            if bounds:
                year_cols.append((idx, bounds[0], bounds[1]))
        if not year_cols:
            raise ValueError(f"No date columns on {sheet}")

        for row in rows[header_idx + 1 :]:
            if not row or len(row) < 2:
                continue
            code = row[0].strip()
            label = row[1].strip()
            if not code.startswith("E"):
                continue
            for idx, start, end in year_cols:
                raw = row[idx] if idx < len(row) else ""
                value, status = _parse_number(raw)
                observations.append(
                    Observation(
                        indicator_id="vacant-dwellings",
                        period_start=start,
                        period_end=end,
                        geography_code=code,
                        geography_label=label,
                        value=value,
                        unit=UNIT,
                        observation_status=status,
                        source_version=SOURCE_VERSION,
                        notes=(
                            f"series={series}; table=615; "
                            "council-tax vacants (not census occupancy)"
                        ),
                    )
                )
    if not observations:
        raise ValueError("No vacant-dwellings observations parsed")
    observations.sort(key=lambda o: (o.period_start, o.geography_code, o.notes))
    return observations


class VacantDwellingsConnector(Connector):
    def __init__(self, data_root: Path | None = None) -> None:
        super().__init__(data_root or (HOUSING_DATA / "vacant-dwellings"))

    @property
    def indicator_id(self) -> str:
        return "vacant-dwellings"

    def build_manifest(self, evidence: Sequence[RawEvidence]) -> Manifest:
        return Manifest(
            indicator_id=self.indicator_id,
            title="Vacant dwellings",
            sector="housing-land",
            publisher="MHCLG",
            source_url=SOURCE_LANDING,
            series_id="Live Table 615 (all vacants + long-term vacants)",
            geography="England, regions and local authority districts",
            frequency="annual (October council-tax snapshot)",
            unit=UNIT,
            definition=(
                "Empty properties classified for council tax (all vacants) and "
                "long-term vacants empty more than six months. Not second homes."
            ),
            licence="Open Government Licence v3.0",
            agent_owner="housing",
            connector_module="housing.connectors.vacant_dwellings",
            curated_path="curated/observations.csv",
            update_cadence="annual",
            raw_evidence=list(evidence),
            transformations=(
                "Parse All_vacants and All_long_term_vacants; emit series=* notes."
            ),
            caveats=(
                "Council Taxbase definitions — distinct from census unoccupied. "
                "Do not equate with second homes. Boundary changes create [x] gaps."
            ),
            revision_notes="Pinned Live_Table_615.ods 2026-11-04 (through Oct 2025).",
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
        return parse_table_615(self.data_root / evidence[0].path)


def main() -> None:
    connector = VacantDwellingsConnector()
    evidence = connector.evidence_from_pinned_raw()
    observations = connector.transform([evidence])
    manifest_path, curated_path = connector.write_hand_off([evidence], observations)
    eng = [o for o in observations if o.geography_code == "E92000001" and o.value is not None]
    print(f"indicator_id: {connector.indicator_id}")
    print(f"observations: {len(observations)} (England valued {len(eng)})")
    print(f"manifest: {manifest_path}")
    print(f"curated: {curated_path}")


if __name__ == "__main__":
    main()
