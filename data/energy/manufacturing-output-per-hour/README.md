# Manufacturing output per hour

**Registry:** [Manufacturing output per hour](https://app.notion.com/41165471768581c89c2ce8e92d3134e3)  
**Agent:** energy (Energy & Industry · Wave B3)  
**Series:** ONS `DJK6` / PRDY — Output per hour: Manufacturing C SIC07, index 2023=100, SA

## Why this series

Jobs & Productivity Gate 1 needs an official manufacturing productivity measure. Economy already owns whole-economy `labour-productivity` (LZVB). This package is the **section C** PRDY twin — not a fork of Economy, and not IoP ÷ jobs.

## Reproduce

```bash
uv run python -m energy.connectors.manufacturing_output_per_hour
```

Pins raw JSON under `raw/2026-11-07/djk6_prdy.json`, writes `curated/observations.csv` + `manifest.yaml`.

## Self-check (Energy → Validation)

| Check | Result |
|-------|--------|
| CDID | DJK6 in raw `description` |
| Latest quarter | 2026 Q1 = **103.3** (matches ONS timeseries page / JSON) |
| First quarter | 1994 Q1 = **38.7** |
| Rows | 129 quarterly (annual aggregates omitted) |
| Licence | Open Government Licence v3.0 |
| Distinct from | Economy LZVB; History long-run employment |

Hand-off status: **Validation** (do not mark Ready until Validation QA).

## Related

- Ready reuse: `manufacturing-employment`, `manufacturing-output-index`
- Economy context: `labour-productivity` (whole economy)
- Gate 1 inventory: `data/energy/jobs-productivity/`
