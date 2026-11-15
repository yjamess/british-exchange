# Validation kickoff — Economy 06 · tax-receipts-composition (EC-VAL-06B)

**Owner:** Validation · **Date:** 2026-11-15  
**Domain:** [06 · Taxation & Revenue](https://app.notion.com/p/414654717685816bb414e87ccbd501fc)  
**Handover:** [handover-economy-06-anatomy-pin.md](handover-economy-06-anatomy-pin.md)  
**Economy kickoff:** [agent-kickoff-economy-06-anatomy-pin.md](agent-kickoff-economy-06-anatomy-pin.md)  
**Registry:** https://app.notion.com/p/419654717685818dac2bc06033d4a01c (Validation)

## Scope

Independent QA only — do **not** rewrite curated files. File under `data/qa/`.

| Indicator | Package |
|-----------|---------|
| `tax-receipts-composition` | `data/economy/tax-receipts-composition/` |

Cross-check total against Ready `tax-receipts` (AHHY) — read only.

### Checks (V1–V5)

| ID | Check |
|----|-------|
| V1 | Identity `MF6P + AIIH + NMHM + AHGR = AHHY` on ≥3 months (+ document FYTD if present) |
| V2 | Spot curated vs raw PUSF JSON / Appendix D for MF6P, AIIH, NMHM; AHGR vs workbook Time Series |
| V3 | Manifest caveats: accruals ≠ HMRC cash; total is AHHY not JW2O |
| V4 | No HMRC cash series in the package |
| V5 | AHGR sourcing documented (workbook; PUSF `/data` 404) |
| C-extra | Checksums ↔ manifest; provisional = latest month per series only |

## Out of scope

Frontend / Anatomy UI; Tax Machine; Ready flip (Orchestrator after PASS); HMRC cash ingest.

## Done means

`data/qa/qa_report_economy_06_tax_composition_2026-11-15.md` (+ optional `src/validation/` script). Recommend Ready on pass.
