# Boundary transformation checks — 4 November 2026

These checks were performed by the Regions owner; they do not replace independent numerical/map QA.

| Check | Result |
| --- | --- |
| Publisher count query versus archived and curated features | 361 = 361 = 361 |
| Exact unique ONS codes | 361 unique; no duplicates |
| Source properties preserved | Every code/name matches raw `LAD25CD`/`LAD25NM` |
| Geometry structure preserved | All polygon and ring counts/vertex counts match the source |
| Polygon vocabulary | Polygon/MultiPolygon only |
| Rings | 918; closed, at least three unique vertices, non-zero signed area |
| Coordinates | 50,110 vertices including ring closures; all finite, within expected UK longitude/latitude extent |
| Coordinate transformation | Every ordinate equals source rounded to five decimals; maximum absolute rounding difference < 0.000005 degrees |
| HPI joins | 360 exact matches; only boundary-only code E06000053 (Isles of Scilly) |
| Missing HPI local boundaries | None |
| Offline regeneration | Completes using pinned evidence, checksums verified |
| Curated bytes | 1,039,108 |
| Curated SHA-256 | `fca73d3ba1405dc6452cf079da944b45995cd0948ac969e096b40673c2c09103` |

No additional line simplification, polygon dissolving or inferred crosswalk was used. These structural checks do not claim a new GIS proof of polygon topology; that topology comes from the official ONS BUC product. No price observations are transformed by this connector.

Required UI caveats: fixed December 2025 geography; ONS 500m generalisation; no data for unmatched codes; overview map is not a property-location service. Include the full ONS and OS attribution from `curated/source.json`.
