# QA report — 2026-11-11

**Owner:** Validation · **Domain:** Economy 05 Productivity & Economic Growth  
**Indicator:** `labour-productivity-hours` (LZVA / PRDY)  
**Registry:** [labour-productivity-hours](https://app.notion.com/p/41565471768581e788f5d9373c99e34c)

## Scope

Independent checks only — curated files not rewritten. Companion to Ready `labour-productivity` (LZVB).

## Checks

| ID | Check | Result | Notes |
|----|-------|--------|-------|
| H-sha | Raw JSON sha256 vs Manifest | **pass** | `8b0ea517da669940…` |
| H-n | 221 quarterly observations | **pass** | 1971 Q1 → 2026 Q1 |
| H-status | Latest quarter provisional; older final | **pass** | 220 final / 1 provisional |
| H-live | Curated == live ONS `/timeseries/lzva/prdy/data` | **pass** | 221/221, 0 diffs; release 2026-08-17 |
| H-align | Period set equals `labour-productivity` (LZVB) | **pass** | 221/221 shared quarters |
| H-caveat | Manifest: hours index, not employment; LFS not accredited | **pass** | |
| H-unit | Index 2023=100 SA | **pass** | Matches series title |

**Total:** 7 checks · **FAIL:** 0 · **WARN:** 0

## Method note (Engine)

Index product `hours × output-per-hour / 100` is an Exchange index-space identity check for the two PRDY companions — **not** a claim that it equals Real GDP (ABMI) levels. Decomposition UI must label accounting vs causation.

## Summary

- **Verdict:** **Pass** — recommend Orchestrator → **Ready** + `load_ready --via-rest --only labour-productivity-hours`.
- **Blockers:** none.
- **Open:** re-pin with LZVB after **17 Nov** productivity release (BX-BACK-005).
