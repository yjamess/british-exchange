# QA report — tax-receipts-composition — 2026-11-15

## Scope
- Economy package: `data/economy/tax-receipts-composition/`
- Connector: `economy.connectors.tax_receipts_composition`
- Identity: `MF6P + AIIH + NMHM + AHGR = AHHY`
- AHHY total: Ready `data/economy/tax-receipts/` (read-only)

## Checks
| ID | Check | Result | Notes |
|----|-------|--------|-------|
| C1 | Raw evidence pinned | pass | 5 files |
| C2 | AHGR not invented residual | pass | workbook Time Series; PUSF 404 probed |
| C3 | AHHY not forked | pass | cross-check Ready tax-receipts only |
| C4 | Identity ≥3 months | pass | ok=345 fail=0 |
| C5 | Provisional latest only | pass | statuses={'missing': 51, 'final': 1454, 'provisional': 4} |
| C6 | No HMRC cash / no JW2O total | pass | NAB heads only |

## Row counts

| Series | Rows |
|--------|------|
| MF6P | 354 |
| AIIH | 405 |
| NMHM | 405 |
| AHGR | 345 |
| **Total curated** | **1509** |

## Identity spot (≥3 months)

| Period | MF6P | AIIH | NMHM | AHGR | Sum | AHHY | Diff |
|--------|------|------|------|------|-----|------|------|
| 2026-04-01 | 65,549 | 14,801 | 4,450 | -141 | 84,659 | 84,659 | 0.0 |
| 2026-05-01 | 65,968 | 16,744 | 4,450 | -141 | 87,021 | 87,021 | 0.0 |
| 2026-06-01 | 69,844 | 18,011 | 4,449 | -140 | 92,164 | 92,164 | 0.0 |
| 2026-07-01 | 82,634 | 16,678 | 4,494 | -65 | 103,741 | 103,741 | 0.0 |
| 2026-08-01 | 66,630 | 17,567 | 4,494 | -65 | 88,626 | 88,626 | 0.0 |
| 2026-09-01 | 66,282 | 17,414 | 4,494 | -63 | 88,127 | 88,127 | 0.0 |

## Summary
- Overall: **pass** (Economy self-QA)
- AHGR source: Appendix D Time Series column AHGR (PUSF /timeseries/ahgr/pusf/data returned 404 at pin time)
- Blockers for Ready: independent Validation `EC-VAL-06B`
