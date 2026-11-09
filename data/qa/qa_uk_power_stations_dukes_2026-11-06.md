# QA — `uk-power-stations-dukes` (DUKES 5.11 fossil + nuclear)

**Date:** 2026-11-06  
**Owner:** Energy (ingest); Validation to confirm Ready  
**Curated:** `data/energy/uk-power-stations-dukes/curated/observations.csv` + `stations.json`  
**Raw:** `raw/2026-11-06/DUKES_5.11.xlsx` sha256 `760286f4cb3168f04a5ee1b581dbfcb35e1d65a5ea0151bb2dd4dc12dca2c72a`

## Checks

| # | Check | Result |
|---|--------|--------|
| 1 | Sheet `5.11 Full list` header found | PASS |
| 2 | Technology filter = Fossil Fuel ∪ Nuclear only | PASS — 74 stations |
| 3 | Fuel MW observations = Natural Gas, Diesel/Gas Oil, Nuclear | PASS — 3 rows |
| 4 | OSGB→WGS84 points for GB/Wales/Scotland | PASS — 68 plotted |
| 5 | Northern Ireland not plotted (Irish Grid) | PASS — 6 skipped |
| 6 | Spot: Pembroke ≈ 51.66°N, 4.99°W; Sizewell B ≈ 52.22°N, 1.62°E | PASS |
| 7 | No coal plant on the current list (post-Ratcliffe) | PASS |
| 8 | Complements REPD (does not duplicate renewable Technology rows) | PASS |

## Method notes

- CRS: Airy 1830 National Grid → OS Helmert → WGS84 (`energy.geo.osgb`).
- Major power producers only — not every licensed generator.
- Atlas UI merges REPD points + these stations under Station atlas.

## Verdict

**PASS for ingest.** Registry status → Validation → Ready after Validation sign-off.
