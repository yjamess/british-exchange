"""Land Explorer live plates from accredited UK publisher APIs (not Planning Data).

When planning.data.gov.uk is down, any English council can still be drawn from:

- ONS Open Geography — local authority district boundary
- MHCLG / ArcGIS — England Green Belt polygons
- Natural England — SSSI, ancient woodland, AONB (National Landscapes), national parks
- Historic England NHLE — listed buildings, scheduled monuments, parks & gardens,
  World Heritage Sites, conservation areas
- Environment Agency — Flood Map for Planning zones 2 and 3 (FeatureServer)
- MHCLG Planning Data collection CSV dumps (Supabase Storage) — brownfield points,
  Article 4 direction areas, tree preservation zones (not the live entity API)

Usage (from repo root)::

    uv run python -c "from housing.connectors.publisher_layers import query_place_publishers as q; print(q('E08000035')['name'])"
"""

from __future__ import annotations

import json
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
from typing import Any

import httpx
from shapely import transform
from shapely.geometry import Point, mapping, shape

from housing.connectors.planning_layers import (
    LAYERS,
    LIVE_DIR,
    LIVE_LIMIT,
    ROUND,
    SIMPLIFY_DEG,
    USER_AGENT,
    _brownfield_capacity,
    _coords,
    _equal_area,
    _union,
    authorities,
    land_use_rows,
)

ONS_LAD = (
    "https://services1.arcgis.com/ESMARspQHYMw9BZ9/arcgis/rest/services/"
    "Local_Authority_Districts_December_2024_Boundaries_UK_BFC/FeatureServer/0/query"
)
GEOMETRY_PROJECT = "https://utility.arcgisonline.com/ArcGIS/rest/services/Geometry/GeometryServer/project"

# dataset -> (url, kind, bng_query, prop_map)
# prop_map: publisher field -> Planning Data-style record key used by the UI.
PUBLISHER_LAYERS: dict[str, tuple[str, str, bool, dict[str, str]]] = {
    "green-belt": (
        "https://services.arcgis.com/XSeYKQzfXnEgju9o/arcgis/rest/services/England_Green_Belt_2022/FeatureServer/0/query",
        "area",
        False,
        {"GB_Name": "name", "LAD21CD": "reference", "Area_ha": "hectares"},
    ),
    "site-of-special-scientific-interest": (
        "https://services.arcgis.com/JJzESW51TqeY9uat/arcgis/rest/services/SSSI_England/FeatureServer/0/query",
        "area",
        False,
        {"NAME": "name", "REF_CODE": "reference", "HYPERLINK": "documentation-url"},
    ),
    "ancient-woodland": (
        "https://services.arcgis.com/JJzESW51TqeY9uat/arcgis/rest/services/Ancient_Woodland_England/FeatureServer/0/query",
        "area",
        False,
        {"NAME": "name", "STATUS": "ancient-woodland-status", "THEME": "reference"},
    ),
    "area-of-outstanding-natural-beauty": (
        "https://services.arcgis.com/JJzESW51TqeY9uat/arcgis/rest/services/Areas_of_Outstanding_Natural_Beauty_England/FeatureServer/0/query",
        "area",
        True,
        {"NAME": "name", "CODE": "reference", "HOTLINK": "documentation-url", "DESIG_DATE": "designation-date"},
    ),
    "national-park": (
        "https://services.arcgis.com/JJzESW51TqeY9uat/arcgis/rest/services/National_Parks_England/FeatureServer/0/query",
        "area",
        True,
        {"NAME": "name"},
    ),
    "listed-building": (
        "https://services-eu1.arcgis.com/ZOdPfBS3aqqDYPUQ/arcgis/rest/services/National_Heritage_List_for_England_NHLE_v02_VIEW/FeatureServer/0/query",
        "point",
        False,
        {
            "Name": "name",
            "ListEntry": "reference",
            "Grade": "listed-building-grade",
            "hyperlink": "documentation-url",
            "ListDate": "designation-date",
        },
    ),
    "scheduled-monument": (
        "https://services-eu1.arcgis.com/ZOdPfBS3aqqDYPUQ/arcgis/rest/services/National_Heritage_List_for_England_NHLE_v02_VIEW/FeatureServer/6/query",
        "area",
        False,
        {"Name": "name", "ListEntry": "reference", "hyperlink": "documentation-url", "SchedDate": "designation-date"},
    ),
    "park-and-garden": (
        "https://services-eu1.arcgis.com/ZOdPfBS3aqqDYPUQ/arcgis/rest/services/National_Heritage_List_for_England_NHLE_v02_VIEW/FeatureServer/7/query",
        "area",
        False,
        {
            "Name": "name",
            "ListEntry": "reference",
            "Grade": "park-and-garden-grade",
            "hyperlink": "documentation-url",
            "RegDate": "designation-date",
        },
    ),
    "world-heritage-site": (
        "https://services-eu1.arcgis.com/ZOdPfBS3aqqDYPUQ/arcgis/rest/services/National_Heritage_List_for_England_NHLE_v02_VIEW/FeatureServer/10/query",
        "area",
        False,
        {"Name": "name", "ListEntry": "reference", "hyperlink": "documentation-url"},
    ),
    "conservation-area": (
        "https://services-eu1.arcgis.com/ZOdPfBS3aqqDYPUQ/arcgis/rest/services/Conservation_Areas/FeatureServer/0/query",
        "area",
        False,
        {"NAME": "name", "UID": "reference", "DATE_OF_DE": "designation-date", "LPA": "organisation-entity"},
    ),
}

