# Source matrix — Economy Domain 07 · Where spending goes + DEL vs AME

**Date:** 2026-11-15  
**Owner:** Economy (discovery only — **no ingest this pass**)  
**Work plan:** `EC-G2-07B`  
**Kickoff:** [agent-kickoff-economy-07-function.md](agent-kickoff-economy-07-function.md)  
**Parent handover:** [handover-economy-07-spending.md](handover-economy-07-spending.md) §2.2–2.3  
**Flagship aggregate:** `total-managed-expenditure` = ONS **EBFT** (PS total managed expenditure, £m CPNSA, monthly). Cloud release 55. **Not** the total for the tables below.

Discovery workbooks were read on 2026-11-15 and **not** copied into `data/economy/`. Checksums below are for that read, so a later pin can re-fetch and compare.

## Question

Can we show (1) where managed expenditure goes by function, and (2) DEL vs AME control totals, each honestly labelled, without inventing shares that sum to monthly EBFT?

## Reconcile verdicts

| Experience | Verdict | What it means |
|------------|---------|----------------|
| **Where spending goes** (`view=function`) | **`path-found-tes-cofog`** | HMT **Total Expenditure on Services (TES)** by UN COFOG level 1 is published in PESA 2026 / PSS July 2026. Label it **TES / COFOG**. It has its own total. It does not sum to monthly EBFT. |
| **DEL vs AME** (`view=delame`) | **`path-found-pss-table-1-1`** | PSS July 2026 **Table 1.1** (same outturn in PESA 2026 Table 1.1) publishes Total DEL + Departmental AME + Other AME = that table’s TME, in £ million, financial year. |
| ESA Table 11 | Secondary path, **not** the function verdict | Official COFOG, but **general government**, **calendar year**, ESA concepts. Separate instrument only. |
| OSCAR II | **`oscar-only-not-tme`** | Control Budget (DEL / AME / non-budget) exists. HMT says in-year OSCAR **cannot exactly tie** to National Accounts / PSF. Do not use org pies as TME composition. |
| Real terms (monthly EBFT) | No official monthly real EBFT found | Official real-terms **companion tables** exist for these HMT series (GDP deflator). Leave the monthly flagship in nominal £. |

Ingest stays **gated** until Orchestrator opens a pin. This pass does not create curated series or Ready rows.

A stacked bar of the ten functions is a TES/COFOG chart. It is not a split of the EBFT line on `/economy?domain=spending`.

---

## Frameworks (do not mix)

| Framework | What it measures | Sector | Year | May it sit under a view? |
|-----------|------------------|--------|------|--------------------------|
| **TES / COFOG** | Spending to deliver services, classified to UN COFOG level 1. HMT builds it from budgets, then removes transfers and non-spending items and adds local government and public corporations. | Public sector | Financial year (April–March) | **Where spending goes**, labelled TES |
| **Budgeting DEL / AME** | Control totals. DEL = firm multi-year limits. AME = demand-led or hard-to-limit spending. **Other AME** (debt interest, locally financed spending, accounting adjustments, and so on) sits outside departmental budgets. | Public sector, via departmental budgets plus other AME | Financial year | **DEL vs AME**, using the published Table 1.1 rows |
| **National Accounts TME (EBFT)** | Public-sector current expenditure + public-sector gross investment. Monthly £m NSA. | Public sector, UK | Calendar month | Flagship only. **Not** the denominator for the two views |
| **PESA/PSS TME row** | Same National Accounts idea, as an annual financial-year total inside HMT’s tables. Footnote: excludes temporary effects of banks classified to the public sector. | Public sector | Financial year | Bridge row on the HMT table. **Not** a rename of EBFT |
| **ESA Table 11** | General government expenditure by COFOG and ESA transaction. | General government (excludes public corporations) | Calendar year | Separate labelled instrument only |
| **OSCAR II** | Departmental outturn on the Control Budget. | Organisations on OSCAR | Month, inside a financial year | Not these two views |

