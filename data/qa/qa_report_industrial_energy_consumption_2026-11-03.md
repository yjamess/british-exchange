# QA report — industrial energy consumption — 2026-11-03

## Scope
- Indicator: `industrial-energy-consumption` (DESNZ ECUK Table C1)
- Raw: `data/energy/industrial-energy-consumption/raw/2026-11-03/ECUK_2026_Consumption_tables.xlsx`
- Curated: `data/energy/industrial-energy-consumption/curated/observations.csv` (616 rows)
- Manifest: `data/energy/industrial-energy-consumption/manifest.yaml`

## Checks
| ID | Check | Result | Notes |
|----|-------|--------|-------|
| C1 | Pinned raw SHA-256 | **pass** | e0b73e341a009e066f067492607c940d8df155c00d40568430bfbbe77f0e4bd2 |
| C2 | Curated schema + row count | **pass** | rows=616 schema_ok=True |
| C3 | Manifest completeness | **pass** | missing=none; unit=ktoe |
| C4 | Spot values vs ECUK Table C1 Industry | **pass** | 4/4 samples match |
| C5 | Total vs component sum residual (Note 2 BFG) | **pass** | sum(components)=17319.150392662654 Total=17321.83 residual=2.6796 |
| C6 | Geography + unit + status vocabulary | **pass** | geo={'K02000001'} units={'ktoe'} statuses={'final': 569, 'missing': 47} |

## Summary
- Pass: 6/6
- Fail: 0
- Blockers: none
