# QA report — Economy 07 real-terms pins · 2026-11-15

## Scope

- Work plan: `EC-VAL-07C`
- Indicators: `tme-del-ame-real` (PSS July 2026 Table 1.2, £ million, 2025-26 prices) and `tes-by-function-real` (Table 4.3, £ billion, 2025-26 prices)
- Handover: `docs/handover-economy-07-real-pin.md`
- Kickoff: `docs/agent-kickoff-validation-economy-07-real.md`
- Script: `validation.qa_economy_07_real_2026_11_15`
- Vintage: raw `2026-11-15` · HMT file updated **2026-07-29**
- Read-only context: Ready `tme-del-ame` (Table 1.1) and Table 4.2 in the same Chapter 4 workbook. Table 4.2 is not a curated series.

## Independence

Validation read the pinned Chapter 1 and Chapter 4 workbooks and the curated CSVs.
It did not import the Economy connectors and did not edit `data/economy/`.
Economy self-QA JSON was not used as the source of the figures below.
2025-26 real equalling nominal is the price-base year. Earlier years differing is correct.
These pins do not contain a monthly real EBFT series. That absence is not a fail.

## Checks

| ID | Check | Result | Notes |
|---|---|---|---|
| R1 | Table 1.2 Total DEL + Departmental AME + Other AME = table TME | pass | Total DEL + Departmental AME + Other AME = table TME in all five years; 2021-22 Other AME is -202,678 |
| R2 | Resource DEL 2025-26 = 496,670; Total DEL is the published row | pass | Resource DEL 2025-26 is 496,670 on Table 1.2 and Table 1.1; 2024-25 resource 485,757 + capital 115,432 = 601,189, not Total DEL 616,422; earlier real table TME is not nominal |
| R3 | Table 4.3 Health 2024-25 = 250.8; Table 4.2 Health 242.4 is context | pass | Table 4.3 Health 2024-25 is 250.8; Table 4.2 Health is 242.4 and is not curated |
| R4 | 2025-26 real = nominal for every curated Table 4.3 series | pass | All 14 curated Table 4.3 series equal Table 4.2 in 2025-26; 307 of 308 earlier cells differ |
| R5 | 2025-26 prices, ONS deflator, not monthly EBFT, no Exchange deflator | pass | Manifests name 2025-26 prices, the ONS GDP deflator (30 June 2026), and that these rows are not deflated monthly EBFT |
| R6 | 2025-26 estimated; no plan years; £ million and £ billion not mixed | pass | 2025-26 is estimated on both packages; no plan-year cells; £ million and £ billion stay in their own packages |
| R7 | Raw sha256; no OSCAR; no residual function for the leaf gap | pass | sha256 matches both manifests; no OSCAR; no residual function; leaf gap at most 0.2 and bridge gap at most 0.1; 18 of 23 years are not exact at one decimal |
| C-extra | Row counts 20 and 322; of-which skip documented | pass | 20 and 322 curated rows; 8 of-which lines skipped and documented |

## Spots recomputed from the workbooks

### R1 — DEL, AME, and this table's real TME

| Financial year | Total DEL | Departmental AME | Other AME | Sum minus TME | Table TME |
|---|---|---|---|---|---|
| 2021-22 | 648,705 | 816,338 | -202,678 | 0 | 1,262,365 |
| 2022-23 | 613,433 | 461,587 | 240,194 | 0 | 1,315,214 |
| 2023-24 | 601,148 | 584,293 | 139,510 | 0 | 1,324,951 |
| 2024-25 | 616,422 | 626,432 | 91,603 | 0 | 1,334,457 |
| 2025-26 | 639,807 | 622,645 | 97,670 | 0 | 1,360,122 |

Other AME is curated, including the negative 2021-22 value. The identity is exact in £ million.

### R2 — price base, and Total DEL not rebuilt

Unit: £ million. In 2025-26 the price base means real equals nominal.

| Financial year | Real resource DEL | Nominal resource DEL | Resource + capital | Published Total DEL | Real table TME | Nominal table TME |
|---|---|---|---|---|---|---|
| 2021-22 | 525,528 | 433,326 | 637,894 | 648,705 | 1,262,365 | 1,040,888 |
| 2022-23 | 487,372 | 430,112 | 600,795 | 613,433 | 1,315,214 | 1,160,692 |
| 2023-24 | 474,641 | 440,915 | 589,026 | 601,148 | 1,324,951 | 1,230,807 |
| 2024-25 | 485,757 | 469,578 | 601,189 | 616,422 | 1,334,457 | 1,290,012 |
| 2025-26 | 496,670 | 496,670 | 624,202 | 639,807 | 1,360,122 | 1,360,122 |

2024-25 resource DEL 485,757 + capital DEL 115,432 = **601,189**, not published Total DEL **616,422**. Those two lines are not curated.

Footnote (7): (7) Total DEL is given by resource DEL plus capital DEL. This excludes the Scottish Government Block Grant adjustments as shown in Table 1.4.

Ready `tme-del-ame` 2025-26 control totals match Table 1.2. Earlier real table TME does not match that nominal pin.

### R3 — Health, 2024-25

