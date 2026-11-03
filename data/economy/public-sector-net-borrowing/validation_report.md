# QA report — public-sector-net-borrowing — 2026-11-03

## Scope
- Economy package: `data/economy/public-sector-net-borrowing/`
- Raw: `raw/2026-11-03/dzls_pusf.json`
- Curated: `curated/observations.csv`
- Series: ONS DZLS/PUSF

## Checks
| ID | Check | Result | Notes |
|----|-------|--------|-------|
| C1 | Checksum raw↔manifest | pass | 6244b0066ca00a74 |
| C2 | Manifest contract | pass | missing=none |
| C3 | Curated schema | pass | True |
| C4 | Rows/uniqueness/id | pass | rows=405 dupes=0 gaps=0 |
| C5 | Independent JSON recompute | pass | mismatches=0 extra=0 |
| C6 | Latest period spot-check | pass | raw=24520 curated=24520.0 |
| C7 | Status/revision notes | pass | statuses={'missing', 'provisional'} |

## Summary
- Overall: **pass**
- Rows: 405 (monthly; 1993-01-01 → 2026-09-01)
- Latest curated value: 24520.0 (£ million, NSA (ex public sector banks))
- Official release date: 2026-10-20
- Blockers: none

Economy self-QA (wave Y2). Independent Validation may re-run checks under `data/qa/`.