# Flood Map for Planning — Environment Agency FeatureServer (BNG native).
# Layer 1 = Flood Zone 3, layer 2 = Flood Zone 2. Combined into one UI layer.
EA_FLOOD_FS = (
    "https://environment.data.gov.uk/KB6uNVj5ZcJr7jUP/ArcGIS/rest/services/"
    "Flood_Map_for_Planning/FeatureServer"
)
EA_FLOOD_LAYERS: tuple[tuple[str, str], ...] = (
    ("3", f"{EA_FLOOD_FS}/1/query"),
    ("2", f"{EA_FLOOD_FS}/2/query"),
)

# CSV-dump layers (see brownfield_land.py / constraint_area_dumps.py), not ArcGIS.
CSV_DUMP_LAYERS = frozenset(
    {"brownfield-land", "article-4-direction-area", "tree-preservation-zone"}
)


def _client() -> httpx.Client:
    return httpx.Client(headers={"User-Agent": USER_AGENT}, follow_redirects=True, timeout=45.0)


def _project_envelope_to_bng(
    client: httpx.Client, minx: float, miny: float, maxx: float, maxy: float
) -> tuple[float, float, float, float]:
    """WGS84 envelope → British National Grid via ArcGIS GeometryServer (OGL public utility)."""
    payload = {
        "geometryType": "esriGeometryEnvelope",
        "geometries": [{"xmin": minx, "ymin": miny, "xmax": maxx, "ymax": maxy}],
    }
    response = client.get(
        GEOMETRY_PROJECT,
        params={"inSR": 4326, "outSR": 27700, "geometries": json.dumps(payload), "f": "json"},
        timeout=30.0,
    )
    response.raise_for_status()
    body = response.json()
    geom = (body.get("geometries") or [None])[0]
    if not geom:
        raise RuntimeError("Could not project district envelope to British National Grid")
    return float(geom["xmin"]), float(geom["ymin"]), float(geom["xmax"]), float(geom["ymax"])


def _fetch_district(client: httpx.Client, code: str) -> tuple[str, Any]:
    """ONS Dec 2024 LAD boundary in WGS84."""
    response = client.get(
        ONS_LAD,
        params={"where": f"LAD24CD='{code}'", "outFields": "LAD24CD,LAD24NM", "f": "geojson", "outSR": 4326},
        timeout=60.0,
    )
    response.raise_for_status()
    features = response.json().get("features") or []
    if not features:
        # Land-use table name as a last resort label; still need geometry.
        names = {row["code"]: row["name"] for row in authorities()}
        raise ValueError(f"ONS Open Geography has no Dec 2024 boundary for {code} ({names.get(code, code)})")
    props = features[0].get("properties") or {}
    name = str(props.get("LAD24NM") or code)
    boundary = shape(features[0]["geometry"]).buffer(0)
    if boundary.is_empty:
        raise ValueError(f"ONS boundary for {code} is empty")
    return name, boundary


