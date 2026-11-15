# Handover — Economy Domain 07 · Real terms pin (EC-G2-07C-PIN)

**Author:** Economy domain subagent · **Date:** 2026-11-15  
**Notion plan:** [07 · Public Spending & Services](https://app.notion.com/p/41465471768581df9c9ad184839231b7)  
**Kickoff:** [agent-kickoff-economy-07-real-pin.md](agent-kickoff-economy-07-real-pin.md)  
**Discovery:** [economy-07-spending-source-matrix.md](economy-07-spending-source-matrix.md) §E  
**Nominal siblings:** [handover-economy-07-function-pin.md](handover-economy-07-function-pin.md)  
**Registry:** [real DEL / AME](https://app.notion.com/p/419654717685815ba4c7d9d669dd661b) · [real TES / COFOG](https://app.notion.com/p/4196547176858116bd53d358fb541942) — both **Validation**, not Ready

> **Status:** Economy self-QA **pass**. Two reproducible real-terms packages. **Not Ready.** No frontend. Monthly EBFT was not deflated. EmptyStages stay until independent Validation `EC-VAL-07C` passes.

## Verdict (return to Orchestrator)

| Field | Value |
|-------|--------|
| **Indicators** | `tme-del-ame-real` (20 rows) · `tes-by-function-real` (322 rows) |
| **Source** | PSS July 2026, file updated **2026-07-29**. Outturn only |
| **Price base** | **2025-26 prices**. ONS GDP deflators released **30 June 2026** |
| **Self-QA** | **pass**. Spots below match the kickoff |
| **Not in these packages** | Deflated monthly EBFT, PESA plan years, OSCAR, a curated Table 4.2 series |
| **Next** | Schedule Validation **`EC-VAL-07C`**. UI stays blocked until PASS |

### How to reproduce

```bash
uv run python -m economy.connectors.tme_del_ame_real
uv run python -m economy.connectors.tes_by_function_real
```

## Row counts

| Package | Curated rows | What they are | Status |
|---------|-------------:|---------------|--------|
| `tme-del-ame-real` | **20** | Total DEL, Departmental AME, Other AME, table TME. Five years, £ million, 2025-26 prices | 16 final + 4 estimated |
| `tes-by-function-real` | **322** | 10 COFOG functions, EU transactions, TES, accounting adjustments, table TME. 23 years, £ billion, 2025-26 prices | 308 final + 14 estimated |

`estimated` is **2025-26 only** (HMT's first outturn estimate). Earlier pinned years are `final`.

Of-which lines on Table 4.3: **8 skipped**, not curated. No residual function series.

Table 4.3 history is **2003-04 to 2025-26**. Those years are all marked outturn on the sheet. There is no plan year to drop.

## Paths and checksums

Retrieved 2026-11-15. Checksums match the discovery read.

| Package | Raw file | SHA-256 |
|---------|----------|---------|
| `tme-del-ame-real` | `data/economy/tme-del-ame-real/raw/2026-11-15/July_PSS_2026_Chapter_1.xlsx` | `ff40d00e69d7b5cb2db4504e24ba774dd09b181ac676d0518ab0e16581305dbe` |
| `tes-by-function-real` | `data/economy/tes-by-function-real/raw/2026-11-15/July_PSS_2026_Chapter_4.xlsx` | `573625f73c0e311ff68c5635691801be955fd466cd9b5b4a0e00b8173852195c` |

Chapter 1 is the same file as the nominal `tme-del-ame` pin (a second copy under this package).  
Chapter 4 download: [July_PSS_2026_Chapter_4.xlsx](https://assets.publishing.service.gov.uk/media/6a574aac822fbe6b8245c955/July_PSS_2026_Chapter_4.xlsx)  
Chapter 1 download: [July_PSS_2026_Chapter_1.xlsx](https://assets.publishing.service.gov.uk/media/6a5749ec2f6185941a9a6519/July_PSS_2026_Chapter_1.xlsx)  
Release page: [PSS July 2026](https://www.gov.uk/government/statistics/public-spending-statistics-release-july-2026) · OGL v3.0

Each package also has `manifest.yaml`, `README.md`, `source_register.csv`, `validation_report.md`, and `curated/observations.csv` plus `curated/identity_check.json`.

## Price base and deflator

Workbook footnote, both tables: real-terms figures are the nominal figures adjusted to **2025-26 price levels** using GDP deflators from the Office for National Statistics (released **30 June 2026**).

PESA plan years are not in these workbooks. Where PESA prints plan years, it also uses OBR GDP deflator forecasts from the **3 March 2026** Economic and fiscal outlook. That forecast deflator is **not** applied here.

In the price-base year, real equals nominal:

- Table 1.2 resource DEL 2025-26 = Table 1.1 resource DEL 2025-26 = **496,670** (£ million).
- The four Table 1.2 control totals in 2025-26 equal Table 1.1: Total DEL 639,807, Departmental AME 622,645, Other AME 97,670, table TME 1,360,122.
- Every curated Table 4.3 series in 2025-26 equals the same row on nominal Table 4.2. Table 4.2 is checked in memory and **not** written as its own series.

Earlier years are restated in 2025-26 prices, so they are not equal to the nominal pins. 2024-25 real table TME on Table 1.2 is 1,334,457, not the nominal 1,290,012.

## Identity proofs

### Table 1.2 — DEL, AME, and this table's real TME

Unit: **£ million, 2025-26 prices**.

`Total DEL + Departmental AME + Other AME = table TME` in every pinned year.

| Financial year | Total DEL | Departmental AME | Other AME | Table TME |
|----------------|----------:|-----------------:|----------:|----------:|
| 2021-22 | 648,705 | 816,338 | **-202,678** | 1,262,365 |
| 2022-23 | 613,433 | 461,587 | 240,194 | 1,315,214 |
| 2023-24 | 601,148 | 584,293 | 139,510 | 1,324,951 |
| 2024-25 | 616,422 | 626,432 | 91,603 | 1,334,457 |
| 2025-26 | 639,807 | 622,645 | 97,670 | 1,360,122 |

Other AME is curated, including the negative 2021-22 value.

**Total DEL was not rebuilt.** 2024-25 resource DEL 485,757 + capital DEL 115,432 = **601,189**, not published Total DEL **616,422**. Footnote 7 points at Scottish Government block grant adjustments on Table 1.4. Those two lines are in the source register as `curated=false`.

### Table 4.3 — Health and the services bridge

Unit: **£ billion, 2025-26 prices**, one decimal place.

| Row | 2024-25 | What it is |
|-----|--------:|------------|
| Health (Table 4.3) | **250.8** | Real. Kickoff spot |
| Health (Table 4.2) | **242.4** | Nominal companion. Checked, not curated |
| EU transactions | -1.5 | Published sign kept |
| TES | 1,206.6 | Published total |
| Accounting adjustments | 127.8 | Bridge, not a function |
| Table TME | 1,334.5 | This table's real TME |

TES 1,206.6 + adjustments 127.8 = 1,334.4, which is **£0.1 billion below** published table TME 1,334.5. The published cells are stored. No residual row was added.

Across 2003-04 to 2025-26, the level-1 leaves plus EU miss published TES by at most **£0.2 billion**. TES plus adjustments miss table TME by at most **£0.1 billion**. 18 of 23 years are not exact at one decimal place. The full year table is in `data/economy/tes-by-function-real/validation_report.md` and `curated/identity_check.json`.

### Do not splice the two units

Table 1.2 TME and Table 4.3 TME are the same HMT concept at different rounding.

| Year | Table 1.2 (£ million) | ÷ 1,000 | Table 4.3 (£ billion) |
|------|----------------------:|--------:|----------------------:|
| 2024-25 | 1,334,457 | 1,334.457 | 1,334.5 |
| 2025-26 | 1,360,122 | 1,360.122 | 1,360.1 |

That is published rounding, not a licence to rescale one series onto the other.

## Not a real monthly EBFT

These rows are official HMT real-terms financial-year tables. They are not monthly `total-managed-expenditure` divided by CPIH or by the GDP deflator. Real HMT table TME is not a real monthly EBFT series.

The nominal gap between HMT table TME and a derived sum of monthly EBFT stays on the nominal pin. This pin does not recompute it in real terms.

## Labels

- `tme-del-ame-real` denominator is **this table's real TME** (`denominator=hmt-table-tme`), not EBFT and not TES.
- `tes-by-function-real` is **TES / COFOG in real terms**. TME on that sheet is a bridge, not a function and not "services people receive".
- Defence is the UN COFOG definition, not NATO. Debt interest inside General public services is an of-which line and is not a separate curated function.
- No Tax−Spend=Borrow identity. No OSCAR rows. No PESA plan years.

## Registry

| Indicator | Status | URL |
|-----------|--------|-----|
| `tme-del-ame-real` | **Validation** | https://app.notion.com/p/419654717685815ba4c7d9d669dd661b |
| `tes-by-function-real` | **Validation** | https://app.notion.com/p/4196547176858116bd53d358fb541942 |

## Validation ask — `EC-VAL-07C`

Independent Validation should file under `data/qa/` and should not silently rewrite these curated files.

| Check | Expectation |
|-------|-------------|
| R1 | Table 1.2: Total DEL + Departmental AME + Other AME = real table TME for every pinned year. 2021-22 Other AME stays negative (−202,678) |
| R2 | Price base: Table 1.2 resource DEL 2025-26 = **496,670** and equals Table 1.1. The four control totals in 2025-26 equal nominal Table 1.1. Earlier real table TME is not equal to nominal table TME |
| R3 | Total DEL is not resource DEL + capital DEL. 2024-25: 485,757 + 115,432 = 601,189, not 616,422. Those lines are not curated |
| F1 | Table 4.3 Health 2024-25 = **250.8** £ billion, 2025-26 prices |
| F2 | Table 4.2 Health 2024-25 = **242.4**. That sheet is not a curated series |
| F3 | Level-1 + EU versus published TES, and TES + adjustments versus table TME, stay within £0.2 billion. 2024-25 bridge gap is −0.1. No residual function. Eight of-which lines skipped |
| F4 | Every curated Table 4.3 series in 2025-26 equals the same Table 4.2 row |
| F5 | 2025-26 is `estimated` on both packages. No PESA plan years. Table 4.3 runs 2003-04 to 2025-26 only |
| F6 | Units are not mixed. `tme-del-ame-real` is £ million. `tes-by-function-real` is £ billion. Manifests name the 2025-26 price base and the ONS deflator (30 June 2026), and say the OBR plan-year deflator is not applied |
| F7 | Manifests say these are HMT real financial-year tables, not deflated monthly EBFT. No Tax−Spend=Borrow. No OSCAR rows |

**Out of scope until PASS:** Registry Ready, frontend, deflating monthly EBFT, OSCAR, a separate Table 4.2 pin, PESA plan years.

## Blockers

| Blocker | Severity |
|---------|----------|
| Independent `EC-VAL-07C` has not run | Process (expected) |
| 2025-26 can still be revised. Next PSS update is in the November / February / April cycle | Timing |
| Table 4.3 rounding is up to £0.2 billion on the leaf sum and £0.1 billion on TES + adjustments versus TME | Minor. Store the published cells |
| Total DEL is not resource DEL + capital DEL (601,189 vs 616,422 in 2024-25) | Label. Published Total DEL is the curated row |
| Real HMT table TME is not real monthly EBFT | Hard boundary. Do not deflate EBFT |
| £ million Table 1.2 and £ billion Table 4.3 round differently | Do not splice the units |

## Paths written

```txt
src/economy/connectors/pss_july_2026.py          # shared real-terms helpers added
src/economy/connectors/tme_del_ame_real.py
src/economy/connectors/tes_by_function_real.py
data/economy/tme-del-ame-real/
data/economy/tes-by-function-real/
docs/handover-economy-07-real-pin.md
```

`data/economy/tme-del-ame/` and `data/economy/tes-by-function/` were not rewritten. `data/economy/total-managed-expenditure/` was not read for a real-terms gap and was not edited. `web/` was not edited.

## Do not

- Mark either row Ready before `EC-VAL-07C`
- Deflate monthly `total-managed-expenditure` with CPIH or the GDP deflator
- Treat real HMT table TME as real monthly EBFT
- Drop Other AME
- Rebuild Total DEL from resource DEL + capital DEL
- Invent a residual function for the £ billion rounding gap
- Chart of-which lines as extra slices
- Mix £ million and £ billion in one series
- Add PESA plan years or the OBR forecast deflator
- Curate Table 4.2 as if this pin had created `tes-by-function-long-run`
