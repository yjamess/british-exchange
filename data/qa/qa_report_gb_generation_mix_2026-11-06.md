# QA report — gb-generation-mix-half-hourly — 2026-11-06

## Scope
- Indicator: `gb-generation-mix-half-hourly` (NESO Historic GB Generation Mix)
- Raw: `data/energy/gb-generation-mix-half-hourly/raw/2026-11-06/neso_historic_gb_generation_mix_2024.csv` (17,568 half-hours)
- Curated: `curated/observations.csv` (132 monthly MWh rows)
- Manifest + connector: `src/energy/connectors/gb_generation_mix.py`
- UI: `/energy?domain=generation&view=year`

## Checks
| ID | Check | Result | Notes |
|----|-------|--------|-------|
| C1 | Pinned raw SHA-256 | **pass** | `815a9793cb00ca0fec66bc2fe6b547cc08368d8fa74cf7bb0bad8fc575c6795a` |
| C2 | Row count / year coverage | **pass** | 17,568 half-hours 2024-01-01 → 2024-12-31T23:30; 12 months × 11 fuels = 132 |
| C3 | MW × 0.5 → MWh (Jan Gas) | **pass** | raw sum 9,649,866.0 MWh = curated `fuel=Gas` Jan |
| C4 | Aggregate GENERATION excluded | **pass** | curated fuels are components only |
| C5 | Geography | **pass** | `K03000001` Great Britain; Notes warn GB ≠ UK / ET 5.1 |
| C6 | Annual total order of magnitude | **pass** | ~281 TWh from monthly components (UI headline) |

## Summary
- Pass: 6/6
- Warn: 0
- Fail: 0
- Blockers: none
- Recommended next: Orchestrator marks registry **Ready** (Notion status may still say Ingesting/Validation until updated).
