# Decision memo — Borrowing Machine reconciliation (2026-11-14)

**Question:** Is there an official bridge that lets us ship a numeric “opening debt → borrowing → closing debt” Borrowing Machine for public-sector net debt?

**Product lock:** Option 1 — UI stays **conceptual**. Evidence work must not invent a residual series.

## Three results (keep separate)

| ID | Claim | Result |
|----|-------|--------|
| (a) | `sum(DZLS) ≈ ΔHF6W` (PSNB → PSND) | **Rejected** — material residuals; QA `data/qa/qa_report_economy_08_borrowing_machine_2026-11-14.md` |
| (b) | Official **cash requirement → debt change** bridge | **Found** — ONS Appendix A **REC3**: CG NCR (M98R) + named adjustments = change in CG net debt (MW4W). Exact £0 identity on sample years/FYs in the Oct 2026 workbook |
| (c) | Full public-sector PSNB → PSND decomposition with named official components | **Not found** — ONS FOI-2026-3439 states they do not reconcile borrowing with public-sector net debt |

## Gate choice

**Compatible official central-government cash/debt bridge only.**

- May later plan a **separately named** instrument (e.g. “Central government cash and debt change”), after G2 pin + independent Validation + G3 approval.
- Must **not** label that instrument the public-sector Borrowing Machine, or imply PSNB explains PSND.
- Public-sector Borrowing Machine tab: **keep conceptual EmptyStage**.

## What evidence does / does not establish

**Does establish**

- ONS publishes a complete, named CG reconciliation (REC3) with CDIDs for every column.
- Live PUSF timeseries exist for all 14 REC3 CDIDs (release 2026-10-20).
- Appendix A arithmetic for REC3 closes exactly on checked annual and financial-year rows.

**Does not establish**

- That monthly borrowing (DZLS) plus “other” equals the change in HF6W.
- That M98R/MW4W can be mixed on the same chart as HF6W/DZLS without a scope warning (CG ≠ public sector; cash ≠ accruals; exclusions differ).
- That a numeric public-sector Borrowing Machine is Ready.

## Next work (data only)

1. Pin Appendix A workbook + REC3 CDID JSON under `data/economy/cg-cash-debt-reconciliation/`.
2. Reproducible connector; curated multi-series (`series=<CDID>`).
3. Independent Validation: reproduce REC3 identity from curated monthly rows; compare to Appendix A.
4. Re-pin after PSF **20 Nov 2026**.
5. Orchestrator: no numeric Machine UI until gate (c) or an explicitly renamed CG product is approved.

## Parallel (do not conflate)

Debt Anatomy / Who Owns the Debt / Repayment Calendar = separate DMO/ONS liabilities prompt — not this bridge.
