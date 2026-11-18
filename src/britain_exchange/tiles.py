"""PMTiles by HTTP range: disk in dev, Supabase Storage (``bx-data-archive``) in deploy.

Map clients (MapLibre + ``pmtiles``) read a few KB at a time with ``Range: bytes=a-b``.
Packs load whole bodies into memory, so tiles get their own route that passes the range
straight through instead. Objects are stored uncompressed (each < 50 MB), never ``.gz``.
"""
from __future__ import annotations

import logging
import re
import threading
from dataclasses import dataclass

import httpx

from britain_exchange.archive_data import BUCKET, _headers, _supabase_config
from britain_exchange.paths import DATA_ROOT

logger = logging.getLogger(__name__)

TILESETS: dict[str, str] = {
    "boundaries": "regions/map-tiles/curated/boundaries.pmtiles",
    "gb-basemap": "regions/map-tiles/curated/gb-basemap.pmtiles",
}

_RANGE = re.compile(r"^bytes=(\d+)-(\d*)$")
_client_lock = threading.Lock()
_client: httpx.Client | None = None


@dataclass(frozen=True)
class TileSlice:
    status: int
    body: bytes
    headers: dict[str, str]
    source: str


def _http() -> httpx.Client:
    global _client
    with _client_lock:
        if _client is None:
            _client = httpx.Client(timeout=30.0, http2=False, limits=httpx.Limits(max_keepalive_connections=8))
        return _client


def _parse(range_header: str | None, size: int | None) -> tuple[int, int] | None:
    if not range_header:
        return None
    m = _RANGE.match(range_header.strip())
    if not m:
        raise ValueError(f"Unsupported Range: {range_header}")
    start = int(m.group(1))
    end = int(m.group(2)) if m.group(2) else (size - 1 if size else start + (1 << 20) - 1)
    if size is not None:
        end = min(end, size - 1)
    if end < start:
        raise ValueError(f"Unsatisfiable Range: {range_header}")
    return start, end


def _from_disk(rel: str, range_header: str | None) -> TileSlice | None:
    path = DATA_ROOT / rel
    if not path.is_file():
        return None
    size = path.stat().st_size
    span = _parse(range_header, size)
    etag = f'"{int(path.stat().st_mtime)}-{size}"'
    with path.open("rb") as f:
        if span is None:
            return TileSlice(200, f.read(), {"ETag": etag, "Content-Length": str(size)}, "disk")
        start, end = span
        f.seek(start)
        body = f.read(end - start + 1)
    return TileSlice(206, body, {"Content-Range": f"bytes {start}-{end}/{size}", "ETag": etag}, "disk")


def _from_storage(rel: str, range_header: str | None) -> TileSlice | None:
    try:
        base, key = _supabase_config()
    except SystemExit:
        logger.info("Tiles %s: Supabase env not set; storage fallback skipped", rel)
        return None
    _parse(range_header, None)  # validate before going upstream
    headers = dict(_headers(key))
    if range_header:
        headers["Range"] = range_header
    response = _http().get(f"{base}/storage/v1/object/{BUCKET}/{rel}", headers=headers)
    if response.status_code in (400, 404):
        return None
    if response.status_code >= 400:
        logger.warning("Tiles storage GET %s → HTTP %s", rel, response.status_code)
        raise RuntimeError(f"Storage returned HTTP {response.status_code} for {rel}")
    out = {k: v for k, v in (("Content-Range", response.headers.get("content-range")), ("ETag", response.headers.get("etag"))) if v}
    return TileSlice(response.status_code, response.content, out, "storage")


def get_tiles(name: str, range_header: str | None) -> TileSlice:
    rel = TILESETS.get(name)
    if rel is None:
        raise KeyError(name)
    return _from_disk(rel, range_header) or _from_storage(rel, range_header) or _missing(rel)


def _missing(rel: str) -> TileSlice:
    raise FileNotFoundError(rel)
