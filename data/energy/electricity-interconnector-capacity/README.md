# electricity-interconnector-capacity

**Owner:** Energy agent (Domain 05 · Britain's Connectors capacity companion)  
**Status:** **Ready** (Validation 2026-11-08 — `data/qa/qa_report_electricity_interconnector_capacity_2026-11-08.md`)  
**indicator_id:** `electricity-interconnector-capacity`

Official NESO **Interconnector Register** — firm TEC capacity MW (import side). Companion to Ready `electricity-interconnector-flows` (ET 5.6 GWh). **Capacity ≠ transferred energy.**

## Chosen series

| Field | Value |
|-------|--------|
| Publisher | NESO |
| Landing | https://www.neso.energy/data-portal/interconnector-register |
| Resource | CKAN `64f7908f-f787-4977-93e1-5342a5f1357f` |
| Geography | **Great Britain** (`K03000001`) |
| Frequency | Dated pin (portal updates twice weekly) |
| Unit | MW |
| Licence | [NESO Open Data Licence](https://www.neso.energy/data-portal/ngeso-open-licence) |

## Reproduce

```bash
# First pin / refresh official CSV
uv run python -m energy.connectors.neso_interconnector_register --fetch

# Re-transform from pin only
uv run python -m energy.connectors.neso_interconnector_register
```

## Hand-off paths

| Artefact | Path |
|----------|------|
| Manifest | `manifest.yaml` |
| Curated | `curated/observations.csv` |
| Raw pin | `raw/2026-11-08/interconnector-register-05-november-2026.csv` |
| Retrieval | `raw/2026-11-08/retrieval.json` |
| Validation notes | `validation_notes.md` |
| Connector | `src/energy/connectors/neso_interconnector_register.py` |
