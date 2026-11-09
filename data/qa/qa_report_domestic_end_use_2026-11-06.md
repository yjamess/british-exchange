# QA report — domestic-end-use (U3) — 2026-11-06

## Scope
- Indicator: `domestic-end-use` (DESNZ ECUK Table U3)
- Raw: `data/energy/domestic-end-use/raw/2026-11-06/ECUK_2026_End_Use_tables.xlsx`
- Curated: `curated/observations.csv` (2,352 rows)
- UI: `/energy?domain=consumption&view=end-use`

## Checks
| ID | Check | Result | Notes |
|----|-------|--------|-------|
| U1 | Pinned raw SHA-256 | **pass** | `c2b5723055960875a1bcc383d35a1bc088ba04f90f0fa107a853fdfe6175f122` (matches Gate 1 End Use pin) |
| U2 | Curated schema + row count | **pass** | 2,352 = 56 years × 42 columns |
| U3 | Manifest completeness | **pass** | unit=ktoe; UK `K02000001` |
| U4 | Spot values vs Table U3 2025 | **pass** | space heating 20 666.69; water heating 5 905.11; domestic total 34 008.45 |
| U5 | Appliances coverage break | **pass** | Total appliances first final year = 2008 (earlier [x]) |
| U6 | Geography + unit + status | **pass** | geo={K02000001}; unit={ktoe} |

## Method notes
- Domestic cutaway only. Do not draw industry/services end uses from 1970 (U1/U2/U5 start 2021).
- `fuel=Total` end-use columns must not be stacked with fuel×end-use components.

## Summary
- Pass: 6/6
- Warn: 0
- Fail: 0
- Blockers: none
- Recommended next: Orchestrator marks registry **Ready**.
