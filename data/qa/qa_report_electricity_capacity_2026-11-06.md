# QA report — electricity-capacity-by-technology — 2026-11-06

## Scope
- Indicator: `electricity-capacity-by-technology` (DESNZ DUKES 5.12.C)
- Raw: `data/energy/electricity-capacity-by-technology/raw/2026-11-06/DUKES_5.12.xlsx`
- Curated: `data/energy/electricity-capacity-by-technology/curated/observations.csv` (225 rows)
- Manifest: `data/energy/electricity-capacity-by-technology/manifest.yaml`
- Connector: `src/energy/connectors/electricity_capacity.py`
- UI: `/energy?domain=generation&view=capacity`

## Checks
| ID | Check | Result | Notes |
|----|-------|--------|-------|
| C1 | Pinned raw SHA-256 | **pass** | `2eaad76e1c9e8db7b114a093487d61631a5099910be5874dc676d277ca6b4915` matches manifest |
| C2 | Curated schema + row count | **pass** | 225 rows; years 2011–2025; unit MW; geo K02000001; status final |
| C3 | Manifest completeness | **pass** | series_id, caveats (installed ≠ de-rated), connector module, Notion URL present |
| C4 | Independent recompute Tx+Dx vs curated | **pass** | 0/225 mismatches (>0.05 MW). Excludes network type `All` (would double-count) |
| C5 | Aggregate Total rows excluded | **pass** | 0 curated rows with Total fuels; notes=`fuel=<label>` only |
| C6 | Component sum vs official Total Tx+Dx (2025) | **pass** | components 111103.434 MW; Total rows 111103.4341 MW; Δ ≈ 0.0001 MW |
| C7 | Spot values (2024) | **pass** | CCGT gas 32219.1046 MW; Solar 19429.6778 MW — match UI GW display (32.2 / 19.4) |
| C8 | Method vs DUKES 5.7 | **pass** | Caveats correctly warn: this is installed (nameplate), not de-rated (5.7); chapter PDF cites 5.12 for underrated totals |

## Method notes for Orchestrator
- Table 5.12.C includes Transmission, Distribution, and an `All` roll-up. Connector correctly sums **Transmission + Distribution only**.
- Fuel labels are DUKES labels (e.g. `CCGT gas`, `Wind (offshore)`), not ET 5.1 labels — UI presents capacity and generation side by side without forcing a matched cohort.
- DUKES 5.7 remains pinned as de-rated reference only; do not fork a second Ready indicator until needed.

## Summary
- Pass: 8/8
- Warn: 0
- Fail: 0
- Blockers: none
- Recommended next: Orchestrator marks registry **Ready**; Capacity ≠ Electricity view can treat the series as trusted.
