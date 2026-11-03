# British Exchange

UK energy (DESNZ) and economy (ONS) data ingestion with independent validation.

## Agents

See [AGENTS.md](AGENTS.md). Orchestrator owns the [work plan](docs/work-plan.md).

| Agent | Responsibility | Output |
|-------|----------------|--------|
| Orchestrator | Assigns tasks, prevents duplication, checks progress | Work plan and reviews |
| Energy | DESNZ source discovery and ingestion | Reproducible energy dataset |
| Economy | ONS source discovery and ingestion | Reproducible economic dataset |
| Validation | Independent numerical and methodological checks | QA report |

## Setup

```bash
uv sync
uv run uvicorn britain_exchange.api:app --reload
# Open http://127.0.0.1:8000/docs
```

Requires Python 3.13+ ([uv](https://docs.astral.sh/uv/)).

## Ready indicators (independently re-verified 2026-11-03)

| Indicator | Sector | QA |
|-----------|--------|-----|
| `electricity-generation-by-source` | Energy | [qa_report_2026-11-03.md](data/qa/qa_report_2026-11-03.md) |
| `real-gdp` | Economy | [qa_report_real_gdp_2026-11-03.md](data/qa/qa_report_real_gdp_2026-11-03.md) |

Energy API note: `GET /indicators/electricity-generation-by-source/observations` excludes `Total*` aggregates by default (`include_aggregates=true` to include).

Reproduce:

```bash
uv run python -m energy.connectors.electricity_generation
uv run python -m economy.connectors.real_gdp
uv run python -m britain_exchange.schema_check
uv run python -m validation.qa_energy_et51_2026_11_03
uv run python -m validation.qa_real_gdp_2026_11_03
```

Docs: [connector-contract](docs/connector-contract.md) · [schema-compatibility](docs/schema-compatibility.md) · [work-plan](docs/work-plan.md) · [independent verification](docs/independent-verification-2026-11-03.md)
