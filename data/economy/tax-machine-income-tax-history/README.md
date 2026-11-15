# Tax Time Machine — income-tax (+ NICs) history

**Indicator:** `tax-machine-income-tax-history`  
**Package:** `data/economy/tax-machine-income-tax-history/`  
**Related Ready pin:** `tax-machine-income-tax-rules`  
**Status:** Validation-ready, **not** Ready. No UI.

Educational illustration of dated statutory income-tax and employee Class 1 NICs rules — not tax advice and not a substitute for HMRC guidance or a personal tax calculation. Hypothetical taxable employment income only; Scotland uses a labelled alternate band table. Statutory incidence (who the law charges) is not the same as economic incidence (who ultimately bears the cost). Modelled liabilities are not observed population tax paid.

## Coverage

- E/W/NI income-tax bands + Personal Allowance: **2010-11…2026-27** (HMRC Tables A.2 / A.1)
- Scotland: labelled alternate — mirrors E/W/NI **2010–11…2016–17**; gov.scot / HMRC SIT **2017–18…2022–23**; GOV.UK **2023–24…2026–27**
- Employee Class 1 NICs: separate stage (HMRC Table A.4 weekly); intra-year rate cells not collapsed
- Fiscal drag: **documented** (`curated/fiscal_drag_examples.json`; ONS KAI7 path; Validation ask `EC-VAL-06E-DRAG`)

## Exclusions

- savings starting-rate band (out of NSND employment focus)
- dividend rates / dividend allowance
- marriage / blind person's / age-related allowances as modelled reliefs
- employer Class 1 NICs
- non-A NICs category letters
- interactive fiscal-drag calculator UI
- corporation tax, VAT, CGT, council tax

## Reproduce

```bash
uv run python -m economy.connectors.tax_machine_income_tax_history
```

## Curated artefacts

- `curated/income_tax_bands.csv`
- `curated/allowances.csv`
- `curated/employee_class1_nics.csv`
- `curated/coverage_inventory.csv`
- `curated/fiscal_drag_status.json`
- `curated/observations.csv`
- `validation_report.md`

## Related

- Ready statute pin: `tax-machine-income-tax-rules` (`tax_machine_rules`)
- Handover: `docs/handover-economy-06-timemachine.md`
- Scotland fill: `docs/handover-economy-06-scotland-bands.md`
- Fiscal drag: `docs/handover-economy-06-fiscal-drag.md`
