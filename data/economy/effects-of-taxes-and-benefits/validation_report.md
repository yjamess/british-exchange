# Self-QA — `effects-of-taxes-and-benefits`

**Date:** 2026-11-15  
**Agent:** Economy  
**Edition:** ETB FYE 2024 · released 2025-09-25  
**Result:** **14 / 14 pass** (see `curated/self_qa.json`)

## Checks

| Check | Expected | Result |
|-------|----------|--------|
| Table 8 Bottom direct % gross income | 15.7 | pass |
| Table 8 Bottom indirect % gross income | 21.0 | pass |
| Table 8 Bottom all taxes % gross income | 36.7 | pass |
| Table 8 Bottom indirect % disposable income | 24.9 | pass |
| Table 8 Bottom indirect % expenditure | 16.5 | pass |
| Table 8 Top direct % gross income | 28.8 | pass |
| Table 8 Top indirect % gross income | 7.5 | pass |
| Table 8 Bottom direct+indirect = all (gross) | 36.7 | pass |
| Table 2a Bottom total direct £ | 3696 | pass |
| Table 2a Bottom total indirect £ | 4929 | pass |
| Table 2a All individuals total direct £ | 15743 | pass |
| Table 2a All individuals total indirect £ | 7363 | pass |
| No invented direct×disposable / direct×expenditure rows | 0 | pass |
| Row counts (Table 8 = 30, Table 2a = 12, total = 42) | 42 | pass |

## Method notes for Validation

- Raw sha256 must match `manifest.yaml` / `raw/2026-11-15/SHA256SUMS`.
- Spot cells against workbook sheets **Table 8** and **Table 2a** (not bulletin prose alone).
- Confirm curated notes never claim fairness or individual liabilities.
- Confirm denominators only where ONS Table 8 publishes them.

## Not in scope this pin

- Multi-year timeseries editions
- Table 9 (non-retired) / retired splits
- Component tax heads (VAT, Income Tax, …) inside Table 8/2a
- Frontend / EmptyStage replacement
