# QA report — tes-by-function — 2026-11-15

Economy self-QA. **Not** independent Validation and **not** Registry Ready.

## Scope

- Package: `data/economy/tes-by-function/`
- Connector: `economy.connectors.tes_by_function`
- Workbook: PSS July 2026 Chapter 5, sheet `5_4`
- SHA-256: `d61db8cad4f4333b192022e63979237d24dbdace7b354a846af2f4ac18b37436`
- ESA Table 11: absent (correct)
- OSCAR: absent (correct)
- Table 4.2 £ billion: not in this package (correct)

## Checks

| ID | Check | Result | Notes |
|----|-------|--------|-------|
| V1 | Published total TES + accounting adjustments = table TME, every pinned year | pass | exact |
| V1b | Current + capital versus the published TES and adjustments totals | pass | within £2 million; published cells kept |
| V2 | Health 2024-25 current + capital = 242,429 | pass | 228,613 + 13,816 |
| V3 | Level-1 + EU versus published TES documented; gap within £2 million; no residual function | pass | see table |
| V5 | Totals are HMT financial-year TES / table TME, not monthly EBFT; TME is not services; no Tax−Spend=Borrow; no OSCAR | pass | manifest caveats |
| V6 | 2025-26 estimated; no plan years | pass | five outturn years only |
| V7 | ESA and OSCAR files absent | pass | correct for this pin |

Curated rows: **140**. Of-which lines skipped: **15**.

## V1 — aggregate identity

| Financial year | Current TES | Capital TES | Total TES | Current+capital minus TES | Adjustments | TES+adjustments minus TME | Table TME |
|----------------|------------:|------------:|----------:|---------------------------:|------------:|---------------------------:|----------:|
| 2021-22 | 857,803 | 94,142 | 951,945 | 0 | 88,943 | 0 | 1,040,888 |
| 2022-23 | 962,033 | 114,969 | 1,077,002 | 0 | 83,690 | 0 | 1,160,692 |
| 2023-24 | 991,684 | 123,292 | 1,114,977 | -1 | 115,830 | 0 | 1,230,807 |
| 2024-25 | 1,034,248 | 132,204 | 1,166,452 | 0 | 123,560 | 0 | 1,290,012 |
| 2025-26 | 1,084,664 | 142,984 | 1,227,648 | 0 | 132,474 | 0 | 1,360,122 |

Published total TES + published accounting adjustments equals table TME in every pinned year. The current/capital split of those published totals is exact except: 2023-24: current+capital TES minus published TES = -1; current+capital adjustments minus published adjustments = 1. Same £1 million rounding class as the level-1 leaf gap. The published cells are stored unchanged. No residual was added.

## V2 — Health 2024-25

228,613 + 13,816 = 242,429.

Table 4.2 is not pinned, so the £242.4 billion companion cell is not re-checked here.

## V3 — leaf gap (no residual function)

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

Positive gap means the leaves are above the published total. The published total is kept.

## Expenditure bridge (checked, not curated)

Public sector current expenditure = current TES + current accounting adjustments.
Public sector capital expenditure = capital TES + capital accounting adjustments.
Those two published rows sum to table TME. They are not COFOG functions.

## EBFT gap (read-only)

Ready pin `data/economy/total-managed-expenditure/curated/observations.csv` (PSF release 2026-10-20).
Sums below are derived April–March totals of monthly EBFT, not an official financial-year series.

| Financial year | Sum of monthly EBFT | HMT table TME | Difference |
|----------------|--------------------:|--------------:|-----------:|
| 2021-22 | 1,051,427 | 1,040,888 | 10,539 |
| 2022-23 | 1,178,953 | 1,160,692 | 18,261 |
| 2023-24 | 1,258,195 | 1,230,807 | 27,388 |
| 2024-25 | 1,294,828 | 1,290,012 | 4,816 |
| 2025-26 | 1,365,598 | 1,360,122 | 5,476 |

## Summary

- Overall: **pass** (Economy self-QA)
- Blockers for Ready: independent Validation `EC-VAL-07B`
