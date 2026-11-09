# QA report — UK power stations (DUKES 5.11 fossil + nuclear) — 2026-11-07

**Agent:** Validation  
**Overall verdict:** **pass** (Ready)

## Scope

- Indicator: `uk-power-stations-dukes` (DUKES 5.11 — Fossil Fuel ∪ Nuclear major power producers)
- Manifest: `data/energy/uk-power-stations-dukes/manifest.yaml`
- Raw: `data/energy/uk-power-stations-dukes/raw/2026-11-06/DUKES_5.11.xlsx`
- Curated: `curated/observations.csv` (3 fuel MW rows) + `curated/stations.json` (74 stations)
- Connector: `src/energy/connectors/uk_power_stations_dukes.py` (read-only for QA)
- Complements: REPD renewables atlas — does not duplicate renewable Technology rows
- Official: [DUKES electricity chapter 5](https://www.gov.uk/government/statistics/electricity-chapter-5-digest-of-united-kingdom-energy-statistics-dukes)

## Freeze

| Item | Value |
|------|-------|
| Claimed SHA-256 | `760286f4cb3168f04a5ee1b581dbfcb35e1d65a5ea0151bb2dd4dc12dca2c72a` |
| Observed SHA-256 | `760286f4cb3168f04a5ee1b581dbfcb35e1d65a5ea0151bb2dd4dc12dca2c72a` |
| Official release | 2025-07-31 (manifest) |
| Station count | 74 (68 plotted OSGB→WGS84; 6 NI skipped) |
| Fuel MW rows | Natural Gas 33 676; Nuclear 5 883; Diesel/Gas Oil 1 044.2 |

## Checks

| ID | Check | Result | Notes |
|----|-------|--------|-------|
| C1 | Freeze — pinned raw SHA-256 vs manifest | **pass** | Exact match |
| C2 | Technology filter Fossil Fuel ∪ Nuclear only | **pass** | 74 stations; no renewable Technology rows |
| C3 | Fuel MW observations = three Primary Fuel totals | **pass** | Diesel/Gas Oil · Natural Gas · Nuclear |
| C4 | OSGB→WGS84 for GB/Wales/Scotland | **pass** | 68 stations with lon/lat |
| C5 | Northern Ireland not plotted (Irish Grid) | **pass** | 6 skipped; listed in JSON |
| C6 | Spot coordinates | **pass** | Pembroke ≈ 51.66°N, −4.99°; matches stations.json |
| C7 | No operating coal on current list | **pass** | Post-Ratcliffe |
| C8 | Complements REPD (no silent rewrite of renewables) | **pass** | Atlas merges separately |
| C9 | Independence — Validation did not edit Energy curated | **pass** | Report only |

## Summary

- Pass: **9**
- Warn: **0**
- Fail: **0**
- Blockers: **none**
- **Notion:** Status → **Ready** (2026-11-07); Evidence includes this QA path

## Reproduce

```bash
shasum -a 256 data/energy/uk-power-stations-dukes/raw/2026-11-06/DUKES_5.11.xlsx
# Inspect stations.json station_count / stations_with_coordinates
```
