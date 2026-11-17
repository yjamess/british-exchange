# Handover — Economy Domain 07 · Table 4.2 long-run + ESA Table 11 (EC-G2-07D-PIN)

**Author:** Economy domain subagent · **Date:** 2026-11-15  
**Notion plan:** [07 · Public Spending & Services](https://app.notion.com/p/41465471768581df9c9ad184839231b7)  
**Kickoff:** [agent-kickoff-economy-07-longrun-esa.md](agent-kickoff-economy-07-longrun-esa.md)  
**Discovery:** [economy-07-spending-source-matrix.md](economy-07-spending-source-matrix.md) §A (Table 4.2) · §C (ESA) · §D (OSCAR)  
**OSCAR memo:** [economy-07-oscar-decision-memo.md](economy-07-oscar-decision-memo.md)  
**Registry:** [Table 4.2 long-run](https://app.notion.com/p/4196547176858108be4bd40a2251cd7b) · [ESA Table 11](https://app.notion.com/p/41965471768581f88f08d3b6a730dc52) — both **Validation**, not Ready

> **Status:** Economy self-QA **pass**. Two reproducible packages. OSCAR is **blocked-as-tme-composition** with no curated package. **Not Ready.** No frontend.

## Verdict (return to Orchestrator)

| Field | Value |
|-------|--------|
| **Indicators** | `tes-by-function-long-run` (322 rows) · `esa-gg-expenditure-by-function` (330 rows) |
| **OSCAR** | **`blocked-as-tme-composition`**. No pin. Inbox draft id `oscar-control-budget` only |
| **Self-QA** | **pass**. Spots below match the kickoff |
| **ESA coversheet** | **general-government file**. The coversheet sentence is a bad copy |
| **Not in these packages** | £ million Table 5.4 rows, real Table 4.3 rows, a rescaled ESA series, OSCAR observations |
| **Next** | Schedule Validation **`EC-VAL-07D`** (Table 4.2) and **`EC-VAL-07E`** (ESA Table 11) |

### How to reproduce

```bash
uv run python -m economy.connectors.tes_by_function_long_run
uv run python -m economy.connectors.esa_gg_expenditure_by_function
```

## Row counts

| Package | Curated rows | What they are | Status |
|---------|-------------:|---------------|--------|
| `tes-by-function-long-run` | **322** | 10 COFOG functions, EU transactions, TES, accounting adjustments, table TME. 23 financial years, £ billion, nominal | 308 final + 14 estimated |
| `esa-gg-expenditure-by-function` | **330** | 10 COFOG level-1 functions plus the OTE total. 30 calendar years, £ million, general government | 330 final |

`estimated` on the long-run pin is **2025-26 only**. ESA rows are `final` on the 23 April 2026 vintage. ONS can still revise them. The sheet does not mark 2024 as estimated.

Of-which lines on Table 4.2: **8 skipped**. ESA sub-function rows: **2,070 skipped** on the general-government file (69 a year). No residual function in either package.

## Paths and checksums

Retrieved 2026-11-15.

| Package | Raw file | SHA-256 | Curated? |
|---------|----------|---------|----------|
| `tes-by-function-long-run` | `data/economy/tes-by-function-long-run/raw/2026-11-15/July_PSS_2026_Chapter_4.xlsx` | `573625f73c0e311ff68c5635691801be955fd466cd9b5b4a0e00b8173852195c` | Yes, sheet `4_2` only |
| `esa-gg-expenditure-by-function` | `data/economy/esa-gg-expenditure-by-function/raw/2026-11-15/esatable11generalgovernment.xlsx` | `545236391260ca77580cff5d8dba243b35f1e588d48067ed0f02287c7c3afa09` | Yes, column `OTE` |
| Sector check | `.../esatable11centralgovernment.xlsx` | `1de1e5d91531bea990826cf7ed28ff16db7ac7c876621fc264ab2e1930306105` | No |
| Sector check | `.../esatable11localgovernment.xlsx` | `d1d033a590e32132828375a401cebf260ea774e24664af3285ec5203ddef1f04` | No |

Chapter 4 is the same PSS July 2026 file as `tes-by-function-real` (a second copy under this package).  
Chapter 4 download: [July_PSS_2026_Chapter_4.xlsx](https://assets.publishing.service.gov.uk/media/6a574aac822fbe6b8245c955/July_PSS_2026_Chapter_4.xlsx)  
ESA general government: [dataset page](https://www.ons.gov.uk/economy/governmentpublicsectorandtaxes/publicspending/datasets/esatable11annualexpenditureofgeneralgovernment/current) · published 07:00 on 23 April 2026 · OGL v3.0

Each curated package also has `manifest.yaml`, `README.md`, `source_register.csv`, `validation_report.md`, and `curated/observations.csv` plus `curated/identity_check.json`.

## Table 4.2 — nominal £ billion

Unit: **£ billion, nominal**, one decimal place. Financial years **2003-04 to 2025-26**. Current and capital are already summed.

| Row | 2024-25 | What it is |
|-----|--------:|------------|
| Health | **242.4** | Kickoff spot |
| Social protection | **386.3** | Kickoff spot |
| EU transactions | -1.4 | Published sign kept |
| TES | **1,166.5** | Published total |
| Accounting adjustments | **123.6** | Bridge, not a function |
| Table TME | **1,290.0** | This table's TME. Kickoff writes 1,290 |

2024-25 leaf gap (level-1 + EU minus TES) = **+0.1**. TES + adjustments minus table TME = **+0.1**. Published cells are stored. No residual was added.

Across 2003-04 to 2025-26 the largest leaf gap is **£0.2 billion** (2022-23). The largest bridge gap is **£0.1 billion**. The full year table is in `data/economy/tes-by-function-long-run/validation_report.md`.

Guards, not extra series:

- Table 4.3 Health 2024-25 is **250.8** (2025-26 prices) and is not curated. In 2025-26 every Table 4.2 series equals Table 4.3, which is what that price base should do.
- Table 5.4 Health 242,429 £ million rounds to 242.4. TES 1,166,452 rounds to 1,166.5. Adjustments 123,560 round to 123.6. Table TME 1,290,012 rounds to 1,290.0. Those £ million rows stay in `tes-by-function`.

## ESA Table 11 — calendar year, general government, OTE

Unit: **£ million**. Calendar years **1995 to 2024**. Sector: **general government** (ESA 2010 S.13). Column **OTE**.

| Row | Calendar 2024 OTE |
|-----|------------------:|
| Total `_T` | **1,330,532** |
| Health GF07 | **253,191** |
| Education GF09 | **141,118** |
| Social protection GF10 | **458,500** |

Level-1 rows sum exactly to the published total in every pinned year. No residual was added.

TES Health, financial year 2024-25, is **242,429** £ million. That cell is not in this package. Different year, different sector (no public corporations), different expenditure concept. Do not rescale.

### Coversheet check — general-government file

The general-government coversheet says the table is “for local government only”. That sentence is a bad copy.

| File | Coversheet | 2024 year-sheet title | 2024 OTE total | Curated? |
|------|------------|------------------------|---------------:|----------|
| General government | local government only | general government only | **1,330,532** | Yes |
| Central government | central government only | central government only | 1,227,604 | No |
| Local government | local government only | local government only | 268,424 | No |

Same release date on all three (23 April 2026). The general-government total is not the local total and not the central total.

Central plus local = **1,496,028**, which is **165,496** above general government. Transfers between subsectors are consolidated inside general government. Do not add the siblings to rebuild the total.

## OSCAR

Verdict: **`blocked-as-tme-composition`**. Memo: [economy-07-oscar-decision-memo.md](economy-07-oscar-decision-memo.md).

HMT’s September 2026 guidance says in-year OSCAR cannot exactly tie to National Accounts or Public Sector Finances. No curated package. The separately named future, if anyone wants departmental Control Budget transparency later, is the Inbox draft id **`oscar-control-budget`**. It is not a registry page and it is not a composition of EBFT, TES, or Table 1.1.

## Registry

| Indicator | Status | URL |
|-----------|--------|-----|
| `tes-by-function-long-run` | **Validation** | https://app.notion.com/p/4196547176858108be4bd40a2251cd7b |
| `esa-gg-expenditure-by-function` | **Validation** | https://app.notion.com/p/41965471768581f88f08d3b6a730dc52 |
| `oscar-control-budget` | Inbox draft id only. No page | — |

## Validation ask — `EC-VAL-07D` (Table 4.2)

Independent Validation should file under `data/qa/` and should not silently rewrite these curated files.

| Check | Expectation |
|-------|-------------|
| D1 | Health 2024-25 = **242.4** £ billion, nominal. Social protection = **386.3**. TES = **1,166.5**. Accounting adjustments = **123.6**. Table TME = **1,290.0** |
| D2 | EU transactions 2024-25 = **-1.4**. The sign is kept. Eight of-which lines are not curated |
| D3 | Level-1 + EU versus published TES, and TES + adjustments versus table TME, stay within £0.2 billion. 2024-25 gaps are +0.1. The largest leaf gap is 0.2 in 2022-23. No residual function |
| D4 | Sheet `4_3` is not a curated series. Its Health 2024-25 is 250.8. Every Table 4.2 series in 2025-26 equals Table 4.3 |
| D5 | Unit is nominal £ billion. No row uses £ million. `indicator_id` is `tes-by-function-long-run`, not `tes-by-function` |
| D6 | 2025-26 is the only `estimated` year (14 rows). History is 2003-04 to 2025-26. No plan years |
| D7 | Table 5.4 Health 242,429, TES 1,166,452, adjustments 123,560, and table TME 1,290,012 round to these cells and are not stored here |
| D8 | No OSCAR rows. No ESA rows. Table TME is not monthly EBFT. No Tax−Spend=Borrow identity |

## Validation ask — `EC-VAL-07E` (ESA Table 11)

| Check | Expectation |
|-------|-------------|
| E1 | Calendar 2024, column OTE, £ million: Total **1,330,532**, Health GF07 **253,191**, Education GF09 **141,118**, Social protection GF10 **458,500** |
| E2 | Level-1 OTE sums exactly to the published total in every year 1995 to 2024. No residual. Sub-functions are not curated |
| E3 | Coversheet says local government only. Every year sheet says general government only. Verdict: general-government file |
| E4 | Sibling 2024 OTE totals, not curated: central government **1,227,604**, local government **268,424**. Central plus local is **1,496,028**, not 1,330,532. Do not rebuild general government by adding them |
| E5 | Periods are calendar years (1 January to 31 December). Unit is £ million, not £ billion. Notes say `sector=general-government`, `column=OTE`, `year_basis=calendar` |
| E6 | Health 253,191 is not TES Health 242,429. No rescale onto `tes-by-function`, `tes-by-function-long-run`, or `total-managed-expenditure` |
| E7 | 330 rows. All `final` on this vintage. Checksums match the three files above. Only the general-government file is curated |
| E8 | No OSCAR rows. No Tax−Spend=Borrow identity |

**Out of scope until PASS:** Registry Ready, frontend, mixing £ billion with £ million, rescaling ESA onto TES or EBFT, ingesting OSCAR, PESA plan years.

## Blockers

| Blocker | Severity |
|---------|----------|
| Independent `EC-VAL-07D` and `EC-VAL-07E` have not run | Process (expected) |
| 2025-26 on Table 4.2 can still be revised | Timing |
| Table 4.2 rounding reaches £0.2 billion on the leaf sum in 2022-23 | Store the published cells. No residual |
| ESA coversheet says local government only | Label. The file is general government. Documented above |
| ESA Health 253,191 is not TES Health 242,429 | Hard boundary. Do not rescale |
| OSCAR cannot tie to PSF | **`blocked-as-tme-composition`**. No package |

## Paths written

```txt
src/economy/connectors/tes_by_function_long_run.py
src/economy/connectors/esa_gg_expenditure_by_function.py
src/economy/connectors/pss_july_2026.py          # docstring lists the long-run pin
data/economy/tes-by-function-long-run/
data/economy/esa-gg-expenditure-by-function/
docs/handover-economy-07-longrun-esa.md
docs/economy-07-oscar-decision-memo.md
```

`data/economy/tes-by-function/` and `data/economy/tes-by-function-real/` were read and not rewritten. `web/` was not edited. No OSCAR directory was created.

## Do not

- Mark either row Ready before `EC-VAL-07D` / `EC-VAL-07E`
- Mix Table 4.2 £ billion rows into `tes-by-function`
- Treat Table 4.3 as this long-run series
- Rescale ESA onto TES or onto monthly EBFT
- Believe the general-government coversheet when it says local government only
- Add central plus local to rebuild general government
- Ingest OSCAR, or chart `oscar-control-budget` as a TME split
- Invent a residual function for the £ billion rounding gap
