# QA report — tax-receipts — 2026-11-03

## Scope
- Economy package: `data/economy/tax-receipts/`
- Raw: `raw/2026-11-03/ahhy_pusf.json`
- Curated: `curated/observations.csv`
- Series: ONS AHHY/PUSF

## Checks
| ID | Check | Result | Notes |
|----|-------|--------|-------|
| C1 | Checksum raw↔manifest | pass | ea9d05903b6d5287 |
| C2 | Manifest contract | pass | missing=none |
| C3 | Curated schema | pass | True |
| C4 | Rows/uniqueness/id | pass | rows=354 dupes=0 gaps=0 |
| C5 | Independent JSON recompute | pass | mismatches=0 extra=0 |
| C6 | Latest period spot-check | pass | raw=88127 curated=88127.0 |
| C7 | Status/revision notes | pass | statuses={'provisional'} |

## Summary
- Overall: **pass**
- Rows: 354 (monthly; 1997-04-01 → 2026-09-01)
- Latest curated value: 88127.0 (£ million, NSA (PS taxes + NICs))
- Official release date: 2026-10-20
- Blockers: none

Economy self-QA (wave Y2). Independent Validation may re-run checks under `data/qa/`.
