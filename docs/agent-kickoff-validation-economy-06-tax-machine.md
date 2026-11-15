# Validation kickoff — Economy 06 · Tax Machine statute pin (EC-VAL-06C)

**Owner:** Validation · **Date:** 2026-11-15  
**Domain:** [06 · Taxation & Revenue](https://app.notion.com/p/414654717685816bb414e87ccbd501fc)  
**Handover:** [handover-economy-06-tax-machine.md](handover-economy-06-tax-machine.md)  
**Kickoff (Economy):** [agent-kickoff-economy-06-tax-machine.md](agent-kickoff-economy-06-tax-machine.md)

## Scope

Independent QA only — do **not** rewrite curated files. File findings under `data/qa/`.

| Indicator | Package |
|-----------|---------|
| `tax-machine-income-tax-rules` | `data/economy/tax-machine-rules/` |

Connector: `uv run python -m economy.connectors.tax_machine_rules` (reproduce only if needed; prefer disk pin).

### Checks

| ID | Check |
|----|-------|
| C1 | Raw snapshots + checksums match manifest |
| C2 | Tax years 2025–26 and 2026–27 present; E/W/NI + Scotland tables |
| C3 | Employee Class 1 NICs curated separately from income tax (not blended) |
| C4 | Recompute ≥3 E/W/NI worked examples from curated bands alone |
| C5 | Recompute Scottish contrast vs Scotland table |
| C6 | Spot Personal Allowance / basic rate vs GOV.UK page for one year |
| C7 | Exclusions + “not tax advice” documented in README/manifest |
| C8 | No frontend / Ready claim in package |

## Out of scope

Tax Machine React UI; Anatomy components; AHHY re-QA; registry Ready flip (Orchestrator after PASS).

## Done means

QA report `data/qa/qa_report_economy_06_tax_machine_2026-11-15.md` (or dated); recommend Ready / fail with owners.
