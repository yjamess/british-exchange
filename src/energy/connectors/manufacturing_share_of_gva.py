"""ONS manufacturing share of GVA — GDP(O) industry weight L4NT / WGDP.

Approach (plain language):
1. Download ONS timeseries JSON for CDID L4NT (C Manufacturing Weights:CVM).
2. ONS publishes weights in **parts per thousand** of GDP(O); we store
   ``share_pct = weight / 10`` so the curated unit is ``% of GVA``.
3. Keep annual rows only (WGDP is annual Blue Book weights).

Caveat for beginners: these are **volume (CVM) industry weights**, not
current-price GVA shares. They are the official GDP(O) weight series for
manufacturing and are the right open timeseries for this P0 indicator.
Current-price shares would need a two-series ratio (manufacturing GVA £ /
total GVA £) — documented as an open question.

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
from britain_exchange.observation import (
    Observation,
    ObservationStatus,
    mark_latest_months_provisional,
)
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

SERIES_ID = "L4NT"
DATASET_ID = "WGDP"
UNIT = "% of GVA (from GDP(O) CVM weight ÷ 10)"

SOURCE_LANDING_URL = (
    "https://www.ons.gov.uk/economy/grossvalueaddedgva/timeseries/l4nt/wgdp"
)
SOURCE_DATA_URL = f"{SOURCE_LANDING_URL}/data"


class ManufacturingShareOfGvaConnector(Connector):
    """ONS manufacturing GDP(O) weight → % share of GVA."""

    def __init__(self, data_root: Path | None = None) -> None:
        root = data_root or (ENERGY_DATA / "manufacturing-share-of-gva")
        super().__init__(root)

    @property
    def indicator_id(self) -> str:
        return "manufacturing-share-of-gva"

    def build_manifest(self, evidence: Sequence[RawEvidence]) -> Manifest:
        return Manifest(
            indicator_id=self.indicator_id,
            title="Manufacturing share of GVA",
            sector="energy-industry",
            publisher="ONS",
            source_url=SOURCE_LANDING_URL,
            series_id=SERIES_ID,
            geography="United Kingdom (K02000001)",
            frequency="annual",
            unit=UNIT,
            definition=(
                "Manufacturing (SIC 2007 section C) share of UK GVA derived from "
                "ONS Gross Value Added industry weights (WGDP) series L4NT "
                "'C : Manufacturing: Weights:CVM'. ONS publishes the weight in "
                "parts per thousand of GDP(O); curated value = weight / 10 "
                "(percent). Volume (CVM) industry weight consistent with Blue Book."
            ),
            licence="Open Government Licence v3.0",
            agent_owner="energy",
            connector_module="energy.connectors.manufacturing_share_of_gva",
            curated_path="curated/observations.csv",
            update_cadence="annual (Blue Book / WGDP industry weights)",
            raw_evidence=list(evidence),
            notion_registry_url=(
                "https://app.notion.com/40d65471768581fa917ad614140dd2b3"
            ),
            transformations=(
                "Download ONS timeseries JSON (L4NT/WGDP /data). Keep years "
                "array. Parse weight (parts per thousand); curated value = "
                "weight/10 as % of GVA. Period = calendar year. Geography "
                "K02000001. Latest calendar year is provisional (Blue Book "
                "revises); earlier years are final. Raw weight retained in "
                "notes as weight_ppt=."
            ),
            revision_notes=(
                "Industry weights revise with Blue Book. Recent years may be "
                "held constant until the next BB (check forward-filled years "
                "in raw). Re-pin raw JSON on re-ingest."
            ),
            caveats=(
                "CVM industry weights ≠ current-price GVA share (levels can "
                "differ). Do not confuse with L4NU (Manufacturing+construction+"
                "services aggregate). Not a regional GVA share (Regions owns "
                "GVA by nation/region)."
            ),
            open_questions=[
                "Prefer current-price manufacturing GVA / total GVA ratio later?",
            ],
        )

    def fetch_latest(self, *, retrieved_on: date | None = None) -> RawEvidence:
        day = retrieved_on or retrieved_pin_date()
        relative = f"raw/{day.isoformat()}/l4nt_wgdp.json"
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
        rel = relative or f"raw/{retrieved_pin_date().isoformat()}/l4nt_wgdp.json"
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
        for start, end, raw_value, dataset in iter_period_rows(payload, "years"):
            weight, parsed_status = parse_numeric(raw_value)
            share = None if weight is None else weight / 10.0
            status: ObservationStatus = (
                "missing" if share is None or parsed_status == "missing" else "final"
            )
            observations.append(
                Observation(
                    indicator_id=self.indicator_id,
                    period_start=start,
                    period_end=end,
                    geography_code=UK_GEOGRAPHY_CODE,
                    geography_label=UK_GEOGRAPHY_LABEL,
                    value=share,
                    unit=UNIT,
                    observation_status=status,
                    source_version=version,
                    notes=(
                        f"series={SERIES_ID}; dataset={dataset or DATASET_ID}; "
                        f"weight_ppt={weight if weight is not None else ''}; "
                        "share_pct=weight_ppt/10"
                    ),
                )
            )
        observations.sort(key=lambda obs: obs.period_start)
        # Annual series: latest year only is provisional (function counts periods).
        return mark_latest_months_provisional(observations, months=1)


def main() -> None:
    connector = ManufacturingShareOfGvaConnector()
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
