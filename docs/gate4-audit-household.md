# Gate 4 — Structural consistency audit · Economy Domain 04 Household Finances

**Mode:** B — Finishing domain  
**Date:** 2026-11-15  
**References:** `docs/visual-identity.md` · `.cursor/rules/explorer-stage.mdc` · `exchange-domain-view` · Employment Gate 4 · GrowthCanvas  
**Under audit:** `HouseholdCanvas.tsx` · `household-model.ts` · `load.ts` · `types.ts` · `domain-sources.ts` · `citations.ts` · `connections/economy.ts` · `sector-pages.ts` · `/economy?domain=household`

## Verdict

**Ready with fixes.** Explorer grammar matches Growth / Employment. Ready pins are RHDI total, RHDI per person, and the national-accounts saving ratio only. Ledger · Cost · Buffer · Debt stay EmptyStage. P1 catalogue list, Data source foot, EmptyStage honesty, and saving-ratio points labelling closed in this pass. Validation numeric QA already green (`qa_report_economy_04_rhdi_2026-11-15.md`: 61 pass / 2 warn / 0 fail). Cloud releases **273–275**, `store=postgres`.

## Mode & coverage

| Item | Covered |
|------|---------|
| Views | Are we better off? · Saving · The Household Ledger · The Cost of Living · Britain's Financial Buffer · The Weight of Debt · Data |
| Controls | Measure · From · Series · Reset |
| States | EmptyStage paths (code) · live API packs (localhost `:8000`) |
| Cross-check | Employment Gate 4 · Growth produce / Data · compact `economySource` feet |
| Validation | RHDI / CRXX / DGD8 61/2/0 · this Gate 4 roll-up |
| Not inspected | Full keyboard tour · a11y cert · **phone 390px device metrics this pass** (layout uses `minmax(0,1fr)` peers) |

## Mechanical sweeps

| ID | Result | Evidence |
|----|--------|----------|
| S1 Source | **Pass*** | Compact `economySource` / `ECONOMY_SOURCE.*` via one `FigureRecord` (Economy peer grammar). Data foot now follows the selected series (**fixed**). |
| S2 Notes | **Pass** | One Notes foot per view; no Coverage strip; no body lede essays |
| S3 Controls | **Pass** | Measure / From / Series only in outer `ControlRow` |
| S4 Empty | **Pass*** | `EmptyStage` when packs missing; planned tabs In preparation. Copy now includes see-instead (**fixed**) |
| S5 Charts | **Pass** | `stageTitle` + TimeChart; Data = observation tables; `showTable={false}`; no `FIG. n` |
| S6 Map keys | **N/A** | No maps |
| S7 Map zoom | **N/A** | No maps |
| S8 Signal / ink | **Pass** | No Signal on prose; no sector `tokens.css` palette |
| S9 URL / Reset | **Pass** | `view` · `measure` · `start` · `series` via `sync`; Reset → better-off / total |
| S10 Docs lock | **Pass** | Shell matches Employment / Growth; compact Economy source line (peers, not Housing long form) |
| S11 Energy frame | **Pass** | ControlRow · figures ≤3 · one Notes · EmptyStage · From / Series where Ready |
| S12 Follow | **Pass** | Primary Follow already on all seven views (better-off · saving · ledger · cost · buffer · debt · data) |
| S13 Labelled gaps | **Pass** | Ledger / Cost / Buffer / Debt named as not Ready; saving ratio not claimed as Buffer; mortgage rate not drawn as burden |
| S14 Stocks ≠ flows | **Pass*** | Total ≠ per person; income ≠ leftover. Saving “on the quarter before” now **percentage points** (**fixed**; was `qoqPct` labelled as points) |
| S15 Atlas chrome | **N/A** | National UK series only |
| S16 Domain sources | **Pass** | `DOMAIN_PACKS.household` → `loadHousehold()` three series |
| S17 Cloud Ready | **Pass** | API `store=postgres`; releases 274 / 275 / 273; no `store=files` on Ready path |
| S18 Empty options | **Pass** | Defaults: latest published quarter (2026 Q2, provisional dotted); From years from the active series |
| S19 Pooled periods | **Pass** | From-year options from RHDI or saving series of the open view, not a union |
| S20 Missing as zero | **Pass** | `finiteObs` only; no `?? 0` in household maths |
| S21 Options vs view | **Pass** | Measure on better-off; From on better-off / saving; Series on Data |
| S22 One-option menus | **Pass** | Measure has two options; From / Series only when lists are non-empty (current packs: many years, three tables) |
| S23 Multi-select | **N/A** | No multi menus |
| S24 Loaded not offered | **Pass*** | Mortgage rate is **not** in the household pack (Housing consumes). Catalogue list no longer offers it on this domain (**fixed**) |
| S25 Stale lists | **N/A** | No LAD search |
| S26 Honest availability | **Pass** | EmptyStage when pack null; planned tabs not marked Ready |
| S27 Plain labels | **Pass** | Measure / From / Series in words; CDIDs stay in Notes / Data |

