# QA report — `nsta-field-production` — 2026-11-07

**Agent:** Validation  
**Overall verdict:** **pass** (sample QA accepted; registry Ready left to Orchestrator)

## Scope

- Indicator: `nsta-field-production` — NSTA UKCS field production (PPRS annual)
- Package: `data/energy/nsta-field-production/`
- Connector: `energy.connectors.nsta_field_production`
- Raw: `raw/2026-11-07/ukcs_pprs_field_production.csv`
- Curated: `curated/annual_by_field.csv`, `curated/observations.csv`

## Freeze

| Item | Value |
|------|-------|
| Claimed SHA-256 | `20a89a123932700bf5351302247751fb05b1855e617570de17137a7fdc781943` |
| Monthly rows | 136 201 |
| Annual field-years | 11 809 |
| Distinct fields | 556 |
| Year span | 1975–2026 |
| National observations | 104 (oil field-sum + gas-to-pipeline field-sum per year) |

## Checks

| ID | Check | Result | Notes |
|----|-------|--------|-------|
| C1 | Freeze — pinned CSV SHA-256 vs manifest | **pass** | Exact match |
| C2 | Aggregate row count — monthly → annual field-years | **pass** | 11 809 |
| C3 | Spot BUZZARD 2024 oil | **pass** | Annual oil tonnes &gt; 0; months present |
| C4 | Honesty — field-sum ≠ DESNZ national | **pass** | Manifest + notes `not_desnz_national=true`; 2024 field-sum oil ≈ 28.4 Mt vs DESNZ crude ~30.7 Mt |
| C5 | Attribution | **pass** | NSTA line in README/manifest |
| C6 | Independence | **pass** | Report under `data/qa/` only |

## Summary

- Pass: **6** · Warn: **0** · Fail: **0** · Blockers: **none**
