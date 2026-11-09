"""NSTA UKCS field production (PPRS points, WGS84) — annual aggregates.

Approach (plain language):
1. Download the official Hub CSV for UKCS hydrocarbon field production reports
   (PPRS points, WGS84) — monthly rows per reporting unit.
2. Pin the raw CSV under data/energy/nsta-field-production/raw/ with sha256.
3. Aggregate to calendar-year totals by Field name (oil tonnes, gas volumes).
4. Publish national field-sum observations with an explicit caveat: field sums
   are not DESNZ national indigenous production.

Best practices:
- pathlib (https://docs.python.org/3/library/pathlib.html)
- type hints (https://docs.python.org/3/library/typing.html)
- Fail loudly on empty CSV (PEP 8 error handling).
"""

from __future__ import annotations

import csv
import json
from collections import defaultdict
from datetime import date, datetime, timezone
from pathlib import Path
from typing import Any, Sequence

from britain_exchange.checksum import sha256_file
from britain_exchange.connector import Connector
from britain_exchange.manifest import Manifest, RawEvidence
from britain_exchange.observation import Observation
from britain_exchange.paths import ENERGY_DATA

INDICATOR_ID = "nsta-field-production"
GEOGRAPHY_CODE = "UKCS"
GEOGRAPHY_LABEL = "UK Continental Shelf (PPRS reporting units)"
UNIT_OIL = "tonnes"
UNIT_GAS = "ksm3"

HUB_ITEM_ID = "dd38204275a04618ab7ddd00f87224e3"
SOURCE_LANDING_URL = (
    "https://open-data-ukcs-transition.hub.arcgis.com/datasets/"
    "UKCS-transition::ukcs-hydrocarbon-field-production-reports-pprs-points-wgs84"
)
CSV_DOWNLOAD_URL = (
    "https://open-data-ukcs-transition.hub.arcgis.com/api/download/v1/items/"
    f"{HUB_ITEM_ID}/csv?layers=0"
)
NSTA_ATTRIBUTION = (
    "Contains information provided by the North Sea Transition Authority "
    "and/or other third parties."
)
LICENCE = (
    "NSTA User Agreement (Open User Licence) — see "
    "data/energy/oil-gas-fossil-fuels/licence/README.md; attribution required"
)
SOURCE_VERSION_PREFIX = "NSTA_PPRS_Field_Production_WGS84"

ANNUAL_FIELDS = (
    "field_name",
    "year",
    "location",
    "field_region",
    "operator_group",
    "months",
    "oil_tonnes",
    "associated_gas_ksm3",
    "dry_gas_ksm3",
    "condensate_tonnes",
    "gas_to_pipeline_ksm3",
    "lon",
    "lat",
)


def _snapshot_day() -> date:
    return datetime.now(timezone.utc).date()


def _raw_relative(day: date) -> str:
    return f"raw/{day.isoformat()}/ukcs_pprs_field_production.csv"


def _num(raw: str | None) -> float:
    if raw is None or raw == "":
        return 0.0
    try:
        return float(raw)
    except ValueError:
        return 0.0


