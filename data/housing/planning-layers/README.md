# Planning layers — Land Explorer (Housing Domain 06)

**Status: Validation — spatial layer product, not a Ready statistical indicator.** Feeds the Land Explorer view (`web/src/brand/housing/canvas/land/LandExplorer.tsx`) through `web/src/app/housing/land-layers/[code]/route.ts` → FastAPI `GET /housing/land-layers/{code}`.

## What it is

Any English local authority in the 2022 land-use table (309 districts) can be opened. Live plates are built from **accredited publisher APIs** (not planning.data.gov.uk):

| Layer | Live source |
|-------|-------------|
| District boundary | ONS Open Geography LAD Dec 2024 FeatureServer |
| Green Belt | MHCLG England Green Belt 2022 FeatureServer |
| Flood zones 2 & 3 | Environment Agency Flood Map for Planning FeatureServer (live) |
| Brownfield register points | MHCLG Planning Data **collection CSV dump** in Supabase Storage (`housing.brownfield-land-csv`) — not the live entity API |
| Article 4 direction areas | Planning Data dump in Storage (`housing.article-4-direction-area-csv`) |
| Tree preservation zones | Planning Data dump in Storage (`housing.tree-preservation-zone-csv`, gzipped ~31 MiB) |
| SSSI, ancient woodland, AONB, national park | Natural England Open Data FeatureServers |
| Listed buildings, scheduled monuments, parks & gardens, WHS, conservation areas | Historic England NHLE / Conservation Areas FeatureServers |

The reply is cached in `curated/live/{code}.json` (and served via packs / Storage when pushed). Up to 400 records per layer. CSV dumps stay in `bx-data-archive` — not on the laptop.

Land use per place comes from the pinned MHCLG Land Use Stock 2022 ODS (Table P400a).

## Files

- `curated/authorities.json` — the 309 English district names.
- `curated/index.json` — layer catalogue.
- `curated/live/{code}.json` — one council after it has been opened. Safe to delete.

## Code

- `src/housing/connectors/publisher_layers.py` — default live path (FeatureServers + EA flood + CSV dumps).
- `src/housing/connectors/constraint_area_dumps.py` — Article 4 / TPO from Storage packs.
- `src/housing/connectors/brownfield_land.py` — brownfield points from Storage pack.
- `src/housing/connectors/planning_layers.py` — pin / rebuild helpers; `query_place()` delegates to publishers; `query_place_planning_data()` kept as optional legacy.

## Reproduce

```sh
uv run python src/housing/connectors/planning_layers.py --authorities
uv run python src/housing/connectors/planning_layers.py --place E08000035   # Leeds via publishers
```

## Licence

Open Government Licence v3.0. Historic England, Natural England and MHCLG layers carry their own attribution. Boundaries contain OS data © Crown copyright and database right.
