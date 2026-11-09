# NSTA UKCS offshore hydrocarbon fields (WGS84)

Point-in-time **UK Continental Shelf (offshore)** hydrocarbon field polygons from the North Sea Transition Authority open-data Hub.

**Contains information provided by the North Sea Transition Authority and/or other third parties.**

Do **not** reuse NSTA logos or imply endorsement.

## Status

**Ready** (Validation 2026-11-07). QA: `data/qa/qa_report_nsta_ukcs_fields_2026-11-07.md`.

## Coverage honesty

- **UKCS offshore fields only**
- **Not** a national petroleum atlas
- NSTA does **not** publish onshore Scotland / Wales / NI petroleum GIS — do not invent that coverage
- Counts are a spatial snapshot, **not** production volumes

## Source

| Item | URL |
|------|-----|
| Hub landing | https://open-data-ukcs-transition.hub.arcgis.com/datasets/UKCS-transition::ukcs-offshore-hydrocarbon-fields-wgs84 |
| GeoJSON download | Hub item `ba711a4be08449329a871d37ae910735` |
| FeatureServer | `Offshore_hydrocarbon_fields_(WGS84)/FeatureServer/0` |
| data.gov.uk sibling | [UKCS offshore hydrocarbon fields (ED50 catalogue)](https://www.data.gov.uk/dataset/ba533146-91dd-45ef-a81e-95906f981890/ukcs-offshore-hydrocarbon-fields-ed50) |
| Licence pin | [`../oil-gas-fossil-fuels/licence/README.md`](../oil-gas-fossil-fuels/licence/README.md) |

**CRS:** EPSG:4326 (WGS84)  
**Pin date:** 2026-11-07 — 478 features

## Reproduce

```bash
uv run python -m energy.connectors.nsta_ukcs_fields --fetch
# or re-curate from the latest pin without re-download:
uv run python -m energy.connectors.nsta_ukcs_fields
```

## Hand-off paths

| Path | Role |
|------|------|
| `raw/2026-11-07/ukcs_offshore_hydrocarbon_fields_wgs84.geojson` | Immutable pin + sha256 in manifest |
| `curated/observations.csv` | Feature counts (total / STATUS / FIELDTYPE) |
| `curated/features.csv` | Named fields list (attributes, no geometry) |
| `curated/fields.geojson` | Curated polygon copy for map consumers |
| `curated/spatial_meta.json` | Feature count, CRS, attribution |
| `manifest.yaml` | Shared contract metadata |
| `validation_notes.md` | Self-check notes for Validation |

## Indicator

- **id:** `nsta-ukcs-fields`
- **Related:** `nsta-ukcs-licences`, `crude-oil-production`
