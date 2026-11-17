# Gate 4 re-check — Economy Domain 04 Household deepen (Cost · Ledger · Buffer · Debt)

**Mode:** B — Finishing domain (re-check after deepen UI)  
**Date:** 2026-11-15  
**Supersedes:** `docs/gate4-audit-household.md` for Ledger · Cost · Buffer · Debt (those tabs are no longer EmptyStage). Living-standards pins (better-off · saving) stay as in the first Gate 4, plus the honesty patches below.  
**References:** `docs/visual-identity.md` · `.cursor/rules/explorer-stage.mdc` · `exchange-domain-view` · Employment Gate 4 · GrowthCanvas · first household Gate 4  
**Under audit:** `HouseholdCanvas.tsx` · `household-living-model.ts` · `household-model.ts` · `load.ts` · `types.ts` · `citations.ts` · `connections/economy.ts` · `sector-pages.ts` · `/economy?domain=household`

## Verdict

**Ready with fixes.** Explorer grammar still matches Growth / Employment. Cost · Ledger · Buffer · Debt now draw published LCF / WAS / BoE / adjacent ETB series. Honesty fails from this pass (Ledger source not tracking the open table, Cost share empty stack, Data method generic, WAS Round 8 labelled Final, ETB loaded but not on Data) are closed here. Catalogue stays Domain 04 pins only — ETB is Tax-owned and offered on Data as adjacent context, not on the Household rail list. Validation numeric QA already green (RHDI 61/2/0 · LCF 44/0/0 · Buffer/Debt 44/0/0). Cloud current releases **273–279** (ETB companion **263**), Postgres observations.

## Mode & coverage

| Item | Covered |
|------|---------|
| Views | Are we better off? · Saving · The Household Ledger · The Cost of Living · Britain's Financial Buffer · The Weight of Debt · Data |
| Controls | Measure · Group · From · Series · Reset |
| States | EmptyStage when the open measure has no rows · live packs via Next (`localhost:3001`) |
| Cross-check | First household Gate 4 · Employment / Growth compact `economySource` feet |
| Validation | RHDI · LCF · Buffer/Debt reports · this deepen roll-up |
| Not inspected | Full keyboard tour · a11y cert · **phone 390px device metrics this pass** (layout still `minmax(0,1fr)` peers) |

## Honesty (deepen-specific)

| Rule | Result |
|------|--------|
| Ledger must not present a reconciled household budget | **Pass*** | Definition, method, figure note “Not a household budget”, Follow honesty, and Data ETB title all forbid adding LCF + ETB + RHDI. Source foot now names both publications when ETB is drawn (**fixed**). |
| Cost ≠ inflation basket | **Pass** | Notes + Follow to Inflation · Changing price; Data method for family-spending series repeats the split (**fixed**). |
| Buffer ≠ DGD8; WAS accreditation suspended; GB ≠ UK | **Pass*** | Notes name the saving ratio, GB, and suspended accreditation. Figure strip and Data status now say so on Round 8 (**fixed**; Status was “Final”). |
| Debt ≠ mortgage rate burden; excl. SLC noted | **Pass*** | Notes + Follow to Housing mortgages. Measure and Data title now say excluding student loans (**fixed** title). |
| No Housing property / MLAR forked under Economy loaders | **Pass** | `loadHousehold()` loads RHDI, LCF, WAS financial wealth, BoE consumer credit, ETB only. |

## Mechanical sweeps

