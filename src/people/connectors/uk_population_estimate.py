"""ONS UK mid-year population estimate (UKPOP / POP).

Approach mirrors Economy real_gdp: download/pin timeseries JSON, keep years.
"""

from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Sequence

from britain_exchange.checksum import sha256_file
from britain_exchange.connector import Connector
from britain_exchange.manifest import Manifest, RawEvidence
from britain_exchange.observation import Observation, ObservationStatus
from britain_exchange.paths import PEOPLE_DATA

PINNED_RAW = "raw/2026-11-03/ukpop_pop.json"
SOURCE_LANDING = (
    "https://www.ons.gov.uk/peoplepopulationandcommunity/populationandmigration/"
    "populationestimates/timeseries/ukpop/pop"
)
SOURCE_DATA_URL = f"{SOURCE_LANDING}/data"
SERIES_ID = "UKPOP"
UK_CODE = "K02000001"
UK_LABEL = "United Kingdom"
UNIT = "persons (mid-year estimate)"


def _parse_value(raw: object) -> tuple[float | None, ObservationStatus]:
    if raw is None:
        return None, "missing"
    text = str(raw).strip()
    if not text or text in {"..", "…", "-"}:
        return None, "missing"
    return float(text.replace(",", "")), "provisional"


def parse_ukpop_years(payload: dict[str, Any]) -> list[Observation]:
    description = payload.get("description")
    if not isinstance(description, dict):
        raise ValueError("ONS payload missing description")
    cdid = str(description.get("cdid") or "").upper()
    if cdid and cdid != SERIES_ID:
        raise ValueError(f"Expected CDID {SERIES_ID}, got {cdid!r}")
    years = payload.get("years")
    if not isinstance(years, list) or not years:
        raise ValueError("ONS payload missing years array")
    release = str(description.get("releaseDate") or "")[:10]
    version = f"POP/{SERIES_ID} {release or 'unknown-release'}"
    observations: list[Observation] = []
    for row in years:
        if not isinstance(row, dict):
            raise ValueError(f"Bad year row: {row!r}")
        year = int(str(row.get("year") or row.get("date")))
        value, status = _parse_value(row.get("value"))
        # Mid-2025 provisional rounded to nearest 1000 per ONS notes.
        if year >= 2025:
            status = "provisional"
        observations.append(
            Observation(
                indicator_id="uk-population-estimate",
                period_start=f"{year:04d}-06-30",
                period_end=f"{year:04d}-06-30",
                geography_code=UK_CODE,
                geography_label=UK_LABEL,
                value=value,
                unit=UNIT,
                observation_status=status,
                source_version=version,
                notes=f"series={SERIES_ID}; mid-year usually resident population",
            )
        )
    observations.sort(key=lambda obs: obs.period_start)
    return observations


class UkPopulationEstimateConnector(Connector):
    def __init__(self, data_root: Path | None = None) -> None:
        super().__init__(data_root or (PEOPLE_DATA / "uk-population-estimate"))

    @property
    def indicator_id(self) -> str:
        return "uk-population-estimate"

    def build_manifest(self, evidence: Sequence[RawEvidence]) -> Manifest:
        return Manifest(
            indicator_id=self.indicator_id,
            title="UK population estimate",
            sector="people-society",
            publisher="ONS",
            source_url=SOURCE_LANDING,
            series_id=SERIES_ID,
            geography="United Kingdom (K02000001)",
            frequency="annual",
            unit=UNIT,
            definition=(
                "UK mid-year (30 June) usually resident population estimate from "
                "ONS timeseries UKPOP in dataset POP."
            ),
            licence="Open Government Licence v3.0",
            agent_owner="people",
            connector_module="people.connectors.uk_population_estimate",
            curated_path="curated/observations.csv",
            update_cadence="annual (mid-year estimates)",
            raw_evidence=list(evidence),
            notion_registry_url="https://app.notion.com/40d654717685818f9709f0df46c0b0cf",
            transformations=(
                "Parse ONS timeseries JSON years array; period dated 30 June."
            ),
            caveats=(
                "Excludes short-term migrants (<12 months). Latest UK figure may "
                "be provisional and rounded."
            ),
            revision_notes="Pinned UKPOP JSON releaseDate 2026-09-30.",
        )

    def evidence_from_pinned_raw(self) -> RawEvidence:
        path = self.data_root / PINNED_RAW
        if not path.is_file():
            raise FileNotFoundError(path)
        release = ""
        try:
            payload = json.loads(path.read_text(encoding="utf-8"))
            raw = (payload.get("description") or {}).get("releaseDate") or ""
            if raw:
                dt = datetime.fromisoformat(str(raw).replace("Z", "+00:00"))
                release = dt.astimezone(timezone.utc).date().isoformat()
        except (json.JSONDecodeError, OSError, ValueError):
            release = ""
        return RawEvidence(
            path=PINNED_RAW,
            retrieved_at=datetime.now(timezone.utc).isoformat(),
            checksum_sha256=sha256_file(path),
            content_type="application/json",
            official_release_date=release,
            source_url=SOURCE_DATA_URL,
        )

    def transform(self, evidence: Sequence[RawEvidence]) -> list[Observation]:
        if not evidence:
            raise ValueError("transform() requires RawEvidence")
        payload = json.loads((self.data_root / evidence[0].path).read_text(encoding="utf-8"))
        return parse_ukpop_years(payload)


def main() -> None:
    connector = UkPopulationEstimateConnector()
    evidence = connector.evidence_from_pinned_raw()
    observations = connector.transform([evidence])
    connector.write_hand_off([evidence], observations)
    print(f"observations: {len(observations)} last={observations[-1].value}")


if __name__ == "__main__":
    main()