**Sweep counts (after fixes):** **22 pass** · **0 fail** · **0 warn** · **5 N/A** · **0 not inspected** (phone width called out separately as deferred, not a sweep N/A).

## Menu table

| View | Control | URL key | Default | Options source | Drives |
|------|---------|---------|---------|----------------|--------|
| better-off | Measure | `measure` | `total` | Hard-coded: Total (all households) · Per person | TimeChart series + figures |
| better-off | From | `start` | Earliest usable year of selected RHDI series | Derived from selected measure points | TimeChart window |
| saving | From | `start` | Earliest usable year of saving ratio | Derived from DGD8 points | TimeChart window |
| data | Series | `series` | First Ready table with rows | Derived from loaded packs | Observation table + source foot |
| ledger / cost / buffer / debt | — | — | — | No menus (honest empty) | EmptyStage |
| all | Reset | — | — | — | Clears → better-off / total |

Served data (local API, 2026-11-15): DG2R 286 quarters 1955 Q1–2026 Q2; CRXX 286 same span; DGD8 254 from 1963 Q1; latest value provisional on all three; UK `K02000001` only.

## Phone width (390px)

**Not measured this pass.** Layout follows Growth / Employment `generation.module.css` `stack` + wrapping `ControlRow`. Residual **P2**: measure at 390px before Wave C.

## What is consistent

- Locked Explorer order: crumb → question → tabs → figures → controls → stage → one Notes → Follow.
- Flagship living-standards chart is RHDI; Ledger is still the named gap, not a guessed budget.
- Saving ratio labelled as a national-accounts leftover, not Britain's Financial Buffer.
- Compact Economy source feet (`ONS · series`) match Growth / Employment, not Housing long-form `formatSource`.
- Validation: independent RHDI QA pass; no curated rewrites this audit.

## Inconsistency matrix

| ID | Issue | Priority | Status |
|----|-------|----------|--------|
| H-1 | `sector-pages` listed `mortgage-rate-2yr-fixed` on Household while Weight of Debt is not Ready | P1 | **Fixed** — Ready list is DG2R · CRXX · DGD8 only |
| H-2 | Data Notes source stayed generic when Series changed | P1 | **Fixed** — foot follows the selected table |
| H-3 | Planned EmptyStage omitted the see-instead line | P1 | **Fixed** |
| H-4 | Saving figure “On the quarter before” used percent change, labelled points | P1 | **Fixed** — `qoqPoints` |
| H-5 | Ledger / Cost / Buffer / Debt not drawn | P2 | Deferred (intentional labelled gaps) |
| H-6 | UKEA re-pin after **22 Dec 2026** | Calendar | Open |
| H-7 | Phone 390px not measured this pass | P2 | Open |
| H-8 | CRXX ONS title omits ESA S.14 (numeric QA warn) | P2 | Open — Notes already say the title does not print the sector code |

## Cleanups shipped this audit

1. Household catalogue series list = three Ready living-standards pins (mortgage rate stays Housing-consumed context, not this Explorer).
2. Data tab source foot tracks Series.
3. Planned EmptyStage states why and where to look instead.
4. Saving-ratio quarter change reported in percentage points.

## Validation roll-up

| Report | Verdict |
|--------|---------|
| `qa_report_economy_04_rhdi_2026-11-15.md` | 61 pass / 2 warn / 0 fail |
| `qa_economy_domain04_gate4_2026-11-15.md` | Structural Ready with fixes (this audit) |

No new numeric fails. Gate 4 does not re-ingest.

## Intentional variations to keep

- Compact Economy source lines (no geography/period in the foot) — documented in `citations.ts`, matches Employment / Growth.
- URL key `start` (not `from`) — same as Growth produce.
- Planned Ledger instrument not redesigned or stubbed with invented shares.
- Mortgage rate not used as a debt-burden series.

## Minimal fix plan

Shipped above. Remaining: phone 390px (P2); UKEA 22 Dec re-pin (calendar); do not mark Ledger / Cost / Buffer / Debt Ready without evidence.

## Close

Domain 04 Gate 4 **complete** for the live Household Explorer (Ready living-standards views + honest planned tabs). Residual calendar: UKEA **22 Dec 2026**; phone measure. Notion → Orchestrator may close Gate 4 on this domain; do not edit `docs/work-plan.md` from this audit.
