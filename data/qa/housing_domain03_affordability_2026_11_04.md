# QA — Housing Domain 03 Affordability (new series) · 2026-11-04

The `housing-affordability-by-age` series checked below was removed on 5 November 2026. It was the ONS chart that ended in 2016. The Ages view now uses the English Housing Survey age-cohort annex (tables 2.7 and 4.4) and FA2555. The rows beneath are the record of that earlier check; they do not describe a series still in the tree.

Independent spot-checks after ingest. Validation does not rewrite curated CSVs.

| Check | Result | Notes |
|-------|--------|-------|
| housing-affordability-by-age row count | pass | 62 observations (31 years × 2 bands) |
| Age series end year | pass | Last year 2016 (ONS dvc583 chart10) |
| Ages 25–34 2016 | pass | 6.38 matches CSV |
| mortgage-rate-2yr-fixed latest | pass | Sep 2026 = 5.13% (IUMBV34) |
| housing-purchase-affordability England median/median FYE 2024 | pass | 7.89 on Table 4 |
| Decile grid cell count | pass | 81 (9×9) for England latest FY |
| rent-to-earnings-ratio latest | pass | 2025 ≈ 0.4306; recomputed Sep rent×12 / AFF1 1b |

## Caveats for UI

- Age bands in the removed ONS chart were historical only. The live Ages view uses the English Housing Survey, not that chart.
- Rent-to-earnings is **derived** (PIPR × AFF1), not an ONS rent-to-income release.
- Purchase-affordability uses household disposable income — not AFF1 workplace earnings.
- Budget default rate uses BoE IUMBV34 when the API serves it.

## Ready for Orchestrator

Mark Domain 03 remaining slices shippable for Gate 2 UI once smoke URLs confirm.
