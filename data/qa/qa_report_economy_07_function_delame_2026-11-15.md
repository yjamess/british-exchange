# QA report — Economy 07 tes-by-function + tme-del-ame · 2026-11-15

## Scope

- Work plan: `EC-VAL-07B`
- Indicators: `tes-by-function` (PSS July 2026 Table 5.4) and `tme-del-ame` (Table 1.1)
- Handover: `docs/handover-economy-07-function-pin.md`
- Kickoff: `docs/agent-kickoff-validation-economy-07-function.md`
- Script: `validation.qa_economy_07_function_delame_2026_11_15`
- Vintage: raw `2026-11-15` · HMT file updated **2026-07-29** · unit £ million, financial year
- Read-only context: Ready `total-managed-expenditure` (EBFT, PSF **2026-10-20**)

## Independence

Validation read the pinned Chapter 5 and Chapter 1 workbooks and the curated CSVs.
It did not import the Economy connectors and did not edit `data/economy/`.
Economy self-QA JSON was not used as the source of the figures below.
A gap between summed monthly EBFT and HMT table TME is recorded as context.
It is not a reason to fail these pins and not a reason to rescale them.

## Checks

| ID | Check | Result | Notes |
|----|-------|--------|-------|
| V1 | Table 5.4 current+capital TES, and TES+adjustments = table TME | **warn** | 2023-24 current+capital TES is £1m below the published TES total and the adjustments split is £1m above; published cells stored unchanged; TES+adjustments still equals table TME in every year |
| V2 | Health 2024-25 current + capital = 242,429 | **pass** | Health 2024-25 current 228,613 + capital 13,816 = 242,429 in the sheet and in curated |
| V3 | Level-1 + EU vs published TES; no residual function | **pass** | Leaf gaps are within £2m; 15 of-which lines skipped; no residual function |
| V4 | Table 1.1 Total DEL + Departmental AME + Other AME = table TME | **pass** | Total DEL + Departmental AME + Other AME = table TME; 2024-25 = 1,290,012; 2021-22 Other AME negative |
| V5 | HMT financial-year labels; TME is not services; no Tax−Spend=Borrow; no OSCAR rows | **pass** | Manifests say HMT financial-year TES / table TME, not monthly EBFT or services; no OSCAR rows |
| V6 | 2025-26 estimated; no PESA plan years | **pass** | 2025-26 is estimated (bulletin: first estimate; accounts incomplete); no PESA plan years |
| V7 | ESA, OSCAR, and Table 4.2 absent | **pass** | No ESA, OSCAR, or Table 4.2 files, sheets, or curated rows |
| C-extra | Raw sha256, shared table TME, Total DEL not rebuilt | **pass** | Raw sha256 matches both manifests; table TME is identical; Total DEL is not resource+capital |
| EBFT | Monthly EBFT April–March sum vs HMT table TME (context, not a pin fail) | **warn** | 2021-22 EBFT 1,051,427 vs HMT 1,040,888 (difference 10,539); 2022-23 EBFT 1,178,953 vs HMT 1,160,692 (difference 18,261); 2023-24 EBFT 1,258,195 vs HMT 1,230,807 (difference 27,388); 2024-25 EBFT 1,294,828 vs HMT 1,290,012 (difference 4,816); 2025-26 EBFT 1,365,598 vs HMT 1,360,122 (difference 5,476) |

## Spots recomputed from the workbooks

### V1 — published TES, adjustments, and this table's TME

| Financial year | Current TES | Capital TES | Current+capital minus published TES | Published TES | Adjustments | TES+adjustments minus TME | Table TME |
|---|---|---|---|---|---|---|---|
| 2021-22 | 857,803 | 94,142 | 0 | 951,945 | 88,943 | 0 | 1,040,888 |
| 2022-23 | 962,033 | 114,969 | 0 | 1,077,002 | 83,690 | 0 | 1,160,692 |
| 2023-24 | 991,684 | 123,292 | -1 | 1,114,977 | 115,830 | 0 | 1,230,807 |
| 2024-25 | 1,034,248 | 132,204 | 0 | 1,166,452 | 123,560 | 0 | 1,290,012 |
| 2025-26 | 1,084,664 | 142,984 | 0 | 1,227,648 | 132,474 | 0 | 1,360,122 |

2023-24 is the only non-zero split. Published total TES stays 1,114,977, not the component sum. Curated stores that published cell.

### V2 — Health, 2024-25

Current 228,613 + capital 13,816 = **242,429**. Same cells in curated. Table 4.2 (£ billion) is not in this package.

### V3 — level-1 leaves plus EU, versus published TES

