"""MHCLG Land Use Stock 2022 — England developed / non-developed shares and hectares.

Approach:
1. Pin Live Tables Land Use Stock 2022 ODS.
2. Read England row from P400a (shares of total land) and P400b (hectares).
3. Emit long-format observations keyed by series=<slug> for the headline groups.
"""

from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path
from typing import Sequence

from britain_exchange.checksum import sha256_file
from britain_exchange.connector import Connector
from britain_exchange.manifest import Manifest, RawEvidence
from britain_exchange.observation import Observation
from britain_exchange.paths import HOUSING_DATA
from housing.ods_util import read_ods_sheet

PINNED_RAW = "raw/2026-11-04/Live_Tables_Land_Use_Stock_2022.ods"
SOURCE_LANDING = "https://www.gov.uk/government/statistics/land-use-in-england-2022"
PINNED_URL = (
    "https://assets.publishing.service.gov.uk/media/"
    "63590544d3bf7f0bda9c614b/Live_Tables_-_Land_Use_Stock_2022.ods"
)
OFFICIAL_RELEASE_DATE = "2022-10-27"
SOURCE_VERSION = "Land Use Stock 2022"
ENGLAND_CODE = "E92000001"
ENGLAND_LABEL = "England"
PERIOD_START = "2022-01-01"
PERIOD_END = "2022-12-31"

# Column index on the England row (0-based) → (series slug, label)
# Confirmed against P400a/P400b header rows for Land Use Stock 2022.
SERIES: tuple[tuple[int, str, str], ...] = (
    (27, "developed", "Developed use"),
    (41, "non-developed", "Non-developed use"),
    (43, "vacant", "Vacant"),
    (31, "agriculture", "Agriculture"),
    (36, "forestry-open-land-water", "Forestry, open land and water"),
    (38, "residential-gardens", "Residential gardens"),
    (16, "residential", "Residential"),
)


def _parse_number(raw: str) -> float | None:
    text = raw.strip().replace(",", "").replace("%", "").strip()
    if not text or text in {"-", "–", "—", ""}:
        return None
    return float(text)


def _england_row(path: Path, sheet: str) -> list[str]:
    rows = read_ods_sheet(path, sheet)
    for row in rows:
        if row and row[0].strip() == ENGLAND_CODE:
            return row
    raise ValueError(f"England row missing in {sheet}")


def parse_land_use_stock(path: Path) -> list[Observation]:
    shares = _england_row(path, "P400a")
    hectares = _england_row(path, "P400b")
    observations: list[Observation] = []
    for index, series, label in SERIES:
        share = _parse_number(shares[index] if index < len(shares) else "")
        ha = _parse_number(hectares[index] if index < len(hectares) else "")
        if share is not None:
            observations.append(
                Observation(
                    indicator_id="land-use-stock",
                    period_start=PERIOD_START,
                    period_end=PERIOD_END,
                    geography_code=ENGLAND_CODE,
                    geography_label=ENGLAND_LABEL,
                    value=share,
                    unit="% of land area",
                    observation_status="final",
                    source_version=SOURCE_VERSION,
                    notes=f"series={series}; measure=share; label={label}; sheet=P400a",
                )
            )
        if ha is not None:
            observations.append(
                Observation(
                    indicator_id="land-use-stock",
                    period_start=PERIOD_START,
                    period_end=PERIOD_END,
                    geography_code=ENGLAND_CODE,
                    geography_label=ENGLAND_LABEL,
                    value=ha,
                    unit="hectares",
                    observation_status="final",
                    source_version=SOURCE_VERSION,
                    notes=f"series={series}; measure=hectares; label={label}; sheet=P400b",
                )
            )
    if not observations:
        raise ValueError("No land-use-stock observations parsed")
    return observations


class LandUseStockConnector(Connector):
    def __init__(self, data_root: Path | None = None) -> None:
        super().__init__(data_root or (HOUSING_DATA / "land-use-stock"))

    @property
    def indicator_id(self) -> str:
        return "land-use-stock"

    def build_manifest(self, evidence: Sequence[RawEvidence]) -> Manifest:
        return Manifest(
            indicator_id=self.indicator_id,
            title="Land use stock",
            sector="housing-land",
            publisher="MHCLG",
            source_url=SOURCE_LANDING,
            series_id="Land Use Stock 2022 P400a/P400b England",
            geography="England (E92000001) — not UK",
            frequency="annual (stock; latest release 2022)",
            unit="% of land area or hectares",
            definition=(
                "How England’s land is used in 2022 across headline groups "
                "(developed, non-developed, vacant, agriculture, forestry/open "
                "land/water, residential gardens, residential). Shares from "
                "P400a; hectares from P400b."
            ),
            licence="Open Government Licence v3.0",
            agent_owner="housing",
            connector_module="housing.connectors.land_use_stock",
            curated_path="curated/observations.csv",
            update_cadence="ad hoc (publisher cadence under review)",
            raw_evidence=list(evidence),
            transformations=(
                "Read England row from P400a and P400b; emit series=<group> with "
                "measure=share|hectares in notes."
            ),
            caveats=(
                "Single-year stock (2022). England only. Derived from Ordnance "
                "Survey products supplied to MHCLG. Residential gardens are "
                "classified as non-developed use in these statistics."
            ),
            revision_notes="Pinned Land Use Stock 2022 published 27 Oct 2022.",
            related_indicator_ids=["green-belt-area", "planning-decisions-granted"],
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
        return parse_land_use_stock(self.data_root / evidence[0].path)


def main() -> None:
    connector = LandUseStockConnector()
    evidence = connector.evidence_from_pinned_raw()
    observations = connector.transform([evidence])
    connector.write_hand_off([evidence], observations)
    print(f"observations={len(observations)}")
    for obs in observations:
        if "measure=share" in (obs.notes or ""):
            print(f"  {obs.notes} → {obs.value}{obs.unit}")


if __name__ == "__main__":
    main()
