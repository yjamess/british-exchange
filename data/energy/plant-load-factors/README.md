# plant-load-factors

**Owner:** Energy agent (Gate 3 B3 · Field Guide)  
**Status:** **Ready** (Validation 2026-11-07 — `data/qa/qa_report_plant_load_factors_2026-11-07.md`)  
**indicator_id:** `plant-load-factors`

DUKES **5.10** Major Power Producer plant loads — including **nuclear** load factors. Distinct from Ready `renewable-electricity-load-factors` (DUKES 6.3).

## Chosen series

| Field | Value |
|-------|--------|
| Publisher | DESNZ |
| Landing | https://www.gov.uk/government/statistics/electricity-chapter-5-digest-of-united-kingdom-energy-statistics-dukes |
| Series | DUKES 5.10.B plant load factor (%) + 5.10.C thermal efficiency (%) |
| Geography | UK — Major Power Producers |
| Frequency | Annual |
| Unit | percent (0–100 as published) |
| Licence | OGL v3.0 |

Notes: `generator_type=<Label>; series=load_factor|thermal_efficiency`.

## Reproduce

```bash
uv run python -m energy.connectors.plant_load_factors
```

## Hand-off paths

| Artefact | Path |
|----------|------|
| Manifest | `manifest.yaml` |
| Curated | `curated/observations.csv` |
| Raw pin | `raw/2026-11-07/DUKES_5.10.xlsx` |
| Retrieval | `raw/2026-11-07/retrieval.json` |
| Validation notes | `validation_notes.md` |
| Connector | `src/energy/connectors/plant_load_factors.py` |
