# Electricity interconnector flows

**Registry:** [Electricity interconnector flows](https://app.notion.com/4116547176858128b5cde0c291d4674c) — status **Validation**  
**`indicator_id`:** `electricity-interconnector-flows`  
**Owner:** Energy (Networks lane · Wave B2)  
**Domain:** [Power Networks](https://app.notion.com/p/410654717685813e95fde77447f38ad5)

## Source

| Field | Value |
|-------|--------|
| Landing | https://www.gov.uk/government/statistics/electricity-section-5-energy-trends |
| Table | ET 5.6 — Quarterly imports and exports (GWh) |
| Pinned raw | `raw/2026-11-07/ET_5.6_SEP_26.xlsx` |
| Release | 29 Sep 2026 |
| Unit | GWh |
| Frequency | Quarterly |
| Geography | UK (`K02000001`) |
| Licence | Open Government Licence v3.0 |
| Checksum | `f9ce73f5adaec1f84cb463479567964f185733c1eed1d506075ce6328b9c46f9` |

## Scope choices

- **Ingest:** sheet `Quarterly imports and exports` — Imports / Exports / Net imports for UK total + seven corridors.
- **Notes:** `corridor=<id>; flow=Imports|Exports|Net imports`.
- **France-UK:** publisher sum of IFA + IFA2 + ElecLink (Note 2) — not a single cable.
- **Missing:** `[x]` before a link commissioned → `observation_status=missing`.
- **Not ingested:** annual sheet (derivable); ET 5.6B internal UK transfers (Gate 3 candidate).

## Related (link, do not fork)

- `gb-generation-mix-half-hourly` — GB NESO `fuel=Imports` (different geography & grain).
- `energy-imports-and-exports` — ET 1.3 all-fuels ktoe (not electricity GWh).

Gate 1 inventory: [`../power-networks/`](../power-networks/).

## Reproduce

```bash
uv run python -m energy.connectors.electricity_interconnector_flows
```
