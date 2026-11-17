# family-spending-by-income

**Owner:** Economy agent
**Status:** Validation-ready (Domain 04 Cost of Living / Ledger) — **not Ready**
**Registry:** https://app.notion.com/p/41965471768581c39c5cf435f88e080a
**indicator_id:** `family-spending-by-income`

## Equivalisation (FYE 2025)

From FYE 2025, ONS ranks households by **modified OECD** equivalised disposable
income using a **two-adult reference** household. This replaces the previous
one-adult reference. Tables 3.1E5 and 3.2E5 publish both methods side by side;
this package curates the **left-hand 2-adult** block only.

Workbook 2 (expenditure by income) does not contain all-households equivalised
quintiles. Those cells are in **Workbook 1 Tables 3.1E5 / 3.2E5**. Workbook 2
is still pinned (landing source) and inventoried.

## Reproduce

```bash
uv run python -m economy.connectors.family_spending_by_income
```

## Pin (2026-11-15)

- `raw/2026-11-15/workbook2expenditurebyincome.xlsx` SHA-256 `2c5d57c9b1afb97533105a83fbc0b92627154ccf62a8ef15fb483e1cb8aa2978`
- `raw/2026-11-15/workbook1detailedexpenditureandtrends.xlsx` SHA-256 `af8d4a4464c0cc0a49195495a6e665667234379ac08293037a69e065d8931076`
- Official release: **2026-06-11**
- Curated rows: **180** (90 weekly £ + 90 shares)
- Self-QA: 13 pass / 0 fail
- Spots: all-household total **£676.60**; lowest quintile **£407.30**; highest **£1,083.60**

## Ledger (honest adjacent view)

UI may show this LCF composition **next to** Domain 06 `effects-of-taxes-and-benefits`
(income-group tax context). **Never** add LCF weekly £ to ETB £/year taxes/benefits
or UKEA RHDI / DGD8 as if they were one household budget. Different surveys,
periods (FYE 2025 vs ETB FYE 2024), and income concepts.

## Related

- Landing WB2: https://www.ons.gov.uk/peoplepopulationandcommunity/personalandhouseholdfinances/expenditure/datasets/familyspendingworkbook2expenditurebyincome
- Tables WB1: https://www.ons.gov.uk/peoplepopulationandcommunity/personalandhouseholdfinances/expenditure/datasets/familyspendingworkbook1detailedexpenditureandtrends
- Bulletin: https://www.ons.gov.uk/peoplepopulationandcommunity/personalandhouseholdfinances/expenditure/bulletins/familyspendingintheuk/april2024tomarch2025
