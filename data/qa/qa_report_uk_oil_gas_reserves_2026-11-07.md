# QA report — `uk-oil-gas-reserves` — 2026-11-07

**Agent:** Validation  
**Overall verdict:** **pass**

## Scope

- Indicator: `uk-oil-gas-reserves`
- Package: `data/energy/uk-oil-gas-reserves/`
- Connector: `energy.connectors.uk_oil_gas_reserves`
- Raw: `raw/2026-11-07/historic_reserves_1973_2024.xlsx` (gitignored pin)
- Curated: `curated/observations.csv` (387 rows)

## Checks

| ID | Check | Result | Notes |
|----|-------|--------|-------|
| C1 | Workbook sheet `Accessible` present | **pass** | |
| C2 | 2023 oil 2P (Probable column) = 302 Mt | **pass** | Matches Accessible parse; treated as 2P total |
| C3 | Measures present: oil_1p/2p/3p, gas_1p/2p/3p, oil_2c, gas_2c, oil_production | **pass** | notes.measure |
| C4 | Honesty — reserves ≠ production | **pass** | Manifest caveats + glossary UI |
| C5 | Attribution / licence | **pass** | NSTA User Agreement |

## Summary

- Pass: **5** · Warn: **0** · Fail: **0** · Blockers: **none**
- Classification break around 2015 is documented — long-run charts must not claim unbroken definitions.
