# QA report — EC-02-ASHE-B · 2026-11-11

**Agent:** Validation  
**Overall verdict:** **pass** → Ready  
**Script:** `src/validation/qa_economy_02_ashe_b_2026_11_11.py`  
**Does not import Economy connectors.** Workbook cells read from pinned zips with openpyxl.

## Scope

| Indicator | Obs | Cloud (Economy hand-back) | Editions |
|-----------|-----|---------------------------|----------|
| `ashe-national-earnings` | 72 | release **220** | 2026 provisional + 2025 revised · All / Full-Time / Part-Time |
| `ashe-regional-earnings` | 1576 | release **222** | 2026 provisional + 2025 revised · workplace Table 7 |
| `ashe-industry-earnings` | 954 | release **219** | 2026 provisional + 2025 revised · SIC sections A–U |
| `ashe-region-industry-earnings` | 402 | release **221** | 2026 provisional · region × section |

Pins under `data/economy/<id>/raw/2026-11-11/`. ONS release **22 Oct 2026**.

## Checks (all packs)

| ID | Check | Result | Notes |
|----|-------|--------|-------|
| V1 | Pin SHA vs manifest | **pass** | All seven zips |
| V2 | Row counts | **pass** | 72 / 1576 / 954 / 402 |
| V3 | Spot vs workbook + curated | **pass** | See sample table |
| V4 | `observation_status` | **pass** | 2026 → provisional; 2025 revised → final |
| V5 | Suppressions | **pass** | No zero rows; CV rule omit `x` / `:` / `..` |
| V6 | Unit | **pass** | £ per week gross |
| V7 | Notes grammar | **pass** | `sheet=` + `statistic=` present |
| V8 | Manufacturing boundary | **pass** | Economy section C FT 2025 median **£774.0** = Energy Ready pin; shared 2025 revised zip SHA |

## Sample spots (Validation-chosen)

| Pack | Spot | Workbook | Curated |
|------|------|----------|---------|
| National | 2026 All median | £673.1 | £673.1 |
| National | 2025 All median | £641.7 | £641.7 |
| National | 2026 Part-Time median | £288.1 | £288.1 |
| National | 2026 Full-Time median | £811.2 | £811.2 |
| Regional | 2026 FT London | £1038.1 | £1038.1 |
| Regional | 2025 FT London | £959.5 | £959.5 |
| Regional | 2026 FT UK | £811.2 | £811.2 |
| Industry | 2026 FT Manufacturing C | £808.6 | £808.6 |
| Industry | 2025 FT Manufacturing C | £774.0 | £774.0 |
| Region×industry | 2026 FT London Manufacturing | £947.2 | £947.2 |

## Method honesty (accepted)

- Tables 1 and 4 geography = United Kingdom (`K02000001`).
- Table 7 / 5 = workplace basis (Table 8 residence not in this wave).
- Table 5.1a has no England / NI × section cross-tabs (documented).
- Energy `ashe-manufacturing-earnings` remains authoritative for manufacturing Jobs Pay (section C + divisions). Economy Table 4 includes section C among all sections for Wages — link only.

## Blockers

None.

## Recommended Ready flip

Orchestrator / Validation: set Status **Ready** on all four registry rows; Last checked **2026-11-11**; Evidence → this report.
