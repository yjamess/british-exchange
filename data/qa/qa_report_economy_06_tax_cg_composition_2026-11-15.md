# QA report — Economy 06 tax-receipts-cg-composition · 2026-11-15

## Scope

- Indicator: `tax-receipts-cg-composition` (NMBY + NMCU + LIQR → MF6P)
- Package: `data/economy/tax-receipts-cg-composition/`
- Cross-check (read-only): Ready `data/economy/tax-receipts-composition/` (series=MF6P)
- Handover: `docs/handover-economy-06-anatomy-cg-drill.md`
- Kickoff: `docs/agent-kickoff-validation-economy-06-anatomy-cg-drill.md`
- Script: `validation.qa_economy_06_tax_cg_composition_2026_11_15`
- Vintage: raw `2026-11-15` · PUSF JSON release **2026-10-20** · Appendix D **2026-10-21**

## Independence

Disk raw + curated only. No curated/raw rewrites. Identity recomputed against
pinned `mf6p_pusf.json` and Ready `tax-receipts-composition` series=MF6P.
Parent AHHY four-head package not edited.

## Checks

| ID | Check | Result | Notes |
|----|-------|--------|-------|
| C-files | package + Ready parent present | **pass** | raw=2026-11-15; parent=tax-receipts-composition |
| C-extra | checksum appendix_d_public_sector_current_receipts.xlsx | **pass** | 7a06b80fb26f2f64… http=200 |
| C-extra | checksum liqr_pusf.json | **pass** | acdaf3c877f36f51… http=200 |
| C-extra | checksum mf6p_pusf.json | **pass** | 87ea045812bf3cc5… http=200 |
| C-extra | checksum nmby_pusf.json | **pass** | 9d8155937473898b… http=200 |
| C-extra | checksum nmcu_pusf.json | **pass** | 6e369dabf20c2b04… http=200 |
| V4 | accruals ≠ HMRC cash documented | **pass** | manifest caveats |
| V4 | sibling under MF6P; parent AHHY not rewritten | **pass** | manifest caveats/definition |
| V5 | no HMRC cash series in package | **pass** | series=['LIQR', 'NMBY', 'NMCU'] |
| V5 | source_register leaves only (MF6P evidence) | **pass** | source_register.csv |
| V5 | no incomplete deeper residual (LIBR/NZGF/CPRN deferred) | **pass** | deferred labelled; not curated |
| V5 | MF6P not curated as leaf (identity evidence only) | **pass** | curated_series=['LIQR', 'NMBY', 'NMCU'] |
| C-extra | provisional = latest valued / leaf | **pass** | LIQR:2026-09; NMBY:2026-09; NMCU:2026-09 |
| C-extra | status counts (1059 final / 3 provisional / 51 missing) | **pass** | final=1059, missing=51, provisional=3 |
| V1 | identity NMBY+NMCU+LIQR=MF6P | **pass** | ok=354 fail=0 incomplete=51 |
| V1 | spot months Jul/Aug/Sep 2026 | **pass** | 2026-07 sum=82634 MF6P=82634 ready=82634 d=0; 2026-08 sum=66630 MF6P=66630 ready=66630 d=0; 2026-09 sum=66282 MF6P=66282 ready=66282 d=0 |
| V1 | identity artefact agrees | **pass** | artefact_ok=354 recomputed=354 |
| V3 | pinned MF6P == Ready tax-receipts-composition MF6P | **pass** | ok=354 mismatches=0 overlap=354 |
| V3 | spot MF6P Ready == pinned | **pass** | 2026-07=82634; 2026-08=66630; 2026-09=66282 |
| V2 | spot NMBY vs PUSF JSON + workbook | **pass** | match |
| V2 | spot NMCU vs PUSF JSON + workbook | **pass** | match |
| V2 | spot LIQR vs PUSF JSON + workbook | **pass** | match |
| V2 | full curated leaves vs PUSF JSON | **pass** | NMBY:match=354 miss=0; NMCU:match=354 miss=0; LIQR:match=354 miss=0 |
| V2 | workbook identity Jul/Aug/Sep | **pass** | 2026-07 d=0; 2026-08 d=0; 2026-09 d=0 |
| V2 | Sep 2026 matches discovery matrix (66,282) | **pass** | sum=66282 MF6P=66282 |

## Identity

- Months with all three leaves + pinned MF6P and exact match (£0.01m): **354**
- Failed identity months: **0**
- Incomplete / skipped overlap months: **51** (early NMBY history before NMCU/LIQR)
- Pinned MF6P vs Ready composition matches: **354** (mismatches=0)
- Spot months independently checked: **2026-07**, **2026-08**, **2026-09**

### Identity spot (≥3 months)

| Period | NMBY | NMCU | LIQR | Sum | MF6P pinned | MF6P Ready | Diff |
|--------|------|------|------|-----|-------------|------------|------|
| 2026-07 | 31,702 | 48,323 | 2,609 | 82,634 | 82,634 | 82,634 | 0 |
| 2026-08 | 30,912 | 33,370 | 2,348 | 66,630 | 66,630 | 66,630 | 0 |
| 2026-09 | 31,454 | 32,087 | 2,741 | 66,282 | 66,282 | 66,282 | 0 |

## Method notes

- Accruals / National Accounts (Appendix D / PSA6D) — **not** HMRC cash.
- Sibling drill under MF6P; Ready `tax-receipts-composition` AHHY four heads untouched.
- MF6P is identity evidence only (not a curated leaf).
- Deeper leaves LIBR / NZGF / CPRN deferred (not half-shipped; no invented residual).
- Observation statuses: final=1059, missing=51, provisional=3.

## Summary

- **Verdict: pass** (25 pass / 0 warn / 0 fail)
- **Ready recommendation: yes**
- Orchestrator may flip registry to Ready + schedule cloud load after PASS.
- Re-pin after **20 Nov 2026** PSF (may revise recent months).
- Out of scope: Anatomy CG UI, HMRC cash stack, second-depth leaves, Notion Ready flip by Validation.

## Blockers

- None for Ready on tax-receipts-cg-composition.
