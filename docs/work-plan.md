# British Exchange — Work plan

**Orchestrator:** this chat  
**Notion:** [British Exchange](https://app.notion.com/p/406654717685802987ffce671c6844e8)  
**Status:** P0 verification complete — packaging for GitHub  
**Updated:** 2026-11-03 (Europe/London)

## Assessment response (user priorities)

| Priority | Action | Status |
|----------|--------|--------|
| P0 | Hand-offs in shared repo | Staging for GitHub commit/PR |
| P0 | Execute ingest + QA locally | **Done** — both pass-with-warns; see `docs/independent-verification-2026-11-03.md` |
| P0 | Review shared observation schema | **Done** — `schema_check` 0 fail; `docs/schema-compatibility.md` |
| P0 | Explicit energy aggregation rules | **Done** — `aggregation.py`; API excludes Total* by default |
| P1 | GDP revision metadata | **Done** — `revision_notes` filled + exposed on API |
| P1 | Integrate one dataset via FastAPI | **Done** — both Ready packages served file-backed |

## Ready packages

| Indicator | Rows | QA |
|-----------|------|-----|
| `electricity-generation-by-source` | 1710 (1482 chart-safe) | `data/qa/qa_report_2026-11-03.md` |
| `real-gdp` | 286 | `data/qa/qa_report_real_gdp_2026-11-03.md` |

## Do not yet

- Commission more sector agents / 20 datasets
- Treat as production until GitHub review + one chart UI

## Next after GitHub

- PostgreSQL persistence
- Next.js chart + source panel against `/indicators/{id}/observations`
