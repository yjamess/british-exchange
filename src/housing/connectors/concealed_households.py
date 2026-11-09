"""Census 2021 concealed families (Domain 08 — hidden homelessness).

Pins ONS commissioned table CT21_0451 and emits England (+ region) counts of
concealed families. Unit is families (FRPs), not households or people.

Ref: https://www.ons.gov.uk/peoplepopulationandcommunity/populationandmigration/populationestimates/adhocs/3307ct210451census2021
"""

from __future__ import annotations

import re
import shutil
from datetime import datetime, timezone
from pathlib import Path
from typing import Sequence

from openpyxl import load_workbook

from britain_exchange.checksum import sha256_file
from britain_exchange.connector import Connector
from britain_exchange.manifest import Manifest, RawEvidence
from britain_exchange.observation import Observation
from britain_exchange.paths import HOUSING_DATA

PIN_DIR = "raw/2026-11-04"
STAGING_FILE = "CT21_0451_Census_2021.xlsx"
PINNED_URL = (
    "https://www.ons.gov.uk/file?uri=/peoplepopulationandcommunity/"
    "populationandmigration/populationestimates/adhocs/3307ct210451census2021/"
    "ct210451census2021.xlsx"
)
SOURCE_LANDING = (
    "https://www.ons.gov.uk/peoplepopulationandcommunity/populationandmigration/"
    "populationestimates/adhocs/3307ct210451census2021"
)
OFFICIAL_RELEASE_DATE = "2026-02-26"
SOURCE_VERSION = "Census 2021 CT21_0451 (concealed family status)"
CENSUS_DAY = "2021-03-21"

REGION_CODES = {
    "North East": "E12000001",
    "North West": "E12000002",
    "Yorkshire and The Humber": "E12000003",
    "East Midlands": "E12000004",
    "West Midlands": "E12000005",
    "East of England": "E12000006",
    "London": "E12000007",
    "South East": "E12000008",
    "South West": "E12000009",
}


def _series_slug(label: str) -> str | None:
    low = label.lower()
    if not low.startswith("concealed family"):
        return None
    if "lone parent" in low and "dependent children" in low:
        return "concealed-lone-parent-dependent-children"
    if "lone parent" in low and "non-dependent" in low:
        return "concealed-lone-parent-non-dependent"
    if "couple" in low and "no children" in low:
        return "concealed-couple-no-children"
    if "couple" in low and "dependent children" in low:
        return "concealed-couple-dependent-children"
    if "couple" in low and "non-dependent" in low:
        return "concealed-couple-non-dependent"
    return "concealed-other"


def parse_sheet(
    path: Path,
    sheet: str,
    *,
    geography_code: str,
    geography_label: str,
) -> list[Observation]:
    wb = load_workbook(path, read_only=True, data_only=True)
    ws = wb[sheet]
    current_series: str | None = None
    totals: dict[str, float] = {}
    for row in ws.iter_rows(values_only=True):
        cells = [c for c in row if c is not None]
        if not cells:
            continue
        # New series label often appears as a string cell before sex/age splits.
        for cell in cells:
            if not isinstance(cell, str):
                continue
            low = cell.lower()
            if low.startswith("concealed family"):
                current_series = _series_slug(cell)
            elif low.startswith("unconcealed") or low.startswith("does not apply"):
                current_series = None
        if current_series is None:
            continue
        # Numeric count is the last numeric cell in the row.
        nums = [c for c in cells if isinstance(c, (int, float))]
        if not nums:
            continue
        totals[current_series] = totals.get(current_series, 0.0) + float(nums[-1])

    out: list[Observation] = []
    grand = 0.0
    for series, value in sorted(totals.items()):
        grand += value
        out.append(
            Observation(
                indicator_id="concealed-households",
                period_start=CENSUS_DAY,
                period_end=CENSUS_DAY,
                geography_code=geography_code,
                geography_label=geography_label,
                value=value,
                unit="families (FRPs)",
                observation_status="final",
                source_version=SOURCE_VERSION,
                notes=f"series={series}; measure=stock; census-day=2021-03-21",
            )
        )
    if grand:
        out.append(
            Observation(
                indicator_id="concealed-households",
                period_start=CENSUS_DAY,
                period_end=CENSUS_DAY,
                geography_code=geography_code,
                geography_label=geography_label,
                value=grand,
                unit="families (FRPs)",
                observation_status="final",
                source_version=SOURCE_VERSION,
                notes="series=concealed-families-total; measure=stock; census-day=2021-03-21",
            )
        )
    return out


