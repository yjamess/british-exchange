# Housing atlas boundary layer

**Status: Validation — local review only.** This is a spatial layer, not a Ready statistical indicator. `boundary-manifest.yaml` deliberately does not use the CSV catalogue filename `manifest.yaml`.

## Source and rights

- Publisher: Office for National Statistics.
- [Official dataset](https://www.data.gov.uk/dataset/d6c2a698-7cf8-4c12-aad5-4ee4fb47154c/local-authority-districts-december-2025-boundaries-uk-buc).
- [ONS FeatureServer](https://services1.arcgis.com/ESMARspQHYMw9BZ9/arcgis/rest/services/Local_Authority_Districts_DEC_2025_Boundaries_UK_BUC/FeatureServer/0).
- Geography: 361 United Kingdom local authority districts, December 2025.
- Published product: BUC, ultra-generalised at 500 metres, clipped to mean high water. Source metadata updated 29 April 2026.
- Retrieval: 4 November 2026 UTC; exact timestamps and SHA-256 checksums are in `raw/2026-11-04/retrieval.json` and `boundary-manifest.yaml`.
- [Licence and required attribution](https://www.ons.gov.uk/methodology/geography/licences/): Open Government Licence v3.0. **Source: Office for National Statistics licensed under the Open Government Licence v.3.0. Contains OS data © Crown copyright and database right 2025.**

BUC was selected instead of independently simplifying the finer BGC geometry, preserving the ONS-supplied polygon/ring structure and keeping the client geometry close to 1 MB. It is for overview cartography, not street-level navigation or identifying a property's administrative boundary.

## Reproduce

From the repository root, no third-party Python dependencies are required:

```sh
python3 src/regions/connectors/housing_boundaries.py
```

This regenerates the curated geometry, source card, join report and layer manifest from pinned evidence, without accessing the network. The source HPI archive is read only to produce the join report.

For a fresh archive (where the pinned raw files do not already exist):

```sh
python3 src/regions/connectors/housing_boundaries.py --download
```

The download step refuses to overwrite existing evidence. Updating the boundary vintage is an explicit connector change; it must not silently replace these polygons. Query URLs and the publisher's expected feature count are archived. A truncated server response or checksum mismatch fails the transformation.

## Output contract

`curated/boundaries.geojson` is an EPSG:4326 FeatureCollection, longitude then latitude. Each feature has:

| Field | Meaning |
| --- | --- |
| `properties.code` | Exact ONS `LAD25CD`; join on the code, never a fuzzy name |
| `properties.name` | ONS `LAD25NM` |
| `properties.level` | `local` |
| `geometry` | Original Polygon or MultiPolygon structure; coordinates rounded to five decimals |

`curated/source.json` contains publisher, official URL, release description, licence, exact retrieval timestamp, raw checksum, required attribution and caveats for the UI evidence panel.

`curated/join-report.json` enumerates every unmatched code on both sides. `boundary-manifest.yaml` is machine-readable JSON (valid YAML) with source and output checksums.

## Join and time semantics

- **360 of 361** boundary codes match the pinned August 2026 HPI full file exactly.
- **Isles of Scilly (`E06000053`)** has a boundary but no HPI series. Show no data. Never substitute England, the South West or neighbouring Cornwall.
- Every HPI local-authority code has a corresponding boundary. The 45 other HPI geographies are counties, metropolitan counties, inner/outer London, regions, nations and UK/GB/England-and-Wales aggregates. These do not belong in the local-authority map layer.
- This layer uses fixed **December 2025 boundaries for every observation date**. It does not animate historical boundary changes or reallocate values. The HPI source's own geographical series definitions still apply.
- Local-authority boundaries do not invent region polygons. Separate **English region** BUC geometry (ONS Regions December 2025) is archived as `curated/english-regions.geojson` and projected for the Housing explorer as `curated/english-regions-display.json` (copied into `web/src/brand/housing/atlas/` for the region choropleth).
- No postcode coordinates, postcode polygons or address data are included. The rights for this boundary layer do not establish rights for future postcode/property products.

## Validation

See `validation-notes.md` for source-to-output structural and join checks. An independent Validation agent must review the complete map/data join and sample source values before publication readiness is claimed.
