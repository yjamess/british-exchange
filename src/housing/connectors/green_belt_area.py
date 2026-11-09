"""MHCLG Green Belt statistics — England area time series (hectares).

Approach:
1. Pin Live Tables Green Belt Statistics 2025-26 ODS.
2. Parse ``Area_since_1997`` England annual hectares.
3. Also emit latest LA areas from ``Area_by_LA`` (31 March 2026) for maps.

England-only designation statistics — not UK.
"""

from __future__ import annotations

import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Sequence

from britain_exchange.checksum import sha256_file
from britain_exchange.connector import Connector
from britain_exchange.manifest import Manifest, RawEvidence
from britain_exchange.observation import Observation, ObservationStatus
from britain_exchange.paths import HOUSING_DATA
from housing.ods_util import read_ods_sheet

PINNED_RAW = "raw/2026-11-04/Live_Tables_Green_Belt_Statistics_2025-26.ods"
SOURCE_LANDING = (
    "https://www.gov.uk/government/statistics/"
    "local-authority-green-belt-statistics-for-england-2025-to-2026"
)
PINNED_URL = (
    "https://assets.publishing.service.gov.uk/media/"
    "6ad7439184361ce7947cd7d5/Live_Tables_-_Green_Belt_Statistics_2025-26.ods"
)
OFFICIAL_RELEASE_DATE = "2026-10-22"
SOURCE_VERSION = "Green Belt Statistics 2025-26"
ENGLAND_CODE = "E92000001"
ENGLAND_LABEL = "England"
UNIT = "hectares"
MISSING = {"-", "–", "—", "", "[z]", "[x]"}
YEAR_RE = re.compile(r"^(\d{4})(?:_(\d{2}))?$")


def _parse_hectares(raw: str) -> float | None:
    text = raw.strip().replace(",", "").replace("R", "").strip()
    if not text or text in MISSING:
        return None
    return float(text)


def _year_bounds(label: str) -> tuple[str, str] | None:
    """Map table year labels to as-at 31 March dates (publisher note 7)."""
    match = YEAR_RE.match(label.strip())
    if not match:
        return None
    start_year = int(match.group(1))
    if match.group(2):
        # Fiscal-style 2013_14 → as at 31 March 2014
        century = (start_year // 100) * 100
        end_year = century + int(match.group(2))
        if end_year < start_year:
            end_year += 100
    else:
        end_year = start_year
    as_at = f"{end_year:04d}-03-31"
    return as_at, as_at


def parse_green_belt(path: Path) -> list[Observation]:
    observations: list[Observation] = []

    # England annual time series
    series_rows = read_ods_sheet(path, "Area_since_1997")
    header_idx = next(
        (i for i, row in enumerate(series_rows) if row and row[0].strip() == "Year [note 7]"),
        None,
    )
    if header_idx is None:
        raise ValueError("Area_since_1997 header not found")
    for row in series_rows[header_idx + 1 :]:
        if not row or not row[0].strip():
            continue
        bounds = _year_bounds(row[0])
        if not bounds:
            continue
        value = _parse_hectares(row[1] if len(row) > 1 else "")
        if value is None:
            continue
        start, end = bounds
        observations.append(
            Observation(
                indicator_id="green-belt-area",
                period_start=start,
                period_end=end,
                geography_code=ENGLAND_CODE,
                geography_label=ENGLAND_LABEL,
                value=value,
                unit=UNIT,
                observation_status="final",
                source_version=SOURCE_VERSION,
                notes="series=england-total; sheet=Area_since_1997; as-at=31 March",
            )
        )

    # Latest LA / region snapshot (31 March 2026)
    area_rows = read_ods_sheet(path, "Area_by_LA")
    header_idx = next(
        (i for i, row in enumerate(area_rows) if row and row[0].strip() == "Authority name"),
        None,
    )
    if header_idx is None:
        raise ValueError("Area_by_LA header not found")
    for row in area_rows[header_idx + 1 :]:
        if len(row) < 3 or not row[1].strip().startswith("E"):
            continue
        code = row[1].strip()
        label = row[0].strip()
        value = _parse_hectares(row[2])
        if value is None:
            continue
        # Skip England duplicate — already in the time series at this date
        if code == ENGLAND_CODE:
            continue
        observations.append(
            Observation(
                indicator_id="green-belt-area",
                period_start="2026-03-31",
                period_end="2026-03-31",
                geography_code=code,
                geography_label=label,
                value=value,
                unit=UNIT,
                observation_status="final",
                source_version=SOURCE_VERSION,
                notes="series=area-by-la; sheet=Area_by_LA; as-at=31 March 2026",
            )
        )

    if not observations:
        raise ValueError("No green belt observations parsed")
    observations.sort(key=lambda o: (o.period_start, o.geography_code))
    return observations


class GreenBeltAreaConnector(Connector):
    def __init__(self, data_root: Path | None = None) -> None:
        super().__init__(data_root or (HOUSING_DATA / "green-belt-area"))

    @property
    def indicator_id(self) -> str:
        return "green-belt-area"

    def build_manifest(self, evidence: Sequence[RawEvidence]) -> Manifest:
        return Manifest(
            indicator_id=self.indicator_id,
            title="Green Belt area",
            sector="housing-land",
            publisher="MHCLG",
            source_url=SOURCE_LANDING,
            series_id="Green Belt Statistics Area_since_1997 + Area_by_LA",
            geography="England (E92000001) + local authorities / regions",
            frequency="annual",
            unit=UNIT,
            definition=(
                "Area of land designated as Green Belt in England (hectares), "
                "as at 31 March. England totals from Area_since_1997; latest "
                "local authority and region areas from Area_by_LA."
            ),
            licence="Open Government Licence v3.0",
            agent_owner="housing",
            connector_module="housing.connectors.green_belt_area",
            curated_path="curated/observations.csv",
            update_cadence="annual",
            raw_evidence=list(evidence),
            transformations=(
                "Parse ODS Area_since_1997 for England totals; Area_by_LA for "
                "latest LA/region hectares. Filter series=england-total vs "
                "series=area-by-la."
            ),
            caveats=(
                "England designation only — not UK. Figures rounded to nearest "
                "10 hectares in the national table. 2006/07 break when New Forest "
                "National Park land left the Green Belt series. Fixed latest "
                "boundaries for LA rows."
            ),
            revision_notes="Pinned Green Belt Statistics 2025-26 published 22 Oct 2026.",
            related_indicator_ids=["land-use-stock", "planning-decisions-granted"],
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
        return parse_green_belt(self.data_root / evidence[0].path)


def main() -> None:
    connector = GreenBeltAreaConnector()
    evidence = connector.evidence_from_pinned_raw()
    observations = connector.transform([evidence])
    connector.write_hand_off([evidence], observations)
    eng = [o for o in observations if o.geography_code == ENGLAND_CODE]
    print(f"observations={len(observations)} england={len(eng)} last_eng={eng[-1].value}")


if __name__ == "__main__":
    main()
