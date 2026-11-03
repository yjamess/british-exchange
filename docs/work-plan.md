# British Exchange — Work plan

**Orchestrator:** this chat  
**Notion:** [British Exchange](https://app.notion.com/p/406654717685802987ffce671c6844e8)  
**Status:** P0 chart UI wired to FastAPI — workflow proof nearly closed  
**Updated:** 2026-11-03 (Europe/London)

## Current review

| Area | State |
|------|--------|
| Energy + Economy Ready packages | In GitHub + local |
| Independent ingest/QA | Done |
| Shared schema + aggregation rules | Done |
| FastAPI file-backed | Done (+ CORS for web) |
| Next.js chart + source panel | **Done (P0)** — `/` Real GDP, `/energy` Gas |

## P0 chart slice

- `web/` Next.js app reads `NEXT_PUBLIC_API_URL` (default `http://127.0.0.1:8000`)
- Home: Real GDP line chart + source/revision panel
- `/energy`: ET 5.1 Gas series; API keeps `include_aggregates=false`

## Still not production

- No PostgreSQL yet
- No polished multi-fuel stacked chart
- Do not open more sector agents until this path is used in review

## Next (P1)

1. Persist Ready observations to PostgreSQL; point FastAPI at DB
2. Harden energy UI (fuel picker) without allowing Total* in stacks
3. Only then assign the next registry indicator
