# Domestic electricity bills

**Registry:** [Domestic electricity bills](https://app.notion.com/411654717685810ca44cff374a0b7d24)  
**`indicator_id`:** `domestic-electricity-bills`  
**Owner:** Energy (DESNZ) · Domain 03 Prices & Costs  
**Status:** Validation (not Ready)

## Source

| Field | Value |
|-------|--------|
| Landing | https://www.gov.uk/government/statistical-data-sets/annual-domestic-energy-price-statistics |
| Table | QEP 2.2.1 Standard Electricity (cash terms, 3,400 kWh/year) |
| Pinned raw | `raw/2026-11-07/table_221.xlsx` |
| Asset URL | https://assets.publishing.service.gov.uk/media/6a4245907ac6fd9c6a94aae0/table_221__1_.xlsx |
| Release | 30 Jun 2026 (Cover Sheet) |
| Unit | GBP (annual bill) |
| Frequency | Annual (calendar year) |
| Geography | United Kingdom (`K02000001`) |
| Licence | Open Government Licence v3.0 |

## Scope choices

- **Ingest:** Sheet `2.2.1` only — Standard Electricity @ 3,400 kWh.
- **Dimensions in notes:** `fuel=Electricity; meter=Standard; payment=…; tariff=…; consumption_kwh=3400`.
- **Skip (this indicator):** Economy 7 sheet; financial-year sheets; historic 3,600 kWh sheets; payment-method % sheet; gas tables.
- **Related Ready:** `industrial-electricity-prices` (reuse — do not fork).

## Reproduce

```bash
uv run python -m energy.connectors.domestic_electricity_bills
```

Uses `pathlib` and fails loudly on HTTP / header mismatches ([pathlib](https://docs.python.org/3/library/pathlib.html), [httpx raise_for_status](https://www.python-httpx.org/quickstart/)).

## Self-check (Energy agent, 2026-11-07)

| Year | Slice | Official sheet value | Curated |
|------|-------|----------------------|---------|
| 2023 | Overall / All | 1213.3668… | match |
| 2025 | Direct debit / All | 1059.3856… | match |
| 2022 | Standard credit / All | 1166.7307… | match |
| 2014 | Overall / All | 547.5030… | match |
| 2025 | Direct debit / Fixed | 1021.6441… | match |

See `validation_notes.md` for Validation agent.
