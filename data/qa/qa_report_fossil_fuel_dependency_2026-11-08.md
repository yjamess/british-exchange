# QA report — fossil-fuel-dependency — 2026-11-08

## Scope
- Indicator: `fossil-fuel-dependency` (DESNZ ET 1.3 Fossil fuel dependency [note 6])
- Manifest: `data/energy/fossil-fuel-dependency/manifest.yaml`
- Raw: `data/energy/fossil-fuel-dependency/raw/2026-11-03/ET_1.3_SEP_26.xlsx`
- Curated: `data/energy/fossil-fuel-dependency/curated/observations.csv` (142 rows)
- Connector: `src/energy/connectors/fossil_fuel_dependency.py`
- Shared parse: `src/energy/connectors/et13_dependency_sheets.py`
- Sibling Ready: `energy-import-dependency` (same workbook checksum)

Validation did **not** rewrite Energy curated/raw data.

## Checks
| ID | Check | Result | Notes |
|----|-------|--------|-------|
| C1 | Freeze checksum | **pass** | SHA-256 `7e3d230e…bb81` matches sibling import-dependency pin |
| C2 | Row count / split | **pass** | 142 = 28 annual + 114 quarterly |
| C3 | Unit / geography | **pass** | `unit=ratio`; `K02000001`; values in (0,1) for annual sample |
| C4 | Header / column | **pass** | Col 8 `Fossil fuel dependency [note 6]` |
| C5 | Spot 2025 annual | **pass** | Raw = curated `0.750771383802959` |
| C6 | Distinct from import dependency | **pass** | Different column; related ids listed; caveats forbid one security score |

## Summary
- **Verdict:** **PASS** → registry Status **Ready**
- **Blockers:** none
