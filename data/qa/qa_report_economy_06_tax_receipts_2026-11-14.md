# QA report — Economy 06 tax-receipts (AHHY) · 2026-11-14

## Scope

- Indicator: `tax-receipts` (AHHY / PUSF)
- Handover: `docs/handover-economy-06-tax.md`
- Kickoff: `docs/agent-kickoff-validation-economy-06-tax.md`
- Script: `validation.qa_economy_06_tax_receipts_2026_11_14`
- Vintage: raw `2026-11-14` · ONS release **2026-10-20** (next PSF 20 Nov 2026)

## Independence

Disk raw + curated only. No curated rewrites. Confirms AHHY is public-sector
taxes + NICs (National Accounts / PSF), not HMRC cash receipts.

## Checks

| ID | Check | Result | Notes |
|----|-------|--------|-------|
| C1 | files | **pass** | ahhy_pusf.json |
| C1 | checksum | **pass** | ea9d05903b6d5287 |
| C2 | series_id | **pass** | AHHY |
| C2 | UK £m NSA | **pass** | £ million, NSA (PS taxes + NICs) |
| C3 | AHHY ≠ HMRC cash | **pass** | documented |
| C4 | provisional | **pass** | prov=1 final=353 latest=2026-09-01 |
| C5 | spot 1997-04 | **pass** | got=21096.0 expected=21096.0 |
| C5 | spot 2012-01 | **pass** | got=56444.0 expected=56444.0 |
| C5 | spot 2026-09 | **pass** | got=88127.0 expected=88127.0 |
| C1 | raw==curated tail | **pass** | 88127.0 vs 88127.0 |
| C6 | official_release_date | **pass** | 2026-10-20 |
| C7 | period levels only | **pass** | FYTD not curated as primary |

## Summary

- **Verdict: pass** (12 pass / 0 warn / 0 fail)
- Recommend Orchestrator **Ready** flip + cloud load for `tax-receipts`.
- Re-pin after **20 Nov 2026** PSF.
- Out of scope: tax-type Anatomy, Tax Machine, tax/GDP, frontend.

## Blockers

- None for Ready on AHHY.
