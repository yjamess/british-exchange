# QA report — cross-sector-end-use (U1) — 2026-11-06

## Scope
- Indicator: `cross-sector-end-use` (DESNZ ECUK Table U1)
- Raw: shared End Use pin `ECUK_2026_End_Use_tables.xlsx`
- Curated: 220 observations (2021–2025 × end uses × 4 sectors)
- UI: `/energy?domain=consumption&view=end-use&end_scope=cross`

## Checks
| ID | Check | Result | Notes |
|----|-------|--------|-------|
| U1 | SHA-256 matches Gate 1 End Use pin | **pass** | `c2b5723055960875a1bcc383d35a1bc088ba04f90f0fa107a853fdfe6175f122` |
| U2 | Row count | **pass** | 220 |
| U3 | Spot 2025 Space heating… Total | **pass** | 39 932.59 ktoe matches sheet |
| U4 | Coverage break labelled | **pass** | Manifest + UI: from 2021; transport excluded |

## Summary
- Pass: 4/4 · Blockers: none · Ready recommended.
