# Self-QA — `hmrc-tax-gap`

**Overall:** pass (14 pass / 0 fail)
**Edition:** Measuring tax gaps 2026 edition (estimates for tax year 2024 to 2025)
**Observations:** 1682

## Safety

HMRC Measuring tax gaps estimate of the difference between theoretical tax liabilities and tax paid. The gap is **not** the same as deliberate fraud: published behaviour categories include avoidance, criminal attacks, error, evasion, failure to take reasonable care, hidden economy, legal interpretation, and non-payment. Estimates are modelled/administrative — not observed incidents.

## Checks

- **PASS** `xlsx_checksum` — disk=8af0e2c7722eee3dd4330ae552b0b0f35f0b6601c608558069d96d664ed19dda manifest=8af0e2c7722eee3dd4330ae552b0b0f35f0b6601c608558069d96d664ed19dda
- **PASS** `total_gap_gbp_bn_2024_25` — expected=59.2 got=59.2 tokens=['table=1.2', 'tax=total-tax-gap', 'component=total-tax-gap', 'measure=gap-gbp-bn']
- **PASS** `total_gap_pct_2024_25` — expected=6.4 got=6.4 tokens=['table=1.1', 'tax=total-tax-gap', 'component=total-tax-gap', 'measure=gap-percent']
- **PASS** `theoretical_liability_gbp_bn_2024_25` — expected=924.4 got=924.4 tokens=['table=1.2', 'tax=total-theoretical-tax-liability', 'measure=gap-gbp-bn']
- **PASS** `vat_gap_gbp_bn_2024_25` — expected=12.1 got=12.1 tokens=['table=1.2', 'tax=vat', 'component=total-vat', 'measure=gap-gbp-bn']
- **PASS** `vat_gap_pct_2024_25` — expected=6.6 got=6.6 tokens=['table=1.1', 'tax=vat', 'component=total-vat', 'measure=gap-percent']
- **PASS** `ct_gap_pct_2024_25` — expected=18.1 got=18.1 tokens=['table=1.1', 'tax=corporation-tax', 'component=total-corporation-tax', 'measure=gap-percent']
- **PASS** `failure_reasonable_care_share_pct_2024_25` — expected=35.0 got=35.0 tokens=['table=7.1', 'behaviour=failure-to-take-reasonable-care', 'measure=share-of-gap-percent']
- **PASS** `evasion_share_pct_2024_25` — expected=12.0 got=12.0 tokens=['table=7.1', 'behaviour=evasion', 'measure=share-of-gap-percent']
- **PASS** `small_business_share_pct_2024_25` — expected=62.0 got=62.0 tokens=['table=1.3', 'customer_group=small-businesses', 'measure=share-of-gap-percent']
- **PASS** `gap_not_equated_with_evasion` — evasion=12.0 failure_to_take_reasonable_care=35.0
- **PASS** `behaviour_no_pre_2019_splice` — early_rows=0
- **PASS** `projection_years_provisional` — provisional_2024_25_rows=94
- **PASS** `summary_html_headline` — summary contains 6.4% and £59.2 billion

## Validation ask

Independent Validation: **`EC-VAL-06F`** — match curated headline (£59.2bn / 6.4%) and ≥2 breakdown cells to the published HMRC table for the pinned MTG 2026 vintage. File under `data/qa/`.
