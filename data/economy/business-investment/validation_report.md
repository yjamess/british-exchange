# QA report — business-investment — 2026-11-03

## Scope
- Economy package: `data/economy/business-investment/`
- Raw: `raw/2026-11-03/npel_pn2.json`
- Curated: `curated/observations.csv`
- Series: ONS NPEL/PN2

## Checks
| ID | Check | Result | Notes |
|----|-------|--------|-------|
| C1 | Checksum raw↔manifest | pass | 41125202c10b9399 |
| C2 | Manifest contract | pass | missing=none |
| C3 | Curated schema | pass | True |
| C4 | Rows/uniqueness/id | pass | rows=118 dupes=0 gaps=0 |
| C5 | Independent JSON recompute | pass | mismatches=0 extra=0 |
| C6 | Latest period spot-check | pass | raw=78413 curated=78413.0 |
| C7 | Status/revision notes | pass | statuses={'provisional'} |

## Summary
- Overall: **pass**
- Rows: 118 (quarterly; 1997-01-01 → 2026-04-01)
- Latest curated value: 78413.0 (£ million chained volume, SA)
- Official release date: 2026-08-12
- Blockers: none

Economy self-QA (wave Y2). Independent Validation may re-run checks under `data/qa/`.
