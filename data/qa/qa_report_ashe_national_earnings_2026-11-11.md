# QA report — ASHE national earnings (Wage ladder) — 2026-11-11

**Agent:** Validation (Orchestrator-run sample)  
**Overall verdict:** **pass**

| Indicator | Verdict | Ready recommendation |
|-----------|---------|----------------------|
| `ashe-national-earnings` | **pass** | **Ready** for Wages › Wage ladder (2026 provisional pin) |

## Scope

- Pack: `data/economy/ashe-national-earnings/`
- Raw: `raw/2026-11-11/ashetable12026provisional.zip`
- SHA-256: `b0143def67e3863a34421608608f63b77b7eebd8fbbd5f2109d6811eb184351d`
- Connector: `economy.connectors.ashe_national_earnings`
- Landing: https://www.ons.gov.uk/employmentandlabourmarket/peopleinwork/earningsandworkinghours/datasets/allemployeesashetable1
- Edition: **2026 provisional** (released 22 Oct 2026)
- Curated: 24 observations (All + Full-Time × median/mean/p10–p90)

## Checks

| ID | Check | Result | Notes |
|----|-------|--------|-------|
| A1 | Zip SHA matches pin | **pass** | See Freeze |
| A2 | Table 1.1a Weekly pay — Gross parsed | **pass** | All + Full-Time sheets |
| A3 | Spot vs workbook | **pass** | All median **£673.1**; Full-Time median **£811.2**; All p10 **£230.0**; All p90 **£1433.5**; All mean **£806.1** |
| A4 | Percentile set | **pass** | p10,20,25,30,40,60,70,75,80,90 + median + mean per sheet |
| A5 | No manufacturing fork | **pass** | Separate indicator; Energy Table 4 untouched |
| A6 | Geography / concept honesty | **pass** | UK employee jobs; gross weekly; edition provisional in notes |
| A7 | Cloud load | **pass** | `load_ready --via-rest` → release_id=217 |

## Summary

- Blockers: none
- Re-pin when ONS publishes **2026 revised** (expected autumn 2027) or after any Table 1 correction.
- UI: `/economy?domain=wages&view=ladder` — RankBars percentiles; mean as reference line; Coverage All / Full-Time.
