# QA report — primary energy production — 2026-11-03

## Scope
- Indicator: `primary-energy-production` (DESNZ ET 1.1)
- Raw: `data/energy/primary-energy-production/raw/2026-11-03/ET_1.1_OCT_26.xlsx`
- Curated: `data/energy/primary-energy-production/curated/observations.csv` (2660 rows)
- Manifest: `data/energy/primary-energy-production/manifest.yaml`

## Checks
| ID | Check | Result | Notes |
|----|-------|--------|-------|
| C1 | Pinned raw SHA-256 | **pass** | d5989df64a338a5d89239c65eae2aaf3d8e9df8116a0061bfa57df7dba3b6c78 |
| C2 | Curated schema + row count | **pass** | rows=2660 schema_ok=True |
| C3 | Manifest completeness | **pass** | missing=none; unit=Mtoe |
| C4 | Spot values vs Month sheet + Main table | **pass** | 5/5 samples match |
| C5 | Aggregate Total vs component sum (Aug 2026) | **pass** | sum(components)=6.55 Total=6.549999999999999 |
| C6 | Geography + unit + status vocabulary | **pass** | geo={'K02000001'} units={'Mtoe'} statuses={'final': 2617, 'missing': 36, 'provisional': 7} |

## Summary
- Pass: 6/6
- Warn: 0
- Fail: 0
- Blockers: none
- Recommended next: Orchestrator marks registry **Ready** and runs `load_ready` iff no blockers.
