"""England Green Belt — landmark-year national polygons for Historical Change.

MHCLG publishes annual WGS84 shapefiles on data.gov.uk. The GeoServer WFS that
hosts those zips is often unavailable (504), so this connector builds plates from
public ArcGIS FeatureServer mirrors of the same annual boundaries (plus the
MHCLG-hosted GreenBelt2011 / England_Green_Belt_2022 services).

Each plate is one dissolved, screen-simplified England MultiPolygon — not LA
fragments — so Historical Change can draw a year without megabyte shapefiles
on the laptop. Heavy curated JSON lives in Supabase Storage.
"""

from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import httpx
from shapely import make_valid
from shapely.geometry import mapping, shape
from shapely.ops import unary_union

from britain_exchange.paths import HOUSING_DATA
from housing.connectors.planning_layers import _coords, _union

DATA_ROOT = HOUSING_DATA / "green-belt-history"
RAW_DIR = DATA_ROOT / "raw" / "2026-11-10"
CURATED_DIR = DATA_ROOT / "curated"
USER_AGENT = "british-exchange-research"

# Landmark statistical years → ArcGIS FeatureServer layer query URL.
# Prefer MHCLG-hosted services when present; others are public mirrors of the
# same England Green Belt annual dataset while GeoServer SHAPE-ZIP is down.
LANDMARK_LAYERS: dict[str, dict[str, str]] = {
    "2010-11": {
        "url": "https://services.arcgis.com/XSeYKQzfXnEgju9o/arcgis/rest/services/GreenBelt2011/FeatureServer/0/query",
        "label": "31 March 2011 (GreenBelt2011)",
        "source": "MHCLG ArcGIS GreenBelt2011",
    },
    "2019-20": {
        "url": "https://services7.arcgis.com/VGCbpEKWinc6NIRs/arcgis/rest/services/England_Green_Belt_2019_20_WGS84/FeatureServer/0/query",
        "label": "2019 to 2020",
        "source": "ArcGIS mirror · England_Green_Belt_2019_20_WGS84",
    },
    "2020-21": {
        "url": "https://services3.arcgis.com/y0Mj0TLNFif07RwB/arcgis/rest/services/England_Green_Belt_2020_21_BNG/FeatureServer/0/query",
        "label": "2020 to 2021",
        "source": "ArcGIS mirror · England_Green_Belt_2020_21_BNG",
    },
    "2021-22": {
        "url": "https://services-eu1.arcgis.com/HjAvQN87vx7Tu17k/arcgis/rest/services/England_Green_Belt_2021_22/FeatureServer/0/query",
        "label": "2021 to 2022",
        "source": "ArcGIS mirror · England_Green_Belt_2021_22",
    },
    "2022": {
        "url": "https://services.arcgis.com/XSeYKQzfXnEgju9o/arcgis/rest/services/England_Green_Belt_2022/FeatureServer/0/query",
        "label": "2022 (England Green Belt 2022)",
        "source": "MHCLG ArcGIS England_Green_Belt_2022",
    },
    "2023-24": {
        "url": "https://services.arcgis.com/SHfL2d6KOPvYAtDV/arcgis/rest/services/England_Green_Belt_2023_24/FeatureServer/0/query",
        "label": "2023 to 2024",
        "source": "ArcGIS mirror · England_Green_Belt_2023_24",
    },
    "2024-25": {
        "url": "https://services5.arcgis.com/kV5KHzLidtriWGrI/arcgis/rest/services/England_Green_Belt_2024_25_WGS84/FeatureServer/0/query",
        "label": "2024 to 2025",
        "source": "ArcGIS mirror · England_Green_Belt_2024_25_WGS84",
    },
}

# National map: simplify each LA fragment first, then dissolve, then simplify again.
# ~5–8 km keeps the plate small enough for Historical Change (not for area measurement).
SIMPLIFY_PRE_DEG = 0.05
SIMPLIFY_POST_DEG = 0.08
PAGE = 200
DATASET_LANDING = (
    "https://www.data.gov.uk/dataset/ccb505e0-67a8-4ace-b294-19a3cbff4861/"
    "english-local-authority-green-belt-dataset10"
)


def _client() -> httpx.Client:
    return httpx.Client(headers={"User-Agent": USER_AGENT}, follow_redirects=True, timeout=120.0)


def _fetch_features(client: httpx.Client, query_url: str) -> list[dict[str, Any]]:
    out: list[dict[str, Any]] = []
    offset = 0
    while True:
        response = client.get(
            query_url,
            params={
                "where": "1=1",
                "outFields": "*",
                "returnGeometry": "true",
                "f": "geojson",
                "outSR": "4326",
                "resultOffset": str(offset),
                "resultRecordCount": str(PAGE),
            },
        )
        response.raise_for_status()
        body = response.json()
        if body.get("error"):
            raise RuntimeError(str(body["error"]))
        page = body.get("features") or []
        out.extend(page)
        if len(page) < PAGE:
            break
        offset += PAGE
        if offset > 50_000:
            break
    return out


