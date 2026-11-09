# Validation notes — `nsta-ukcs-fields`

**Agent:** Energy  
**Date:** 2026-11-07  
**Status:** **Ready** (Orchestrator 2026-11-07 after Validation pass — `data/qa/qa_report_nsta_ukcs_fields_2026-11-07.md`)

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
| Feature count | **478** |
| CRS documented | **EPSG:4326** (layer extent wkid 4326) |
| Sample feature | AFFLECK / OIL / PRODUCING (OBJECTID 1 in pin) |
| STATUS breakdown sums to total | Pass (207+193+39+21+7+3+2+2+2+1+1 = 478) |
| FIELDTYPE breakdown sums to total | Pass (OIL 252 + GAS 183 + COND 43 = 478) |
| Geography honesty | UKCS offshore only; no Scotland/Wales/NI onshore invented |
| Observations rows | 15 (1 total + 11 status + 3 field_type) |
| Named features CSV rows | 478 |

## Suggested Validation samples

1. Open Hub map for [UKCS offshore hydrocarbon fields (WGS84)](https://open-data-ukcs-transition.hub.arcgis.com/datasets/UKCS-transition::ukcs-offshore-hydrocarbon-fields-wgs84) and confirm feature count ≈ 478.
2. Spot-check one named field (e.g. AFFLECK) attributes vs `curated/features.csv`.
3. Confirm README attribution string is exact.

## Open risks

- Point-in-time layer — republish will change checksums; re-run connector `--fetch`.
- ED50 / ETRS89 siblings exist; this package intentionally pins **WGS84 only**.
- Do not use field polygons to invent national production totals.
