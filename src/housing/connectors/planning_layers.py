"""Planning Data spatial layers for the Land Explorer (Housing Domain 06) — eight places.

A spatial layer product, not a Ready statistical indicator (like `regions/housing-boundaries`).
For each place (an English local authority district) it pins every Planning Data layer that
intersects the district, then clips, simplifies and measures them for the explorer:

- Designations: Green Belt, conservation areas, SSSI, ancient woodland, AONB, national park
- Heritage: listed buildings, scheduled monuments, registered parks and gardens, World Heritage Sites
- Development: brownfield register sites (local-plan allocations are not yet published in Planning Data)
- Constraints: flood risk zones, Article 4 direction areas, tree preservation zones

Land use for each place is read from the already-pinned MHCLG Land Use Stock 2022 file (P400a,
local authority rows) — the same source as the Ready `land-use-stock` indicator, which stays
England-only. No new download.

Usage (from repo root):
    uv run python src/housing/connectors/planning_layers.py --download   # fetch + pin raw
    uv run python src/housing/connectors/planning_layers.py              # rebuild from pinned raw
"""

from __future__ import annotations

import argparse
import gzip
import json
import math
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import httpx
from shapely import make_valid, transform, union_all
from shapely.errors import GEOSException
from shapely.geometry import Point, mapping, shape

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from britain_exchange.checksum import sha256_file  # noqa: E402
from britain_exchange.paths import HOUSING_DATA  # noqa: E402
from housing.ods_util import read_ods_sheet  # noqa: E402

ROOT = HOUSING_DATA / "planning-layers"
RAW_DATE = "2026-11-04"
RAW = ROOT / "raw" / RAW_DATE
CURATED = ROOT / "curated"
API = "https://www.planning.data.gov.uk"
USER_AGENT = "british-exchange-research"
LAND_USE_ODS = HOUSING_DATA / "land-use-stock" / "raw" / "2026-11-04" / "Live_Tables_Land_Use_Stock_2022.ods"

# Eight contrasting places (English local authority districts, Dec 2025 codes).
PLACES: list[tuple[str, str, str]] = [
    ("E08000003", "Manchester", "A dense city core"),
    ("E07000240", "St Albans", "A Green Belt edge of London"),
    ("E06000014", "York", "A historic city inside its own Green Belt"),
    ("E07000035", "Derbyshire Dales", "A national park council"),
    ("E07000223", "Adur", "A coastal strip below the South Downs"),
    ("E06000042", "Milton Keynes", "A planned new town"),
    ("E07000140", "South Holland", "Fenland farmland at sea level"),
    ("E06000021", "Stoke-on-Trent", "A post-industrial city"),
]

# dataset, group, label, kind ("area" polygons or "point"), fields kept for the record panel
LAYERS: list[tuple[str, str, str, str, tuple[str, ...]]] = [
    ("green-belt", "designations", "Green Belt", "area", ()),
    ("conservation-area", "designations", "Conservation areas", "area", ("designation-date", "document-url")),
    ("site-of-special-scientific-interest", "designations", "Sites of Special Scientific Interest", "area", ()),
    ("ancient-woodland", "designations", "Ancient woodland", "area", ("ancient-woodland-status",)),
    ("area-of-outstanding-natural-beauty", "designations", "Areas of Outstanding Natural Beauty", "area", ()),
    ("national-park", "designations", "National park", "area", ()),
    ("listed-building", "heritage", "Listed buildings", "point", ("listed-building-grade",)),
    ("scheduled-monument", "heritage", "Scheduled monuments", "area", ()),
    ("park-and-garden", "heritage", "Registered parks and gardens", "area", ("park-and-garden-grade",)),
    ("world-heritage-site", "heritage", "World Heritage Sites", "area", ()),
    ("brownfield-land", "development", "Brownfield register sites", "point",
     ("site-address", "hectares", "minimum-net-dwellings", "maximum-net-dwellings", "planning-permission-status", "ownership-status", "deliverable")),
    ("flood-risk-zone", "constraints", "Flood risk zones", "area", ("flood-risk-level",)),
    ("article-4-direction-area", "constraints", "Article 4 direction areas", "area", ()),
    ("tree-preservation-zone", "constraints", "Tree preservation zones", "area", ("tree-preservation-zone-type",)),
]

# Dense layers are fetched by tiles, not deep pages: the API slows with offset on spatial
# queries and times out past ~800 flood zones. Tiles split in four while they hold > 500.
TILED = {"flood-risk-zone"}
PAGE_SIZE: dict[str, int] = {}

