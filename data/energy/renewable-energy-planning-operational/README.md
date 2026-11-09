# Renewable energy planning — operational capacity (REPD)

**Indicator:** `renewable-energy-planning-operational`  
**Publisher:** DESNZ · Renewable Energy Planning Database (quarterly)  
**Coverage:** Operational renewable (+ some storage) projects only — **not** a full UK power-station atlas.

Sibling (same connector + pin, non-operational stages): `renewable-energy-planning-pipeline`.

## Reproduce

```bash
uv run python -m energy.connectors.renewable_energy_planning
```

Pinned raw: `raw/2026-11-06/REPD_Publication_Q2_2026.csv` (cp1252). Refreshes operational **and** pipeline packages.

## UI

`/energy?domain=generation&view=atlas` — region TileMap, technology RankBars, largest sites table.
