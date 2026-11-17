# Gate 4 — Structural consistency audit · Economy Domain 09 Trade, Investment & Business

**Mode:** B — Finishing domain  
**Date:** 2026-11-16  
**References:** `docs/visual-identity.md` · `.cursor/rules/explorer-stage.mdc` · Growth / Employment Gate 4 · Energy Imports lifelines  
**Under audit:** `InvestmentCanvas.tsx` · `investment-model.ts` · `load.ts` · `domain-sources.ts` · `connections/economy.ts` · `/economy?domain=investment`

## Verdict

**Ready.** Eight views live under the locked Economy shell. Cloud Postgres holds the Ready series; Trading World partners load from Storage pack `economy.goods-trade-partners-annual`. No EmptyStage deferrals on the seven experiences when packs hydrate. Phone layout measured at **390px** (rail + tabs + figure strip wrap; stage charts remain usable).

## Mode & coverage

| Item | Covered |
|------|---------|
| Views | Trade ledger · Trading world · Products · Capital · FDI · Landscape · Births & deaths · Data |
| Controls | Price basis · Lens/Flow/Period · Composition · Split · Measure · Series |
| States | EmptyStage when a slice is empty; live API packs |
| Cross-check | Growth NPEL Follow · Energy Imports lifelines · Employment industry/workforce |
| Validation | MRET QA report + cloud observation counts for Domain 09 packages |
| Phone | 390px CSS/layout check on Investment shell (see below) |

## Mechanical sweeps

| ID | Result | Evidence |
|----|--------|----------|
| S1 Source | **Pass** | `economySource` / `ECONOMY_SOURCE.*` via one `FigureRecord` |
| S2 Notes | **Pass** | One foot; honesty in `method` (BoP≠customs, goods≠services, FDI≠jobs, insolvency≠deaths) |
| S3 Controls | **Pass** | Menus only in outer `ControlRow` |
| S4 Empty | **Pass** | `EmptyStage` only for missing slices — not catalogue dumps |
| S5 Charts | **Pass** | `stageTitle` + TimeChart / RankBars / WorldChoropleth; Data = tables; `showTable={false}` |
| S6 Map keys | **Pass** | Shared `WorldChoropleth` defs (Imports pattern) |
| S7 Map zoom | **Pass** | Shared world map pan/zoom chrome |
| S8 Signal / ink | **Pass** | No Signal on prose; no sector palette |
| S9 URL / Reset | **Pass** | `view` · `basis` · `lens` · `flow` · `year` · `kind` · `split` · `measure` · `series` via `sync` |
| S10 Docs lock | **Pass** | Shell matches Employment / Growth |
| S11 Energy frame | **Pass** | ControlRow · one Notes · EmptyStage · Data tables |
| S12 Follow | **Pass** | Primary Follow on trade · world · products · capital · fdi · landscape · births · data (+ Growth→capital) |
| S13 Labelled gaps | **Pass** | Country×commodity matrix not invented; commodity lens is SITC WW |
| S14 Stocks ≠ flows | **Pass** | FDI flows/positions/earnings labelled; NPEL ≠ GDP |
| S15 Atlas chrome | **Pass** | Trading World choropleth + ranks |
| S16 Domain sources | **Pass** | `DOMAIN_PACKS.investment` → `loadInvestment` |
| S17 Cloud Ready | **Pass** | All Domain 09 series in Postgres; partners annual in Storage |
| S18–S27 | **Pass** | Menus gated per view; options from pack years; no multi-select; plain labels |

## Menu table

| View | Control | URL key | Options | Drives |
|------|---------|---------|---------|--------|
| trade | Price basis | `basis` | CP · CVM | MRET filter |
| world | Lens | `lens` | Country · Commodity · UK region | Map / SITC / regional ranks |
| world | Flow | `flow` | Exports · Imports | Partner / commodity filter |
| world | Period | `year` | Pack years | Annual partner snapshot |
| products | Composition | `kind` | Goods · Services | RankBars set |
| capital | Split | `split` | Total · Asset · Industry | NPEL / ranks |
| fdi | Measure | `measure` | Flows · Positions · Earnings | UK totals |
| data | Series | `series` | Ready tables | Observation table |

## Phone width (390px)

**Measured.** Explorer rail collapses; view tabs scroll; figure strip wraps to two columns; ControlRow stacks; Trade ledger TimeChart and Trading World map remain inside the stage frame without horizontal page scroll. Residual: long partner labels truncate on RankBars (shared instrument behaviour).

## What is consistent

- Locked Explorer order: crumb → question → tabs → figures → controls → stage → one Notes → Follow.
- NPEL primary on Capital; Growth Follows only.
- Goods and services composition never mixed.
- Partners annual pack excludes EU/World aggregates from the choropleth.

## Inconsistency matrix

| ID | Issue | Priority | Status |
|----|-------|----------|--------|
| T-1 | Full CN8×country intersections not published (HMRC OTS rate-limited) | Honesty | Documented — SITC WW + partner totals; no invented cells |
| T-2 | FigureStrip shows four figures (Growth audit preferred ≤3) | P2 | Accepted for trade strip (balance/exports/imports/investment) |

## Validation roll-up

| Report / check | Verdict |
|----------------|---------|
| `qa_report_economy_09_trade_mret_2026-11-16.md` | Pass — MRET identity |
| Supabase `observation` counts (2026-11-16) | Pass — all Domain 09 ids present |
| Storage `economy.goods-trade-partners-annual` | Pass — archived + served |

## Gate 4 close

Domain 09 marked **complete** in work-plan and Notion Control. Route: `/economy?domain=investment`.
