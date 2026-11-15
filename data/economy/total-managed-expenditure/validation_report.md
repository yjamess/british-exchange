# QA report — total-managed-expenditure — 2026-11-14

## Scope
- Economy package: `data/economy/total-managed-expenditure/`
- Raw: `raw/2026-11-14/ebft_pusf.json`
- Curated: `curated/observations.csv`
- Series: ONS EBFT/PUSF

## Checks
| ID | Check | Result | Notes |
|----|-------|--------|-------|
| C1 | Checksum raw↔manifest | pass | 2669443f7b262618 (unchanged vs 2026-11-03 pin) |
| C2 | Manifest contract | pass | missing=none; transform text = latest provisional only |
| C3 | Curated schema | pass | True |
| C4 | Rows/uniqueness/id | pass | rows=354 dupes=0 gaps=0 |
| C5 | Independent JSON recompute | pass | connector re-pin; spot mismatches=0 |
| C6 | Latest period spot-check | pass | raw=123791 curated=123791.0 |
| C7 | Status/revision notes | pass | statuses={'final': 353, 'provisional': 1} |

## Summary
- Overall: **pass** (Economy self-QA)
- Rows: 354 (monthly; 1997-04-01 → 2026-09-01)
- Latest curated value: 123791.0 (£ million, NSA) · **provisional**
- Prior month: 116488.0 (2026-08) · **final**
- Official release date: 2026-10-20
- Blockers: none for numerical self-consistency

Economy self-QA (EC-G2-07). Independent Validation must re-run under `data/qa/` before Registry Ready.
