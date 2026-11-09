# Validation notes — `nsta-ukcs-licences`

**Agent:** Energy  
**Date:** 2026-11-07  
**Status:** **Ready** (Orchestrator 2026-11-07 after Validation pass — `data/qa/qa_report_nsta_ukcs_licences_2026-11-07.md`; W1 region-label caveat documented in README)

## Attribution / licence

- Required line present in README + manifest definition/caveats:  
  *Contains information provided by the North Sea Transition Authority and/or other third parties.*
- Licence gate: `data/energy/oil-gas-fossil-fuels/licence/README.md` (NSTA User Agreement PDF pinned).
- No NSTA logos reused.

## Self-check (Energy)

| Check | Result |
|-------|--------|
| Hub GeoJSON download HTTP 200 | Pass (connector `--fetch`) |
| FeatureCollection type | Pass |
| Feature count | **345** |
| CRS documented | **EPSG:4326** |
| LOCATION | All OFFSHORE (345) |
| LICSTATUS / LICTYPE | Extant / Production only in this pin |
| AGREED_KM2 sum | **41855.093** km² (matches FeatureServer attributes) |
| Sample licence | P355 / Chrysaor / Central North Sea / FLEMING |
| Geography honesty | UKCS offshore only; no Scotland/Wales/NI onshore invented |
| Observations rows | 15 (total features + total area + region counts/areas + location/status/type) |
| Named features CSV rows | 345 |

## Suggested Validation samples

1. Open Hub map for [UKCS offshore petroleum licences (WGS84)](https://open-data-ukcs-transition.hub.arcgis.com/datasets/UKCS-transition::ukcs-offshore-petroleum-licences-wgs84) and confirm feature count ≈ 345.
2. Spot-check LICREF P355 in `curated/features.csv` vs Hub attribute table.
3. Confirm this is **licence polygons**, not licence blocks / unlicensed blocks (separate datasets).
4. Confirm README attribution string is exact.

## Open risks

- Layer composition (Extant Production offshore only) may change if NSTA expands the published WGS84 service — re-check LOCATION / LICSTATUS on refresh.
- Multi-region licences (9 in this pin) are counted under the **first** REGIONS token only in summary observations; full `regions` string remains in `features.csv`.
- England onshore petroleum licences are a **different** Hub layer — intentionally excluded.
