"""NESO Historic GB Generation Mix — 2024 pin for A Year in Power.

Approach (plain language):
1. Prefer the pinned raw CSV under data/energy/.../raw/ (immutable evidence).
2. Each NESO row is a half-hour average MW by fuel for Great Britain.
3. Convert MW → MWh with × 0.5 h, then sum to calendar months per fuel.
4. Skip aggregate GENERATION / FOSSIL / etc. Put fuel in notes as ``fuel=<Label>``.
5. Write curated CSV + manifest via Connector.write_hand_off.

This is **GB operational** power, not UK ET 5.1 annuals. Do not blend without a break.

Best practices:
- pathlib.Path (https://docs.python.org/3/library/pathlib.html)
- type hints (https://docs.python.org/3/library/typing.html)
- Fail loudly on missing columns; never invent numbers.
"""

from __future__ import annotations

import csv
import json
from calendar import monthrange
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Sequence

from britain_exchange.checksum import sha256_file
from britain_exchange.connector import Connector
from britain_exchange.manifest import Manifest, RawEvidence
from britain_exchange.observation import Observation, ObservationStatus
from britain_exchange.paths import ENERGY_DATA

GB_GEOGRAPHY_CODE = "K03000001"
GB_GEOGRAPHY_LABEL = "Great Britain"

PINNED_RAW_RELATIVE = "raw/2026-11-06/neso_historic_gb_generation_mix_2024.csv"
PINNED_META_RELATIVE = "raw/2026-11-06/retrieval.json"
SOURCE_LANDING_URL = (
    "https://www.neso.energy/data-portal/historic-generation-mix/historic_gb_generation_mix"
)
LICENCE_URL = "https://www.neso.energy/data-portal/ngeso-open-licence"
RESOURCE_ID = "f93d1835-75bc-43e5-84ad-12472b180a98"
SOURCE_VERSION = "NESO_historic_gb_generation_mix_2024"
PIN_YEAR = 2024
# Half-hour average MW × 0.5 h = MWh for that settlement period.
HOURS_PER_ROW = 0.5

# Component fuels only — not GENERATION / FOSSIL / RENEWABLE / *_perc.
COMPONENT_COLUMNS: tuple[tuple[str, str], ...] = (
    ("GAS", "Gas"),
    ("COAL", "Coal"),
    ("NUCLEAR", "Nuclear"),
    ("WIND", "Wind (metered)"),
    ("WIND_EMB", "Wind (embedded)"),
    ("HYDRO", "Hydro"),
    ("SOLAR", "Solar"),
    ("BIOMASS", "Biomass"),
    ("STORAGE", "Storage"),
    ("IMPORTS", "Imports"),
    ("OTHER", "Other"),
)


def _month_bounds(year: int, month: int) -> tuple[str, str]:
    last = monthrange(year, month)[1]
    return f"{year:04d}-{month:02d}-01", f"{year:04d}-{month:02d}-{last:02d}"


def parse_neso_2024_monthly_mwh(csv_path: Path) -> list[Observation]:
    """Sum half-hourly MW × 0.5 into monthly MWh by component fuel."""
    # (year, month, fuel_label) -> MWh
    totals: dict[tuple[int, int, str], float] = defaultdict(float)
    rows_read = 0
    with csv_path.open(newline="", encoding="utf-8") as handle:
        reader = csv.DictReader(handle)
        missing = [col for col, _ in COMPONENT_COLUMNS if col not in (reader.fieldnames or [])]
        if missing:
            raise ValueError(f"NESO CSV missing columns: {missing}")
        if "DATETIME" not in (reader.fieldnames or []):
            raise ValueError("NESO CSV missing DATETIME")
        for row in reader:
            raw_dt = (row.get("DATETIME") or "").strip()
            if not raw_dt:
                continue
            # NESO uses ISO without timezone; treat as UTC wall clock for the period start.
            dt = datetime.fromisoformat(raw_dt.replace("Z", "+00:00"))
            if dt.tzinfo is not None:
                dt = dt.replace(tzinfo=None)
            if dt.year != PIN_YEAR:
                continue
            rows_read += 1
            for col, label in COMPONENT_COLUMNS:
                cell = (row.get(col) or "").strip()
                if cell == "":
                    continue
                mw = float(cell)
                totals[(dt.year, dt.month, label)] += mw * HOURS_PER_ROW

    if rows_read == 0:
        raise ValueError(f"No {PIN_YEAR} rows parsed from {csv_path.name}")

    observations: list[Observation] = []
    status: ObservationStatus = "final"
    for (year, month, label) in sorted(totals):
        start_d, end_d = _month_bounds(year, month)
        observations.append(
            Observation(
                indicator_id="gb-generation-mix-half-hourly",
                period_start=start_d,
                period_end=end_d,
                geography_code=GB_GEOGRAPHY_CODE,
                geography_label=GB_GEOGRAPHY_LABEL,
                value=totals[(year, month, label)],
                unit="MWh",
                observation_status=status,
                source_version=SOURCE_VERSION,
                notes=f"fuel={label}",
            )
        )
    return observations