def aggregate_annual(csv_path: Path) -> tuple[list[dict[str, str]], dict[str, Any]]:
    """Sum monthly PPRS rows to field × calendar year."""
    buckets: dict[tuple[str, str], dict[str, Any]] = defaultdict(
        lambda: {
            "location": "",
            "field_region": "",
            "operator_group": "",
            "months": 0,
            "oil_tonnes": 0.0,
            "associated_gas_ksm3": 0.0,
            "dry_gas_ksm3": 0.0,
            "condensate_tonnes": 0.0,
            "gas_to_pipeline_ksm3": 0.0,
            "lon": "",
            "lat": "",
        }
    )
    monthly_rows = 0
    with csv_path.open(newline="", encoding="utf-8-sig") as handle:
        reader = csv.DictReader(handle)
        required = {
            "Field name",
            "Reporting period year",
            "Oil production - mass (tonnes)",
        }
        if not reader.fieldnames or not required.issubset(set(reader.fieldnames)):
            raise ValueError(f"Unexpected PPRS CSV columns in {csv_path}")
        for row in reader:
            name = (row.get("Field name") or "").strip()
            year = (row.get("Reporting period year") or "").strip()
            if not name or not year:
                continue
            monthly_rows += 1
            cur = buckets[(name, year)]
            cur["months"] += 1
            cur["oil_tonnes"] += _num(row.get("Oil production - mass (tonnes)"))
            cur["associated_gas_ksm3"] += _num(
                row.get("Associated gas production - volume (ksm3)")
            )
            cur["dry_gas_ksm3"] += _num(row.get("Dry gas production - volume (ksm3)"))
            cur["condensate_tonnes"] += _num(row.get("Gas condensate - mass (tonnes)"))
            cur["gas_to_pipeline_ksm3"] += _num(
                row.get("Gas to pipeline - volume (ksm3)")
            )
            cur["location"] = (row.get("Onshore, offshore flag") or cur["location"]).strip()
            cur["field_region"] = (row.get("Field region") or cur["field_region"]).strip()
            cur["operator_group"] = (
                row.get("Operator organisation group") or cur["operator_group"]
            ).strip()
            if not cur["lon"]:
                lon = (row.get("x") or "").strip()
                lat = (row.get("y") or "").strip()
                if lon and lat:
                    cur["lon"] = lon
                    cur["lat"] = lat

    if not buckets:
        raise ValueError(f"No PPRS rows aggregated from {csv_path}")

    rows: list[dict[str, str]] = []
    for (name, year), cur in sorted(buckets.items(), key=lambda item: (item[0][0].casefold(), item[0][1])):
        rows.append(
            {
                "field_name": name,
                "year": year,
                "location": str(cur["location"]),
                "field_region": str(cur["field_region"]),
                "operator_group": str(cur["operator_group"]),
                "months": str(cur["months"]),
                "oil_tonnes": f"{cur['oil_tonnes']:.6f}".rstrip("0").rstrip("."),
                "associated_gas_ksm3": f"{cur['associated_gas_ksm3']:.6f}".rstrip("0").rstrip("."),
                "dry_gas_ksm3": f"{cur['dry_gas_ksm3']:.6f}".rstrip("0").rstrip("."),
                "condensate_tonnes": f"{cur['condensate_tonnes']:.6f}".rstrip("0").rstrip("."),
                "gas_to_pipeline_ksm3": f"{cur['gas_to_pipeline_ksm3']:.6f}".rstrip("0").rstrip("."),
                "lon": str(cur["lon"]),
                "lat": str(cur["lat"]),
            }
        )

    meta = {
        "monthly_rows": monthly_rows,
        "annual_field_years": len(rows),
        "field_count": len({r["field_name"] for r in rows}),
        "year_min": min(r["year"] for r in rows),
        "year_max": max(r["year"] for r in rows),
        "hub_item_id": HUB_ITEM_ID,
        "attribution": NSTA_ATTRIBUTION,
    }
    return rows, meta


def national_observations(
    annual_rows: Sequence[dict[str, str]],
    *,
    as_of: date,
) -> list[Observation]:
    """Field-sum national annual oil / gas-to-pipeline — not DESNZ indigenous totals."""
    source_version = f"{SOURCE_VERSION_PREFIX}_{as_of.isoformat()}"
    by_year: dict[str, dict[str, float]] = defaultdict(
        lambda: {"oil": 0.0, "pipe": 0.0, "fields": 0.0}
    )
    for row in annual_rows:
        year = row["year"]
        by_year[year]["oil"] += float(row["oil_tonnes"] or 0)
        by_year[year]["pipe"] += float(row["gas_to_pipeline_ksm3"] or 0)
        by_year[year]["fields"] += 1

    observations: list[Observation] = []
    for year in sorted(by_year):
        period_start = f"{year}-01-01"
        period_end = f"{year}-12-31"
        totals = by_year[year]
        observations.append(
            Observation(
                indicator_id=INDICATOR_ID,
                period_start=period_start,
                period_end=period_end,
                geography_code=GEOGRAPHY_CODE,
                geography_label=GEOGRAPHY_LABEL,
                value=totals["oil"],
                unit=UNIT_OIL,
                observation_status="final" if year != str(as_of.year) else "provisional",
                source_version=source_version,
                notes=(
                    "kind=field_sum_oil; fuel=Oil; "
                    "not_desnz_national=true; "
                    f"field_years={int(totals['fields'])}"
                ),
            )
        )
        observations.append(
            Observation(
                indicator_id=INDICATOR_ID,
                period_start=period_start,
                period_end=period_end,
                geography_code=GEOGRAPHY_CODE,
                geography_label=GEOGRAPHY_LABEL,
                value=totals["pipe"],
                unit=UNIT_GAS,
                observation_status="final" if year != str(as_of.year) else "provisional",
                source_version=source_version,
                notes=(
                    "kind=field_sum_gas_to_pipeline; fuel=Gas; "
                    "not_desnz_national=true; "
                    f"field_years={int(totals['fields'])}"
                ),
            )
        )
    return observations


