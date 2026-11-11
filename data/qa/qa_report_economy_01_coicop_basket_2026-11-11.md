# QA report — 2026-11-11

**Owner:** Validation · **Domain:** Economy 01 Inflation & Prices  
**Kickoff:** `docs/agent-kickoff-validation-economy-01-coicop-basket.md`  
**CDID map:** `docs/economy-01-coicop-cdid-map.md`

## Scope

- Economy COICOP: twelve `cpih-inflation-*` division annual rates (L55P–L55Z, L562)
- Economy basket: `everyday-basket-average-prices` (ONS shopping-prices adhoc xlsx)

No curated files were rewritten.

## Checks

| ID | Check | Result | Notes |
|----|-------|--------|-------|
| A-int-* | Integrity all 12 (n=453, 1989-01→2026-09, UK, 0 dups) | **pass** | All twelve |
| A-title-L55P/V/562 | Live ONS title is CPIH annual rate | **pass** | Not CPI; not index |
| A-live-L55P/V/562 | Curated == live ONS months | **pass** | 453/453, 0 diffs; release 2026-10-20 |
| A-sha-L55P/V/562 | Raw sha256 vs manifest | **pass** | |
| B-sha | xlsx checksum vs manifest | **pass** | `7bd852b570ab3946…` |
| B-caveat | Manifest: in development + ends 2025-01 | **pass** | |
| B-dim | Exactly 10 locked basket categories | **pass** | |
| B-spot | Bananas + white bread × 3 months vs xlsx | **pass** | 2018-01, 2022-06, 2025-01 |
| B-span | 802 rows, 2018-01→2025-01 | **pass** | |

**Total:** 26 checks · **FAIL:** 0 · **WARN:** 0

## Summary

- **Verdict:** **Pass** — recommend Orchestrator → **Ready** for the twelve COICOP indicators and `everyday-basket-average-prices`.
- **Blockers:** none.
- **Caveats to keep on UI / registry:** basket prices are official statistics in development; pin ends Jan 2025; never present as a shop shelf price; do not mix CPI with CPIH category rates.
- **Open (not blockers):** post-2025 live average-price download; petrol not in this ONS file.
- **Recommended next (Orchestrator):** registry Ready flip; `load_ready --via-rest`; Categories / Everyday basket editorial UI (owner).
