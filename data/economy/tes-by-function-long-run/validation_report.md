# QA report — tes-by-function-long-run — 2026-11-15

Economy self-QA. **Not** independent Validation and **not** Registry Ready.

## Scope

- Package: `data/economy/tes-by-function-long-run/`
- Connector: `economy.connectors.tes_by_function_long_run`
- Workbook: PSS July 2026 Chapter 4, sheet `4_2`
- Companion check only: sheet `4_3` (real £ billion, 2025-26 prices). Not curated.
- Companion check only: `tes-by-function` Table 5.4 £ million spots, read and not copied.
- SHA-256: `573625f73c0e311ff68c5635691801be955fd466cd9b5b4a0e00b8173852195c`
- Years: 2003-04 to 2025-26 outturn. No plan years.
- Unit: £ billion, nominal, one decimal place.
- ESA Table 11: absent (correct)
- OSCAR: absent (correct)

## Checks

| ID | Check | Result | Notes |
|----|-------|--------|-------|
| L1 | Health 2024-25 = 242.4 £ billion, nominal | pass | 242.4 |
| L2 | Social protection 2024-25 = 386.3; TES 1,166.5; adjustments 123.6; TME 1,290.0 | pass | published cells |
| L3 | EU transactions 2024-25 keep the published sign (−1.4) | pass | not a function |
| L4 | Level-1 + EU versus TES, and TES + adjustments versus table TME, within £0.2 billion | pass | max leaf 0.2; max bridge 0.1 |
| L5 | No residual function; of-which lines skipped | pass | skipped 8 |
| L6 | Table 4.3 Health 2024-25 is 250.8 and is not curated; 2025-26 nominal equals real | pass | 250.8 |
| L7 | 2025-26 estimated; no plan years; unit is nominal £ billion, not £ million | pass | 23 years |
| L8 | Table 5.4 £ million spots round to these £ billion cells; million rows not stored | pass | read-only |

Curated rows: **322**.

## Rounding — every pinned year

| Financial year | Level-1 + EU | Published TES | Leaf gap | Adjustments | Table TME | TES+adjustments minus TME |
|----------------|-------------:|--------------:|---------:|------------:|----------:|---------------------------:|
| 2003-04 | 449.0 | 449.0 | 0.0 | 45.4 | 494.4 | 0.0 |
| 2004-05 | 482.1 | 482.1 | 0.0 | 52.8 | 534.9 | 0.0 |
| 2005-06 | 513.6 | 513.6 | 0.0 | 51.5 | 565.1 | 0.0 |
| 2006-07 | 536.9 | 536.9 | 0.0 | 55.5 | 592.4 | 0.0 |
| 2007-08 | 569.8 | 569.8 | 0.0 | 59.4 | 629.2 | 0.0 |
| 2008-09 | 618.7 | 618.7 | 0.0 | 67.1 | 685.8 | 0.0 |
| 2009-10 | 654.9 | 654.9 | 0.0 | 65.5 | 720.3 | 0.1 |
| 2010-11 | 675.2 | 675.2 | 0.0 | 67.8 | 743.0 | 0.0 |
| 2011-12 | 678.0 | 678.0 | 0.0 | 67.5 | 745.5 | 0.0 |
| 2012-13 | 681.0 | 681.0 | 0.0 | 78.1 | 759.2 | -0.1 |
| 2013-14 | 692.0 | 692.0 | 0.0 | 72.6 | 764.6 | 0.0 |
| 2014-15 | 704.5 | 704.5 | 0.0 | 81.6 | 786.2 | -0.1 |
| 2015-16 | 719.0 | 719.0 | 0.0 | 74.7 | 793.7 | 0.0 |
| 2016-17 | 727.2 | 727.2 | 0.0 | 84.3 | 811.4 | 0.1 |
| 2017-18 | 749.9 | 749.9 | 0.0 | 88.9 | 838.8 | 0.0 |
| 2018-19 | 772.5 | 772.5 | 0.0 | 83.5 | 856.1 | -0.1 |
| 2019-20 | 799.4 | 799.4 | 0.0 | 85.5 | 884.9 | 0.0 |
| 2020-21 | 1,011.5 | 1,011.4 | 0.1 | 91.5 | 1,102.9 | 0.0 |
| 2021-22 | 952.0 | 951.9 | 0.1 | 88.9 | 1,040.9 | -0.1 |
| 2022-23 | 1,076.8 | 1,077.0 | -0.2 | 83.7 | 1,160.7 | 0.0 |
| 2023-24 | 1,115.0 | 1,115.0 | 0.0 | 115.8 | 1,230.8 | 0.0 |
| 2024-25 | 1,166.6 | 1,166.5 | 0.1 | 123.6 | 1,290.0 | 0.1 |
| 2025-26 | 1,227.7 | 1,227.6 | 0.1 | 132.5 | 1,360.1 | 0.0 |

Positive leaf gap means the leaves are above published TES. The published total is kept.
2022-23 is the year that reaches £0.2 billion. 2024-25 is £0.1 billion on both gaps.

## Summary

- Overall: **pass** (Economy self-QA)
- Blockers for Ready: independent Validation `EC-VAL-07D`
