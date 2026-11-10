"""Serve allowlisted curated pack files from disk or Supabase Storage.

Cloud completeness: explorers must not ``readFile`` the laptop. Packs live under
``data/`` while developing, and in private bucket ``bx-data-archive`` in deploy.
Storage keys match the path under ``data/`` (optionally ``.gz`` for large files).
"""

from __future__ import annotations

import gzip
import json
import logging
from dataclasses import dataclass
from functools import lru_cache
from typing import Any

import httpx

from britain_exchange.archive_data import BUCKET, INDEX_PATH, _headers, _load_index, _supabase_config
from britain_exchange.paths import DATA_ROOT

logger = logging.getLogger(__name__)

# Stable pack ids used by the API and Next loaders. Paths are relative to data/.
PACK_REGISTRY: dict[str, str] = {
    "energy.atlas": "energy/renewable-energy-planning-operational/curated/atlas.json",
    "energy.stations": "energy/uk-power-stations-dukes/curated/stations.json",
    "energy.station-history": "energy/electricity-generation-long-run/curated/station-history.json",
    "energy.assumed-efficiencies": "energy/primary-energy-flow-allocation/curated/assumed_efficiencies.json",
    "energy.geography": "energy/subnational-final-consumption/curated/geography.json",
    "energy.authorities": "energy/subnational-final-consumption/curated/authorities.json",
    "energy.ofgem-components": "energy/ofgem-default-tariff-cap/curated/components.json",
    "energy.nsta-field-points": "energy/nsta-ukcs-fields/curated/atlas_points.json",
    "energy.nsta-field-annual": "energy/nsta-field-production/curated/annual_by_field.csv",
    "energy.long-run-observations": "energy/electricity-generation-long-run/curated/observations.csv",
    "energy.ssen-dno-atlas": "energy/ssen-dno-pilot/curated/atlas.json",
    "energy.ssen-dno-spatial-meta": "energy/ssen-dno-pilot/curated/spatial_meta.json",
    # Manufacturing IoP by SIC break — year means for Production Anatomy (not full monthly CSV).
    "energy.manufacturing-iop-annual": "energy/manufacturing-iop-by-division/curated/annual_means.json",
    # ONS IoP annual GVA weights (additive parts per thousand) — Production Anatomy composition.
    "energy.manufacturing-iop-weights": "energy/manufacturing-iop-weights/curated/weights.json",
    # Editorial event registers (JSON packs — not observation series).
    "energy.industrial-policy-events": "energy/industrial-policy/events.json",
    "energy.industrial-policy-pledges": "energy/industrial-policy/pledges.json",
    "energy.imports-shock-events": "energy/energy-imports-security/shock-events.json",
    "people.population": "people/subnational-population-estimate/curated/population.json",
    "regions.gb-boundaries": "regions/housing-boundaries/curated/boundaries.geojson",
    "regions.gb-boundaries-source": "regions/housing-boundaries/curated/source.json",
    "regions.english-regions-display": "regions/housing-boundaries/curated/english-regions-display.json",
    "regions.boundaries-display": "regions/housing-boundaries/curated/boundaries-display.json",
    # Housing atlas / maps
    "housing.atlas": "housing/housing-atlas/curated/atlas.json",
    "housing.atlas-average": "housing/housing-atlas/curated/atlas-average.json",
    "housing.atlas-detached": "housing/housing-atlas/curated/atlas-detached.json",
    "housing.atlas-semi-detached": "housing/housing-atlas/curated/atlas-semi-detached.json",
    "housing.atlas-terraced": "housing/housing-atlas/curated/atlas-terraced.json",
    "housing.atlas-flat": "housing/housing-atlas/curated/atlas-flat.json",
    "housing.atlas-new-build": "housing/housing-atlas/curated/atlas-new-build.json",
    "housing.atlas-existing": "housing/housing-atlas/curated/atlas-existing.json",
    "housing.atlas-sales-volume": "housing/housing-atlas/curated/atlas-sales-volume.json",
    "housing.atlas-topics": "housing/housing-atlas/curated/topics.json",
    "housing.rent-atlas": "housing/private-rental-prices/curated/rent-atlas.json",
    "housing.afford-atlas": "housing/house-price-to-earnings-ratio/curated/afford-atlas.json",
    "housing.ehs-mortgage-by-age": "housing/ehs-mortgage-by-age/curated/by-age.json",
    "housing.ehs-costs-by-age": "housing/ehs-housing-costs-by-age/curated/costs-by-age.json",
    "housing.planning-authorities": "housing/planning-layers/curated/authorities.json",
    "housing.planning-index": "housing/planning-layers/curated/index.json",
    # MHCLG brownfield register collection dump (Land Explorer points; bulky — Storage).
    "housing.brownfield-land-csv": "housing/brownfield-land/raw/2026-11-04/brownfield-land.csv",
    # Planning Data collection dumps for Land Explorer constraint polygons (Storage).
    "housing.article-4-direction-area-csv": (
        "housing/article-4-direction-area/raw/2026-11-10/article-4-direction-area.csv"
    ),
    "housing.tree-preservation-zone-csv": (
        "housing/tree-preservation-zone/raw/2026-11-10/tree-preservation-zone.csv"
    ),
    # Landmark-year England Green Belt plates (Historical Change).
    "housing.green-belt-history-index": "housing/green-belt-history/curated/index.json",
    "housing.green-belt-history-2010-11": "housing/green-belt-history/curated/2010-11.json",
    "housing.green-belt-history-2019-20": "housing/green-belt-history/curated/2019-20.json",
    "housing.green-belt-history-2020-21": "housing/green-belt-history/curated/2020-21.json",
    "housing.green-belt-history-2021-22": "housing/green-belt-history/curated/2021-22.json",
    "housing.green-belt-history-2023-24": "housing/green-belt-history/curated/2023-24.json",
    "housing.green-belt-history-2024-25": "housing/green-belt-history/curated/2024-25.json",
    # PINS Casework Database aggregates (Land › Planning decisions › Appeals).
    "housing.planning-appeals": "housing/planning-appeals/curated/summary.json",
    # Planning Data local-plan status (Land › Planning decisions › Local plans; T17).
    "housing.local-plan-status": "housing/local-plan-status/curated/summary.json",
    "housing.policy-events": "housing/policy-events/events.json",
    "housing.policy-tracks": "housing/policy-events/tracks.json",
    "housing.policy-pledges": "housing/policy-events/pledges.json",
    "housing.policy-archive": "housing/policy-events/archive.json",
    "housing.policy-plates": "housing/policy-events/plates.json",
}

