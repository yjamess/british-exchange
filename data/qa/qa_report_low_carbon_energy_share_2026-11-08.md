# QA report — low-carbon-energy-share — 2026-11-08

## Scope
- Indicator: `low-carbon-energy-share` (DESNZ ET 1.3 Low carbon share [note 6])
- Manifest: `data/energy/low-carbon-energy-share/manifest.yaml`
- Raw: `data/energy/low-carbon-energy-share/raw/2026-11-03/ET_1.3_SEP_26.xlsx`
- Curated: `data/energy/low-carbon-energy-share/curated/observations.csv` (142 rows)
- Connector: `src/energy/connectors/low_carbon_energy_share.py`
- Shared parse: `src/energy/connectors/et13_dependency_sheets.py`
- Sibling Ready: `energy-import-dependency` (same workbook checksum)

Validation did **not** rewrite Energy curated/raw data.

## Checks
| ID | Check | Result | Notes |
|----|-------|--------|-------|
| C1 | Freeze checksum | **pass** | SHA-256 `7e3d230e…bb81` matches sibling import-dependency pin |
| C2 | Row count / split | **pass** | 142 = 28 annual + 114 quarterly |
| C3 | Unit / geography | **pass** | `unit=ratio`; `K02000001` |
| C4 | Header / column | **pass** | Col 9 `Low carbon share [note 6]` |
| C5 | Spot 2025 annual | **pass** | Raw = curated `0.21976602671110312` |
| C6 | Distinct from fossil / import dependency | **pass** | Separate column; caveats forbid one security score |

## Summary
- **Verdict:** **PASS** → registry Status **Ready**
- **Blockers:** none
