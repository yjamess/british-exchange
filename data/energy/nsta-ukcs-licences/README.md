# NSTA UKCS offshore petroleum licences (WGS84)

Point-in-time **UK Continental Shelf (offshore)** petroleum licence polygons from the North Sea Transition Authority open-data Hub.

**Contains information provided by the North Sea Transition Authority and/or other third parties.**

Do **not** reuse NSTA logos or imply endorsement.

## Status

**Ready** (Validation 2026-11-07). QA: `data/qa/qa_report_nsta_ukcs_licences_2026-11-07.md`.

## Coverage honesty

- **UKCS offshore licences only** (this WGS84 pin: Extant Production / LOCATION=OFFSHORE)
- **Not** a national petroleum atlas
- NSTA does **not** publish onshore Scotland / Wales / NI petroleum GIS — do not invent that coverage
- Separate Hub layers exist for England onshore licences, licence blocks, and sub-areas — **not** included here
- `primary_region` in curated CSV = first `REGIONS` token before a comma (multi-region rows counted once)
- **Map copy:** some `REGIONS` strings include a secondary “Onshore” token while `LOCATION=OFFSHORE` (e.g. P534). Prefer LOCATION for geography honesty.

## Source

| Item | URL |
|------|-----|
| Hub landing | https://open-data-ukcs-transition.hub.arcgis.com/datasets/UKCS-transition::ukcs-offshore-petroleum-licences-wgs84 |
| GeoJSON download | Hub item `e4e489b088b44e29af1c848468403988` |
| FeatureServer | `UKCS offshore petroleum licences WGS84/FeatureServer/0` |
| data.gov.uk sibling | [UKCS offshore petroleum licences (ED50 catalogue)](https://www.data.gov.uk/dataset/a4fabc09-b176-4a46-bff5-cd08873ef354/ukcs-offshore-petroleum-licences-ed50) |
| Licence pin | [`../oil-gas-fossil-fuels/licence/README.md`](../oil-gas-fossil-fuels/licence/README.md) |

**CRS:** EPSG:4326 (WGS84)  
**Pin date:** 2026-11-07 — 345 features; AGREED_KM2 sum ≈ 41,855 km²

## Reproduce

```bash
uv run python -m energy.connectors.nsta_ukcs_licences --fetch
# or re-curate from the latest pin without re-download:
uv run python -m energy.connectors.nsta_ukcs_licences
```

## Hand-off paths

| Path | Role |
|------|------|
| `raw/2026-11-07/ukcs_offshore_petroleum_licences_wgs84.geojson` | Immutable pin + sha256 in manifest |
| `curated/observations.csv` | Feature counts + AGREED_KM2 by primary region |
| `curated/features.csv` | Named licences list (attributes, no geometry) |
| `curated/licences.geojson` | Curated polygon copy for map consumers |
| `curated/spatial_meta.json` | Feature count, CRS, attribution |
| `manifest.yaml` | Shared contract metadata |
| `validation_notes.md` | Self-check notes for Validation |

## Indicator

- **id:** `nsta-ukcs-licences`
- **Related:** `nsta-ukcs-fields`, `crude-oil-production`
