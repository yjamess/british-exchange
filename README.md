# Britain Exchange

UK energy (DESNZ) and economy (ONS) data ingestion with independent validation, a shared observation contract, and a first-proof chart UI.

## Agents

See [AGENTS.md](AGENTS.md). Orchestrator owns the [work plan](docs/work-plan.md).

## Setup

```bash
uv sync
```

Requires Python 3.13+ ([uv](https://docs.astral.sh/uv/)).

## Cloud archive (laptop storage)

Bulky `data/**/raw` and large curated blobs live in Supabase Storage (`bx-data-archive`). The laptop keeps manifests, thin energy curated files the UI reads from disk, and `data/_archive_index.json`.

```bash
# After setting SUPABASE_URL + SUPABASE_ANON_KEY (or SERVICE_ROLE) in .env
uv run python -m britain_exchange.archive_data status
uv run python -m britain_exchange.archive_data push-largest --min-mb 10
uv run python -m britain_exchange.archive_data pull data/housing/price-paid-2025
```

Free-plan objects are capped at 50 MB; the tool gzip-compresses larger files before upload and restores the original checksum on pull.

## Run the first-proof stack

### Optional: PostgreSQL observation spine (Layer B)

Prefer cloud Supabase Postgres (same project as the archive). Paste the Database URI into `.env` as `DATABASE_URL` (Project Settings → Database), then:

```bash
uv run python -m britain_exchange.load_ready   # migrate + load Ready CSVs
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
