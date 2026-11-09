# Fossil fuel dependency

**`indicator_id`:** `fossil-fuel-dependency`  
**Owner:** Energy (DESNZ) · Domain 05 Resilience Test  
**Status:** **Ready** (Validation 2026-11-08 — `data/qa/qa_report_fossil_fuel_dependency_2026-11-08.md`)

## Source

Same pinned workbook as `energy-import-dependency`: ET 1.3 `ET_1.3_SEP_26.xlsx`, sheets Annual / Quarter dependency & low carbon, column **Fossil fuel dependency [note 6]** (ratio).

## Reproduce

```bash
uv run python -m energy.connectors.fossil_fuel_dependency
```
