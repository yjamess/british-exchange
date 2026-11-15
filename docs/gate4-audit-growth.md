# Gate 4 — Structural consistency audit · Economy Domain 05 Productivity & Economic Growth

**Mode:** B — Finishing domain  
**Date:** 2026-11-15  
**References:** `docs/visual-identity.md` · `.cursor/rules/explorer-stage.mdc` · Debt / Employment Gate 4 · Energy Jobs productivity  
**Under audit:** `GrowthCanvas.tsx` · `anatomy-model.ts` · `load.ts` · `domain-sources.ts` · `connections/economy.ts` · `/economy?domain=growth`

## Verdict

**Ready.** Explorer grammar matches Economy peers. GDP · per head · productivity hours · GVA shares · two-vintage indexes stay separate. P1 Follow gaps on Anatomy and Revisions closed in this pass. Validation priors green for live pins; productivity calendar re-pin **17 Nov** remains open (non-blocking for Gate 4 close — same pattern as Debt PSF).

## Mode & coverage

| Item | Covered |
|------|---------|
| Views | What Britain produces · Growth ledger · Anatomy · Productivity · Revisions · Data |
| Controls | Measure · From · From year/Quarter · Anatomy Year/Quarter/Compare · Engine From/To · Revisions Measure · Series · Reset |
| States | EmptyStage paths · live API packs |
| Cross-check | Employment Gate 4 · Debt dial Follow · Energy manufacturing productivity |
| Validation | GDP re-pin · vintage band · GVA · labour-productivity-hours · growth QNA priors |
| Not inspected | Full keyboard tour · a11y cert · phone 390px device metrics this pass |

## Mechanical sweeps

| ID | Result | Evidence |
|----|--------|----------|
| S1 Source | **Pass** | `economySource` / `ECONOMY_SOURCE.*` via `FigureRecord` |
| S2 Notes | **Pass** | One `FigureRecord` foot per view; no Coverage strip; no body lede essays |
| S3 Controls | **Pass** | Menus only in outer `ControlRow` |
| S4 Empty | **Pass** | `EmptyStage` when packs missing / engine quarters incomplete |
| S5 Charts | **Pass** | `stageTitle` + TimeChart / RankBars / ChangeRows; Data = tables; `showTable={false}` |
| S6 Map keys | **N/A** | No maps |
| S7 Map zoom | **N/A** | No maps |
| S8 Signal / ink | **Pass** | No Signal on prose; no sector palette |
| S9 URL / Reset | **Pass** | `view` · `measure` · `start` · `ledgerBase` · engine · anatomy · `series` via `sync`; Reset clears |
| S10 Docs lock | **Pass** | Shell matches Debt / Employment peers |
| S11 Energy frame | **Pass** | ControlRow · figures ≤3 · one Notes · EmptyStage · From / Series |
| S12 Follow | **Pass** | Primary Follow on all six views (**fixed** this audit: anatomy · revisions) |
| S13 Labelled gaps | **Pass** | Full Revision Archive deferred (two-vintage band live); Engine output index BX-BACK-009; regional GVA deferred |
| S14 Stocks ≠ flows | **Pass** | Notes: GVA ≠ GDP market prices; index ≠ pounds across vintages; accounting ≠ causation on Engine |
| S15 Atlas chrome | **N/A** | No choropleth |
| S16 Domain sources | **Pass** | `DOMAIN_SOURCES.growth` → pack; `sector-pages` lists GDP · per head · LZVB/LZVA · GVA |
| S17 Cloud Ready | **Pass** | Series + vintage-band pack via API / Storage |
| S18 Empty options | **Pass** | Defaults open on final quarters with data; provisional latest withheld from charts |
| S19 Pooled periods | **Pass** | Anatomy / engine / ledger periods from their own series |
| S20 Missing as zero | **Pass** | IHXW pre-1955 blanks not charted as zero (Notes + curated) |
| S21 Options vs view | **Pass** | Menus gated per view |
| S22 One-option menus | **Pass** | Menus only when option lists non-empty |
| S23 Multi-select | **N/A** | No multi menus |
| S24 Loaded not offered | **Pass** | Business investment Follows Domain 09; not claimed as Growth primary |
| S25 Stale lists | **N/A** | No LAD search |
| S26 Honest availability | **Pass** | EmptyStage when pack null |
| S27 Plain labels | **Pass** | Menus plain English; CDIDs stay in Notes / Data |

## Menu table

| View | Control | URL key | Options | Drives |
|------|---------|---------|---------|--------|
| produce | Measure | `measure` | GDP · Per head · Productivity | Series on stage |
| produce | From | `start` | Years from series | TimeChart window |
| ledger | From year / Quarter | `ledgerBase` | Quarters back to 1955 | Index baseline |
| anatomy | Year / Quarter | `anatomyPeriod` | GVA quarters | RankBars period |
| anatomy | Compare from year / Quarter | `anatomyFrom` | Earlier quarters | ChangeRows |
| productivity | From/To year · Quarter | `engineFrom` / `engineTo` | Shared PRDY quarters | Engine split |
| revisions | Measure | `vintageMeasure` | GDP · Per head | Vintage band lines |
| data | Series | `series` | Ready tables | Observation table |
| all | Reset | — | — | Clears → produce |

## Phone width (390px)

**Not measured this pass.** Residual P2 (same as Employment Gate 4).

## What is consistent

- Locked Explorer order: crumb → question → tabs → figures → controls → stage → one Notes → Follow.
- Produce / Ledger use latest GDP vintage; Revisions plots first vs latest as indexes only.
- Productivity Engine labels accounting decomposition; manufacturing productivity Follows Energy.
- Anatomy uses current-price GVA shares (additive); manufacturing share ≠ Energy CVM weight.
- Validation priors: GDP re-pin pass · vintage band pass · GVA pass · LZVA hours pass.

## Inconsistency matrix

| ID | Issue | Priority | Status |
|----|-------|----------|--------|
| G-1 | Follow missing on Anatomy (UI claimed, no edge) · Revisions | P1 | **Fixed** — edges + Stage follow all views |
| G-2 | Productivity LZVB/LZVA re-pin after **17 Nov 2026** | Calendar | Open (non-blocking) |
| G-3 | Full Revision Archive / Engine output index | Deferred | BX-BACK-008 / 009 |
| G-4 | Phone 390px not measured | P2 | Open |
| G-5 | Wave A G4 report still listed Follows open on Growth | Docs | Superseded by this audit |

## Cleanups shipped this audit

1. Follow: anatomy → Employment industry · revisions → Produce.
2. Stage Follow on all Growth views (including Revisions).

## Validation roll-up

| Report | Verdict |
|--------|---------|
| `qa_report_economy_05_gdp_repin_2026-11-14.md` | Pass (GDP / per head / NPEL; productivity half calendar) |
| `qa_report_economy_05_vintage_band_2026-11-11.md` | Pass (rebuilt 2026-11-14 first vs latest) |
| `qa_report_gva_by_industry_section_validation_2026-11-14.md` | Pass |
| `qa_report_labour_productivity_hours_2026-11-11.md` | Pass (7/0/0) |
| `qa_report_economy_growth_qna_2026-11-11.md` | Prior QNA pin (superseded by PN2 re-pin for GDP) |

No curated rewrites in this Gate 4 pass.

## Close

Domain 05 Gate 4 **complete** for the live Growth Explorer. Residual calendar: PRDY **17 Nov**; deferred full archive / output index. Notion → Gate 4 closed.
