# QA report — Economy 07 total-managed-expenditure (EBFT) · 2026-11-14

## Scope

- Indicator: `total-managed-expenditure` (EBFT / PUSF)
- Handover: `docs/handover-economy-07-spending.md`
- Script: `validation.qa_economy_07_tme_2026_11_14`
- Vintage: raw `2026-11-14` · ONS release **2026-10-20** (next PSF 20 Nov 2026)

## Independence

Disk raw + curated only. No curated rewrites. Confirms EBFT is ONS Public Sector
Finances Total Managed Expenditure (£m NSA), not departmental OSCAR outturn or
PESA TES/COFOG function shares.

## Checks

| ID | Check | Result | Notes |
|----|-------|--------|-------|
| C1 | files | **pass** | ebft_pusf.json |
| C1 | checksum | **pass** | 2669443f7b262618 |
| C2 | series_id | **pass** | EBFT |
| C2 | UK £m NSA | **pass** | £ million, NSA |
| C3 | TME ≠ services / OSCAR | **pass** | documented |
| C3 | no residual identity claim | **pass** | caveats link tax/borrowing without closed identity |
| C4 | provisional | **pass** | prov=1 final=353 latest=2026-09-01 |
| C5 | spot 1997-04 | **pass** | got=26918.0 expected=26918.0 |
| C5 | spot 2012-01 | **pass** | got=66277.0 expected=66277.0 |
| C5 | spot 2026-08 | **pass** | got=116488.0 expected=116488.0 |
| C5 | spot 2026-09 | **pass** | got=123791.0 expected=123791.0 |
| C2 | raw title TME | **pass** | PS: Total managed expenditure: £m CPNSA |
| C1 | raw==curated tail | **pass** | 123791.0 vs 123791.0 |
| C5 | raw↔curated spots | **pass** | 4 spots |
| C6 | official_release_date | **pass** | 2026-10-20 |
| C7 | period levels only | **pass** | FYTD not curated as primary |
| C8 | no invented function series | **pass** | related are fiscal links only |

## Summary

- **Verdict: pass** (17 pass / 0 warn / 0 fail)
- Recommend Orchestrator **Ready** flip + cloud load for `total-managed-expenditure`.
- Re-pin after **20 Nov 2026** PSF.
- Out of scope: OSCAR/COFOG ingest, DEL/AME series, real-terms, frontend.

## Blockers

- None for Ready on EBFT.