| ID | Result | Evidence |
|----|--------|----------|
| S1 Source | **Pass*** | Compact `economySource`. Cost foot follows weekly vs share table; Ledger foot follows category vs income and names ETB when drawn; Data foot follows Series (**fixed**). |
| S2 Notes | **Pass** | One Notes foot per view; no Coverage strip; no body lede essays |
| S3 Controls | **Pass** | Measure / Group / From / Series only in outer `ControlRow` |
| S4 Empty | **Pass*** | `EmptyStage` when packs missing. Cost share no longer renders a blank stack when income rows are absent (**fixed**). |
| S5 Charts | **Pass** | `stageTitle` + TimeChart / RankBars; Data = observation tables; `showTable={false}`; no `FIG. n` |
| S6 Map keys | **N/A** | No maps |
| S7 Map zoom | **N/A** | No maps |
| S8 Signal / ink | **Pass** | No Signal on prose; no sector `tokens.css` palette |
| S9 URL / Reset | **Pass** | `view` · `measure` · `start` · `category` · `series` via `sync`; Reset → better-off / total |
| S10 Docs lock | **Pass** | Shell matches Employment / Growth; compact Economy source line |
| S11 Energy frame | **Pass** | ControlRow · figures ≤3 · one Notes · EmptyStage · From / Series where they apply |
| S12 Follow | **Pass** | Primary Follow on all seven views (connections test added this pass) |
| S13 Labelled gaps | **Pass*** | LCF ≠ CPI basket; DGD8 ≠ Buffer; WAS GB + accreditation; debt ≠ mortgage burden; ETB adjacent only (**fixed** Data method / WAS status) |
| S14 Stocks ≠ flows | **Pass** | Credit is a stock of lending; RHDI is a flow in the accounts; WAS is a survey stock. Notes keep them apart. |
| S15 Atlas chrome | **N/A** | National / GB series only |
| S16 Domain sources | **Pass** | `DOMAIN_PACKS.household` → `loadHousehold()` |
| S17 Cloud Ready | **Pass** | Current `data_release` 273–279 (ETB 263); UI row counts match Postgres (LCF 390+180, WAS 447, BoE 1208) |
| S18 Empty options | **Pass*** | Defaults latest published LCF year / WAS Round 8 / BoE Sep 2026. Cost share EmptyStage when that table is missing (**fixed**). |
| S19 Pooled periods | **Pass** | From-year options from the open series (RHDI, DGD8, selected spend group, or credit) |
| S20 Missing as zero | **Pass** | `finiteObs` only; no `?? 0` in household maths |
| S21 Options vs view | **Pass** | Measure / Group / From / Series filtered by view; share Group is published food / housing / transport only (no invented basket) |
| S22 One-option menus | **Pass** | Menus hidden when lists are empty |
| S23 Multi-select | **N/A** | Debt “Total, cards and other” is one menu value that draws three lines (≤5), not a multi menu |
| S24 Loaded not offered | **Pass*** | ETB is on Data Series when loaded; not on the Household catalogue (Tax owns that pin) (**fixed**). Mortgage rate still Housing-only. |
| S25 Stale lists | **N/A** | No LAD search |
| S26 Honest availability | **Pass*** | EmptyStage when pack null; WAS Round 8 not labelled ordinary Final (**fixed**) |
| S27 Plain labels | **Pass** | Measure / Group / From in words; CDIDs stay in Notes / Data |

**Sweep counts (after fixes):** **22 pass** · **0 fail** · **0 warn** · **5 N/A**.

## Menu table

| View | Control | URL key | Default | Options source | Drives |
|------|---------|---------|---------|----------------|--------|
| better-off | Measure | `measure` | `total` | Total (all households) · Per person | TimeChart + figures |
| better-off | From | `start` | Earliest year of selected RHDI | Derived from selected points | TimeChart window |
| saving | From | `start` | Earliest year of DGD8 | Derived from saving points | TimeChart window |
| cost | Measure | `measure` | `weekly` | Pounds a week · Share of spending | RankBars vs history vs quintile shares |
| cost | Group | `category` | Housing (net), fuel and power if present | Weekly: LCF groups; share: food / housing / transport with published shares | History line or share bars |
| cost | From | `start` | Earliest year of selected group | Weekly history only | TimeChart window |
| ledger | Measure | `measure` | `category` | By spending group · By income group | RankBars layout |
| ledger | Group | `category` | Housing (net) if present | Quintile measure only · LCF groups | Group £ by income fifth |
| buffer | — | — | Round 8 | No menus | Three RankBars |
| debt | Measure | `measure` | `total` | Total excl. student loans · Cards · Other · Total, cards and other | TimeChart lines |
| debt | From | `start` | Earliest year of selected credit series | Derived from that series | TimeChart window |
| data | Series | `series` | First Ready table with rows | Loaded packs with rows (incl. adjacent ETB) | Observation table + source foot |
| all | Reset | — | — | — | Clears → better-off / total |

