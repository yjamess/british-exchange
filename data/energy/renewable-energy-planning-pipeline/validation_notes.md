# Validation notes — `renewable-energy-planning-pipeline`

**Prepared:** 2026-11-07 · Energy agent (Gate 3 B3)  
**Status:** **Ready** (Orchestrator after Validation pass — `data/qa/qa_report_renewable_energy_planning_pipeline_2026-11-07.md`)

## Reproduce

```bash
uv run python -m energy.connectors.renewable_energy_planning
```

## Evidence

| Item | Value |
|------|--------|
| Raw | `raw/2026-11-06/REPD_Publication_Q2_2026.csv` (copied from operational package; same SHA) |
| sha256 | `84c1b5f958a934d8b4b86ec88f50bdcf43830ded7ff2efc27bffca0c98695035` |
| Asset URL | https://assets.publishing.service.gov.uk/media/6a6cbdc00c36759b5ccaa305/REPD_Publication_Q2_2026.csv |
| Official release | 2026-07-31 (Q2 2026 extract) |
| Curated rows | 142 (status × technology) |
| Connector | `energy.connectors.renewable_energy_planning` |

## Sample checks (Energy self-check vs pinned CSV)

| Status | Technology | Expected method | Curated notes |
|--------|------------|-----------------|---------------|
| Under Construction | Solar Photovoltaics | Sum `Installed Capacity (MWelec)` where short status matches | `status=Under Construction; technology=Solar Photovoltaics` → **3213.16 MW** |
| Awaiting Construction | (all techs) | Sum MW | **146996.7 MW** total across technologies |
| Operational | — | **Excluded** from this indicator | Lives on sibling `renewable-energy-planning-operational` |

Status inventory in pin (row counts): Awaiting Construction 5948 · Operational 3132 · Application Submitted 1539 · … · Under Construction 457 (Operational not curated here).

## Method notes

- One source → two indicators; no second fetch.
- Pipeline includes refused / withdrawn / abandoned as well as active stages — filter `status=` for Field Guide conveyor.
- Capacity threshold ≥150 kW (≥1 MW pre-2021).

## Out of scope

- Marking Ready
- National DNO topology
- Nuclear (not in REPD)
- UI / atlas for non-operational sites (optional later)
