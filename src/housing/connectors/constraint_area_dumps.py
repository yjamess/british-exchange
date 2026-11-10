"""Article 4 and tree-preservation zones from Planning Data collection CSV dumps.

These layers are not on publisher FeatureServers. The live entity API is flaky, so
Land Explorer uses the official CSV dumps (same pattern as brownfield):

1. Prefer Supabase Storage pack (``bx-data-archive``) — laptop stays thin.
2. Fall back to a local pin only while developing.
3. Last resort: download from files.planning.data.gov.uk.

Polygons stay as WKT until a district query needs them (TPO is ~110k rows).
Clip uses the published ``point`` for a cheap bbox filter first.
"""

from __future__ import annotations

import csv
import io
import json
import re
import sys
from dataclasses import dataclass
from typing import Any

import httpx
from shapely import wkt as shapely_wkt
from shapely.geometry import Point

from britain_exchange.paths import HOUSING_DATA
from housing.connectors.planning_layers import LIVE_LIMIT, SIMPLIFY_DEG, _coords

csv.field_size_limit(sys.maxsize)

# WKT points in dumps may be ``POINT(lon lat)`` or ``POINT (lon lat)``.
_POINT_RE = re.compile(r"POINT\s*\(\s*([-\d.]+)\s+([-\d.]+)\s*\)", re.IGNORECASE)

A4_PIN = "article-4-direction-area/raw/2026-11-10/article-4-direction-area.csv"
A4_PACK = "housing.article-4-direction-area-csv"
A4_URL = "https://files.planning.data.gov.uk/dataset/article-4-direction-area.csv"

TPO_PIN = "tree-preservation-zone/raw/2026-11-10/tree-preservation-zone.csv"
TPO_PACK = "housing.tree-preservation-zone-csv"
TPO_URL = (
    "https://files.planning.data.gov.uk/tree-preservation-order-collection/"
    "dataset/tree-preservation-zone.csv"
)


@dataclass(frozen=True)
class AreaRow:
    point: Point
    wkt: str
    props: dict[str, str]


_A4_ROWS: list[AreaRow] | None = None
_TPO_ROWS: list[AreaRow] | None = None


def _field(row: dict[str, str], *names: str) -> str:
    for name in names:
        value = row.get(name)
        if value is not None and str(value).strip() != "":
            return str(value).strip()
    return ""


def _csv_text(pin_rel: str, pack_id: str, url: str, *, timeout_s: float) -> tuple[str, str]:
    path = HOUSING_DATA / pin_rel
    if path.is_file() and path.stat().st_size > 1_000_000:
        return path.read_text(encoding="utf-8"), "disk"

    from britain_exchange.packs import get_pack

    try:
        blob = get_pack(pack_id)
        return blob.body.decode("utf-8"), blob.source
    except (KeyError, FileNotFoundError):
        pass

    with httpx.Client(
        timeout=timeout_s,
        follow_redirects=True,
        headers={"User-Agent": "british-exchange-research"},
    ) as client:
        response = client.get(url)
        response.raise_for_status()
        return response.text, "download"


def _parse_rows(text: str, *, dataset: str) -> list[AreaRow]:
    rows: list[AreaRow] = []
    for row in csv.DictReader(io.StringIO(text)):
        if _field(row, "end-date", "end_date"):
            continue
        wkt = _field(row, "geometry")
        if not wkt:
            continue
        match = _POINT_RE.search(_field(row, "point"))
        if not match:
            continue
        lon, lat = float(match.group(1)), float(match.group(2))
        entity = _field(row, "entity")
        reference = _field(row, "reference")
        name = _field(row, "name") or reference or entity or dataset
        props: dict[str, str] = {
            "entity": entity,
            "reference": reference,
            "name": name,
            "entry-date": _field(row, "entry-date", "entry_date"),
            "organisation-entity": _field(row, "organisation-entity", "organisation_entity"),
        }
        if dataset == "article-4-direction-area":
            description = _field(row, "description")
            if description:
                props["description"] = description
            notes = _field(row, "notes")
            if notes:
                props["notes"] = notes
        else:
            raw_json = _field(row, "json")
            if raw_json:
                try:
                    payload = json.loads(raw_json)
                except json.JSONDecodeError:
                    payload = {}
                order = str(payload.get("tree-preservation-order") or "").strip()
                if order:
                    props["reference"] = props["reference"] or order
                    props["name"] = name if name not in {"", reference, entity} else order
                zone_type = str(payload.get("tree-preservation-zone-type") or "").strip()
                if zone_type:
                    props["tree-preservation-zone-type"] = zone_type
        rows.append(AreaRow(point=Point(lon, lat), wkt=wkt, props=props))
    return rows


def load_article4_areas(*, force: bool = False) -> list[AreaRow]:
    global _A4_ROWS
    if _A4_ROWS is not None and not force:
        return _A4_ROWS
    text, _source = _csv_text(A4_PIN, A4_PACK, A4_URL, timeout_s=180.0)
    _A4_ROWS = _parse_rows(text, dataset="article-4-direction-area")
    return _A4_ROWS


def load_tpo_areas(*, force: bool = False) -> list[AreaRow]:
    global _TPO_ROWS
    if _TPO_ROWS is not None and not force:
        return _TPO_ROWS
    text, _source = _csv_text(TPO_PIN, TPO_PACK, TPO_URL, timeout_s=300.0)
    _TPO_ROWS = _parse_rows(text, dataset="tree-preservation-zone")
    return _TPO_ROWS


def area_features_for_boundary(
    rows: list[AreaRow],
    boundary: Any,
    *,
    limit: int = LIVE_LIMIT,
) -> list[dict[str, Any]]:
    """Clip dump polygons to a district. Point bbox first; WKT only for candidates."""
    minx, miny, maxx, maxy = boundary.bounds
    out: list[dict[str, Any]] = []
    for row in rows:
        if not (minx <= row.point.x <= maxx and miny <= row.point.y <= maxy):
            continue
        try:
            geom = shapely_wkt.loads(row.wkt)
        except Exception:  # noqa: BLE001 — skip broken publisher WKT
            continue
        if not geom.is_valid:
            geom = geom.buffer(0)
        geom = geom.intersection(boundary)
        if geom.is_empty or geom.geom_type in ("LineString", "MultiLineString", "Point", "MultiPoint"):
            continue
        geom = geom.simplify(SIMPLIFY_DEG * 4, preserve_topology=True)
        encoded = _coords(geom)
        if encoded is None:
            continue
        out.append({"p": dict(row.props), "g": encoded})
        if len(out) >= limit:
            break
    return out


def article4_features_for_boundary(boundary: Any, *, limit: int = LIVE_LIMIT) -> list[dict[str, Any]]:
    return area_features_for_boundary(load_article4_areas(), boundary, limit=limit)


def tpo_features_for_boundary(boundary: Any, *, limit: int = LIVE_LIMIT) -> list[dict[str, Any]]:
    return area_features_for_boundary(load_tpo_areas(), boundary, limit=limit)
