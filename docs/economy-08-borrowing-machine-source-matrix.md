# Source matrix — Domain 08 Borrowing Machine reconciliation (evidence)

**Date:** 2026-11-14  
**Owner:** Economy (discovery) · Validation (independent QA after pin)  
**Decision context:** Option 1 — Borrowing Machine UI stays conceptual. This matrix is evidence only.  
**Rejected path (preserved):** [qa_report_economy_08_borrowing_machine_2026-11-14.md](../data/qa/qa_report_economy_08_borrowing_machine_2026-11-14.md) — PSNB (DZLS) ↛ PSND (HF6W).

## Official publications

| Source | URL | Release used | Licence | What it provides |
|--------|-----|--------------|---------|------------------|
| Public sector finances tables 1–10: **Appendix A** | https://www.ons.gov.uk/economy/governmentpublicsectorandtaxes/publicsectorfinance/datasets/publicsectorfinancesappendixatables110/current | 21 Oct 2026 (next 20 Nov 2026) | OGL v3.0 | Sheet **REC3**: CG net cash requirement ↔ change in CG net debt, with named adjustment columns + CDIDs |
| Appendix A file (pinned) | `/file?uri=…/publicsectorfinancessummarytablesappendixafinal.xlsx` | same | OGL v3.0 | Workbook snapshot |
| Public sector net cash requirement: **Appendix S** | https://www.ons.gov.uk/economy/governmentpublicsectorandtaxes/publicsectorfinance/datasets/financialstatisticsforpublicsector/current | 21 Oct 2026 | OGL v3.0 | Sub-sector cash requirement / debt components (context; not the REC3 identity) |
| PSF methodological guide | https://www.ons.gov.uk/economy/governmentpublicsectorandtaxes/publicsectorfinance/methodologies/monthlystatisticsonthepublicsectorfinancesamethodologicalguide | — | OGL v3.0 | Explains PSNB vs PSNCR (timing + financial transactions) |
| PSF QMI | https://www.ons.gov.uk/economy/governmentpublicsectorandtaxes/publicsectorfinance/methodologies/publicsectorfinancesandgovernmentdeficitanddebtunderthemaastrichttreatyqmi | — | OGL v3.0 | PSNCR close but not identical to Δ debt |
| FOI-2026-3439 | https://www.ons.gov.uk/aboutus/transparencyandgovernance/freedomofinformationfoi/publicsectorreceiptsexpenditurenetborrowingandnetdebt | 31 Mar 2026 | — | ONS: **no** PSNB↔PSND reconciliation; points to REC3 for CG cash↔CG debt |

## What REC3 actually reconciles

**Title (sheet REC3):** *Reconciliation of central government net cash requirement and changes in net debt, UK, not seasonally adjusted.*

| Side | Meaning | Sector | CDID |
|------|---------|--------|------|
| Left (flow) | CG net cash requirement **excluding** NRAM/B&B and Network Rail | **Central government** (narrowed) | **M98R** |
| Middle | Named gilt / reserves / reclassification / other adjustments | Central government | LSIW, MW7L, E3VL, E3VM, N42A, E3VX, N42C, N42E, N42F, E3VY, E3VZ, N42H |
| Right (stock change) | Changes in central government net debt (same exclusions) | **Central government** (narrowed) | **MW4W** |

**Published identity (exact on Appendix A sample years/FYs checked 2026-11-14):**

`M98R + LSIW + MW7L + E3VL + E3VM + N42A + E3VX + N42C + N42E + N42F + E3VY + E3VZ + N42H = MW4W`

Diff on calendar 2021, 2023 and FY 2021/22, 2023/24: **£0.0 million**.

### What it is **not**

| Claim | Verdict |
|-------|---------|
| Public-sector net borrowing (DZLS) explains Δ public-sector net debt (HF6W) | **Rejected** (prior QA) |
| REC3 is a public-sector PSNB→PSND bridge | **False** — CG cash / CG Δdebt only |
| RUUW (CG NCR, broader) or RURQ (PS NCR) is the REC3 left-hand side | **False** — REC3 uses **M98R** (ex NRAM/B&B/Network Rail) |
| Sum of named adjustments is an unexplained residual to invent | **False** — each column is a published series |

## REC3 component register (provisional IDs)

Canonical owner: **Economy**. Do not duplicate HF6W / DZLS. Package proposed: `cg-cash-debt-reconciliation` (multi-series; `series=<CDID>`).

