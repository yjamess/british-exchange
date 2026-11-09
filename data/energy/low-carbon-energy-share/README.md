# Low carbon energy share

**`indicator_id`:** `low-carbon-energy-share`  
**Owner:** Energy (DESNZ) · Domain 05 Resilience Test  
**Status:** **Ready** (Validation 2026-11-08 — `data/qa/qa_report_low_carbon_energy_share_2026-11-08.md`)

## Source

Same pinned workbook as `energy-import-dependency`: ET 1.3 `ET_1.3_SEP_26.xlsx`, sheets Annual / Quarter dependency & low carbon, column **Low carbon share [note 6]** (ratio).

## Reproduce

```bash
uv run python -m energy.connectors.low_carbon_energy_share
```
