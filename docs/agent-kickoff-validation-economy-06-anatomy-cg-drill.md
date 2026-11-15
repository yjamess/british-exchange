# Validation kickoff — Economy 06 · tax-receipts-cg-composition (EC-VAL-06B-DRILL)

**Owner:** Validation · **Date:** 2026-11-15  
**Handover:** [handover-economy-06-anatomy-cg-drill.md](handover-economy-06-anatomy-cg-drill.md)  
**Economy kickoff:** [agent-kickoff-economy-06-anatomy-cg-drill.md](agent-kickoff-economy-06-anatomy-cg-drill.md)  
**Registry:** https://app.notion.com/p/41965471768581ceb258cd766de891cb (Validation)  
**Parent Ready (read-only):** `tax-receipts-composition` (MF6P series)

## Scope

Independent QA only — do **not** rewrite curated. File under `data/qa/`.

| Indicator | Package |
|-----------|---------|
| `tax-receipts-cg-composition` | `data/economy/tax-receipts-cg-composition/` |

### Checks

| ID | Check |
|----|-------|
| V1 | Identity `NMBY + NMCU + LIQR = MF6P` on ≥3 months (spot Jul/Aug/Sep 2026) |
| V2 | Curated leaves vs raw PUSF JSON (NMBY, NMCU, LIQR) |
| V3 | MF6P matches Ready `tax-receipts-composition` series=MF6P (not forked) |
| V4 | Accruals / NAB caveats; not HMRC cash; not AHHY four-head rewrite |
| V5 | No incomplete deeper residual invented; LIBR/NZGF/CPRN deferred labelled |
| C-extra | Checksums ↔ manifest; provisional = latest month per leaf only |

## Out of scope

Anatomy UI; deeper leaf pin; Ready flip (Orchestrator after PASS); Scotland / Time Machine.

## Done means

`data/qa/qa_report_economy_06_tax_cg_composition_2026-11-15.md` (+ optional `src/validation/` script). Recommend Ready on pass.
