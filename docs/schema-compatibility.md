# Shared observation schema — cross-sector check

**Purpose:** Sector ownership is fine; types must stay compatible before more agents.

## Contract

Both Energy and Economy curated CSVs must use `britain_exchange.observation.CURATED_FIELDNAMES`:

| Column | Type / rule |
|--------|-------------|
| `indicator_id` | kebab-case string |
| `period_start` / `period_end` | ISO date `YYYY-MM-DD` |
| `geography_code` | ONS code; UK = `K02000001` |
| `geography_label` | human label |
| `value` | float or empty (→ null) |
| `unit` | declared in manifest |
| `observation_status` | `final` \| `provisional` \| `estimated` \| `suppressed` \| `missing` |
| `source_version` | publisher release / file id |
| `notes` | free text; Energy fuels use `fuel=<Label>`; Postgres also dictionaries notes via `observation_note` + `identity_hash` (see `docs/audit-observation-storage-uniqueness.md`) |

## Energy aggregation (mandatory)

| Role | Fuels |
|------|--------|
| **component** (chart-safe) | Coal, Oil, Gas, Nuclear, Hydro, Onshore/Offshore wind, Solar, Bioenergy, … |
| **aggregate** (do not stack-sum) | `Total wind`, `Total all generating companies` |

API: `GET /observations?include_aggregates=false` (default).  
Code: `britain_exchange.aggregation`.

## Verify locally

```bash
uv run python -m britain_exchange.schema_check
uv run python -m validation.qa_energy_et51_2026_11_03
uv run python -m validation.qa_real_gdp_2026_11_03
```
