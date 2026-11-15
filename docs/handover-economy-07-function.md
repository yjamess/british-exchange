# Handover — Economy Domain 07 · Function and DEL vs AME (EC-G2-07B)

**Author:** Economy domain subagent · **Date:** 2026-11-15  
**Notion plan:** [07 · Public Spending & Services](https://app.notion.com/p/41465471768581df9c9ad184839231b7)  
**Kickoff:** [agent-kickoff-economy-07-function.md](agent-kickoff-economy-07-function.md)  
**Source matrix:** [economy-07-spending-source-matrix.md](economy-07-spending-source-matrix.md)  
**Parent:** [handover-economy-07-spending.md](handover-economy-07-spending.md)

> **Status:** Source discovery complete. **No function or DEL/AME ingest.** Both EmptyStages stay empty until Orchestrator opens a pin and Validation passes.  
> Do not mark Registry Ready. Do not edit `web/`.

## Verdict (return to Orchestrator)

| Field | Value |
|-------|--------|
| **Function verdict** | **`path-found-tes-cofog`** |
| **DEL vs AME verdict** | **`path-found-pss-table-1-1`** |
| **Preferred first pins** | `tes-by-function` (PSS/PESA Table 5.4) and `tme-del-ame` (PSS Table 1.1). Inbox draft IDs only |
| **Not recommended as these views** | ESA Table 11 (separate later instrument); OSCAR II (`oscar-only-not-tme`); real-terms monthly EBFT (no official series) |
| **Do not** | Rescale any of these rows onto EBFT; drop Other AME; call TME “services”; residual Tax−Spend=Borrow |

### Why this path

HMT already publishes both stories. They reconcile **inside their own tables**. They do not reconcile to the monthly EBFT pin.

**Function.** PESA 2026 and PSS July 2026 Table 5.4, financial year 2024-25, £ million:

- Health current 228,613 + Health capital 13,816 = **242,429**
- Published TES **1,166,452** + accounting adjustments **123,560** = table TME **1,290,012**

Table 4.2 prints the same health total as **242.4 £ billion** (2003-04 onward, rounded). Use Table 5.4 first so the unit is £ million. Keep Table 4.2 as an optional long-run companion.

Level-1 current rows plus EU transactions miss the published current total by **£0–2 million** depending on year (£2 million high in 2024-25). Store the published total. Do not invent a residual function.

**DEL vs AME.** PSS July 2026 Table 1.1, 2024-25 outturn, £ million (PESA Table 1.1 matches; PESA then adds plan years):

`Total DEL 595,892 + Departmental AME 605,568 + Other AME 88,552 = TME 1,290,012`

Other AME is the piece a two-bar chart would drop (**£88,552 million** in 2024-25). Total DEL is not resource DEL + capital DEL (581,165 vs published 595,892). Use the published “of which” rows.

**Against EBFT.** Summing the Ready monthly series April 2024–March 2025 gives **1,294,828**, which is **£4,816 million** above the July 2026 HMT TME of 1,290,012. For 2023-24 the gap is **£27,388 million**. Different vintage, a bank-classification footnote on the HMT total, and a derived sum rather than an official financial-year series. No scaling.

**OSCAR.** September 2026 guidance: in-year OSCAR cannot be tied exactly to National Accounts or PSF central-government spending, because National Statistics use extra sources.

## Recommendation for Orchestrator

1. **Keep both EmptyStages** until a pin task is opened. Notes may cite this matrix.
2. When ready, open **one pin task** covering either or both draft IDs below. Economy should not open it from this pass.
3. **First function pin:** `tes-by-function` from PSS July 2026 / PESA 2026 **Table 5.4**. Rows: ten COFOG level-1 functions, split current and capital; EU transactions (keep the sign); published TES total; accounting adjustments; table TME as a bridge, not a function. Outturn only, 2021-22 to 2025-26. Label **TES / COFOG**, £ million, UK public sector, financial year.
4. **First DEL pin:** `tme-del-ame` from PSS July 2026 **Table 1.1** rows Total DEL, Departmental AME, Other AME, and the table TME. Same outturn years. Label the denominator as **this table’s TME**, not EBFT. Plan years stay out of the first pin.
5. **Do not pin yet:** Table 4.2 long run (`tes-by-function-long-run`, £ billion), ESA Table 11 (`esa-gg-expenditure-by-function`), OSCAR (`oscar-control-budget`), Table 1.2 / 4.3 real terms. Real terms of monthly EBFT stays a gap.
6. Services sentence for any later Notes panel: TME is not services. In 2024-25 the services total (TES) is **£123,560 million** below the HMT table’s TME, and the ten functions are not TES on their own (EU transactions of **−1,412** on the current side).

Both pins are clean enough to open. If only one is opened first, open **`tes-by-function`**: it is the empty “where spending goes” question, and Table 5.4 already carries the TES-to-TME bridge. `tme-del-ame` is the cleaner arithmetic (the three control totals add exactly, with no leaf-gap note).

## Validation ask (when a pin opens)

Proposed task id: **`EC-VAL-07B`** (name up to Orchestrator). Do not run it on this discovery pass.

| Check | Expectation |
|-------|-------------|
| V1 | Table 5.4 aggregate identity holds for every pinned year: current TES + capital TES = total TES; total TES + accounting adjustments = table TME |
| V2 | Health 2024-25 current 228,613 + capital 13,816 = 242,429, and Table 4.2 shows 242.4 £ billion if that companion is pinned |
| V3 | Level-1 + EU versus published current TES is documented. Gap may be £0–2 million. No invented residual function |
| V4 | Table 1.1: Total DEL + Departmental AME + Other AME = table TME for every pinned year (2024-25 = 1,290,012) |
| V5 | Manifest says totals are HMT financial-year TES / table TME, not monthly EBFT. Copy does not equate TME with services. No Tax−Spend=Borrow identity. No OSCAR rows in the package |
| V6 | 2025-26 marked as first outturn estimate. No PESA plan years unless a separate labelled series is in scope |
| V7 | If ESA or OSCAR files are absent, say so. Their absence is correct for this pin |

**Out of scope until the pin:** Ready claims, frontend, real-terms EBFT, OSCAR organisation totals.

## File list

1. `docs/economy-07-spending-source-matrix.md` — candidates, frameworks, verdicts, spot-checks  
2. `docs/handover-economy-07-function.md` — this file  
3. `docs/agent-kickoff-economy-07-function.md` — kickoff (unchanged)  
4. `docs/handover-economy-07-spending.md` — Phase 0 parent. §2.2–2.3 inventory stands; this matrix is the deepen  
5. `data/economy/total-managed-expenditure/` — existing EBFT pin only (unchanged this pass)

**Not written:** connectors, curated observations, registry Ready rows, any `web/` edits. Discovery spreadsheets were read from GOV.UK and ONS and were not saved under `data/economy/`.

## Blockers

| Blocker | Severity |
|---------|----------|
| Ingest gated until Orchestrator opens the pin | Process (expected) |
| COFOG level-1 current rows miss published current TES by up to £2 million | Minor. Use the published total. Do not force the stack |
| Total DEL is not the sum of the resource and capital DEL lines | Label. Use the published Total DEL row |
| HMT TME ≠ summed monthly EBFT (about £4.8 billion in 2024-25; about £27.4 billion in 2023-24, on this vintage pair) | Hard boundary. Do not rescale |
| 2025-26 outturn can still be revised (accounts incomplete at publication). Next PSS update is due in the November / February / April cycle | Timing |
| ESA coversheet says “local government” on the general-government file | Check the CG and LG workbooks if that pin is ever opened |
| Real-terms monthly EBFT | Still no official series |
| Notion | Updated in this pass if the tool call succeeded — see the return note |

## Notion

Domain 07 experience notes should record: inventory deepen **complete**; function **`path-found-tes-cofog`**; DEL vs AME **`path-found-pss-table-1-1`**; ingest still **gated**; EmptyStages remain correct until pin + Validation.
