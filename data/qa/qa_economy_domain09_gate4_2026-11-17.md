# QA roll-up — Economy Domain 09 Gate 4 re-run

**Date:** 2026-11-17  
**Domain:** Trade & Investment (`investment`)  
**Structural audit:** `docs/gate4-audit-economy-09-trade-2026-11-17.md`  
**Result:** **PASS**

## Scope

- UI: Trading world services lens; FDI partner map; UK nation RegionMap; OTS dossier (prior)
- Data: no new curated CSV this pass; nations display from ONS Countries Dec 2025 BUC
- Prior Ready packages unchanged

## Checks

| ID | Check | Result | Notes |
|----|-------|--------|-------|
| G1 | OTS SITC1 Ready | pass | `qa_report_economy_goods_trade_partner_commodity_2026-11-17.md` |
| G2 | Goods ≠ services maps | pass | Separate world lenses; no joined choropleth |
| G3 | FDI map honesty | pass | Explicit `fdiPartnerToA3`; off-map set for aggregates / NE-missing |
| G4 | UK nation GSS codes | pass | RegionMap data keyed E92000001 / S92000003 / W92000004 / N92000002 |
| G5 | Business rail | pass | Landscape + Births & deaths retained |
| G6 | Structural Mode B | pass | See gate4 audit |

## Summary

- **Blockers:** none
- **Recommended fixes:** none for Gate 4 close
