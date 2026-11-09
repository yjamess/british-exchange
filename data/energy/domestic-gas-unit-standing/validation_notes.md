# Validation notes — domestic-gas-unit-standing (Energy self-check)

**Date:** 2026-11-07  
**Indicator:** `domestic-gas-unit-standing`  
**Connector:** `energy.connectors.domestic_gas_unit_standing`

| Artefact | Path |
|----------|------|
| Manifest | `data/energy/domestic-gas-unit-standing/manifest.yaml` |
| Raw pin | `raw/2026-11-07/table_234.xlsx` |
| Curated | `curated/observations.csv` (1 920 rows) |

## Self-check

- Headers match QEP 2.3.4 calendar-year sheet (row 7).
- Credit → Standard credit in notes (matches bill payment labels).
- UK Overall 2023: unit × 11 200 + fixed = **£1 094.44**, matches Ready `domestic-gas-bills` Overall/All 2023 (**£1 094.441…**).
- Financial-year sheet not ingested.

## Hand-off

Registry → **Validation**. Do not mark Ready until Validation QA.
