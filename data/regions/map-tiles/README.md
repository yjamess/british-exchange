# Shared map tiles (PMTiles)

**Status:** in use by every UK map (`InkMap` — `web/src/brand/map/`). Spatial layers, not Observation datasets; no registry row.

| File (`curated/`) | What | Size |
|---|---|---|
| `boundaries.pmtiles` | ONS December 2025 boundaries. Layers `lad` (361 local authorities, BFC full resolution), `rgn` (9 English regions, BFC), `ctry` (4 UK countries, BGC 20 m). Each feature: `code`, `name` | 17.4 MB |
| `gb-basemap.pmtiles` | OpenStreetMap via the Protomaps daily build, clipped to GB + NI + North Sea (−11…4.5°E, 49.4…61.6°N), zoom 0–10, layers earth · water · roads · boundaries · places only | 18.1 MB |
| `places.json` | Per code: name, level, lon/lat bounds, ONS internal point (label anchor). Copied into `web/src/brand/map/places.json` | 47 KB |
| `source.json` | Publishers, service URLs, retrieval times, checksums, licences, attribution | — |

Statistics are never baked into tiles; the browser joins values by `code`.

## Where it lives

Supabase Storage (`bx-data-archive`, keys `regions/map-tiles/curated/*`), stored uncompressed (each object < 50 MB so byte ranges work). The API serves them at `GET /tiles/boundaries.pmtiles` and `GET /tiles/gb-basemap.pmtiles` with HTTP range requests (`src/britain_exchange/tiles.py`): disk first in dev, Storage otherwise. The local `curated/` copy is removed after push; nothing in the UI reads the laptop.

## Rebuild

Needs `tippecanoe`, `tile-join`, `pmtiles` (`brew install tippecanoe pmtiles`).

```bash
uv run python -m regions.connectors.map_tiles --work /tmp/bx-map-tiles   # ~400 MB of ONS GeoJSON + ~80 MB basemap extract
uv run python -m britain_exchange.archive_data push data/regions/map-tiles/curated
cp data/regions/map-tiles/curated/places.json web/src/brand/map/places.json   # pull first if already pushed
```

Raw ONS GeoJSON is evidence by checksum only (in `source.json`) — too large to archive under the 50 MB object cap.

## Licences and attribution

- ONS boundaries: Open Government Licence v3.0. *Source: Office for National Statistics licensed under the Open Government Licence v.3.0. Contains OS data © Crown copyright and database right 2025.* — in each map's source line as `Boundaries: ONS December 2025`.
- Basemap: © OpenStreetMap contributors, ODbL 1.0 — the credit link drawn in every `InkMap`.
- Map labels use Geist Mono (SIL OFL 1.1, `web/public/map-fonts/`).

## Caveats

- Fixed December 2025 boundaries for every period; not historical boundaries.
- Overview cartography (basemap to zoom 10, overzoomed beyond); not for property-level location or boundary determination.
