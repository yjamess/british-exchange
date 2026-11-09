# NSTA UKCS field production (PPRS annual)

Calendar-year aggregates of NSTA Petroleum Production Reporting System (PPRS) monthly field reports.

**Indicator id:** `nsta-field-production`  
**Attribution:** Contains information provided by the North Sea Transition Authority and/or other third parties.

## Reproduce

```bash
uv run python -m energy.connectors.nsta_field_production --fetch
# or reuse a pin:
uv run python -m energy.connectors.nsta_field_production --raw raw/2026-11-07/ukcs_pprs_field_production.csv
```

## Honesty

Field-sum oil/gas totals in `curated/observations.csv` are **not** DESNZ indigenous national production. Use `crude-oil-production` and `domestic-gas-production` for national totals.