def _dissolve_england(features: list[dict[str, Any]]) -> Any:
    geoms = []
    for feature in features:
        if not feature.get("geometry"):
            continue
        geom = shape(feature["geometry"])
        if not geom.is_valid:
            geom = make_valid(geom)
        if geom.is_empty:
            continue
        # Pre-simplify so union does not choke on dense LA rings.
        geom = geom.simplify(SIMPLIFY_PRE_DEG, preserve_topology=True)
        if not geom.is_valid:
            geom = make_valid(geom)
        if geom.is_empty:
            continue
        geoms.append(geom)
    if not geoms:
        raise ValueError("No Green Belt polygons in FeatureServer response")
    # Batch union in chunks — full unary_union of 1000+ rings can hang.
    chunk = 40
    partial: list[Any] = []
    for i in range(0, len(geoms), chunk):
        batch = geoms[i : i + chunk]
        try:
            part = _union(batch) or unary_union(batch)
        except Exception:  # noqa: BLE001
            part = unary_union([g.buffer(0) for g in batch])
        if part is not None and not part.is_empty:
            partial.append(part.simplify(SIMPLIFY_PRE_DEG, preserve_topology=True))
    merged = _union(partial) if len(partial) > 1 else (partial[0] if partial else None)
    if merged is None:
        merged = unary_union(partial)
    simplified = merged.simplify(SIMPLIFY_POST_DEG, preserve_topology=True)
    if not simplified.is_valid:
        simplified = make_valid(simplified)
    return simplified


def build_year(year: str, *, client: httpx.Client | None = None) -> dict[str, Any]:
    meta = LANDMARK_LAYERS[year]
    own = client is None
    http = client or _client()
    try:
        features = _fetch_features(http, meta["url"])
        england = _dissolve_england(features)
        encoded = _coords(england)
        if encoded is None:
            raise ValueError(f"Could not encode England Green Belt for {year}")
        # Slightly coarser rounding for the national plate.
        def coarsen(node: Any) -> Any:
            if isinstance(node, list) and node and isinstance(node[0], (int, float)):
                return [round(float(node[0]), 3), round(float(node[1]), 3)]
            if isinstance(node, list):
                return [coarsen(part) for part in node]
            return node

        encoded = {"type": encoded["type"], "c": coarsen(encoded["c"])}
        plate = {
            "year": year,
            "label": meta["label"],
            "geography": "E92000001",
            "geographyLabel": "England",
            "boundary": encoded,
            "bbox": [round(v, 3) for v in england.bounds],
            "featureCount": len(features),
            "source": {
                "publisher": "MHCLG",
                "dataset": "English local authority Green Belt dataset",
                "landing": DATASET_LANDING,
                "layer": meta["source"],
                "url": meta["url"].rsplit("/query", 1)[0],
                "licence": "OGL v3.0 · Contains OS data © Crown copyright",
                "retrieved": datetime.now(timezone.utc).isoformat(),
            },
            "notes": [
                "Designation snapshot for the statistical year — not a continuous boundary history.",
                "Green Belt is a planning designation, not a blanket build ban.",
                "Dissolved England outline, simplified for screen; not for area measurement.",
            ],
        }
        return plate
    finally:
        if own:
            http.close()


def write_year(year: str, plate: dict[str, Any]) -> Path:
    CURATED_DIR.mkdir(parents=True, exist_ok=True)
    path = CURATED_DIR / f"{year}.json"
    path.write_text(json.dumps(plate, separators=(",", ":")))
    return path


def write_index(years: list[str]) -> Path:
    CURATED_DIR.mkdir(parents=True, exist_ok=True)
    index = {
        "indicator_id": "green-belt-history",
        "title": "England Green Belt landmark-year boundaries",
        "publisher": "MHCLG",
        "landing": DATASET_LANDING,
        "years": [
            {
                "year": year,
                "label": LANDMARK_LAYERS[year]["label"],
                "pack_id": f"housing.green-belt-history-{year}",
                "path": f"housing/green-belt-history/curated/{year}.json",
            }
            for year in years
        ],
        "built": datetime.now(timezone.utc).isoformat(),
        "notes": [
            "Landmark years only — intermediate years without a shapefile are not invented.",
            "GeoServer SHAPE-ZIP on data.gov.uk was unavailable (504) at build; plates come from ArcGIS FeatureServer mirrors of the annual MHCLG boundaries.",
        ],
    }
    path = CURATED_DIR / "index.json"
    path.write_text(json.dumps(index, indent=2) + "\n")
    return path


def build_all(years: list[str] | None = None) -> list[str]:
    selected = years or list(LANDMARK_LAYERS)
    built: list[str] = []
    with _client() as client:
        for year in selected:
            print(f"build {year} …")
            plate = build_year(year, client=client)
            path = write_year(year, plate)
            print(f"  features={plate['featureCount']} → {path} ({path.stat().st_size // 1024} KiB)")
            built.append(year)
    write_index(built)
    return built


def main() -> None:
    built = build_all()
    print(f"done years={built}")


if __name__ == "__main__":
    main()
