# renewable-electricity-load-factors

**Owner:** Energy agent (Wave B1 · Renewables & Nuclear)  
**Status:** Ingested → Validation (not Ready)  
**Registry:** https://app.notion.com/41165471768581dfbb30e984c9aa01ba  
**indicator_id:** `renewable-electricity-load-factors`

## Chosen series

| Field | Value |
|-------|--------|
| Publisher | DESNZ |
| Landing | https://www.gov.uk/government/statistics/renewable-sources-of-energy-chapter-6-digest-of-united-kingdom-energy-statistics-dukes |
| Series | **DUKES 6.3** — Load factors for renewable electricity generation |
| Geography | UK — `K02000001` |
| Frequency | Annual calendar year |
| Unit | percent (as published, 0–100 scale) |
| Licence | OGL v3.0 |

Two bases (both curated; distinguish via `notes`):

1. `basis=average_boe_capacity` — average of beginning- and end-of-year capacity [note 1]
2. `basis=unchanged_configuration` — schemes whose capacity did not change in-year [note 2]

**Not nuclear.** Nuclear MW/TWh stay on the reused capacity/generation indicators. REPD does not publish load factors.

## Reproduce

```bash
uv run python -m energy.connectors.renewable_electricity_load_factors
```

## Hand-off paths

| Artefact | Path |
|----------|------|
| Manifest | `manifest.yaml` |
| Curated | `curated/observations.csv` |
| Raw pin | `raw/2026-11-07/DUKES_6.3.xlsx` |
| Retrieval | `raw/2026-11-07/retrieval.json` |
| Validation notes | `validation_notes.md` |
| Connector | `src/energy/connectors/renewable_electricity_load_factors.py` |

## Domain context

Gate 1 inventory: `data/energy/renewables-nuclear/`  
Complements (reuse, do not fork): `electricity-capacity-by-technology`, `electricity-generation-by-source`, `renewable-energy-planning-operational`.
