# QA report — `nsta-ukcs-licences` — 2026-11-07

**Agent:** Validation  
**Overall verdict:** **pass** (sample QA accepted; Notion Ready left to Orchestrator)

## Scope

- Indicator: `nsta-ukcs-licences` — NSTA UKCS offshore petroleum licences (WGS84)
- Package: `data/energy/nsta-ukcs-licences/`
- Manifest: `data/energy/nsta-ukcs-licences/manifest.yaml`
- Raw pin: `raw/2026-11-07/ukcs_offshore_petroleum_licences_wgs84.geojson`
- Curated: `curated/observations.csv`, `curated/features.csv`, `curated/licences.geojson`, `curated/spatial_meta.json`
- Connector: `energy.connectors.nsta_ukcs_licences` (`src/energy/connectors/nsta_ukcs_licences.py`) — read-only for QA
- Licence context (cleared): `data/energy/oil-gas-fossil-fuels/licence/README.md`
- Hub: [UKCS offshore petroleum licences (WGS84)](https://open-data-ukcs-transition.hub.arcgis.com/datasets/UKCS-transition::ukcs-offshore-petroleum-licences-wgs84)

## Freeze

| Item | Value |
|------|-------|
| Claimed SHA-256 | `4746a529db6f8e47979337af27c27f9dd2403ace305fcdbd92d8bc7483f44ab3` |
| Observed SHA-256 (raw) | `4746a529db6f8e47979337af27c27f9dd2403ace305fcdbd92d8bc7483f44ab3` |
| Curated GeoJSON SHA-256 | identical to raw (byte copy) |
| Feature count (raw / curated GJ / features.csv) | 345 / 345 / 345 |
| AGREED_KM2 sum | 41855.093 km² (matches observations + spatial_meta) |
| CRS | GeoJSON `crs.properties.name` = `EPSG:4326`; lon/lat ≈ −4.60…3.14 / 50.67…62.00 |
| Filter composition (raw props) | LOCATION=OFFSHORE 345; LICSTATUS=Extant 345; LICTYPE=Production 345 |
| Pin retrieved_at | 2026-11-07T15:34:57+00:00 (manifest) |

## Checks

| ID | Check | Result | Notes |
|----|-------|--------|-------|
| C1 | Freeze — pinned GeoJSON SHA-256 vs manifest | **pass** | Exact match |
| C2 | Feature counts — GeoJSON vs `features.csv` vs observations total | **pass** | 345 everywhere; primary_region counts sum to 345 |
| C3 | AGREED_KM2 total ≈ 41 855 km² | **pass** | Recomputed 41855.093; region km² sum matches |
| C4 | CRS = EPSG:4326 / WGS84 | **pass** | Explicit CRS name + lon/lat ranges |
| C5 | Attribution present in README | **pass** | Exact required line; also in `spatial_meta.json` + manifest |
| C6 | Honesty — Extant Production offshore only; not national atlas; not onshore Scotland/Wales/NI petroleum GIS | **pass** | All 345 LOCATION=OFFSHORE / Extant / Production; README excludes England onshore + blocks layers |
| C7 | Spot sample P355 | **pass** | Chrysaor / Central North Sea / FLEMING / AGREED_KM2 18.318 — matches curated row |
| C8 | Independence — Validation did not edit Energy curated/raw | **pass** | Report under `data/qa/` only |

## Summary

- Pass: **8**
- Warn: **1** (see below)
- Fail: **0**
- Blockers: **none**
- **Notion:** Validation does **not** mark Ready (Orchestrator / registry hand-off only)

## Warn

| ID | Issue | Notes |
|----|-------|-------|
| W1 | P534 `REGIONS` = `Irish Sea, Onshore` | Still LOCATION=OFFSHORE / Extant / Production. Secondary region token mentions Onshore; counted under primary_region=`Irish Sea` only (documented multi-region rule). Not a composition fail — flag so map copy does not claim zero onshore-adjacent labelling in attributes. |

## Notes (non-blocking)

- Live Hub feature-count re-query was not available from this Validation environment (network). Local freeze + attribute recompute are sufficient for this sample QA.
- Nine multi-region licences; summary observations use first `REGIONS` token only — full string retained in `features.csv`.
- This pin is licence polygons, not licence blocks / licensed–unlicensed blocks (separate Hub datasets).

## Reproduce

```bash
shasum -a 256 data/energy/nsta-ukcs-licences/raw/2026-11-07/ukcs_offshore_petroleum_licences_wgs84.geojson
# Expect: 4746a529db6f8e47979337af27c27f9dd2403ace305fcdbd92d8bc7483f44ab3
python3 -c "import json; g=json.load(open('data/energy/nsta-ukcs-licences/raw/2026-11-07/ukcs_offshore_petroleum_licences_wgs84.geojson')); print(len(g['features']), round(sum(float(f['properties']['AGREED_KM2']) for f in g['features']),3))"
# Expect: 345 41855.093
```

## Recommended next step (owner: Orchestrator)

Accept sample QA for Gate 3 spatial hand-off; registry Ready only when Orchestrator updates Notion. Optional: note W1 (P534) in product caveats if maps surface `REGIONS` text.