def _esri_polygon_geometry(boundary: Any, *, in_sr: int = 4326) -> str:
    """District polygon as ArcGIS JSON. Simplified so the query string stays small."""
    simplified = boundary.simplify(0.0008, preserve_topology=True)
    mapped = mapping(simplified)
    if mapped["type"] == "Polygon":
        rings = list(mapped["coordinates"])
    elif mapped["type"] == "MultiPolygon":
        rings = [ring for poly in mapped["coordinates"] for ring in poly]
    else:
        raise ValueError(f"District geometry is {mapped['type']}, not a polygon")
    return json.dumps({"rings": rings, "spatialReference": {"wkid": in_sr}})


def _arcgis_page(
    client: httpx.Client,
    url: str,
    *,
    geometry: str,
    geometry_type: str,
    in_sr: int,
    offset: int,
    limit: int,
) -> list[dict[str, Any]]:
    # POST — district polygons make the GET query string too long (400).
    response = client.post(
        url,
        data={
            "geometry": geometry,
            "geometryType": geometry_type,
            "inSR": str(in_sr),
            "spatialRel": "esriSpatialRelIntersects",
            "outFields": "*",
            "returnGeometry": "true",
            "f": "geojson",
            "outSR": "4326",
            "resultOffset": str(offset),
            "resultRecordCount": str(limit),
        },
        timeout=60.0,
    )
    response.raise_for_status()
    body = response.json()
    if body.get("error"):
        raise RuntimeError(str(body["error"]))
    return body.get("features") or []


def _arcgis_features(
    client: httpx.Client,
    url: str,
    *,
    boundary: Any,
    bng_query: bool,
) -> list[dict[str, Any]]:
    """Prefer a district-polygon query so dense point layers are not wasted on the bbox corners."""
    if bng_query:
        minx, miny, maxx, maxy = boundary.bounds
        envelope = _project_envelope_to_bng(client, minx, miny, maxx, maxy)
        geometry = f"{envelope[0]},{envelope[1]},{envelope[2]},{envelope[3]}"
        geometry_type = "esriGeometryEnvelope"
        in_sr = 27700
    else:
        try:
            geometry = _esri_polygon_geometry(boundary, in_sr=4326)
            geometry_type = "esriGeometryPolygon"
            in_sr = 4326
        except Exception:
            minx, miny, maxx, maxy = boundary.bounds
            geometry = f"{minx},{miny},{maxx},{maxy}"
            geometry_type = "esriGeometryEnvelope"
            in_sr = 4326
    page_size = min(200, LIVE_LIMIT)
    out: list[dict[str, Any]] = []
    offset = 0
    while len(out) < LIVE_LIMIT:
        page = _arcgis_page(
            client,
            url,
            geometry=geometry,
            geometry_type=geometry_type,
            in_sr=in_sr,
            offset=offset,
            limit=page_size,
        )
        if not page:
            break
        out.extend(page)
        if len(page) < page_size:
            break
        offset += page_size
    return out[:LIVE_LIMIT]


def _as_point(geom: Any) -> Point | None:
    if geom is None or geom.is_empty:
        return None
    if geom.geom_type == "Point":
        return geom
    if geom.geom_type == "MultiPoint":
        return Point(geom.geoms[0].coords[0]) if geom.geoms else None
    return geom.representative_point()


