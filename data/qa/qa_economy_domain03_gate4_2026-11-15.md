# QA report — Economy Domain 03 Gate 4 roll-up · 2026-11-15

## Scope

- Domain: [03 · Employment & Labour Market](https://app.notion.com/p/414654717685813fb55ad2fc81cd4e4f)
- Structural audit: `docs/gate4-audit-employment.md`
- This file rolls up independent Validation already filed; it does not re-ingest or rewrite curated packs.

## Prior Validation (all pass)

| Report | Pass / warn / fail |
|--------|--------------------|
| `qa_report_economy_03_lms_2026-11-14.md` (LF24 · LF2S · LF2G · LF2I · LF2M · LF2Q) | 50 / 0 / 0 |
| `qa_report_economy_03_employment_complete_2026-11-14.md` (reasons · hours · FT/PT · vacancies · DYDC) | 82 / 0 / 0 |
| `qa_report_economy_03_gaps_2026-11-15.md` (JOBS02 · EMP16 · YCCX · LFL8 · LF77) | 24 / 0 / 0 |
| `qa_report_regions_employment_geography_2026-11-15.md` (HI00 × 3) | 59 / 0 / 0 |

## Method checks carried forward

- Counts compose; rates do not share one denominator.
- LF2Q 16–64 ≠ bulletin 16+ headline unemployment.
- Workforce jobs ≠ LFS people; manufacturing linked via Energy, not forked.
- EMP16 cells are people despite thousands banner; LF77 is a percent, not a level.
- HI00 employment 16–64 column fix verified; Claimant ≠ ILO.

## Summary

- **Verdict: pass** for Gate 4 close on the published pin set (ONS LMS / JOBS02 / Vacancy Survey / HI00 vintage **2026-10-19** / **2026-10-20**).
- **Calendar:** re-pin after **17 Nov 2026** LMS (and HI00 companion).
- **UI deferred (not a Validation fail):** underemployment / involuntary part-time on Working Week; EMP04 occupation.

## Blockers

- None for Gate 4 / Ready on ingested series.
