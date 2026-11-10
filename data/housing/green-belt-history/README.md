# Green Belt history — landmark-year England boundaries

**Status: Validation — spatial product for Historical Change, not a Ready statistical indicator.**

Feeds Housing Domain 06 › Historical change: hectare series (existing `green-belt-area`) plus a year menu that draws a dissolved England Green Belt outline for landmark statistical years.

## Source

- Publisher: MHCLG
- Dataset: [English local authority Green Belt dataset](https://www.data.gov.uk/dataset/ccb505e0-67a8-4ace-b294-19a3cbff4861/english-local-authority-green-belt-dataset10)
- Licence: OGL v3.0 · Contains OS data © Crown copyright
- Build note: GeoServer SHAPE-ZIP on data.gov.uk returned 504 at ingest; plates were built from public ArcGIS FeatureServer mirrors of the same annual boundaries (MHCLG-hosted where available).

## Landmark years shipped

`2010-11` · `2019-20` · `2020-21` · `2021-22` · `2023-24` · `2024-25` (each = boundary at 31 March of the year's end)

`England_Green_Belt_2022` is the same 31 March 2022 boundary as `2021-22` (identical features) and is not shipped twice. Earlier years (e.g. 1997) are not invented while the official zip feed is unavailable.

Screen resolution: simplified ≈0.5 km (0.002° / 0.006°), specks under ~2–3 km² dropped. Each plate carries the ONS Countries (Dec 2024) England outline and one fixed England frame so years compare at the same scale.

## Files

- `curated/{year}.json` — dissolved, screen-simplified England MultiPolygon plate
- `curated/index.json` — year catalogue + pack ids
- Packs: `housing.green-belt-history-{year}` and `housing.green-belt-history-index` in `bx-data-archive`

## Reproduce

```sh
uv run python -m housing.connectors.green_belt_history
uv run python -m britain_exchange.archive_data push data/housing/green-belt-history
```

## Honesty

- Designation snapshot for the statistical year — not a continuous boundary history
- Green Belt ≠ blanket build ban
- Plate is simplified for screen; do not measure hectares from the map (use `green-belt-area`)
- Land Explorer still draws the **current** Green Belt for one council only