HMT’s own line (CRA 2026, [Introduction to total expenditure on services](https://www.gov.uk/government/publications/country-and-regional-analysis-2026-guidance/introduction-to-total-expenditure-on-services)): TES is **similar to** TME, not the same series. TES is “the spending required to deliver services, not just the purchasing of services.”

---

## Official publications

| Source | URL | Release used | Licence | Role |
|--------|-----|--------------|---------|------|
| **PESA 2026** command paper | https://www.gov.uk/government/statistics/public-expenditure-statistical-analyses-2026 | Published **16 Jul 2026** (content record updated 2 Sep 2026) | OGL v3.0 (GOV.UK statistics) | Annual tables, including **plans** after 2025-26 on Chapter 1 |
| PESA collection | https://www.gov.uk/government/collections/public-expenditure-statistical-analyses-pesa | — | OGL v3.0 | Back editions. Do not splice editions; HMT warns coverage changes |
| **PSS July 2026** | https://www.gov.uk/government/statistics/public-spending-statistics-release-july-2026 | First published **16 Jul 2026**, updated **29 Jul 2026** | **OGL v3.0** (stated on the release) | Accredited official statistics. Outturn only. First estimate of **2025-26**. Key series updated again in November, February and April |
| PSS guidance | https://www.gov.uk/government/statistics/public-spending-statistics-release-july-2026/public-spending-statistics-guidance | same | OGL v3.0 | Defines Table 1.1, TES, COFOG, and the OSCAR-to-accounts relationship |
| CRA 2026 TES introduction | https://www.gov.uk/government/publications/country-and-regional-analysis-2026-guidance/introduction-to-total-expenditure-on-services | 13 Aug 2026 | OGL v3.0 | How TES is built from DEL + departmental AME |
| **ONS ESA Table 11** general government | https://www.ons.gov.uk/economy/governmentpublicsectorandtaxes/publicspending/datasets/esatable11annualexpenditureofgeneralgovernment/current | Spreadsheet published **07:00 23 Apr 2026** | OGL v3.0 | Calendar-year COFOG, 1995–2024 |
| OSCAR II collection | https://www.gov.uk/government/collections/hmt-oscar-publishing-from-the-database | In-year guidance **22 Sep 2026** | OGL v3.0 | Cannot-tie limit. Not a TME split |
| OSCAR in-year guidance (Sep 2026) | https://www.gov.uk/government/publications/oscar-ii-publishing-data-from-the-database-september-2026/oscar-in-year-dataset-guidance | 22 Sep 2026; next in-year release **end of Dec 2026** | OGL v3.0 | Q1 2026-27 (Apr–Jun 2026) described there |

### Workbooks read (not pinned)

| File | URL | sha256 (2026-11-15 download) |
|------|-----|------------------------------|
| PESA 2026 Chapter 1 | https://assets.publishing.service.gov.uk/media/6a57728b822fbe6b8245c9a1/PESA_2026_CP_Chapter_1_tables.xlsx | `0e88d4904e747460fbf254c358b0922f74898b8dd3d4364e0ca1ebe35e12e454` |
| PSS July 2026 Chapter 1 | https://assets.publishing.service.gov.uk/media/6a5749ec2f6185941a9a6519/July_PSS_2026_Chapter_1.xlsx | `ff40d00e69d7b5cb2db4504e24ba774dd09b181ac676d0518ab0e16581305dbe` |
| PESA 2026 Chapter 4 | https://assets.publishing.service.gov.uk/media/6a5772e09e63154454413700/PESA_2026_CP_Chapter_4_tables.xlsx | `50ae80d95c4e542c34a17dfa8bc302858ca6508b6753e27bb31920cec9bb75c4` |
| PSS July 2026 Chapter 4 | https://assets.publishing.service.gov.uk/media/6a574aac822fbe6b8245c955/July_PSS_2026_Chapter_4.xlsx | `573625f73c0e311ff68c5635691801be955fd466cd9b5b4a0e00b8173852195c` |
| PESA 2026 Chapter 5 | https://assets.publishing.service.gov.uk/media/6a5772f59e63154454413701/PESA_2026_CP_Chapter_5_tables.xlsx | `ccb4539bb837c2b6a7f9509da49bd409eb9e5a910f3332311b494291fbd33107` |
| PSS July 2026 Chapter 5 | https://assets.publishing.service.gov.uk/media/6a574acd2cbe5d1c179a64fd/July_PSS_2026_Chapter_5.xlsx | `d61db8cad4f4333b192022e63979237d24dbdace7b354a846af2f4ac18b37436` |
| ESA Table 11 general government | https://www.ons.gov.uk/file?uri=/economy/governmentpublicsectorandtaxes/publicspending/datasets/esatable11annualexpenditureofgeneralgovernment/current/esatable11generalgovernment.xlsx | `545236391260ca77580cff5d8dba243b35f1e588d48067ed0f02287c7c3afa09` |

Chapter 1 and Chapter 5 **outturn cells used below match** between the PESA and PSS workbooks. The files are not byte-identical (PESA Chapter 1 also carries plan years). PSS July 2026 is the accredited outturn release. PESA 2026 is the command paper with plans.

---

## A. Where spending goes — TES / COFOG

### Preferred table: PESA / PSS **Table 5.4**

**Title:** Public sector current and capital expenditure on services by function, 2021-22 to 2025-26.  
**Sheet:** `5_4` in both chapter-5 workbooks.  
**Unit:** £ million. **Frequency:** financial year. **Status:** outturn (2025-26 is the first estimate; PSS says not every department had published its 2025-26 annual report).  
**Geography:** United Kingdom public sector (central government, local government, public corporations), including devolved administrations inside the functions.  
**History:** five outturn years, 2021-22 to 2025-26. No plan years on this table.  
**Classification:** UN COFOG level 1 (ten functions) plus HMT “of which” lines. Defence is **UN COFOG**, which is not the NATO defence definition (pensions sit in social protection).

**Published identities, 2024-25 outturn, £ million** (these aggregate rows add exactly):

| Step | Value |
|------|------:|
| Total public sector **current** expenditure on services | 1,034,248 |
| Total public sector **capital** expenditure on services | 132,204 |
| **Total public sector expenditure on services (TES)** | **1,166,452** |
| Accounting adjustments (bridge, not a function) | 123,560 |
| **Total Managed Expenditure** (this table’s row) | **1,290,012** |

Same year, the current and capital bridges also match Table 1.1:

- Current TES 1,034,248 + current accounting adjustments 111,714 = public sector current expenditure **1,145,962**
- Capital TES 132,204 + capital accounting adjustments 11,846 = public sector capital expenditure **144,050**

So the gap between “services” (TES) and this table’s TME is the published accounting-adjustments row: **£123,560 million** in 2024-25. That is the labelled gap. Do not drop it or spread it across functions.

**Leaf rows do not quite add to the published current total.** For 2024-25 the ten current COFOG rows plus EU transactions sum to **1,034,250**, which is **£2 million above** the published current TES of 1,034,248. Capital level-1 rows sum exactly in 2024-25. Across 2021-22 to 2025-26 the current or capital leaf gap is **£0 to £2 million** either way. Treat that as HMT rounding inside the £ million table. Do **not** invent an “other function” to force the stack shut. Store the published total as its own row.

**EU transactions** sit inside TES and outside the ten functions. 2024-25 current EU transactions = **−1,412** (£ million; a net receipt keeps the published sign). A pie of the ten functions is not TES.

**“Of which” lines are components, not extra slices.** They are HMT detail inside a function. They do not always exhaust the parent: economic affairs current, 2024-25, of-which lines sum to **44,337** against a parent of **44,338**. Chart the ten level-1 rows, not the of-which lines, unless a later pin checks each parent.

### Long-run companion: Table 4.2 (not the first pin)

**Title:** Public sector expenditure on services by function, 2003-04 to 2025-26.  
**Unit:** £ **billion**, one decimal place. Same COFOG level 1, plus EU transactions, TES, accounting adjustments, and TME.  
PSS July and PESA Chapter 4 agree on the spot cells below.

2024-25 (£ billion): Health **242.4**, Social protection **386.3**, TES **1,166.5**, accounting adjustments **123.6**, TME **1,290**.  
Health £242.4 billion is the Table 5.4 total (228,613 current + 13,816 capital = **242,429**) rounded to 0.1 billion. The £ billion identity is only good to about **£0.1 billion** (2024-25: level-1 + EU = 1,166.6 vs TES 1,166.5; TES + adjustments = 1,290.1 vs TME 1,290).

Use Table 4.2 only as a long-run companion, with the unit and the rounding in the label. Do not mix £ billion and £ million in one series.

Table 4.3 is the same classification in real terms (see Real terms). Table 5.2 is sub-function for 2021-22 to 2025-26 — later detail, not the first chart.

---

## B. DEL vs AME — Table 1.1

**PSS July 2026 Table 1.1** title: Total Managed Expenditure, 2021-22 to 2025-26. Outturn only. £ million.  
**PESA 2026 Table 1.1** title: Total Managed Expenditure, 2021-22 to **2028-29**. Same outturn numbers, then **plans** for 2026-27 to 2028-29.  
**Sheet:** `Table_1_1`.

Two published identities both equal the table’s TME. They use **different DEL definitions**. Pick one and label it. Do not add rows from both.

### Identity to pin (control totals)

2024-25 outturn, £ million. PSS and PESA agree.

| Row | 2024-25 | 2025-26 |
|-----|--------:|--------:|
| Total DEL (footnote 6) | 595,892 | 639,807 |
| Departmental AME | 605,568 | 622,645 |
| Other AME | 88,552 | 97,670 |
| **TME** | **1,290,012** | **1,360,122** |

`595,892 + 605,568 + 88,552 = 1,290,012` exactly.  
`639,807 + 622,645 + 97,670 = 1,360,122` exactly.

**Other AME is required.** Total DEL + Departmental AME = 1,201,460 in 2024-25, which is **£88,552 million short** of TME. A two-bar “DEL vs AME” chart that drops Other AME does not reach TME. Other AME includes net EU transfers, locally financed expenditure, central government gross debt interest, public corporations’ own-financed capital expenditure, and accounting adjustments (see the rows above the “of which” block).

### Second identity (resource and capital budgets)

Also exact on the published aggregate rows, 2024-25:

- Total resource DEL 469,578 + total resource AME 676,384 = public sector current expenditure **1,145,962**
- Total capital DEL 111,587 + total capital AME 32,463 = public sector gross investment **144,050**
- 1,145,962 + 144,050 = TME **1,290,012**

### Do not rebuild Total DEL from the lines above it

Footnote 6: Total DEL is resource DEL plus capital DEL, **excluding Scottish Government block grant adjustments** (Table 1.3).

2024-25 resource DEL + capital DEL = 469,578 + 111,587 = **581,165**, not Total DEL **595,892**.  
Table 1.3 row “Scottish Government Block Grant Adjustments” is **−14,726** in 2024-25. Adding that back is **£1 million** away from the published Total DEL (581,165 + 14,726 = 595,891). Same class of £1 million gap: resource departmental AME 539,206 + capital departmental AME 66,361 = **605,567**, against published Departmental AME **605,568**.

Use the published Total DEL, Departmental AME, and Other AME rows. Do not reconstruct them.

**Plans:** if a later chart uses PESA years after 2025-26, label them **plans**, not outturn. The first pin should be PSS outturn through 2025-26.

**Debt interest:** central government gross debt interest is inside Other AME (2024-25 = **85,386** £ million on Table 1.1). Link Domain 08 (`public-sector-debt-interest`, NMFX) in words. Do not merge NMFX into this table or into EBFT.

---

## C. ESA Table 11 — separate instrument

| Field | Value |
|-------|--------|
| Dataset | General government annual expenditure: ESA Table 11 |
| Publisher | ONS |
| Released | 23 Apr 2026, 07:00 |
| Years | Calendar **1995 to 2024** (one sheet per year) |
| Unit | £ million |
| Sector | **General government** |
| Total column | `OTE` — Total government expenditure |
| Geography | United Kingdom |

**Coversheet conflict:** the file’s coversheet says the table is “for local government only”. The dataset title, filename (`esatable11generalgovernment.xlsx`), and the 2024 `OTE` total of **£1,330,532 million** are the general-government file. Local government alone is not that large. Treat the coversheet sentence as a bad copy. Confirm sector again at pin time against the central and local workbooks (same release date).

**2024 calendar year, `OTE`, £ million:**

| Row | Total government expenditure |
|-----|-----------------------------:|
| `_T` Total | 1,330,532 |
| GF07 Health | 253,191 |
| GF09 Education | 141,118 |
| GF10 Social protection | 458,500 |

These are **not** TES. Health shows the gap in one cell: ESA GF07 calendar 2024 = **253,191**; TES health financial year 2024-25 = **242,429**. Different year, different sector (no public corporations in general government), different expenditure concept. Do not draw them on one axis.

ESA is a valid later instrument (`path-found-esa-table-11` as a **second** framework). It is not the first function pin, and it must not be rescaled onto EBFT or onto TES.

---

## D. OSCAR II — cannot tie to PSF

September 2026 in-year guidance (Q1 2026-27, April to June 2026):

> Treasury publications are sourced from OSCAR II, however National Statistics draw on additional sources. As a consequence it will not be possible to exactly tie back the new dataset containing in-year data with the aggregated data for central government spending published in the National Accounts or Public Sector Finances release.

Also on that page: Security and Intelligence Agencies are removed; in-year figures are provisional; the next release is due at the end of December 2026. Values in the in-year files are in **£ thousands** (see the Phase 0 handover). Control Budget codes can show DEL, AME, and non-budget for organisations. That is a departmental transparency instrument. It is not a composition of EBFT and not a substitute for Table 1.1.

---

## E. Real terms — inventory, not the first pin

Official deflated tables exist. They deflate **these HMT nominal tables**, not monthly EBFT.

| Table | What | Price base | Deflator note in the workbook |
|-------|------|------------|-------------------------------|
| PESA / PSS **Table 1.2** | Table 1.1 in real terms, £ million | **2025-26 prices** | ONS GDP deflators released **30 Jun 2026**. Plan years also use OBR deflator forecasts from the **3 Mar 2026** Economic and fiscal outlook |
| PESA / PSS **Table 4.3** | Table 4.2 in real terms, £ billion | **2025-26 prices** | ONS GDP deflators released **30 Jun 2026** |

Spot: Table 4.3 Health, 2024-25 = **250.8** £ billion (2025-26 prices), against nominal Table 4.2 Health **242.4**.  
Spot: Table 1.2 total resource DEL in 2025-26 equals the nominal **496,670**, which is what a 2025-26 price base should do.

No official monthly real-terms EBFT series was found. Do not divide EBFT by CPIH or by the GDP deflator in this domain unless Orchestrator later documents an Exchange method. Real-terms stays planned-not-ready for the flagship. A later pin may take Table 1.2 or 4.3 as labelled HMT real series.

---

## F. EBFT is a different number (worked comparison)

Exchange-derived sum of the Ready monthly pin (`total-managed-expenditure`, PSF release **2026-10-20**), April–March, £ million. This sum is **not** an official financial-year aggregate.

| Financial year | Sum of monthly EBFT | PESA/PSS Table 1.1 and Table 5.4 TME | Difference |
|----------------|--------------------:|--------------------------------------:|-----------:|
| 2023-24 | 1,258,195 | 1,230,807 | +27,388 |
| 2024-25 | 1,294,828 | 1,290,012 | +4,816 |

Reasons they can differ, without a full reconcile (out of scope here):

- Vintage: EBFT is the **20 Oct 2026** PSF; these HMT tables are **July 2026**.
- The HMT TME footnote excludes temporary effects of banks classified to the public sector.
- Monthly NSA levels summed across a financial year are a derived total. The package does not store an official FYTD.

Do not scale COFOG or DEL shares so they add up to 123,791 (the September 2026 EBFT month) or to a summed year of EBFT.

---

## Candidate register (Inbox draft IDs only)

Nothing here is ingested. IDs are proposals for a later pin task.

### May appear under Where spending goes (labelled TES)

| Draft indicator ID | Source | Framework | Unit | Frequency | Geography | History | Under EBFT? |
|--------------------|--------|-----------|------|-----------|-----------|---------|-------------|
| `tes-by-function` | PESA/PSS **Table 5.4** | TES / COFOG level 1, current and capital, plus EU transactions, published TES total, accounting adjustments, table TME as **bridge rows** | £ million | Financial year | UK public sector | 2021-22 to 2025-26 outturn | **No.** Totals are the table’s own TES and TME |
| `tes-by-function-long-run` | PESA/PSS **Table 4.2** | Same framework, already summed current+capital | £ billion, 1 d.p. | Financial year | UK public sector | 2003-04 to 2025-26 | **No.** Rounding ±£0.1 billion |

### May appear under DEL vs AME

| Draft indicator ID | Source | Framework | Unit | Frequency | Geography | History | Under EBFT? |
|--------------------|--------|-----------|------|-----------|-----------|---------|-------------|
| `tme-del-ame` | PSS **Table 1.1** “of which” block (PESA Table 1.1 matches outturn) | Total DEL + Departmental AME + Other AME = table TME | £ million | Financial year | UK | 2021-22 to 2025-26 outturn | **No.** Denominator is the table’s TME row |

Optional later rows on the same pin, still not EBFT: resource DEL, resource AME, capital DEL, capital AME, PSCE, PSGI. Plans (2026-27 onward) only from PESA, labelled plans.

### Separate instruments — not these two views

| Draft indicator ID | Source | Why it stays separate |
|--------------------|--------|------------------------|
| `esa-gg-expenditure-by-function` | ONS ESA Table 11 general government, column `OTE` | Calendar year, general government, ESA total expenditure |
| `oscar-control-budget` | OSCAR II in-year | Cannot exactly tie to PSF. Organisation lines, £ thousands |
| `pesa-tme-real-terms` | Table 1.2 | Official real TME **of the HMT table**, 2025-26 prices |
| `tes-by-function-real` | Table 4.3 | Official real TES, £ billion, 2025-26 prices |

---

## Spot-checks (2026-11-15)

User-Agent `BritishExchange-Economy/1.0`. Workbooks as checksummed above. No curated series written.

### 1. Function — Health, 2024-25 outturn

Source: [PESA 2026 Chapter 5](https://assets.publishing.service.gov.uk/media/6a5772f59e63154454413701/PESA_2026_CP_Chapter_5_tables.xlsx) sheet `5_4`, also PSS July 2026 Chapter 5 (same cells).

| Row | £ million |
|-----|----------:|
| 7. Health, current expenditure on services | 228,613 |
| 7. Health, capital expenditure on services | 13,816 |
| **Health total (current + capital)** | **242,429** |

[PESA 2026 Chapter 4](https://assets.publishing.service.gov.uk/media/6a5772e09e63154454413700/PESA_2026_CP_Chapter_4_tables.xlsx) Table 4.2 prints Health **242.4** £ billion for 2024-25. PSS Chapter 4 prints the same 242.4.

Publication page: https://www.gov.uk/government/statistics/public-expenditure-statistical-analyses-2026

### 2. DEL / AME — 2024-25 outturn

Source: [PSS July 2026 Chapter 1](https://assets.publishing.service.gov.uk/media/6a5749ec2f6185941a9a6519/July_PSS_2026_Chapter_1.xlsx) sheet `Table_1_1`. PESA Chapter 1 matches.

`Total DEL 595,892 + Departmental AME 605,568 + Other AME 88,552 = TME 1,290,012`

Release page: https://www.gov.uk/government/statistics/public-spending-statistics-release-july-2026 (updated 29 Jul 2026).

### 3. Cross-framework — do not merge

| Concept | Period | Value | Unit |
|---------|--------|------:|------|
| TES health (Table 5.4) | FY 2024-25 | 242,429 | £ million |
| ESA Table 11 GF07 Health `OTE` | Calendar 2024 | 253,191 | £ million |
| Table 5.4 / Table 1.1 TME | FY 2024-25 | 1,290,012 | £ million |
| Sum of monthly EBFT (derived) | FY 2024-25 | 1,294,828 | £ million |
| EBFT latest month (Ready pin) | 2026-09 | 123,791 | £ million NSA |

---

## What a later chart must not do

- Do not make COFOG or OSCAR slices add up to `total-managed-expenditure` / EBFT.
- Do not chart Tax − Spend = Borrow.
- Do not call TME “services people receive”. TES is the services framework, and even TES is not the ten functions alone (EU transactions and a £1–2 million leaf gap sit in the way) and is not TME (accounting adjustments of **£123,560 million** in 2024-25).
- Do not drop Other AME and still title the chart as shares of TME.
- Do not rebuild Total DEL from resource DEL + capital DEL.
- Do not treat PESA plan years as outturn.
- Do not put OSCAR organisation lines in the function or DEL view.
