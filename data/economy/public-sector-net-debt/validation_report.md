# QA report — public-sector-net-debt — 2026-11-03

## Scope
- Economy package: `data/economy/public-sector-net-debt/`
- Raw: `raw/2026-11-03/hf6w_pusf.json`
- Curated: `curated/observations.csv`
- Series: ONS HF6W/PUSF

## Checks
| ID | Check | Result | Notes |
|----|-------|--------|-------|
| C1 | Checksum raw↔manifest | pass | 1c277e826426a35d |
| C2 | Manifest contract | pass | missing=none |
| C3 | Curated schema | pass | True |
| C4 | Rows/uniqueness/id | pass | rows=619 dupes=0 gaps=0 |
| C5 | Independent JSON recompute | pass | mismatches=0 extra=0 |
| C6 | Latest period spot-check | pass | raw=3005.0 curated=3005.0 |
| C7 | Status/revision notes | pass | statuses={'missing', 'provisional'} |

## Summary
- Overall: **pass**
- Rows: 619 (monthly; 1975-03-01 → 2026-09-01)
- Latest curated value: 3005.0 (£ billion, NSA (ex public sector banks))
- Official release date: 2026-10-20
- Blockers: none

Economy self-QA (wave Y2). Independent Validation may re-run checks under `data/qa/`.
