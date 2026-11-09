"""NSTA UKCS offshore hydrocarbon fields (WGS84) — spatial hand-off.

Approach (plain language):
1. Download the official Hub GeoJSON for UKCS offshore hydrocarbon fields (WGS84).
2. Pin the raw FeatureCollection under data/energy/nsta-ukcs-fields/raw/ with sha256.
3. Curate a summary Observation table (feature counts by status / field type),
   a named-fields CSV (no geometry), and a curated copy of the polygons.
4. Document CRS EPSG:4326, NSTA attribution, and UKCS-offshore-only coverage.

This is a point-in-time spatial atlas — not a production time series and not a
national petroleum atlas (no onshore Scotland/Wales/NI).

Best practices:
- pathlib (https://docs.python.org/3/library/pathlib.html)
- type hints (https://docs.python.org/3/library/typing.html)
- Fail loudly on empty/non-FeatureCollection payloads (PEP 8 error handling).
"""

from __future__ import annotations

import csv
import json
import shutil
from collections import Counter
from datetime import date, datetime, timezone
from pathlib import Path
from typing import Any, Sequence

from britain_exchange.checksum import sha256_file
from britain_exchange.connector import Connector
from britain_exchange.manifest import Manifest, RawEvidence
from britain_exchange.observation import Observation
from britain_exchange.paths import ENERGY_DATA

INDICATOR_ID = "nsta-ukcs-fields"
GEOGRAPHY_CODE = "UKCS"
GEOGRAPHY_LABEL = "UK Continental Shelf (offshore)"
CRS = "EPSG:4326"
UNIT = "feature_count"

HUB_ITEM_ID = "ba711a4be08449329a871d37ae910735"
SOURCE_LANDING_URL = (
    "https://open-data-ukcs-transition.hub.arcgis.com/datasets/"
    "UKCS-transition::ukcs-offshore-hydrocarbon-fields-wgs84"
)
GEOJSON_DOWNLOAD_URL = (
    "https://open-data-ukcs-transition.hub.arcgis.com/api/download/v1/items/"
    f"{HUB_ITEM_ID}/geojson?layers=0"
)
FEATURE_SERVER_URL = (
    "https://services-eu1.arcgis.com/OZMfUznmLTnWccBc/arcgis/rest/services/"
    "Offshore_hydrocarbon_fields_(WGS84)/FeatureServer/0"
)
DATA_GOV_UK_URL = (
    "https://www.data.gov.uk/dataset/ba533146-91dd-45ef-a81e-95906f981890/"
    "ukcs-offshore-hydrocarbon-fields-ed50"
)
NSTA_ATTRIBUTION = (
    "Contains information provided by the North Sea Transition Authority "
    "and/or other third parties."
)
LICENCE = (
    "NSTA User Agreement (Open User Licence) — see "
    "data/energy/oil-gas-fossil-fuels/licence/README.md; attribution required"
)
SOURCE_VERSION_PREFIX = "NSTA_UKCS_Offshore_Fields_WGS84"

FEATURES_CSV_FIELDS = (
    "field_name",
    "name_short",
    "field_type",
    "status",
    "det_status",
    "disc_date",
    "prod_date",
    "curr_oper",
    "currlic",
    "objectid",
)


def _snapshot_day() -> date:
    return datetime.now(timezone.utc).date()


def _raw_relative(day: date) -> str:
    return f"raw/{day.isoformat()}/ukcs_offshore_hydrocarbon_fields_wgs84.geojson"


def load_feature_collection(path: Path) -> dict[str, Any]:
    """Load GeoJSON; fail loudly if not a FeatureCollection with features."""
    payload = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(payload, dict) or payload.get("type") != "FeatureCollection":
        raise ValueError(f"Expected GeoJSON FeatureCollection in {path}")
    features = payload.get("features")
    if not isinstance(features, list) or not features:
        raise ValueError(f"FeatureCollection has no features: {path}")
    return payload


