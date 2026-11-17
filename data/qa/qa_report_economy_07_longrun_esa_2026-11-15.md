# QA report — Economy 07 long-run Table 4.2 + ESA Table 11 · 2026-11-15

## Scope

- Work plan: `EC-VAL-07D` (`tes-by-function-long-run`, PSS July 2026 Table 4.2, £ billion nominal, financial year) and `EC-VAL-07E` (`esa-gg-expenditure-by-function`, ONS ESA Table 11 general government, column OTE, £ million, calendar year)
- Handover: `docs/handover-economy-07-longrun-esa.md`
- Kickoff: `docs/agent-kickoff-validation-economy-07-longrun-esa.md`
- Script: `validation.qa_economy_07_longrun_esa_2026_11_15`
- Vintage: raw `2026-11-15` · HMT file updated **2026-07-29** · ONS published **2026-04-23**
- Read-only context: Ready `tes-by-function` (£ million Table 5.4) for the rounding guard; Table 4.3 on the same Chapter 4 workbook

## Independence

Validation read the pinned Chapter 4 workbook and the three ESA workbooks with openpyxl and compared every curated row to those cells.
It did not import the Economy connectors and did not edit `data/economy/`. Economy self-QA JSON was not used as the source of the figures below.
ESA Health 253,191 differing from TES Health 242,429 is expected: different year basis, sector and concept. It is not a fail and not a reason to rescale.

## Checks

| ID | Check | Result | Notes |
|---|---|---|---|
| L1 | Table 4.2 spots and every curated cell vs workbook | **pass** | Every curated Table 4.2 cell matches the workbook; 2024-25 Health 242.4, Social protection 386.3, TES 1,166.5, adjustments 123.6, table TME 1,290.0 |
| L2 | Unit, span, 2025-26 estimated, no £ million mix, Table 4.3 guard | **pass** | £ billion nominal; 2003-04 to 2025-26; 2025-26 estimated; Table 4.3 is not curated (Health 250.8) and equals Table 4.2 in 2025-26; £ million Table 5.4 rounds to these cells and stays in tes-by-function |
| L3 | No residual function; leaf/bridge gaps; of-which skipped | **pass** | Leaf gap at most 0.2, bridge gap at most 0.1; EU transactions 2024-25 -1.4 kept; 8 of-which lines skipped; no residual function |
| L4 | Raw sha256 ↔ manifest; no OSCAR; not monthly EBFT | **pass** | Chapter 4 sha256 matches the manifest; manifest says not monthly EBFT, no OSCAR, no Tax−Spend=Borrow |
| E1 | Calendar 2024 OTE spots and every curated cell vs workbook | **pass** | Calendar 2024 OTE: Total 1,330,532; Health 253,191; Education 141,118; Social protection 458,500; every curated cell matches |
| E2 | Manifest and notes: calendar year, general government, £ million, not TES / not EBFT | **pass** | Calendar year; general government; £ million; notes carry sector, column OTE, year_basis; manifest says not TES and not EBFT |
| E3 | Coversheet bad copy documented; sibling CG/LG totals differ | **pass** | General-government coversheet says local government only; every year sheet says general government; sibling 2024 totals central 1,227,604 and local 268,424 differ and do not sum to general government |
| E4 | Level-1 sum vs published total; sub-functions not curated | **pass** | Level-1 OTE sums exactly to the published total in all 30 years; 2070 sub-function rows skipped |
| E5 | Raw sha256 ↔ manifest; ESA Health ≠ TES Health without claiming equality | **pass** | Three ESA sha256 match; only general government curated; Health 253,191 contrasted with TES Health 242,429 without claiming equality |
| OSCAR | Memo exists; no curated OSCAR package | **pass** | Memo present with blocked-as-tme-composition; no curated OSCAR package |
| C-extra | Row counts, frequency, connectors | **pass** | Row counts 322 and 330; both manifests annual; connectors present |

## Spots recomputed from the workbooks

### L1 / L3 — Table 4.2, £ billion nominal, leaf and bridge gaps

| Financial year | Leaves + EU | Published TES | Leaf gap | Adjustments | Table TME | Bridge gap |
|---|---|---|---|---|---|---|
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

2024-25: Health **242.4**, Social protection **386.3**, EU transactions **-1.4**. Of-which lines skipped: **8**. Published cells are stored; no residual row.

### L2 — Table 4.3 guard and the £ million companion

Table 4.3 Health 2024-25 is **250.8** (2025-26 prices) and is not curated here. In 2025-26, **14 of 14** Table 4.2 series equal Table 4.3, which is what the price base should do.

| Series | Ready tes-by-function 2024-25 (£ million; functions = current + capital) | Table 4.2 (£ billion) |
|---|---|---|
| cofog-07-health | 242,429 | 242.4 |
| tes-total | 1,166,452 | 1,166.5 |
| accounting-adjustments | 123,560 | 123.6 |
| table-tme | 1,290,012 | 1,290.0 |

The £ million rows stay in `tes-by-function`. They are not stored in the long-run package.

### E1 / E4 — ESA Table 11 general government, column OTE, £ million

