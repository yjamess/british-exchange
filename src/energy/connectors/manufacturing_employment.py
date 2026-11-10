"""ONS manufacturing employment — Workforce Jobs SA, SIC section C (JWR7 / LMS).

Approach (plain language):
1. Download ONS timeseries JSON for CDID JWR7 and pin under raw/2026-11-03/.
2. Keep the quarterly series (publication frequency for Workforce Jobs).
3. Emit one Observation per quarter for UK workforce jobs in manufacturing
   (thousands, seasonally adjusted).
4. Do **not** build a long-run historical reconstruction — that belongs to
   History & Change ``long-run-manufacturing-employment`` (catalogue link only).

Best practices: pathlib, type hints, fail loudly
(https://docs.python.org/3/library/pathlib.html,
https://docs.python.org/3/library/typing.html).
"""

from __future__ import annotations

from datetime import date, datetime, timezone
from pathlib import Path
from typing import Any, Sequence

from britain_exchange.checksum import sha256_file
from britain_exchange.connector import Connector
from britain_exchange.manifest import Manifest, RawEvidence
from britain_exchange.observation import Observation, mark_latest_months_provisional
from britain_exchange.paths import ENERGY_DATA

from energy.connectors.ons_timeseries import (
    expect_cdid,
    iter_period_rows,
    load_ons_json,
    parse_numeric,
    release_date_iso,
    retrieved_pin_date,
    source_version,
)

UK_GEOGRAPHY_CODE = "K02000001"
UK_GEOGRAPHY_LABEL = "United Kingdom"

SERIES_ID = "JWR7"
DATASET_ID = "LMS"
UNIT = "thousands of jobs, SA"

SOURCE_LANDING_URL = (
    "https://www.ons.gov.uk/employmentandlabourmarket/peopleinwork/"
    "employmentandemployeetypes/timeseries/jwr7/lms"
)
SOURCE_DATA_URL = f"{SOURCE_LANDING_URL}/data"

RELATED_HISTORY = "long-run-manufacturing-employment"