def _encode_features(
    features: list[dict[str, Any]],
    *,
    boundary: Any,
    kind: str,
    prop_map: dict[str, str],
) -> tuple[list[dict[str, Any]], list]:
    feats_out: list[dict[str, Any]] = []
    geoms: list = []
    seen: set[str] = set()
    for feature in features:
        props = feature.get("properties") or {}
        key = str(props.get("OBJECTID") or props.get("FID") or props.get("ListEntry") or id(feature))
        if key in seen:
            continue
        seen.add(key)
        if not feature.get("geometry"):
            continue
        geom = shape(feature["geometry"])
        if not geom.is_valid:
            geom = geom.buffer(0)
        if kind == "point":
            point = _as_point(geom)
            if point is None or not boundary.intersects(point):
                continue
            geom = point
        else:
            geom = geom.intersection(boundary)
            if geom.is_empty:
                continue
            # Drop pure line leftovers from clip.
            if geom.geom_type in ("LineString", "MultiLineString", "Point", "MultiPoint"):
                continue
            geoms.append(geom)
            geom = geom.simplify(SIMPLIFY_DEG * 4, preserve_topology=True)
        encoded = _coords(geom)
        if encoded is None:
            continue
        record: dict[str, Any] = {}
        for src, dest in prop_map.items():
            value = props.get(src)
            if value is None or value == "":
                continue
            if dest == "hectares":
                try:
                    record[dest] = str(round(float(value), 2))
                except (TypeError, ValueError):
                    continue
            elif dest == "designation-date" and isinstance(value, (int, float)):
                # ArcGIS epoch ms → ISO date when present.
                try:
                    record[dest] = datetime.fromtimestamp(float(value) / 1000.0, tz=timezone.utc).date().isoformat()
                except (OverflowError, OSError, ValueError):
                    record[dest] = str(value)
            else:
                record[dest] = str(value)
        if "name" not in record and "reference" in record:
            record["name"] = record["reference"]
        record.setdefault("entity", key)
        feats_out.append({"p": record, "g": encoded})
    return feats_out, geoms


def _empty_layer(dataset: str, group: str, label: str, kind: str) -> dict[str, Any]:
    return {"label": label, "group": group, "kind": kind, "count": 0, "coverPct": None, "features": []}


def _fetch_flood_zones(client: httpx.Client, boundary: Any) -> tuple[list[dict[str, Any]], str | None]:
    """EA Flood Map for Planning zones 2+3, tagged with flood-risk-level for the UI."""
    raw: list[dict[str, Any]] = []
    errors: list[str] = []
    # Prefer zone 3 when truncating — higher planning weight.
    remaining = LIVE_LIMIT
    for level, url in EA_FLOOD_LAYERS:
        if remaining <= 0:
            break
        try:
            page = _arcgis_features(client, url, boundary=boundary, bng_query=True)
        except Exception as exc:  # noqa: BLE001
            errors.append(f"FZ{level}: {exc}")
            continue
        for feature in page[:remaining]:
            props = dict(feature.get("properties") or {})
            props["flood-risk-level"] = level
            props.setdefault("name", f"Flood zone {level}")
            feature = {**feature, "properties": props}
            raw.append(feature)
        remaining = LIVE_LIMIT - len(raw)
    err = "; ".join(errors) if errors else None
    return raw, err


def _csv_dump_features(
    dataset: str, boundary: Any
) -> tuple[list[dict[str, Any]], str | None, str]:
    """Brownfield / Article 4 / TPO from Storage-backed Planning Data dumps."""
    if dataset == "brownfield-land":
        from housing.connectors.brownfield_land import brownfield_features_for_boundary

        return (
            brownfield_features_for_boundary(boundary, limit=LIVE_LIMIT),
            None,
            "MHCLG brownfield-land collection CSV (Supabase Storage / pack)",
        )
    from housing.connectors.constraint_area_dumps import (
        article4_features_for_boundary,
        tpo_features_for_boundary,
    )

    if dataset == "article-4-direction-area":
        return (
            article4_features_for_boundary(boundary, limit=LIVE_LIMIT),
            None,
            "MHCLG article-4-direction-area CSV (Supabase Storage / pack)",
        )
    return (
        tpo_features_for_boundary(boundary, limit=LIVE_LIMIT),
        None,
        "MHCLG tree-preservation-zone CSV (Supabase Storage / pack)",
    )


