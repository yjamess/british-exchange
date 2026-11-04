# British Exchange — Work plan

## Sector art direction · second pass · 2026-11-04

1. **Orchestrator — in progress:** Replace the overly restrained first pass with Observatory-inspired intaglio, expressive display typography, ASCII postcard motifs and strong changes of surface. Keep established topic and data interactions.
2. **Orchestrator — pending:** Update shared specimens and verify responsive composition, pointer/keyboard controls and compilation.

## Sector design regeneration · first pass · 2026-11-04

1. **Orchestrator — complete:** Replace the housing design-lab composition and typography with a coherent sector system. Scope: sector navigation, topic panels, statistical figures, comparisons and restrained penwork; homepage deferred.
2. **Orchestrator — complete:** Extract reusable sector tokens, chapter headings, metric navigation, controls and accessible chart presentation under `web/src/brand/sector/`. Preserve canonical housing data and coverage.
3. **Orchestrator — complete:** Verify populated topic views, geography selection, keyboard controls, narrow-screen layout and TypeScript compilation. Document the adopted visual rules.

**Orchestrator:** this chat  
**Notion:** [British Exchange](https://app.notion.com/p/406654717685802987ffce671c6844e8)  
**Status:** Housing sector experience in progress (Notion §1–6)
**Updated:** 2026-11-03 (Housing Overview + Explore + HPI measures)

## Sector pages (UI)

- Owner: Orchestrator (Next.js)
- Status: in_progress
- Approach: one shared sector skeleton + sector-specific modules (not eight templates)
- Branding: field `#00103D`, cream reading panels, red accent, Caslon / Source Sans 3 / IBM Plex Mono; ASCII as `hint` only
- **Housing & Land (first fully realised sector):**
  - Shipped: `/housing` on **design-lab/observatory** language (Stamp terraces, Ascii dissolve, condensed type, ink/paper bezel) — not the old sector navy shell
  - Overview (four questions, standout HPI explorer) · regional compare · `/housing/data/[id]` profiles
  - Data: `uk-hpi-measures` from pinned UK HPI file
  - Next: completions-by-tenure · LT120 · deeper imprint polish · Atlas later
- Then: Economy, Energy, remaining sectors
- Homepage: deferred (designed last)
- Do not block on unnamed future ASCII libraries

### Review — Housing experience kickoff
- **Shipped:** Question-led landing; HPI measure explorer; regional compare; dataset profiles; condensed chart captions/source panels (earlier)
- **Blocked:** Postgres re-load of `uk-hpi-measures` if `DATABASE_URL` is set (file store works now)
- **Next:** Promote LT213 tenure + wire design-lab imprint into landing polish

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
