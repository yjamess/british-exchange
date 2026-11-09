# Domestic gas unit rates and standing charges

**Indicator:** `domestic-gas-unit-standing`  
**Source:** DESNZ QEP table 2.3.4  
**Status:** Ready after Validation QA `data/qa/qa_report_domestic_gas_unit_standing_2026-11-07.md`

## Reproduce

```bash
uv run python -m energy.connectors.domestic_gas_unit_standing
```

Pinned raw: `raw/2026-11-07/table_234.xlsx`.

## UI

Dissected Bill gas layers: `/energy?domain=prices&view=bill&bill_fuel=gas`
