# renewable-energy-planning-pipeline

**Owner:** Energy agent (Gate 3 B3 · Field Guide)  
**Status:** **Ready** (Validation 2026-11-07 — `data/qa/qa_report_renewable_energy_planning_pipeline_2026-11-07.md`)  
**indicator_id:** `renewable-energy-planning-pipeline`

Sibling of Ready `renewable-energy-planning-operational`. **Same REPD Q2 2026 pin and connector module** — not a second REPD pipeline.

## Chosen series

| Field | Value |
|-------|--------|
| Publisher | DESNZ |
| Landing | https://www.gov.uk/government/publications/renewable-energy-planning-database-quarterly-extract |
| Series | REPD quarterly extract — Installed Capacity (MWelec) by Development Status (short), excluding Operational |
| Geography | UK (projects; includes NI and offshore) |
| Frequency | Quarterly snapshot |
| Unit | MW |
| Licence | OGL v3.0 |

Notes carry `status=<Development Status (short)>; technology=<Technology Type>`.

**Threshold caveat:** REPD covers projects ≥150 kW (≥1 MW before 2021).

## Reproduce

```bash
uv run python -m energy.connectors.renewable_energy_planning
```

That command refreshes **both** the operational and pipeline packages from the shared pin.

## Hand-off paths

| Artefact | Path |
|----------|------|
| Manifest | `manifest.yaml` |
| Curated | `curated/observations.csv` |
| Raw pin (copy of operational) | `raw/2026-11-06/REPD_Publication_Q2_2026.csv` |
| Validation notes | `validation_notes.md` |
| Connector | `src/energy/connectors/renewable_energy_planning.py` |
