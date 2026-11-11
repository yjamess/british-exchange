# Economy Domain 01 — COICOP CDID map (Orchestrator lock)

**Locked:** 2026-11-11 · **Owner:** Orchestrator  
**Domain:** [01 · Inflation & Prices](https://app.notion.com/p/41465471768581d09883c708f8f5f27c)  
**Dataset:** ONS MM23 · Consumer price inflation time series  
**Verified against live ONS `/data`:** 2026-11-11 (release 2026-10-20; next 18 Nov 2026)

## Scope decision (locked)

| Lever | Decision |
|-------|----------|
| Family | **CPIH** division **annual rates** only for Categories v1 |
| Why | ONS lead household measure; matches Energy `cpih-index` / Wages CPIH pairing |
| Depth | **12 COICOP divisions** (01–12) — not groups/classes/subclasses |
| Not in v1 | CPI division rates; CPI/CPIH division indexes; basket weights; rounding effect L5GO |
| Honesty | Never mix CPI and CPIH category families on one axis. Contributions are official ONS MM23 percentage-point series (not an Exchange derivation). |

CPI twins are listed below for reference only — **do not ingest** in this pass.

## Ingest set — CPIH annual rate by division

| Div | Short label | CDID | Indicator id | Latest (2026-09) |
| --- | --- | --- | --- | --- |
| 01 | Food & non-alcoholic beverages | **L55P** | `cpih-inflation-food` | 1.3% |
| 02 | Alcoholic beverages & tobacco | **L55Q** | `cpih-inflation-alcohol-tobacco` | 2.5% |
| 03 | Clothing & footwear | **L55R** | `cpih-inflation-clothing` | 0.1% |
| 04 | Housing, water & fuels | **L55S** | `cpih-inflation-housing` | 4.5% |
| 05 | Furnishings, household equipment & repair | **L55T** | `cpih-inflation-furnishings` | 1.0% |
| 06 | Health | **L55U** | `cpih-inflation-health` | 3.5% |
| 07 | Transport | **L55V** | `cpih-inflation-transport` | 6.6% |
| 08 | Communication | **L55W** | `cpih-inflation-communication` | 5.8% |
| 09 | Recreation & culture | **L55X** | `cpih-inflation-recreation` | 2.3% |
| 10 | Education | **L55Y** | `cpih-inflation-education` | 5.0% |
| 11 | Hotels, cafés & restaurants | **L55Z** | `cpih-inflation-restaurants` | 3.8% |
| 12 | Miscellaneous goods & services | **L562** | `cpih-inflation-miscellaneous` | 3.1% |

All: UK `K02000001` · monthly · 453 months (1989-01 → 2026-09) · OGL v3.0 · companion headline `cpih-inflation` (L55O).

Landing URL pattern:  
`https://www.ons.gov.uk/economy/inflationandpriceindices/timeseries/<cdid-lower>/mm23`

## Ingest set — CPIH contribution to all-items annual rate (pp)

Official ONS MM23 timeseries (not derived). Verified live 2026-11-11. Twelve divisions; **exclude** rounding effect **L5GO**.

| Div | Short label | CDID | Indicator id |
| --- | --- | --- | --- |
| 01 | Food & non-alcoholic beverages | **L5H5** | `cpih-contribution-food` |
| 02 | Alcoholic beverages & tobacco | **L5H6** | `cpih-contribution-alcohol-tobacco` |
| 03 | Clothing & footwear | **L5H7** | `cpih-contribution-clothing` |
| 04 | Housing, water & fuels | **L5H8** | `cpih-contribution-housing` |
| 05 | Furnishings & household equipment | **L5H9** | `cpih-contribution-furnishings` |
| 06 | Health | **L5HA** | `cpih-contribution-health` |
| 07 | Transport | **L5HB** | `cpih-contribution-transport` |
| 08 | Communication | **L5HC** | `cpih-contribution-communication` |
| 09 | Recreation & culture | **L5HD** | `cpih-contribution-recreation` |
| 10 | Education | **L5HE** | `cpih-contribution-education` |
| 11 | Hotels, cafés & restaurants | **L5HF** | `cpih-contribution-restaurants` |
| 12 | Miscellaneous goods & services | **L5HG** | `cpih-contribution-miscellaneous` |

Unit: percentage points contribution to the CPIH all-items annual rate. Sum of divisions ≈ headline L55O (small rounding residual in L5GO).

Connector: `economy.connectors.cpih_coicop_contributions`.

## Reference only — CPI annual rate by division (not ingested)

| Div | CDID |
| --- | --- |
| 01–12 | D7G8, D7G9, D7GA, D7GB, D7GC, D7GD, D7GE, D7GF, D7GG, D7GH, D7GI, D7GJ |

## Everyday basket — average prices (sourced 2026-11-11)

| Source | Status | Notes |
|--------|--------|-------|
| ONS [Shopping prices tool data (pre-2025 update)](https://www.ons.gov.uk/economy/inflationandpriceindices/adhocs/2724shoppingpricescomparisontooldatadownloadbeforethe2025update) | **Pinned** | `datadownload1.xlsx` → `everyday-basket-average-prices`; Jan 2018 → Jan 2025 |
| Live post-2025 tool download | Open | Methodology break (scanner segments); new pin required before extending |
| Retailer shelf scrapes | **Forbidden** | Out of scope |

**Scoped basket (2026-11-11)** — Category1 allowlist in `economy.connectors.everyday_basket.CATEGORY1_ALLOWLIST` (~326 items):

Food and drink · Food and drink establishments · Household items · Services · Health · Transport.

Original ten UI specimens keep stable slug overrides in `BASKET_ITEMS` (white sliced bread · wholemeal sliced bread · whole milk · semi-skimmed milk · eggs · butter · bananas · white potatoes · instant coffee · restaurant cup of coffee). Catalogue: `curated/items.json`. Excluded: Clothing and footwear · Recreation and culture.

Petrol/diesel not in this ONS file — out of scope.

## Connector / Validation path

1. Specs in `src/economy/connectors/coicop_cpih_series.py`
2. Batch runner `economy.connectors.cpih_coicop_divisions`
3. Registry rows → Validation → Ready before Categories UI draws RankBars
4. Average-prices connector follows once the ONS average-price file pin is locked

## Re-pin

After **18 Nov 2026** CPI release — all twelve + headline CPIH/CPI quartet.
