"""ONS manufacturing labour productivity — output per hour, SIC section C (DJK6 / PRDY).

Approach (plain language):
1. Download ONS timeseries JSON for CDID DJK6 and pin under raw/<pin-date>/.
2. Keep the quarterly series (publication frequency for industry productivity).
3. Emit one Observation per quarter for UK manufacturing output per hour
   (index 2023=100, seasonally adjusted).
4. Distinct from Economy ``labour-productivity`` (LZVB, whole economy) — do not
   fork that pipeline; this is the manufacturing section-C PRDY series.

Best practices: pathlib, type hints, fail loudly
(https://docs.python.org/3/library/pathlib.html,
https://docs.python.org/3/library/typing.html).
"""

from __future__ import annotations

from datetime import date, datetime, timezone
from pathlib import Path
from typing import Sequence

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
    source_version,
)

UK_GEOGRAPHY_CODE = "K02000001"
UK_GEOGRAPHY_LABEL = "United Kingdom"

SERIES_ID = "DJK6"
DATASET_ID = "PRDY"
UNIT = "Index 2023=100, SA (output per hour, manufacturing)"

SOURCE_LANDING_URL = (
    "https://www.ons.gov.uk/employmentandlabourmarket/peopleinwork/"
    "labourproductivity/timeseries/djk6/prdy"
)
SOURCE_DATA_URL = f"{SOURCE_LANDING_URL}/data"

# Wave B3 pin (do not reuse frozen manufacturing-trio pin date).
PIN_DATE = date(2026, 11, 7)

RELATED_EMPLOYMENT = "manufacturing-employment"
RELATED_OUTPUT = "manufacturing-output-index"
RELATED_ECONOMY_PRODUCTIVITY = "labour-productivity"


class ManufacturingOutputPerHourConnector(Connector):
    """Manufacturing section-C output per hour (not whole-economy LZVB)."""

    def __init__(self, data_root: Path | None = None) -> None:
        root = data_root or (ENERGY_DATA / "manufacturing-output-per-hour")
        super().__init__(root)

    @property
    def indicator_id(self) -> str:
        return "manufacturing-output-per-hour"

    def build_manifest(self, evidence: Sequence[RawEvidence]) -> Manifest:
        return Manifest(
            indicator_id=self.indicator_id,
            title="Manufacturing output per hour",
            sector="energy-industry",
            publisher="ONS",
            source_url=SOURCE_LANDING_URL,
            series_id=SERIES_ID,
            geography="United Kingdom (K02000001)",
            frequency="quarterly",
            unit=UNIT,
            definition=(
                "UK labour productivity for SIC 2007 section C Manufacturing: "
                "output per hour worked, seasonally adjusted index (2023=100). "
                "ONS CDID DJK6 in PRDY (Labour productivity time series). "
                "Distinct from Economy whole-economy output per hour (LZVB)."
            ),
            licence="Open Government Licence v3.0",
            agent_owner="energy",
            connector_module="energy.connectors.manufacturing_output_per_hour",
            curated_path="curated/observations.csv",
            update_cadence="quarterly (ONS labour productivity / PRDY)",
            raw_evidence=list(evidence),
            notion_registry_url=(
                "https://app.notion.com/41165471768581c89c2ce8e92d3134e3"
            ),
            related_indicator_ids=[
                RELATED_EMPLOYMENT,
                RELATED_OUTPUT,
                RELATED_ECONOMY_PRODUCTIVITY,
            ],
            transformations=(
                "Download ONS timeseries JSON (DJK6/PRDY /data). Keep quarters "
                "only (annual aggregates omitted). Map year+Q→ISO calendar "
                "quarter bounds. Geography fixed to K02000001. Values = index "
                "2023=100 SA; empty → missing. "
                "observation_status=provisional (PRDY revises)."
            ),
            revision_notes=(
                "Industry productivity revises with GDP(O)/GVA and labour-input "
                "revisions each PRDY release. Re-pin raw JSON on re-ingest; "
                "compare checksums."
            ),
            caveats=(
                "Official ONS manufacturing productivity index — do not invent "
                "by dividing IoP by Workforce Jobs. Output per hour ≠ output "
                "per job (other PRDY CDIDs). Base year moves with Blue Book / "
                "PRDY rebasing. Annual rows in raw JSON are not curated. "
                "National section C only — not subsector or regional."
            ),
            open_questions=[
                "Optional later: manufacturing output per job (related PRDY CDID).",
            ],
        )

    def fetch_latest(self, *, retrieved_on: date | None = None) -> RawEvidence:
        day = retrieved_on or PIN_DATE
        relative = f"raw/{day.isoformat()}/djk6_prdy.json"
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
        rel = relative or f"raw/{PIN_DATE.isoformat()}/djk6_prdy.json"
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
                        "SIC07 section C output per hour SA"
                    ),
                )
            )
        observations.sort(key=lambda obs: obs.period_start)
        return mark_latest_months_provisional(observations, months=4)


def main() -> None:
    connector = ManufacturingOutputPerHourConnector()
    evidence = connector.fetch_latest(retrieved_on=PIN_DATE)
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
