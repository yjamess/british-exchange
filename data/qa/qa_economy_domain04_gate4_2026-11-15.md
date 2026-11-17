# QA roll-up — Economy Domain 04 Gate 4 · 2026-11-15

## Scope

Structural Gate 4 (Mode B) for Household Finances only. Does **not** re-run publisher arithmetic. Numeric truth stays in the RHDI report.

- Domain: 04 · Household Finances & Living Standards
- Explorer: `/economy?domain=household`
- Cloud pins: `household-saving-ratio` release **273**, `real-household-disposable-income` **274**, `real-household-disposable-income-per-head` **275** (`store=postgres`)

## Checks

| ID | Check | Result | Notes |
|----|-------|--------|-------|
| V1 | Independent numeric QA vs ONS UKEA | pass | See `qa_report_economy_04_rhdi_2026-11-15.md` — 61 pass / 2 warn / 0 fail |
| V2 | Structural Mode B S1–S27 | pass after fixes | `docs/gate4-audit-household.md` — Ready with fixes |
| V3 | Ready series only on UI + catalogue domain list | pass | DG2R · CRXX · DGD8. Mortgage rate not claimed as Household Ready |
| V4 | Planned Ledger / Cost / Buffer / Debt not marked Ready | pass | EmptyStage + Follow to honest companions |
| C7 | Saving ratio not labelled as Financial Buffer | pass | Carried from RHDI QA; UI Notes match |

## Summary

- **Numeric:** pass (two documented warns: CRXX ESA code not in ONS title; DGD8 title still says £m).
- **Structural:** Ready with fixes shipped 2026-11-15 (catalogue list, Data source foot, EmptyStage honesty, saving-ratio points).
- **Blockers:** none for Gate 4 close on the three living-standards pins.
- **Do not:** flip Ledger / Cost / Buffer / Debt; silent curated edits; work-plan edits from Validation.

## Pointers

- Full sweep table and menu table: `docs/gate4-audit-household.md`
- Numeric spots and vintage: `data/qa/qa_report_economy_04_rhdi_2026-11-15.md`
- Next calendar: UKEA **22 December 2026**
