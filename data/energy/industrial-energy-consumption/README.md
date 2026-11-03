# Industrial energy consumption

**Registry:** [Industrial energy consumption](https://app.notion.com/40d654717685817592b0c0ba7d49aa52)  
**`indicator_id`:** `industrial-energy-consumption`  
**Owner:** Energy (DESNZ)

## Source

| Field | Value |
|-------|--------|
| Landing | https://www.gov.uk/government/statistics/energy-consumption-in-the-uk-2026 |
| Table | ECUK Table C1 — Industry final energy consumption |
| Pinned raw | `raw/2026-11-03/ECUK_2026_Consumption_tables.xlsx` |
| Release | 24 Sep 2026 (data through 2025) |
| Unit | ktoe |
| Frequency | Annual |
| Geography | UK (`K02000001`) |
| Licence | Open Government Licence v3.0 |

## Scope choices

- **Ingest:** Table C1 Industry block (all fuels + Total).
- **Notes:** `fuel=<Label>`; `fuel=Total` is an aggregate.
- **Note 2:** Total can include blast furnace gas not listed as its own fuel column — component sum ≠ Total.
- **Not ingested yet:** Table C2 sub-sectors, end-use tables.

## Reproduce

```bash
uv run python -m energy.connectors.industrial_energy_consumption
```
