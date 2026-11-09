# QA report — oil-imports-by-country — 2026-11-07

## Scope
- Indicator: `oil-imports-by-country` (DESNZ **DUKES 3.7**, Total oil by country of origin, thousand tonnes)
- Manifest: `data/energy/oil-imports-by-country/manifest.yaml`
- Raw (pinned): `data/energy/oil-imports-by-country/raw/2026-11-07/DUKES_3.7.xlsx`
- Curated: `data/energy/oil-imports-by-country/curated/observations.csv` (896 rows)
- Connector (read-only): `src/energy/connectors/oil_imports_by_country.py` · module `energy.connectors.oil_imports_by_country`
- Energy hand-off: `data/energy/oil-imports-by-country/validation_notes.md`
- Gate 3 B1: Imports Lifelines (sibling packages: `lng-imports-by-terminal`, `gas-trade-by-partner`)

Validation did **not** re-ingest as the primary path and did **not** edit Energy curated/raw data.

## Checks
| ID | Check | Result | Notes |
|----|-------|--------|-------|
| C1 | Freeze — SHA-256 of pinned raw vs manifest | **pass** | `fd855afe3ad2145c69db63f83d55bdd7f50fc615d9a5893014af7163ede6bb06` exact match to `manifest.yaml` / Energy notes. Asset URL + official release 2026-07-30 recorded. |
| C2 | Curated row count + coverage | **pass** | 896 observations (matches claim). Annual year sheets 2012–2025; `unit=thousand tonnes` only; `observation_status=final` all; `indicator_id` consistent. |
| C3 | Units / sheet match claimed DUKES 3.7 | **pass** | Year sheets titled e.g. “Table 3.7 … (thousand tonnes)”; header row 4 has `Country` + `Total oil` (connector locates Total oil by header text). Product columns (Crude oil, DERV, …) correctly left out of this indicator. |
| C4 | Geography honesty — UK statistical; partners in notes only | **pass** | All rows `geography_code=K02000001` / `United Kingdom`. Partners only in `notes` as `partner=<label>`. No lat/lon/easting/landfall fields. No invented admin codes for origin countries. |
| C5 | Transform honesty — zeros omitted; aggregates retained | **pass** | Ordinary partners with Total oil = 0 dropped; `Total imports` and `Not elsewhere specified` kept as `kind=aggregate`. Independent re-parse produced identical 896 keys/notes. |
| C6 | Numerical — full independent recompute vs curated | **pass** | Independent `openpyxl` `data_only` parse of every YYYY sheet × Total oil: **0 mismatches / 0 missing / 0 extras** vs curated. |
| C7 | Numerical — 2025 Energy-claimed spot samples | **pass** | United States 16866.42; Total imports 76591.82; Norway 12178.23; Algeria 2698.25; Belgium 2952.96 — raw XLSX = curated = claim (exact). |
| C8 | Numerical — 2025 partner sum + NES = Total imports | **pass** | Σ `kind=partner` 72333.87 + NES 4257.95 = 76591.82 (= Total imports; float noise ~1e-11). |
| C9 | Independence / no silent rewrite | **pass** | Validation only read pinned XLSX + curated CSV; no Energy path writes. Product breakdown and port coordinates remain out of scope as documented. |
| C10 | Dimensions live in free-text `notes` | **warn** | `partner=` / `product=` / `kind=` / `fuel=` are parseable notes, not typed columns. Same contract v1.0 pattern as other Ready series. Not a Ready blocker. |

## Spot-check table (2025, pinned sheet `2025`, Total oil)

| Partner | XLSX (kt) | Curated | Energy claim | Match |
|---------|-----------|---------|--------------|-------|
| United States | 16866.42 | 16866.42 | 16866.42 | exact |
| Norway | 12178.23 | 12178.23 | 12178.23 | exact |
| Algeria | 2698.25 | 2698.25 | 2698.25 | exact |
| Belgium | 2952.96 | 2952.96 | 2952.96 | exact |
| Total imports | 76591.82 | 76591.82 | 76591.82 | exact |

## Summary
- **Pass:** 9
- **Warn:** 1 (C10 notes dimensions)
- **Fail:** 0
- **Verdict:** critical QA **PASS**
- **Blockers:** none
- **Recommended fixes (owner Energy):** none for Ready. Optional later: typed partner/kind columns; optional product=`Crude oil` rows (open question only).
- **Notion:** Validation does **not** mark Ready (Orchestrator hand-off). Evidence path for promotion: this report.
