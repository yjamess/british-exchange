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
from shapely.geometry import MultiPolygon, Polygon, mapping, shape
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
    # England_Green_Belt_2022 (MHCLG ArcGIS) is the same 31 March 2022 boundary as 2021-22:
    # identical 185 features and geometry at the 2026-11-10 build. Not shipped twice.
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
# The stage draws England ~720px wide (~110px per degree of longitude), so ~0.006°
# (about half a kilometre) stays under a screen pixel. The 2026-11-10 first build used
# 0.05° / 0.08° (5–8 km), which shattered the outline into triangles.
SIMPLIFY_PRE_DEG = 0.002
SIMPLIFY_POST_DEG = 0.006
# Parts and holes smaller than this (square degrees, ~2–3 km²) are below a pixel on screen.
MIN_PART_DEG2 = 0.0004
COORD_DP = 3

# England outline — the frame every landmark year is drawn in, so years compare at one scale.
ENGLAND_URL = (
    "https://services1.arcgis.com/ESMARspQHYMw9BZ9/arcgis/rest/services/"
    "Countries_December_2024_Boundaries_UK_BUC/FeatureServer/0/query"
)
ENGLAND_SIMPLIFY_DEG = 0.01
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
    return _drop_specks(simplified)


def _drop_specks(geom: Any, min_area: float = MIN_PART_DEG2) -> Any:
    """Remove parts and holes below a screen pixel. Screen plate only — never for hectares."""
    parts = [geom] if geom.geom_type == "Polygon" else [g for g in getattr(geom, "geoms", []) if g.geom_type == "Polygon"]
    kept = []
    for part in parts:
        if part.area < min_area:
            continue
        holes = [ring for ring in part.interiors if Polygon(ring).area >= min_area]
        kept.append(Polygon(part.exterior, holes))
    if not kept:
        return geom
    return kept[0] if len(kept) == 1 else MultiPolygon(kept)


def _coarsen(node: Any) -> Any:
    if isinstance(node, list) and node and isinstance(node[0], (int, float)):
        return [round(float(node[0]), COORD_DP), round(float(node[1]), COORD_DP)]
    if isinstance(node, list):
        return [_coarsen(part) for part in node]
    return node


def build_england(client: httpx.Client) -> dict[str, Any]:
    """England outline (ONS Countries Dec 2024, generalised clipped) for the plate frame."""
    response = client.get(
        ENGLAND_URL,
        params={"where": "CTRY24CD='E92000001'", "outFields": "CTRY24CD", "f": "geojson", "outSR": "4326"},
    )
    response.raise_for_status()
    features = response.json().get("features") or []
    if not features:
        raise ValueError("England outline missing from ONS Countries service")
    geom = make_valid(shape(features[0]["geometry"]))
    geom = _drop_specks(geom.simplify(ENGLAND_SIMPLIFY_DEG, preserve_topology=True), 0.002)
    encoded = _coords(geom)
    if encoded is None:
        raise ValueError("Could not encode England outline")
    return {
        "outline": {"type": encoded["type"], "c": _coarsen(encoded["c"])},
        "bbox": [round(v, 3) for v in geom.bounds],
        "source": "ONS · Countries (December 2024) Boundaries UK BUC · OGL v3.0",
        "url": ENGLAND_URL.rsplit("/query", 1)[0],
    }


def build_year(
    year: str, *, client: httpx.Client | None = None, england: dict[str, Any] | None = None
) -> dict[str, Any]:
    meta = LANDMARK_LAYERS[year]
    own = client is None
    http = client or _client()
    try:
        features = _fetch_features(http, meta["url"])
        england_gb = _dissolve_england(features)
        encoded = _coords(england_gb)
        if encoded is None:
            raise ValueError(f"Could not encode England Green Belt for {year}")
        encoded = {"type": encoded["type"], "c": _coarsen(encoded["c"])}
        plate = {
            "year": year,
            "label": meta["label"],
            "geography": "E92000001",
            "geographyLabel": "England",
            "boundary": encoded,
            "bbox": [round(v, 3) for v in england_gb.bounds],
            "frame": england["bbox"] if england else None,
            "england": england["outline"] if england else None,
            "englandSource": england["source"] if england else None,
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
        england = build_england(client)
        for year in selected:
            print(f"build {year} …")
            try:
                plate = build_year(year, client=client, england=england)
            except Exception as err:  # noqa: BLE001 — a dead mirror skips one year, never invents it
                print(f"  skip {year}: {err}")
                continue
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
