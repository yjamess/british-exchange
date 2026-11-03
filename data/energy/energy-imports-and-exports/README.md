# Energy imports and exports

**Registry:** [Energy imports and exports](https://app.notion.com/40d6547176858157b47ad6027387bc4e)  
**`indicator_id`:** `energy-imports-and-exports`  
**Owner:** Energy (DESNZ)

## Source

| Field | Value |
|-------|--------|
| Landing | https://www.gov.uk/government/statistics/total-energy-section-1-energy-trends |
| Table | ET 1.3 Supply and use of fuels — Imports / Exports |
| Pinned raw | `raw/2026-11-03/ET_1.3_SEP_26.xlsx` |
| Release | 29 Sep 2026 |
| Unit | ktoe |
| Frequency | Quarterly |
| Geography | UK (`K02000001`) |
| Licence | Open Government Licence v3.0 |

## Scope choices

- **Ingest:** `Quarter supply and use of fuels` — Imports and Exports columns.
- **Sign:** Exports keep DESNZ balance convention (typically negative).
- **Notes:** `flow=Imports` or `flow=Exports`.
- **Not ingested yet:** by-fuel trade (Table 1.3b), DUKES G.1.

## Reproduce

```bash
uv run python -m energy.connectors.energy_imports_and_exports
```
