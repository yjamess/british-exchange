# QA report — industrial electricity prices — 2026-11-03

## Scope
- Indicator: `industrial-electricity-prices` (DESNZ QEP 3.1.2)
- Raw: `data/energy/industrial-electricity-prices/raw/2026-11-03/table_311_314.xlsx`
- Curated: `data/energy/industrial-electricity-prices/curated/observations.csv` (660 rows)
- Manifest: `data/energy/industrial-electricity-prices/manifest.yaml`

## Checks
| ID | Check | Result | Notes |
|----|-------|--------|-------|
| C1 | Pinned raw SHA-256 | **pass** | 56d562fcf3f928ff3341e84a98713dab02cefab4d1c0cc178561efc2bda36a0d |
| C2 | Curated schema + row count | **pass** | rows=660 schema_ok=True |
| C3 | Manifest completeness (GB geography) | **pass** | missing=none; geo=Great Britain (K03000001) |
| C4 | Spot values vs QEP 3.1.2 Electricity columns | **pass** | samples match |
| C5 | GB geography + unit + bands | **pass** | geo={'K03000001'} units={'p/kWh'} bands=['Average', 'Large', 'Large of which Extra large', 'Large of which Moderately large', 'Medium', 'Small'] statuses={'final': 660} |

## Summary
- Pass: 5/5
- Fail: 0
- Blockers: none