def summarise_fields(
    geojson_path: Path,
    *,
    as_of: date,
) -> tuple[list[Observation], list[dict[str, str]], dict[str, Any]]:
    """Build observations + named-field rows + spatial meta from pinned GeoJSON."""
    collection = load_feature_collection(geojson_path)
    features = collection["features"]
    source_version = f"{SOURCE_VERSION_PREFIX}_{as_of.isoformat()}"
    period = as_of.isoformat()

    status_counts: Counter[str] = Counter()
    type_counts: Counter[str] = Counter()
    feature_rows: list[dict[str, str]] = []

    for feature in features:
        props = feature.get("properties") or {}
        if not isinstance(props, dict):
            raise ValueError("Feature properties must be an object")
        status = str(props.get("STATUS") or "UNKNOWN").strip() or "UNKNOWN"
        field_type = str(props.get("FIELDTYPE") or "UNKNOWN").strip() or "UNKNOWN"
        status_counts[status] += 1
        type_counts[field_type] += 1
        feature_rows.append(
            {
                "field_name": str(props.get("FIELDNAME") or "").strip(),
                "name_short": str(props.get("NAME_SHORT") or "").strip(),
                "field_type": field_type,
                "status": status,
                "det_status": str(props.get("DET_STATUS") or "").strip(),
                "disc_date": str(props.get("DISC_DATE") or "").strip(),
                "prod_date": str(props.get("PROD_DATE") or "").strip(),
                "curr_oper": str(props.get("CURR_OPER") or "").strip(),
                "currlic": str(props.get("CURRLIC") or "").strip(),
                "objectid": str(props.get("OBJECTID") or "").strip(),
            }
        )

    feature_rows.sort(key=lambda row: row["field_name"].casefold())

    observations: list[Observation] = [
        Observation(
            indicator_id=INDICATOR_ID,
            period_start=period,
            period_end=period,
            geography_code=GEOGRAPHY_CODE,
            geography_label=GEOGRAPHY_LABEL,
            value=float(len(features)),
            unit=UNIT,
            observation_status="final",
            source_version=source_version,
            notes="kind=total_features; crs=EPSG:4326; layer=UKCS_offshore_hydrocarbon_fields_WGS84",
        )
    ]
    for status, count in sorted(status_counts.items()):
        observations.append(
            Observation(
                indicator_id=INDICATOR_ID,
                period_start=period,
                period_end=period,
                geography_code=GEOGRAPHY_CODE,
                geography_label=GEOGRAPHY_LABEL,
                value=float(count),
                unit=UNIT,
                observation_status="final",
                source_version=source_version,
                notes=f"kind=status_count; status={status}",
            )
        )
    for field_type, count in sorted(type_counts.items()):
        observations.append(
            Observation(
                indicator_id=INDICATOR_ID,
                period_start=period,
                period_end=period,
                geography_code=GEOGRAPHY_CODE,
                geography_label=GEOGRAPHY_LABEL,
                value=float(count),
                unit=UNIT,
                observation_status="final",
                source_version=source_version,
                notes=f"kind=field_type_count; field_type={field_type}",
            )
        )

    meta = {
        "feature_count": len(features),
        "crs": CRS,
        "attribution": NSTA_ATTRIBUTION,
        "status_counts": dict(sorted(status_counts.items())),
        "field_type_counts": dict(sorted(type_counts.items())),
        "hub_item_id": HUB_ITEM_ID,
        "feature_server_url": FEATURE_SERVER_URL,
    }
    return observations, feature_rows, meta


def write_features_csv(path: Path, rows: Sequence[dict[str, str]]) -> Path:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=list(FEATURES_CSV_FIELDS))
        writer.writeheader()
        writer.writerows(rows)
    return path


