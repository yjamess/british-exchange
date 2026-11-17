# QA request — goods-trade-partner-commodity (HMRC OTS)

**Date:** 2026-11-16  
**Owner:** Economy → **Validation**  
**Status:** Ingested · not Ready

## Package

| Item | Path |
|------|------|
| Indicator | `goods-trade-partner-commodity` |
| Connector | `src/economy/connectors/goods_trade_partner_commodity.py` |
| Curated CSV | `data/economy/goods-trade-partner-commodity/curated/observations.csv` (14,508 rows) |
| Storage pack | `economy.goods-trade-partner-commodity` → `curated/partner_commodity_annual.json` (archived) |
| Manifest | `data/economy/goods-trade-partner-commodity/manifest.yaml` |
| Notes | `data/economy/goods-trade-partner-commodity/validation_notes.md` |

## Source

- HMRC UK Trade Info API `GET /OTS` with OData `$apply=groupby((CountryId,SITC/Sitc1Code), sum(Value))`
- Docs: https://www.uktradeinfo.com/api-documentation/
- Pin: OTS month **2026-09** (latest Non-EU export month with data at ingest)

## Coverage

- Years: 2023, 2024, 2025 (full) · 2026 YTD Jan–Sep (partial)
- Grain: ISO2 partner × flow (exports/imports) × SITC section 0–9
- Unit: £ million (GBP ÷ 1e6)
- ~240 partner countries

## Spot checks for Validation

1. Turkey 2025 exports SITC 7 (machinery) ≈ **£3,588m**
2. Turkey 2025 imports SITC 7 ≈ **£6,840m**
3. France 2025 exports SITC 0 (food) ≈ **£2.3bn** order of magnitude
4. No `GB` geography rows; ISO2 only
5. Do **not** require equality with ONS BoP `goods-trade-by-partner` cells (different basis)

## Honesty

OTS customs ≠ ONS BoP SA. SITC section only — not CN8×country microdata.
