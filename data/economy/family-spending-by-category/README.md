# family-spending-by-category

**Owner:** Economy agent
**Status:** Validation-ready (Domain 04 Cost of Living / Ledger composition) — **not Ready**
**Registry:** https://app.notion.com/p/41965471768581afbe16d4cdb396d7de
**indicator_id:** `family-spending-by-category`

## Series

| Field | Value |
|-------|--------|
| Publisher | ONS Family Spending / LCF |
| Table | Workbook 1 **Table 4.1** |
| Landing | https://www.ons.gov.uk/peoplepopulationandcommunity/personalandhouseholdfinances/expenditure/datasets/familyspendingworkbook1detailedexpenditureandtrends |
| Bulletin | https://www.ons.gov.uk/peoplepopulationandcommunity/personalandhouseholdfinances/expenditure/bulletins/familyspendingintheuk/april2024tomarch2025 |
| Geography | UK (`K02000001`), private households |
| Unit | £ per week household average, **FYE 2025 prices** |
| Population | All households (means) |
| Licence | OGL v3.0 |

## Reproduce

```bash
uv run python -m economy.connectors.family_spending_by_category
```

## Pin (2026-11-15)

- Raw: `raw/2026-11-15/workbook1detailedexpenditureandtrends.xlsx`, SHA-256 `af8d4a4464c0cc0a49195495a6e665667234379ac08293037a69e065d8931076`
- Official release: **2026-06-11**
- Curated rows: **390**
- Self-QA: 9 pass / 0 fail
- Latest (FYE 2025) total weekly expenditure: **£676.60** (Table 4.1 stores 676.6)

## Honest limits

- Real (deflated) weekly £ — not current-price Table 4.3, not CPI inflation.
- Housing (net) excludes mortgage interest, Council Tax and NI rates.
- LCF ≠ ETB ≠ UKEA RHDI. Do not draw one household budget.
- Two 2006 columns are different weighting versions, not a revision of one year.

## Related

- `family-spending-by-income` (Workbook 1 Tables 3.1E5 / 3.2E5, two-adult OECD)
- Domain 06 `effects-of-taxes-and-benefits` — **adjacent** income/tax context only
