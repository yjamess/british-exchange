# QA report — ASHE regional earnings (Geography of Pay) — 2026-11-11

**Agent:** Validation (Orchestrator-run sample)  
**Overall verdict:** **pass**

| Indicator | Verdict | Ready recommendation |
|-----------|---------|----------------------|
| `ashe-regional-earnings` | **pass** | **Ready** for Wages › Geography of pay (2026 provisional pin) |

## Scope

- Pack: `data/economy/ashe-regional-earnings/`
- Raw: `raw/2026-11-11/ashetable72026provisional.zip`
- SHA-256: `f468a8056faa9ea83ed712eeacd067e19ed49fe72d53516f6fea8b496b7e4f87`
- Connector: `economy.connectors.ashe_regional_earnings`
- Landing: https://www.ons.gov.uk/employmentandlabourmarket/peopleinwork/earningsandworkinghours/datasets/placeofworkbylocalauthorityashetable7
- Edition: **2026 provisional** (released 22 Oct 2026)
- Curated: **788** observations (All + Full-Time × geography medians)

## Checks

| ID | Check | Result | Notes |
|----|-------|--------|-------|
| A1 | Zip SHA matches pin | **pass** | See Freeze |
| A2 | Table 7.1a Weekly pay — Gross parsed | **pass** | All + Full-Time sheets |
| A3 | Spot vs workbook | **pass** | Full-Time UK **£811.2**; London (E12000007) **£1038.1**; North East **£722.7** |
| A4 | Classification | **pass** | 9 English regions · 7 nations/aggregates · LAs + counties retained |
| A5 | Basis honesty | **pass** | `basis=workplace` in notes; Table 8 residence not ingested |
| A6 | No manufacturing fork | **pass** | Energy Table 4 untouched; related ids link only |
| A7 | Cloud load | **pass** | `load_ready --via-rest` → release_id=**218** |

## Summary

- Blockers: none
- Re-pin when ONS publishes **2026 revised** (expected autumn 2027) or after any Table 7 correction.
- UI: `/economy?domain=wages&view=geography` — RegionMap English regions + RankBars (+ nations); Coverage All / Full-Time; workplace ≠ residence in Notes.
