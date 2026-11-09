# QA report — bres-manufacturing-employee-jobs-by-region — 2026-11-07

**Agent:** Validation  
**Overall verdict:** **pass-with-warns**  
**Notion:** not marked Ready (Orchestrator hand-off only)

## Scope

- Indicator: `bres-manufacturing-employee-jobs-by-region` (ONS BRES Table 4 — Manufacturing × region, Total employees / All)
- Package dir: `data/energy/bres-manufacturing-employee-jobs/`
- Manifest: `data/energy/bres-manufacturing-employee-jobs/manifest.yaml`
- Raw: `data/energy/bres-manufacturing-employee-jobs/raw/2026-11-07/` (6× XLSX + `retrieval.json`)
- Curated: `data/energy/bres-manufacturing-employee-jobs/curated/observations.csv` (71 rows)
- Connector (read-only): `energy.connectors.bres_manufacturing_employee_jobs`
- Energy notes: `data/energy/bres-manufacturing-employee-jobs/validation_notes.md`
- Distinct from Ready `manufacturing-employment` (Workforce Jobs **JWR7**) — employee jobs ≠ workforce jobs
- Official: [ONS BRES Table 4](https://www.ons.gov.uk/employmentandlabourmarket/peopleinwork/employmentandemployeetypes/datasets/regionbybroadindustrygroupsicbusinessregisterandemploymentsurveybrestable4)

## Freeze

| Edition | File | Claimed SHA-256 | Match |
|---------|------|-----------------|-------|
| 2019 revised | `table42019r.xlsx` | `22bbcd153191b21a2bf80f58e5fd3293debecdc80e59f99746b0ad6ec4c6f9d1` | exact |
| 2020 revised | `table42020r.xlsx` | `c89881a5e84659f73d777680d3d00411c1887988afc480f23454d6a24a606176` | exact |
| 2021 revised | `table42021r.xlsx` | `6b68b7a1878243ccf911d5916e600c88b814f7208069ca1f88ccb0f141704ab6` | exact |
| 2022 revised | `table42022r.xlsx` | `953c47e68ad9e1154d50d8b498eb317313588a346534566805ded6728189fb03` | exact |
| 2023 revised | `table42023rv2.xlsx` | `2821af7468302779c0a2681c90b6ff8a0a015b092bc185b01c28b22583b3eb41` | exact |
| 2024 provisional | `table42024pv2.xlsx` | `6755ecd6757a99fc31044d2a3f5ffe640f3e9543c38884a959dcff1f91533e41` | exact |
| retrieval meta | `retrieval.json` | `e0e969475303af1ccc029e5dba9fca72a67913b9bf1c45c0c427ed0fc5f7f3e4` | exact |

| Item | Value |
|------|-------|
| Observations | 71 = 12 regions × 2019–2023 + 11 regions × 2024 |
| Unit | thousands of employee jobs |
| 2024 NI rows | **0** (expected) |

## Checks

| ID | Check | Result | Notes |
|----|-------|--------|-------|
| C1 | Freeze — all pinned raw SHA-256 vs manifest | **pass** | 7/7 evidence files exact; no re-ingest as primary path |
| C2 | Curated coverage — 71 rows; year × geography shape | **pass** | 2019–2023: 12 geos incl. `N92000002`; 2024: 11 geos, **no NI**. Unique `(period_start, geography_code)` |
| C3 | Method — Total employees / All (not Total employment) | **pass** | Connector maps header “Total employees” → All (col 10). Independent XLSX read: NE 2024 Manufacturing employees All = **107**; employment All = **108.1** (not curated). Notes carry `measure=total_employees` |
| C4 | Method — ≠ Workforce Jobs JWR7; no silent stitch | **pass** | Manifest caveats + curated notes `employee_jobs_not_workforce_jobs=true`. Zero `JWR7` in curated notes. Ready JWR7 2023 ≈ 2618 (UK Workforce Jobs, thousands SA) vs BRES 2023 region sum ≈ 2440.7 employee jobs — different concept/level; not joined |
| C5 | Method — 2024p NI / UK gap documented | **pass** | 2024 workbook has no Northern Ireland sheet. Information sheet: *“For the 2024 reference year, this table excludes estimates for the United Kingdom. An updated table will be provided when Northern Ireland estimates become available.”* Curated has 0 `N92000002` for 2024; NI present for 2019–2023 (e.g. 2023 = 89.4) |
| C6 | Method — 2015–2018 deferred if documented | **pass** | Manifest `revision_notes` / caveats / README: older XLSX strict OOXML / openpyxl limitation — out of this pin. Honest deferral, not a silent hole inside 2019–2024 |
| C7 | Numerical — Energy spots vs pinned XLSX | **pass** | NE 2024 = **107.0**; NE 2019 = 107.6; NE 2023 = 110.7; London 2024 = 113.3; Scotland 2024 = 179.2; NI 2023 = 89.4; NI 2024 absent. Match curated and independent sheet reads |
| C8 | Numerical — full recompute curated from pinned XLSX | **pass** | `BresManufacturingEmployeeJobsConnector.transform` → 71 rows, **0** mismatches vs curated |
| C9 | Independence / no silent rewrite | **pass** | Validation did not edit Energy curated/raw/manifest. Connector inspected read-only |
| C10 | Information-sheet wording vs curated unit | **warn** | ONS Information title says “Employment (thousands)…” while definitions distinguish employees vs employment (= employees + working proprietors). Package unit and measure correctly use **employee jobs** / Total employees — keep the loud caveat in UI copy |
| C11 | Provisional / rounding | **warn** | All curated `observation_status=provisional` (survey revises). Figures rounded to nearest 100 (one decimal thousand). 2024 remains provisional until revised + NI restore — expected |

## Numerical samples (Validation)

| Region | GSS | 2019 | 2023 | 2024p | Source check |
|--------|-----|------|------|-------|--------------|
| North East | E12000001 | 107.6 | 110.7 | **107.0** | XLSX Total employees / All |
| London | E12000007 | — | — | 113.3 | curated = transform |
| Scotland | S92000003 | — | — | 179.2 | curated = transform |
| Northern Ireland | N92000002 | present | 89.4 | *absent* | no 2024 sheet |

Distinctness (do not stitch):

| Series | Concept | 2023-ish level |
|--------|---------|----------------|
| BRES Table 4 (this package) | Manufacturing employee jobs by region (sum of 12 regions) | ≈ 2440.7 thousand |
| Ready `manufacturing-employment` JWR7 | UK Workforce Jobs SA, SIC C | 2618.0 thousand |

## Summary

- Pass: **9**
- Warn: **2**
- Fail: **0**
- Blockers: **none**
- Recommended fixes (owner Energy): none for Validation accept. Optional later: extend 2015–2018 once a strict-OOXML reader exists; re-pin when 2024 revised restores NI.
- **Notion:** do **not** mark Ready from this agent — Orchestrator decides after review.

## Reproduce

```bash
# checksums
shasum -a 256 data/energy/bres-manufacturing-employee-jobs/raw/2026-11-07/*

# recompute from pinned raw (transform only; do not rewrite curated for QA)
uv run python -c "
from energy.connectors.bres_manufacturing_employee_jobs import BresManufacturingEmployeeJobsConnector
c = BresManufacturingEmployeeJobsConnector()
ev = c.evidence_from_pinned_raw()
obs = c.transform(ev)
print(len(ev), len(obs), sorted({o.period_start[:4] for o in obs}))
"
```
