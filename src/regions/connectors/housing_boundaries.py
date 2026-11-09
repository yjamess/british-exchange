"""Pin ONS December 2025 UK local-authority boundary geometry for the atlas.

This is a spatial layer, not an Observation dataset. Run with --download once;
subsequent runs transform the pinned response without network access.
"""
from __future__ import annotations

import argparse
import csv
import hashlib
import json
import math
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlencode
from urllib.request import urlopen

ROOT = Path(__file__).resolve().parents[3]
DATA = ROOT / "data/regions/housing-boundaries"
RAW = DATA / "raw/2026-11-04"
SERVICE = "https://services1.arcgis.com/ESMARspQHYMw9BZ9/arcgis/rest/services/Local_Authority_Districts_DEC_2025_Boundaries_UK_BUC/FeatureServer/0"
LANDING = "https://www.data.gov.uk/dataset/d6c2a698-7cf8-4c12-aad5-4ee4fb47154c/local-authority-districts-december-2025-boundaries-uk-buc"
ITEM = "https://www.arcgis.com/sharing/rest/content/items/837dd9c41a7b458c974caf6e4ca56e7b?f=pjson"
QUERY = SERVICE + "/query?" + urlencode({"where": "1=1", "outFields": "LAD25CD,LAD25NM", "outSR": 4326, "returnGeometry": "true", "f": "geojson", "orderByFields": "LAD25CD", "resultRecordCount": 2000})
LICENCE_URL = "https://www.ons.gov.uk/methodology/geography/licences/"


def sha(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def download() -> None:
    RAW.mkdir(parents=True, exist_ok=True)
    evidence = []
    for name, url in (("boundaries.geojson", QUERY), ("layer.json", SERVICE + "?f=pjson"), ("item.json", ITEM), ("count.json", SERVICE + "/query?" + urlencode({"where": "1=1", "returnCountOnly": "true", "f": "json"}))):
        path = RAW / name
        if path.exists():
            raise FileExistsError(f"Refusing to overwrite pinned evidence: {path}")
        with urlopen(url, timeout=120) as response:
            body = response.read()
        obj = json.loads(body)
        if "error" in obj:
            raise ValueError(obj["error"])
        path.write_bytes(body)
        evidence.append({"path": str(path.relative_to(DATA)), "source_url": url, "retrieved_at": datetime.now(timezone.utc).isoformat(), "checksum_sha256": sha(path)})
    (RAW / "retrieval.json").write_text(json.dumps(evidence, indent=2) + "\n")


def coordinates(value: list) -> list:
    if value and isinstance(value[0], (float, int)):
        if len(value) != 2 or not all(math.isfinite(x) for x in value):
            raise ValueError("Invalid coordinate")
        if not (-9 < value[0] < 3 and 49 < value[1] < 62):
            raise ValueError(f"Coordinate outside expected UK extent: {value}")
        # Around one metre; the source has already been generalised to 500m by ONS.
        return [round(x, 5) for x in value]
    return [coordinates(x) for x in value]


def transform() -> dict:
    raw_path = RAW / "boundaries.geojson"
    raw = json.loads(raw_path.read_text())
    expected = json.loads((RAW / "count.json").read_text())["count"]
    if raw.get("exceededTransferLimit") or len(raw["features"]) != expected:
        raise ValueError("Incomplete boundary response")
    features = []
    for feature in raw["features"]:
        attrs = feature["properties"]
        geometry = feature["geometry"]
        if geometry["type"] not in {"Polygon", "MultiPolygon"}:
            raise ValueError("Expected polygon boundary")
        features.append({"type": "Feature", "properties": {"code": attrs["LAD25CD"], "name": attrs["LAD25NM"], "level": "local"}, "geometry": {"type": geometry["type"], "coordinates": coordinates(geometry["coordinates"])}})
    features.sort(key=lambda x: x["properties"]["code"])
    if len({f["properties"]["code"] for f in features}) != expected:
        raise ValueError("Duplicate boundary codes")
    for f in features:
        polys = [f["geometry"]["coordinates"]] if f["geometry"]["type"] == "Polygon" else f["geometry"]["coordinates"]
        for poly in polys:
            for ring in poly:
                if len(ring) < 4 or ring[0] != ring[-1]:
                    raise ValueError(f"Unclosed or short ring: {f['properties']['code']}")
    curated = DATA / "curated"
    curated.mkdir(parents=True, exist_ok=True)
    out = curated / "boundaries.geojson"
    out.write_text(json.dumps({"type": "FeatureCollection", "features": features}, separators=(",", ":")) + "\n")
    hpi_path = ROOT / "data/housing/uk-average-house-price/raw/2026-11-03/UK-HPI-full-file-2026-08.csv"
    with hpi_path.open(newline="") as handle:
        hpi = {r["AreaCode"]: r["RegionName"] for r in csv.DictReader(handle)}
    boundary_codes = {f["properties"]["code"]: f["properties"]["name"] for f in features}
    matched = sorted(set(boundary_codes) & set(hpi))
    missing = {k: v for k, v in boundary_codes.items() if k not in hpi}
    unmatched = {k: v for k, v in sorted(hpi.items()) if k not in boundary_codes}
    local_hpi = {k: v for k, v in hpi.items() if k.startswith(("E06", "E07", "E08", "E09", "W06", "S12", "N09"))}
    join = {"boundary_count": expected, "hpi_geography_count": len(hpi), "exact_matches": len(matched), "boundary_codes_without_hpi": missing, "hpi_codes_without_boundaries": unmatched, "hpi_local_codes_without_boundaries": {k: v for k, v in local_hpi.items() if k not in boundary_codes}}
    (curated / "join-report.json").write_text(json.dumps(join, indent=2) + "\n")
    evidence = json.loads((RAW / "retrieval.json").read_text())
    for entry in evidence:
        if sha(DATA / entry["path"]) != entry["checksum_sha256"]:
            raise ValueError("Pinned evidence checksum mismatch")
    source = {"publisher": "Office for National Statistics", "url": LANDING, "release": "December 2025 boundaries; source updated 29 April 2026", "licence": "Open Government Licence v3.0", "retrievedAt": evidence[0]["retrieved_at"], "checksum": evidence[0]["checksum_sha256"], "attribution": "Source: Office for National Statistics licensed under the Open Government Licence v.3.0. Contains OS data © Crown copyright and database right 2025.", "caveats": ["Fixed December 2025 local-authority boundaries are used for every observation date; this is not a historical-boundary map.", "ONS ultra-generalised (500m), coastline-clipped geometry. Suitable for an overview, not property-location or boundary determination.", "Five-decimal WGS84 coordinates preserve the published polygon structure; no further shape simplification, dissolves or inferred geographic joins.", f"{len(matched)} of {expected} boundary codes match the archived HPI file exactly. Unmatched places must show no data, never a national value."]}
    (curated / "source.json").write_text(json.dumps(source, indent=2, ensure_ascii=False) + "\n")
    write_display_geometry(features, source)
    manifest = {"layer_id": "housing-boundaries", "status": "Validation", "publisher": source["publisher"], "source_url": LANDING, "source_service": SERVICE, "version": "LAD_DEC_2025_UK_BUC", "geography": "United Kingdom local authority districts", "boundary_date": "2025-12-31", "source_updated": "2026-04-29", "coordinate_reference_system": "EPSG:4326 (longitude, latitude)", "licence": source["licence"], "licence_url": LICENCE_URL, "attribution": source["attribution"], "connector_module": "regions.connectors.housing_boundaries", "curated_path": "curated/boundaries.geojson", "curated_checksum_sha256": sha(out), "raw_evidence": evidence, "transformations": "Select LAD25CD/LAD25NM, rename to code/name, add level=local, round coordinates to five decimals, sort by code. Preserve every polygon and ring. Also write curated/boundaries-display.json (pre-projected SVG paths for the Housing map).", "validation": join, "caveats": source["caveats"]}
    # JSON is valid YAML and keeps this spatial layer outside CSV catalogue discovery.
    (DATA / "boundary-manifest.yaml").write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + "\n")
    return {"features": expected, "matched": len(matched), "bytes": out.stat().st_size, "missing": missing}