class NstaUkcsFieldsConnector(Connector):
    """Download + curate NSTA UKCS offshore hydrocarbon fields (WGS84)."""

    def __init__(self, data_root: Path | None = None) -> None:
        root = data_root or (ENERGY_DATA / INDICATOR_ID)
        # Large Hub GeoJSON exports can exceed the default 60s on slow links.
        super().__init__(root, timeout_s=180.0)

    @property
    def indicator_id(self) -> str:
        return INDICATOR_ID

    def build_manifest(self, evidence: Sequence[RawEvidence]) -> Manifest:
        return Manifest(
            indicator_id=self.indicator_id,
            title="NSTA UKCS offshore hydrocarbon fields (WGS84)",
            sector="energy-industry",
            publisher="North Sea Transition Authority",
            source_url=SOURCE_LANDING_URL,
            series_id="UKCS offshore hydrocarbon fields (WGS84) FeatureServer/0",
            geography=(
                "UK Continental Shelf offshore only — not onshore Scotland/Wales/NI; "
                "not a national petroleum atlas"
            ),
            frequency="ad_hoc",
            unit=UNIT,
            definition=(
                "Point-in-time count of NSTA UKCS offshore hydrocarbon field polygons "
                "(operator outlines at determination / re-determination), summarised by "
                "STATUS and FIELDTYPE. Full polygons are pinned GeoJSON (EPSG:4326). "
                f"{NSTA_ATTRIBUTION}"
            ),
            licence=LICENCE,
            agent_owner="energy",
            connector_module="energy.connectors.nsta_ukcs_fields",
            curated_path="curated/observations.csv",
            update_cadence="Re-fetch when NSTA republishes the Hub layer",
            raw_evidence=list(evidence),
            transformations=(
                "Download Hub GeoJSON (WGS84). Pin under raw/<date>/. Write "
                "curated/observations.csv (total + status + field_type counts), "
                "curated/features.csv (named field attributes, no geometry), and "
                "curated/fields.geojson (full FeatureCollection copy)."
            ),
            caveats=(
                "UKCS offshore fields only. Do not invent onshore Scotland/Wales/NI "
                "coverage. Counts are a spatial snapshot, not production volumes — "
                "do not fabricate national oil/gas totals from incomplete field coverage. "
                "Sibling ED50/ETRS89 Hub layers exist; this package pins WGS84 "
                f"({CRS}) only. {NSTA_ATTRIBUTION} Do not reuse NSTA logos."
            ),
            related_indicator_ids=["nsta-ukcs-licences", "crude-oil-production"],
            open_questions=[
                "Should Validation sample a named field polygon against the Hub map viewer?",
            ],
            notion_registry_url="",
        )

    def fetch_latest(self) -> RawEvidence:
        """Download Hub GeoJSON into a dated raw/ pin."""
        day = _snapshot_day()
        relative = _raw_relative(day)
        result = self.fetch_url(
            GEOJSON_DOWNLOAD_URL,
            relative,
            official_release_date=day.isoformat(),
        )
        # Ensure payload is usable before we treat the pin as evidence.
        load_feature_collection(result.path)
        return result.evidence

    def evidence_from_pinned_raw(self, relative_path: str | None = None) -> RawEvidence:
        """Rebuild evidence metadata from an existing raw pin (no re-download)."""
        if relative_path is None:
            raw_root = self.data_root / "raw"
            if not raw_root.is_dir():
                raise FileNotFoundError(f"No raw/ directory under {self.data_root}")
            pins = sorted(raw_root.glob("*/ukcs_offshore_hydrocarbon_fields_wgs84.geojson"))
            if not pins:
                raise FileNotFoundError(
                    "No pinned fields GeoJSON; run with --fetch first"
                )
            path = pins[-1]
            relative_path = str(path.relative_to(self.data_root))
        else:
            path = self.data_root / relative_path
        if not path.is_file():
            raise FileNotFoundError(f"Pinned GeoJSON missing: {path}")
        day = path.parent.name
        return RawEvidence(
            path=relative_path,
            retrieved_at=datetime.now(timezone.utc).isoformat(),
            checksum_sha256=sha256_file(path),
            content_type="application/geo+json",
            official_release_date=day,
            http_status=200,
            source_url=GEOJSON_DOWNLOAD_URL,
        )

    def transform(self, evidence: Sequence[RawEvidence]) -> list[Observation]:
        if not evidence:
            raise ValueError("transform() requires at least one RawEvidence entry")
        geojson_path = self.data_root / evidence[0].path
        as_of = date.fromisoformat(geojson_path.parent.name)
        observations, feature_rows, meta = summarise_fields(geojson_path, as_of=as_of)

        curated_dir = self.data_root / "curated"
        curated_dir.mkdir(parents=True, exist_ok=True)
        write_features_csv(curated_dir / "features.csv", feature_rows)
        curated_geojson = curated_dir / "fields.geojson"
        shutil.copyfile(geojson_path, curated_geojson)
        (curated_dir / "spatial_meta.json").write_text(
            json.dumps(meta, indent=2) + "\n",
            encoding="utf-8",
        )
        return observations


def main(argv: Sequence[str] | None = None) -> None:
    import argparse

    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--fetch",
        action="store_true",
        help="Download a fresh Hub GeoJSON pin under raw/<UTC-date>/",
    )
    parser.add_argument(
        "--raw",
        default=None,
        help="Optional relative raw path to reuse instead of the latest pin",
    )
    args = parser.parse_args(list(argv) if argv is not None else None)

    connector = NstaUkcsFieldsConnector()
    if args.fetch:
        evidence = connector.fetch_latest()
    else:
        evidence = connector.evidence_from_pinned_raw(args.raw)

    observations = connector.transform([evidence])
    manifest_path, curated_path = connector.write_hand_off([evidence], observations)
    total = next(o for o in observations if "kind=total_features" in o.notes)
    print(f"indicator_id: {INDICATOR_ID}")
    print(f"raw: {evidence.path} sha256={evidence.checksum_sha256}")
    print(f"feature_count: {int(total.value or 0)} crs={CRS}")
    print(f"observations: {len(observations)}")
    print(f"manifest: {manifest_path}")
    print(f"curated: {curated_path}")
    print(f"features_csv: {connector.data_root / 'curated' / 'features.csv'}")
    print(f"curated_geojson: {connector.data_root / 'curated' / 'fields.geojson'}")
    print(f"attribution: {NSTA_ATTRIBUTION}")


if __name__ == "__main__":
    main()