class GbGenerationMixConnector(Connector):
    """NESO GB generation mix — monthly MWh derived from half-hourly MW."""

    def __init__(self, data_root: Path | None = None) -> None:
        root = data_root or (ENERGY_DATA / "gb-generation-mix-half-hourly")
        super().__init__(root)

    @property
    def indicator_id(self) -> str:
        return "gb-generation-mix-half-hourly"

    def build_manifest(self, evidence: Sequence[RawEvidence]) -> Manifest:
        return Manifest(
            indicator_id=self.indicator_id,
            title="GB generation mix (half-hourly source, monthly MWh)",
            sector="energy-industry",
            publisher="NESO",
            source_url=SOURCE_LANDING_URL,
            series_id=f"Historic GB Generation Mix ({RESOURCE_ID})",
            geography="Great Britain (K03000001); Northern Ireland excluded",
            frequency="monthly",
            unit="MWh",
            definition=(
                "Great Britain electricity generation by fuel, monthly megawatt-hours. "
                "Exchange-derived: NESO half-hourly average MW × 0.5 h, summed by "
                "calendar month. Component fuels only (Gas, Coal, Nuclear, Wind metered, "
                "Wind embedded, Hydro, Solar, Biomass, Storage, Imports, Other). "
                "Not UK totals and not ET 5.1."
            ),
            licence=f"NESO Open Data Licence — {LICENCE_URL}",
            agent_owner="energy",
            connector_module="energy.connectors.gb_generation_mix",
            curated_path="curated/observations.csv",
            update_cadence="NESO portal updates hourly; this pin is calendar year 2024",
            raw_evidence=list(evidence),
            notion_registry_url="https://app.notion.com/410654717685819b956fe16c3456a80b",
            transformations=(
                f"Pinned {PIN_YEAR} half-hourly CSV from NESO datastore_search_sql. "
                "For each component fuel column, MWh = MW × 0.5; sum by calendar month. "
                "notes=fuel=<Label>. Aggregate GENERATION and percentage columns excluded."
            ),
            caveats=(
                "Geography is Great Britain (NESO), not the United Kingdom — do not blend "
                "with ET 5.1 UK annual/quarterly TWh without a labelled break. Fuel taxonomy "
                "differs from ET 5.1 and DUKES. Values are Exchange-derived monthly totals "
                "from half-hourly averages; NESO may revise recent periods. Batteries net "
                "discharge and transmission solar may sit in OTHER until NESO splits them."
            ),
            open_questions=[
                "Extend pin beyond 2024 or store daily grain for denser Year charts.",
                "Optional carbon-intensity companion series from the same NESO resource.",
            ],
        )

    def evidence_from_pinned_raw(self) -> RawEvidence:
        path = self.data_root / PINNED_RAW_RELATIVE
        if not path.is_file():
            raise FileNotFoundError(f"Pinned raw CSV missing: {path}")
        meta_path = self.data_root / PINNED_META_RELATIVE
        retrieved = datetime.now(timezone.utc).isoformat()
        source_url = SOURCE_LANDING_URL
        if meta_path.is_file():
            meta = json.loads(meta_path.read_text(encoding="utf-8"))
            retrieved = str(meta.get("retrieved_at") or retrieved)
            source_url = str(meta.get("download_csv_url") or source_url)
        return RawEvidence(
            path=PINNED_RAW_RELATIVE,
            retrieved_at=retrieved,
            checksum_sha256=sha256_file(path),
            content_type="text/csv",
            official_release_date=None,
            http_status=200,
            source_url=source_url,
        )

    def transform(self, evidence: Sequence[RawEvidence]) -> list[Observation]:
        if not evidence:
            raise ValueError("transform() requires at least one RawEvidence entry")
        csv_path = self.data_root / evidence[0].path
        if not csv_path.is_file():
            raise FileNotFoundError(f"Raw CSV not found: {csv_path}")
        return parse_neso_2024_monthly_mwh(csv_path)


def main() -> None:
    """Pinned raw → curated monthly observations + manifest."""
    connector = GbGenerationMixConnector()
    evidence = connector.evidence_from_pinned_raw()
    observations = connector.transform([evidence])
    manifest_path, curated_path = connector.write_hand_off([evidence], observations)
    fuels = sorted(
        {
            obs.notes.removeprefix("fuel=")
            for obs in observations
            if obs.notes.startswith("fuel=")
        }
    )
    print(f"indicator_id: {connector.indicator_id}")
    print(f"raw: {evidence.path} sha256={evidence.checksum_sha256}")
    print(f"observations: {len(observations)}")
    print(f"fuels ({len(fuels)}): {', '.join(fuels)}")
    print(f"manifest: {manifest_path}")
    print(f"curated: {curated_path}")


if __name__ == "__main__":
    main()
