# QA report — domestic gas production — 2026-11-03

## Scope
- Indicator: `domestic-gas-production` (DESNZ ET 4.2)
- Raw: `data/energy/domestic-gas-production/raw/2026-11-03/ET_4.2_OCT_26.xlsx`
- Curated: `data/energy/domestic-gas-production/curated/observations.csv` (368 rows)
- Manifest: `data/energy/domestic-gas-production/manifest.yaml`

## Checks
| ID | Check | Result | Notes |
|----|-------|--------|-------|
| C1 | Pinned raw SHA-256 | **pass** | f48acf6de39a9733fbd6da33dfc3575bec9ad4b0ac3808ec96120d3db64afb11 |
| C2 | Curated schema + row count | **pass** | rows=368 schema_ok=True |
| C3 | Manifest completeness | **pass** | missing=none; unit=GWh |
| C4 | Spot values vs Month (GWh) Gross production | **pass** | 3/3 samples match |
| C5 | Geography + unit + status vocabulary | **pass** | geo={'K02000001'} units={'GWh'} statuses={'final': 367, 'provisional': 1} |

## Summary
- Pass: 5/5
- Fail: 0
- Blockers: none
