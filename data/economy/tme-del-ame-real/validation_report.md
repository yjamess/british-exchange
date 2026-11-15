# QA report — tme-del-ame-real — 2026-11-15

Economy self-QA. **Not** independent Validation and **not** Registry Ready.

## Scope

- Package: `data/economy/tme-del-ame-real/`
- Connector: `economy.connectors.tme_del_ame_real`
- Workbook: PSS July 2026 Chapter 1, sheet `Table_1_2`
- Price base: 2025-26 prices. Real-terms figures are the nominal figures adjusted to 2025-26 price levels using GDP deflators from the Office for National Statistics (released 30 June 2026).
- PESA plan years are not in these pins. Where PESA prints plan years, it also uses OBR GDP deflator forecasts from the 3 March 2026 Economic and fiscal outlook. That forecast deflator is not applied here.
- SHA-256: `ff40d00e69d7b5cb2db4504e24ba774dd09b181ac676d0518ab0e16581305dbe`
- OSCAR: absent (correct)
- PESA plan years: absent (correct)
- Monthly EBFT was not deflated (correct)

## Checks

| ID | Check | Result | Notes |
|----|-------|--------|-------|
| R1 | Total DEL + Departmental AME + Other AME = real table TME, every pinned year | pass | see table |
| R2 | 2025-26 real control totals and resource DEL equal nominal Table 1.1 | pass | resource DEL 496,670 |
| R3 | Total DEL is not resource DEL + capital DEL | pass | 601,189 vs 616,422 in 2024-25 |
| R4 | Earlier real table TME is not equal to nominal table TME | pass | price base is 2025-26 only |
| R5 | 2025-26 estimated; no plan years; unit is £ million at 2025-26 prices | pass | five outturn years |
| R6 | Other AME kept, including 2021-22 negative | pass | -202,678 |
| R7 | EBFT not deflated; real table TME is not real monthly EBFT | pass | manifest caveats |

Curated rows: **20**.

## R1 — control totals

| Financial year | Total DEL | Departmental AME | Other AME | Sum | Table TME |
|----------------|----------:|-----------------:|----------:|----:|----------:|
| 2021-22 | 648,705 | 816,338 | -202,678 | 1,262,365 | 1,262,365 |
| 2022-23 | 613,433 | 461,587 | 240,194 | 1,315,214 | 1,315,214 |
| 2023-24 | 601,148 | 584,293 | 139,510 | 1,324,951 | 1,324,951 |
| 2024-25 | 616,422 | 626,432 | 91,603 | 1,334,457 | 1,334,457 |
| 2025-26 | 639,807 | 622,645 | 97,670 | 1,360,122 | 1,360,122 |

## R2 — price base

2025-26 resource DEL 496,670 (Table 1.2 and Table 1.1).
Total DEL 639,807; Departmental AME 622,645; Other AME 97,670; table TME 1,360,122.

## Summary

- Overall: **pass** (Economy self-QA)
- Blockers for Ready: independent Validation `EC-VAL-07C`
