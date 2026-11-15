# Validation kickoff — Economy 06 · Scotland bands 2017–22 (EC-VAL-06E-SCOT)

**Owner:** Validation · **Date:** 2026-11-15  
**Handover:** [handover-economy-06-scotland-bands.md](handover-economy-06-scotland-bands.md)  
**Economy kickoff:** [agent-kickoff-economy-06-scotland-bands.md](agent-kickoff-economy-06-scotland-bands.md)  
**Package:** `data/economy/tax-machine-income-tax-history/` · `tax-machine-income-tax-history`  
**Registry:** https://app.notion.com/p/4196547176858177bf79d15680c0c264 (do not flip Ready)

## Scope

Independent QA only — do **not** rewrite curated. File under `data/qa/`.

### Checks

| ID | Check |
|----|-------|
| C1 | Raw checksums for new Scotland 2017–22 source pins ↔ manifest / SHA256SUMS |
| C2 | ≥3 of six years: curated after-allowance bands ↔ pinned gov.scot / HMRC SIT HTML |
| C3 | Scotland ≠ E/W/NI for those years (spot at least one band/rate difference per sampled year) |
| C4 | Coverage inventory no longer lists 2017–22 as gaps (or documents any remaining gap) |
| C5 | No Ready / frontend claim; fiscal drag still deferred unless separately pinned |
| C6 | Prior E/W/NI + Scotland 2023–27 rows not silently corrupted (spot one pre-2017 and one post-2022) |

## Out of scope

Time Machine UI; fiscal-drag examples; Ready flip (Orchestrator after PASS).

## Done means

`data/qa/qa_report_economy_06_scotland_bands_2026-11-15.md` (+ optional `src/validation/` script).
