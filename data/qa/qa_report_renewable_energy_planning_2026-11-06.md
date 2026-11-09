# QA report — renewable-energy-planning-operational — 2026-11-06

## Scope
- Indicator: `renewable-energy-planning-operational` (DESNZ REPD)
- Raw: `data/energy/renewable-energy-planning-operational/raw/2026-11-06/REPD_Publication_Q2_2026.csv`
- Curated: `curated/observations.csv` (20 technology rows) + `curated/atlas.json`
- Connector: `src/energy/connectors/renewable_energy_planning.py`
- UI: `/energy?domain=generation&view=atlas`

## Checks
| ID | Check | Result | Notes |
|----|-------|--------|-------|
| C1 | Pinned raw SHA-256 | **pass** | `84c1b5f958a934d8b4b86ec88f50bdcf43830ded7ff2efc27bffca0c98695035` |
| C2 | Operational filter | **pass** | 3,132 rows with Development Status (short)=Operational |
| C3 | Technology MW vs curated | **pass** | 0/20 mismatches; total 58,603.6 MW |
| C4 | Offshore MW in atlas.json | **pass** | 16,045.5 MW; held off TileMap by design |
| C5 | Operational site count | **pass** | atlas `operational_sites` = 3,132 |
| C6 | Region tile MW | **pass** | 0 mismatches vs independent REGION→GSS sum |
| C7 | Largest site | **pass** | Dinorwig 1,728 MW matches raw |
| C8 | No fossil/nuclear tech labels | **pass** | Coverage honesty holds in curated fuels |
| C9 | Geo / unit / status | **pass** | K02000001; MW; final |

## Method notes
- REPD is a renewables (+ storage) planning register — not a full UK generating fleet.
- Encoding of the pin is cp1252 (not UTF-8).
- Threshold ≥150 kW (≥1 MW before 2021) is a publisher rule, not an Exchange filter.

## Summary
- Pass: 9/9
- Warn: 0
- Fail: 0
- Blockers: none
- Recommended next: Orchestrator marks registry **Ready**.