class ManufacturingEmploymentConnector(Connector):
    """Modern ONS Workforce Jobs — manufacturing (not History long-run)."""

    def __init__(self, data_root: Path | None = None) -> None:
        root = data_root or (ENERGY_DATA / "manufacturing-employment")
        super().__init__(root)

    @property
    def indicator_id(self) -> str:
        return "manufacturing-employment"

    def build_manifest(self, evidence: Sequence[RawEvidence]) -> Manifest:
        return Manifest(
            indicator_id=self.indicator_id,
            title="Manufacturing employment",
            sector="energy-industry",
            publisher="ONS",
            source_url=SOURCE_LANDING_URL,
            series_id=SERIES_ID,
            geography="United Kingdom (K02000001)",
            frequency="quarterly",
            unit=UNIT,
            definition=(
                "UK Workforce Jobs (seasonally adjusted) in SIC 2007 section C "
                "Manufacturing, thousands of jobs. Preferred short-term measure "
                "of jobs by industry (JOBS02 / LMS). Distinct from History "
                "long-run manufacturing employment (do not fork that pipeline)."
            ),
            licence="Open Government Licence v3.0",
            agent_owner="energy",
            connector_module="energy.connectors.manufacturing_employment",
            curated_path="curated/observations.csv",
            update_cadence="quarterly (ONS Vacancies and jobs / LMS)",
            raw_evidence=list(evidence),
            notion_registry_url=(
                "https://app.notion.com/40d65471768581e3a829d4cad506e0bc"
            ),
            related_indicator_ids=[RELATED_HISTORY],
            transformations=(
                "Download ONS timeseries JSON (JWR7/LMS /data). Keep quarters "
                "only (annual aggregates omitted). Map year+Q→ISO calendar "
                "quarter bounds. Geography fixed to K02000001. Values = "
                "thousands of jobs SA; empty → missing. "
                "observation_status=provisional (LMS revises)."
            ),
            revision_notes=(
                "Workforce Jobs revise each quarterly labour-market release "
                "and when benchmarked to BRES. Re-pin raw JSON on re-ingest."
            ),
            caveats=(
                "Jobs (employer survey + LFS components), not headcount "
                "employment from LFS alone. Modern official series from 1978 "
                "Q2; History long-run row should link here rather than "
                "duplicate. Annual rows in raw JSON are not curated."
            ),
            open_questions=[
                "Optional: also publish annual JWR7 averages as a secondary file.",
            ],
        )

    def fetch_latest(self, *, retrieved_on: date | None = None) -> RawEvidence:
        day = retrieved_on or retrieved_pin_date()
        relative = f"raw/{day.isoformat()}/jwr7_lms.json"
        result = self.fetch_url(SOURCE_DATA_URL, relative)
        release_date = ""
        try:
            payload = load_ons_json(result.path)
            if isinstance(payload.get("description"), dict):
                release_date = release_date_iso(payload["description"])
        except (OSError, ValueError):
            release_date = ""
        return RawEvidence(
            path=result.evidence.path,
            retrieved_at=result.evidence.retrieved_at,
            checksum_sha256=result.evidence.checksum_sha256,
            content_type=result.evidence.content_type,
            official_release_date=release_date,
            http_status=result.evidence.http_status,
            source_url=result.evidence.source_url,
        )

    def evidence_from_pinned_raw(self, relative: str | None = None) -> RawEvidence:
        rel = relative or f"raw/{retrieved_pin_date().isoformat()}/jwr7_lms.json"
        path = self.data_root / rel
        if not path.is_file():
            raise FileNotFoundError(f"Pinned raw missing: {path}")
        payload = load_ons_json(path)
        description = payload.get("description") if isinstance(payload, dict) else {}
        release = (
            release_date_iso(description) if isinstance(description, dict) else ""
        )
        return RawEvidence(
            path=rel,
            retrieved_at=datetime.now(timezone.utc).isoformat(),
            checksum_sha256=sha256_file(path),
            content_type="application/json",
            official_release_date=release,
            http_status=None,
            source_url=SOURCE_DATA_URL,
        )

    def transform(self, evidence: Sequence[RawEvidence]) -> list[Observation]:
        if not evidence:
            raise ValueError("transform() requires at least one RawEvidence entry")
        raw_path = self.data_root / evidence[0].path
        payload = load_ons_json(raw_path)
        description = expect_cdid(payload, SERIES_ID)
        version = source_version(description, SERIES_ID, DATASET_ID)
        observations: list[Observation] = []
        for start, end, raw_value, dataset in iter_period_rows(payload, "quarters"):
            value, status = parse_numeric(raw_value)
            observations.append(
                Observation(
                    indicator_id=self.indicator_id,
                    period_start=start,
                    period_end=end,
                    geography_code=UK_GEOGRAPHY_CODE,
                    geography_label=UK_GEOGRAPHY_LABEL,
                    value=value,
                    unit=UNIT,
                    observation_status=status,
                    source_version=version,
                    notes=(
                        f"series={SERIES_ID}; dataset={dataset or DATASET_ID}; "
                        "SIC07 section C Workforce Jobs SA"
                    ),
                )
            )
        observations.sort(key=lambda obs: obs.period_start)
        # Workforce Jobs: mark latest ~4 quarters provisional.
        return mark_latest_months_provisional(observations, months=4)


def main() -> None:
    connector = ManufacturingEmploymentConnector()
    pin = retrieved_pin_date()
    evidence = connector.fetch_latest(retrieved_on=pin)
    observations = connector.transform([evidence])
    manifest_path, curated_path = connector.write_hand_off([evidence], observations)
    print(f"indicator_id: {connector.indicator_id}")
    print(f"raw: {evidence.path} sha256={evidence.checksum_sha256}")
    print(f"official_release_date: {evidence.official_release_date or '(unknown)'}")
    print(f"observations: {len(observations)}")
    if observations:
        first, last = observations[0], observations[-1]
        print(
            f"range: {first.period_start} → {last.period_start} "
            f"(last value={last.value})"
        )
    print(f"manifest: {manifest_path}")
    print(f"curated: {curated_path}")


if __name__ == "__main__":
    main()
