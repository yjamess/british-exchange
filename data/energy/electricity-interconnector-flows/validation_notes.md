# Validation notes — `electricity-interconnector-flows`

**Agent:** Energy (Networks) · Wave B2  
**Date:** 2026-11-07  
**Status requested:** Validation (not Ready)

## Package

| Item | Path |
|------|------|
| Manifest | `data/energy/electricity-interconnector-flows/manifest.yaml` |
| Raw | `data/energy/electricity-interconnector-flows/raw/2026-11-07/ET_5.6_SEP_26.xlsx` |
| Retrieval meta | `data/energy/electricity-interconnector-flows/raw/2026-11-07/retrieval.json` |
| Curated | `data/energy/electricity-interconnector-flows/curated/observations.csv` |
| Connector | `src/energy/connectors/electricity_interconnector_flows.py` |
| Gate 1 | `data/energy/power-networks/` |

## Reproduce

```bash
uv run python -m energy.connectors.electricity_interconnector_flows
```

Expected: **2736** observations (114 quarters × 8 corridors × 3 flows); **1722** valued; **1014** missing (`[x]` pre-commissioning); raw sha256  
`f9ce73f5adaec1f84cb463479567964f185733c1eed1d506075ce6328b9c46f9`.

## Sample QA vs official release / commentary

Workbook sheet `Quarterly imports and exports` and in-workbook Commentary (Q2 2026):

| Check | Official | Curated |
|-------|----------|---------|
| 2026-Q2 UK total Imports | 11242.8331 GWh (~11.2 TWh) | `11242.8331` provisional |
| 2026-Q2 UK total Exports | 3627.8791 GWh (~3.6 TWh) | `3627.8791` provisional |
| 2026-Q2 UK total Net imports | 7614.954 GWh (~7.6 TWh) | `7614.954` provisional |
| 2026-Q2 France→UK Imports | 6156.4105 GWh (~6.2 TWh; >50% of imports) | `6156.4105` provisional |
| 2024 sum of quarterly UK Net imports | Annual sheet 33407.8202 GWh | Quarterly sum `33407.820199999995` |

## Method notes for Validation

1. Geography is **UK**, not GB — do not blend with `gb-generation-mix-half-hourly`.
2. `France-UK` is a published aggregate of three interconnectors (Note 2).
3. Net imports are publisher values (can be negative); not recomputed from Imports−Exports in the connector (spot-check identity holds within rounding).
4. Does not replace `energy-imports-and-exports` (different table, unit, fuel scope).

## Blockers / Gate 3 backlog (honest)

- **Constraint / curtailment costs:** NESO Thermal Constraint Costs exist (Open Data Licence) but are **not** ingested this wave — separate indicator; boundary geography mapping needed.
- **Rated interconnector capacity (MW):** NESO Interconnector Register candidate; NTC restriction files are **Blocked** as a capacity series (restriction-only publication).
- **Distribution / local spare capacity:** **Blocked** — no official national series; do not invent.
- **Internal transfers (ET 5.6B):** deferred; same workbook available later.
