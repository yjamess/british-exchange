# neso-tec-register

**Owner:** Energy agent (Gate 3 B3 · Networks queue)  
**Status:** **Ready** (Validation 2026-11-07 — `data/qa/qa_report_transmission_entry_capacity_register_2026-11-07.md`)  
**indicator_id:** `transmission-entry-capacity-register`

Official NESO **Transmission Entry Capacity (TEC) Register** — contracted MW + contractual dates + Gate column. **Not** speculative ETAs. **Not** a DNO topology atlas (national DNO remains Blocked).

## Chosen series

| Field | Value |
|-------|--------|
| Publisher | NESO |
| Landing | https://www.neso.energy/data-portal/transmission-entry-capacity-tec-register |
| Resource | CKAN `17becbab-e3e8-473f-b303-3806f43a6a10` |
| Geography | **Great Britain** (`K03000001`) |
| Frequency | Dated pin (portal updates twice weekly) |
| Unit | MW |
| Licence | [NESO Open Data Licence](https://www.neso.energy/data-portal/ngeso-open-licence) |

## Reproduce

```bash
# First pin / refresh official CSV
uv run python -m energy.connectors.neso_tec_register --fetch

# Re-transform from pin only
uv run python -m energy.connectors.neso_tec_register
```

## Hand-off paths

| Artefact | Path |
|----------|------|
| Manifest | `manifest.yaml` |
| Curated | `curated/observations.csv` |
| Raw pin | `raw/2026-11-07/tec-register-05-november-2026.csv` |
| Retrieval | `raw/2026-11-07/retrieval.json` |
| Validation notes | `validation_notes.md` |
| Connector | `src/energy/connectors/neso_tec_register.py` |
