# QA report — Energy Consumption Gate 2 (C1 + W1) — 2026-11-06

## Scope
- Indicators:
  - `final-energy-consumption-by-sector` (DESNZ ECUK Table C1)
  - `primary-energy-flow-allocation` (DESNZ ECUK Table W1)
- Raw pins:
  - `data/energy/final-energy-consumption-by-sector/raw/2026-11-06/ECUK_2026_Consumption_tables.xlsx`
  - `data/energy/primary-energy-flow-allocation/raw/2026-11-06/ECUK_2026_Whole_energy_flow_tables.xlsx`
- Curated: `curated/observations.csv` under each indicator tree
- UI: `/energy?domain=consumption`
- Related Ready series: `industrial-energy-consumption` (C1 Industry block only; QA 2026-11-03)

## Checks — `final-energy-consumption-by-sector`
| ID | Check | Result | Notes |
|----|-------|--------|-------|
| C1 | Pinned raw SHA-256 | **pass** | `e0b73e341a009e066f067492607c940d8df155c00d40568430bfbbe77f0e4bd2` — identical to industrial pin |
| C2 | Curated schema + row count | **pass** | 2,912 rows; expected 56 years × (11+13+9+8+11) fuels |
| C3 | Manifest completeness | **pass** | unit=ktoe; UK `K02000001`; connector + raw evidence present |
| C4 | Spot values vs Table C1 | **pass** | 6/6 (Industry 1970 Coal/Total; All-final 2025 Total 127 688.54; Domestic 2025 Natural gas; Transport 2025 Total; Services 2025 Electricity) |
| C5 | Sector Totals vs All final users | **pass** | 1970 residual 0; 2000/2025 residual ±0.01 ktoe (rounding) |
| C6 | Industry overlap vs `industrial-energy-consumption` | **pass** | 616/616 rows match on fuel × year × status × value |
| C7 | Geography + unit + status | **pass** | geo={K02000001}; unit={ktoe}; status final=2561 missing=351 |

## Checks — `primary-energy-flow-allocation`
| ID | Check | Result | Notes |
|----|-------|--------|-------|
| W1 | Pinned raw SHA-256 | **pass** | `dff5d263862fcec44295785e168ed2ebe4eb8e33c1f236d963ed99ee0a755f4c` |
| W2 | Curated schema + row count | **pass** | 336 rows = 12 stages × 28 years (1998–2025) |
| W3 | Manifest completeness | **pass** | unit=ktoe; caveats mark Official Statistics in Development |
| W4 | Spot values vs Table W1 | **pass** | 12/12 core-stage samples (1998 + 2025 × six destinations) |
| W5 | Primary ≈ sum of destinations | **pass** | 1998/2010 residual 0; 2017/2025 residual 0.01 ktoe |
| W6 | Cross-table join C1 ↔ W1 | **pass** | W1 Final consumption 2025 = C1 All-final Total 127 688.54 ktoe |
| W7 | Cover sheet assurance label | **pass** | Workbook Cover Sheet: “Official Statistics in Development” |
| W8 | Useful/rejected columns on W1 | **warn** | Non-missing only 2017–2025 (Ambient heat + useful/rejected + totals). Modelled / in-development — UI must not present as measured C1. Gate 3 W2 sheet remains a separate product. |
| W9 | Geography + unit + status | **pass** | geo={K02000001}; unit={ktoe}; status final=241 missing=95 |

## Method notes
- Do not stack C1 `fuel=Total` with component fuels; do not sum sector Totals with All-final Total.
- W1 Transfers can be signed; identity checks treat published signed values as given.
- National ECUK ≠ subnational final consumption (2005–2024) — Geography waits Gate 3.
- Useful/rejected on W1 from 2017 is not a licence to animate useful energy before 2017.

## Summary
- Pass: 15
- Warn: 1 (W8 useful/rejected labelling)
- Fail: 0
- Blockers: none
- Recommended next: Orchestrator marks both registry rows **Ready**; Gate 3 may ingest W2 sheet / subnational / Follow journey without reopening C1/W1 transforms.
