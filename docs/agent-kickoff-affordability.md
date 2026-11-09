# Kickoff — Housing Domain 03 Affordability

**Brief:** [Affordability](https://app.notion.com/p/40e654717685817cb98bdec53c60b676)  
**Question:** Who can actually afford to live in Britain?  
**Owner:** Orchestrator (UI + scenario engine); Housing agent only for new registry rows; Validation after ingest.

## Non-negotiables

- Reuse house prices (Domain 01) and rents (Domain 02) — no duplicate connectors.
- Visible labels: **OFFICIAL** (published ratios) · **DERIVED** (Exchange formulas on official inputs) · **ILLUSTRATIVE** (user scenario).
- Never present the experiment as mortgage eligibility or financial advice.
- Workplace vs residence earnings, personal vs household income, England vs UK — never mix silently.

## Already Ready

| Indicator | Geography | Use |
|-----------|-----------|-----|
| `house-price-to-earnings-ratio` | England (`E92000001`) workplace median | Official reference strip + Ratio view |

## Shipped

1. **Experiment** (default): earnings / deposit / rate / term / LTI; annuity math; deposit|loan instrument; OFFICIAL / DERIVED / ILLUSTRATIVE; assumptions panel; URL `earn/dep/rate/term/lti`.
2. **Map:** `afford-atlas.json` from AFF1 Tables 1c + 5c (England & Wales LAs; Scotland/NI blank by publisher).
3. **Ratio** · **Table** unchanged (England official series).

## Later

- Richer cost-of-a-home instrument; deposit-over-time / household comparisons with registered sources (ASHE, BoE rates, EHS/DWP, etc.).
