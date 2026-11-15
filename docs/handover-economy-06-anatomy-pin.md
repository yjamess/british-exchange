# Handover — Economy Domain 06 · Anatomy of Revenue **pin** (EC-G2-06B-PIN)

**Author:** Economy domain subagent · **Date:** 2026-11-15  
**Notion plan:** [06 · Taxation & Revenue](https://app.notion.com/p/414654717685816bb414e87ccbd501fc)  
**Kickoff:** [agent-kickoff-economy-06-anatomy-pin.md](agent-kickoff-economy-06-anatomy-pin.md)  
**Discovery:** [economy-06-anatomy-source-matrix.md](economy-06-anatomy-source-matrix.md) · [handover-economy-06-anatomy.md](handover-economy-06-anatomy.md)  
**Registry:** [Tax receipts composition (Anatomy under AHHY)](https://app.notion.com/p/419654717685818dac2bc06033d4a01c) — Status **Validation**

> **Status:** Component pin complete. Economy self-QA **pass**. **Not Ready** until independent Validation `EC-VAL-06B` PASS. No frontend this pass.

## Verdict (return to Orchestrator)

| Field | Value |
|-------|--------|
| **Indicator id** | `tax-receipts-composition` |
| **Identity** | `MF6P + AIIH + NMHM + AHGR = AHHY` |
| **Self-QA** | **pass** — 345 months exact (£0.01m); spot Jul/Aug/Sep 2026 |
| **AHGR source** | Appendix D Time Series column (PUSF `/data` **404** probed + pinned) |
| **AHHY total** | Ready `tax-receipts` read-only cross-check — **not forked** |
| **Next** | Schedule Validation **`EC-VAL-06B`**; UI stays EmptyStage until PASS |

### Identity spot (≥3 months)

| Period | MF6P | AIIH | NMHM | AHGR | Sum | AHHY (`tax-receipts`) | Diff |
|--------|------|------|------|------|-----|------------------------|------|
| 2026-07-01 | 82,634 | 16,678 | 4,494 | −65 | 103,741 | 103,741 | 0 |
| 2026-08-01 | 66,630 | 17,567 | 4,494 | −65 | 88,626 | 88,626 | 0 |
| 2026-09-01 | 66,282 | 17,414 | 4,494 | −63 | 88,127 | 88,127 | 0 |

Full check artefact: `data/economy/tax-receipts-composition/curated/anatomy_identity_check.json`  
(`months_checked_ok=345`, `n_failed=0`, `months_skipped_incomplete=60` — early months where not all four heads + AHHY overlap).

## Row counts

| Series | Curated rows | Source |
|--------|--------------|--------|
| MF6P | 354 | PUSF `/data` JSON |
| AIIH | 405 | PUSF `/data` JSON |
| NMHM | 405 | PUSF `/data` JSON |
| AHGR | 345 | Appendix D Time Series |
| **Total curated** | **1,509** | (includes 51 missing cells from longer PUSF histories) |

Statuses: **1,454 final + 4 provisional + 51 missing**. Provisional = latest valued month **per series** only (all four: 2026-09).

## Paths written

```txt
src/economy/connectors/tax_receipts_composition.py
data/economy/tax-receipts-composition/
  manifest.yaml
  source_register.csv
  README.md
  validation_report.md
  raw/2026-11-15/
    ahgr_pusf_probe.json          # HTTP 404 evidence
    appendix_d_public_sector_current_receipts.xlsx
    mf6p_pusf.json
    aiih_pusf.json
    nmhm_pusf.json
  curated/
    observations.csv
    anatomy_identity_check.json
docs/handover-economy-06-anatomy-pin.md   # this file
```

### Raw checksums (2026-11-15 pin)

| File | SHA-256 (prefix) | HTTP |
|------|------------------|------|
| `ahgr_pusf_probe.json` | `a7a1297a75c6…` | 404 |
| `appendix_d_…xlsx` | `7a06b80fb26f…` | 200 |
| `mf6p_pusf.json` | `87ea045812bf…` | 200 |
| `aiih_pusf.json` | `4bcf79500e3f…` | 200 |
| `nmhm_pusf.json` | `6ee71d11bd5a…` | 200 |

Official release dates on JSON: **2026-10-20**. Appendix D workbook landing: **21 Oct 2026**. Next PSF: **20 Nov 2026**.

## AHGR sourcing note

- Live PUSF URL `…/timeseries/ahgr/pusf/data` returns **404** (probed at pin; body recorded in `ahgr_pusf_probe.json`).
- AHGR values curated from ONS Appendix D **Time Series** sheet column `AHGR` (*Other local government taxes*).
- This is the **published** ONS series in the workbook — **not** an Exchange-invented residual `AHHY − (MF6P+AIIH+NMHM)`.
- Connector refuses to ship if AHGR `/data` suddenly returns 200 without a code change (forces intentional switch to JSON).

## Self-QA summary

| Check | Result |
|-------|--------|
| Identity on ≥3 months | **pass** (345 months) |
| Sep 2026 matches discovery kickoff | **pass** (88,127) |
| Provisional latest only | **pass** (4 provisional = one per CDID) |
| AHHY not forked | **pass** (reads Ready `tax-receipts`) |
| No HMRC cash / no JW2O as total | **pass** |
| Silent residual | **not used** |

Reproduce:

```bash
uv run python -m economy.connectors.tax_receipts_composition
```

## Validation ask — `EC-VAL-06B`

Independent Validation should file under `data/qa/` and **not** silently rewrite Economy curated data.

| Check | Expectation |
|-------|-------------|
| **V1** | Identity `MF6P + AIIH + NMHM + AHGR = AHHY` on ≥3 months (+ optional 1 FYTD column from Appendix D Table sheet) |
| **V2** | Curated MF6P / AIIH / NMHM equal live PUSF `/data` and Appendix D Time Series for spot months; AHGR equals workbook column |
| **V3** | Manifest caveats: accruals ≠ HMRC cash; total is AHHY not JW2O |
| **V4** | No HMRC cash series in this package |
| **V5** | AHGR handling documented (workbook + 404 probe; not a silent residual) |

**Out of scope until PASS:** Registry Ready; Anatomy frontend; HMRC cash stack; JW2O; CG drill LIBR/NZGF/CPRN (optional second wave).

## Blockers for Validation

| Item | Severity |
|------|----------|
| Independent `EC-VAL-06B` not yet run | Process (expected) |
| AHGR still workbook-only until ONS publishes `/data` | Minor — documented |
| Next PSF **20 Nov 2026** may revise recent months | Timing — re-pin after release |
| Cloud load / Supabase push for UI | Orchestrator after Ready |

## Notion

- Registry row created at **Validation**: https://app.notion.com/p/419654717685818dac2bc06033d4a01c  
- Domain 06 plan updated: pin complete; EmptyStage remains until Validation PASS + G3 UI task.
