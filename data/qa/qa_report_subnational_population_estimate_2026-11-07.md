# QA report — subnational-population-estimate — 2026-11-07

## Scope
- Indicator: `subnational-population-estimate` (People)
- Raw: `raw/2026-11-07/mye24tablesuk.xlsx` (MYE2 Persons mid-2024); `raw/2026-11-07/myebtablesuk20112025.xlsx` (MYEB1)
- Curated: `observations.csv` (5 458) + `population.json` (404 places)
- Consumer: Energy Geography intensity (`/energy?domain=consumption&view=geography&geo_measure=intensity`)

## Checks
| ID | Check | Result | Notes |
|----|-------|--------|-------|
| P1 | MYE2 pinned SHA-256 | **pass** | `f78d50e8d77fe5ed9d04667d6875aefcf62b56380af7aceb2e90dce067981526` |
| P2 | MYEB pinned SHA-256 | **pass** | `d9ff4766d114ace7a40c351ba697f4a875e9e80270d9f58185319a26791f2c53` |
| P3 | UK mid-2024 All ages | **pass** | 69 281 437 persons (MYE2) |
| P4 | London region mid-2024 | **pass** | 9 089 736 persons (MYE2) |
| P5 | MYEB LA aggregation | **pass** | Hartlepool 2011 = 92 088 (matches MYEB1 sum); 2024 overwritten by MYE2 98 180 |
| P6 | Energy LA join (2024) | **warn** | 359 / 361 authorities match. Unmatched April-2025 codes: Barnsley `E08000038`, Sheffield `E08000039` (no intensity until MYE catches up) |
| P7 | Region time series | **warn** | English regions only have mid-2024 in this pack; intensity for other energy years uses mid-2024 denominator and UI Notes must say so |
| P8 | Intensity sample 2024 | **pass** | London All-fuels ≈ 1.21 toe/person; Hartlepool ≈ 1.76; City of London ≈ 16.3 (workplace vs resident — Notes must not treat as household intensity) |

## Summary
- Pass: 5/8 · Warn: 3/8 · Fail: 0
- Blockers: none for shipping Total vs Per resident with visible denominators
- Recommended next: Orchestrator marks registry **Ready** (People); Energy keeps unmatched LAs as “intensity unavailable”
