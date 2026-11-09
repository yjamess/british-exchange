# Validation notes — bres-manufacturing-employee-jobs-by-region (Energy self-check)

**Date:** 2026-11-07  
**Owner:** Energy (Industry)  
**Status:** **Ready** (Orchestrator after Validation pass-with-warns — `data/qa/qa_report_bres_manufacturing_employee_jobs_by_region_2026-11-07.md`)  
**Indicator:** `bres-manufacturing-employee-jobs-by-region`  
**Series:** ONS BRES Table 4 Manufacturing / Total employees (All)

## Paths

| Artefact | Path |
|----------|------|
| Manifest | `data/energy/bres-manufacturing-employee-jobs/manifest.yaml` |
| Raw pins | `data/energy/bres-manufacturing-employee-jobs/raw/2026-11-07/*.xlsx` + `retrieval.json` |
| Curated | `data/energy/bres-manufacturing-employee-jobs/curated/observations.csv` |
| Connector | `src/energy/connectors/bres_manufacturing_employee_jobs.py` |

## Freeze

| Edition | File | SHA-256 (prefix) |
|---------|------|------------------|
| 2019 revised | `table42019r.xlsx` | `22bbcd153191b21a…` |
| 2020 revised | `table42020r.xlsx` | `c89881a5e84659f7…` |
| 2021 revised | `table42021r.xlsx` | `6b68b7a1878243cc…` |
| 2022 revised | `table42022r.xlsx` | `953c47e68ad9e115…` |
| 2023 revised | `table42023rv2.xlsx` | `2821af7468302779…` |
| 2024 provisional | `table42024pv2.xlsx` | see manifest |

| Item | Value |
|------|-------|
| Observations | 71 (12 regions × 2019–2023 + 11 regions × 2024) |
| Unit | thousands of employee jobs |
| 2024 NI rows | 0 (expected) |

## Spot samples (Manufacturing total employees, thousands)

| Region | 2019 | 2023 | 2024p |
|--------|------|------|-------|
| North East | 107.6 | 110.7 | 107.0 |
| London | (see curated) | (see curated) | 113.3 |
| Scotland | (see curated) | (see curated) | 179.2 |
| Northern Ireland | present | 89.4 | absent |

## Method

1. Download Table 4 XLSX editions listed above.
2. Per regional sheet: Manufacturing row → Total employees / All (column 10 in current layout).
3. Map sheet titles to GSS codes; do not invent UK totals.

## Suggested Validation checks

- [ ] Checksums match manifest `raw_evidence`
- [ ] Recompute curated from pinned XLSX
- [ ] Spot North East / London / Scotland vs ONS Table 4 published figures
- [ ] Confirm measure is employees not employment (col 10 vs col 13)
- [ ] Confirm 2024 has no `N92000002` row; 2019–2023 include NI
- [ ] Confirm no silent join to Ready JWR7 Workforce Jobs

## Reproduce

```bash
uv run python -m energy.connectors.bres_manufacturing_employee_jobs
```

## Blockers / honesty

- Ready (2026-11-07). Employee jobs ≠ Workforce Jobs (JWR7).
- 2015–2018 editions blocked on openpyxl/strict OOXML.
- 2024 geography = GB regions only until revised edition restores NI.
