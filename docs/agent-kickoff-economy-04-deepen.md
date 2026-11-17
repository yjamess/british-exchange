# Kickoff — Economy Domain 04 deepen · Ledger · Cost · Buffer · Debt

**Domain:** [04 · Household Finances](https://app.notion.com/p/4146547176858147ba12d76094388df9)  
**Parent kickoff:** [agent-kickoff-economy-04-household.md](agent-kickoff-economy-04-household.md)  
**Handover (Phase 1):** [handover-economy-04-household.md](handover-economy-04-household.md)  
**Wave:** C deepen · **Owner:** Economy · **Paths:** `src/economy/`, `data/economy/`  
**Opened:** 2026-11-15  
**Scope:** Domain 04 Phase 2–4 evidence only. Phase 1 RHDI already Ready. **No React** in this kickoff.

## Goal

Ingest Validation-ready packages so Orchestrator can draw four EmptyStages:

| Experience | Evidence target |
|------------|-----------------|
| **Cost of Living** | LCF / Family Spending expenditure categories + shares (by income quintile where published) |
| **Household Ledger** | Same LCF pack as adjacent composition; **link** Domain 06 ETB for income-group context — never stitch into one household budget |
| **Britain's Financial Buffer** | WAS **financial** wealth distributions (GB); **link** Housing `household-net-property-wealth` — do not fork property |
| **Weight of Debt** | BoE consumer credit outstanding (headline excl. student loans) + secured lending stock if clean; **link** `mortgage-rate-2yr-fixed` as rate context only |

## Hard rules

- No fabricated reconciled household budgets (LCF ≠ ETB ≠ DGD8 ≠ WAS on one record).
- No fork of Housing property wealth, Energy bills, Inflation basket, Domain 06 ETB.
- WAS Round 8+ accreditation is **suspended** (ONS notice) — label every Buffer pin with that caveat.
- Mortgage rate ≠ debt burden; lender stocks ≠ survey debt.
- Registry → Ingesting / Validation — **never Ready**. No `web/`. No work-plan edits.

## Preferred sources (start here)

### Cost of Living / Ledger

- [Family spending workbook 2: expenditure by income](https://www.ons.gov.uk/peoplepopulationandcommunity/personalandhouseholdfinances/expenditure/datasets/familyspendingworkbook2expenditurebyincome) — FYE 2025 edition (released 11 Jun 2026)
- Also useful: workbook 1 (detailed / trends), workbook 5 (housing expenditure) — pin only what the UI needs
- Equivalisation: FYE 2025 uses two-adult OECD reference; document which table you curate

Proposed indicator ids (adjust if structure demands one multi-dim pack):

| `indicator_id` | Content |
|----------------|---------|
| `family-spending-by-category` | Average weekly £ by COICOP/headline group (all households + history if in workbook 1) |
| `family-spending-by-income` | Expenditure by equivalised income quintile (groups × categories or totals — pick published cells) |
| Optional | Essential-share derived **only** if denominator is published in the same table |

### Financial Buffer

- [Financial wealth: wealth in Great Britain](https://www.ons.gov.uk/peoplepopulationandcommunity/personalandhouseholdfinances/incomeandwealth/datasets/financialwealthwealthingreatbritain) — Apr 2020–Mar 2022 / Round 8
- Prefer median / distribution bands / % with liquid assets — not only a mean
- Link Housing `household-net-property-wealth` in handover Notes

### Weight of Debt

- BoE Bankstats: consumer credit outstanding excl. SLC — **LPMBI2O** (total), optionally **LPMVZRJ** (cards), **LPMB4TS** (other) — monthly SA £m
- Secured lending on dwellings outstanding — find the standard MFI individuals stock series (document CDID); do not invent repayments
- Link `mortgage-rate-2yr-fixed` (IUMBV34) — already Ready
- Arrears: FCA / MLAR only if a clean open table is found this pass; else gap-list

## Deliverables

1. Connectors + `data/economy/<id>/` packages (raw pin, curated observations, manifest, README honesty)
2. Notion registry rows (Validation status)
3. Append / replace deepen section in `docs/handover-economy-04-household-deepen.md` (or extend main handover) with checksums, spots, link-only list, what reconciles vs adjacent
4. Explicit Gap list for anything still Blocked (arrears, Ledger custom instrument data model)

## Reproduce

```bash
uv run python -m economy.connectors.<module>
```

## Return to Orchestrator

Indicator IDs, obs counts, latest spots, blockers, Validation-ready list, handover path.
