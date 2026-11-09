# Crude oil production

**Registry:** [Crude oil production](https://app.notion.com/411654717685812d92a6d647e28cd8a3) (Status: Validation)  
**`indicator_id`:** `crude-oil-production`  
**Owner:** Energy (DESNZ) · Domain 04 Oil, Gas & Fossil Fuels  
**Gate 1 inventory:** [`../oil-gas-fossil-fuels/`](../oil-gas-fossil-fuels/)

## Source

| Field | Value |
|-------|--------|
| Landing | https://www.gov.uk/government/statistical-data-sets/crude-oil-and-petroleum-production-imports-and-exports |
| Workbook | Crude oil and petroleum: production, imports and exports 1890 to 2025 |
| Sheet / column | Production, Imports & Exports → Indigenous production **Total** |
| Pinned raw | `raw/2026-11-07/Oil_Production_Trade_since_1890.xls` |
| Asset | https://assets.publishing.service.gov.uk/media/6a69e3a116bc92f51e1a4315/Oil_Production___Trade_since_1890.xls |
| Release | 30 Jul 2026 |
| Unit | million tonnes (publisher thousand tonnes ÷ 1000) |
| Frequency | Annual |
| Geography | UK (`K02000001`) |
| Licence | Open Government Licence v3.0 |

## Scope choices

- **Ingest:** Indigenous production Total only (national extraction total).
- **Not ingested:** Landward split, feedstocks, crude imports/exports, oil products, inland deliveries, ratios.
- **Notes:** `measure=indigenous_production_total; source_unit=thousand_tonnes; fuel=Crude oil`

## Self-check vs DUKES 2026 Chapter 3 (for Validation)

| Check | Official narrative / workbook | Curated |
|-------|-------------------------------|---------|
| 1999 peak | ~137 million tonnes | 137.099 Mt |
| 2025 production | “just over 31 million tonnes” | 31.40605 Mt |
| 2025 vs 2024 | +2.4% | 31.40605 / 30.6578 ≈ +2.44% |

## Related Ready series (do not fork)

- `domestic-gas-production` — gas GWh monthly  
- `primary-energy-production` — Oil/Gas/Coal Mtoe monthly  
- `historical-coal-production` — coal Mt (History agent)  
- `energy-imports-and-exports` — trade (Imports lane)

## Reproduce

```bash
uv run python -m energy.connectors.crude_oil_production
```

## Gaps / blockers for Validation

- Spatial NSTA field atlas = Gate 3+ (not blocking Gate 2).
- Through 1962 totals include shale oil (Sources sheet).
- Blank indigenous Total years before ~1920 omitted (not zero-filled).
