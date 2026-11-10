# Gate 4 — Structural consistency audit · Domain 05 Energy Imports & Security

**Mode:** B — Finishing domain  
**Date:** 2026-11-09  
**References:** `docs/visual-identity.md` · `.cursor/rules/explorer-stage.mdc` · `exchange-domain-view` · Housing pipeline · Renewables Gate 4  
**Under audit:** `ImportsCanvas.tsx` · `ImportsData.tsx` · `/energy?domain=imports`

## Verdict

**Ready with fixes (applied 2026-11-09).** Frame was the closest of Domains 03–05 to Housing; Data-tab body note and catalogue-id titles were the P1 blockers.

## Mode & coverage

| Item | Covered |
|------|---------|
| Views | Lifelines · Resilience · Shock · Connectors · Trade · Data |
| Controls | Fuel · Flow · Mode · Partner · List · Event · Reset |
| Viewports | Code audit; narrow **Not inspected** live |
| Cross-check | Fossils Gap follow · DecisionLedger · Consumption |
| Not inspected | Choropleth stage size live · keyboard-only · full a11y |

## What is consistent

- Locked Explorer order; one Notes foot; no Coverage.
- Shock uses brand `DecisionLedger`.
- Lifelines: country choropleth + RankBars; LNG RankBars-only until coords Ready.
- Resilience: separate ratios — never one security score.
- Dial retired (`dependency` → resilience).

## Inconsistency matrix

| ID | Issue | Priority | Status |
|----|-------|----------|--------|
| IM-1 | Data body method note (`bo-prose` + inline style) | P1 | **Fixed** — removed; Notes foot carries coverage |
| IM-2 | Data titles printed catalogue IDs / internal terms | P1 | **Fixed** — plain titles + unit-only |
| IM-3 | Quarterly trade periods as `2024.25` | P1 | **Fixed** — `Q1 2024` labels |
| IM-4–10 | Series MenuControl · showTable · empty ControlRow · chart rule label · Reset gate · EmptyStage · map size | P2 | Deferred |

## Intentional variations to preserve

- Lifelines `WorldChoropleth` + ranks; no fake shipping routes.
- Shock Decision Ledger (events ≠ causes).
- Capacity MW ≠ flow GWh; stock GWh ≠ ratios.
- Publisher-native units never on one unmarked axis.

## Gate checklist (Mode B)

- [x] Locked slots and order
- [x] One Notes foot; no body method essays (after fix)
- [x] Shared instruments; DecisionLedger for Shock
- [x] URL state + Reset
- [x] EmptyStage for missing packs
- [x] No open P0/P1 after fixes
- [ ] Narrow viewport live pass — residual P2

## Close

Domain 05 Gate 4 **passed with fixes applied 2026-11-09**. Residual: LNG map pins · 4.4b sites — not Gate 4 blockers.
