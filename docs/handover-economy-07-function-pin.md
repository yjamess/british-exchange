# Handover — Economy Domain 07 · Function and DEL vs AME pin (EC-G2-07B-PIN)

**Author:** Economy domain subagent · **Date:** 2026-11-15  
**Notion plan:** [07 · Public Spending & Services](https://app.notion.com/p/41465471768581df9c9ad184839231b7)  
**Kickoff:** [agent-kickoff-economy-07-function-pin.md](agent-kickoff-economy-07-function-pin.md)  
**Discovery:** [handover-economy-07-function.md](handover-economy-07-function.md) · [economy-07-spending-source-matrix.md](economy-07-spending-source-matrix.md)  
**Registry:** [TES / COFOG](https://app.notion.com/p/41965471768581c5a15bea3cca34d474) · [DEL / AME](https://app.notion.com/p/419654717685815dbb3de6db75d6a00d) — both **Validation**, not Ready

> **Status:** Economy self-QA **pass**. Two reproducible packages. **Not Ready.** No frontend. EmptyStages stay until independent Validation `EC-VAL-07B` passes.

## Verdict (return to Orchestrator)

| Field | Value |
|-------|--------|
| **Indicators** | `tes-by-function` (140 rows) · `tme-del-ame` (20 rows) |
| **Source** | PSS July 2026, file updated **2026-07-29**. Outturn **2021-22 to 2025-26** only |
| **Self-QA** | **pass** — V1–V7 below. 2024-25 spots match the kickoff |
| **Table TME** | Same five values in both packages. Not monthly EBFT |
| **Not in these packages** | Table 4.2 £ billion, ESA Table 11, OSCAR, PESA plan years, resource/capital DEL |
| **Next** | Schedule Validation **`EC-VAL-07B`**. UI stays EmptyStage until PASS |

### How to reproduce

```bash
uv run python -m economy.connectors.tes_by_function
uv run python -m economy.connectors.tme_del_ame
```

## Row counts

| Package | Curated rows | What they are | Status |
|---------|-------------:|---------------|--------|
| `tes-by-function` | **140** | 10 COFOG functions × current and capital, EU transactions, TES totals (current, capital, total), accounting adjustments (current, capital, total), table TME. Five years | 112 final + 28 estimated |
| `tme-del-ame` | **20** | Total DEL, Departmental AME, Other AME, table TME. Five years | 16 final + 4 estimated |

`estimated` is **2025-26 only** (HMT's first outturn estimate). 2021-22 to 2024-25 are `final`. The workbook header says "outturn" for 2025-26; the release text says accounts were still incomplete, so the pin marks that year estimated.

Of-which lines on Table 5.4: **15 skipped**, not curated. No residual function series.

## Paths and checksums

Retrieved 2026-11-15. Checksums match the discovery read.

| Package | Raw file | SHA-256 |
|---------|----------|---------|
| `tes-by-function` | `data/economy/tes-by-function/raw/2026-11-15/July_PSS_2026_Chapter_5.xlsx` | `d61db8cad4f4333b192022e63979237d24dbdace7b354a846af2f4ac18b37436` |
| `tme-del-ame` | `data/economy/tme-del-ame/raw/2026-11-15/July_PSS_2026_Chapter_1.xlsx` | `ff40d00e69d7b5cb2db4504e24ba774dd09b181ac676d0518ab0e16581305dbe` |

Chapter 5 download: [July_PSS_2026_Chapter_5.xlsx](https://assets.publishing.service.gov.uk/media/6a574acd2cbe5d1c179a64fd/July_PSS_2026_Chapter_5.xlsx)  
Chapter 1 download: [July_PSS_2026_Chapter_1.xlsx](https://assets.publishing.service.gov.uk/media/6a5749ec2f6185941a9a6519/July_PSS_2026_Chapter_1.xlsx)  
Release page: [PSS July 2026](https://www.gov.uk/government/statistics/public-spending-statistics-release-july-2026) · OGL v3.0

Each package also has `manifest.yaml`, `README.md`, `source_register.csv`, `validation_report.md`, and `curated/observations.csv` plus `curated/identity_check.json`.

## Identity proofs

Unit throughout: **£ million**. Both packages' table TME rows are identical.

### V1 — TES and this table's TME (`tes-by-function`)

Published **total TES + accounting adjustments = table TME** in every pinned year (gap 0).

| Financial year | Current TES | Capital TES | Total TES | Current+capital minus TES | Adjustments | TES+adjustments minus TME | Table TME |
|----------------|------------:|------------:|----------:|---------------------------:|------------:|---------------------------:|----------:|
| 2021-22 | 857,803 | 94,142 | 951,945 | 0 | 88,943 | 0 | 1,040,888 |
| 2022-23 | 962,033 | 114,969 | 1,077,002 | 0 | 83,690 | 0 | 1,160,692 |
| 2023-24 | 991,684 | 123,292 | 1,114,977 | **-1** | 115,830 | 0 | 1,230,807 |
| 2024-25 | 1,034,248 | 132,204 | 1,166,452 | 0 | 123,560 | 0 | 1,290,012 |
| 2025-26 | 1,084,664 | 142,984 | 1,227,648 | 0 | 132,474 | 0 | 1,360,122 |

**2023-24 rounding, not corrected.** Current TES + capital TES is **£1 million below** the published TES total (991,684 + 123,292 = 1,114,976, published total 1,114,977). Current + capital accounting adjustments is **£1 million above** the published adjustments total. The two gaps offset, so TES + adjustments still equals table TME. Published cells are stored as printed. No residual row was added.

2024-25 is exact on both steps: 1,034,248 + 132,204 = **1,166,452**, and 1,166,452 + **123,560** = **1,290,012**.

Public-sector current expenditure and public-sector capital expenditure (the rows under the adjustments on the same sheet) were checked and **not curated**. For every year, current TES + current adjustments equals that current expenditure row, capital TES + capital adjustments equals the capital expenditure row, and those two rows sum to table TME.

### V2 — Health, 2024-25

| Row | £ million |
|-----|----------:|
| Health, current | 228,613 |
| Health, capital | 13,816 |
| **Sum** | **242,429** |

Table 4.2 (£ billion, Health 242.4) was **not** pinned, so that companion cell is not re-checked here.

### V3 — leaf gap, no residual function

Ten level-1 rows, plus EU transactions on the current side, versus the published TES total. Gap is **£0 to £2 million**. The published total is the stored total.

| Financial year | Side | Leaves | Published TES | Gap |
|----------------|------|-------:|--------------:|----:|
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

EU transactions, 2024-25 current: **-1,412** (published sign kept). A chart of the ten functions is not TES.

### V4 — DEL, AME, and this table's TME (`tme-del-ame`)

`Total DEL + Departmental AME + Other AME = table TME` in every pinned year.

| Financial year | Total DEL | Departmental AME | Other AME | Table TME |
|----------------|----------:|-----------------:|----------:|----------:|
| 2021-22 | 534,892 | 673,115 | **-167,119** | 1,040,888 |
| 2022-23 | 541,362 | 407,356 | 211,974 | 1,160,692 |
| 2023-24 | 558,434 | 542,776 | 129,597 | 1,230,807 |
| 2024-25 | 595,892 | 605,568 | 88,552 | **1,290,012** |
| 2025-26 | 639,807 | 622,645 | 97,670 | 1,360,122 |

Other AME is curated, including the negative 2021-22 value. Dropping it in 2024-25 would leave the total **£88,552 million** short.

**Total DEL was not rebuilt.** 2024-25 resource DEL 469,578 + capital DEL 111,587 = **581,165**, not published Total DEL **595,892**. Those two lines are in the source register as `curated=false` and are not in `observations.csv`.

## Financial year versus monthly EBFT

Read-only sum of Ready `total-managed-expenditure` (PSF release **2026-10-20**). April–March, 12 months each. Derived, not an official financial-year series. The Ready package was not edited.

| Financial year | Sum of monthly EBFT | HMT table TME | Difference |
|----------------|--------------------:|--------------:|-----------:|
| 2021-22 | 1,051,427 | 1,040,888 | 10,539 |
| 2022-23 | 1,178,953 | 1,160,692 | 18,261 |
| 2023-24 | 1,258,195 | 1,230,807 | 27,388 |
| 2024-25 | 1,294,828 | 1,290,012 | 4,816 |
| 2025-26 | 1,365,598 | 1,360,122 | 5,476 |

2023-24 and 2024-25 match the discovery figures. Do not rescale COFOG or DEL shares onto EBFT.

## Labels

- `tes-by-function` is **TES / COFOG**. TME on that sheet is a bridge (`denominator=hmt-table-tme`), not a function and not "services people receive".
- In 2024-25 the services total (TES) is **£123,560 million** below this table's TME. That gap is the published accounting-adjustments row.
- `tme-del-ame` denominator is **this table's TME**, not EBFT and not TES.
- Defence on Table 5.4 is the UN COFOG definition, not NATO. Debt interest inside General public services is an of-which line and is not a separate curated function.
- No Tax−Spend=Borrow identity. No OSCAR rows.

## Registry

| Indicator | Status | URL |
|-----------|--------|-----|
| `tes-by-function` | **Validation** | https://app.notion.com/p/41965471768581c5a15bea3cca34d474 |
| `tme-del-ame` | **Validation** | https://app.notion.com/p/419654717685815dbb3de6db75d6a00d |

## Validation ask — `EC-VAL-07B`

Independent Validation should file under `data/qa/` and should not silently rewrite these curated files.

| Check | Expectation |
|-------|-------------|
| V1 | Published total TES + accounting adjustments = table TME for every pinned year. Current + capital versus those published totals is exact except 2023-24 (£1 million, offsetting, cells not rewritten) |
| V2 | Health 2024-25 current 228,613 + capital 13,816 = 242,429. Table 4.2 is absent, so the £242.4 billion cell is out of scope |
| V3 | Level-1 + EU versus published current TES is documented. Gap is £0–2 million. No residual function |
| V4 | Total DEL + Departmental AME + Other AME = table TME for every pinned year. 2024-25 = 1,290,012. 2021-22 Other AME stays negative |
| V5 | Manifests say the totals are HMT financial-year TES / table TME, not monthly EBFT. Copy does not equate TME with services. No Tax−Spend=Borrow. No OSCAR rows |
| V6 | 2025-26 is `estimated`. No PESA plan years |
| V7 | ESA and OSCAR files are absent. That absence is correct |

**Out of scope until PASS:** Registry Ready, frontend, real-terms EBFT, OSCAR organisation totals, Table 4.2, Table 1.2.

## Blockers

| Blocker | Severity |
|---------|----------|
| Independent `EC-VAL-07B` has not run | Process (expected) |
| 2025-26 can still be revised. Next PSS update is in the November / February / April cycle | Timing |
| 2023-24 current+capital TES misses the published TES total by £1 million (adjustments split offsets it) | Minor. Store the published cells |
| Level-1 leaves miss published TES by up to £2 million | Minor. No residual function |
| Total DEL is not resource DEL + capital DEL (581,165 vs 595,892 in 2024-25) | Label. Published Total DEL is the curated row |
| HMT table TME ≠ summed monthly EBFT (about £4.8 billion in 2024-25; about £27.4 billion in 2023-24, this vintage pair) | Hard boundary. Do not rescale |

## Paths written

```txt
src/economy/connectors/pss_july_2026.py
src/economy/connectors/tes_by_function.py
src/economy/connectors/tme_del_ame.py
data/economy/tes-by-function/
data/economy/tme-del-ame/
docs/handover-economy-07-function-pin.md
```

`data/economy/total-managed-expenditure/` was read for the EBFT gap note and was not edited. `web/` was not edited.

## Do not

- Mark either row Ready before `EC-VAL-07B`
- Rescale these rows onto EBFT
- Drop Other AME
- Invent a residual function for the leaf gap
- Chart of-which lines as extra slices
- Treat resource DEL + capital DEL as Total DEL
- Add PESA plan years, OSCAR, or Table 4.2 £ billion into these two packages
