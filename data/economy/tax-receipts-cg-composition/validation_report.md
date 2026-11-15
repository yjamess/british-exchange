# QA report — tax-receipts-cg-composition — 2026-11-15

## Scope
- Economy package: `data/economy/tax-receipts-cg-composition/`
- Connector: `economy.connectors.tax_receipts_cg_composition`
- Identity: `NMBY + NMCU + LIQR = MF6P`
- MF6P total: Ready `tax-receipts-composition` (read-only) + pinned PUSF JSON

## Checks
| ID | Check | Result | Notes |
|----|-------|--------|-------|
| C1 | Raw evidence pinned | pass | 5 files |
| C2 | Ready four-head package untouched | pass | read-only MF6P cross-check |
| C3 | Identity ≥3 months vs pinned MF6P | pass | ok=354 fail=0 |
| C4 | Pinned MF6P matches Ready composition | pass | mismatches=0 |
| C5 | Provisional latest only | pass | statuses={'missing': 51, 'final': 1059, 'provisional': 3} |
| C6 | No HMRC cash under AHHY/MF6P | pass | NAB leaves only |
| C7 | No deeper incomplete residual | pass | LIBR/NZGF/CPRN deferred |

## Row counts

| Series | Rows |
|--------|------|
| NMBY | 405 |
| NMCU | 354 |
| LIQR | 354 |
| **Total curated** | **1113** |

## Identity spot (≥3 months)

| Period | NMBY | NMCU | LIQR | Sum | MF6P | Diff |
|--------|------|------|------|-----|------|------|
| 2026-04-01 | 32,365 | 30,805 | 2,379 | 65,549 | 65,549 | 0.0 |
| 2026-05-01 | 31,289 | 32,132 | 2,547 | 65,968 | 65,968 | 0.0 |
| 2026-06-01 | 31,820 | 35,381 | 2,643 | 69,844 | 69,844 | 0.0 |
| 2026-07-01 | 31,702 | 48,323 | 2,609 | 82,634 | 82,634 | 0.0 |
| 2026-08-01 | 30,912 | 33,370 | 2,348 | 66,630 | 66,630 | 0.0 |
| 2026-09-01 | 31,454 | 32,087 | 2,741 | 66,282 | 66,282 | 0.0 |

## Summary
- Overall: **pass** (Economy self-QA)
- MF6P ready source: data/economy/tax-receipts-composition/curated/observations.csv (series=MF6P; read-only)
- Blockers for Ready: independent Validation `EC-VAL-06B-DRILL`
