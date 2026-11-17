# tes-by-function-long-run

**Owner:** Economy agent
**Status:** Validation-ready (Economy self-QA) — **not** Registry Ready
**indicator_id:** `tes-by-function-long-run`
**Source:** PSS July 2026 Table 4.2, £ billion, **nominal**, UK public sector, financial year

TES is expenditure on services. It is not this table's TME. This table's TME is not monthly EBFT.
This package is the long-run companion of `tes-by-function`. It does not contain £ million rows.

## Reproduce

```bash
uv run python -m economy.connectors.tes_by_function_long_run
```

## What is curated

| Role | What | Chart as a function slice? |
|------|------|----------------------------|
| `function` | Ten COFOG level-1 totals (current and capital already summed) | Yes, these ten only |
| `eu-transactions` | EU transactions, published sign | No. Inside TES, outside the ten |
| `tes-total` | Published public sector expenditure on services | No. It is the total |
| `bridge` | Accounting adjustments | No. Not a function |
| `table-tme` | This table's Total Managed Expenditure | No. Denominator is `hmt-table-tme` |

Of-which lines are not curated. There is no current/capital split on this sheet.
Do not add leaves, the TES total, and the TME bridge together.

History: **2003-04 to 2025-26** (23 outturn years). 2025-26 is `estimated`. Earlier years are `final`.

## Spot — 2024-25, £ billion nominal

Health **242.4**. Social protection **386.3**.
EU transactions **-1.4**. TES **1,166.5**. Accounting adjustments **123.6**. Table TME **1,290.0**.
Leaf gap **0.1**. TES + adjustments minus table TME = **0.1**.
The published cells are stored. No residual was added.

Table 4.3 Health the same year is **250.8** in 2025-26 prices. That sheet is checked and **not** curated.

## Rounding

Level-1 rows plus EU transactions can miss published TES by up to £0.2 billion.
TES plus accounting adjustments can miss table TME by up to £0.1 billion in this workbook.
Largest leaf gap: £0.2 billion. Largest bridge gap: £0.1 billion. Years that are not exact: **10**.

Non-zero years only. Exact years are in `curated/identity_check.json`.

| Financial year | Level-1 + EU | Published TES | Leaf gap | Adjustments | Table TME | TES+adjustments minus TME |
|----------------|-------------:|--------------:|---------:|------------:|----------:|---------------------------:|
| 2009-10 | 654.9 | 654.9 | 0.0 | 65.5 | 720.3 | 0.1 |
| 2012-13 | 681.0 | 681.0 | 0.0 | 78.1 | 759.2 | -0.1 |
| 2014-15 | 704.5 | 704.5 | 0.0 | 81.6 | 786.2 | -0.1 |
| 2016-17 | 727.2 | 727.2 | 0.0 | 84.3 | 811.4 | 0.1 |
| 2018-19 | 772.5 | 772.5 | 0.0 | 83.5 | 856.1 | -0.1 |
| 2020-21 | 1,011.5 | 1,011.4 | 0.1 | 91.5 | 1,102.9 | 0.0 |
| 2021-22 | 952.0 | 951.9 | 0.1 | 88.9 | 1,040.9 | -0.1 |
| 2022-23 | 1,076.8 | 1,077.0 | -0.2 | 83.7 | 1,160.7 | 0.0 |
| 2024-25 | 1,166.6 | 1,166.5 | 0.1 | 123.6 | 1,290.0 | 0.1 |
| 2025-26 | 1,227.7 | 1,227.6 | 0.1 | 132.5 | 1,360.1 | 0.0 |

## Not the other function series

- `tes-by-function` is Table 5.4 in **£ million**, five years, current and capital split.
- `tes-by-function-real` is Table 4.3 in **£ billion, 2025-26 prices**.
- This package is Table 4.2 in **£ billion, nominal**.
- In 2025-26, Table 4.2 equals Table 4.3 because that year is the price base.
- Health 242.4 is the one-decimal rounding of Table 5.4 Health 242,429 £ million.
  The £ million figure is not stored here.

## Raw

- File: `raw/2026-11-15/July_PSS_2026_Chapter_4.xlsx`
- SHA-256: `573625f73c0e311ff68c5635691801be955fd466cd9b5b4a0e00b8173852195c`
- Release date on the pin: 2026-07-29

Docs: `docs/handover-economy-07-longrun-esa.md`
