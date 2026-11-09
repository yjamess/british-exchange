# QA report — natural-gas-storage — 2026-11-08

## Scope
- Indicator: `natural-gas-storage` (DESNZ DUKES 4.4a)
- Raw: `data/energy/natural-gas-storage/raw/2026-11-08/DUKES_4.4.xlsx`
- Curated: `data/energy/natural-gas-storage/curated/observations.csv` (54 rows)
- Connector (read-only): `src/energy/connectors/natural_gas_storage.py`
- Method: SHA-256 + full re-parse vs curated + sample cells; curated/raw not edited

## Checks
| ID | Check | Result | Notes |
|----|-------|--------|-------|
| C1 | Pinned raw SHA-256 vs manifest | **pass** | `0c9f37a6561c18c7ed6065da42f7e454452e8aa368dab95068a00ad72326daa8` |
| C2 | Full parse ↔ curated (54 rows) | **pass** | parsed=54 curated=54 |
| C3 | Sample cells vs workbook | **pass** | 2008/2016/2025 stock; 2015/2017/2025 capacity; 2022 stock_change |
| C4 | Three measures × 18 years | **pass** | {'stock': 18, 'stock_change': 18, 'storage_capacity': 18} |
| C5 | Geography UK · unit GWh | **pass** | K02000001 |
| C6 | 2016 series-break tag | **pass** | Note 1 National Grid / LNG stock inclusion |
| C7 | Not a security score / not 4.4b sites | **pass** | Annual GWh stock measures only; site mcm register deferred |

## Summary
- Pass: 7
- Fail: 0
- Blockers: none
- Recommended fixes (owner: Energy): none required for acceptance.
- Notion action: Orchestrator may mark Ready after this report.
- Independence: curated/raw untouched.
