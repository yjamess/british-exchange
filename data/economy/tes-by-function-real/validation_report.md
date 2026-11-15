# QA report — tes-by-function-real — 2026-11-15

Economy self-QA. **Not** independent Validation and **not** Registry Ready.

## Scope

- Package: `data/economy/tes-by-function-real/`
- Connector: `economy.connectors.tes_by_function_real`
- Workbook: PSS July 2026 Chapter 4, sheet `4_3`
- Companion check only: sheet `4_2` (nominal £ billion). Not curated.
- Price base: 2025-26 prices. Real-terms figures are the nominal figures adjusted to 2025-26 price levels using GDP deflators from the Office for National Statistics (released 30 June 2026).
- PESA plan years are not in these pins. Where PESA prints plan years, it also uses OBR GDP deflator forecasts from the 3 March 2026 Economic and fiscal outlook. That forecast deflator is not applied here.
- SHA-256: `573625f73c0e311ff68c5635691801be955fd466cd9b5b4a0e00b8173852195c`
- Years: 2003-04 to 2025-26 outturn. No plan years.
- OSCAR: absent (correct)
- Monthly EBFT was not deflated (correct)

## Checks

| ID | Check | Result | Notes |
|----|-------|--------|-------|
| F1 | Health 2024-25 = 250.8 £ billion, 2025-26 prices | pass | 250.8 |
| F2 | Table 4.2 Health 2024-25 = 242.4, not curated | pass | 242.4 |
| F3 | Level-1 + EU versus TES, and TES + adjustments versus table TME, within £0.2 billion | pass | max leaf 0.2; max bridge 0.1 |
| F4 | No residual function; of-which lines skipped | pass | skipped 8 |
| F5 | 2025-26 real curated rows equal Table 4.2 | pass | price base |
| F6 | 2025-26 estimated; no plan years; unit is £ billion | pass | 23 years |
| F7 | EBFT not deflated; real table TME is not real monthly EBFT | pass | manifest caveats |

Curated rows: **322**.

## Rounding — every pinned year

| Financial year | Level-1 + EU | Published TES | Leaf gap | Adjustments | Table TME | TES+adjustments minus TME |
|----------------|-------------:|--------------:|---------:|------------:|----------:|---------------------------:|
| 2003-04 | 801.0 | 801.0 | 0.0 | 81.1 | 882.0 | 0.1 |
| 2004-05 | 835.2 | 835.2 | 0.0 | 91.4 | 926.6 | 0.0 |
| 2005-06 | 865.9 | 866.0 | -0.1 | 86.8 | 952.8 | 0.0 |
| 2006-07 | 879.0 | 878.9 | 0.1 | 90.9 | 969.8 | 0.0 |
| 2007-08 | 914.8 | 914.8 | 0.0 | 95.4 | 1,010.2 | 0.0 |
| 2008-09 | 957.6 | 957.6 | 0.0 | 103.8 | 1,061.4 | 0.0 |
| 2009-10 | 1,000.7 | 1,000.7 | 0.0 | 100.0 | 1,100.7 | 0.0 |
| 2010-11 | 1,014.5 | 1,014.5 | 0.0 | 101.8 | 1,116.4 | -0.1 |
| 2011-12 | 997.2 | 997.4 | -0.2 | 99.3 | 1,096.7 | 0.0 |
| 2012-13 | 984.8 | 984.8 | 0.0 | 113.0 | 1,097.7 | 0.1 |
| 2013-14 | 980.4 | 980.3 | 0.1 | 102.8 | 1,083.1 | 0.0 |
| 2014-15 | 984.2 | 984.1 | 0.1 | 114.0 | 1,098.1 | 0.0 |
| 2015-16 | 997.4 | 997.3 | 0.1 | 103.7 | 1,101.0 | 0.0 |
| 2016-17 | 988.9 | 988.9 | 0.0 | 114.6 | 1,103.5 | 0.0 |
| 2017-18 | 1,006.9 | 1,007.0 | -0.1 | 119.4 | 1,126.4 | 0.0 |
| 2018-19 | 1,014.4 | 1,014.3 | 0.1 | 109.7 | 1,124.0 | 0.0 |
| 2019-20 | 1,022.4 | 1,022.6 | -0.2 | 109.4 | 1,132.0 | 0.0 |
| 2020-21 | 1,229.6 | 1,229.6 | 0.0 | 111.2 | 1,340.7 | 0.1 |
| 2021-22 | 1,154.4 | 1,154.5 | -0.1 | 107.9 | 1,262.4 | 0.0 |
| 2022-23 | 1,220.3 | 1,220.4 | -0.1 | 94.8 | 1,315.2 | 0.0 |
| 2023-24 | 1,200.1 | 1,200.3 | -0.2 | 124.7 | 1,325.0 | 0.0 |
| 2024-25 | 1,206.5 | 1,206.6 | -0.1 | 127.8 | 1,334.5 | -0.1 |
| 2025-26 | 1,227.7 | 1,227.6 | 0.1 | 132.5 | 1,360.1 | 0.0 |

Positive leaf gap means the leaves are above published TES. The published total is kept.

## Summary

- Overall: **pass** (Economy self-QA)
- Blockers for Ready: independent Validation `EC-VAL-07C`
