# hmrc-tax-gap

Measuring tax gaps 2026 edition (estimates for tax year 2024 to 2025)

**Status:** Validation-ready (Economy self-QA **pass**) — **not** Registry Ready.  
**No frontend.** Do not equate the tax gap with fraud.

## Question

What does HMRC estimate as the gap between theoretical tax liabilities and tax collected — by tax type and published reason (behaviour) category?

## Headline (tax year 2024–25, provisional / projected)

| Measure | Value |
|---------|-------|
| Tax gap | **£59.2 billion** |
| Tax gap % of theoretical liabilities | **6.4%** |
| Theoretical liabilities | **£924.4 billion** |

## Coverage

- **Tables curated:** 1.1 (% by tax), 1.2 (£bn by tax), 1.3 (customer group), 7.1 (illustrative behaviour)
- **Tax types:** VAT; Excise duty; Income Tax, NICs & CGT; Corporation Tax; Other taxes; Total
- **Behaviours (HMRC labels):** avoidance; criminal attacks; error; evasion; failure to take reasonable care; hidden economy; legal interpretation; non-payment
- **Geography:** United Kingdom
- **Time:** tax years (6 Apr–5 Apr); Table 7.1 from 2019–20 only
- **Licence:** Open Government Licence v3.0

## Reproduce

```bash
uv run python -m economy.connectors.hmrc_tax_gap
```

## Methodology breaks

See `curated/methodology_breaks.json` and workbook `curated/workbook_notes.csv`.
