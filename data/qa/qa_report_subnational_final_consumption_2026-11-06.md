# QA report — subnational-final-consumption — 2026-11-06

## Scope
- Indicator: `subnational-final-consumption` (DESNZ subnational total final, 2005–2024)
- Raw: `raw/2026-11-06/Subnational_total_final_consumption_2005_2024.xlsx`
- Curated: `observations.csv` (30,720) + `geography.json` (16 All-LA places)
- UI: `/energy?domain=consumption&view=geography`

## Checks
| ID | Check | Result | Notes |
|----|-------|--------|-------|
| S1 | Pinned raw SHA-256 | **pass** | `f9f26000bf688e1144a4b3b75a5240fcd23b91c697606cc887cee346ebe15701` |
| S2 | Curated row count | **pass** | 30,720 = 20 years × 384 places × 4 All-fuels sectors (DUKES rows skipped) |
| S3 | UK 2024 All fuels Total | **pass** | 119 531.34 ktoe matches sheet |
| S4 | Region rank 2024 | **pass** | South East largest English region at 16 079.75 ktoe |
| S5 | Distinct from ECUK C1 | **pass** | Manifest + UI Notes; coverage 2005–2024 only |
| S6 | Geography pack | **pass** | 16 nation/region All-LA places for explorer (API obs limit 10k) |

## Summary
- Pass: 6/6
- Fail: 0
- Blockers: none
- Recommended next: Orchestrator marks registry **Ready**; LA map can follow without reopening All-fuels transform.
