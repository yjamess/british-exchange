# Domestic gas production

**Registry:** [Domestic gas production](https://app.notion.com/40d65471768581f78387e9f7006eabd4)  
**`indicator_id`:** `domestic-gas-production`  
**Owner:** Energy (DESNZ)

## Source

| Field | Value |
|-------|--------|
| Landing | https://www.gov.uk/government/statistics/gas-section-4-energy-trends |
| Table | ET 4.2 Natural gas supply and demand — Gross production |
| Pinned raw | `raw/2026-11-03/ET_4.2_OCT_26.xlsx` |
| Release | 29 Oct 2026 (data through Aug 2026) |
| Unit | GWh |
| Frequency | Monthly (Month (GWh) sheet) |
| Geography | UK (`K02000001`) |
| Licence | Open Government Licence v3.0 |

## Scope choices

- **Ingest:** Month (GWh) Gross production only.
- **Not ingested yet:** mcm production, trade, demand, quarterly/annual sheets.
- **Notes:** `measure=gross_production` (includes gas used by producers).

## Reproduce

```bash
uv run python -m energy.connectors.domestic_gas_production
```

## Hand-off

After QA vs Month sheet Gross production, registry → Ready iff Validation pass.
