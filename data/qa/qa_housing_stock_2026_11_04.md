# QA — Housing Stock & Tenure (Domain 04) · 2026-11-04

Independent numerical checks against pinned MHCLG / ONS extracts.

| Indicator | Result | Detail |
| --- | --- | --- |
| `vacant-dwellings` | PASS | sha=16d404d2595e…; rows=17072; spot E92000001=754264 |
| `dwelling-stock-by-region` | PASS | sha=2fb92e0ad640…; rows=2100; spot E92000001=2.58264e+07 |
| `dwelling-stock-by-district` | PASS | sha=4c6a22b92aa5…; rows=26235; spot E92000001=2.58264e+07 |
| `dwelling-type` | PASS | sha=af7b512615ea…; rows=108; spot E92000001=2.34361e+07 |

## Method notes

- Table 100 private sector is not OO/PR split; Geography view uses Table 109 for tenure.
- Table 615 vacants ≠ second homes ≠ census unoccupied.
- TS044 is households on Census Day 2021-03-21 — not Live Table dwelling stock.
- Vacancy rate on the canvas is Exchange-derived (615 ÷ 100).

**Verdict:** PASS

