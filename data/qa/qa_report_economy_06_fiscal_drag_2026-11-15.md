# QA report — Economy 06 fiscal-drag examples · 2026-11-15

## Scope

- Indicator: `tax-machine-income-tax-history` (fiscal-drag artefacts only)
- Package: `data/economy/tax-machine-income-tax-history/`
- Handover: `docs/handover-economy-06-fiscal-drag.md`
- Kickoff: `docs/agent-kickoff-validation-economy-06-fiscal-drag.md`
- Script: `validation.qa_economy_06_fiscal_drag_2026_11_15`
- Artefacts: `curated/fiscal_drag_examples.json`, `fiscal_drag_status.json`,
  `awe_kai7_tax_year.csv`, `raw/2026-11-15/kai7_emp.json`

## Independence

Disk raw + curated only. Tax-year AWE recomputed from pinned ONS KAI7
months; liabilities recomputed from curated PA + after-allowance bands.
Does **not** import `economy.connectors.tax_machine_fiscal_drag`.
Does **not** rewrite curated bands (Scotland 2017–22 fingerprint checked).

## Checks

| ID | Check | Result | Notes |
|----|-------|--------|-------|
| C1 | kai7_emp.json SHA-256 ↔ manifest / SHA256SUMS; ONS title/CDID/releaseDate | **pass** | disk=c23b05e8873d568c… sums_ok=True manifest_ok=True cdid='KAI7' releaseDate='2026-10-19T23:00:00.000Z' title='AWE: Whole Economy Level (£): Seasonally Adjusted Regular Pa' |
| C2 | Recompute tax-year mean×52 for 2021-22 | **pass** | recomputed mean=548.750000 annual=28535.0000 curated mean=548.75 annual=28535.0 months=12 |
| C2 | Recompute tax-year mean×52 for 2025-26 | **pass** | recomputed mean=684.833333 annual=35611.3333 curated mean=684.8333 annual=35611.33 months=12 |
| C3 | Recompute ewni_awe_scaled liability 2021-22 | **pass** | band_steps match curated |
| C3 | Recompute ewni_awe_scaled liability 2025-26 | **pass** | band_steps match curated |
| C4 | E/W/NI counterfactual indexes PA/basic by KAI7 only (2021-22) | **pass** | index=1.000000 expected=1.000000 PA=12570 (exp 12570) basic_upper=37700 (exp 37700) rates_ok=True liability_ok=True |
| C4 | E/W/NI counterfactual indexes PA/basic by KAI7 only (2025-26) | **pass** | index=1.247988 expected=1.247988 PA=15687 (exp 15687) basic_upper=47049 (exp 47049) rates_ok=True liability_ok=True |
| C4 | E/W/NI near-HRT 2025-26 counterfactual extra tax > 0 | **pass** | PA=15687 (exp 15687) basic_upper=47049 (exp 47049) extra_tax=1801.29 |
| C5 | Scotland profile uses Scotland rows (2021-22) | **pass** | jurisdiction=scotland sco_bands=['starter', 'basic', 'intermediate'] ewni_bands=['basic'] csv=['starter', 'basic', 'intermediate', 'higher', 'top'] liability_ok=True not_ewni_copy=True |
| C5 | Scotland profile uses Scotland rows (2022-23) | **pass** | jurisdiction=scotland sco_bands=['starter', 'basic', 'intermediate'] ewni_bands=['basic'] csv=['starter', 'basic', 'intermediate', 'higher', 'top'] liability_ok=True not_ewni_copy=True |
| C5 | Scotland profile uses Scotland rows (2023-24) | **pass** | jurisdiction=scotland sco_bands=['starter', 'basic', 'intermediate'] ewni_bands=['basic'] csv=['starter', 'basic', 'intermediate', 'higher', 'top'] liability_ok=True not_ewni_copy=True |
| C5 | Scotland profile uses Scotland rows (2024-25) | **pass** | jurisdiction=scotland sco_bands=['starter', 'basic', 'intermediate'] ewni_bands=['basic'] csv=['starter', 'basic', 'intermediate', 'higher', 'advanced', 'top'] liability_ok=True not_ewni_copy=True |
| C5 | Scotland profile uses Scotland rows (2025-26) | **pass** | jurisdiction=scotland sco_bands=['starter', 'basic', 'intermediate'] ewni_bands=['basic'] csv=['starter', 'basic', 'intermediate', 'higher', 'advanced', 'top'] liability_ok=True not_ewni_copy=True |
| C6 | Scotland 2017–18…2022–23 band CSV fingerprint unchanged | **pass** | rows=28 sha256=c3ab0cbf7c6753e036b50feab5119211234d0251cd689a93694d1328d60a8f1a |
| C7 | Status=documented, ready=false; no frontend / Ready claim by Economy | **pass** | status='documented' ready=False examples.status='documented' handover_no_ready=True handover_no_frontend=True manifest_no_ui=True |
| C7b | Package manifest.yaml parses as YAML | **warn** | transformations block has unquoted colon after 'Fiscal-drag examples' — yaml.safe_load fails; KAI7 checksum still verified via regex extract (owner: Economy) |
| C8 | Exclusions + educational disclaimer present | **pass** | disclaimer_ok=True exclusions=7 needed_tokens_ok=True |

## Summary

- Verdict counts: **16 pass / 1 warn / 0 fail** → **PASS**
- Ready / UI recommendation: Orchestrator **may** ship a Time Machine fiscal-drag overlay UI that presents these documented educational examples (with caveats). Do **not** flip Registry Ready for fiscal-drag alone — it extends the already-Ready history package as a documented artefact (`status=documented`, `ready=false`). Warns=1.
- Blockers:
  - None
- Recommended fixes (owner): optional Economy quote-fix for `manifest.yaml` `transformations` (C7b warn); no curated/data changes required for PASS
