# QA report — Economy Domain 08 CG cash ↔ debt (Appendix A REC3) — 2026-11-14

**Agent:** Validation  
**Overall verdict:** **pass** (0 fail; 0 warn)  
**Package:** `cg-cash-debt-reconciliation`  
**Script:** `src/validation/qa_economy_08_cg_cash_debt_rec3_2026_11_14.py`  
**Independence:** Did not import Economy connectors; did not edit `data/economy/`.

## Scope

| Field | Value |
|-------|--------|
| Claim under test | ONS Appendix A **REC3**: CG net cash requirement (M98R) + named adjustments = change in CG net debt (MW4W) |
| Sector | **Central government** (ex NRAM/B&B, Network Rail) |
| Unit | £ million, NSA |
| Not claimed | Public-sector PSNB (DZLS) → PSND (HF6W) — already **fail** in `qa_report_economy_08_borrowing_machine_2026-11-14.md` |
| Product | Evidence for a future **separately named** CG cash/debt instrument; public-sector Borrowing Machine stays conceptual (Option 1) |

## Freeze

- Manifest: `data/economy/cg-cash-debt-reconciliation/manifest.yaml`
- Raw: Appendix A xlsx + 14 PUSF CDID JSON under `raw/2026-11-14/`
- Curated: `curated/observations.csv` (5343 rows)
- Official release on CDID pins: **2026-10-20** (next PSF 20 Nov 2026)

## Checks

| ID | Check | Result | Notes |
|----|-------|--------|-------|
| C1 | Disk SHA-256 = manifest for all 15 raw files | **pass** | Including Appendix A `394cd461…792c43` |
| C2 | Live ONS `/data` SHA-256 = pin (14 CDIDs) | **pass** | Byte-identical; pins current until 20 Nov |
| C3 | Independent re-parse of every `months` row vs curated | **pass** | All 14 CDIDs: 0 value diffs, 0 only-curated, 0 only-raw |
| C4 | REC3 identity from curated (final, full coverage) | **pass** | **317** months OK from **2000-04**; 0 fails from trust date; 36 pre-trust gaps (also in official workbook); ~196 incomplete months skipped |
| C5 | Appendix A sample annual/FY rows | **pass** | 2021, 2023, FY 2021/22, FY 2023/24: diff **£0.0m** |
| C6 | Scope honesty in manifest / notes | **pass** | CG cash/debt; HF6W/DZLS related only, not duplicated |
| C7 | No silent rewrite | **pass** | Validation read-only |

### Identity detail (curated)

| Band | Months |
|------|--------|
| Balanced (trust window) | 317 |
| Official pre-2000-04 monthly gaps | 36 |
| Incomplete component coverage (skipped) | 196 |
| Failures from 2000-04 onward | **0** |

### Appendix A samples

| Period | Sum (LHS+adj) £m | MW4W £m | Diff |
|--------|------------------|---------|------|
| 2021 | 141 789 | 141 789 | 0 |
| 2023 | 208 519 | 208 519 | 0 |
| Apr 2021–Mar 2022 | 123 105 | 123 105 | 0 |
| Apr 2023–Mar 2024 | 196 600 | 196 600 | 0 |

## Method notes (for Ready / UI later)

1. **Monthly trust from 2000-04-01.** Earlier monthly REC3 rows do not balance in the ONS workbook itself; annual/FY still do.
2. **Do not** chart this as public-sector borrowing explaining public-sector debt.
3. Re-pin after PSF **20 Nov 2026**; re-run this script before Ready cloud load if release advances.

## Summary

- **Blockers:** none for evidence **Ready** (Validation sense).
- **Orchestrator:** create/update Dataset Registry row for `cg-cash-debt-reconciliation`; approve stable ID; Storage/Postgres load when you want cloud completeness; **no** numeric public-sector Borrowing Machine UI.
- **Economy:** optional follow-up — document pre-2000-04 monthly caveat in explorer Notes if/when a CG cash/debt view ships.

## Reproduce

```bash
PYTHONPATH=src uv run python -m validation.qa_economy_08_cg_cash_debt_rec3_2026_11_14
```
