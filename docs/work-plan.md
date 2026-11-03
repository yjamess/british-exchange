# British Exchange — Work plan

**Orchestrator:** this chat  
**Notion:** [British Exchange](https://app.notion.com/p/406654717685802987ffce671c6844e8)  
**Status:** Pre-merge hardening on `cursor/first-proof-chart-ui` — **48 Ready**, **0 Blocked**, **0 Inbox**  
**Updated:** 2026-11-03 (release history + typed dimensions + chart contract)

## Registry / Postgres

| Status | Count |
|--------|------:|
| Ready (in Postgres) | 48 |
| Blocked | 0 |
| Inbox | 0 |

Water interruptions unblocked with user-supplied `WCPR 2024-25 Open Data.xlsx` (168 company×year rows).

## Y1 labour/prices (just completed)

| indicator_id | series | rows |
|---|---|---:|
| cpi-inflation | D7G7 / MM23 | 453 |
| real-gdp-per-head | IHXW / PN2 | 322 |
| labour-productivity | LZVB / PRDY | 221 |
| employment-rate | LF24 / LMS | 666 |
| economic-inactivity-rate | LF2S / LMS | 666 |
| real-earnings | A2FC / EMP | 320 |

QA: `data/qa/qa_report_economy_y1_labour_prices_2026-11-03.md` (pass)

## Review

Notion Ready + API `/indicators` (48 series). Full catalogue cleared.

### Pre-merge P0/P1 (this branch)

- Owner: Orchestrator
- Status: done (awaiting human merge approval — do not auto-merge)
- Shipped: release-preserving load (`is_current`), typed dimensions, API filters, Ofwat company-only guard, frequency-aware chart contract, catalogue refresh, tests + PG reload + Next build
- Next: human review / PR approval only
