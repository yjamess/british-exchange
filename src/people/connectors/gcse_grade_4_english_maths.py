"""DfE KS4 — % achieving grades 4+ in English and maths (England state-funded).

Approach:
1. Pin national characteristics by school types CSV from EES release zip.
2. Keep National / All state-funded / Total breakdown rows.
3. Emit engmath_94_percent; suppress 'z' as missing (pre-9–1 grading years).
"""

from __future__ import annotations

import csv
from datetime import datetime, timezone
from pathlib import Path
from typing import Sequence

from britain_exchange.checksum import sha256_file
from britain_exchange.connector import Connector
from britain_exchange.manifest import Manifest, RawEvidence
from britain_exchange.observation import Observation, ObservationStatus
from britain_exchange.paths import PEOPLE_DATA

PINNED_RAW = (
    "raw/2026-11-03/national_characteristics_by_school_types_revised.csv"
)
SOURCE_LANDING = (
    "https://explore-education-statistics.service.gov.uk/find-statistics/"
    "key-stage-4-performance/2024-25"
)
PINNED_URL = (
    "https://content.explore-education-statistics.service.gov.uk/api/releases/"
    "4d8e7324-89d0-486e-9f66-cb6cb7edd1da/files?fromPage=ReleaseDownloads"
)
OFFICIAL_RELEASE_DATE = "2025-02-05"
SOURCE_VERSION = "KS4 2024/25 revised national characteristics by school types"
ENGLAND_CODE = "E92000001"
ENGLAND_LABEL = "England"
UNIT = "% of pupils (grades 4+ English and maths)"


def _academic_year_bounds(time_period: str) -> tuple[str, str]:
    # e.g. 202425 → 2024-09-01 to 2025-08-31
    if len(time_period) != 6 or not time_period.isdigit():
        raise ValueError(f"Unexpected time_period {time_period!r}")
    start_year = int(time_period[:4])
    end_year = start_year + 1
    return f"{start_year:04d}-09-01", f"{end_year:04d}-08-31"


def parse_ks4_engmath(csv_path: Path) -> list[Observation]:
    observations: list[Observation] = []
    with csv_path.open(newline="", encoding="utf-8") as handle:
        reader = csv.DictReader(handle)
        for row in reader:
            if row.get("geographic_level") != "National":
                continue
            if row.get("establishment_type_group") != "All state-funded":
                continue
            if row.get("breakdown_topic") != "Total":
                continue
            country = row.get("country_code") or ""
            if country and country != ENGLAND_CODE:
                raise ValueError(f"Unexpected country_code {country!r}")
            raw = (row.get("engmath_94_percent") or "").strip()
            start, end = _academic_year_bounds(row["time_period"])
            version = row.get("version") or "unknown"
            if raw.lower() in {"z", "x", "c", ""}:
                value = None
                status: ObservationStatus = "missing"
            else:
                value = float(raw)
                status = "provisional" if version.lower() == "revised" else "final"
            observations.append(
                Observation(
                    indicator_id="gcse-grade-4-english-maths",
                    period_start=start,
                    period_end=end,
                    geography_code=ENGLAND_CODE,
                    geography_label=ENGLAND_LABEL,
                    value=value,
                    unit=UNIT,
                    observation_status=status,
                    source_version=f"{SOURCE_VERSION}; file_version={version}",
                    notes=(
                        "series=engmath_94_percent; establishment=All state-funded; "
                        "England only; academic year"
                    ),
                )
            )
    if not observations:
        raise ValueError("No KS4 All state-funded Total rows parsed")
    observations.sort(key=lambda obs: obs.period_start)
    return observations


class GcseGrade4EnglishMathsConnector(Connector):
    def __init__(self, data_root: Path | None = None) -> None:
        super().__init__(data_root or (PEOPLE_DATA / "gcse-grade-4-english-maths"))

    @property
    def indicator_id(self) -> str:
        return "gcse-grade-4-english-maths"

    def build_manifest(self, evidence: Sequence[RawEvidence]) -> Manifest:
        return Manifest(
            indicator_id=self.indicator_id,
            title="GCSE grade 4+ English and maths",
            sector="people-society",
            publisher="DfE",
            source_url=SOURCE_LANDING,
            series_id="engmath_94_percent (All state-funded, England)",
            geography="England (E92000001) — not UK",
            frequency="annual",
            unit=UNIT,
            definition=(
                "Percentage of pupils at the end of key stage 4 in all state-funded "
                "schools in England achieving grades 4 or above in English and maths "
                "GCSEs (DfE KS4 performance)."
            ),
            licence="Open Government Licence v3.0",
            agent_owner="people",
            connector_module="people.connectors.gcse_grade_4_english_maths",
            curated_path="curated/observations.csv",
            update_cadence="annual (provisional autumn; revised following year)",
            raw_evidence=list(evidence),
            notion_registry_url="https://app.notion.com/40d65471768581249c47ee48d9be1b17",
            transformations=(
                "Filter National + All state-funded + Total; take engmath_94_percent. "
                "z → missing (pre-9–1 grading)."
            ),
            caveats=(
                "England-only state-funded schools. 2019/20–2020/21 awards used "
                "centre/teacher assessed grades — not fully comparable. Measure "
                "unavailable (suppressed) before 9–1 grading roll-out."
            ),
            revision_notes=(
                "Pinned CSV extracted from KS4 2024/25 revised release zip "
                "(release id 4d8e7324-89d0-486e-9f66-cb6cb7edd1da)."
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
            content_type="text/csv",
            official_release_date=OFFICIAL_RELEASE_DATE,
            source_url=PINNED_URL,
        )

    def transform(self, evidence: Sequence[RawEvidence]) -> list[Observation]:
        if not evidence:
            raise ValueError("transform() requires RawEvidence")
        return parse_ks4_engmath(self.data_root / evidence[0].path)


def main() -> None:
    connector = GcseGrade4EnglishMathsConnector()
    evidence = connector.evidence_from_pinned_raw()
    observations = connector.transform([evidence])
    connector.write_hand_off([evidence], observations)
    print(f"observations: {len(observations)}")
    for obs in observations:
        if obs.value is not None:
            print(obs.period_start, obs.value, obs.observation_status)


if __name__ == "__main__":
    main()
