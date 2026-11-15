# tes-by-function

**Owner:** Economy agent
**Status:** Validation-ready (Economy self-QA) — **not** Registry Ready
**indicator_id:** `tes-by-function`
**Source:** PSS July 2026 Table 5.4 (TES / COFOG), £ million, UK public sector, financial year

TES is expenditure on services. It is not this table's TME. This table's TME is not monthly EBFT.

## Reproduce

```bash
uv run python -m economy.connectors.tes_by_function
```

## What is curated

| Role | What | Chart as a function slice? |
|------|------|----------------------------|
| `function` | Ten COFOG level-1 rows, current and capital | Yes, these ten only |
| `eu-transactions` | EU transactions, published sign | No. Inside TES, outside the ten |
| `tes-total` | Published current, capital, and total TES | No. It is the total |
| `bridge` | Accounting adjustments (current, capital, total) | No. Not a function |
| `table-tme` | This table's Total Managed Expenditure | No. Denominator is `hmt-table-tme` |

Of-which lines are not curated. Public-sector current and capital expenditure
are checked in self-QA and are not extra slices (they equal TES plus adjustments).

Do not add the rows together across roles. Leaves, totals, and bridges overlap.

## Spot — Health, 2024-25

Current 228,613 + capital 13,816 = **242,429**.

Same year: current TES 1,034,248 + capital TES 132,204 = TES **1,166,452**.
TES 1,166,452 + accounting adjustments **123,560** = table TME **1,290,012**.
EU transactions (current) = **-1,412**.

Published total TES + published accounting adjustments equals table TME in every pinned year. The current/capital split of those published totals is exact except: 2023-24: current+capital TES minus published TES = -1; current+capital adjustments minus published adjustments = 1. Same £1 million rounding class as the level-1 leaf gap. The published cells are stored unchanged. No residual was added.

## Leaf gap

Level-1 rows plus EU transactions can miss the published current total by £0–2 million.
The published TES total is stored. There is no residual function.

| Financial year | Side | Level-1 leaves | Published TES | Gap (£ million) |
|----------------|------|---------------:|--------------:|----------------:|
| 2021-22 | current (10 functions + EU) | 857,802 | 857,803 | -1 |
| 2021-22 | capital (10 functions) | 94,141 | 94,142 | -1 |
| 2022-23 | current (10 functions + EU) | 962,033 | 962,033 | 0 |
| 2022-23 | capital (10 functions) | 114,971 | 114,969 | 2 |
| 2023-24 | current (10 functions + EU) | 991,685 | 991,684 | 1 |
| 2023-24 | capital (10 functions) | 123,292 | 123,292 | 0 |
| 2024-25 | current (10 functions + EU) | 1,034,250 | 1,034,248 | 2 |
| 2024-25 | capital (10 functions) | 132,204 | 132,204 | 0 |
| 2025-26 | current (10 functions + EU) | 1,084,663 | 1,084,664 | -1 |
| 2025-26 | capital (10 functions) | 142,983 | 142,984 | -1 |

## Financial year versus monthly EBFT

Ready pin `data/economy/total-managed-expenditure/curated/observations.csv` (PSF release 2026-10-20).
Sums below are derived April–March totals of monthly EBFT, not an official financial-year series.

| Financial year | Sum of monthly EBFT | HMT table TME | Difference |
|----------------|--------------------:|--------------:|-----------:|
| 2021-22 | 1,051,427 | 1,040,888 | 10,539 |
| 2022-23 | 1,178,953 | 1,160,692 | 18,261 |
| 2023-24 | 1,258,195 | 1,230,807 | 27,388 |
| 2024-25 | 1,294,828 | 1,290,012 | 4,816 |
| 2025-26 | 1,365,598 | 1,360,122 | 5,476 |

Do not rescale this package onto `total-managed-expenditure`.

## Raw

- File: `raw/2026-11-15/July_PSS_2026_Chapter_5.xlsx`
- SHA-256: `d61db8cad4f4333b192022e63979237d24dbdace7b354a846af2f4ac18b37436`
- Release date on the pin: 2026-07-29

2025-26 is `estimated` (first outturn estimate). 2021-22 to 2024-25 are `final`.

Docs: `docs/handover-economy-07-function-pin.md`
