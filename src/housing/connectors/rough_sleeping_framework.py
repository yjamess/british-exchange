"""MHCLG rough sleeping data framework (management information).

This is not the autumn snapshot. The framework counts people seen over a
month (and a separate single-night management-information count). Keep it
on its own indicator so it is never added to rough-sleeping-snapshot.

Ref: https://www.gov.uk/government/publications/rough-sleeping-data-framework-april-to-june-2026
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
STAGING_FILE = "Rough_Sleeping_Data_Framework_April_to_June_2026.ods"
PINNED_URL = (
    "https://assets.publishing.service.gov.uk/media/"
    "6a8c62ed08705e34a95daa77/"
    "Rough_Sleeping_Data_Framework_April_to_June_2026.ods"
)
SOURCE_LANDING = (
    "https://www.gov.uk/government/publications/"
    "rough-sleeping-data-framework-april-to-june-2026"
)
OFFICIAL_RELEASE_DATE = "2026-08-27"
SOURCE_VERSION = "Rough sleeping data framework April to June 2026"
MONTHS = {
    "january": 1,
    "february": 2,
    "march": 3,
    "april": 4,
    "may": 5,
    "june": 6,
    "july": 7,
    "august": 8,
    "september": 9,
    "october": 10,
    "november": 11,
    "december": 12,
}

# Headline sheets only. Other framework tables stay in the pinned ODS.
SHEETS: tuple[tuple[str, str], ...] = (
    ("Table_1_Monthly", "people-over-the-month"),
    ("Table_3_Single_Night", "single-night-management-information"),
)


def _parse_number(raw: str) -> tuple[float | None, ObservationStatus]:
    text = raw.strip().replace(",", "")
    if text.lower() in {"", "[x]", "[z]", "[nc]", "..", "x"}:
        return None, "missing"
    try:
        return float(text), "provisional"
    except ValueError:
        return None, "missing"


def _month_bounds(label: str) -> tuple[str, str] | None:
    parts = label.strip().lower().split()
    if len(parts) != 2 or parts[0] not in MONTHS:
        return None
    year = int(parts[1])
    month = MONTHS[parts[0]]
    last = calendar.monthrange(year, month)[1]
    return f"{year:04d}-{month:02d}-01", f"{year:04d}-{month:02d}-{last:02d}"


def parse_framework(path: Path) -> list[Observation]:
    out: list[Observation] = []
    seen: set[tuple[str, str, str, str]] = set()
    for sheet, series in SHEETS:
        rows = read_ods_sheet(path, sheet)
        header = None
        for row in rows:
            if row and row[0].strip() == "Local Authority Code":
                header = row
                break
        if header is None:
            raise ValueError(f"{sheet}: header not found")
        month_cols: list[tuple[int, str, str]] = []
        for idx, name in enumerate(header):
            bounds = _month_bounds(name)
            if bounds is not None:
                month_cols.append((idx, bounds[0], bounds[1]))
        if not month_cols:
            raise ValueError(f"{sheet}: no month columns")

        for row in rows:
            if len(row) < 4:
                continue
            la_code = row[0].strip()
            region_code = row[2].strip()
            # Authority rows carry their own code. England and regions
            # use [z] in the authority columns and a code in column 2.
            if la_code.startswith("E"):
                code, name = la_code, row[1].strip()
            elif region_code.startswith("E"):
                code, name = region_code, row[3].strip()
            else:
                continue
            if name.lower() == "rest of england":
                continue
            for col, start, end in month_cols:
                if col >= len(row):
                    continue
                key = (series, start, code, name)
                if key in seen:
                    continue
                seen.add(key)
                value, status = _parse_number(row[col])
                out.append(
                    Observation(
                        indicator_id="rough-sleeping-framework",
                        period_start=start,
                        period_end=end,
                        geography_code=code,
                        geography_label=name,
                        value=value,
                        unit="people",
                        observation_status=status,
                        source_version=SOURCE_VERSION,
                        notes=(
                            f"series={series}; measure=flow; "
                            "status=management-information; "
                            f"table={sheet}"
                        ),
                    )
                )
    if not out:
        raise ValueError("No rough sleeping framework observations")
    out.sort(key=lambda o: (o.notes, o.period_start, o.geography_code))
    return out


class RoughSleepingFrameworkConnector(Connector):
    def __init__(self, data_root: Path | None = None) -> None:
        super().__init__(data_root or (HOUSING_DATA / "rough-sleeping-framework"))

    @property
    def indicator_id(self) -> str:
        return "rough-sleeping-framework"

    def build_manifest(self, evidence: Sequence[RawEvidence]) -> Manifest:
        return Manifest(
            indicator_id=self.indicator_id,
            title="Rough sleeping data framework (management information)",
            sector="housing-land",
            publisher="MHCLG",
            source_url=SOURCE_LANDING,
            series_id="Rough sleeping data framework Table 1 and Table 3",
            geography="England, regions, local authorities",
            frequency="monthly (management information)",
            unit="people",
            definition=(
                "Estimated people sleeping rough over the month (Table 1) and "
                "on a single night (Table 3). Management information, not the "
                "official autumn snapshot."
            ),
            licence="Open Government Licence v3.0",
            agent_owner="housing",
            connector_module="housing.connectors.rough_sleeping_framework",
            curated_path="curated/observations.csv",
            update_cadence="quarterly",
            raw_evidence=list(evidence),
            transformations=(
                "Parse Table_1_Monthly and Table_3_Single_Night. "
                "Skip Rest of England (it is England minus London). "
                "Other framework tables remain in the pinned workbook."
            ),
            caveats=(
                "Management information, not official statistics. "
                "Do not add to or replace the autumn rough sleeping snapshot. "
                "Monthly count is people seen over the month, not a one-night stock."
            ),
            revision_notes="Domain 08 ingest 2026-11-04.",
            related_indicator_ids=["rough-sleeping-snapshot"],
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
        return parse_framework(self.data_root / evidence[0].path)


def main() -> None:
    staging = HOUSING_DATA / "_insecurity_pin" / "2026-11-04" / STAGING_FILE
    dest_dir = HOUSING_DATA / "rough-sleeping-framework" / PIN_DIR
    dest_dir.mkdir(parents=True, exist_ok=True)
    dest = dest_dir / STAGING_FILE
    if not staging.is_file():
        raise FileNotFoundError(staging)
    if not dest.is_file() or sha256_file(dest) != sha256_file(staging):
        shutil.copy2(staging, dest)

    connector = RoughSleepingFrameworkConnector()
    evidence = connector.evidence_from_pinned()
    observations = connector.transform([evidence])
    connector.write_hand_off([evidence], observations)
    june = [
        o
        for o in observations
        if o.geography_code == "E92000001"
        and o.period_start == "2026-06-01"
        and "people-over-the-month" in o.notes
    ]
    print(f"rough-sleeping-framework: obs={len(observations)}")
    print("England June 2026 monthly:", june[0].value if june else None)


if __name__ == "__main__":
    main()
