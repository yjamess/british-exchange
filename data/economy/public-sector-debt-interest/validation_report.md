# QA report — public-sector-debt-interest — 2026-11-03

## Scope
- Economy package: `data/economy/public-sector-debt-interest/`
- Raw: `raw/2026-11-03/nmfx_pusf.json`
- Curated: `curated/observations.csv`
- Series: ONS NMFX/PUSF

## Checks
| ID | Check | Result | Notes |
|----|-------|--------|-------|
| C1 | Checksum raw↔manifest | pass | 56e3bf137fbb764f |
| C2 | Manifest contract | pass | missing=none |
| C3 | Curated schema | pass | True |
| C4 | Rows/uniqueness/id | pass | rows=354 dupes=0 gaps=0 |
| C5 | Independent JSON recompute | pass | mismatches=0 extra=0 |
| C6 | Latest period spot-check | pass | raw=10933 curated=10933.0 |
| C7 | Status/revision notes | pass | statuses={'provisional'} |

## Summary
- Overall: **pass**
- Rows: 354 (monthly; 1997-04-01 → 2026-09-01)
- Latest curated value: 10933.0 (£ million, NSA (CG net interest payable))
- Official release date: 2026-10-20
- Blockers: none

Economy self-QA (wave Y2). Independent Validation may re-run checks under `data/qa/`.
