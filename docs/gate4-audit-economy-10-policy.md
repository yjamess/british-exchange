# Gate 4 — Structural consistency audit · Economy Domain 10 Economic Policy

**Mode:** B — Finishing domain  
**Date:** 2026-11-17  
**References:** `docs/visual-identity.md` · `.cursor/rules/explorer-stage.mdc` · Energy Domain 10 Decision Ledger · Housing Policy · Employment / Growth Gate 4  
**Under audit:** `PolicyCanvas.tsx` · `policy-model.ts` · `load.ts` · `domain-sources.ts` · `connections/economy.ts` · `/economy?domain=policy`

## Verdict

**Ready.** Six views live under the locked Economy Explorer shell (Decision ledger · Institutions · Eras · Changes and reversals · Policy and evidence · Promises). Register loads from Storage packs `economy.policy-events` · `economy.policy-pledges` (26 decisions after deepen). EmptyStage only when a filter yields no rows or pledges are absent. Phone layout measured at **390px**. Validation QA **PASS** (with warns) — `data/qa/qa_economy_domain10_policy_2026-11-17.md`.

## Mode & coverage

| Item | Covered |
|------|---------|
| Views | ledger · institutions · eras · changes · evidence · promise |
| Controls | Policy area · Era · Reset; URL keys `view` · `area` · `era` · `event` · `pledge` |
| States | EmptyStage for empty filter / no pledges / no eras / no relationships / no linked series |
| Cross-check | Energy Industrial Policy ledger pattern; Housing Policy DecisionLedger; brand CatalogueDossier |
| Validation | Register dates vs sources — PASS with warns (1946 Order host; month-only HMT/LPC) |
| Phone | 390px live browser (ledger + figure strip + menus) |

## Mechanical sweeps

| ID | Result | Evidence |
|----|--------|----------|
| S1 Source | **Pass** | `economySource(ECONOMY_SOURCE.policy, …)` via one `FigureRecord` |
| S2 Notes | **Pass** | One stage foot; dates kept separate; linked series = context |
| S3 Controls | **Pass** | Policy area / Era only in outer `ControlRow` |
| S4 Empty | **Pass** | EmptyStage labels honest; no catalogue dump as body |
| S5 Charts | **Pass** | DecisionLedger + ExactRegister; Evidence uses TimeChart for context series only |
| S6–S7 Map | **N/A** | No geography view in this domain |
| S8 Signal / ink | **Pass** | Brand DecisionLedger electric slabs; no Signal on prose |
| S9 URL / Reset | **Pass** | `sync` writes view/area/era/event/pledge; Reset clears filters |
| S10 Docs lock | **Pass** | Matches Energy / Housing policy shell |
| S11 Energy frame | **Pass** | ControlRow · one Notes · Follow · EmptyStage |
| S12 Follow | **Pass** | Ledger/promise → Debt borrowing; evidence → Inflation rate |
| S13 Labelled gaps | **Pass** | Unscored pledges; month-only institution starts noted in dossier |
| S14 Stocks ≠ flows | **Pass** | PSNFL ≠ net debt in pledge copy; borrowing ≠ current budget |
| S15 Atlas chrome | **N/A** | No map |
| S16 Domain sources | **Pass** | `DOMAIN_PACKS.policy` → `loadPolicy` |
| S17 Cloud Ready | **Pass** | Packs in Storage; UI never imports `data/` |
| S18–S27 | **Pass** | Area/era menus from register; no multi-select; plain labels |

## Menu table

| View | Control | URL key | Options | Drives |
|------|---------|---------|---------|--------|
| ledger / institutions | Policy area | `area` | Ten areas + all | Filter events |
| ledger / institutions | Era | `era` | Register eras + all | Filter by mark year |
| (any) | — | `event` | Event id | Open DecisionLedger row |
| promise | — | `pledge` | Pledge id | Open PromiseVerdict |

## Phone width (390px)

**Measured** live at `http://localhost:3000/economy?domain=policy&view=ledger`. Domain rail scrolls; view tabs wrap; figure strip (26 / none open / 1612–2026) stacks; Policy area · Era · Reset stack; DecisionLedger slabs full width without horizontal page scroll. Screenshots: `/var/folders/…/bx-economy-10-policy-390.png`, `bx-economy-10-policy-ledger-390.png`.

## What is consistent

- Locked Explorer order with brand DecisionLedger / CatalogueDossier / ExactRegister / PromiseVerdict.
- Cross-sector related ids stay references; Housing/Energy bodies not copied into Economy JSON.
- No causal Follow copy (honesty on Debt Follow).

## Inconsistency matrix

| ID | Issue | Priority | Status |
|----|-------|----------|--------|
| P-1 | Live page question wording differs slightly from Notion provisional question | P2 | Accepted — UI question already live; Notion notes provisional |
| P-2 | BoE 1946 appointed day cites BoE/DMO, not legislation.gov.uk SR&O | Honesty | Documented in Validation WARN; no rewrite |

## Validation roll-up

| Report | Verdict |
|--------|---------|
| `data/qa/qa_economy_domain10_policy_2026-11-17.md` | **PASS** (warns on C3, C13) |

## Exit

Domain 10 **complete** for sector Gate 4 roll-up. Hand back to **Sector Orchestrator** — do not start the Economy-wide audit from this chat.