# Relative paths allowed via GET /packs/rel/{path} (planning-layer districts, live cache).
ALLOWED_REL_PREFIXES: tuple[str, ...] = (
    "housing/planning-layers/curated/",
)


@dataclass(frozen=True)
class PackBlob:
    pack_id: str
    rel_path: str
    media_type: str
    source: str  # "disk" | "storage"
    body: bytes


def list_packs() -> list[dict[str, Any]]:
    return [
        {
            "pack_id": pack_id,
            "path": f"data/{rel}",
            "on_disk": (DATA_ROOT / rel).is_file(),
            "in_archive_index": f"data/{rel}" in _index_paths(),
        }
        for pack_id, rel in sorted(PACK_REGISTRY.items())
    ]


@lru_cache(maxsize=1)
def _index_paths() -> frozenset[str]:
    if not INDEX_PATH.is_file():
        return frozenset()
    return frozenset(_load_index().keys())


def _media_type(rel: str) -> str:
    if rel.endswith(".json") or rel.endswith(".geojson"):
        return "application/json"
    if rel.endswith(".csv"):
        return "text/csv; charset=utf-8"
    return "application/octet-stream"


def _read_disk(rel: str) -> bytes | None:
    path = DATA_ROOT / rel
    if path.is_file():
        return path.read_bytes()
    return None


def _storage_keys_for(rel: str) -> list[str]:
    """Prefer archive-index keys; fall back to the conventional Storage path."""
    data_path = f"data/{rel}"
    keys: list[str] = []
    if INDEX_PATH.is_file():
        entry = _load_index().get(data_path)
        if entry is not None:
            keys.append(entry.storage_key)
    # Convention used by archive_data: key == path under data/, plus optional .gz
    keys.append(rel)
    keys.append(f"{rel}.gz")
    # De-dupe while preserving order
    seen: set[str] = set()
    out: list[str] = []
    for key in keys:
        if key not in seen:
            seen.add(key)
            out.append(key)
    return out


def _read_storage(rel: str) -> bytes | None:
    try:
        base, key = _supabase_config()
    except SystemExit:
        logger.info("Pack %s: Supabase env not set; storage fallback skipped", rel)
        return None

    with httpx.Client(timeout=120.0) as client:
        for storage_key in _storage_keys_for(rel):
            url = f"{base}/storage/v1/object/{BUCKET}/{storage_key}"
            response = client.get(url, headers=_headers(key))
            if response.status_code == 404:
                continue
            if response.status_code >= 400:
                logger.warning(
                    "Pack storage GET %s → HTTP %s", storage_key, response.status_code
                )
                continue
            body = response.content
            if storage_key.endswith(".gz") or rel + ".gz" == storage_key:
                body = gzip.decompress(body)
            return body
    return None


def _blob_for_rel(pack_id: str, rel: str) -> PackBlob:
    disk = _read_disk(rel)
    if disk is not None:
        return PackBlob(pack_id, rel, _media_type(rel), "disk", disk)

    remote = _read_storage(rel)
    if remote is not None:
        return PackBlob(pack_id, rel, _media_type(rel), "storage", remote)

    raise FileNotFoundError(pack_id)


def get_pack(pack_id: str) -> PackBlob:
    rel = PACK_REGISTRY.get(pack_id)
    if rel is None:
        raise KeyError(pack_id)
    return _blob_for_rel(pack_id, rel)


def allowlisted_rel(rel: str) -> str:
    """Normalise and validate a data/-relative path for /packs/rel."""
    cleaned = rel.replace("\\", "/").lstrip("/")
    if cleaned.startswith("data/"):
        cleaned = cleaned[len("data/") :]
    if ".." in cleaned.split("/"):
        raise ValueError("path must not contain ..")
    if not any(cleaned.startswith(prefix) for prefix in ALLOWED_REL_PREFIXES):
        raise ValueError(f"path not allowlisted: {cleaned}")
    if not cleaned.endswith(".json"):
        raise ValueError("only .json packs are served by rel path")
    return cleaned


def get_pack_rel(rel: str) -> PackBlob:
    cleaned = allowlisted_rel(rel)
    return _blob_for_rel(f"rel:{cleaned}", cleaned)


def get_pack_json(pack_id: str) -> Any:
    blob = get_pack(pack_id)
    return json.loads(blob.body.decode("utf-8"))
