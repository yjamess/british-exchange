# tes-by-function-real

**Owner:** Economy agent
**Status:** Validation-ready (Economy self-QA) — **not** Registry Ready
**indicator_id:** `tes-by-function-real`
**Source:** PSS July 2026 Table 4.3, £ billion, **2025-26 prices**, UK public sector, financial year

TES is expenditure on services. It is not this table's TME. This table's real TME is not monthly EBFT.

Real-terms figures are the nominal figures adjusted to 2025-26 price levels using GDP deflators from the Office for National Statistics (released 30 June 2026).
PESA plan years are not in these pins. Where PESA prints plan years, it also uses OBR GDP deflator forecasts from the 3 March 2026 Economic and fiscal outlook. That forecast deflator is not applied here.

## Reproduce

```bash
uv run python -m economy.connectors.tes_by_function_real
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

## Spot — Health, 2024-25

Table 4.3 Health **250.8** £ billion, 2025-26 prices.
Table 4.2 Health **242.4** £ billion, nominal. That companion cell is checked and **not** curated.

Same year: EU transactions **-1.5**. TES **1,206.6**. Accounting adjustments **127.8**. Table TME **1,334.5**.
TES + adjustments minus table TME = **-0.1**. The published cells are stored. No residual was added.

## Rounding

Level-1 rows plus EU transactions can miss published TES by up to £0.2 billion.
TES plus accounting adjustments can miss table TME by up to £0.1 billion in this workbook.
Largest leaf gap: £0.2 billion. Largest bridge gap: £0.1 billion. Years that are not exact: **18**.

Non-zero years only. Exact years are in `curated/identity_check.json`.

| Financial year | Level-1 + EU | Published TES | Leaf gap | Adjustments | Table TME | TES+adjustments minus TME |
|----------------|-------------:|--------------:|---------:|------------:|----------:|---------------------------:|
| 2003-04 | 801.0 | 801.0 | 0.0 | 81.1 | 882.0 | 0.1 |
| 2005-06 | 865.9 | 866.0 | -0.1 | 86.8 | 952.8 | 0.0 |
| 2006-07 | 879.0 | 878.9 | 0.1 | 90.9 | 969.8 | 0.0 |
| 2010-11 | 1,014.5 | 1,014.5 | 0.0 | 101.8 | 1,116.4 | -0.1 |
| 2011-12 | 997.2 | 997.4 | -0.2 | 99.3 | 1,096.7 | 0.0 |
| 2012-13 | 984.8 | 984.8 | 0.0 | 113.0 | 1,097.7 | 0.1 |
| 2013-14 | 980.4 | 980.3 | 0.1 | 102.8 | 1,083.1 | 0.0 |
| 2014-15 | 984.2 | 984.1 | 0.1 | 114.0 | 1,098.1 | 0.0 |
| 2015-16 | 997.4 | 997.3 | 0.1 | 103.7 | 1,101.0 | 0.0 |
| 2017-18 | 1,006.9 | 1,007.0 | -0.1 | 119.4 | 1,126.4 | 0.0 |
| 2018-19 | 1,014.4 | 1,014.3 | 0.1 | 109.7 | 1,124.0 | 0.0 |
| 2019-20 | 1,022.4 | 1,022.6 | -0.2 | 109.4 | 1,132.0 | 0.0 |
| 2020-21 | 1,229.6 | 1,229.6 | 0.0 | 111.2 | 1,340.7 | 0.1 |
| 2021-22 | 1,154.4 | 1,154.5 | -0.1 | 107.9 | 1,262.4 | 0.0 |
| 2022-23 | 1,220.3 | 1,220.4 | -0.1 | 94.8 | 1,315.2 | 0.0 |
| 2023-24 | 1,200.1 | 1,200.3 | -0.2 | 124.7 | 1,325.0 | 0.0 |
| 2024-25 | 1,206.5 | 1,206.6 | -0.1 | 127.8 | 1,334.5 | -0.1 |
| 2025-26 | 1,227.7 | 1,227.6 | 0.1 | 132.5 | 1,360.1 | 0.0 |

## Price base — 2025-26 real equals nominal Table 4.2

Every curated series in 2025-26 matches the same row on Table 4.2.
Table 4.2 is not written to this package.

## Not a real monthly EBFT

These rows are official HMT real-terms financial-year tables. They are not monthly EBFT divided by CPIH or by the GDP deflator. Do not treat real HMT table TME as a real monthly EBFT series.

## Raw

- File: `raw/2026-11-15/July_PSS_2026_Chapter_4.xlsx`
- SHA-256: `573625f73c0e311ff68c5635691801be955fd466cd9b5b4a0e00b8173852195c`
- Release date on the pin: 2026-07-29

Docs: `docs/handover-economy-07-real-pin.md`
