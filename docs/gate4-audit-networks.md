# Gate 4 — Structural consistency audit · Domain 07 Power Networks

**Mode:** B — Finishing domain  
**Date:** 2026-11-09  
**References:** `docs/visual-identity.md` · `.cursor/rules/explorer-stage.mdc` · `exchange-domain-view` · Housing pipeline · Imports Gate 4  
**Under audit:** `NetworksCanvas.tsx` · `networks-model.ts` · `views/networks.ts` · `/energy?domain=networks`

## Verdict

**Ready with fixes (applied 2026-11-09).** Connections Queue + Cable capacity deepen shipped; empty Capacity ControlRow and incomplete pack defaults cleared. Invisible Grid remains deferred (no Ready topology).

## Mode & coverage

| Item | Covered |
|------|---------|
| Views | Border · Queue · Capacity · After Dark · Data |
| Controls | Year · Flow · Basis · Gate · Status · Reset |
| Viewports | Code + live Queue/Capacity; narrow **Not inspected** |
| Cross-check | Imports Connectors (capacity link, no fork) · Renewables Gate 4 |
| Not inspected | Keyboard-only · full a11y · mobile screenshot pass |

## What is consistent

- Locked Explorer order; one Notes foot; no Coverage; no body method essays.
- Shared instruments: ledger · `TimeChart` · `RankBars` · tables; Follow outside stage.
- GB ≠ UK labelled; flows GWh ≠ capacity MW ≠ TEC contracted MW.
- Capacity links Ready `electricity-interconnector-capacity` (same series as Imports › Connectors).
- Queue uses Ready `transmission-entry-capacity-register`; EmptyStage when filters empty.
- URL state + Reset on Border / After Dark / Queue; Capacity has no empty ControlRow.

## Inconsistency matrix

| ID | Issue | Priority | Status |
|----|-------|----------|--------|
| NW-1 | `NetworksPack` defaults missing `tec` / `interconnectorCapacity` | P1 | **Fixed** — EnergyCanvas + EnergySector |
| NW-2 | Capacity view rendered empty ControlRow | P2 | **Fixed** — ControlRow only when controls exist |
| NW-3 | Sector series list omitted TEC + capacity IDs | P2 | **Fixed** — `sector-pages.ts` |
| NW-4 | Capacity pack absent from Postgres (API Unknown) | P0 for cloud | **Fixed** — `load_ready --only electricity-interconnector-capacity` |
| NW-5 | Narrow viewport live pass | P2 | Deferred |

## Intentional variations to preserve

- Border anatomy ledger (not a fake grid map).
- Queue RankBars by technology / gate / status + largest-lines table.
- Capacity RankBars only (pin snapshot, not a time series).
- After Dark lite stays GB NESO Imports fuel — not UK ET 5.6.
- Invisible Grid / DNO topology / constraint £ stay Blocked until Ready GIS.

## Gate checklist (Mode B)

- [x] Locked slots and order
- [x] One Notes foot; no body method essays
- [x] Shared instruments; no invented spare-capacity map
- [x] URL state + Reset where filters exist
- [x] EmptyStage for missing packs / empty filters
- [x] No open P0/P1 after fixes
- [ ] Narrow viewport live pass — residual P2

## Close

Domain 07 Gate 4 **passed with fixes applied 2026-11-09** for the shipped Study C + Queue + Capacity set. Residual: Invisible Grid topology · thermal constraint costs · DNO geospatial — product backlog, not Gate 4 blockers for this deepen.