BASE_FIELDS = ("entity", "name", "reference", "start-date", "entry-date", "organisation-entity", "documentation-url")
SIMPLIFY_DEG = 0.00004  # ≈ 3–4 m: display detail at council scale
ROUND = 5  # decimal places (≈ 1 m)


# ───────────────────────── fetch + pin ─────────────────────────
def _get(client: httpx.Client, url: str, params: dict[str, Any]) -> httpx.Response:
    """GET with backoff: heavy geometry pages (flood zones) can hit gateway timeouts."""
    waits = (5, 15, 30, 60, 90)
    for attempt in range(len(waits) + 1):
        try:
            r = client.get(url, params=params, timeout=240)
            r.raise_for_status()
            return r
        except (httpx.HTTPError, httpx.TimeoutException):
            if attempt == len(waits):
                raise
            time.sleep(waits[attempt])
    raise RuntimeError("unreachable")


def _fetch_split(client: httpx.Client, params: dict[str, Any], gaps: list[dict[str, Any]], code: str) -> tuple[bytes, list[str]]:
    """Fetch one page; if the API keeps timing out, split it in halves down to single records.
    A single record that still fails is logged as a named gap, never silently dropped."""
    page = params["offset"] // params["limit"]
    feats: list[Any] = []
    urls: list[str] = []

    def go(offset: int, limit: int, quick: bool) -> None:
        q = {**params, "offset": offset, "limit": limit}
        try:
            if quick:
                r = client.get(f"{API}/entity.geojson", params=q, timeout=120)
                r.raise_for_status()
            else:
                r = _get(client, f"{API}/entity.geojson", q)
            feats.extend(r.json().get("features", []))
            urls.append(str(r.url))
        except (httpx.HTTPError, httpx.TimeoutException):
            if limit == 1:
                gaps.append({"place": code, "dataset": params["dataset"], "page": page, "offset": offset, "reason": "API timeout on a single record"})
                print(f"  gap: {code} {params['dataset']} offset {offset}")
                return
            half = max(1, limit // 2)
            go(offset, half, True)
            go(offset + half, limit - half, True)

    try:
        r = client.get(f"{API}/entity.geojson", params=params, timeout=180)
        r.raise_for_status()
        return r.content, [str(r.url)]
    except (httpx.HTTPError, httpx.TimeoutException):
        print(f"  splitting {code} {params['dataset']} offset {params['offset']}")
        go(params["offset"], params["limit"], True)
        return json.dumps({"type": "FeatureCollection", "features": feats}).encode(), urls


def _fetch_tiles(client: httpx.Client, dataset: str, district, pdir: Path, log: list[dict[str, Any]], code: str, gaps: list[dict[str, Any]]) -> None:
    """Quadtree over the district bbox; each leaf holds <= 500 records and is one request."""
    from shapely.geometry import box as bbox

    def tile(x0: float, y0: float, x1: float, y1: float, key: str) -> None:
        cell = bbox(x0, y0, x1, y1)
        if not cell.intersects(district):
            return
        path = pdir / f"{dataset}-t{key}.geojson.gz"
        if path.exists():
            return
        wkt = cell.wkt
        r = _get(client, f"{API}/entity.json", {"dataset": dataset, "geometry": wkt, "geometry_relation": "intersects", "limit": 1, "exclude_field": "geometry"})
        count = r.json().get("count") or 0
        mx, my = (x0 + x1) / 2, (y0 + y1) / 2
        quads = ((x0, y0, mx, my), (mx, y0, x1, my), (x0, my, mx, y1), (mx, my, x1, y1))
        if count > 150 and len(key) < 14:
            for k, q in enumerate(quads):
                tile(*q, key + str(k))
            return
        try:
            r = client.get(f"{API}/entity.geojson", params={"dataset": dataset, "geometry": wkt, "geometry_relation": "intersects", "limit": 500}, timeout=180)
            r.raise_for_status()
        except (httpx.HTTPError, httpx.TimeoutException):
            if len(key) < 14:  # heavy polygons: split again rather than fail
                print(f"  splitting heavy tile {key} ({count} records)")
                for k, q in enumerate(quads):
                    tile(*q, key + str(k))
                return
            gaps.append({"place": code, "dataset": dataset, "page": key, "offset": -1, "reason": f"API timeout on smallest tile ({count} records)"})
            print(f"  gap: {code} {dataset} tile {key}")
            return
        _save(path, r.content)
        log.append(_entry(path, r.url, code))
        print(f"{code} {dataset} tile {key}: {len(r.json().get('features', []))}")

    x0, y0, x1, y1 = district.bounds
    tile(x0, y0, x1, y1, "r")


def _save(path: Path, content: bytes) -> None:
    """Raw pages are pinned gzipped (checksummed as stored)."""
    path.write_bytes(gzip.compress(content, mtime=0))


def _load(path: Path) -> dict[str, Any]:
    data = path.read_bytes()
    return json.loads(gzip.decompress(data) if path.suffix == ".gz" else data)


def download() -> None:
    RAW.mkdir(parents=True, exist_ok=True)
    log: list[dict[str, Any]] = []
    gaps_path = RAW / "gaps.json"
    gaps: list[dict[str, Any]] = json.loads(gaps_path.read_text()) if gaps_path.exists() else []
    with httpx.Client(headers={"User-Agent": USER_AGENT}, follow_redirects=True) as client:
        for code, name, _ in PLACES:
            pdir = RAW / code
            pdir.mkdir(exist_ok=True)
            # the district itself (entity + geometry)
            lad_path = pdir / "local-authority-district.geojson.gz"
            if not lad_path.exists():
                r = _get(client, f"{API}/entity.geojson", {"dataset": "local-authority-district", "reference": code})
                _save(lad_path, r.content)
                log.append(_entry(lad_path, r.url, code))
            feats = _load(lad_path).get("features", [])
            if not feats:
                raise ValueError(f"No Planning Data district for {code} {name}")
            lad_entity = feats[0]["properties"]["entity"]
            district = shape(feats[0]["geometry"]).buffer(0)
            for dataset, *_ in LAYERS:
                if dataset in TILED:
                    _fetch_tiles(client, dataset, district, pdir, log, code, gaps)
                    continue
                offset, page, size = 0, 0, PAGE_SIZE.get(dataset, 500)
                while True:
                    params = {"dataset": dataset, "geometry_entity": lad_entity, "geometry_relation": "intersects", "limit": size, "offset": offset}
                    path = pdir / f"{dataset}-{page:03d}.geojson.gz"
                    if not path.exists():  # resumable: pinned pages are kept
                        content, urls = _fetch_split(client, params, gaps, code)
                        _save(path, content)
                        log.append({**_entry(path, urls[0], code), "requests": urls})
                    n = len(_load(path).get("features", [])) + sum(1 for g in gaps if g["place"] == code and g["dataset"] == dataset and g["page"] == page)
                    print(f"{code} {dataset} page {page}: {n}")
                    if n < size:
                        break
                    offset += size
                    page += 1
    gaps_path.write_text(json.dumps(gaps, indent=1))
    # merge with any earlier (resumed) retrieval log
    prev = json.loads((RAW / "retrieval.json").read_text())["files"] if (RAW / "retrieval.json").exists() else []
    seen = {e["path"] for e in log}
    files = [e for e in prev if e["path"] not in seen] + log
    (RAW / "retrieval.json").write_text(json.dumps({"retrieved": RAW_DATE, "source": API, "files": files}, indent=1))


ORG_DATASETS = ("local-authority", "government-organisation", "national-park-authority", "development-corporation", "public-authority")


def download_orgs() -> None:
    """Pin publisher names so each record can say who published it."""
    log: list[dict[str, Any]] = []
    with httpx.Client(headers={"User-Agent": USER_AGENT}, follow_redirects=True) as client:
        for ds in ORG_DATASETS:
            r = _get(client, f"{API}/entity.json", {"dataset": ds, "limit": 500, "field": ["entity", "name"]})
            path = RAW / f"organisations-{ds}.json"
            path.write_bytes(r.content)
            log.append(_entry(path, r.url, "-"))
    (RAW / "organisations-retrieval.json").write_text(json.dumps({"retrieved": RAW_DATE, "files": log}, indent=1))


def org_names() -> dict[str, str]:
    names: dict[str, str] = {}
    for ds in ORG_DATASETS:
        path = RAW / f"organisations-{ds}.json"
        if path.exists():
            for e in json.loads(path.read_text()).get("entities", []):
                names[str(e["entity"])] = e["name"]
    return names


def _entry(path: Path, url: Any, code: str) -> dict[str, Any]:
    return {
        "path": str(path.relative_to(ROOT)),
        "place": code,
        "url": str(url),
        "retrieved_at": datetime.now(timezone.utc).isoformat(),
        "checksum_sha256": sha256_file(path),
        "bytes": path.stat().st_size,
    }


# ───────────────────────── geometry helpers ─────────────────────────
def _equal_area(lat0: float):
    """Local equirectangular metres around lat0 — adequate for shares at council scale.

    ``shapely.transform`` passes every coordinate as one array, not one point at a time.
    https://shapely.readthedocs.io/en/stable/reference/shapely.transform.html
    """
    kx = 111_320 * math.cos(math.radians(lat0))

    def f(coords):
        out = coords.copy()
        out[:, 0] *= kx
        out[:, 1] *= 110_540
        return out

    return f


def _polygons(geom) -> list:
    """Polygons only. ``make_valid`` can return lines; those are not area."""
    if geom is None or geom.is_empty:
        return []
    if not geom.is_valid:
        # https://shapely.readthedocs.io/en/stable/reference/shapely.make_valid.html
        geom = make_valid(geom)
    if geom.geom_type in ("Polygon", "MultiPolygon"):
        return [] if geom.is_empty else [geom]
    if geom.geom_type == "GeometryCollection":
        out: list = []
        for part in geom.geoms:
            out.extend(_polygons(part))
        return out
    return []


def _union(geoms):
    """Merge polygons. A snapped grid avoids GEOS 'side location conflict' on rounded rings.

    https://shapely.readthedocs.io/en/stable/reference/shapely.union_all.html
    """
    clean: list = []
    for geom in geoms:
        clean.extend(_polygons(geom))
    if not clean:
        return None
    grid = 10 ** -ROUND
    try:
        merged = union_all(clean, grid_size=grid)
    except GEOSException:
        merged = union_all([g.buffer(0) for g in clean], grid_size=grid)
    parts = _polygons(merged)
    if not parts:
        return None
    return parts[0] if len(parts) == 1 else union_all(parts, grid_size=grid)


def _coords(geom) -> Any:
    def rnd(c):
        return [round(c[0], ROUND), round(c[1], ROUND)]

    g = mapping(geom)
    t = g["type"]
    if t == "Point":
        return {"type": "Point", "c": rnd(g["coordinates"])}
    if t == "Polygon":
        return {"type": "MultiPolygon", "c": [[[rnd(p) for p in ring] for ring in g["coordinates"]]]}
    if t == "MultiPolygon":
        return {"type": "MultiPolygon", "c": [[[rnd(p) for p in ring] for ring in poly] for poly in g["coordinates"]]}
    if t == "GeometryCollection":
        polys = [p for p in geom.geoms if p.geom_type in ("Polygon", "MultiPolygon")]
        merged = _union(polys)
        return _coords(merged) if merged is not None else None
    return None


def _read_pages(pdir: Path, dataset: str) -> list[dict[str, Any]]:
    out: list[dict[str, Any]] = []
    for path in sorted(pdir.glob(f"{dataset}-*.geojson.gz")):
        out.extend(_load(path).get("features", []))
    return out


# ───────────────────────── land use (pinned LUS 2022) ─────────────────────────
LAND_USE_COLS: tuple[tuple[int, str, str], ...] = (
    (16, "residential", "Residential buildings"),
    (38, "residential-gardens", "Residential gardens"),
    (4, "community", "Community services"),
    (10, "industry-commerce", "Industry and commerce"),
    (20, "transport-utilities", "Transport and utilities"),
    (31, "agriculture", "Agriculture"),
    (32, "forestry-woodland", "Forestry and woodland"),
    (33, "natural-land", "Natural land"),
    (34, "rough-grassland", "Rough grassland"),
    (35, "water", "Water"),
    (37, "outdoor-recreation", "Outdoor recreation"),
    (13, "minerals-landfill", "Minerals and landfill"),
    (39, "undeveloped", "Undeveloped land"),
)


def _num(text: str) -> float | None:
    t = text.strip().replace(",", "")
    try:
        return float(t)
    except ValueError:
        return None


def land_use_rows() -> dict[str, list[dict[str, Any]]]:
    rows = read_ods_sheet(LAND_USE_ODS, "P400a")
    out: dict[str, list[dict[str, Any]]] = {}
    for row in rows:
        if not row or not row[0].strip().startswith("E"):
            continue
        out[row[0].strip()] = [
            {"id": sid, "label": label, "share": _num(row[i]) if i < len(row) else None} for i, sid, label in LAND_USE_COLS
        ]
    return out


# ───────────────────────── build one place ─────────────────────────
def build_place(code: str, name: str, why: str, land_use: dict[str, list[dict[str, Any]]]) -> dict[str, Any]:
    pdir = RAW / code
    lad = _load(pdir / "local-authority-district.geojson.gz")["features"][0]
    boundary = shape(lad["geometry"]).buffer(0)
    minx, miny, maxx, maxy = boundary.bounds
    proj = _equal_area((miny + maxy) / 2)
    area_m2 = transform(boundary, proj).area

    layers: dict[str, Any] = {}
    unions: dict[str, Any] = {}
    for dataset, group, label, kind, fields in LAYERS:
        feats_out: list[dict[str, Any]] = []
        geoms = []
        seen: set[str] = set()
        for f in _read_pages(pdir, dataset):
            p = f.get("properties", {})
            if str(p.get("entity")) in seen:
                continue  # tiles overlap at their edges
            seen.add(str(p.get("entity")))
            if p.get("end-date"):
                continue  # current records only
            if not f.get("geometry"):
                continue
            g = shape(f["geometry"])
            if not g.is_valid:
                g = g.buffer(0)
            if kind == "point":
                pt = g if g.geom_type == "Point" else g.representative_point()
                if not boundary.contains(pt):
                    continue
                geom = pt
            else:
                geom = g.intersection(boundary)
                if geom.is_empty or geom.area == 0:
                    continue
                geoms.append(geom)
                geom = geom.simplify(SIMPLIFY_DEG, preserve_topology=True)
            enc = _coords(geom)
            if enc is None:
                continue
            rec = {k: p.get(k) for k in BASE_FIELDS if p.get(k)}
            rec.update({k: p.get(k) for k in fields if p.get(k)})
            feats_out.append({"p": rec, "g": enc})
        cover = None
        if kind == "area":
            u = _union(geoms)
            unions[dataset] = u
            cover = round(100 * transform(u, proj).area / area_m2, 1) if u is not None and not u.is_empty else 0.0
        layers[dataset] = {"label": label, "group": group, "kind": kind, "count": len(feats_out), "coverPct": cover, "features": feats_out}

    # cross-layer facts, computed (never typed)
    def pts(ds: str):
        return [Point(f["g"]["c"]) for f in layers[ds]["features"]]

    def inside(points, ds: str) -> int:
        u = unions.get(ds)
        return 0 if u is None or u.is_empty else sum(1 for q in points if u.contains(q))

    designation = [unions[d] for d in ("green-belt", "site-of-special-scientific-interest", "ancient-woodland", "area-of-outstanding-natural-beauty", "national-park") if unions.get(d) is not None]
    designation_u = _union(designation)
    any_designation = round(100 * transform(designation_u, proj).area / area_m2, 1) if designation_u is not None else 0.0
    # Rebuild from the rounded rings the map will draw. Rounding can make a ring
    # self-touch, so the union goes through _union (repair + snapped grid).
    flood3 = [shape({"type": "MultiPolygon", "coordinates": f["g"]["c"]}) for f in layers["flood-risk-zone"]["features"] if str(f["p"].get("flood-risk-level")) == "3"]
    flood3_u = _union(flood3)
    flood3_pct = round(100 * transform(flood3_u, proj).area / area_m2, 1) if flood3_u is not None else 0.0
    bf = pts("brownfield-land")
    lb = pts("listed-building")
    facts = {
        "anyDesignationPct": any_designation,
        "floodZone3Pct": flood3_pct,
        "brownfieldInConservation": inside(bf, "conservation-area"),
        "brownfieldInGreenBelt": inside(bf, "green-belt"),
        "brownfieldInFlood3": 0 if flood3_u is None else sum(1 for q in bf if flood3_u.contains(q)),
        "brownfieldHectares": round(sum(float(f["p"].get("hectares") or 0) for f in layers["brownfield-land"]["features"]), 1),
        "brownfieldMaxDwellings": sum(int(float(f["p"].get("maximum-net-dwellings") or 0)) for f in layers["brownfield-land"]["features"]),
        "listedInConservation": inside(lb, "conservation-area"),
    }

    return {
        "code": code,
        "name": name,
        "why": why,
        "bbox": [round(v, ROUND) for v in (minx, miny, maxx, maxy)],
        "areaHa": round(area_m2 / 10_000),
        "boundary": _coords(boundary.simplify(SIMPLIFY_DEG * 2, preserve_topology=True)),
        "layers": layers,
        "facts": facts,
        "gaps": [g for g in _gaps() if g["place"] == code],
        "landUse": land_use.get(code, []),
        "landUseEngland": land_use.get("E92000001", []),
    }


def _gaps() -> list[dict[str, Any]]:
    path = RAW / "gaps.json"
    return json.loads(path.read_text()) if path.exists() else []


def build() -> None:
    CURATED.mkdir(parents=True, exist_ok=True)
    land_use = land_use_rows()
    index = []
    used_orgs: set[str] = set()
    for code, name, why in PLACES:
        if not (RAW / code / "local-authority-district.geojson.gz").exists():
            print(f"skip {code} {name}: no pinned raw (run with --download)")
            continue
        place = build_place(code, name, why, land_use)
        out = CURATED / f"{code}.json"
        out.write_text(json.dumps(place, separators=(",", ":")))
        index.append({
            "code": code, "name": name, "why": why, "areaHa": place["areaHa"], "bytes": out.stat().st_size,
            "counts": {k: v["count"] for k, v in place["layers"].items()},
            "coverPct": {k: v["coverPct"] for k, v in place["layers"].items() if v["coverPct"] is not None},
            "facts": place["facts"],
        })
        print(f"built {code} {name}: {out.stat().st_size // 1024} KB")
        for layer in place["layers"].values():
            used_orgs.update(str(f["p"].get("organisation-entity")) for f in layer["features"] if f["p"].get("organisation-entity"))
    retrieval = json.loads((RAW / "retrieval.json").read_text())
    (CURATED / "index.json").write_text(json.dumps({
        "source": {
            "publisher": "Planning Data (MHCLG)",
            "url": API,
            "retrieved": RAW_DATE,
            "licence": "Open Government Licence v3.0; Historic England and Natural England layers carry their own attribution",
            "landUse": "MHCLG Land Use Stock 2022, Table P400a (local authority rows)",
        },
        "layers": [{"dataset": d, "group": g, "label": lbl, "kind": k} for d, g, lbl, k, _ in LAYERS],
        "places": index,
        "orgs": {k: v for k, v in org_names().items() if k in used_orgs},
        "rawFiles": len(retrieval["files"]),
    }, indent=1))


# Live queries answer "any English council" without pinning every district.
# One geometry page per layer. Flood zones are counted only — a full geometry
# fetch is what stalled the four-district download.
LIVE_LIMIT = 400
LIVE_TIMEOUT = 20.0
COUNT_ONLY = {"flood-risk-zone"}
LIVE_DIR = CURATED / "live"


def authorities() -> list[dict[str, str]]:
    """English local authority districts named in Land Use Stock 2022 (P400a)."""
    rows = read_ods_sheet(LAND_USE_ODS, "P400a")
    found: list[dict[str, str]] = []
    for row in rows:
        if not row:
            continue
        code = row[0].strip()
        if len(code) != 9 or code[:3] not in {"E06", "E07", "E08", "E09"}:
            continue
        name = row[1].strip() if len(row) > 1 else code
        found.append({"code": code, "name": name})
    found.sort(key=lambda a: a["name"])
    return found


def write_authorities() -> Path:
    CURATED.mkdir(parents=True, exist_ok=True)
    path = CURATED / "authorities.json"
    path.write_text(
        json.dumps(
            {
                "source": "MHCLG Land Use Stock 2022, Table P400a — English local authority districts",
                "authorities": authorities(),
            },
            indent=1,
        )
    )
    return path


def _live_page(client: httpx.Client, dataset: str, entity: int) -> tuple[list[dict[str, Any]], str | None]:
    try:
        response = client.get(
            f"{API}/entity.geojson",
            params={
                "dataset": dataset,
                "geometry_entity": entity,
                "geometry_relation": "intersects",
                "limit": LIVE_LIMIT,
            },
            timeout=LIVE_TIMEOUT,
        )
        response.raise_for_status()
        return response.json().get("features", []), None
    except (httpx.HTTPError, httpx.TimeoutException) as exc:
        return [], str(exc.__class__.__name__)


def _live_count(client: httpx.Client, dataset: str, entity: int) -> int | None:
    try:
        response = client.get(
            f"{API}/entity.json",
            params={
                "dataset": dataset,
                "geometry_entity": entity,
                "geometry_relation": "intersects",
                "limit": 1,
                "exclude_field": "geometry",
            },
            timeout=LIVE_TIMEOUT,
        )
        response.raise_for_status()
        count = response.json().get("count")
        return int(count) if count is not None else None
    except (httpx.HTTPError, httpx.TimeoutException, TypeError, ValueError):
        return None


def _features_from_page(
    features: list[dict[str, Any]],
    *,
    boundary,
    kind: str,
    fields: tuple[str, ...],
) -> tuple[list[dict[str, Any]], list]:
    """Clip one API page to the district. Returns (encoded features, area geoms)."""
    feats_out: list[dict[str, Any]] = []
    geoms = []
    seen: set[str] = set()
    for feature in features:
        props = feature.get("properties") or {}
        entity = str(props.get("entity"))
        if entity in seen:
            continue
        seen.add(entity)
        if props.get("end-date") or not feature.get("geometry"):
            continue
        geom = shape(feature["geometry"])
        if not geom.is_valid:
            geom = geom.buffer(0)
        if kind == "point":
            point = geom if geom.geom_type == "Point" else geom.representative_point()
            if not boundary.intersects(point):
                continue
            geom = point
        else:
            geom = geom.intersection(boundary)
            if geom.is_empty or geom.area == 0:
                continue
            geoms.append(geom)
            geom = geom.simplify(SIMPLIFY_DEG * 4, preserve_topology=True)
        encoded = _coords(geom)
        if encoded is None:
            continue
        record = {key: props.get(key) for key in BASE_FIELDS if props.get(key)}
        record.update({key: props.get(key) for key in fields if props.get(key)})
        feats_out.append({"p": record, "g": encoded})
    return feats_out, geoms


def _brownfield_capacity(features: list[dict[str, Any]]) -> dict[str, int]:
    """Sum published maximum dwellings. A blank cell is missing, not zero."""
    stated = 0
    missing = 0
    total = 0
    for feature in features:
        raw = feature["p"].get("maximum-net-dwellings")
        if raw is None or str(raw).strip() == "":
            missing += 1
            continue
        total += int(float(raw))
        stated += 1
    return {
        "brownfieldMaxDwellings": total,
        "brownfieldCapacityStated": stated,
        "brownfieldCapacityMissing": missing,
    }


def query_place(code: str, *, use_cache: bool = True) -> dict[str, Any]:
    """One English district for Land Explorer.

    Order: pinned plate → live cache → accredited publisher FeatureServers
    (ONS boundary, MHCLG Green Belt, Natural England, Historic England).
    Does not call planning.data.gov.uk on the default path.
    """
    if not (len(code) == 9 and code[:3] in {"E06", "E07", "E08", "E09"}):
        raise ValueError(f"{code} is not an English local authority district code")
    pinned = CURATED / f"{code}.json"
    if pinned.is_file():
        place = json.loads(pinned.read_text())
        place["coverage"] = {"mode": "pinned"}
        return place
    cache = LIVE_DIR / f"{code}.json"
    if use_cache and cache.is_file():
        return json.loads(cache.read_text())

    from housing.connectors.publisher_layers import query_place_publishers

    return query_place_publishers(code)


def query_place_planning_data(code: str) -> dict[str, Any]:
    """Legacy live query against planning.data.gov.uk (optional; not the default path)."""
    if not (len(code) == 9 and code[:3] in {"E06", "E07", "E08", "E09"}):
        raise ValueError(f"{code} is not an English local authority district code")
    names = {row["code"]: row["name"] for row in authorities()}
    if code not in names:
        raise ValueError(f"{code} is not in the 2022 English local authority list")
    name = names[code]
    land_use = land_use_rows()
    cache = LIVE_DIR / f"{code}.json"

    with httpx.Client(headers={"User-Agent": USER_AGENT}, follow_redirects=True, timeout=LIVE_TIMEOUT) as client:
        # Shorter backoff than pin downloads — the Land Explorer request budget is ~90s.
        district_response: httpx.Response | None = None
        district_waits = (2, 5, 10, 20)
        for attempt in range(len(district_waits) + 1):
            try:
                district_response = client.get(
                    f"{API}/entity.geojson",
                    params={"dataset": "local-authority-district", "reference": code},
                    timeout=LIVE_TIMEOUT,
                )
                district_response.raise_for_status()
                break
            except (httpx.HTTPError, httpx.TimeoutException):
                if attempt == len(district_waits):
                    raise
                time.sleep(district_waits[attempt])
        assert district_response is not None
        district_features = district_response.json().get("features") or []
        if not district_features:
            raise ValueError(f"Planning Data has no district boundary for {code}")
        district_props = district_features[0]["properties"]
        entity = int(district_props["entity"])
        boundary = shape(district_features[0]["geometry"]).buffer(0)

        from concurrent.futures import ThreadPoolExecutor

        datasets = [row[0] for row in LAYERS]

        def fetch(dataset: str) -> tuple[str, list[dict[str, Any]], int | None, str | None]:
            count = _live_count(client, dataset, entity)
            if dataset in COUNT_ONLY:
                return dataset, [], count, None
            page, error = _live_page(client, dataset, entity)
            return dataset, page, count, error

        # httpx.Client is safe to share across threads.
        # https://www.python-httpx.org/advanced/clients/
        with ThreadPoolExecutor(max_workers=6) as pool:
            rows = list(pool.map(fetch, datasets))

    pages = {dataset: (page, count, error) for dataset, page, count, error in rows}
    minx, miny, maxx, maxy = boundary.bounds
    proj = _equal_area((miny + maxy) / 2)
    area_m2 = transform(boundary, proj).area
    layers: dict[str, Any] = {}
    unions: dict[str, Any] = {}
    coverage_layers: dict[str, Any] = {}
    for dataset, group, label, kind, fields in LAYERS:
        page, count, error = pages[dataset]
        if dataset in COUNT_ONLY:
            layers[dataset] = {
                "label": label,
                "group": group,
                "kind": kind,
                "count": count or 0,
                "coverPct": None,
                "features": [],
            }
            coverage_layers[dataset] = {
                "status": "count-only",
                "count": count,
                "note": "Flood-zone geometry is too dense for a live query. The count is from Planning Data; the polygons are not drawn.",
            }
            continue
        feats_out, geoms = _features_from_page(page, boundary=boundary, kind=kind, fields=fields)
        cover = None
        if kind == "area":
            union = _union(geoms)
            unions[dataset] = union
            cover = round(100 * transform(union, proj).area / area_m2, 1) if union is not None and not union.is_empty else 0.0
        returned = len(feats_out)
        # A count above the page we drew means the API has more records than this
        # live query keeps. A slightly lower returned count is clipping, not a cut-off.
        if error and returned == 0:
            status = "failed"
        elif (count is not None and count > LIVE_LIMIT) or returned >= LIVE_LIMIT:
            status = "truncated"
        else:
            status = "complete"
        layers[dataset] = {
            "label": label,
            "group": group,
            "kind": kind,
            "count": count if count is not None else returned,
            "coverPct": cover,
            "features": feats_out,
        }
        coverage_layers[dataset] = {"status": status, "returned": returned, "count": count, "error": error}

    def points(dataset: str):
        return [Point(feature["g"]["c"]) for feature in layers[dataset]["features"] if feature["g"]["type"] == "Point"]

    def inside(pts, dataset: str) -> int:
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
    place = {
        "code": code,
        "name": name,
        "why": "",
        "bbox": [round(value, ROUND) for value in (minx, miny, maxx, maxy)],
        "areaHa": round(area_m2 / 10_000),
        "boundary": _coords(boundary.simplify(SIMPLIFY_DEG * 4, preserve_topology=True)),
        "layers": layers,
        "facts": {
            "anyDesignationPct": round(100 * transform(designation_union, proj).area / area_m2, 1) if designation_union is not None else 0.0,
            "floodZone3Pct": 0.0,
            "brownfieldInConservation": inside(brownfield_points, "conservation-area"),
            "brownfieldInGreenBelt": inside(brownfield_points, "green-belt"),
            "brownfieldInFlood3": 0,
            "brownfieldHectares": round(
                sum(float(feature["p"].get("hectares") or 0) for feature in layers["brownfield-land"]["features"]),
                1,
            ),
            # A blank maximum is missing, not a published zero. Only stated numbers are summed.
            **_brownfield_capacity(layers["brownfield-land"]["features"]),
            "listedInConservation": inside(listed_points, "conservation-area"),
        },
        "gaps": [],
        "landUse": land_use.get(code, []),
        "landUseEngland": land_use.get("E92000001", []),
        "coverage": {
            "mode": "live",
            "retrieved": datetime.now(timezone.utc).isoformat(),
            "limit": LIVE_LIMIT,
            "layers": coverage_layers,
        },
    }
    # Cache is best-effort: Railway / read-only hosts still return the plate.
    try:
        LIVE_DIR.mkdir(parents=True, exist_ok=True)
        cache.write_text(json.dumps(place, separators=(",", ":")))
    except OSError:
        pass
    return place


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--download", action="store_true", help="fetch from Planning Data and pin raw files first")
    ap.add_argument("--orgs", action="store_true", help="fetch and pin publisher names only")
    ap.add_argument("--authorities", action="store_true", help="write the English district name list")
    ap.add_argument("--place", help="live-query one English local authority district code")
    a = ap.parse_args()
    if a.authorities:
        path = write_authorities()
        print(path)
        return
    if a.place:
        place = query_place(a.place.strip())
        print(f"{place['code']} {place['name']} mode={place.get('coverage', {}).get('mode')}")
        return
    if a.download:
        download()
    if a.download or a.orgs:
        download_orgs()
    build()


if __name__ == "__main__":
    main()
