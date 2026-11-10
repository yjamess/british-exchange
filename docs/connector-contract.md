# Shared connector + manifest contract (T02)

**Owner:** Orchestrator  
**Package:** `britain_exchange` (`src/britain_exchange/`)  
**Status:** v1.0 — required before Energy/Economy mark anything Ready

## Why this exists

Notion requires every sector agent to return the same hand-off shape. Agents must **import** this package instead of inventing parallel JSON/YAML layouts.

## Install / run

```bash
uv sync
uv run python -c "from britain_exchange import Manifest; print('ok')"
```

## Layout per indicator

```txt
data/<sector>/<indicator_id>/
  manifest.yaml
  source_register.csv          # optional inventory while scoping
  raw/<retrieved-date>/...     # immutable snapshots
  curated/observations.csv
  README.md                    # human notes, open questions
src/<sector>/connectors/<name>.py   # subclass of Connector
```

`<sector>` folders: `energy`, `economy`, `housing`, `people`, `government`, `infrastructure`, `regions`, `history`.

## Manifest required fields

| Field | Meaning |
|-------|---------|
| `indicator_id` | Stable kebab id (matches folder name) |
| `title` | Registry display name |
| `sector` | e.g. `energy-industry` |
| `publisher` | DESNZ, ONS, … |
| `source_url` | Canonical landing or download URL |
| `series_id` | Publisher table/series code |
| `geography` | UK / GB / England + codes |
| `frequency` | annual / quarterly / monthly / … |
| `unit` | e.g. TWh, index 2019=100 |
| `definition` | What the number measures |
| `licence` | e.g. OGL v3.0 |
| `agent_owner` | `energy` or `economy` |
| `connector_module` | Import path of the connector |
| `curated_path` | Relative path to curated CSV |
| `update_cadence` | How often to re-fetch |
| `raw_evidence[]` | path, retrieved_at, checksum_sha256, … |

Optional but expected before Ready: `transformations`, `revision_notes`, `caveats`, `related_indicator_ids`, `open_questions`, `notion_registry_url`.

Load/save with `load_manifest` / `save_manifest`.

## Curated CSV columns

Fixed header from `Observation`:

`indicator_id, period_start, period_end, geography_code, geography_label, value, unit, observation_status, source_version, notes`

### Typed dimensions (required for breakdowns)

Free-text `notes` alone is not a structural key. Put breakdowns in parseable `key=value; …` form so loaders populate Postgres columns / API `dimensions`:

| Dimension | Notes convention | Examples |
|-----------|------------------|----------|
| Fuel | `fuel=<Label>` | `fuel=Gas` |
| Water company | `company=<CODE>; company_name=<Name>` | Ofwat APR3A_02 |
| Demographic | `sex=` / `demographic=` / `tenure=` | `sex=female` |
| Series | `series=<id>` | multi-series packs |
| Category | `band=` / `vehicle=` / `classification=` / `kind=` | industrial price bands |

API filters: `fuel`, `water_company`, `demographic`, `geography_code`, `series`, `category`.  
Postgres load preserves prior `data_release` rows; only the matching release’s observations are replaced; `is_current` selects the default series.

### Observation identity (Postgres)

Loaders also store notes in `observation_note` and set `observation.identity_hash` (SHA-256 of release + period + geography + promoted dims + note text, joined with `U+001F`). See `docs/audit-observation-storage-uniqueness.md`. Curated CSV shape is unchanged.

## Connector API

Subclass `britain_exchange.Connector`:

1. Implement `indicator_id`, `build_manifest()`, `transform()`
2. Use `fetch_url(url, relative_raw_path)` for downloads (checksummed)
3. Call `write_hand_off(evidence, observations)` to emit manifest + curated CSV

## Status hand-off

1. Scoping/Sourcing → fill Notion registry fields  
2. Ingesting → raw + curated + manifest on disk  
3. Hand to Validation → `data/qa/` report  
4. Ready only after Validation pass  

Do not edit another agent's `data/` tree.
