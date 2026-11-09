"""NSTA UKCS offshore petroleum licences (WGS84) — spatial hand-off.

Approach (plain language):
1. Download the official Hub GeoJSON for UKCS offshore petroleum licences (WGS84).
2. Pin the raw FeatureCollection under data/energy/nsta-ukcs-licences/raw/ with sha256.
3. Curate Observation rows (feature counts + agreed area km² by primary region),
   a named-licence CSV (no geometry), and a curated copy of the polygons.
4. Document CRS EPSG:4326, NSTA attribution, and UKCS-offshore-only coverage.

The published WGS84 licences layer currently carries Extant offshore Production
licences only — not expired history, not onshore England, and not
Scotland/Wales/NI onshore (which NSTA does not publish).

Best practices:
- pathlib (https://docs.python.org/3/library/pathlib.html)
- type hints (https://docs.python.org/3/library/typing.html)
- Fail loudly on empty/non-FeatureCollection payloads.
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

INDICATOR_ID = "nsta-ukcs-licences"
GEOGRAPHY_CODE = "UKCS"
GEOGRAPHY_LABEL = "UK Continental Shelf (offshore)"
CRS = "EPSG:4326"
UNIT_COUNT = "feature_count"
UNIT_AREA = "km2"

HUB_ITEM_ID = "e4e489b088b44e29af1c848468403988"
SOURCE_LANDING_URL = (
    "https://open-data-ukcs-transition.hub.arcgis.com/datasets/"
    "UKCS-transition::ukcs-offshore-petroleum-licences-wgs84"
)
GEOJSON_DOWNLOAD_URL = (
    "https://open-data-ukcs-transition.hub.arcgis.com/api/download/v1/items/"
    f"{HUB_ITEM_ID}/geojson?layers=0"
)
FEATURE_SERVER_URL = (
    "https://services-eu1.arcgis.com/OZMfUznmLTnWccBc/arcgis/rest/services/"
    "UKCS offshore petroleum licences WGS84/FeatureServer/0"
)
DATA_GOV_UK_URL = (
    "https://www.data.gov.uk/dataset/a4fabc09-b176-4a46-bff5-cd08873ef354/"
    "ukcs-offshore-petroleum-licences-ed50"
)
NSTA_ATTRIBUTION = (
    "Contains information provided by the North Sea Transition Authority "
    "and/or other third parties."
)
LICENCE = (
    "NSTA User Agreement (Open User Licence) — see "
    "data/energy/oil-gas-fossil-fuels/licence/README.md; attribution required"
)
SOURCE_VERSION_PREFIX = "NSTA_UKCS_Offshore_Licences_WGS84"

FEATURES_CSV_FIELDS = (
    "licref",
    "lic_prefix",
    "lic_no",
    "lic_type",
    "lic_status",
    "location",
    "regions",
    "primary_region",
    "blockref",
    "fields",
    "licorg",
    "agreed_km2",
    "calc_km2",
    "lic_start",
    "objectid",
)


def _snapshot_day() -> date:
    return datetime.now(timezone.utc).date()


def _raw_relative(day: date) -> str:
    return f"raw/{day.isoformat()}/ukcs_offshore_petroleum_licences_wgs84.geojson"


def _primary_region(regions: str) -> str:
    """First region label before a comma — multi-region rows stay labelled in CSV."""
    text = (regions or "").strip()
    if not text:
        return "UNKNOWN"
    return text.split(",", 1)[0].strip() or "UNKNOWN"


def _float_or_none(raw: object) -> float | None:
    if raw is None or raw == "":
        return None
    try:
        value = float(raw)
    except (TypeError, ValueError):
        return None
    if value != value:  # NaN
        return None
    return value


def load_feature_collection(path: Path) -> dict[str, Any]:
    """Load GeoJSON; fail loudly if not a FeatureCollection with features."""
    payload = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(payload, dict) or payload.get("type") != "FeatureCollection":
        raise ValueError(f"Expected GeoJSON FeatureCollection in {path}")
    features = payload.get("features")
    if not isinstance(features, list) or not features:
        raise ValueError(f"FeatureCollection has no features: {path}")
    return payload


def summarise_licences(
    geojson_path: Path,
    *,
    as_of: date,
) -> tuple[list[Observation], list[dict[str, str]], dict[str, Any]]:
    """Build observations + named-licence rows + spatial meta from pinned GeoJSON."""
    collection = load_feature_collection(geojson_path)
    features = collection["features"]
    source_version = f"{SOURCE_VERSION_PREFIX}_{as_of.isoformat()}"
    period = as_of.isoformat()

    region_counts: Counter[str] = Counter()
    region_area: Counter[str] = Counter()
    location_counts: Counter[str] = Counter()
    status_counts: Counter[str] = Counter()
    type_counts: Counter[str] = Counter()
    feature_rows: list[dict[str, str]] = []
    agreed_total = 0.0
    agreed_n = 0

    for feature in features:
        props = feature.get("properties") or {}
        if not isinstance(props, dict):
            raise ValueError("Feature properties must be an object")
        regions = str(props.get("REGIONS") or "").strip()
        primary = _primary_region(regions)
        location = str(props.get("LOCATION") or "UNKNOWN").strip() or "UNKNOWN"
        status = str(props.get("LICSTATUS") or "UNKNOWN").strip() or "UNKNOWN"
        lic_type = str(props.get("LICTYPE") or "UNKNOWN").strip() or "UNKNOWN"
        agreed = _float_or_none(props.get("AGREED_KM2"))
        calc = _float_or_none(props.get("CALC_KM2"))

        region_counts[primary] += 1
        location_counts[location] += 1
        status_counts[status] += 1
        type_counts[lic_type] += 1
        if agreed is not None:
            region_area[primary] += agreed
            agreed_total += agreed
            agreed_n += 1

        feature_rows.append(
            {
                "licref": str(props.get("LICREF") or "").strip(),
                "lic_prefix": str(props.get("LICPREFIX") or "").strip(),
                "lic_no": str(props.get("LICNO") or "").strip(),
                "lic_type": lic_type,
                "lic_status": status,
                "location": location,
                "regions": regions,
                "primary_region": primary,
                "blockref": str(props.get("BLOCKREF") or "").strip(),
                "fields": str(props.get("FIELDS") or "").strip(),
                "licorg": str(props.get("LICORG") or "").strip(),
                "agreed_km2": "" if agreed is None else f"{agreed:.6f}".rstrip("0").rstrip("."),
                "calc_km2": "" if calc is None else f"{calc:.6f}".rstrip("0").rstrip("."),
                "lic_start": str(props.get("LICSTARTDT") or "").strip(),
                "objectid": str(props.get("OBJECTID") or "").strip(),
            }
        )

    feature_rows.sort(key=lambda row: row["licref"].casefold())

    observations: list[Observation] = [
        Observation(
            indicator_id=INDICATOR_ID,
            period_start=period,
            period_end=period,
            geography_code=GEOGRAPHY_CODE,
            geography_label=GEOGRAPHY_LABEL,
            value=float(len(features)),
            unit=UNIT_COUNT,
            observation_status="final",
            source_version=source_version,
            notes=(
                "kind=total_features; crs=EPSG:4326; "
                "layer=UKCS_offshore_petroleum_licences_WGS84"
            ),
        ),
        Observation(
            indicator_id=INDICATOR_ID,
            period_start=period,
            period_end=period,
            geography_code=GEOGRAPHY_CODE,
            geography_label=GEOGRAPHY_LABEL,
            value=round(agreed_total, 3) if agreed_n else None,
            unit=UNIT_AREA,
            observation_status="final",
            source_version=source_version,
            notes=f"kind=total_agreed_km2; n_with_area={agreed_n}",
        ),
    ]
    for region, count in sorted(region_counts.items()):
        observations.append(
            Observation(
                indicator_id=INDICATOR_ID,
                period_start=period,
                period_end=period,
                geography_code=GEOGRAPHY_CODE,
                geography_label=GEOGRAPHY_LABEL,
                value=float(count),
                unit=UNIT_COUNT,
                observation_status="final",
                source_version=source_version,
                notes=f"kind=region_count; primary_region={region}",
            )
        )
    for region, area in sorted(region_area.items()):
        observations.append(
            Observation(
                indicator_id=INDICATOR_ID,
                period_start=period,
                period_end=period,
                geography_code=GEOGRAPHY_CODE,
                geography_label=GEOGRAPHY_LABEL,
                value=round(area, 3),
                unit=UNIT_AREA,
                observation_status="final",
                source_version=source_version,
                notes=f"kind=region_agreed_km2; primary_region={region}",
            )
        )
    for location, count in sorted(location_counts.items()):
        observations.append(
            Observation(
                indicator_id=INDICATOR_ID,
                period_start=period,
                period_end=period,
                geography_code=GEOGRAPHY_CODE,
                geography_label=GEOGRAPHY_LABEL,
                value=float(count),
                unit=UNIT_COUNT,
                observation_status="final",
                source_version=source_version,
                notes=f"kind=location_count; location={location}",
            )
        )
    for status, count in sorted(status_counts.items()):
        observations.append(
            Observation(
                indicator_id=INDICATOR_ID,
                period_start=period,
                period_end=period,
                geography_code=GEOGRAPHY_CODE,
                geography_label=GEOGRAPHY_LABEL,
                value=float(count),
                unit=UNIT_COUNT,
                observation_status="final",
                source_version=source_version,
                notes=f"kind=status_count; lic_status={status}",
            )
        )
    for lic_type, count in sorted(type_counts.items()):
        observations.append(
            Observation(
                indicator_id=INDICATOR_ID,
                period_start=period,
                period_end=period,
                geography_code=GEOGRAPHY_CODE,
                geography_label=GEOGRAPHY_LABEL,
                value=float(count),
                unit=UNIT_COUNT,
                observation_status="final",
                source_version=source_version,
                notes=f"kind=lic_type_count; lic_type={lic_type}",
            )
        )

    meta = {
        "feature_count": len(features),
        "crs": CRS,
        "attribution": NSTA_ATTRIBUTION,
        "agreed_km2_total": round(agreed_total, 3),
        "region_counts": dict(sorted(region_counts.items())),
        "location_counts": dict(sorted(location_counts.items())),
        "status_counts": dict(sorted(status_counts.items())),
        "lic_type_counts": dict(sorted(type_counts.items())),
        "hub_item_id": HUB_ITEM_ID,
        "feature_server_url": FEATURE_SERVER_URL,
        "coverage_note": (
            "Published WGS84 layer is Extant offshore Production licences; "
            "not expired history; not onshore Scotland/Wales/NI"
        ),
    }
    return observations, feature_rows, meta


def write_features_csv(path: Path, rows: Sequence[dict[str, str]]) -> Path:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=list(FEATURES_CSV_FIELDS))
        writer.writeheader()
        writer.writerows(rows)
    return path


class NstaUkcsLicencesConnector(Connector):
    """Download + curate NSTA UKCS offshore petroleum licences (WGS84)."""

    def __init__(self, data_root: Path | None = None) -> None:
        root = data_root or (ENERGY_DATA / INDICATOR_ID)
        super().__init__(root, timeout_s=180.0)

    @property
    def indicator_id(self) -> str:
        return INDICATOR_ID

    def build_manifest(self, evidence: Sequence[RawEvidence]) -> Manifest:
        return Manifest(
            indicator_id=self.indicator_id,
            title="NSTA UKCS offshore petroleum licences (WGS84)",
            sector="energy-industry",
            publisher="North Sea Transition Authority",
            source_url=SOURCE_LANDING_URL,
            series_id="UKCS offshore petroleum licences (WGS84) FeatureServer/0",
            geography=(
                "UK Continental Shelf offshore only — not onshore Scotland/Wales/NI; "
                "not a national petroleum atlas"
            ),
            frequency="ad_hoc",
            unit=f"{UNIT_COUNT}; {UNIT_AREA}",
            definition=(
                "Point-in-time NSTA UKCS offshore petroleum licence polygons "
                "(one polygon per licence). Curated summary = feature counts and "
                "AGREED_KM2 by primary REGIONS label. Full polygons pinned as "
                f"GeoJSON ({CRS}). {NSTA_ATTRIBUTION}"
            ),
            licence=LICENCE,
            agent_owner="energy",
            connector_module="energy.connectors.nsta_ukcs_licences",
            curated_path="curated/observations.csv",
            update_cadence="Re-fetch when NSTA republishes the Hub layer",
            raw_evidence=list(evidence),
            transformations=(
                "Download Hub GeoJSON (WGS84). Pin under raw/<date>/. Write "
                "curated/observations.csv (totals + primary_region counts/area + "
                "location/status/type counts), curated/features.csv (licence "
                "attributes, no geometry), and curated/licences.geojson "
                "(full FeatureCollection copy). primary_region = first REGIONS "
                "token before a comma."
            ),
            caveats=(
                "UKCS offshore licences only. Do not invent onshore Scotland/Wales/NI "
                "coverage. This WGS84 layer is Extant Production / OFFSHORE in the "
                "2026-11 pin — not expired licences, not licence blocks/sub-areas, "
                "and not England onshore petroleum licences (separate Hub layers). "
                "Multi-region licences are counted once under the first region label. "
                f"{NSTA_ATTRIBUTION} Do not reuse NSTA logos."
            ),
            related_indicator_ids=["nsta-ukcs-fields", "crude-oil-production"],
            open_questions=[
                "Should Gate 3 also pin licence blocks / licensed-unlicensed blocks "
                "as a second geography story?",
            ],
            notion_registry_url="",
        )

    def fetch_latest(self) -> RawEvidence:
        day = _snapshot_day()
        relative = _raw_relative(day)
        result = self.fetch_url(
            GEOJSON_DOWNLOAD_URL,
            relative,
            official_release_date=day.isoformat(),
        )
        load_feature_collection(result.path)
        return result.evidence

    def evidence_from_pinned_raw(self, relative_path: str | None = None) -> RawEvidence:
        if relative_path is None:
            raw_root = self.data_root / "raw"
            if not raw_root.is_dir():
                raise FileNotFoundError(f"No raw/ directory under {self.data_root}")
            pins = sorted(
                raw_root.glob("*/ukcs_offshore_petroleum_licences_wgs84.geojson")
            )
            if not pins:
                raise FileNotFoundError(
                    "No pinned licences GeoJSON; run with --fetch first"
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
        observations, feature_rows, meta = summarise_licences(
            geojson_path, as_of=as_of
        )

        curated_dir = self.data_root / "curated"
        curated_dir.mkdir(parents=True, exist_ok=True)
        write_features_csv(curated_dir / "features.csv", feature_rows)
        curated_geojson = curated_dir / "licences.geojson"
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

    connector = NstaUkcsLicencesConnector()
    if args.fetch:
        evidence = connector.fetch_latest()
    else:
        evidence = connector.evidence_from_pinned_raw(args.raw)

    observations = connector.transform([evidence])
    manifest_path, curated_path = connector.write_hand_off([evidence], observations)
    total = next(o for o in observations if "kind=total_features" in o.notes)
    area = next(o for o in observations if "kind=total_agreed_km2" in o.notes)
    print(f"indicator_id: {INDICATOR_ID}")
    print(f"raw: {evidence.path} sha256={evidence.checksum_sha256}")
    print(f"feature_count: {int(total.value or 0)} crs={CRS}")
    print(f"agreed_km2_total: {area.value}")
    print(f"observations: {len(observations)}")
    print(f"manifest: {manifest_path}")
    print(f"curated: {curated_path}")
    print(f"features_csv: {connector.data_root / 'curated' / 'features.csv'}")
    print(f"curated_geojson: {connector.data_root / 'curated' / 'licences.geojson'}")
    print(f"attribution: {NSTA_ATTRIBUTION}")


if __name__ == "__main__":
    main()