def query_place_publishers(code: str) -> dict[str, Any]:
    """Build one Land Explorer plate from publisher FeatureServers + ONS boundary."""
    if not (len(code) == 9 and code[:3] in {"E06", "E07", "E08", "E09"}):
        raise ValueError(f"{code} is not an English local authority district code")

    # Existence is checked against the ONS Dec 2024 boundary in _fetch_district, so councils
    # created in 2023 (absent from Land Use Stock 2022) are accepted.

    land_use = land_use_rows()
    with _client() as client:
        name, boundary = _fetch_district(client, code)
        minx, miny, maxx, maxy = boundary.bounds

        def fetch_one(dataset: str) -> tuple[str, list[dict[str, Any]], str | None]:
            url, _kind, bng, _prop_map = PUBLISHER_LAYERS[dataset]
            try:
                raw = _arcgis_features(client, url, boundary=boundary, bng_query=bng)
                return dataset, raw, None
            except Exception as exc:  # noqa: BLE001 — one layer must not sink the plate
                return dataset, [], str(exc)

        datasets = list(PUBLISHER_LAYERS)
        with ThreadPoolExecutor(max_workers=6) as pool:
            fetched = list(pool.map(fetch_one, datasets))
        flood_raw, flood_err = _fetch_flood_zones(client, boundary)

    # Encode with a stable boundary (fetched rows may include failed empties).
    raw_by_dataset = {dataset: (raw, err) for dataset, raw, err in fetched}
    proj = _equal_area((miny + maxy) / 2)
    area_m2 = transform(boundary, proj).area
    layers: dict[str, Any] = {}
    unions: dict[str, Any] = {}
    coverage_layers: dict[str, Any] = {}

    for dataset, group, label, kind, _fields in LAYERS:
        if dataset in CSV_DUMP_LAYERS:
            try:
                feats, dump_err, source = _csv_dump_features(dataset, boundary)
            except Exception as exc:  # noqa: BLE001
                feats, dump_err, source = [], str(exc), dataset
            geoms = []
            if kind == "area":
                for feature in feats:
                    try:
                        geom = shape(
                            {
                                "type": feature["g"]["type"],
                                "coordinates": feature["g"]["c"],
                            }
                        )
                    except Exception:  # noqa: BLE001
                        continue
                    if not geom.is_empty:
                        geoms.append(geom)
                union = _union(geoms)
                unions[dataset] = union
                cover = (
                    round(100 * transform(union, proj).area / area_m2, 1)
                    if union is not None and not union.is_empty
                    else 0.0
                )
            else:
                cover = None
            returned = len(feats)
            status = (
                "failed"
                if dump_err and returned == 0
                else ("truncated" if returned >= LIVE_LIMIT else "complete")
            )
            layers[dataset] = {
                "label": label,
                "group": group,
                "kind": kind,
                "count": returned,
                "coverPct": cover,
                "features": feats,
            }
            coverage_layers[dataset] = {
                "status": status,
                "returned": returned,
                "count": returned,
                "error": dump_err,
                "source": source,
                "note": "Planning Data collection dump in bx-data-archive (not the live entity API).",
            }
            continue

        if dataset == "flood-risk-zone":
            prop_map = {
                "flood-risk-level": "flood-risk-level",
                "type": "name",
                "objectid": "reference",
                "layer": "flood-map-layer",
            }
            feats_out, geoms = _encode_features(
                flood_raw, boundary=boundary, kind="area", prop_map=prop_map
            )
            union = _union(geoms)
            unions[dataset] = union
            # Zone-3-only coverage for the headline fact (not FZ2∪FZ3).
            flood3_geoms = [
                shape({"type": feature["g"]["type"], "coordinates": feature["g"]["c"]})
                for feature in feats_out
                if str(feature["p"].get("flood-risk-level")) == "3"
            ]
            flood3_union = _union(flood3_geoms)
            unions["flood-risk-zone-3"] = flood3_union
            cover = (
                round(100 * transform(union, proj).area / area_m2, 1)
                if union is not None and not union.is_empty
                else 0.0
            )
            returned = len(feats_out)
            if flood_err and returned == 0:
                status = "failed"
            elif returned >= LIVE_LIMIT:
                status = "truncated"
            else:
                status = "complete"
            layers[dataset] = {
                "label": label,
                "group": group,
                "kind": "area",
                "count": returned,
                "coverPct": cover,
                "features": feats_out,
            }
            coverage_layers[dataset] = {
                "status": status,
                "returned": returned,
                "count": returned,
                "error": flood_err,
                "source": "Environment Agency Flood Map for Planning FeatureServer",
                "note": "Zones 2 and 3 (ignores defences). Queried live from environment.data.gov.uk.",
            }
            continue

        if dataset not in PUBLISHER_LAYERS:
            layers[dataset] = _empty_layer(dataset, group, label, kind)
            coverage_layers[dataset] = {"status": "complete", "returned": 0, "count": 0}
            continue
        url, kind, _bng, prop_map = PUBLISHER_LAYERS[dataset]
        raw, err = raw_by_dataset.get(dataset, ([], "missing"))
        feats_out, geoms = _encode_features(raw, boundary=boundary, kind=kind, prop_map=prop_map)
        cover = None
        if kind == "area":
            union = _union(geoms)
            unions[dataset] = union
            cover = (
                round(100 * transform(union, proj).area / area_m2, 1)
                if union is not None and not union.is_empty
                else 0.0
            )
        returned = len(feats_out)
        if err and returned == 0:
            status = "failed"
        elif returned >= LIVE_LIMIT:
            status = "truncated"
        else:
            status = "complete"
        layers[dataset] = {
            "label": label,
            "group": group,
            "kind": kind,
            "count": returned,
            "coverPct": cover,
            "features": feats_out,
        }
        coverage_layers[dataset] = {
            "status": status,
            "returned": returned,
            "count": returned,
            "error": err,
            "source": url.split("/FeatureServer")[0].rsplit("/", 1)[-1],
        }

    def points(dataset: str) -> list[Point]:
        return [Point(feature["g"]["c"]) for feature in layers[dataset]["features"] if feature["g"]["type"] == "Point"]

    def inside(pts: list[Point], dataset: str) -> int:
        union = unions.get(dataset)
        return 0 if union is None or union.is_empty else sum(1 for point in pts if union.contains(point))

    designation = [
        unions[dataset]
        for dataset in (
            "green-belt",
            "site-of-special-scientific-interest",
            "ancient-woodland",
            "area-of-outstanding-natural-beauty",
            "national-park",
        )
        if unions.get(dataset) is not None
    ]
    designation_union = _union(designation)
    brownfield_points = points("brownfield-land")
    listed_points = points("listed-building")
    flood3_union = unions.get("flood-risk-zone-3")
    flood3_pct = (
        round(100 * transform(flood3_union, proj).area / area_m2, 1)
        if flood3_union is not None and not flood3_union.is_empty
        else 0.0
    )

    place = {
        "code": code,
        "name": name,
        "why": "",
        "bbox": [round(value, ROUND) for value in (minx, miny, maxx, maxy)],
        "areaHa": round(area_m2 / 10_000),
        "boundary": _coords(boundary.simplify(SIMPLIFY_DEG * 4, preserve_topology=True)),
        "layers": layers,
        "facts": {
            "anyDesignationPct": round(100 * transform(designation_union, proj).area / area_m2, 1)
            if designation_union is not None
            else 0.0,
            "floodZone3Pct": flood3_pct,
            "brownfieldInConservation": inside(brownfield_points, "conservation-area"),
            "brownfieldInGreenBelt": inside(brownfield_points, "green-belt"),
            "brownfieldInFlood3": (
                0
                if flood3_union is None or flood3_union.is_empty
                else sum(1 for point in brownfield_points if flood3_union.contains(point))
            ),
            "brownfieldHectares": round(
                sum(float(feature["p"].get("hectares") or 0) for feature in layers["brownfield-land"]["features"]),
                1,
            ),
            **_brownfield_capacity(layers["brownfield-land"]["features"]),
            "listedInConservation": inside(listed_points, "conservation-area"),
        },
        "gaps": [],
        "landUse": land_use.get(code, []),
        "landUseEngland": land_use.get("E92000001", []),
        "coverage": {
            "mode": "publishers",
            "retrieved": datetime.now(timezone.utc).isoformat(),
            "limit": LIVE_LIMIT,
            "layers": coverage_layers,
            "publishers": [
                "ONS Open Geography (LAD Dec 2024)",
                "MHCLG England Green Belt 2022",
                "MHCLG brownfield-land / article-4 / tree-preservation collection CSV dumps",
                "Environment Agency Flood Map for Planning",
                "Natural England Open Data",
                "Historic England NHLE / Conservation Areas",
            ],
        },
    }

    try:
        LIVE_DIR.mkdir(parents=True, exist_ok=True)
        (LIVE_DIR / f"{code}.json").write_text(json.dumps(place, separators=(",", ":")))
    except OSError:
        pass
    return place
