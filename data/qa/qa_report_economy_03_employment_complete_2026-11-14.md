# QA report — Economy 03 employment completion · 2026-11-14

## Scope

- Tasks: EC-VAL-03-INAC · EC-VAL-03-HOURS · EC-VAL-03-VAC · EC-VAL-03-JOBS
- Handover: `docs/handover-economy-03-employment-complete.md`
- Script: `validation.qa_economy_03_employment_complete_2026_11_14`
- Vintage: LMS / Vacancy Survey release window **2026-10-19** (next LMS 17 Nov 2026)

## Independence

Disk raw + curated only. No curated rewrites. Confirms six inactivity-reason levels
reconcile to LF2M with a documented residual (discouraged % gap — not invented levels).
FT/PT are 16+ (not 16–64). Vacancies are Vacancy Survey AP2Y. Workforce jobs DYDC is
jobs not people; industry sections remain out of scope.

## Checks

| ID | Check | Result | Notes |
|----|-------|--------|-------|
| C1 | inactivity-reason-students files | **pass** | lf63_lms.json |
| C1 | inactivity-reason-students checksum | **pass** | 3ac42382ac23079e |
| C1 | inactivity-reason-students series | **pass** | LF63 |
| C1 | inactivity-reason-students provisional | **pass** | prov=1 final=399 |
| C1 | inactivity-reason-students spot 2026-07 | **pass** | got=2453.0 expected=2453.0 |
| C1 | inactivity-reason-students raw==curated tail | **pass** | 2453.0 vs 2453.0 |
| C1 | inactivity-reason-students release | **pass** | 2026-10-19 |
| C1 | inactivity-reason-family-home files | **pass** | lf65_lms.json |
| C1 | inactivity-reason-family-home checksum | **pass** | 5e854bf90a360c22 |
| C1 | inactivity-reason-family-home series | **pass** | LF65 |
| C1 | inactivity-reason-family-home provisional | **pass** | prov=1 final=399 |
| C1 | inactivity-reason-family-home spot 2026-07 | **pass** | got=1559.0 expected=1559.0 |
| C1 | inactivity-reason-family-home raw==curated tail | **pass** | 1559.0 vs 1559.0 |
| C1 | inactivity-reason-family-home release | **pass** | 2026-10-19 |
| C1 | inactivity-reason-temp-sick files | **pass** | lf67_lms.json |
| C1 | inactivity-reason-temp-sick checksum | **pass** | 5c500f08b234849a |
| C1 | inactivity-reason-temp-sick series | **pass** | LF67 |
| C1 | inactivity-reason-temp-sick provisional | **pass** | prov=1 final=399 |
| C1 | inactivity-reason-temp-sick spot 2026-07 | **pass** | got=186.0 expected=186.0 |
| C1 | inactivity-reason-temp-sick raw==curated tail | **pass** | 186.0 vs 186.0 |
| C1 | inactivity-reason-temp-sick release | **pass** | 2026-10-19 |
| C1 | inactivity-reason-long-term-sick files | **pass** | lf69_lms.json |
| C1 | inactivity-reason-long-term-sick checksum | **pass** | e1fdfd0b242ea707 |
| C1 | inactivity-reason-long-term-sick series | **pass** | LF69 |
| C1 | inactivity-reason-long-term-sick provisional | **pass** | prov=1 final=399 |
| C1 | inactivity-reason-long-term-sick spot 2026-07 | **pass** | got=2738.0 expected=2738.0 |
| C1 | inactivity-reason-long-term-sick raw==curated tail | **pass** | 2738.0 vs 2738.0 |
| C1 | inactivity-reason-long-term-sick release | **pass** | 2026-10-19 |
| C1 | inactivity-reason-retired files | **pass** | lf6b_lms.json |
| C1 | inactivity-reason-retired checksum | **pass** | bf92445a5190b86a |
| C1 | inactivity-reason-retired series | **pass** | LF6B |
| C1 | inactivity-reason-retired provisional | **pass** | prov=1 final=399 |
| C1 | inactivity-reason-retired spot 2026-07 | **pass** | got=1080.0 expected=1080.0 |
| C1 | inactivity-reason-retired raw==curated tail | **pass** | 1080.0 vs 1080.0 |
| C1 | inactivity-reason-retired release | **pass** | 2026-10-19 |
| C1 | inactivity-reason-other files | **pass** | lf6d_lms.json |
| C1 | inactivity-reason-other checksum | **pass** | dbab33afb2ef718f |
| C1 | inactivity-reason-other series | **pass** | LF6D |
| C1 | inactivity-reason-other provisional | **pass** | prov=1 final=399 |
| C1 | inactivity-reason-other spot 2026-07 | **pass** | got=1044.0 expected=1044.0 |
| C1 | inactivity-reason-other raw==curated tail | **pass** | 1044.0 vs 1044.0 |
| C1 | inactivity-reason-other release | **pass** | 2026-10-19 |
| C2 | LF2M spot | **pass** | got=9091.0 expected=9091.0 |
| C2 | sum reasons ≈ LF2M | **pass** | sum=9060.0 LF2M=9091.0 residual=31.0 |
| C2 | discouraged gap documented | **pass** | reconciliation_notes.md |
| C3 | average-actual-weekly-hours files | **pass** | ybuv_lms.json |
| C3 | average-actual-weekly-hours checksum | **pass** | c921d1f97de50578 |
| C3 | average-actual-weekly-hours series | **pass** | YBUV |
| C3 | average-actual-weekly-hours provisional | **pass** | prov=1 final=411 |
| C3 | average-actual-weekly-hours spot 2026-07 | **pass** | got=32.0 expected=32.0 |
| C3 | average-actual-weekly-hours raw==curated tail | **pass** | 32.0 vs 32.0 |
| C3 | average-actual-weekly-hours release | **pass** | 2026-10-19 |
| C3 | employment-full-time files | **pass** | ycbe_lms.json |
| C3 | employment-full-time checksum | **pass** | e8b68981c90f7c66 |
| C3 | employment-full-time series | **pass** | YCBE |
| C3 | employment-full-time provisional | **pass** | prov=1 final=411 |
| C3 | employment-full-time spot 2026-07 | **pass** | got=25865.0 expected=25865.0 |
| C3 | employment-full-time raw==curated tail | **pass** | 25865.0 vs 25865.0 |
| C3 | employment-full-time release | **pass** | 2026-10-19 |
| C3 | employment-part-time files | **pass** | ycbh_lms.json |
| C3 | employment-part-time checksum | **pass** | fb011e818a984cc5 |
| C3 | employment-part-time series | **pass** | YCBH |
| C3 | employment-part-time provisional | **pass** | prov=1 final=411 |
| C3 | employment-part-time spot 2026-07 | **pass** | got=8713.0 expected=8713.0 |
| C3 | employment-part-time raw==curated tail | **pass** | 8713.0 vs 8713.0 |
| C3 | employment-part-time release | **pass** | 2026-10-19 |
| C4 | uk-vacancies files | **pass** | ap2y_lms.json |
| C4 | uk-vacancies checksum | **pass** | 325f20bd13f1c65d |
| C4 | uk-vacancies series | **pass** | AP2Y |
| C4 | uk-vacancies provisional | **pass** | prov=1 final=303 |
| C4 | uk-vacancies spot 2026-08 | **pass** | got=691.0 expected=691.0 |
| C4 | uk-vacancies raw==curated tail | **pass** | 691.0 vs 691.0 |
| C4 | uk-vacancies release | **pass** | 2026-10-19 |
| C5 | workforce-jobs files | **pass** | dydc_lms.json |
| C5 | workforce-jobs checksum | **pass** | 03d34d073c6b5bcd |
| C5 | workforce-jobs series | **pass** | DYDC |
| C5 | workforce-jobs provisional | **pass** | prov=1 final=268 |
| C5 | workforce-jobs spot 2026-04 | **pass** | got=36734.0 expected=36734.0 |
| C5 | workforce-jobs raw==curated tail | **pass** | 36734.0 vs 36734.0 |
| C5 | workforce-jobs release | **pass** | 2026-10-19 |
| C3 | employment-full-time 16+ labelled | **pass** | age basis in manifest |
| C3 | employment-part-time 16+ labelled | **pass** | age basis in manifest |

## Summary

- **Verdict: pass** (82 pass / 0 warn / 0 fail)
- Recommend Orchestrator **Ready** flip + cloud load for all eleven series.
- Out of scope / Blocked: discouraged levels · JOBS02 industry · underemployment · geography atlas.
- Re-pin after **17 Nov 2026** LMS.

## Blockers

- None for Ready on the eleven Validation-ready packs.
