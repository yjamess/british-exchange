# Gate 4 re-run — Economy Domain 09 Trade & Investment

**Mode:** B — Finishing domain  
**Date:** 2026-11-17  
**Prior audit:** [gate4-audit-economy-09-trade.md](gate4-audit-economy-09-trade.md) (2026-11-16)  
**Under audit:** `InvestmentCanvas.tsx` · `investment-model.ts` · `load.ts` · `RegionMap` + `uk-nations-display.json` · `/economy?domain=investment`

## Verdict

**Ready.** Restructure closeout complete: OTS dossier wired; Trading world gains a **Services countries** lens (separate from goods); FDI flows gain a partner **WorldChoropleth** with explicit code→A3 mapping (unmatched RankBars-only); UK nation lens uses four-nation **RegionMap** (ONS Countries Dec 2025 BUC). Landscape and Births & deaths stay on the rail. Shell still matches Employment / Growth.

## Mode & coverage

| Item | Covered |
|------|---------|
| Views | Trade ledger · Trading world · Products · Capital · FDI · Landscape · Births & deaths · Data |
| World lenses | Goods countries · Services countries · UK nation |
| Maps | Goods + services WorldChoropleth · UK nation RegionMap · FDI partner WorldChoropleth |
| Validation | Prior Domain 09 QA + OTS SITC1 PASS `qa_report_economy_goods_trade_partner_commodity_2026-11-17.md` |
| Phone | Not re-measured this pass — shell unchanged from 2026-11-16 390px pass; flag as **Not inspected** for re-check if layout regresses |

## Mechanical sweeps (delta since 2026-11-16)

| ID | Result | Notes |
|----|--------|-------|
| S1 Source | **Pass** | Services lens → `servicesPartners`; goods with OTS → `goodsPartnersWithOts`; UK nation → `goodsByRegion` |
| S2 Notes | **Pass** | One `FigureRecord`; short `tableNote` honesty only (BoP≠OTS, goods≠services, HMRC attribution) |
| S3 Controls | **Pass** | Lens / Flow / Period still outer `ControlRow` |
| S4 Empty | **Pass** | EmptyStage when map/ranks empty; no catalogue dumps |
| S5 Charts | **Pass** | `stageTitle` + WorldChoropleth / RegionMap / RankBars / TimeChart |
| S6–S7 Map | **Pass** | Shared map chrome; zoom tools on RegionMap / WorldChoropleth |
| S8–S11 | **Pass** | No Signal on prose; shell order unchanged |
| S12 Follow | **Pass** | Primary Follows retained for all eight views |
| S13 Gaps | **Pass** | FDI aggregates / NE-missing territories labelled RankBars-only; CS/LI services ISO2 stay off map |
| S14 Stocks≠flows | **Pass** | FDI measure menu still separates flows / positions / earnings |
| S15 Atlas | **Pass** | Geography views use maps, not RankBars alone |
| S16 Domain sources | **Pass** | Still `DOMAIN_PACKS.investment` → `loadInvestment` |
| S17 Cloud Ready | **Pass** | Observations via API; partners / OTS / nations display from Storage or bundled display JSON (`regions.uk-nations-display` registered) |
| S18–S27 Menus | **Pass** | Lens options: `country` · `services` · `region`; years from the **selected** lens series; FDI map only when `measure=flows` |

## Menu table (Trading world + FDI delta)

| View | Control | URL key | Options | Drives |
|------|---------|---------|---------|--------|
| world | Lens | `lens` | Goods countries · Services countries · UK nation | Map + ranks series |
| world | Flow | `flow` | Exports · Imports | Partner / nation filter |
| world | Period | `year` | Years from active lens pack | Annual snapshot |
| fdi | Measure | `measure` | Flows · Positions · Earnings | UK totals; partner map only on flows |
| fdi | Direction | `dir` | Into the UK · From the UK | Partner map + ranks |

## What changed this closeout

- Services partners on their own choropleth (not joined onto goods).
- FDI partner map via `fdiPartnerToA3` (ONS slug → ADM0_A3); Bermuda, Hong Kong, Malta, Singapore, Belgium–Luxembourg, Gulf Arabian, UK offshore stay RankBars-only.
- UK nation RegionMap from ONS Countries December 2025 BUC display pack.
- Business Landscape / Births & deaths remain on the explorer rail.

## Inconsistency matrix

| ID | Issue | Priority | Status |
|----|-------|----------|--------|
| T-1 | CN8×country still unpublished | Honesty | Documented — SITC1 dossier only |
| T-3 | Phone 390px not re-emulated this pass | P2 | Prior pass stands; re-check if shell CSS changes |

## Validation roll-up

| Report | Verdict |
|--------|---------|
| Prior Domain 09 Gate 4 QA | Pass |
| `qa_report_economy_goods_trade_partner_commodity_2026-11-17.md` | Pass — Ready |
| This structural re-run | Pass — Ready |

## Gate 4 close

Domain 09 restructure closeout **complete**. Route: `/economy?domain=investment`. Hand back to Sector Orchestrator for Economy-wide audit (Domain 10 already exited).
