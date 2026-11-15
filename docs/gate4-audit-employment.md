# Gate 4 — Structural consistency audit · Economy Domain 03 Employment & Labour Market

**Mode:** B — Finishing domain  
**Date:** 2026-11-15  
**References:** `docs/visual-identity.md` · `.cursor/rules/explorer-stage.mdc` · `exchange-domain-view` · Debt Gate 4 · Growth / Wages peers  
**Under audit:** `EmploymentCanvas.tsx` · `workforce-model.ts` · `load.ts` · `domain-sources.ts` · `connections/economy.ts` · `sector-pages.ts` · `/economy?domain=employment`

## Verdict

**Ready.** Explorer grammar matches Economy peers. Counts ≠ rates ≠ jobs ≠ vacancies stay separate. Industry specimen wall restored (labelled Field Guide pattern). P1 Follow gaps and Hours Notes honesty closed in this pass. Validation numeric QA already green (four reports).

## Mode & coverage

| Item | Covered |
|------|---------|
| Views | The British Workforce · Rates · Outside the Workforce · What Britain Does for Work · The Working Week · The Demand for Labour · Geography · Data |
| Controls | Show · Compare from · From · Industry · Measure · Series · Reset |
| States | EmptyStage paths (code) · live API packs |
| Cross-check | Debt Gate 4 · Energy Jobs manufacturing Follow · Regions HI00 ownership |
| Validation | LMS 50/0/0 · complete 82/0/0 · gaps 24/0/0 · HI00 59/0/0 |
| Not inspected | Full keyboard tour · a11y cert · phone 390px device metrics this pass (layout uses `minmax(0,1fr)` peers) |

## Mechanical sweeps

| ID | Result | Evidence |
|----|--------|----------|
| S1 Source | **Pass** | `economySource` / `ECONOMY_SOURCE.*` via `FigureRecord`; geography uses HI00 boundaries clause |
| S2 Notes | **Pass** | One `FigureRecord` foot per view; no Coverage strip; no body lede essays |
| S3 Controls | **Pass** | Menus only in outer `ControlRow` |
| S4 Empty | **Pass** | `EmptyStage` when packs missing; no catalogue dumps |
| S5 Charts | **Pass** | `stageTitle` + TimeChart / RankBars / ChangeRows / specimens; Data = observation tables; `showTable={false}` |
| S6 Map keys | **Pass** | Geography uses shared `RegionMap` English-region shading; nations in ranks only (Notes) |
| S7 Map zoom | **N/A** | Region map is national atlas chrome, not named-place LA search |
| S8 Signal / ink | **Pass** | No Signal on prose; no sector `tokens.css` palette |
| S9 URL / Reset | **Pass** | `view` · `show` · `compare` · `industry` · `measure` · `from` · `series` via `sync`; Reset clears |
| S10 Docs lock | **Pass** | Shell matches Debt / Growth / Wages peers |
| S11 Energy frame | **Pass** | ControlRow · figures ≤3 · one Notes · EmptyStage · From / Series where Ready |
| S12 Follow | **Pass** | Primary Follow on all eight views (**fixed** this audit: inactive · hours · vacancies · geography) |
| S13 Labelled gaps | **Pass** | Underemployment / involuntary now drawn on Working Week (2026-11-15, EC-G2-03d); occupation ingested from Nomis APS (EMP04 discontinued) and drawn on What Britain Does for Work |
| S14 Stocks ≠ flows | **Pass** | Notes forbid rate composition; jobs ≠ people; vacancies ≠ hires; Claimant ≠ ILO |
| S15 Atlas chrome | **Pass*** | Geography RankBars + English-region map; no LA SearchControl (HI00 countries/regions only — intentional) |
| S16 Domain sources | **Pass** | `DOMAIN_SOURCES.employment` → pack; `sector-pages` series list updated for discouraged · JOBS02 · HI00 (**fixed**) |
| S17 Cloud Ready | **Pass** | Packs via API `loadSeriesPack`; local `data/` not required for UI |
| S18 Empty options | **Pass** | Defaults open on latest final months / quarters with rows; industry menu from ranked sections |
| S19 Pooled periods | **Pass** | From-year options from the active view’s series; geography period from selected HI00 measure |
| S20 Missing as zero | **Pass** | No `?? 0` drawn as published labour levels |
| S21 Options vs view | **Pass** | Menus gated per view |
| S22 One-option menus | **Pass** | Industry / From / Series only when options.length > 1 / length |
| S23 Multi-select | **N/A** | No multi menus |
| S24 Loaded not offered | **Pass*** | Underemployment / YCCX Ready in cloud but intentionally not in pack/UI — labelled in Notes |
| S25 Stale lists | **N/A** | No LAD search |
| S26 Honest availability | **Pass** | EmptyStage when pack null |
| S27 Plain labels | **Pass** | Menus plain English; CDIDs stay in Notes / Data |