| Role | Provisional series key | CDID | ONS title (live `/data` 2026-11-14) | Unit | Freq | Valued months |
|------|------------------------|------|--------------------------------------|------|------|---------------|
| Cash requirement (LHS) | `cgncr-ex-ukar-nr` | M98R | CG: Net cash requirement (exc NRAM and B&B, Network Rail) | £m NSA | monthly | 510 |
| Adj · gilt premia/discounts | `adj-gilt-premia` | LSIW | Net premia/discounts of gilt issuances | £m | monthly | 390 |
| Adj · index-linked uplift | `adj-il-gilt-uplift` | MW7L | CG: Gross Index-linked gilt capital uplift | £m | monthly | 549 |
| Adj · other gilt | `adj-other-gilt` | E3VL | CG: Reconciliation adjustments: Other gilt related | £m | monthly | 354 |
| Adj · reclass / imputed | `adj-reclass-imputed` | E3VM | CG: Reconciliation adjustments: Reclassification & imputed liabilities | £m | monthly | 354 |
| Adj · official reserves | `adj-official-reserves` | N42A | CG: Reconciliation adjustments: Official reserves | £m | monthly | 354 |
| Adj · SDR reserves | `adj-reserves-sdr` | E3VX | CG: Reconciliation adjustments: Official reserves SDRs | £m | monthly | 354 |
| Adj · national savings | `adj-national-savings` | N42C | CG: Reconciliation adjustments: National savings | £m | monthly | 354 |
| Adj · DMA | `adj-debt-management-account` | N42E | CG: Reconciliation adjustments: Debt management account | £m | monthly | 354 |
| Adj · FX reval | `adj-foreign-currency` | N42F | CG: Reconciliation adjustments: Foreign currency | £m | monthly | 354 |
| Adj · other sterling debt | `adj-other-sterling-debt` | E3VY | CG: Reconciliation adjustments: Other sterling debt | £m | monthly | 354 |
| Adj · other liquid assets | `adj-other-liquid-assets` | E3VZ | CG: Reconciliation adjustments: Other liquid assets | £m | monthly | 354 |
| Adj · other | `adj-other` | N42H | CG: Reconciliation adjustments: Other | £m | monthly | 354 |
| Δ CG net debt (RHS) | `cg-change-in-net-debt-ex-ukar-nr` | MW4W | CG: Changes in net debt (exc NRAM and B&B, Network Rail) | £m NSA | monthly | 354 |

### Related (context only — not REC3 identity)

| Series | CDID | Why listed |
|--------|------|------------|
| CG net cash requirement (broader) | RUUW | Bulletin headline CGNCR; **not** M98R |
| PS net cash requirement | RURQ | Public-sector cash; **not** PSND change; **not** REC3 |
| PS net debt ex banks (stock) | HF6W | Existing Ready — different sector / concept |
| PS net borrowing ex banks | DZLS | Existing Ready — accruals deficit, not cash |

## Coverage honesty

- REC3 is a **complete named bridge** for its own identity (CGNCR ex UKAR/NR + named adjustments = Δ CG net debt ex UKAR/NR) on **annual and financial-year** rows (exact £0 on samples).
- **Monthly** REC3 rows in the official workbook do **not** all balance before **2000-04** (36 months with ~£40–£220m gaps in the Oct 2026 file). From 2000-04 onward, curated monthly identity passes (317 months). Treat pre-2000-04 monthly as incomplete official history, not a connector bug.
- It does **not** close the public-sector borrowing→debt gap. That remains Blocked for a “Borrowing Machine” labelled as PSNB/PSND.
- Bank of England / APF effects on **PSND** sit outside this CG table (see Appendix A PSA9* / FOI notes).
- Latest PSF vintage in live timeseries: **2026-10-20**; re-pin after **2026-11-20**.

## Local pin (2026-11-14)

| Artefact | Path |
|----------|------|
| Package | `data/economy/cg-cash-debt-reconciliation/` |
| Connector | `src/economy/connectors/cg_cash_debt_reconciliation.py` |
| Reproduce | `uv run python -m economy.connectors.cg_cash_debt_reconciliation` |
| Identity self-check | `curated/rec3_identity_check.json` (`pass=true` from 2000-04) |
| Observations | 5343 rows (14 CDIDs × months) |

**Not Ready for UI.** Needs independent Validation + Orchestrator ID approval before cloud load / explorer use.

## Decision gate (plain English)

| Outcome | Status after this matrix |
|---------|--------------------------|
| No compatible official bridge | Not this case — REC3 exists |
| Verified official **central-government** cash/debt reconciliation only | **Selected** — may plan a **separately named** CG cash/debt instrument later; never call it public-sector Borrowing Machine |
| Verified matching public-sector cash/debt bridge | **Not found** in REC3 / FOI answer |
| Full public-sector borrowing→debt decomposition | **Not found** — keep conceptual Machine |

See [economy-08-borrowing-machine-decision-memo.md](economy-08-borrowing-machine-decision-memo.md).
