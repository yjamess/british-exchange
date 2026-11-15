# Validation kickoff — Economy 06 · effects-of-taxes-and-benefits (EC-VAL-06D)

**Owner:** Validation · **Date:** 2026-11-15  
**Handover:** [handover-economy-06-burden.md](handover-economy-06-burden.md)  
**Economy kickoff:** [agent-kickoff-economy-06-burden.md](agent-kickoff-economy-06-burden.md)  
**Registry:** https://app.notion.com/p/41965471768581f5a6d8f652ce533d8c (Validation)

## Scope

Independent QA only — do **not** rewrite curated. File under `data/qa/`.

| Indicator | Package |
|-----------|---------|
| `effects-of-taxes-and-benefits` | `data/economy/effects-of-taxes-and-benefits/` |

### Checks

| ID | Check |
|----|-------|
| C1 | Raw checksum ↔ manifest |
| C2 | FYE 2024 period; UK; quintile dimension present |
| C3 | Table 8 spot cells vs raw workbook/bulletin |
| C4 | Table 2a £ totals spot vs raw |
| C5 | Direct + indirect = all on **gross income** % where published |
| C6 | No invented direct % of disposable/expenditure |
| C7 | Caveats: survey averages ≠ household; legal ≠ economic incidence; not AHHY |
| C8 | No frontend / Ready claim in package |

## Out of scope

Burden UI; multi-year history; Ready flip (Orchestrator after PASS).

## Done means

`data/qa/qa_report_economy_06_burden_2026-11-15.md` (+ optional validation script).
