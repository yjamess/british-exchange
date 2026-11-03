# QA report — energy imports and exports — 2026-11-03

## Scope
- Indicator: `energy-imports-and-exports` (DESNZ ET 1.3)
- Raw: `data/energy/energy-imports-and-exports/raw/2026-11-03/ET_1.3_SEP_26.xlsx`
- Curated: `data/energy/energy-imports-and-exports/curated/observations.csv` (228 rows)
- Manifest: `data/energy/energy-imports-and-exports/manifest.yaml`

## Checks
| ID | Check | Result | Notes |
|----|-------|--------|-------|
| C1 | Pinned raw SHA-256 | **pass** | 7e3d230e7cdcc45f3eef2b1ec5c866a30ffc26218fdd486cbae59f55eb34bf81 |
| C2 | Curated schema + row count | **pass** | rows=228 schema_ok=True |
| C3 | Manifest completeness | **pass** | missing=none; unit=ktoe |
| C4 | Spot values vs Quarter supply and use sheet | **pass** | samples match |
| C5 | Flows + geography + unit | **pass** | flows={'flow=Exports', 'flow=Imports'} geo={'K02000001'} units={'ktoe'} statuses={'final': 226, 'provisional': 2} |

## Summary
- Pass: 5/5
- Fail: 0
- Blockers: none
