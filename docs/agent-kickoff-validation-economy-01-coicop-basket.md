# Validation kickoff — Economy 01 · COICOP + everyday basket

**Owner:** Validation · **Date:** 2026-11-11  
**Domain:** [01 · Inflation & Prices](https://app.notion.com/p/41465471768581d09883c708f8f5f27c)  
**CDID map:** [economy-01-coicop-cdid-map.md](economy-01-coicop-cdid-map.md)

## Scope

Independent QA only — do **not** rewrite curated files. File findings under `data/qa/`.

### A — CPIH COICOP division annual rates (12 series)

| Check | How |
|-------|-----|
| Live ONS match | Fetch `/timeseries/<cdid>/mm23/data` for **L55P**, **L55V**, **L562**; compare all months to curated |
| Counts | Expect 453 months, 1989-01 → 2026-09, release 2026-10-20 |
| Labels | Confirm titles are CPIH annual rates (not CPI, not indexes) |
| Integrity | 0 duplicate period_starts per indicator; no invented values |

Entrypoint: `uv run python -m economy.connectors.cpih_coicop_divisions` (re-run only if Validation asks Economy to refresh).

### B — Everyday basket average prices

**Superseded 2026-11-11** by Category1 expand — see [agent-kickoff-validation-economy-01-basket-expand.md](agent-kickoff-validation-economy-01-basket-expand.md) and QA `data/qa/qa_report_everyday_basket_expand_2026-11-11.md`.

| Check | How |
|-------|-----|
| Checksum | `ons_shopping_prices_pre2025.xlsx` sha256 vs manifest |
| Sample | For bananas (212719) and white sliced bread (210111), spot-check 3 months vs xlsx `averageprice` sheet |
| Dimensions | Notes carry `category=<slug>`; original 10 `BASKET_ITEMS` slug overrides plus Category1 allowlist (~326) |
| Caveats | Confirm Manifest states official statistics in development + ends 2025-01 |

Entrypoint: `uv run python -m economy.connectors.everyday_basket`

## Out of scope

- Contributions (pp) / basket weights
- CPI division rates (reference only in CDID map)
- Editorial Categories / Everyday basket UI (user-owned after Ready)
- Cloud `load_ready` (Orchestrator after Ready)

## Done means

QA reports under `data/qa/` with pass/fail; registry Status stays Validation until Orchestrator flips Ready.
