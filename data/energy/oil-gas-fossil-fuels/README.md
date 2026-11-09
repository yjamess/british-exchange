# Oil, Gas & Fossil Fuels — Gate 1 package (Domain 04)

**Wave:** Parallel A2 · Energy Fossils lane · **ingest only** (no UI)  
**Brief:** [Oil, Gas & Fossil Fuels](https://app.notion.com/p/410654717685815db976d589af8be69f)  
**Kickoff:** [docs/agent-kickoff-parallel-wave-a.md](../../../docs/agent-kickoff-parallel-wave-a.md) · [docs/agent-kickoff-fossils.md](../../../docs/agent-kickoff-fossils.md)

## Contents

| File | Purpose |
|------|---------|
| `source_register.csv` | DUKES / NSTA / BGS candidates vs Notion §5 |
| `REUSE_MAP.md` | Ready ids to link (gas, primary, coal, generation, imports) |
| `GATE1_TAXONOMY.md` | Measures, coverage breaks, Gate 2 vs Gate 3 |

## Gate 2 series shipped this wave

| Indicator | Package | Connector |
|-----------|---------|-----------|
| `crude-oil-production` | [`../crude-oil-production/`](../crude-oil-production/) | `energy.connectors.crude_oil_production` |

## Reproduce Gate 2

```bash
uv run python -m energy.connectors.crude_oil_production
```

## Validation hand-off

Registry row for `crude-oil-production` → **Validation**. Reused Ready series stay Ready; do not re-QA unless Validation requests a cross-check.
