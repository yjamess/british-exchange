# Primary energy production

**Registry:** [Primary energy production](https://app.notion.com/40d654717685819db323cce12ec97c72)  
**`indicator_id`:** `primary-energy-production`  
**Owner:** Energy (DESNZ)

## Source

| Field | Value |
|-------|--------|
| Landing | https://www.gov.uk/government/statistics/total-energy-section-1-energy-trends |
| Table | ET 1.1 Indigenous production of primary fuels |
| Pinned raw | `raw/2026-11-03/ET_1.1_OCT_26.xlsx` |
| Release | 29 Oct 2026 (data through Aug 2026) |
| Unit | Mtoe |
| Frequency | Monthly (Month sheet) |
| Geography | UK (`K02000001`) |
| Licence | Open Government Licence v3.0 |

## Scope choices

- **Ingest:** Month sheet only (long history, matches monthly cadence).
- **Not ingested yet:** Quarter / Annual sheets (optional later).
- **Fuels:** Total, Coal, Petroleum, Natural gas, Bioenergy & waste, Primary electricity - nuclear, Primary electricity - wind, solar and hydro.
- **Aggregates:** `fuel=Total` must not be stacked with components (`britain_exchange.aggregation`).

## Reproduce

```bash
uv run python -m energy.connectors.primary_energy_production
```

## Hand-off

After self-check vs Main table / Month sheet, registry → Validation. Do not mark Ready from Energy.
