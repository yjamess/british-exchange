# Validation kickoff — Economy 06 · hmrc-tax-gap (EC-VAL-06F)

**Owner:** Validation · **Date:** 2026-11-15  
**Handover:** [handover-economy-06-tax-gap.md](handover-economy-06-tax-gap.md)  
**Economy kickoff:** [agent-kickoff-economy-06-tax-gap.md](agent-kickoff-economy-06-tax-gap.md)  
**Registry:** https://app.notion.com/p/41965471768581969367c87a93f92f58 (Validation)

## Scope

Independent QA only — do **not** rewrite curated. File under `data/qa/`.

| Indicator | Package |
|-----------|---------|
| `hmrc-tax-gap` | `data/economy/hmrc-tax-gap/` |

### Checks

| ID | Check |
|----|-------|
| C1 | Raw checksums ↔ manifest |
| C2 | Vintage Measuring tax gaps 2026 · tax year 2024–25 headline |
| C3 | Spot £59.2bn / 6.4% / theoretical liabilities vs published |
| C4 | ≥2 breakdown cells (tax type and/or behaviour) vs raw tables |
| C5 | Caveats: gap ≠ fraud; methodology breaks labelled; provisional/projection status |
| C6 | No invented components; evasion only as HMRC category |
| C7 | No frontend / Ready claim |

## Out of scope

Tax Gap UI; Ready flip (Orchestrator after PASS).

## Done means

`data/qa/qa_report_economy_06_tax_gap_2026-11-15.md` (+ optional validation script).
