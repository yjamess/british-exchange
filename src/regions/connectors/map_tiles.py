"""Build the shared map tiles: ONS boundaries + a slim OpenStreetMap basemap, as PMTiles.

Spatial layers, not Observation datasets. Outputs (``data/regions/map-tiles/curated/``):

- ``boundaries.pmtiles`` — layers ``lad`` (local authorities, Dec 2025, full resolution BFC),
  ``rgn`` (English regions, Dec 2025 BFC) and ``ctry`` (UK countries, Dec 2025 BGC 20 m).
  Every feature carries ``code`` and ``name`` only. Values are joined in the browser.
- ``gb-basemap.pmtiles`` — Protomaps daily build (OpenStreetMap) clipped to GB + North Sea,
  zoom 0–10, keeping only the layers the ink style draws (earth, water, roads, boundaries, places).
- ``places.json`` — per code: name, level, lon/lat bounds and the ONS internal point (label anchor).
- ``source.json`` — publishers, URLs, retrieval times, checksums, licences, attribution.

Raw ONS GeoJSON (~400 MB) is evidence by checksum only; it is not archived (Storage objects cap at 50 MB).

Needs ``tippecanoe``, ``tile-join`` and ``pmtiles`` on PATH (``brew install tippecanoe pmtiles``).

    uv run python -m regions.connectors.map_tiles --work /tmp/bx-map-tiles
    uv run python -m britain_exchange.archive_data push data/regions/map-tiles/curated
"""
from __future__ import annotations

import argparse
import hashlib
import json
import shutil
import subprocess
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlencode
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[3]
OUT = ROOT / "data/regions/map-tiles/curated"
ARCGIS = "https://services1.arcgis.com/ESMARspQHYMw9BZ9/arcgis/rest/services"
LICENCE_URL = "https://www.ons.gov.uk/methodology/geography/licences/"
ONS_ATTRIBUTION = (
    "Source: Office for National Statistics licensed under the Open Government Licence v.3.0. "
    "Contains OS data © Crown copyright and database right 2025."
)

LAYERS = {
    # layer: (service, code field, name field, page size)
    "lad": ("Local_Authority_Districts_DEC_2025_Boundaries_UK_BFC", "LAD25CD", "LAD25NM", 40),
    "rgn": ("Regions_December_2025_Boundaries_EN_BFC", "RGN25CD", "RGN25NM", 20),
    "ctry": ("Countries_December_2025_Boundaries_UK_BGC", "CTRY25CD", "CTRY25NM", 10),
}
LEVEL = {"lad": "local", "rgn": "region", "ctry": "nation"}

PROTOMAPS_BUILDS = "https://build-metadata.protomaps.dev/builds.json"
BASEMAP_BBOX = "-11,49.4,4.5,61.6"  # GB, NI, Irish Sea and the UK Continental Shelf to 4.5°E
BASEMAP_MAXZOOM = 10
BASEMAP_LAYERS = ["earth", "water", "roads", "boundaries", "places"]


def sha(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def now() -> str:
    return datetime.now(timezone.utc).isoformat()


def fetch_json(url: str) -> dict:
    with urlopen(Request(url, headers={"User-Agent": "british-exchange-map-tiles/1.0"}), timeout=900) as r:
        return json.loads(r.read())


def download_layer(layer: str, work: Path) -> tuple[Path, list[dict]]:
    """Page through the FeatureServer; reuse an existing complete file in ``work``."""
    service, code_f, name_f, page = LAYERS[layer]
    base = f"{ARCGIS}/{service}/FeatureServer/0/query"
    dest = work / f"{layer}.geojson"
    evidence: list[dict] = []
    count = fetch_json(base + "?" + urlencode({"where": "1=1", "returnCountOnly": "true", "f": "json"}))["count"]
    if dest.is_file():
        features = json.loads(dest.read_text())["features"]
        if len(features) == count:
            evidence.append({"query": f"{base} (paged, {page} per request)", "reused": str(dest), "retrieved_at": datetime.fromtimestamp(dest.stat().st_mtime, timezone.utc).isoformat()})
            return dest, evidence
    features = []
    for offset in range(0, count, page):
        url = base + "?" + urlencode({
            "where": "1=1", "outFields": f"{code_f},{name_f}", "outSR": 4326, "f": "geojson",
            "orderByFields": "FID", "resultOffset": offset, "resultRecordCount": page,
        })
        features += fetch_json(url)["features"]
        evidence.append({"query": url, "retrieved_at": now()})
    if len(features) != count:
        raise RuntimeError(f"{layer}: got {len(features)} features, service reports {count}")
    dest.write_text(json.dumps({"type": "FeatureCollection", "features": features}))
    return dest, evidence


def internal_points(layer: str) -> dict[str, tuple[float, float]]:
    """ONS publishes an internal point (LONG/LAT) per area — always inside the polygon."""
    service, code_f, _, _ = LAYERS[layer]
    url = f"{ARCGIS}/{service}/FeatureServer/0/query?" + urlencode({
        "where": "1=1", "outFields": f"{code_f},LONG,LAT", "returnGeometry": "false", "f": "json", "resultRecordCount": 2000,
    })
    return {f["attributes"][code_f]: (f["attributes"]["LONG"], f["attributes"]["LAT"]) for f in fetch_json(url)["features"]}


def _walk(coords, acc: list[float]) -> None:
    if isinstance(coords[0], (int, float)):
        x, y = coords[0], coords[1]
        acc[0], acc[1], acc[2], acc[3] = min(acc[0], x), min(acc[1], y), max(acc[2], x), max(acc[3], y)
        return
    for c in coords:
        _walk(c, acc)


def normalise(layer: str, src: Path, work: Path, places: dict) -> Path:
    _, code_f, name_f, _ = LAYERS[layer]
    points = internal_points(layer)
    data = json.loads(src.read_text())
    out_features = []
    for f in data["features"]:
        code, name = f["properties"][code_f], f["properties"][name_f]
        acc = [180.0, 90.0, -180.0, -90.0]
        _walk(f["geometry"]["coordinates"], acc)
        lon, lat = points.get(code, ((acc[0] + acc[2]) / 2, (acc[1] + acc[3]) / 2))
        places[code] = {"name": name, "level": LEVEL[layer], "bounds": [round(v, 5) for v in acc], "label": [round(lon, 5), round(lat, 5)]}
        out_features.append({"type": "Feature", "properties": {"code": code, "name": name}, "geometry": f["geometry"]})
    dest = work / f"{layer}-norm.geojson"
    dest.write_text(json.dumps({"type": "FeatureCollection", "features": out_features}))
    return dest


def run(cmd: list[str]) -> None:
    print("$", " ".join(cmd))
    subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL)


