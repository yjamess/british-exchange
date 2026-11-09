# QA report — `nsta-ukcs-fields` — 2026-11-07

**Agent:** Validation  
**Overall verdict:** **pass** (sample QA accepted; Notion Ready left to Orchestrator)

## Scope

- Indicator: `nsta-ukcs-fields` — NSTA UKCS offshore hydrocarbon fields (WGS84)
- Package: `data/energy/nsta-ukcs-fields/`
- Manifest: `data/energy/nsta-ukcs-fields/manifest.yaml`
- Raw pin: `raw/2026-11-07/ukcs_offshore_hydrocarbon_fields_wgs84.geojson`
- Curated: `curated/observations.csv`, `curated/features.csv`, `curated/fields.geojson`, `curated/spatial_meta.json`
- Connector: `energy.connectors.nsta_ukcs_fields` (`src/energy/connectors/nsta_ukcs_fields.py`) — read-only for QA
- Licence context (cleared): `data/energy/oil-gas-fossil-fuels/licence/README.md`
- Hub: [UKCS offshore hydrocarbon fields (WGS84)](https://open-data-ukcs-transition.hub.arcgis.com/datasets/UKCS-transition::ukcs-offshore-hydrocarbon-fields-wgs84)

## Freeze

| Item | Value |
|------|-------|
| Claimed SHA-256 | `df8f8526c18b1817b765e3eaed85b926d77bdaff701a56a4a53ba40a5381681d` |
| Observed SHA-256 (raw) | `df8f8526c18b1817b765e3eaed85b926d77bdaff701a56a4a53ba40a5381681d` |
| Curated GeoJSON SHA-256 | identical to raw (byte copy) |
| Feature count (raw / curated GJ / features.csv) | 478 / 478 / 478 |
| CRS | GeoJSON `crs.properties.name` = `EPSG:4326`; lon/lat ≈ −4.40…3.27 / 50.66…61.72 (WGS84 UKCS) |
| Observations | 15 rows (1 total + 11 status + 3 field_type); breakdowns sum to 478 |
| Pin retrieved_at | 2026-11-07T15:34:51+00:00 (manifest) |

## Checks

| ID | Check | Result | Notes |
|----|-------|--------|-------|
| C1 | Freeze — pinned GeoJSON SHA-256 vs manifest | **pass** | Exact match |
| C2 | Feature counts — GeoJSON vs `features.csv` vs observations total | **pass** | 478 everywhere; STATUS/FIELDTYPE sums = 478 |
| C3 | CRS = EPSG:4326 / WGS84 | **pass** | Explicit CRS name + lon/lat ranges (not ED50 metres) |
| C4 | Attribution present in README | **pass** | Exact required line; also in `spatial_meta.json` + manifest definition/caveats |
| C5 | Honesty — UKCS offshore only; not national petroleum atlas; not onshore Scotland/Wales/NI | **pass** | README + manifest geography/caveats state limits clearly |
| C6 | Null STATUS → UNKNOWN | **pass** | Raw OBJECTID 509 `LENNOX (oil)` has `STATUS=null`; curated `status=UNKNOWN` (1) |
| C7 | Spot sample AFFLECK | **pass** | OIL / PRODUCING / OBJECTID 1 — matches Energy validation notes |
| C8 | Independence — Validation did not edit Energy curated/raw | **pass** | Report under `data/qa/` only |

## Summary

- Pass: **8**
- Warn: **0**
- Fail: **0**
- Blockers: **none**
- **Notion:** Validation does **not** mark Ready (Orchestrator / registry hand-off only)

## Notes (non-blocking)

- Live Hub feature-count re-query was not available from this Validation environment (network). Local freeze + attribute recompute are sufficient for this sample QA.
- Sibling ED50/ETRS89 Hub layers exist; this package correctly pins WGS84 only.
- Field polygons are a spatial snapshot — must not be used to invent national oil/gas production totals.

## Reproduce

```bash
shasum -a 256 data/energy/nsta-ukcs-fields/raw/2026-11-07/ukcs_offshore_hydrocarbon_fields_wgs84.geojson
# Expect: df8f8526c18b1817b765e3eaed85b926d77bdaff701a56a4a53ba40a5381681d
python3 -c "import json; print(len(json.load(open('data/energy/nsta-ukcs-fields/raw/2026-11-07/ukcs_offshore_hydrocarbon_fields_wgs84.geojson'))['features']))"
# Expect: 478
```

## Recommended next step (owner: Orchestrator)

Accept sample QA for Gate 3 spatial hand-off; registry Ready only when Orchestrator updates Notion.
