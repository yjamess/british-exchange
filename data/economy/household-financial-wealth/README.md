# household-financial-wealth

**Owner:** Economy agent  
**Status:** Validation-ready (Domain 04 Buffer) — **not Ready**  
**Registry:** https://app.notion.com/p/41965471768581cd858ccf56a04a719e  
**indicator_id:** `household-financial-wealth`

## Series

| Field | Value |
|-------|--------|
| Publisher | ONS Wealth and Assets Survey |
| Tables | **5.1**, **5.10**, **5.11**, **5.12**, **5.13** |
| Landing | https://www.ons.gov.uk/peoplepopulationandcommunity/personalandhouseholdfinances/incomeandwealth/datasets/financialwealthwealthingreatbritain |
| Geography | Great Britain (`K03000001`) — **not UK** |
| Frequency | Survey rounds (ad hoc) |
| Unit | £ (percentiles), % of households (coverage / bands), £ billion (aggregates) |
| Licence | OGL v3.0 |

Net financial wealth = financial assets minus financial liabilities. **Not** property, **not** pensions, **not** DGD8.

## Reproduce

```bash
uv run python -m economy.connectors.household_financial_wealth
```

## Pin (2026-11-15)

- Raw: `raw/2026-11-15/financialwealthtables.xlsx`
- SHA-256 `7afee4fac3e3b3b0d1c970678bc10cd7e2711a774a13e4d2665c1b513c85013c`
- Edition: July 2006 to June 2016 and April 2014 to March 2022 (released **24 January 2025**)
- Rows: **447**

Round 8 (Apr 2020–Mar 2022) spots vs workbook:

| Cell | Value |
|------|-------|
| Table 5.10 median net, all households | **£10,400** |
| Table 5.10 p25 / p75, all households | £300 / £58,000 |
| Table 5.1 any formal financial asset (incl. current accounts in credit) | **98%** |
| Table 5.11 share with net financial wealth £100,000 or more | **17%** |
| Table 5.12 aggregate net financial wealth | **£1,915 billion** |

## Mandatory notes

- WAS **accreditation suspended from Round 8** (ONS, 13 June 2025). Round 8 rows carry `accreditation=suspended`.
- GB, not UK. Nominal £ (not the CPIH-deflated bulletin figures).
- DGD8 (`household-saving-ratio`) is **not** this measure.
- Link Housing `household-net-property-wealth` — do not re-ingest property under economy/.
- July 2006–June 2016 and April 2014–March 2022 round systems overlap; do not splice as one series.
