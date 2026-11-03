"""ONS manufacturing output index — IoP section C CVMSA (K22A / DIOP).

Approach (plain language):
1. Download ONS timeseries JSON for CDID K22A (Index of Production manufacturing).
2. Keep the monthly seasonally adjusted chained-volume index (headline IoP).
3. Emit one Observation per calendar month for the UK.

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
from britain_exchange.observation import Observation
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

SERIES_ID = "K22A"
DATASET_ID = "DIOP"
UNIT = "index (chained volume, SA; base year = 100)"

SOURCE_LANDING_URL = (
    "https://www.ons.gov.uk/economy/economicoutputandproductivity/output/"
    "timeseries/k22a/diop"
)
SOURCE_DATA_URL = f"{SOURCE_LANDING_URL}/data"


class ManufacturingOutputIndexConnector(Connector):
    """ONS Index of Production — Manufacturing CVMSA."""

    def __init__(self, data_root: Path | None = None) -> None:
        root = data_root or (ENERGY_DATA / "manufacturing-output-index")
        super().__init__(root)

    @property
    def indicator_id(self) -> str:
        return "manufacturing-output-index"

    def build_manifest(self, evidence: Sequence[RawEvidence]) -> Manifest:
        return Manifest(
            indicator_id=self.indicator_id,
            title="Manufacturing output index",
            sector="energy-industry",
            publisher="ONS",
            source_url=SOURCE_LANDING_URL,
            series_id=SERIES_ID,
            geography="United Kingdom (K02000001)",
            frequency="monthly",
            unit=UNIT,
            definition=(
                "UK Index of Production for SIC 2007 section C Manufacturing: "
                "chained volume measure, seasonally adjusted index "
                "(ONS title IOP: C:MANUFACTURING: CVMSA). Monthly headline "
                "volume of manufacturing output."
            ),
            licence="Open Government Licence v3.0",
            agent_owner="energy",
            connector_module="energy.connectors.manufacturing_output_index",
            curated_path="curated/observations.csv",
            update_cadence="monthly (ONS Index of Production)",
            raw_evidence=list(evidence),
            notion_registry_url=(
                "https://app.notion.com/40d65471768581af8d35fbee740cd16f"
            ),
            transformations=(
                "Download ONS timeseries JSON (K22A/DIOP /data). Keep months "
                "only (quarters/years omitted). Map year+month→ISO month "
                "bounds. Geography K02000001. Index values as float; empty → "
                "missing. observation_status=provisional (IoP revises)."
            ),
            revision_notes=(
                "IoP manufacturing revises each monthly release and at Blue "
                "Book / annual chain-linking. Base year moves with Blue Book. "
                "Re-pin raw JSON on re-ingest; compare checksums."
            ),
            caveats=(
                "Index level (not growth rates K2AT etc.). Volume (CVM) SA, "
                "not current-price output. Quarterly/annual rows exist in raw "
                "JSON but are not curated. Distinct from GVA manufacturing "
                "index (e.g. L2KX/UKEA)."
            ),
            open_questions=[
                "Confirm current Blue Book base year label in unit string on next BB.",
            ],
        )

    def fetch_latest(self, *, retrieved_on: date | None = None) -> RawEvidence:
        day = retrieved_on or retrieved_pin_date()
        relative = f"raw/{day.isoformat()}/k22a_diop.json"
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
        rel = relative or f"raw/{retrieved_pin_date().isoformat()}/k22a_diop.json"
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
        for start, end, raw_value, dataset in iter_period_rows(payload, "months"):
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
                        "IoP Manufacturing CVMSA"
                    ),
                )
            )
        observations.sort(key=lambda obs: obs.period_start)
        return observations


def main() -> None:
    connector = ManufacturingOutputIndexConnector()
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
