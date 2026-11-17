# Validation notes — goods-trade-partner-commodity

**Status:** **Ready** (Validation PASS 2026-11-17 — `data/qa/qa_report_economy_goods_trade_partner_commodity_2026-11-17.md`).

## Checks for Validation

1. **Turkey 2025 exports top section** — connector spot: sitc1=`7` · Machinery & transport equipment · £3588.444m. Re-query API for CountryId 52, 202501–202512, FlowTypeId 2|4, groupby Sitc1Code; convert GBP÷1e6.
2. **France 2025 food (SITC 0) exports** — should be ~£2.3bn order of magnitude (API Jan–Dec 2025 Non-EU+EU).
3. **Coverage** — years ['2023', '2024', '2025', '2026']; latest coverage `{'2023': {'months': 12, 'first': '2023-01-01', 'last': '2023-12-31', 'partial': False}, '2024': {'months': 12, 'first': '2024-01-01', 'last': '2024-12-31', 'partial': False}, '2025': {'months': 12, 'first': '2025-01-01', 'last': '2025-12-31', 'partial': False}, '2026': {'months': 9, 'first': '2026-01-01', 'last': '2026-09-30', 'partial': True}}`.
4. **No GB partner rows**; ISO2 only.
5. **Do not compare cell-by-cell to ONS BoP partner totals** — different basis.

## Source pin

- API docs: https://www.uktradeinfo.com/api-documentation/
- Release month in pack: HMRC OTS 2026-09
