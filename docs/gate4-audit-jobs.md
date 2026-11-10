# Gate 4 — Structural consistency audit · Domain 09 Jobs & Productivity

**Mode:** B — Finishing domain  
**Date:** 2026-11-10  
**References:** `docs/visual-identity.md` · `.cursor/rules/explorer-stage.mdc` · `exchange-domain-view` · Manufacturing Gate 4  
**Under audit:** `JobsCanvas.tsx` · `jobs-model.ts` · `views/industrial-work.ts` · `/energy?domain=industrial-work`

## Verdict

**Ready.** Explorer grammar matches Domains 01–08. Honesty rules (workforce jobs ≠ BRES employee jobs; never IoP÷jobs; hours = official DK3V) sit in Notes / figure notes, not body essays.

## Mode & coverage

| Item | Covered |
|------|---------|
| Views | Landscape · Atlas · Productivity · Pay · Data |
| Controls | Year · From · Branches · Industry · Measure · Reset |
| States | EmptyStage paths (code) |
| Cross-check | Manufacturing Places · Productivity Machine formula |
| Not inspected | Keyboard-only tour · full a11y scan · narrow mobile |

## What is consistent

- Locked Explorer order: crumb → question → tabs → figures → controls → stage → one `FigureRecord` Notes.
- Body is `s.stack` / `s.panel` + `stageTitle` + shared `TimeChart` / `RankBars` / `ChangeRows`.
- No Coverage strip; no second Notes block; no in-plot series selectors.
- URL state via `sync()`; Reset restores Year / From / Level / Industry / measure.
- Data tab shows observation tables, not catalogue link dumps.
- Atlas is ranks + change only — not a fake plant choropleth.
- Productivity Machine plots official DJK6 / DJ4P and DK3V hours — never invents productivity.

## Inconsistency matrix

| ID | Issue | Priority | Status |
|----|-------|----------|--------|
| J-1 | Landscape was national-only “interim” without Atlas | P0 | **Fixed** — Employment Atlas from Ready BRES |
| J-2 | Hours component deferred / invented risk | P0 | **Fixed** — Ready `manufacturing-productivity-hours` (DK3V) |
| J-3 | Output-per-job twin missing | P1 | **Fixed** — Ready `manufacturing-output-per-job` (DJ4P) |
| J-4 | Data tab was catalogue link dump | P1 | **Fixed** — observation tables |
| J-5 | ASHE manufacturing pay | P1 | **Fixed** — Ready `ashe-manufacturing-earnings` · Pay tab |
| J-6 | Industrial Lives | P2 | Deferred — owner sourcing verified plant openings/closures |
| J-7 | Narrow mobile / keyboard tour | P2 | Not inspected |

## Close

Domain 09 Gate 4 **complete** for Landscape · Atlas · Productivity · Pay · Data. Residual P2: Industrial Lives (verified openings/closures register) and optional ASHE multi-year / real £.
