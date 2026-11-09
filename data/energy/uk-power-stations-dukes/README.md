# UK power stations — fossil and nuclear (DUKES 5.11)

Major power producers on DESNZ DUKES table 5.11 whose Technology is **Fossil Fuel** or **Nuclear**.

Complements `renewable-energy-planning-operational` (REPD). Together they feed the Generation **Station atlas**.

## Reproduce

```bash
uv run python -m energy.connectors.uk_power_stations_dukes
```

Pinned raw: `raw/2026-11-06/DUKES_5.11.xlsx`  
Curated: `curated/observations.csv` (MW by primary fuel) + `curated/stations.json` (register + WGS84 points)

Northern Ireland rows stay in the register; they are not plotted (Irish Grid ≠ OSGB36).
