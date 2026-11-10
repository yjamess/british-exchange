# ssen-dno-pilot

**Owner:** Energy (Domain 07 Power Networks · Invisible Grid pilot)  
**Status:** Ready (Validation QA 2026-11-09)  
**indicator_id:** `ssen-distribution-network-atlas`

SSEN Distribution **SEPD + SHEPD** substations and overhead lines — a labelled single-DNO pilot for The Invisible Grid. **Not** a national DNO atlas. **Not** spare capacity.

## Sources

| Asset | Landing | Licence (portal) |
|-------|---------|------------------|
| Substation Data | https://data.ssen.co.uk/@ssen-distribution/ssen-substation-data | CC BY 4.0 · IB1-O |
| Overhead Lines | https://data.ssen.co.uk/@ssen-distribution/ssen-overhead-lines | CC BY 4.0 · IB1-O (confirm on portal) |

Attribution: **© SSEN Distribution**.

## Honesty

- Geography = SSEN licence areas only (southern England + northern Scotland)
- Overhead lines only — underground cables are absent from this pin
- Display `atlas.json` keeps Primary / Grid·BSP / Switching + EHV/EHV+ lines; full HV 11 kV stays in archived raw CSV
- Never invent local spare capacity

## Reproduce

```bash
# If raw CSVs were archived off the laptop:
uv run python -m britain_exchange.archive_data pull data/energy/ssen-dno-pilot/raw

# Transform pin → curated observations + lean atlas
uv run python -m energy.connectors.ssen_dno_pilot

# Push heavy artefacts to Supabase (deletes local copies by default)
uv run python -m britain_exchange.archive_data push data/energy/ssen-dno-pilot/raw
uv run python -m britain_exchange.archive_data push data/energy/ssen-dno-pilot/curated/atlas.json
```

## Hand-off paths

| Artefact | Path |
|----------|------|
| Manifest | `manifest.yaml` |
| Retrieval | `raw/2026-11-09/retrieval.json` |
| Curated counts | `curated/observations.csv` |
| Display atlas | `curated/atlas.json` (pack id `energy.ssen-dno-atlas`) |
| Spatial meta | `curated/spatial_meta.json` |
| Connector | `src/energy/connectors/ssen_dno_pilot.py` |
