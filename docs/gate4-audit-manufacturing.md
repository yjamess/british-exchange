# Gate 4 — Structural consistency audit · Domain 08 Manufacturing & Output

**Mode:** B — Finishing domain  
**Date:** 2026-11-10  
**References:** `docs/visual-identity.md` · `.cursor/rules/explorer-stage.mdc` · `exchange-domain-view` · Consumption · Generation Gate 4  
**Under audit:** `ManufacturingCanvas.tsx` · `manufacturing-model.ts` · `views/manufacturing.ts` · `/energy?domain=manufacturing`

## Verdict

**Ready.** Explorer grammar matches Domains 01–06. Honesty rules (index ≠ size; BRES ≠ Workforce Jobs; no plant map) sit in Notes / figure notes, not body essays.

## Mode & coverage

| Item | Covered |
|------|---------|
| Views | Anatomy · Output vs Jobs · Places · Data |
| Controls | Year · From · Level · Industry · National dial · Reset |
| Viewports | Live check Anatomy + Places (desktop) |
| States | EmptyStage paths (code) |
| Cross-check | Consumption stack · Generation RankBars / ChangeRows |
| Not inspected | Keyboard-only tour · full a11y scan · narrow mobile |

## What is consistent

- Locked Explorer order: crumb → question → tabs → figures → controls → stage → one `FigureRecord` Notes.
- Body is `s.stack` / `s.panel` + `stageTitle` + shared `TimeChart` / `ChangeRows` / `RankBars`.
- No Coverage strip; no second Notes block; no in-plot series selectors.
- URL state via `sync()`; Reset restores Year / From / Level / Industry / measure.
- Data tab shows observation tables (IoP branches + BRES regions + national series), not catalogue link dumps.
- Places is ranks + change only — not a fake choropleth or plant map.
- Lean IoP pack `energy.manufacturing-iop-annual` (year-means) avoids hanging SSR on the monthly CSV.

## Inconsistency matrix

| ID | Issue | Priority | Status |
|----|-------|----------|--------|
| MF-1 | Anatomy previously hung / empty on full monthly IoP CSV | P0 | **Fixed** — annual pack + `loadIopByDivision` |
| MF-2 | Places figure strip uses BRES year pool; Anatomy years no longer leak into Places | P1 | **Fixed** in M06 wire |
| MF-3 | Storage archive of annual pack | P2 | **Done** (`archive_data push --keep-local`) |
| MF-4 | Narrow mobile / keyboard tour | P2 | Not inspected |

## Close

Domain 08 Gate 4 **complete** for the Study C deepen (Anatomy + Places + Output vs Jobs + Data). Residual P2 only. British Product Ledger and full regional GVA atlas remain deferred product work, not Gate 4 blockers.
