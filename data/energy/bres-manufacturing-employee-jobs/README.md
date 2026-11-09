# BRES manufacturing employee jobs by region

**Indicator:** `bres-manufacturing-employee-jobs-by-region`  
**Agent:** energy (Energy & Industry)  
**Status:** **Ready** (Validation 2026-11-07 — `data/qa/qa_report_bres_manufacturing_employee_jobs_by_region_2026-11-07.md`)  
**Source:** ONS [BRES Table 4 — Region by broad industry](https://www.ons.gov.uk/employmentandlabourmarket/peopleinwork/employmentandemployeetypes/datasets/regionbybroadindustrygroupsicbusinessregisterandemploymentsurveybrestable4)

## What this is

Annual **Manufacturing** broad industry group × UK region, **Total employees (All)**, thousands.

Pinned editions: revised 2019–2023 + provisional 2024.

## Loud caveats

- **Employee jobs ≠ Workforce Jobs.** Do not confuse with Ready `manufacturing-employment` (JWR7).
- Measure is **employees**, not employment (excludes working proprietors).
- **2024 provisional excludes Northern Ireland** (ONS Information sheet).
- PAYE-only discontinuity matters if extending **before 2015** / finer NOMIS extracts — not in this 2019–2024 pin.
- 2015–2018 Table 4 XLSX use strict OOXML that `openpyxl` cannot load — deferred.

## Reproduce

```bash
uv run python -m energy.connectors.bres_manufacturing_employee_jobs
```

Reuses pinned XLSX under `raw/2026-11-07/` when present (ONS rate-limits bursts); otherwise downloads with retry/backoff.
