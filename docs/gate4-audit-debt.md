# Gate 4 — Structural consistency audit · Economy Domain 08 Public Debt

**Mode:** B — Finishing domain  
**Date:** 2026-11-14  
**References:** `docs/visual-identity.md` · `.cursor/rules/explorer-stage.mdc` · `exchange-domain-view` · Growth Gate peers · Jobs Gate 4  
**Under audit:** `DebtCanvas.tsx` · `debt-instruments-model.ts` · `debt-bridge-model.ts` · `load.ts` · `connections/economy.ts` · `/economy?domain=debt`

## Verdict

**Ready.** Explorer grammar matches Economy peers. Stock / flow / ratio / instrument / ownership / maturity stay separate. Cash-to-debt is labelled central government (REC3), not a public-sector Borrowing Machine. P1 Follow gaps closed in this pass.

## Mode & coverage

| Item | Covered |
|------|---------|
| Views | What Britain owes · Who owns the debt · Debt anatomy · Repayment calendar · Borrowing · Cash to debt · Cost of debt · Data |
| Controls | Measure · Quarter · Basis · Show · Period · Reset (where menus exist) |
| States | EmptyStage paths (code) · live API packs |
| Cross-check | Growth Ledger Follow · PSF dial honesty |
| Not inspected | Full keyboard tour · a11y cert · Arc active-tab style (known headless Chromium quirk) |

## Mechanical sweeps

| ID | Result | Evidence |
|----|--------|----------|
| S1 Source | **Pass** | `economySource` / `ECONOMY_SOURCE.*` via `FigureRecord`; live feet show publisher · series · UK · period |
| S2 Notes | **Pass** | One `FigureRecord` foot per view; no Coverage strip; no body lede essays |
| S3 Controls | **Pass** | Menus only in outer `ControlRow` |
| S4 Empty | **Pass** | `EmptyStage` when packs missing; no catalogue dumps |
| S5 Charts | **Pass** | `stageTitle` + RankBars / TimeChart / ChangeRows; Data = observation tables |
| S6 Map keys | **N/A** | No maps |
| S7 Map zoom | **N/A** | No maps |
| S8 Signal / ink | **Pass** | No Signal on prose; no sector `tokens.css` palette |
| S9 URL / Reset | **Pass** | Filters in URL via `sync`; Reset on dial / anatomy / ownership / machine (owner visual pass: hide where no menus) |
| S10 Docs lock | **Pass** | Shell matches Growth / Inflation peers |
| S11 Energy frame | **Pass** | ControlRow · figures ≤3 · one Notes · EmptyStage |
| S12 Follow | **Pass** | Primary Follow on all Ready views → Growth Ledger/Data (**fixed** this audit) |
| S13 Labelled gaps | **Pass** | Numeric PS Machine deferred in Notes / work-plan; D8B FY start caveat on repayment |
| S14 Stocks ≠ flows | **Pass** | Dial separates stock/flow/ratio; Notes forbid summing unlike quantities |
| S15 Atlas chrome | **N/A** | No choropleth |
| S16 Domain sources | **Pass** | `DOMAIN_SOURCES.debt` → pack key `debt`; `loadDebt()` loads listed series only |
| S17 Cloud Ready | **Pass** | Live API `store=postgres` for HF6* / DMO / gilt holdings / `cg-cash-debt-reconciliation` (releases 231–236) |
| S18 Empty options | **Pass** | Defaults open on latest served quarter / FY with rows (ownership Q2 2025; repayment FY bars live) |
| S19 Pooled periods | **Pass** | Anatomy / ownership quarters from their own packs; machine periods from REC3 |
| S20 Missing as zero | **Pass** | Share `0` only when total is zero (partition); no `?? 0` drawn as published |
| S21 Options vs view | **Pass** | Menus gated per view |
| S22 One-option menus | **Pass** | No single-option menus observed |
| S23 Multi-select | **N/A** | No multi menus |
| S24 Loaded not offered | **Pass** | Data tab surfaces government holdings; UI does not pretend D4L is ownership |
| S25 Stale lists | **N/A** | No LAD search |
| S26 Honest availability | **Pass** | EmptyStage when pack null; API counts non-zero for Ready series |
| S27 Plain labels | **Pass*** | Menus plain; tab “Who owns the debt” kept (Notes clarify gilts ≠ PSND). Machine retitled **Cash to debt** |

\*P2 residual: optional rename “Who owns the debt” → “Who holds the gilts” if product wants stricter tab honesty.

## Phone width (390px)

**Pass with note.** Device metrics override at 390×844: ownership figures + RankBars + Notes + Follow remain readable; ControlRow wraps. Not a full Arc/device QA.

## What is consistent

- Locked Explorer order: crumb → question → tabs → figures → controls → stage → one Notes.
- Instruments ≠ holdings ≠ PSND called out in Notes on anatomy / ownership / repayment / data.
- Cash to debt plots REC3 CG cash → change in CG debt; Data FY table; never labelled PSNB→PSND.
- Follow registry complete for debt views; `connections.test.mjs` still green (23).

## Inconsistency matrix

| ID | Issue | Priority | Status |
|----|-------|----------|--------|
| D-1 | Follow missing on anatomy / ownership / repayment | P1 | **Fixed** — edges in `connections/economy.ts` |
| D-2 | Tab “Borrowing machine” over-claimed vs CG REC3 | P1 | **Fixed** — label **Cash to debt** |
| D-3 | Duplicate DMO pin helpers | P2 | **Fixed** — `dmo_common` uses `dmo_pins.verify_pinned_file` |
| D-4 | Registry Inbox rows / ONS CDIDs for ownership history | P2 | Open (non-blocking) |
| D-5 | NS&I retail stock panel on Anatomy | P2 | Deferred |
| D-6 | PSF re-pin after 20 Nov 2026 | Calendar | Open |
| D-7 | Numeric public-sector Borrowing Machine | Deferred | Evidence fail preserved |

## Cleanups shipped this audit

1. Follow edges: ownership · anatomy · repayment → Growth › Ledger (with honesty lines).
2. Machine tab → **Cash to debt**; comments/types aligned.
3. `dmo_common.pinned_evidence` → shared checksum verify via `dmo_pins`.

## Close

Domain 08 Gate 4 **complete** for the live debt Explorer. Residual calendar: PSF **20 Nov**; non-blocking registry / NS&I / ONS CDIDs. Numeric public-sector Borrowing Machine remains deferred.
