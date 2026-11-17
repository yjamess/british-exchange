# QA report — Economy Domain 10 Economic Policy · 2026-11-17

**Owner:** Validation (scheduled by Orchestrator 10)  
**Inputs frozen:** `data/economy/economic-policy/events.json` · `pledges.json` · packs `economy.policy-events` · `economy.policy-pledges` (Storage re-pushed same day)  
**Loader:** `britain_exchange.policy_event.load_policy_registry` · tests `tests/test_economy_policy_events.py` + `tests/test_policy_events.py` (32 passed)

## Scope

- Economy policy register dates, commencements, cross-register `dossier.related`, Budget OBR `financial[]`, pledge scoring honesty.
- Not in scope: UI Gate 4 shell audit; Domain 09; causal claims.

## Checks

| ID | Check | Result | Notes |
|----|-------|--------|-------|
| C1 | Loader + unit tests | **pass** | 26 events · 5 eras · 15 relationships; 32 tests green |
| C2 | BoE Act 1946 assent | **pass** | legislation.gov.uk introduction: 14 February 1946 |
| C3 | BoE Act 1946 appointed day | **warn** | Register: 1 March 1946 via BoE Annual Report 1947 + DMO. SR&O 1946/237 not on legislation.gov.uk in this pass — honesty note already on the commencement row |
| C4 | WRA 2012 assent | **pass** | legislation.gov.uk: 8 March 2012 |
| C5 | WRA under-occupancy commencement | **pass** | SI 2012/3040 regs 3(2)(a), 4(2)(a), 5 and 6 in force 1 April 2013; instrument cites WRA s. 69 |
| C6 | Interim OBR start | **pass** | GOV.UK HMT notice 17 May 2010: established on an interim basis that day |
| C7 | 1992 inflation objective | **pass** | BoE QB Summer 2005 dates 8 Oct 1992; Hansard Autumn Statement 12 Nov 1992 restates 1–4% RPIX |
| C8 | UC GB full-service availability | **pass** | DWP page update 12 Dec 2018: available everywhere in Great Britain — register does **not** claim managed-migration completion |
| C9 | Autumn Budget 2024 mark + OBR financial | **pass** | OBR EFO page dated 30 Oct 2024; employer NICs £25.7bn by 2029-30 and borrowing impact language match EFO executive summary text used at ingest |
| C10 | Autumn Budget 2025 mark + OBR financial | **pass** | Start 26 Nov 2025; £26bn tax / £9bn welfare figures match EFO Nov 2025 executive summary text used at ingest |
| C11 | Cross-register related ids | **pass** | All Housing (`housing-act-1996`, `localism-act-2011`) and Energy (`energy-act-2023`, `climate-change-act-2008`, `modern-industrial-strategy-2025`) ids resolve; no copied foreign event bodies |
| C12 | Pledges unscored + no PSNFL conflation | **pass** | 4 pledges, all `scorable: false`; PSNFL pledge refuses net-debt stand-in; inflation points at symmetric-rule doc |
| C13 | HMT / LPC month-only starts | **warn** | `hm-treasury` 1612-06-01 and `low-pay-commission` 1997-07-01 use first-of-month convention with explicit `date_note` — acceptable under source standards; day not claimed |

## Summary

- **Verdict:** **PASS** (with warns)
- **Blockers:** none for Gate 3/4 structural work
- **Recommended fixes (owner):** optional — if SR&O 1946/237 is later found on a stable official host, add that URL beside the BoE/DMO citations; no silent date rewrite required now
- **Independence note:** Validation did not edit register JSON. Orchestrator authored the deepen pass earlier the same day; checks were against primary/official URLs and the frozen file.

## Hand-off

Orchestrator 10 may proceed to Gate 3 (only if UI needs catalogue-depth polish) and Gate 4 Mode B. Do not mark Domain 10 complete until Gate 4 is filed.
