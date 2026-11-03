# Industrial electricity prices

**Registry:** [Industrial electricity prices](https://app.notion.com/40d65471768581f9ba3aefefe8eab198)  
**`indicator_id`:** `industrial-electricity-prices`  
**Owner:** Energy (DESNZ)

## Source

| Field | Value |
|-------|--------|
| Landing | https://www.gov.uk/government/statistical-data-sets/prices-of-fuels-purchased-by-manufacturing-industry |
| Table | QEP 3.1.2 Electricity (excl. CCL, p/kWh) |
| Pinned raw | `raw/2026-11-03/table_311_314.xlsx` |
| Release | 29 Sep 2026 (Q2 2026 provisional) |
| Unit | p/kWh |
| Frequency | Quarterly |
| Geography | Great Britain (`K03000001`) |
| Licence | Open Government Licence v3.0 |

## Scope choices

- **Ingest:** Electricity size bands + Average from sheet `3.1.2`.
- **Skip:** Coal/oil/gas columns; decile/median distribution columns.
- **Notes:** `band=<Label>; ccl=excluding`.
- **Caveat:** GB manufacturing survey — not UK/non-domestic QEP 3.4.1.

## Reproduce

```bash
uv run python -m energy.connectors.industrial_electricity_prices
```