| Calendar year | Total _T | Health GF07 | Education GF09 | Social protection GF10 | Leaves minus total |
|---|---|---|---|---|---|
| 1995 | 326,262 | 42,213 | 37,143 | 124,795 | 0 |
| 1996 | 334,157 | 43,985 | 38,121 | 128,773 | 0 |
| 1997 | 341,776 | 44,382 | 39,265 | 132,607 | 0 |
| 1998 | 353,573 | 47,381 | 40,124 | 134,564 | 0 |
| 1999 | 364,712 | 51,409 | 44,090 | 138,279 | 0 |
| 2000 | 386,659 | 54,381 | 48,407 | 144,322 | 0 |
| 2001 | 414,039 | 59,782 | 54,081 | 154,675 | 0 |
| 2002 | 447,236 | 66,135 | 61,558 | 164,504 | 0 |
| 2003 | 488,220 | 73,102 | 66,610 | 179,576 | 0 |
| 2004 | 529,773 | 81,705 | 70,409 | 192,936 | 0 |
| 2005 | 576,622 | 88,220 | 76,554 | 202,397 | 0 |
| 2006 | 601,477 | 95,516 | 83,571 | 208,610 | 0 |
| 2007 | 634,877 | 100,748 | 87,888 | 220,189 | 0 |
| 2008 | 706,148 | 109,274 | 93,556 | 234,972 | 0 |
| 2009 | 732,024 | 119,242 | 98,290 | 257,899 | 0 |
| 2010 | 761,564 | 122,035 | 101,663 | 271,657 | 0 |
| 2011 | 761,359 | 122,583 | 97,263 | 279,194 | 0 |
| 2012 | 780,841 | 125,600 | 95,980 | 290,754 | 0 |
| 2013 | 780,328 | 130,793 | 94,782 | 293,559 | 0 |
| 2014 | 802,979 | 139,103 | 99,978 | 299,965 | 0 |
| 2015 | 812,551 | 144,509 | 100,450 | 306,487 | 0 |
| 2016 | 828,849 | 150,725 | 101,584 | 310,715 | 0 |
| 2017 | 857,549 | 154,360 | 103,590 | 312,190 | 0 |
| 2018 | 880,552 | 161,953 | 105,466 | 320,531 | 0 |
| 2019 | 912,643 | 170,827 | 109,706 | 328,058 | 0 |
| 2020 | 1,099,820 | 209,291 | 115,687 | 353,084 | 0 |
| 2021 | 1,101,057 | 224,601 | 123,335 | 365,154 | 0 |
| 2022 | 1,175,557 | 224,484 | 126,875 | 384,775 | 0 |
| 2023 | 1,280,597 | 236,013 | 135,640 | 421,841 | 0 |
| 2024 | 1,330,532 | 253,191 | 141,118 | 458,500 | 0 |

Sub-function rows skipped on the general-government file: **2070**.

### E3 — coversheet and siblings

| File | Coversheet says | 2024 year-sheet title | 2024 OTE total | Curated? |
|---|---|---|---|---|
| General government | local government only | Annual UK government expenditure for general government only | 1,330,532 | Yes |
| Central government | central government only |  | 1,227,604 | No |
| Local government | local government only |  | 268,424 | No |

Central plus local = **1,496,028**, not the general-government total. Transfers between subsectors are consolidated.

### Checksums

- Chapter 4 sha256: `573625f73c0e311ff68c5635691801be955fd466cd9b5b4a0e00b8173852195c`
- esatable11centralgovernment.xlsx sha256: `1de1e5d91531bea990826cf7ed28ff16db7ac7c876621fc264ab2e1930306105`
- esatable11generalgovernment.xlsx sha256: `545236391260ca77580cff5d8dba243b35f1e588d48067ed0f02287c7c3afa09`
- esatable11localgovernment.xlsx sha256: `d1d033a590e32132828375a401cebf260ea774e24664af3285ec5203ddef1f04`

## Method notes

- Geography on both packages is `K02000001`. Long-run rows are UK public sector financial years. ESA rows are UK general government (ESA 2010 S.13) calendar years.
- 2025-26 on Table 4.2 is `estimated` to match the PSS July 2026 bulletin (first outturn estimate). ESA rows are `final` on the 23 April 2026 vintage; ONS can still revise them.
- Defence is the UN COFOG row on both tables. Debt interest stays inside General public services.
- Table 4.2 table TME is not monthly `total-managed-expenditure`. ESA OTE is not TES. Neither package is a split of EBFT.
- HMT's next Public Spending Statistics update is listed for 18 November 2026. That is a later re-pin, not a fail of this vintage.

## Summary

- **Verdict: pass** (11 pass / 0 warn / 0 fail)
- **Recommend Ready: yes** for `tes-by-function-long-run` and `esa-gg-expenditure-by-function` on these vintages. Orchestrator flips the registry. Validation did not edit Notion.
- OSCAR stays `blocked-as-tme-composition`. No curated package. That absence is correct.
- Do not mix £ billion Table 4.2 rows into `tes-by-function`. Do not rescale ESA onto TES or EBFT. Do not add central plus local to rebuild general government.

## Blockers

- None that block Ready on these vintages.
- 2025-26 on Table 4.2 can move at the next PSS release (18 November 2026).
- ESA Table 11 is annual; the next ONS edition can revise 1995 to 2024.
- A chart of ESA needs its own calendar-year, general-government label. Never on the TES axis.

## Reproduce

```bash
uv run python -m validation.qa_economy_07_longrun_esa_2026_11_15
```
