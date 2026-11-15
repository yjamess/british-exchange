# Handover — Economy Domain 06 · Anatomy of Revenue (EC-G2-06B)

**Author:** Economy domain subagent · **Date:** 2026-11-15  
**Notion plan:** [06 · Taxation & Revenue](https://app.notion.com/p/414654717685816bb414e87ccbd501fc)  
**Kickoff:** [agent-kickoff-economy-06-anatomy.md](agent-kickoff-economy-06-anatomy.md)  
**Source matrix:** [economy-06-anatomy-source-matrix.md](economy-06-anatomy-source-matrix.md)  
**Parent:** [handover-economy-06-tax.md](handover-economy-06-tax.md)

> **Status:** Reconcile discovery complete. **No component ingest.** Anatomy UI stays EmptyStage until Orchestrator opens a pin + Validation task.

## Verdict (return to Orchestrator)

| Field | Value |
|-------|--------|
| **Reconcile verdict** | **`path-found-ons-nab`** |
| **Preferred first instrument** | Multi-series **`tax-receipts-composition`** (Appendix D / PUSF NAB) with chart total **AHHY** — **or keep EmptyStage** until pin task opens |
| **Do not** | Mix HMRC cash heads under AHHY; use JW2O as Anatomy total; invent residuals from KSS8+NZGF+CPRN alone |

### Why this path

ONS **Appendix D** (*Public sector current receipts*, release 21 Oct 2026) publishes accrued tax-type heads whose total row is **AHHY**. Spot-check Sep 2026:

`MF6P (66,282) + AIIH (17,414) + NMHM (4,494) + AHGR (−63) = AHHY (88,127)`

Live PUSF `/data` JSON for AHHY, NZGF, CPRN, LIBR, AIIH, MF6P, NMHM matched the workbook (±0). Flagship curated pin already matches AHHY 88,127.

HMRC cash (bulletin / PSA7D) remains a **separate** future instrument only.

## Recommendation for Orchestrator

1. **Keep EmptyStage** on `/economy?domain=tax&view=anatomy` for now (honest Notes may cite this matrix).
2. When ready, open **pin task** (not this pass): pin Appendix D workbook + PUSF JSON for MF6P, AIIH, NMHM, LIBR, NZGF, CPRN (and AHGR from workbook if JSON stays 404).
3. Optional second wave: HMRC cash composition as its own labelled instrument — never stacked under AHHY.

## Validation ask (when pin opens)

Proposed task id: **`EC-VAL-06B`** (name up to Orchestrator)

| Check | Expectation |
|-------|-------------|
| V1 | Appendix D / PUSF identity `MF6P + AIIH + NMHM + AHGR = AHHY` on ≥3 months + 1 FYTD column |
| V2 | Each curated component CDID equals live `/data` and Appendix D Time Series for spot months |
| V3 | Manifest caveats state accruals ≠ HMRC cash; total is AHHY not JW2O |
| V4 | No HMRC cash series in the AHHY composition package |
| V5 | AHGR handling documented if sourced from workbook residual only |

**Out of scope for Validation until pin:** component Ready claims; frontend; Tax Machine.

## File list

1. `docs/economy-06-anatomy-source-matrix.md` — candidates, basis, verdict, spot-checks  
2. `docs/handover-economy-06-anatomy.md` — this file  
3. `docs/agent-kickoff-economy-06-anatomy.md` — kickoff  
4. `docs/handover-economy-06-tax.md` — Phase 0 parent (§2.2 inventory superseded by matrix deepen)  
5. `data/economy/tax-receipts/` — existing AHHY pin only (unchanged this pass)

**Not written:** connectors, curated component observations, registry Ready rows, any `web/` edits.

## Blockers

| Blocker | Severity |
|---------|----------|
| Component ingest gated by Orchestrator | Process (expected) |
| **AHGR** PUSF `/data` returns **404** — workbook-only for now | Minor for first stack (residual £m-scale) |
| Next PSF **20 Nov 2026** may revise recent months | Timing |
| Notion update | Attempted in this pass — see Orchestrator return note |

## Notion

Domain 06 Phase 1 Anatomy notes should record: inventory deepen **complete**; reconcile **`path-found-ons-nab`**; ingest still **gated**; EmptyStage remains correct until pin + Validation.
