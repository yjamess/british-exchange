# Tax Machine — income tax + employee Class 1 NICs (statute pin)

**Indicator:** `tax-machine-income-tax-rules`  
**Package folder:** `data/economy/tax-machine-rules/`  
**Status:** Validation-ready, **not** Ready. No UI.

Educational illustration of dated statutory income-tax and employee Class 1 NICs rules — not tax advice and not a substitute for HMRC guidance or a personal tax calculation. Hypothetical taxable employment income only; Scotland uses a labelled alternate band table. Statutory incidence (who the law charges) is not the same as economic incidence (who ultimately bears the cost). Modelled liabilities are not observed population tax paid.

## Coverage

- Tax years: **2025–26** and **2026–27** (current + one prior on 2026-11-15)
- Jurisdictions: England/Wales/NI; Scotland alternate income-tax bands
- Stages: (1) income tax after Personal Allowance; (2) employee Class 1 NICs (category A) separately

## Exclusions

- benefits in kind
- pension contributions / relief
- marriage allowance
- blind person's allowance
- student loan repayments
- savings / dividend income (starting rate for savings and dividend rates out of scope)
- personal allowance taper for income above £100,000 (examples stay at or below £100,000)
- employer Class 1 NICs (employer stage not modelled)
- married women's reduced NICs rates / other category letters (category A only)
- corporation tax, VAT, CGT, council tax

## Reproduce

```bash
uv run python -m economy.connectors.tax_machine_rules
```

## Curated artefacts

- `curated/income_tax_bands.csv`
- `curated/allowances.csv`
- `curated/employee_class1_nics.csv`
- `curated/worked_examples.json` (+ `.md`)
- `curated/observations.csv` (shared Observation contract)
- `validation_report.md` (Economy self-QA)

## Related

- Receipts flagship (separate): `tax-receipts` (ONS AHHY)
- Handover: `docs/handover-economy-06-tax-machine.md`