class NstaFieldProductionConnector(Connector):
    """Download + curate NSTA PPRS field production (annual aggregates)."""

    def __init__(self, data_root: Path | None = None) -> None:
        root = data_root or (ENERGY_DATA / INDICATOR_ID)
        super().__init__(root, timeout_s=300.0)

    @property
    def indicator_id(self) -> str:
        return INDICATOR_ID

    def build_manifest(self, evidence: Sequence[RawEvidence]) -> Manifest:
        return Manifest(
            indicator_id=self.indicator_id,
            title="NSTA UKCS field production (PPRS annual)",
            sector="energy-industry",
            publisher="North Sea Transition Authority",
            source_url=SOURCE_LANDING_URL,
            series_id="UKCS hydrocarbon field production reports PPRS points (WGS84)",
            geography=(
                "UKCS PPRS reporting units (offshore + England onshore where published); "
                "not a substitute for DESNZ national indigenous production"
            ),
            frequency="annual",
            unit="tonnes (oil) / ksm3 (gas to pipeline)",
            definition=(
                "Calendar-year sums of monthly NSTA PPRS field production reports: "
                "oil mass (tonnes) and gas to pipeline (ksm3) by Field name. "
                f"{NSTA_ATTRIBUTION}"
            ),
            licence=LICENCE,
            agent_owner="energy",
            connector_module="energy.connectors.nsta_field_production",
            curated_path="curated/observations.csv",
            update_cadence="Re-fetch when NSTA republishes the Hub layer",
            raw_evidence=list(evidence),
            transformations=(
                "Download Hub CSV. Pin under raw/<date>/. Aggregate monthly rows to "
                "field × year (oil tonnes, associated/dry gas ksm3, condensate tonnes, "
                "gas to pipeline ksm3). Write curated/annual_by_field.csv and national "
                "field-sum observations (kind=field_sum_oil|field_sum_gas_to_pipeline)."
            ),
            caveats=(
                "Field-sum totals must not replace DESNZ indigenous crude or ET gas "
                "production. Coverage and reporting-unit boundaries differ from DUKES. "
                "Incomplete years stay marked provisional. Onshore Scotland/Wales/NI "
                f"are not published by NSTA. {NSTA_ATTRIBUTION}"
            ),
            related_indicator_ids=[
                "nsta-ukcs-fields",
                "crude-oil-production",
                "domestic-gas-production",
            ],
            open_questions=[],
            notion_registry_url="",
        )

    def fetch_latest(self) -> RawEvidence:
        day = _snapshot_day()
        relative = _raw_relative(day)
        result = self.fetch_url(
            CSV_DOWNLOAD_URL,
            relative,
            official_release_date=day.isoformat(),
        )
        if result.path.stat().st_size < 1_000_000:
            raise ValueError(f"PPRS CSV unexpectedly small: {result.path}")
        return result.evidence

    def evidence_from_pinned_raw(self, relative_path: str | None = None) -> RawEvidence:
        if relative_path is None:
            raw_root = self.data_root / "raw"
            pins = sorted(raw_root.glob("*/ukcs_pprs_field_production.csv"))
            if not pins:
                raise FileNotFoundError("No pinned PPRS CSV; run with --fetch first")
            path = pins[-1]
            relative_path = str(path.relative_to(self.data_root))
        else:
            path = self.data_root / relative_path
        if not path.is_file():
            raise FileNotFoundError(f"Pinned PPRS CSV missing: {path}")
        day = path.parent.name
        return RawEvidence(
            path=relative_path,
            retrieved_at=datetime.now(timezone.utc).isoformat(),
            checksum_sha256=sha256_file(path),
            content_type="text/csv",
            official_release_date=day,
            http_status=200,
            source_url=CSV_DOWNLOAD_URL,
        )

    def transform(self, evidence: Sequence[RawEvidence]) -> list[Observation]:
        if not evidence:
            raise ValueError("transform() requires at least one RawEvidence entry")
        csv_path = self.data_root / evidence[0].path
        as_of = date.fromisoformat(csv_path.parent.name)
        annual_rows, meta = aggregate_annual(csv_path)
        curated_dir = self.data_root / "curated"
        curated_dir.mkdir(parents=True, exist_ok=True)
        annual_path = curated_dir / "annual_by_field.csv"
        with annual_path.open("w", encoding="utf-8", newline="") as handle:
            writer = csv.DictWriter(handle, fieldnames=list(ANNUAL_FIELDS))
            writer.writeheader()
            writer.writerows(annual_rows)
        (curated_dir / "spatial_meta.json").write_text(
            json.dumps(meta, indent=2) + "\n",
            encoding="utf-8",
        )
        return national_observations(annual_rows, as_of=as_of)


def main(argv: Sequence[str] | None = None) -> None:
    import argparse

    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--fetch", action="store_true", help="Download a fresh Hub CSV pin")
    parser.add_argument("--raw", default=None, help="Relative raw path to reuse")
    args = parser.parse_args(list(argv) if argv is not None else None)

    connector = NstaFieldProductionConnector()
    evidence = connector.fetch_latest() if args.fetch else connector.evidence_from_pinned_raw(args.raw)
    observations = connector.transform([evidence])
    manifest_path, curated_path = connector.write_hand_off([evidence], observations)
    print(f"indicator_id: {INDICATOR_ID}")
    print(f"raw: {evidence.path} sha256={evidence.checksum_sha256}")
    print(f"observations: {len(observations)}")
    print(f"manifest: {manifest_path}")
    print(f"curated: {curated_path}")
    print(f"annual: {connector.data_root / 'curated' / 'annual_by_field.csv'}")
    print(f"attribution: {NSTA_ATTRIBUTION}")


if __name__ == "__main__":
    main()
