# QA report — 2026-11-11

**Owner:** Validation · **Domain:** Economy 01 Inflation & Prices  
**Indicator:** `everyday-basket-average-prices` (Category1 expand)  
**Kickoff:** `docs/agent-kickoff-validation-economy-01-basket-expand.md`

## Scope

- Economy basket expand: Food and drink (+ establishments), Household items, Services, Health, Transport
- Independent checks only — curated files not rewritten

## Checks

| ID | Check | Result | Notes |
|----|-------|--------|-------|
| B-sha | xlsx sha256 vs Manifest | **pass** | `7bd852b570ab3946…` matches disk |
| B-caveat | Manifest: in development + ends 2025-01 | **pass** | caveats + revision_notes |
| B-cat | Exactly six Category1 values; 0 Clothing / Recreation | **pass** | Food and drink 156 · establishments 33 · Household items 75 · Services 30 · Health 16 · Transport 16 |
| B-dim | Distinct `category=` / `item_id` = 326 | **pass** | matches `items.json` |
| B-override | Original 10 slugs still present | **pass** | white-sliced-bread … restaurant-coffee |
| B-status | All observation_status = final | **pass** | frozen adhoc archive |
| B-span | 2018-01 → 2025-01; 26 306 rows | **pass** | up from 802 (10-item pin) |
| B-items | `items.json` count == observation categories | **pass** | 326 / 326 |
| B-spot-food | Avocados × 3 months vs xlsx | **pass** | 2018-01, 2022-06, 2025-01 |
| B-spot-hh | A4 printer paper × 3 months vs xlsx | **pass** | Household items |
| B-spot-health | Cold/flu drink powder sachets × 3 months | **pass** | Health |
| B-spot-transport | Adult bike × 3 months vs xlsx | **pass** | Transport |
| B-spot-legacy | Bananas + white sliced bread × 3 months | **pass** | prior Ready sample |

**Total:** 13 checks · **FAIL:** 0 · **WARN:** 0

## Summary

- **Verdict:** **Pass** — recommend Orchestrator keep **Ready** and reload Supabase for `everyday-basket-average-prices`.
- **Blockers:** none.
- **Caveats to keep on UI / registry:** official statistics in development; pin ends Jan 2025; never present as a shop shelf price; Clothing and Recreation deliberately out of this pin.
- **Open (not blockers):** post-2025 live average-price download; petrol not in this ONS file; Everyday basket search UI (owner).
- **Recommended next (Orchestrator):** `load_ready --via-rest --only everyday-basket-average-prices`; update work-plan EC-01-BASKET-X.
