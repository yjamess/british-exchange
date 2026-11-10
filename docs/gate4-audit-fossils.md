# Gate 4 — Structural consistency audit · Domain 04 Oil, Gas & Fossil Fuels

**Mode:** B — Finishing domain  
**Date:** 2026-11-09  
**References:** `docs/visual-identity.md` · `.cursor/rules/explorer-stage.mdc` · `exchange-domain-view` · Generation atlas · Renewables Gate 4  
**Under audit:** `FossilsCanvas.tsx` · `FossilsData.tsx` · `/energy?domain=fossil`

## Verdict

**Ready with fixes (applied 2026-11-09).** Shell matched the locked frame; inverted `leaders` and a FigureStrip mismatch were the P1 blockers.

## Mode & coverage

| Item | Covered |
|------|---------|
| Views | North Sea · Extraction · Gap · Reserves · Data |
| Controls | Year · Status · Fuel · Scale · Search · Reset |
| Viewports | Code audit; narrow **Not inspected** live |
| Cross-check | Generation atlas · Imports Resilience follow · Consumption |
| Not inspected | Browser map size · keyboard-only · full a11y |

## What is consistent

- Explorer slots locked; one Notes foot; Data via `tableGroup`.
- Field map + aside as custom instrument (one ink).
- Multi-unit honesty (Mt · bcm · Mtoe · %) labelled separately.
- Production Gap does not duplicate Imports dependency chart.

## Inconsistency matrix

| ID | Issue | Priority | Status |
|----|-------|----------|--------|
| FO-1 | `leaders` inverted (multi on, single off) | P1 | **Fixed** — removed props; TimeChart defaults |
| FO-2 | FigureStrip “Choose a square…” on National/Fuel scales | P1 | **Fixed** — Selected field only on Field scale |
| FO-3 | Raw search label vs `SearchControl` | P2 | Deferred |
| FO-4 | `--bo-slate` missing token | P2 | **Fixed** — `--bo-chart-reference` |
| FO-5 | Jargon (post-COP / 2P / ET 1.3) | P2 | Deferred — 2P explained in Notes |
| FO-6–9 | Data `s.links`, Reset gate, map size, shadow name | P2 | Deferred |

## Intentional variations to preserve

- `FieldPointMap` + field aside.
- View-by National / Fuel / Field as ControlRow (not in-plot).
- Categorical map legend tones shared with station maps.

## Gate checklist (Mode B)

- [x] Locked slots and order
- [x] One Notes foot; no Coverage
- [x] Shared instruments; leaders defaults after fix
- [x] Custom map instrument one ink
- [x] URL state + Reset
- [x] No open P0/P1 after fixes
- [ ] Narrow viewport live pass — residual P2

## Close

Domain 04 Gate 4 **passed with fixes applied 2026-11-09**. Residual: BGS coalfields · NSTA wells · editorial — not Gate 4 blockers.
