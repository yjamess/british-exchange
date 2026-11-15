# QA report — Economy 06 effects-of-taxes-and-benefits · 2026-11-15

## Scope

- Indicator: `effects-of-taxes-and-benefits`
- Package: `data/economy/effects-of-taxes-and-benefits/`
- Handover: `docs/handover-economy-06-burden.md`
- Kickoff: `docs/agent-kickoff-validation-economy-06-burden.md`
- Script: `validation.qa_economy_06_burden_2026_11_15`
- Vintage: raw `2026-11-15` · ONS ETB FYE 2024 · released **2025-09-25**

## Independence

Disk raw + curated only. No curated/raw rewrites. Table 8 / Table 2a
spot cells recomputed from pinned workbook
`etbreferencetablesfye202324final.xlsx`.

## Checks

| ID | Check | Result | Notes |
|----|-------|--------|-------|
| C1 | raw checksum ↔ manifest + SHA256SUMS + disk | **pass** | disk=2e38c1694d922427… manifest=2e38c1694d922427… |
| C1 | curated row count = 42; indicator_id | **pass** | rows=42 ids=['effects-of-taxes-and-benefits'] |
| C2 | FYE 2024 period; UK; quintile dimension present | **pass** | periods=[('2023-04-01', '2024-03-31')] geos=[('K02000001', 'United Kingdom')] bands=['2nd', '3rd', '4th', 'all', 'bottom', 'top'] |
| C2 | workbook Table 8 title covers UK 2023/24 | **pass** | Table 8: Taxes as a percentage of gross income, disposable income and expenditure for all  |
| C3 | Table 8 direct % gross_income · bottom | **pass** | curated=15.7 workbook=15.7 expected=15.7 |
| C3 | Table 8 indirect % gross_income · bottom | **pass** | curated=21.0 workbook=21.0 expected=21.0 |
| C3 | Table 8 all % gross_income · bottom | **pass** | curated=36.7 workbook=36.7 expected=36.7 |
| C3 | Table 8 indirect % expenditure · bottom | **pass** | curated=16.5 workbook=16.5 expected=16.5 |
| C3 | Table 8 direct % gross_income · top | **pass** | curated=28.8 workbook=28.8 expected=28.8 |
| C3 | Table 8 indirect % gross_income · top | **pass** | curated=7.5 workbook=7.5 expected=7.5 |
| C3 | Table 8 all % gross_income · all | **pass** | curated=33.6 workbook=33.6 expected=33.6 |
| C3 | Table 8 indirect % disposable_income · bottom | **pass** | curated=24.9 workbook=24.9 expected=24.9 |
| C4 | Table 2a total direct £ · bottom | **pass** | curated=3696.0 workbook=3696.0 expected=3696.0 |
| C4 | Table 2a total indirect £ · bottom | **pass** | curated=4929.0 workbook=4929.0 expected=4929.0 |
| C4 | Table 2a total direct £ · all | **pass** | curated=15743.0 workbook=15743.0 expected=15743.0 |
| C4 | Table 2a total indirect £ · all | **pass** | curated=7363.0 workbook=7363.0 expected=7363.0 |
| C4 | Table 2a total direct £ · top | **pass** | curated=41215.0 workbook=41215.0 expected=41215.0 |
| C4 | Table 2a total indirect £ · top | **pass** | curated=10688.0 workbook=10688.0 expected=10688.0 |
| C5 | direct + indirect = all on gross income % (≤0.1pp rounding) | **pass** | bottom: 15.7+21.0=36.7 vs all=36.7 Δ=0.0; 2nd: 15.7+15.1=30.799999999999997 vs all=30.7 Δ=0.1; 3rd: 18.2+11.9=30.1 vs all=30.2 Δ=0.1; 4th: 21.3+10.4=31.700000000000003 vs all=31.7 Δ=0.0; top: 28.8+7.5=36.3 vs all=36.2 Δ=0.1; all: 22.9+10.7=33.599999999999994 vs all=33.6 Δ=0.0 |
| C5 | Bottom direct+indirect = all on gross (36.7) | **pass** | sum=36.7 |
| C6 | no curated direct % of disposable/expenditure | **pass** | invented_rows=0 |
| C6 | workbook Table 8 has no direct×disposable/expenditure headlines | **pass** | wb_keys=[] |
| C6 | row split Table 8=30 / Table 2a=12 | **pass** | t8=30 t2a=12 |
| C7 | caveat present: survey/group averages ≠ household | **pass** | README/manifest/validation_report |
| C7 | caveat present: legal ≠ economic incidence | **pass** | README/manifest/validation_report |
| C7 | caveat present: not AHHY | **pass** | README/manifest/validation_report |
| C7 | caveat present: no fairness claims | **pass** | README/manifest/validation_report |
| C7 | copy does not assert fairness / individual liability | **pass** | asserts_fairness=False denies_individual=True |
| C8 | package does not claim Ready / frontend live | **pass** | not_ready_ok=True ready_claim=False frontend=False |
| C8 | manifest status_note empty / no Ready flip | **pass** | status_note='' |

## Spots checked

### Table 8 (workbook ↔ curated)

| Band | Direct % gross | Indirect % gross | All % gross | Indirect % disposable | Indirect % expenditure |
|------|----------------|------------------|-------------|----------------------|------------------------|
| Bottom | 15.7 | 21.0 | 36.7 | 24.9 | 16.5 |
| Top | 28.8 | 7.5 | 36.2 | 10.5 | 15.4 |
| All individuals | 22.9 | 10.7 | 33.6 | 13.9 | 16.4 |

Gross identity: Bottom **15.7 + 21.0 = 36.7** (exact). Other bands
match within **0.1pp** publisher rounding of independently rounded shares.

### Table 2a £/year household averages (workbook ↔ curated)

| Band | Total direct £ | Total indirect £ |
|------|----------------|------------------|
| Bottom | 3,696 | 4,929 |
| Top | 41,215 | 10,688 |
| All individuals | 15,743 | 7,363 |

## Summary

- **Verdict: pass** (30 pass / 0 warn / 0 fail)
- **Ready recommendation: yes**
- Orchestrator may flip registry to Ready + schedule cloud load after PASS.
- Out of scope: Burden UI, multi-year history, Table 9 non-retired, component tax heads.

## Blockers

- None for Validation PASS on this pin.
- Non-blocking (handover): multi-year editions not pinned; `/current/` URI 404
  (edition path locked); Domain 04 HBAI not required for this pin;
  frontend EmptyStage intentional until Orchestrator Review Gate.