| Financial year | Side | Leaves | Published TES | Gap |
|---|---|---|---|---|
| 2021-22 | current (10 + EU) | 857,802 | 857,803 | -1 |
| 2021-22 | capital (10) | 94,141 | 94,142 | -1 |
| 2022-23 | current (10 + EU) | 962,033 | 962,033 | 0 |
| 2022-23 | capital (10) | 114,971 | 114,969 | 2 |
| 2023-24 | current (10 + EU) | 991,685 | 991,684 | 1 |
| 2023-24 | capital (10) | 123,292 | 123,292 | 0 |
| 2024-25 | current (10 + EU) | 1,034,250 | 1,034,248 | 2 |
| 2024-25 | capital (10) | 132,204 | 132,204 | 0 |
| 2025-26 | current (10 + EU) | 1,084,663 | 1,084,664 | -1 |
| 2025-26 | capital (10) | 142,983 | 142,984 | -1 |

EU transactions, 2024-25 current: **-1,412** (published sign kept). Of-which lines on the sheet: **15**, none curated.

### V4 — DEL, AME, and this table's TME

| Financial year | Total DEL | Departmental AME | Other AME | Sum minus TME | Table TME |
|---|---|---|---|---|---|
| 2021-22 | 534,892 | 673,115 | -167,119 | 0 | 1,040,888 |
| 2022-23 | 541,362 | 407,356 | 211,974 | 0 | 1,160,692 |
| 2023-24 | 558,434 | 542,776 | 129,597 | 0 | 1,230,807 |
| 2024-25 | 595,892 | 605,568 | 88,552 | 0 | 1,290,012 |
| 2025-26 | 639,807 | 622,645 | 97,670 | 0 | 1,360,122 |

2024-25 resource DEL 469,578 + capital DEL 111,587 = **581,165**, not published Total DEL **595,892**. Those two lines are not curated.

Footnote 6 on the sheet: (6) Total DEL is given by resource DEL plus capital DEL. This excludes the Scottish Government Block Grant adjustments as shown in Table 1.3.

### C-extra — checksums and shared table TME

- Chapter 5 sha256: `d61db8cad4f4333b192022e63979237d24dbdace7b354a846af2f4ac18b37436`
- Chapter 1 sha256: `ff40d00e69d7b5cb2db4504e24ba774dd09b181ac676d0518ab0e16581305dbe`
- Table TME in both packages, every pinned year: 2021-22 1,040,888, 2022-23 1,160,692, 2023-24 1,230,807, 2024-25 1,290,012, 2025-26 1,360,122

### EBFT context — not a fail

| Financial year | Months | Sum of monthly EBFT | HMT table TME | Difference |
|---|---|---|---|---|
| 2021-22 | 12 | 1,051,427 | 1,040,888 | 10,539 |
| 2022-23 | 12 | 1,178,953 | 1,160,692 | 18,261 |
| 2023-24 | 12 | 1,258,195 | 1,230,807 | 27,388 |
| 2024-25 | 12 | 1,294,828 | 1,290,012 | 4,816 |
| 2025-26 | 12 | 1,365,598 | 1,360,122 | 5,476 |

Ready pin: `total-managed-expenditure`, PSF release 2026-10-20. April–March sums are derived. They are not an official financial-year series. Do not rescale COFOG or DEL shares onto EBFT.

## Method notes

- Geography on the curated rows is United Kingdom (`K02000001`). Frequency is annual. Values are nominal £ million.
- The workbook header stamps 2025-26 as outturn. The [PSS July 2026 bulletin](https://www.gov.uk/government/statistics/public-spending-statistics-release-july-2026/public-spending-statistics-july-2026) (updated 29 July 2026) says this release is the first estimate of 2025-26 outturn, and that not every department had published its 2025-26 annual report and accounts, so the figures can still be revised. `observation_status=estimated` matches that bulletin. 2021-22 to 2024-25 are `final`.
- Defence on Table 5.4 is the UN COFOG row. Debt interest stays inside General public services (an of-which line, not a curated function).
- HMT's statistics timetable lists the next Public Spending Statistics 2025/26 update on **18 November 2026**. That is a re-pin later, not a fail of this vintage.

## Summary

- **Verdict: pass** on V1–V7 + C-extra (7 pass / 1 warn / 0 fail).
- EBFT context: **warn**. Inequality with HMT table TME is expected.
- **Recommend Ready: yes** for `tes-by-function` and `tme-del-ame` on this PSS July 2026 vintage. Orchestrator flips the registry. Validation did not edit Notion.
- Do not rewrite the 2023-24 published cells to remove the £1 million split.
- Do not drop Other AME, invent a residual function, or rebuild Total DEL from resource DEL + capital DEL.

## Blockers

- None that block Ready on this vintage.
- 2025-26 remains a first estimate and can move at the next PSS release (timetable: 18 November 2026).
- HMT table TME and summed monthly EBFT stay different series. The 2024-25 gap on this pair is about £4.8 billion; the 2023-24 gap is about £27.4 billion.

## Reproduce

```bash
uv run python -m validation.qa_economy_07_function_delame_2026_11_15
```
