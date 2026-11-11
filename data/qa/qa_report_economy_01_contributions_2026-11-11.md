# QA report — 2026-11-11

**Owner:** Validation (Orchestrator-run sample) · **Domain:** Economy 01 Inflation & Prices  
**CDID map:** `docs/economy-01-coicop-cdid-map.md` (contributions section)

## Scope

- Twelve `cpih-contribution-*` pins (L5H5–L5HG) — CPIH COICOP division contributions to the all-items annual rate (percentage points)
- Rounding effect L5GO not ingested

No curated files were rewritten after ingest.

## Checks

| ID | Check | Result | Notes |
|----|-------|--------|-------|
| C-int-* | Integrity all 12 (n=165, 2013-01→2026-09, UK, latest month provisional) | **pass** | 164 final / 1 provisional each |
| C-sum | Aug 2026 sum of divisions vs headline `cpih-inflation` | **pass** | 3.28pp vs 3.3% (residual 0.02pp) |
| C-family | Titles are CPIH contributions, not rates / not CPI | **pass** | ONS titles verified at ingest |

**Total:** 14 checks · **FAIL:** 0 · **WARN:** 0

## Summary

- **Verdict:** **Pass** — Ready for UI (Categories contributions RankBars).
- **Caveats:** Contributions ≠ division annual rates; residual rounding exists (L5GO); CPIH only.
