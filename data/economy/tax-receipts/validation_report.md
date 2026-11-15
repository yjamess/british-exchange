# QA report — tax-receipts — 2026-11-14

## Scope
- Economy package: `data/economy/tax-receipts/`
- Raw: `raw/2026-11-14/ahhy_pusf.json`
- Curated: `curated/observations.csv`
- Series: ONS AHHY/PUSF
- Connector: `economy.connectors.tax_receipts` via `fiscal_series.TAX_RECEIPTS`

## Checks
| ID | Check | Result | Notes |
|----|-------|--------|-------|
| C1 | Checksum raw↔manifest | pass | ea9d05903b6d5287… (same as 2026-11-03 pin) |
| C2 | Manifest contract | pass | transformations say latest month provisional only |
| C3 | Curated schema | pass | Observation header |
| C4 | Rows/uniqueness/id | pass | rows=354 dupes=0 gaps=0 |
| C5 | Independent JSON recompute | pass | spot 1997-04 / 2012-01 / 2026-09 match |
| C6 | Latest period spot-check | pass | raw=88127 curated=88127.0 (2026-09) |
| C7 | Status/revision notes | pass | statuses={'final': 353, 'provisional': 1} |

## Summary
- Overall: **pass** (Economy self-QA)
- Rows: 354 (monthly; 1997-04-01 → 2026-09-01)
- Latest curated value: 88127.0 (£ million, NSA (PS taxes + NICs))
- Official release date: **2026-10-20** (JSON `description.releaseDate`; ONS page may show 21 Oct)
- Next PSF: **20 November 2026** — re-pin then
- Blockers for Ready: independent Validation under `data/qa/` not yet run

## Accounting reminders for Validation
- AHHY is PSF **accruals / national accounts**, not HMRC cash.
- Not ANBT (total current receipts includes non-tax income).
- Period levels only; FYTD is derived, not stored.