def build_boundaries(norm: dict[str, Path], out: Path) -> None:
    cmd = ["tippecanoe", "-f", "-o", str(out), "-Z3", "-z12", "--detect-shared-borders",
           "--coalesce-densest-as-needed", "--no-tile-size-limit", "--quiet"]
    for layer, path in norm.items():
        cmd += ["-L", f"{layer}:{path}"]
    run(cmd)


def build_basemap(work: Path, out: Path) -> dict:
    build = fetch_json(PROTOMAPS_BUILDS)[-1]
    url = f"https://build.protomaps.com/{build['key']}"
    full = work / "basemap-extract.pmtiles"
    if not full.is_file():
        run(["pmtiles", "extract", url, str(full), f"--bbox={BASEMAP_BBOX}", f"--maxzoom={BASEMAP_MAXZOOM}", "--download-threads=8"])
    cmd = ["tile-join", "-f", "-pk", "-o", str(out)]
    for layer in BASEMAP_LAYERS:
        cmd += ["-l", layer]
    run(cmd + [str(full)])
    return {"build": build["key"], "url": url, "protomaps_version": build.get("version"), "extract_sha256": sha(full)}


def main(argv: list[str] | None = None) -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--work", type=Path, required=True, help="Scratch dir for raw downloads (reused if complete)")
    args = parser.parse_args(argv)
    for tool in ("tippecanoe", "tile-join", "pmtiles"):
        if not shutil.which(tool):
            raise SystemExit(f"{tool} not found — brew install tippecanoe pmtiles")
    args.work.mkdir(parents=True, exist_ok=True)
    OUT.mkdir(parents=True, exist_ok=True)

    places: dict[str, dict] = {}
    norm: dict[str, Path] = {}
    ons: list[dict] = []
    for layer, (service, *_rest) in LAYERS.items():
        raw, evidence = download_layer(layer, args.work)
        norm[layer] = normalise(layer, raw, args.work, places)
        ons.append({"layer": layer, "service": f"{ARCGIS}/{service}/FeatureServer/0", "features": sum(1 for p in places.values() if p["level"] == LEVEL[layer]), "raw_sha256": sha(raw), "evidence": evidence})

    boundaries = OUT / "boundaries.pmtiles"
    build_boundaries(norm, boundaries)
    basemap = OUT / "gb-basemap.pmtiles"
    protomaps = build_basemap(args.work, basemap)
    (OUT / "places.json").write_text(json.dumps(places, separators=(",", ":"), sort_keys=True))

    source = {
        "built_at": now(),
        "builder": "regions.connectors.map_tiles",
        "outputs": {p.name: {"sha256": sha(p), "bytes": p.stat().st_size} for p in (boundaries, basemap, OUT / "places.json")},
        "boundaries": {
            "publisher": "Office for National Statistics",
            "release": "December 2025 boundaries",
            "products": {"lad": "BFC (full resolution, clipped)", "rgn": "BFC (full resolution, clipped)", "ctry": "BGC (generalised 20 m, clipped)"},
            "licence": "Open Government Licence v3.0",
            "licence_url": LICENCE_URL,
            "attribution": ONS_ATTRIBUTION,
            "layers": ons,
        },
        "basemap": {
            "publisher": "OpenStreetMap contributors via Protomaps daily build",
            "licence": "Open Database License (ODbL) 1.0",
            "licence_url": "https://www.openstreetmap.org/copyright",
            "attribution": "© OpenStreetMap contributors",
            "bbox": BASEMAP_BBOX,
            "maxzoom": BASEMAP_MAXZOOM,
            "layers": BASEMAP_LAYERS,
            **protomaps,
        },
        "caveats": [
            "Fixed December 2025 boundaries for every observation date — not historical boundaries.",
            "Basemap is overview cartography to zoom 10 (MapLibre overzooms beyond); not for property-level location.",
        ],
    }
    (OUT / "source.json").write_text(json.dumps(source, indent=2))
    print(json.dumps(source["outputs"], indent=2))


if __name__ == "__main__":
    main()
