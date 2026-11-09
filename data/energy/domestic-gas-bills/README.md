# Domestic gas bills

**Registry:** [Domestic gas bills](https://app.notion.com/41165471768581048377c944c354e01c)  
**`indicator_id`:** `domestic-gas-bills`  
**Owner:** Energy (DESNZ) · Domain 03 Prices & Costs  
**Status:** Validation (not Ready)

## Source

| Field | Value |
|-------|--------|
| Landing | https://www.gov.uk/government/statistical-data-sets/annual-domestic-energy-price-statistics |
| Table | QEP 2.3.1 domestic gas (cash terms, 11,200 kWh/year) |
| Pinned raw | `raw/2026-11-07/table_231.xlsx` |
| Asset URL | https://assets.publishing.service.gov.uk/media/6a4245df3413112faed80dbd/table_231__1_.xlsx |
| Release | 30 Jun 2026 (Cover Sheet) |
| Unit | GBP (annual bill) |
| Frequency | Annual (calendar year) |
| Geography | United Kingdom (`K02000001`) |
| Licence | Open Government Licence v3.0 |

## Scope choices

- **Ingest:** Sheet `2.3.1` only — domestic gas @ 11,200 kWh.
- **Dimensions in notes:** `fuel=Gas; payment=…; tariff=…; consumption_kwh=11200`.
- **Skip (this indicator):** Financial-year sheet; historic 13,600 / 15,000 / 18,000 kWh sheets; real-terms historic; regional/country tables.
- **Related Ready:** `domestic-electricity-bills` (QEP 2.2.1 twin) · `industrial-electricity-prices` (reuse — do not fork).

## Reproduce

```bash
uv run python -m energy.connectors.domestic_gas_bills
```

Uses `pathlib` and fails loudly on HTTP / header mismatches ([pathlib](https://docs.python.org/3/library/pathlib.html), [httpx raise_for_status](https://www.python-httpx.org/quickstart/)).

## Self-check (Energy agent, 2026-11-07)

| Year | Slice | Official sheet value | Curated |
|------|-------|----------------------|---------|
| 2023 | Overall / All | 1094.4420… | match |
| 2025 | Overall / All | 834.4710… | match |
| 2025 | Direct debit / All | 823.3534… | match |
| 2022 | Standard credit / All | 1063.3571… | match |
| 2014 | Overall / All | 584.9233… | match |
| 2025 | Direct debit / Fixed | 793.7881… | match |

See `validation_notes.md` for Validation agent.

## Domain status

Gate 3 gas bills ingest only — **do not** claim Domain 03 complete. Ofgem cap and unit/standing dissection remain separate gaps.
