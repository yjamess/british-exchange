# QA report — lng-imports-by-terminal — 2026-11-07

## Scope
- Indicator: `lng-imports-by-terminal` (DESNZ **DUKES 4.6**, LNG imports by terminal, GWh)
- Manifest: `data/energy/lng-imports-by-terminal/manifest.yaml`
- Raw (pinned): `data/energy/lng-imports-by-terminal/raw/2026-11-07/DUKES_4.6.xlsx`
- Curated: `data/energy/lng-imports-by-terminal/curated/observations.csv` (130 rows)
- Connector (read-only): `src/energy/connectors/lng_imports_by_terminal.py` · module `energy.connectors.lng_imports_by_terminal`
- Energy hand-off: `data/energy/lng-imports-by-terminal/validation_notes.md`
- Gate 3 B1: Imports Lifelines (siblings: `gas-trade-by-partner`, `oil-imports-by-country`)

Validation did **not** re-ingest as the primary path and did **not** edit Energy curated/raw data.

## Checks
| ID | Check | Result | Notes |
|----|-------|--------|-------|
| C1 | Freeze — SHA-256 of pinned raw vs manifest | **pass** | `5ae07c741aab95e6cec642fd3adb8e1ec4832dedccb1074e2192700e85b49284` exact. Official release 2026-07-30. |
| C2 | Curated row count + coverage | **pass** | 130 observations = 5 terminals × 26 years (2000–2025), including zeros. Matches claim ~130. Unit all `GWh`; status all `final`; geo all UK. |
| C3 | Units / sheet match claimed DUKES 4.6 | **pass** | Sheet `4.6` title “Table 4.6 Liquefied Natural Gas (LNG) imports by terminal (GWh)”. Header row 6: `LNG Import Terminal` + year columns 2000–2025. |
| C4 | Geography honesty — UK statistical; terminals as publisher labels only | **pass** | All `K02000001` / United Kingdom. Terminal names (incl. Milford Haven / Teeside place text) live only in `notes` as `terminal=<DESNZ label>`. No coordinates / invented landfalls. Terminal set exactly matches publisher five rows (Dragon, Isle of Grain, South Hook, Teeside GasPort, Total LNG imports). |
| C5 | Transform honesty — zeros kept; Total = aggregate | **pass** | Pre-commissioning / idle zeros retained (e.g. Teeside 2025 = 0). `Total LNG imports` marked `kind=aggregate`. Notes strip `[note N]` from labels. |
| C6 | Numerical — full independent recompute vs curated | **pass** | Independent parse of sheet `4.6`: **0 mismatches / 0 missing / 0 extras** (130/130). |
| C7 | Numerical — 2025 Energy-claimed spot samples | **pass** | South Hook 77446.91; Dragon 32272.78; Isle of Grain 27644.08; Teeside 0; Total LNG imports 137363.77 — raw = curated = claim. |
| C8 | Numerical — 2025 terminal sum = Total | **pass** | 77446.91 + 32272.78 + 27644.08 + 0 = 137363.77 (float noise ~3e-11). |
| C9 | Cross-package consistency with gas-trade Total LNG | **pass** | 2025 Total LNG imports 137363.77 GWh equals `gas-trade-by-partner` 2025 `partner=Total LNG; flow=Imports; mode=LNG` on pinned DUKES 4.5a (sibling freeze). |
| C10 | Independence / no silent rewrite | **pass** | No Energy writes. Map coordinates and DUKES 4.5b capacity remain out of scope as documented. |
| C11 | Note 2 (2016) LNG methodology break | **warn** | Publisher series break for additional cargo coverage from 2016 — documented in manifest/caveats; consumers should not treat pre/post-2016 as fully homogeneous without the note. Not a numerical fail. |

## Spot-check table (2025, pinned sheet `4.6`)

| Terminal | XLSX (GWh) | Curated | Energy claim | Match |
|----------|------------|---------|--------------|-------|
| South Hook (Milford Haven) | 77446.91 | 77446.91 | 77446.91 | exact |
| Dragon (Milford Haven) | 32272.78 | 32272.78 | 32272.78 | exact |
| Isle of Grain | 27644.08 | 27644.08 | 27644.08 | exact |
| Teeside GasPort (Teeside) | 0 | 0.0 | 0 | exact |
| Total LNG imports | 137363.77 | 137363.77 | 137363.77 | exact |

## Summary
- **Pass:** 10
- **Warn:** 1 (C11 Note 2 series break)
- **Fail:** 0
- **Verdict:** critical QA **PASS**
- **Blockers:** none
- **Recommended fixes (owner Energy):** none for Ready. Optional: surface Note 2 in UI copy when charting long runs.
- **Notion:** Validation does **not** mark Ready (Orchestrator hand-off). Evidence path for promotion: this report.
