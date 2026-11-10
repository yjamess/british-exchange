# Britain Exchange

UK energy (DESNZ) and economy (ONS) data ingestion with independent validation, a shared observation contract, and a first-proof chart UI.

## Agents

See [AGENTS.md](AGENTS.md). Orchestrator owns the [work plan](docs/work-plan.md).

## Setup

```bash
uv sync
```

Requires Python 3.13+ ([uv](https://docs.astral.sh/uv/)).

## Cloud completeness (Supabase)

**All live data lives on Supabase.** Local `data/` is a cache for connectors and QA — not what production UI depends on.

| Kind | Where |
|------|--------|
| Ready observations | Supabase **Postgres** via FastAPI (`DATABASE_URL`) |
| Heavy curated blobs (atlas, GeoJSON, stations, map packs) | Supabase **Storage** (`bx-data-archive`) |
| Manifests / thin pins / `_archive_index.json` | Laptop only as needed for ingest |

**Live Housing › Renting does not need the PIPR CSV on disk.** Observations are served from Supabase Postgres via FastAPI (`/housing/rent/...`). Pull the curated file only to re-run the connector or reload Postgres, then delete it again.

Energy and Housing explorers load curated packs via FastAPI `GET /packs/{id}` (and `GET /packs/rel/...` for planning plates) — disk or Supabase Storage. See Cloud Completeness in [docs/work-plan.md](docs/work-plan.md).

```bash
# After setting SUPABASE_URL + SUPABASE_ANON_KEY (or SERVICE_ROLE) in .env
uv run python -m britain_exchange.archive_data status
uv run python -m britain_exchange.archive_data push-largest --min-mb 10
uv run python -m britain_exchange.archive_data pull data/housing/private-rental-prices/curated/observations.csv
uv run python -m britain_exchange.load_ready --only private-rental-prices
rm data/housing/private-rental-prices/curated/observations.csv
```

Free-plan objects are capped at 50 MB; the tool gzip-compresses larger files before upload and restores the original checksum on pull.

## Run the first-proof stack

### PostgreSQL observation spine (required for cloud)

Use cloud Supabase Postgres (same project as the archive). Paste the Database URI into `.env` as `DATABASE_URL` (Project Settings → Database), then:

```bash
uv run python -m britain_exchange.load_ready   # migrate + load Ready CSVs
# Or one indicator (needs that curated CSV briefly on disk):
uv run python -m britain_exchange.load_ready --only private-rental-prices
```

Local Homebrew/Docker still works via the URL in `.env.example` / `docker compose up -d`.

Without `DATABASE_URL`, the API serves the same Ready packages from `data/` files.

### Terminals

Terminal 1 — API:

```bash
export DATABASE_URL=postgresql://britain@localhost/britain_exchange   # optional
uv run uvicorn britain_exchange.api:app --reload
# http://127.0.0.1:8000/docs  — /health reports store: postgres|files
```

Terminal 2 — Next.js chart UI:

```bash
cd web
cp -n .env.example .env.local   # if needed
npm install
npm run dev
# http://127.0.0.1:3000       Real GDP
# http://127.0.0.1:3000/energy  Electricity (Gas), aggregates excluded
```

Energy API note: observations exclude `Total*` aggregates by default (`include_aggregates=true` to include).

## Ready indicators (independently re-verified 2026-11-03)

| Indicator | Sector | QA |
|-----------|--------|-----|
| `electricity-generation-by-source` | Energy | [qa_report_2026-11-03.md](data/qa/qa_report_2026-11-03.md) |
| `real-gdp` | Economy | [qa_report_real_gdp_2026-11-03.md](data/qa/qa_report_real_gdp_2026-11-03.md) |

Reproduce ingest / QA / schema:

```bash
uv run python -m energy.connectors.electricity_generation
uv run python -m economy.connectors.real_gdp
uv run python -m britain_exchange.schema_check
uv run python -m validation.qa_energy_et51_2026_11_03
uv run python -m validation.qa_real_gdp_2026_11_03
```

Docs: [connector-contract](docs/connector-contract.md) · [schema-compatibility](docs/schema-compatibility.md) · [work-plan](docs/work-plan.md) · [independent verification](docs/independent-verification-2026-11-03.md)
