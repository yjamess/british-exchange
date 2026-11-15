# QA report — Validation — gva-by-industry-section — 2026-11-14

Independent pass (Validation skill). Does **not** re-ingest as the primary path; freezes Economy raw pin and re-parses.

## Scope

- Economy: `data/economy/gva-by-industry-section/`
- Raw: `raw/2026-11-14/gdplowlevelaggregates.xlsx`
- Source: ONS GDP(O) low-level aggregates · release 2026-11-12

## Checks

| ID | Check | Result | Notes |
|----|-------|--------|-------|
| V1 | Raw checksum vs manifest | **pass** | SHA-256 `0de14b31c32033e9…` matches |
| V2 | Official release date | **pass** | 2026-11-12 |
| V3 | SIC sections A–T present | **pass** | 20 sections + total on sheet 1 |
| V4 | Current-price additivity 2026 Q3 | **pass** | Total 726 868 · sum A–T 726 869 (≤ £1) |
| V5 | UK geography / SA / £m | **pass** | Manifest + workbook Cover_sheet |
| V6 | CVM vs CP honesty | **pass** | Caveats forbid additive CVM shares |
| V7 | No Energy L4NT fork | **pass** | Separate indicator; Manufacturing CP share ~8.4% ≠ CVM weight |
| V8 | Cloud load | **pass** | Prior release 230; notes schema refresh reloaded after Validation |

## Summary

- **Verdict:** **Pass** → recommend Orchestrator **Ready**
- **Blockers:** none
- **Recommended next:** Ready flip; Growth › Anatomy UI (current-price RankBars)