Served data (Postgres current, 2026-11-15): DG2R/CRXX 286 q 1955 Q1–2026 Q2; DGD8 254 from 1963 Q1; LCF category 390; LCF income 180 (FYE 2025); WAS 447; BoE 1,208 months to 2026-09; ETB 42 (FYE 2024).

## Phone width (390px)

**Not measured this pass.** Same residual **P2** as the first Gate 4.

## What is consistent

- Locked Explorer order: crumb → question → tabs → figures → controls → stage → one Notes → Follow.
- Flagship living-standards chart is still RHDI; Ledger is adjacent statistics, not a guessed budget.
- Compact Economy source feet match Growth / Employment.
- Validation reports were not rewritten.

## Inconsistency matrix

| ID | Issue | Priority | Status |
|----|-------|----------|--------|
| D-1 | Ledger source always `familySpendingByIncome` while category ranks and ETB also draw | P1 | **Fixed** — foot follows measure and names ETB |
| D-2 | Cost share with missing income pack rendered a blank stack | P1 | **Fixed** — EmptyStage |
| D-3 | Data method stayed generic when Series changed | P1 | **Fixed** — method follows the open table |
| D-4 | WAS Round 8 Status = Final despite `accreditation=suspended` | P1 | **Fixed** — “Accreditation suspended” |
| D-5 | ETB loaded for Ledger, unreachable on Data | P1 | **Fixed** — Data Series when rows exist; catalogue unchanged |
| D-6 | Cost source did not distinguish weekly vs share tables | P1 | **Fixed** |
| D-7 | Data title for credit omitted excl. student loans | P2 | **Fixed** |
| D-8 | Hydration recoverable error on Data (locale / large table) | P1 | **Fixed*** — pound formatters no longer use `toLocaleString` |
| H-6 | UKEA re-pin after **22 Dec 2026** | Calendar | Open |
| H-7 | Phone 390px not measured | P2 | Open |
| H-8 | CRXX ONS title omits ESA S.14 | P2 | Open — Notes still say so |
| D-9 | Data table still lists both 2006 LCF weighting versions | Intentional | Publisher published two columns; Cost chart skips `census1991_weights` |

## Cleanups shipped this audit

1. Ledger and Cost source feet follow the open table; Ledger names ETB when that panel is drawn.
2. Data method, credit title, WAS status, and Buffer figure note carry the deepen caveats.
3. Data Series includes adjacent ETB; Household catalogue does not.
4. Cost share EmptyStage when that table is missing.
5. Deterministic £ grouping to avoid SSR/client locale mismatch.
6. Connections test for all seven Household views.

## Validation roll-up

| Report | Verdict |
|--------|---------|
| `qa_report_economy_04_rhdi_2026-11-15.md` | 61 pass / 2 warn / 0 fail |
| `qa_report_economy_04_lcf_2026-11-15.md` | pass (no fail) |
| `qa_report_economy_04_buffer_debt_2026-11-15.md` | pass (no fail) |
| `qa_economy_domain04_gate4_deepen_2026-11-15.md` | Structural Ready with fixes (this re-check) |

No curated rewrites. Gate 4 does not re-ingest.

## Intentional variations to keep

- Compact Economy source lines (geography/period in Notes, not the foot).
- URL key `start` (not `from`) — same as Growth produce.
- Shared URL key `measure` per view, deleted when leaving that view.
- ETB on Ledger + Data only; `sector-pages` Household series list stays Domain 04 pins.
- Buffer has no period menu (one WAS round on the stage).

## Minimal fix plan

Shipped above. Remaining: phone 390px (P2); UKEA 22 Dec re-pin (calendar).

## Close

Domain 04 deepen Gate 4 **Ready with fixes** for Cost · Ledger · Buffer · Debt plus the living-standards views. Do not edit `docs/work-plan.md` from this audit.
