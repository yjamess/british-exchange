# QA report — manufacturing output per job — 2026-11-10

**Agent:** Validation  
**Overall verdict:** **pass** (Ready)

## Scope

- Indicator: `manufacturing-output-per-job` (ONS DJ4P / PRDY — manufacturing section C output per job)
- Manifest: `data/energy/manufacturing-output-per-job/manifest.yaml`
- Raw: `data/energy/manufacturing-output-per-job/raw/2026-11-10/dj4p_prdy.json`
- Curated: `data/energy/manufacturing-output-per-job/curated/observations.csv` (191 quarterly rows)
- Connector: `src/energy/connectors/manufacturing_output_per_job.py`
- Official: [ONS DJ4P / PRDY](https://www.ons.gov.uk/employmentandlabourmarket/peopleinwork/labourproductivity/timeseries/dj4p/prdy)
- Twin of Ready `manufacturing-output-per-hour` (DJK6) — do not invent as IoP÷jobs

## Freeze

| Item | Value |
|------|-------|
| SHA-256 | `8b47b098be67ab21b61945645a6b30d69467ac101d8edd88cfec5381a9e6b9cf` |
| Series | DJ4P / PRDY |
| Official release | 2026-08-17 |
| Rows | 191 quarterly (1978 Q3 → 2026 Q1) |

## Checks

| ID | Check | Result | Notes |
|----|-------|--------|-------|
| C1 | Pin SHA vs curated hand-off | **pass** | Matches manifest raw evidence |
| C2 | Coverage / UK only / unique keys | **pass** | `K02000001` only; quarterly bounds |
| C3 | Method — index 2023=100 SA; not DIY | **pass** | Official DJ4P title; connector does not divide IoP by jobs |
| C4 | Spot sample | **pass** | 2023 Q1 = 97.8; 2026 Q1 = 101.8 (curated = pin) |
| C5 | Distinct from DJK6 | **pass** | Different CDID and values (output per job ≠ per hour) |

## Close

Ready for Domain 09 Productivity Machine twin dial. Postgres loaded 2026-11-10 (release_id=142).
