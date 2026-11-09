# QA report — domestic gas unit rates and standing charges — 2026-11-07

**Agent:** Validation  
**Overall verdict:** **pass** (Ready)

## Scope

- Indicator: `domestic-gas-unit-standing` (DESNZ QEP 2.3.4)
- Manifest: `data/energy/domestic-gas-unit-standing/manifest.yaml`
- Raw: `data/energy/domestic-gas-unit-standing/raw/2026-11-07/table_234.xlsx`
- Curated: `curated/observations.csv` (1 920 rows)
- Connector: `src/energy/connectors/domestic_gas_unit_standing.py`
- Twin: `domestic-electricity-unit-standing` (QEP 2.2.4) — do not mix kWh assumptions
- Official: [Annual domestic energy price statistics](https://www.gov.uk/government/statistical-data-sets/annual-domestic-energy-price-statistics)

## Freeze

| Item | Value |
|------|-------|
| Claimed SHA-256 | `e08e813e9f7e1b85457ab73aecc3d3e39c59b517d801cd03360ec919177a5ad8` |
| Observed SHA-256 | `e08e813e9f7e1b85457ab73aecc3d3e39c59b517d801cd03360ec919177a5ad8` |
| Asset | `table_234__1_.xlsx` · publication 2026-06-30 |
| Rows | 1 920 (year × region × payment × measure) |
| Coverage | Calendar years 2010–2025 · includes `region=United Kingdom` |

## Checks

| ID | Check | Result | Notes |
|----|-------|--------|-------|
| C1 | Freeze — pinned raw SHA-256 | **pass** | Exact match |
| C2 | Sheet 2.3.4 headers | **pass** | Year · Region · LDZ · Credit/DD/Prepay/Overall unit+fixed |
| C3 | Credit mapped to Standard credit | **pass** | Matches bill payment vocabulary |
| C4 | Reconstruct UK Overall 2023 @ 11 200 kWh | **pass** | fixed + unit×11 200 = **1 094.44**; Ready `domestic-gas-bills` Overall/All 2023 = **1 094.441998…** |
| C5 | Units distinct | **pass** | `GBP_per_kWh` vs `GBP_per_year` |
| C6 | Not electricity layers | **pass** | Separate indicator id; gas fuel in notes |
| C7 | Financial-year sheet omitted (documented) | **pass** | Same pattern as 2.2.4 |
| C8 | Independence — no silent rewrite | **pass** | Validation did not edit curated |

## Summary

- Pass: **8**
- Warn: **0**
- Fail: **0**
- Blockers: **none**
- **Notion:** Status → **Ready** (2026-11-07)

## Reproduce

```bash
shasum -a 256 data/energy/domestic-gas-unit-standing/raw/2026-11-07/table_234.xlsx
uv run python -m energy.connectors.domestic_gas_unit_standing
```
