# Reuse map — Energy Prices & Costs (Domain 03)

## Ready series to REUSE (do not re-ingest)

| indicator_id | Package | What it covers for Domain 03 | Gap vs domain question |
|--------------|---------|------------------------------|------------------------|
| `industrial-electricity-prices` | `data/energy/industrial-electricity-prices/` | GB manufacturing electricity p/kWh by size band (QEP 3.1.2), quarterly | No domestic; no gas; not UK; excludes CCL/VAT; not a household bill |

**Registry:** https://app.notion.com/40d65471768581f9ba3aefefe8eab198  
**Connector:** `energy.connectors.industrial_electricity_prices`  
**Raw pin:** `raw/2026-11-03/table_311_314.xlsx`  
**sha256:** `56d562fcf3f928ff3341e84a98713dab02cefab4d1c0cc178561efc2bda36a0d`

Wave A1 links this series for “Two British Energy Economies” (industrial vs domestic). Domestic side is the new ingest below.

## New ingest this wave

| indicator_id | Package | Series | Status target |
|--------------|---------|--------|---------------|
| `domestic-electricity-bills` | `data/energy/domestic-electricity-bills/` | QEP 2.2.1 Standard Electricity bills @ 3,400 kWh, UK, annual | Validation |

## Cross-sector reuse (do not fork)

| Need | Owner | Action |
|------|-------|--------|
| CPIH / deflators for real bills | Economy | Link Economy registry rows when real-terms views ship |
| Household income / disposable income | Economy / People | “What Can You Afford?” journeys — canonical IDs only |
| Wholesale gas / oil benchmarks | Fossils lane (Domain 04) | Contextual link only; not Prices ownership |

## Explicit non-overlap

- Fossils (Domain 04): production volumes, not retail bills.
- Imports (Domain 05): trade balances / dependency — not price levels.
- Generation mix / capacity: already Ready under other Energy packages — contextual only.
