# Corporate-owned titles (CCOD / OCOD)

HM Land Registry monthly counts of registered titles in England and Wales held by UK companies (`ccod`) and overseas companies (`ocod`). Aggregates only — no title numbers, addresses or company names leave the connector.

Indicator: `corporate-owned-titles`  
Connector: `uv run python -m housing.connectors.corporate_ownership`  
Env: `HMLR_API_KEY` (Use land and property data account; licence accepted)

## Monthly refresh cadence (runbook)

Land Registry publishes each month in the first working days. The API serves **only the current month**, so each run **appends** that month to the curated CSV. Pull the archive first or earlier months are lost.

```bash
# 1. Restore history from Supabase Storage (required before every refresh)
uv run python -m britain_exchange.archive_data pull data/housing/corporate-owned-titles

# 2. Fetch the current month, count titles, append curated CSV + update manifest
uv run python -m housing.connectors.corporate_ownership

# 3. Load Ready series into Postgres
uv run python -m britain_exchange.load_ready --only corporate-owned-titles

# 4. Push curated + manifest back to Storage
uv run python -m britain_exchange.archive_data push data/housing/corporate-owned-titles
```

Raw zips are streamed through a temporary folder and deleted (CCOD unzipped is about 1.6 GB). Checksums and retrieval times stay in `manifest.yaml`.

There is **no cron in this repo**. Cadence is: when Land Registry posts the month, run the four steps above (or schedule them outside the tree). Kickoff notes: [docs/agent-kickoff-ownership.md](../../../docs/agent-kickoff-ownership.md).

## Do not

- Replace the curated CSV without pulling first.
- Keep raw CCOD/OCOD zips in `data/`.
- Emit title, address or proprietor name columns.
