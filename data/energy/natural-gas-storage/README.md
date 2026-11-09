# natural-gas-storage

**Owner:** Energy agent (Domain 05 · Resilience Test storage companion)  
**Status:** **Ready** (Validation 2026-11-08 — `data/qa/qa_report_natural_gas_storage_2026-11-08.md`)  
**indicator_id:** `natural-gas-storage`

Official DESNZ **DUKES 4.4a** — UK natural gas Stock, Stock change and Storage capacity (GWh). Separate from import dependency ratios — **never one security score**.

## Chosen series

| Field | Value |
|-------|--------|
| Publisher | DESNZ |
| Landing | https://www.gov.uk/government/statistics/natural-gas-chapter-4-digest-of-united-kingdom-energy-statistics-dukes |
| Asset | [DUKES_4.4.xlsx](https://assets.publishing.service.gov.uk/media/6a69f4561bcde42205705fec/DUKES_4.4.xlsx) |
| Geography | **United Kingdom** (`K02000001`) |
| Frequency | Annual |
| Unit | GWh |
| Licence | OGL v3.0 |

## Reproduce

```bash
uv run python -m energy.connectors.natural_gas_storage
```

## Hand-off paths

| Artefact | Path |
|----------|------|
| Manifest | `manifest.yaml` |
| Curated | `curated/observations.csv` |
| Raw pin | `raw/2026-11-08/DUKES_4.4.xlsx` |
| Validation notes | `validation_notes.md` |
| Connector | `src/energy/connectors/natural_gas_storage.py` |
