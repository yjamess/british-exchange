# QA roll-up — Economy Domain 04 Gate 4 deepen · 2026-11-15

## Scope

Structural Gate 4 **re-check** (Mode B) after Cost · Ledger · Buffer · Debt UI. Does **not** re-run publisher arithmetic. Numeric truth stays in the three Validation reports.

- Domain: 04 · Household Finances & Living Standards
- Explorer: `/economy?domain=household` (better-off · saving · ledger · cost · buffer · debt · data)
- Cloud current releases: DGD8 **273**, DG2R **274**, CRXX **275**, BoE **276**, WAS **277**, LCF category **278**, LCF income **279**; ETB companion **263** (Tax-owned, loaded for Ledger / Data)

## Checks

| ID | Check | Result | Notes |
|----|-------|--------|-------|
| V1 | Independent numeric QA | pass | RHDI 61/2/0 · LCF `qa_report_economy_04_lcf_2026-11-15.md` · Buffer/Debt `qa_report_economy_04_buffer_debt_2026-11-15.md` |
| V2 | Structural Mode B S1–S27 | pass after fixes | `docs/gate4-audit-household-deepen.md` — Ready with fixes |
| V3 | Catalogue vs loaders | pass | Household rail = RHDI, RHDI per person, DGD8, LCF category, LCF income, WAS, BoE. No mortgage rate, no Housing property/MLAR. ETB not on the rail |
| V4 | Ledger not a reconciled budget | pass after fixes | Notes + Follow + Data ETB title; source names both publications |
| V5 | Cost ≠ CPI basket | pass | Notes + Follow to Inflation |
| V6 | Buffer ≠ DGD8; WAS suspended; GB ≠ UK | pass after fixes | Notes + figure note + Data status |
| V7 | Debt ≠ mortgage burden; excl. SLC | pass after fixes | Notes + Follow to Housing mortgages + Data title |
| S17 | Cloud Ready | pass | Observation counts match current Postgres releases |

## Summary

- **Numeric:** pass (RHDI two documented warns only).
- **Structural:** Ready with fixes shipped 2026-11-15 (source feet, Data method/tables/status, Cost empty, WAS accreditation label, Follow tests).
- **Blockers:** none for Gate 4 close on the deepened Household Explorer.
- **Do not:** silent curated edits; work-plan edits from this audit; fork Housing property wealth or MLAR under Economy.

## Pointers

- Full sweep table and menu table: `docs/gate4-audit-household-deepen.md`
- Prior living-standards Gate 4: `docs/gate4-audit-household.md`
- Numeric: `qa_report_economy_04_rhdi_2026-11-15.md` · `qa_report_economy_04_lcf_2026-11-15.md` · `qa_report_economy_04_buffer_debt_2026-11-15.md`
- Next calendar: UKEA **22 December 2026**
