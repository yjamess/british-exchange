# Validation kickoff — Economy 06 · tax-machine-income-tax-history (EC-VAL-06E)

**Owner:** Validation · **Date:** 2026-11-15  
**Handover:** [handover-economy-06-timemachine.md](handover-economy-06-timemachine.md)  
**Economy kickoff:** [agent-kickoff-economy-06-timemachine.md](agent-kickoff-economy-06-timemachine.md)  
**Registry:** https://app.notion.com/p/4196547176858177bf79d15680c0c264 (Validation)  
**Related Ready pin:** `tax-machine-income-tax-rules` (overlap years 2025–26 / 2026–27)

## Scope

Independent QA only — do **not** rewrite curated. File under `data/qa/`.

| Indicator | Package |
|-----------|---------|
| `tax-machine-income-tax-history` | `data/economy/tax-machine-income-tax-history/` |

### Checks

| ID | Check |
|----|-------|
| C1 | Raw checksums ↔ manifest + SHA256SUMS |
| C2 | Year span 2010–11…2026–27; E/W/NI vs Scotland dimensions labelled |
| C3 | Spot E/W/NI bands 2010–11, 2015–16, 2023–24, 2025–26 vs HMRC Table A.2 ODS |
| C4 | Personal Allowance same years vs Table A.1 ODS |
| C5 | Scotland: no silent E/W/NI fill 2017–22; 2023–27 match GOV.UK HTML; 2010–16 labelled mirror |
| C6 | NICs separate stage; weekly↔A.4; 2022–23 / 2023–24 not invented single annual rates |
| C7 | Fiscal drag deferred; no Ready / frontend claim |
| C8 | Overlap years vs Ready `tax-machine-income-tax-rules` consistent |

## Out of scope

Time Machine UI; Ready flip (Orchestrator after PASS); inventing Scotland 2017–22.

## Done means

`data/qa/qa_report_economy_06_timemachine_2026-11-15.md` (+ optional `src/validation/` script).