def write_display_geometry(features: list[dict], source: dict) -> Path:
    """Pre-project LA polygons to SVG path strings so the web map skips GeoJSON parse + project."""

    def project(lon: float, lat: float) -> tuple[float, float]:
        return lon * math.cos(55 * math.pi / 180), -lat

    def polygons(f: dict) -> list:
        g = f["geometry"]
        return [g["coordinates"]] if g["type"] == "Polygon" else g["coordinates"]

    min_x = min_y = float("inf")
    max_x = max_y = float("-inf")
    for f in features:
        for poly in polygons(f):
            for ring in poly:
                for lon, lat in ring:
                    x, y = project(lon, lat)
                    min_x, max_x = min(min_x, x), max(max_x, x)
                    min_y, max_y = min(min_y, y), max(max_y, y)
    scale = min(700 / (max_x - min_x), 840 / (max_y - min_y))

    def px(lon: float, lat: float) -> tuple[float, float]:
        x, y = project(lon, lat)
        return 30 + (700 - (max_x - min_x) * scale) / 2 + (x - min_x) * scale, 20 + (y - min_y) * scale

    shapes = []
    for f in features:
        left = top = float("inf")
        right = bottom = float("-inf")
        parts: list[str] = []
        for poly in polygons(f):
            for ring in poly:
                cmds: list[str] = []
                for i, (lon, lat) in enumerate(ring):
                    x, y = px(lon, lat)
                    left, right = min(left, x), max(right, x)
                    top, bottom = min(top, y), max(bottom, y)
                    cmds.append(f"{'M' if i == 0 else 'L'}{x:.2f},{y:.2f}")
                parts.append("".join(cmds) + "Z")
        shapes.append({
            "code": f["properties"]["code"],
            "name": f["properties"]["name"],
            "path": "".join(parts),
            "bounds": [round(left, 2), round(top, 2), round(right, 2), round(bottom, 2)],
        })
    path = DATA / "curated/boundaries-display.json"
    path.write_text(json.dumps({"shapes": shapes, "source": source}, separators=(",", ":")) + "\n")
    return path


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--download", action="store_true", help="Retrieve official source evidence once (network access required)")
    args = parser.parse_args()
    if args.download:
        download()
    print(json.dumps(transform(), indent=2))


if __name__ == "__main__":
    main()
