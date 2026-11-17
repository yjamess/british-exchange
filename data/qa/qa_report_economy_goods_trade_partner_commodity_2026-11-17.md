# QA report — 2026-11-17

## Scope

- Economy files: `data/economy/goods-trade-partner-commodity/`
- Indicator: `goods-trade-partner-commodity`
- Storage pack: `economy.goods-trade-partner-commodity`
- Connector: `src/economy/connectors/goods_trade_partner_commodity.py`
- Pin: HMRC OTS **2026-09** (raw under `raw/2026-11-16/`)

## Checks

| ID | Check | Result | Notes |
|----|-------|--------|-------|
| C1 | Curated row count | pass | 14,508 observations |
| C2 | Coverage years | pass | 2023–2025 full (end 12-31); 2026 YTD to 2026-09-30 (`partial`) |
| C3 | Grain | pass | ISO2 × flow (exports/imports) × SITC1 0–9; ~235–240 partners/year |
| C4 | No GB partner rows | pass | 0 rows with `geography_code=GB`; all codes length 2 |
| C5 | Turkey 2025 exports SITC 7 | pass | Curated £3,588.444m |
| C6 | Turkey 2025 imports SITC 7 | pass | Curated £6,840.088m |
| C7 | France 2025 exports SITC 0 | pass | Curated £2,364.228m (~£2.3bn order of magnitude) |
| C8 | Raw recompute TR 2025 SITC 7 | pass | From `raw/.../ots/2025_{exports,imports}.json` CountryId 52: exports £3,588.443599bn → £3,588.444m; imports £6,840.088m — matches curated |
| C9 | Pack ↔ CSV | pass | Pack `by_year` + honesty + coverage present; unit £ million; source_version HMRC OTS 2026-09 |
| C10 | Method honesty | pass | Manifest/caveats state OTS ≠ ONS BoP SA; SITC1 only (not CN8×country) |
| C11 | Live API re-query | warn | Live HMRC API not reached from this Validation run (network). Independence satisfied via pinned raw recompute (C8) |

## Summary

- **Result:** **PASS** (Ready for UI)
- **Blockers:** none
- **Recommended fixes (owner):** none
- **UI note:** Trading world dossier may wire partner × SITC1 frames from pack `economy.goods-trade-partner-commodity`. Keep ONS BoP partner map totals separate from OTS product mix in source lines.