def parse_all(path: Path) -> list[Observation]:
    out = parse_sheet(
        path,
        "CT21_0451 England",
        geography_code="E92000001",
        geography_label="England",
    )
    # Regions sheet: each region block starts with a region name header.
    wb = load_workbook(path, read_only=True, data_only=True)
    ws = wb["CT21_0451 Regions in England"]
    # Re-parse by detecting region headers then summing concealed blocks — reuse England parser
    # per region by writing temporary logic inline.
    current_region: str | None = None
    current_series: str | None = None
    bucket: dict[tuple[str, str], float] = {}
    for row in ws.iter_rows(values_only=True):
        cells = [c for c in row if c is not None]
        if not cells:
            continue
        # Region title e.g. "NORTH EAST" or "E12000001 North East"
        first = str(cells[0])
        for name, code in REGION_CODES.items():
            if name.lower() in first.lower() and "concealed" not in first.lower():
                current_region = code
                break
        if current_region is None:
            continue
        for cell in cells:
            if not isinstance(cell, str):
                continue
            low = cell.lower()
            if low.startswith("concealed family"):
                current_series = _series_slug(cell)
            elif low.startswith("unconcealed") or low.startswith("does not apply"):
                current_series = None
        if current_series is None:
            continue
        nums = [c for c in cells if isinstance(c, (int, float))]
        if not nums:
            continue
        key = (current_region, current_series)
        bucket[key] = bucket.get(key, 0.0) + float(nums[-1])

    region_totals: dict[str, float] = {}
    for (code, series), value in sorted(bucket.items()):
        label = next(n for n, c in REGION_CODES.items() if c == code)
        region_totals[code] = region_totals.get(code, 0.0) + value
        out.append(
            Observation(
                indicator_id="concealed-households",
                period_start=CENSUS_DAY,
                period_end=CENSUS_DAY,
                geography_code=code,
                geography_label=label,
                value=value,
                unit="families (FRPs)",
                observation_status="final",
                source_version=SOURCE_VERSION,
                notes=f"series={series}; measure=stock; census-day=2021-03-21",
            )
        )
    for code, total in region_totals.items():
        label = next(n for n, c in REGION_CODES.items() if c == code)
        out.append(
            Observation(
                indicator_id="concealed-households",
                period_start=CENSUS_DAY,
                period_end=CENSUS_DAY,
                geography_code=code,
                geography_label=label,
                value=total,
                unit="families (FRPs)",
                observation_status="final",
                source_version=SOURCE_VERSION,
                notes="series=concealed-families-total; measure=stock; census-day=2021-03-21",
            )
        )
    if not out:
        raise ValueError("No concealed-households observations")
    out.sort(key=lambda o: (o.geography_code, o.notes))
    return out


class ConcealedHouseholdsConnector(Connector):
    def __init__(self, data_root: Path | None = None) -> None:
        super().__init__(data_root or (HOUSING_DATA / "concealed-households"))

    @property
    def indicator_id(self) -> str:
        return "concealed-households"

    def build_manifest(self, evidence: Sequence[RawEvidence]) -> Manifest:
        return Manifest(
            indicator_id=self.indicator_id,
            title="Concealed families (Census 2021)",
            sector="housing-land",
            publisher="ONS",
            source_url=SOURCE_LANDING,
            series_id="CT21_0451 concealed family status",
            geography="England and English regions",
            frequency="Census night (21 March 2021)",
            unit="families (FRPs)",
            definition=(
                "Concealed families are couple or lone-parent families in multi-family "
                "households where the Family Reference Person is not the Household "
                "Reference Person. Selected evidence of hidden housing need — not a "
                "full count of sofa surfing."
            ),
            licence="Open Government Licence v3.0",
            agent_owner="housing",
            connector_module="housing.connectors.concealed_households",
            curated_path="curated/observations.csv",
            update_cadence="decennial census",
            raw_evidence=list(evidence),
            transformations="Sum sex×age cells within each concealed family type; emit totals.",
            caveats=(
                "Census Day stock of families, not households or people. Disclosure "
                "control perturbs small counts. Not comparable with H-CLIC flows."
            ),
            revision_notes="Domain 08 ingest 2026-11-04.",
            related_indicator_ids=["statutory-homelessness-assessments"],
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
            content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            official_release_date=OFFICIAL_RELEASE_DATE,
            source_url=PINNED_URL,
        )

    def transform(self, evidence: Sequence[RawEvidence]) -> list[Observation]:
        if not evidence:
            raise ValueError("transform() requires RawEvidence")
        return parse_all(self.data_root / evidence[0].path)


def main() -> None:
    staging = HOUSING_DATA / "_insecurity_pin" / "2026-11-04" / STAGING_FILE
    dest_dir = HOUSING_DATA / "concealed-households" / PIN_DIR
    dest_dir.mkdir(parents=True, exist_ok=True)
    dest = dest_dir / STAGING_FILE
    if not staging.is_file():
        raise FileNotFoundError(staging)
    if not dest.is_file() or sha256_file(dest) != sha256_file(staging):
        shutil.copy2(staging, dest)
    connector = ConcealedHouseholdsConnector()
    evidence = connector.evidence_from_pinned()
    observations = connector.transform([evidence])
    connector.write_hand_off([evidence], observations)
    eng = [
        o
        for o in observations
        if o.geography_code == "E92000001" and "concealed-families-total" in o.notes
    ]
    print(f"concealed-households: obs={len(observations)}")
    print("England total concealed families:", eng[0].value if eng else None)


if __name__ == "__main__":
    main()
