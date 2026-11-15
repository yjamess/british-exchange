# QA report — gva-by-industry-section — 2026-11-14

## Scope

- Economy: `gva-by-industry-section` (ONS GDP(O) low-level aggregates)
- Source: [GDP output approach – low-level aggregates](https://www.ons.gov.uk/economy/grossdomesticproductgdp/datasets/ukgdpolowlevelaggregates/current) · file `gdplowlevelaggregates2026q3.xlsx` · release **2026-11-12**
- Connector: `economy.connectors.gva_by_industry_section`
- UI: **not** in scope (Anatomy waits on Orchestrator Review Gate)

## Checks

| ID | Check | Result | Notes |
|----|-------|--------|-------|
| C1 | Raw pin + checksum | pass | `raw/2026-11-14/gdplowlevelaggregates.xlsx` SHA-256 `0de14b31c320…` |
| C2 | Official release | pass | Manifest `official_release_date: 2026-11-12` |
| C3 | Sections A–T + total | pass | 21 series × 2 kinds; `curated/sections.json` |
| C4 | Current-price additivity (2026 Q3) | pass | Total 726 868 · sum A–T 726 869 (rounding £1) · ratio ≈ 1.000 |
| C5 | Manufacturing share vs Energy L4NT | warn | CP share C ≈ **8.4%** of Total GVA — not comparable to Energy `manufacturing-share-of-gva` (L4NT CVM weight %). Link, do not equate. |
| C6 | Latest quarter provisional only | pass | 42 provisional rows · period `2026-07-01` only |
| C7 | Cloud load | pass | `load_ready --via-rest` → release_id=**230** · 7098 obs |
| C8 | Storage archive | pass | curated CSV + sections.json + raw xlsx in `bx-data-archive` |
| C9 | CVM honesty | pass | Caveat on manifest: do not treat CVM section £m shares as additive for composition |

## Summary

- **Verdict:** **Pass** — Validation-ready for registry; Ready for UI only after Orchestrator Anatomy G3
- **Blockers:** none for ingest
- **Recommended next:** Notion registry row → Validation status; Orchestrator wires Anatomy when Wave A polish allows
