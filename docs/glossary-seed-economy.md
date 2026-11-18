# Economy glossary · 17 November 2026

Owner: Orchestrator. Shared registry pin: `data/glossary/terms.yaml`.

49 new definitions derived from the ten live economy domains: prices, earnings,
workforce, household finances, growth, tax, spending, debt, trade and policy.
Definitions are kept below 240 characters for the existing Term popover. Official
publisher links accompany every new row. Existing shared terms and household
survey definitions are reused rather than duplicated.

Each economy canvas passes domain terms to its existing FigureRecord Notes panel,
which links to the searchable shared `/glossary` page. Existing household LCF,
income-fifths and WAS references remain in their original panels. No new visual
components, palettes or local-file production fallback are introduced.

Reproduce validation: `uv run python -m britain_exchange.glossary --check` and
`uv run pytest tests/test_glossary.py`. Publish via
`uv run python -m britain_exchange.glossary`, then verify Postgres through
`britain_exchange.glossary.list_terms` with the Postgres store configured.
