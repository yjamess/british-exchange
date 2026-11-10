# BRES manufacturing employee jobs by division × region

Nomis open-access BRES (`NM_189_1`): SIC 2007 divisions 10–33 × GB regions (TYPE480), employees count, 2019–2024.

- Connector: `src/energy/connectors/bres_manufacturing_jobs_by_division_region.py`
- Unit: thousands of employee jobs (Nomis headcount ÷ 1000)
- Geography: Great Britain only (no Northern Ireland)
- Complements Table 4 all-manufacturing regional totals

Reproduce:

```bash
uv run python -m energy.connectors.bres_manufacturing_jobs_by_division_region
uv run python -m britain_exchange.load_ready --only bres-manufacturing-jobs-by-division-region
```
