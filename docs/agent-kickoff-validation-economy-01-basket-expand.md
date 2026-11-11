# Validation kickoff — Economy 01 · Everyday basket Category1 expand

**Owner:** Validation · **Date:** 2026-11-11  
**Domain:** [01 · Inflation & Prices](https://app.notion.com/p/41465471768581d09883c708f8f5f27c)  
**Prior:** [agent-kickoff-validation-economy-01-coicop-basket.md](agent-kickoff-validation-economy-01-coicop-basket.md) (10-item pin)

## Scope

Independent QA only — do **not** rewrite curated files. File findings under `data/qa/`.

### Everyday basket average prices (expanded)

Allowlist Category1: Food and drink · Food and drink establishments · Household items · Services · Health · Transport (~326 items).

| Check | How |
|-------|-----|
| Checksum | `ons_shopping_prices_pre2025.xlsx` sha256 vs manifest |
| Filter | Notes / `items.json` Category1 only in allowlist; **0** Clothing or Recreation |
| Dimensions | ~326 distinct `category=` / `item_id`; original 10 slugs present |
| Catalogue | `curated/items.json` count matches observation categories |
| Sample | ≥4 items × 3 months vs xlsx `averageprice` (Food, Household, Health, Transport) + bananas / white bread |
| Caveats | Manifest: official statistics in development + ends 2025-01 |

Entrypoint (Economy, re-run only if Validation asks): `uv run python -m economy.connectors.everyday_basket`

## Out of scope

- Everyday basket search / UI wiring
- Clothing and footwear · Recreation and culture
- Cloud `load_ready` (Orchestrator after pass)

## Done means

QA report under `data/qa/` with pass/fail; Orchestrator reloads cloud after Ready.
