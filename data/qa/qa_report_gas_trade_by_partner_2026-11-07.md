# QA report — gas-trade-by-partner — 2026-11-07

## Scope
- Indicator: `gas-trade-by-partner` (DESNZ **DUKES 4.5a**, natural gas imports/exports by country, GWh)
- Manifest: `data/energy/gas-trade-by-partner/manifest.yaml`
- Raw (pinned): `data/energy/gas-trade-by-partner/raw/2026-11-07/DUKES_4.5.xlsx`
- Curated: `data/energy/gas-trade-by-partner/curated/observations.csv` (464 rows)
- Connector (read-only): `src/energy/connectors/gas_trade_by_partner.py` · module `energy.connectors.gas_trade_by_partner`
- Energy hand-off: `data/energy/gas-trade-by-partner/validation_notes.md`
- Gate 3 B1: Imports Lifelines (siblings: `lng-imports-by-terminal`, `oil-imports-by-country`)
- Explicitly out of scope: sheet `4.5b` facility capacity (mm³/day)

Validation did **not** re-ingest as the primary path and did **not** edit Energy curated/raw data.

## Checks
| ID | Check | Result | Notes |
|----|-------|--------|-------|
| C1 | Freeze — SHA-256 of pinned raw vs manifest | **pass** | `9e005b47311313def8d45274db493938ba6b2383ec609865b3a436c81d91b12c` exact. Cover Sheet: published 30 July 2026; new data for 2025. |
| C2 | Curated row count + coverage | **pass** | 464 observations (matches claim). Years 2000–2025; unit all `GWh`; status all `final`; geo all `K02000001`. Flows: Imports 298 / Exports 140 / Net imports 26. Modes: Pipeline 234 / LNG 178 / Total 26 / Net 26. |
| C3 | Units / sheet match claimed DUKES 4.5a | **pass** | Workbook sheets include `4.5a` + `4.5b`; only `4.5a` ingested. Header row 6 matches connector expectations (`Import/ export`, `Pipeline/ LNG`, `Country of origin/ destination` + years). Cover Sheet states annual GWh. |
| C4 | Geography honesty — UK statistical; partners in notes; no invented landfalls | **pass** | Partners/modes/flows only in `notes`. No Bacton / Easington / St Fergus / Langeled coordinates invented. `4.5b` location text not promoted into Observations. |
| C5 | Transform honesty — zeros omitted for partners; aggregates kept | **pass** | Ordinary partner×mode zeros dropped; publisher totals (`Total pipeline`, `Total LNG`, `Total imports`, …) and Total/Net modes kept as `kind=aggregate`. |
| C6 | Numerical — full independent recompute vs curated | **pass** | Independent parse of `4.5a` with same omit/aggregate rules: **0 mismatches / 0 missing / 0 extras** (464/464). |
| C7 | Numerical — 2025 Energy-claimed spot samples | **pass** | Norway pipeline import 320249.12; USA LNG 106175.2; Qatar LNG 8216.34; Norway LNG 1817.85; Total imports 463691.92 — raw = curated = claim. |
| C8 | Numerical — 2025 Total pipeline + Total LNG = Total imports | **pass** | 326328.15 + 137363.77 = 463691.92 (float noise ~6e-11). |
| C9 | Cross-package consistency with lng-imports Total | **pass** | 2025 Total LNG 137363.77 GWh matches sibling `lng-imports-by-terminal` Total LNG imports on pinned DUKES 4.6. |
| C10 | Independence / deferred 4.5b honesty | **pass** | No Energy writes. No capacity/mm³/day rows leaked into curated. Open questions on GIS landfalls left open. |
| C11 | Cover Sheet revisions / 2025 LNG origin correction | **warn** | Revisions 1998–2024; 2025 Brazil/Mexico → USA LNG origin correction already in this pin (documented). Note 2 (2016) LNG methodology break also applies. Analysts should read Notes before long-run partner comparisons. Not a numerical fail on this freeze. |

## Spot-check table (2025, pinned sheet `4.5a`)

| Slice | XLSX (GWh) | Curated | Energy claim | Match |
|-------|------------|---------|--------------|-------|
| Import / Pipeline / Norway | 320249.12 | 320249.12 | 320249.12 | exact |
| Import / LNG / USA | 106175.2 | 106175.2 | 106175.2 | exact |
| Import / LNG / Qatar | 8216.34 | 8216.34 | 8216.34 | exact |
| Import / LNG / Norway | 1817.85 | 1817.85 | 1817.85 | exact |
| Import / Total / Total imports | 463691.92 | 463691.92 | 463691.92 | exact |

## Summary
- **Pass:** 10
- **Warn:** 1 (C11 revisions / Note 2 series break documentation for consumers)
- **Fail:** 0
- **Verdict:** critical QA **PASS**
- **Blockers:** none
- **Recommended fixes (owner Energy):** none for Ready. Keep `4.5b` as a separate optional capacity register if/when scoped.
- **Notion:** Validation does **not** mark Ready (Orchestrator hand-off). Evidence path for promotion: this report.
