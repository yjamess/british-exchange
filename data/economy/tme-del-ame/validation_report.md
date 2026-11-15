# QA report — tme-del-ame — 2026-11-15

Economy self-QA. **Not** independent Validation and **not** Registry Ready.

## Scope

- Package: `data/economy/tme-del-ame/`
- Connector: `economy.connectors.tme_del_ame`
- Workbook: PSS July 2026 Chapter 1, sheet `Table_1_1`
- SHA-256: `ff40d00e69d7b5cb2db4504e24ba774dd09b181ac676d0518ab0e16581305dbe`
- OSCAR: absent (correct)
- PESA plan years: absent (correct)

## Checks

| ID | Check | Result | Notes |
|----|-------|--------|-------|
| V4 | Total DEL + Departmental AME + Other AME = table TME, every pinned year | pass | see table |
| V5 | Denominator is this table's TME, not monthly EBFT; no Tax−Spend=Borrow; no OSCAR | pass | manifest caveats |
| V6 | 2025-26 estimated; no plan years | pass | five outturn years only |
| V7 | OSCAR files absent | pass | correct for this pin |
| DEL | Total DEL is not resource DEL + capital DEL | pass | 581,165 vs 595,892 in 2024-25 |
| Sign | 2021-22 Other AME stays negative | pass | -167,119 |

Curated rows: **20**.

## V4 — control totals

| Financial year | Total DEL | Departmental AME | Other AME | Sum | Table TME |
|----------------|----------:|-----------------:|----------:|----:|----------:|
| 2021-22 | 534,892 | 673,115 | -167,119 | 1,040,888 | 1,040,888 |
| 2022-23 | 541,362 | 407,356 | 211,974 | 1,160,692 | 1,160,692 |
| 2023-24 | 558,434 | 542,776 | 129,597 | 1,230,807 | 1,230,807 |
| 2024-25 | 595,892 | 605,568 | 88,552 | 1,290,012 | 1,290,012 |
| 2025-26 | 639,807 | 622,645 | 97,670 | 1,360,122 | 1,360,122 |

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
