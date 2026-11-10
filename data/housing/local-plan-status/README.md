# Local plan status — England

**Status: Validation.** Feeds Housing Domain 06 › Planning decisions › Local plans (`pm=plans`). Indicator `local-plan-status` (Postgres) + summary pack `housing.local-plan-status` (Storage).

## Source

- Planning Data `local-plan` bulk CSV — https://files.planning.data.gov.uk/dataset/local-plan.csv
- Planning Data `organisation` register — https://files.planning.data.gov.uk/organisation-collection/dataset/organisation.csv
- Licence: OGL v3.0 · pinned 2026-11-10 (raw in `bx-data-archive`)

## Reproduce

```sh
uv run python -m britain_exchange.archive_data pull data/housing/local-plan-status   # if re-running from pins
uv run python -m housing.connectors.local_plans
uv run python -m britain_exchange.load_ready --only local-plan-status
uv run python -m britain_exchange.archive_data push data/housing/local-plan-status
```

## Rules

- Denominator: current LPAs in the organisation register (310: councils, national parks, development corporations).
- Adopted plan = stage `adopted`, or blank stage with an `adopted-date`. Date = `adopted-date`, else `start-date`.
- Joint plans count for every member; their `required-housing` is never attributed to one council.
- Blank stages stay missing. Plan status, not site allocations.
