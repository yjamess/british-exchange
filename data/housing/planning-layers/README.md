# Planning layers — Land Explorer (Housing Domain 06)

**Status: Validation — spatial layer product, not a Ready statistical indicator.** Feeds the Land Explorer view (`web/src/brand/housing/canvas/land/LandExplorer.tsx`) through `web/src/app/housing/land-layers/[code]/route.ts`.

## What it is

Every English local authority in the 2022 land-use table (309 districts) is loaded from Planning Data when someone selects it. The reply is cached in `curated/live/{code}.json`. One page of geometry per layer (400 records). Current records only (an end date drops the record). Flood-zone polygons are counted, not drawn.

The four full plates (Manchester, St Albans, York, Derbyshire Dales) were removed to save disk. Opening one of them now uses the same live query as any other council.

| Group | Layers (Planning Data dataset) | Original publisher |
|-------|-------------------------------|--------------------|
| Designations | `green-belt`, `conservation-area`, `site-of-special-scientific-interest`, `ancient-woodland`, `area-of-outstanding-natural-beauty`, `national-park` | MHCLG / councils, Natural England |
| Heritage | `listed-building`, `scheduled-monument`, `park-and-garden`, `world-heritage-site` | Historic England |
| Development | `brownfield-land` | Councils (brownfield land registers) |
| Constraints | `flood-risk-zone`, `article-4-direction-area`, `tree-preservation-zone` | Environment Agency, councils |

There is no list of suggested councils. Search is the way in. The page states which layers are drawn, and the reference date, before a council is opened.

Land use per place comes from the already-pinned MHCLG Land Use Stock 2022 file (`data/housing/land-use-stock/raw/…ods`, Table P400a local-authority rows). The Ready `land-use-stock` indicator itself is unchanged and stays England-only.

**Not included:** local-plan allocations — Planning Data has no published allocation records for these places yet (`employment-allocation` holds 0 records; there is no housing-allocation dataset). The view says so instead of showing anything.

## Files

- `curated/authorities.json` — the 309 English district names.
- `curated/index.json` — layer catalogue. No geometry, and no suggested councils.
- `curated/live/{code}.json` — one council after it has been opened. Safe to delete; the next open asks Planning Data again.

## Method and caveats

- Coverage shares are computed by the Exchange: layer polygons are unioned, intersected with the district, and measured in a local equal-area approximation (equirectangular at the district's centre latitude) — adequate for shares at district scale, not for survey.
- Point layers: listed buildings use the list-entry point (polygon entries use a representative point); brownfield sites use the register point.
- Flood zones ignore defences (Environment Agency definition). A live query stores the record count only, so the zone 3 share is not drawn.
- Green Belt is a designation that restricts inappropriate development, not a ban on building. A brownfield registration is not a deliverable site; dwelling numbers are council-published and often missing.
- England only. Current designations are not historic boundaries.

## Licence

Planning Data is published under the Open Government Licence v3.0. Historic England, Natural England and Environment Agency data carry their own attribution (Crown copyright and database right; Historic England / Natural England / Environment Agency). Boundaries contain OS data © Crown copyright and database right.

## Reproduce

```sh
uv run python src/housing/connectors/planning_layers.py --authorities   # refresh the 309 names
uv run python src/housing/connectors/planning_layers.py --place E08000003  # one council, then cache it
```

`--download` still exists and would store full geometry again, including flood polygons. Leave it unused on a small disk.