## Menu table

| View | Control | URL key | Options | Drives |
|------|---------|---------|---------|--------|
| workforce | Show | `show` | Share · Absolute | Composition encoding |
| workforce | Compare from | `compare` | Year options from levels | Share delta strip |
| rates / inactive / hours / vacancies | From | `from` | Years from series | TimeChart window |
| industry | Industry | `industry` | All + A–T sections | Specimen selection + chart |
| geography | Measure | `measure` | Employment · Unemployment · Inactivity | HI00 ranks / map |
| data | Series | `series` | Ready pack tables | Observation table |
| all | Reset | — | — | Clears filters → workforce |

## Phone width (390px)

**Not measured this pass.** Layout follows Debt / Generation `stack` + ControlRow wrap. Residual P2: measure at 390px before Wave C.

## What is consistent

- Locked Explorer order: crumb → question → tabs → figures → controls → stage → one Notes → Follow.
- Flagship composition from LF2G + LF2I + LF2M only; rates tab labels denominators.
- Industry: labelled `WORK_PLATES` specimen wall + change + chart (no unlabeled strip / giant side plate).
- Manufacturing stays on Energy via Follow; HI00 owned by Regions, read-only here.
- Validation: four independent QA reports, all pass, no curated rewrites.

## Inconsistency matrix

| ID | Issue | Priority | Status |
|----|-------|----------|--------|
| E-1 | Follow missing on inactive · hours · vacancies · geography | P1 | **Fixed** — edges in `connections/economy.ts` + Stage follow all views |
| E-2 | Hours Notes claimed underemployment “not Ready” | P1 | **Fixed** — Ready in catalogue, not drawn on tab |
| E-3 | `sector-pages` series omitted discouraged · JOBS02 · HI00 | P1 | **Fixed** |
| E-4 | Underemployment / involuntary not on Working Week UI | P2 | Deferred (intentional) |
| E-5 | EMP04 occupation not ingested | P2 | **Closed 2026-11-15** — EMP04 discontinued by ONS; `employment-by-occupation` from Nomis APS, Ready + cloud, see [handover-economy-03-occupation.md](handover-economy-03-occupation.md) |
| E-6 | LMS / HI00 re-pin after **17 Nov 2026** | Calendar | Open |
| E-7 | Phone 390px not measured this pass | P2 | Open |

## Cleanups shipped this audit

1. Follow edges: inactive → Workforce · hours → Growth Productivity · vacancies → Rates · geography → Wages Geography of pay.
2. Hours Notes honesty for EMP16 / YCCX.
3. `sector-pages` employment series list completed for catalogue Explore links.
4. Industry specimen wall restored earlier in session (labelled wall + small selected mark).

## Validation roll-up

| Report | Verdict |
|--------|---------|
| `qa_report_economy_03_lms_2026-11-14.md` | 50 pass / 0 warn / 0 fail |
| `qa_report_economy_03_employment_complete_2026-11-14.md` | 82 / 0 / 0 |
| `qa_report_economy_03_gaps_2026-11-15.md` | 24 / 0 / 0 |
| `qa_report_regions_employment_geography_2026-11-15.md` | 59 / 0 / 0 |

No new numeric fails. Gate 4 does not re-ingest.

## Close

Domain 03 Gate 4 **complete** for the live Employment Explorer. Residual calendar: LMS / APS **17 Nov**; phone measure. Underemployment UI and occupation closed 2026-11-15 (EC-G2-03d). Notion → Gate 4 closed.