Table 4.3 Health is **250.8** £ billion, 2025-26 prices. Table 4.2 Health is **242.4**. The nominal figure is context. It is not a curated row. The two figures differ, which is correct outside the price-base year.

### R4 — 2025-26 real equals nominal Table 4.2

| Series | Table 4.3 2025-26 | Table 4.2 2025-26 |
|---|---|---|
| General public services | 165.5 | 165.5 |
| Defence | 65.4 | 65.4 |
| Public order and safety | 55.7 | 55.7 |
| Economic affairs | 94.0 | 94.0 |
| Environment protection | 19.2 | 19.2 |
| Housing and community amenities | 22.5 | 22.5 |
| Health | 257.5 | 257.5 |
| Recreation, culture and religion | 15.1 | 15.1 |
| Education | 125.7 | 125.7 |
| Social protection | 407.3 | 407.3 |
| EU transactions | -0.2 | -0.2 |
| Public sector expenditure on services | 1,227.6 | 1,227.6 |
| Accounting adjustments | 132.5 | 132.5 |
| Total Managed Expenditure | 1,360.1 | 1,360.1 |

Earlier cells that differ: **307** of **308**. Inequality before 2025-26 is the price base at work. The earlier cell that is also equal: 2023-24 EU transactions (0.0).

### R7 — published rounding, no residual

Level-1 leaves plus EU can miss published TES by up to £0.2 billion. TES plus accounting adjustments can miss this table's TME by up to £0.1 billion. The published cells are stored. No residual function was added.

| Financial year | Leaves + EU | Published TES | Leaf gap | Adjustments | Table TME | Bridge gap |
|---|---|---|---|---|---|---|
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

2024-25: EU transactions **-1.5**, TES **1,206.6**, adjustments **127.8**, table TME **1,334.5**, bridge gap **-0.1**. Of-which lines on Table 4.3: **8**, none curated.

### Units are not spliced

Table 1.2 and Table 4.3 share an HMT concept at different rounding. The £ million series is not divided into the £ billion series.

| Financial year | Table 1.2 (£ million) | ÷ 1,000 | Table 4.3 (£ billion) |
|---|---|---|---|
| 2021-22 | 1,262,365 | 1,262.365 | 1,262.4 |
| 2022-23 | 1,315,214 | 1,315.214 | 1,315.2 |
| 2023-24 | 1,324,951 | 1,324.951 | 1,325.0 |
| 2024-25 | 1,334,457 | 1,334.457 | 1,334.5 |
| 2025-26 | 1,360,122 | 1,360.122 | 1,360.1 |

### C-extra — checksums and row counts

- Chapter 1 sha256: `ff40d00e69d7b5cb2db4504e24ba774dd09b181ac676d0518ab0e16581305dbe`
- Chapter 4 sha256: `573625f73c0e311ff68c5635691801be955fd466cd9b5b4a0e00b8173852195c`
- Ready `tme-del-ame` Chapter 1 sha256: `ff40d00e69d7b5cb2db4504e24ba774dd09b181ac676d0518ab0e16581305dbe`
- Curated rows: `tme-del-ame-real` **20**, `tes-by-function-real` **322**
- Table 4.3 of-which lines skipped: **8**

## Method notes

- Geography on the curated rows is United Kingdom (`K02000001`). Frequency is annual. `tme-del-ame-real` is £ million. `tes-by-function-real` is £ billion. Both are 2025-26 prices.
- Workbook footnote (1) on Table 1.2 and Table 4.3 says real-terms figures are the nominal figures adjusted to 2025-26 price levels using GDP deflators from the Office for National Statistics (released 30 June 2026). The manifests say the OBR forecast deflator used for PESA plan years is not applied.
- The workbook header stamps 2025-26 as outturn. `observation_status=estimated` matches the PSS July 2026 bulletin: this release is the first estimate of 2025-26, and later editions can still revise it. Earlier pinned years are `final`.
- Defence is the UN COFOG row. Public-sector debt interest stays inside General public services as an of-which line.
- Real HMT table TME is not monthly `total-managed-expenditure` divided by CPIH or by a GDP deflator. No monthly real EBFT series is required here.
- The next PSS key-series update sits in the November, February, and April cycle. That is a later re-pin, not a fail of this vintage.

## Summary

- **Verdict: pass** on R1–R7 + C-extra (8 pass / 0 warn / 0 fail).
- **Recommend Ready: yes** for `tme-del-ame-real` and `tes-by-function-real` on this PSS July 2026 vintage. Orchestrator flips the registry. Validation did not edit Notion.
- Do not drop Other AME, invent a residual function, or rebuild Total DEL from resource DEL + capital DEL.
- Do not splice £ million Table 1.2 onto £ billion Table 4.3, and do not deflate monthly EBFT to match these tables.

## Blockers

- None that block Ready on this vintage.
- 2025-26 remains a first estimate and can move at the next PSS release (November, February, and April cycle).
- Table 4.3 rounding is up to £0.2 billion on the leaf sum and £0.1 billion on TES + adjustments versus TME. Store the published cells.
- Real HMT table TME is not a real monthly EBFT series.

## Reproduce

```bash
uv run python -m validation.qa_economy_07_real_2026_11_15
```
