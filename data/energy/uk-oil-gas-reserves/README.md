# UK oil and gas reserves and contingent resources

NSTA historic estimates (Accessible sheet): remaining 1P / 2P / 3P reserves and 2C contingent resources, plus the workbook’s oil production column for glossary contrast.

**Indicator id:** `uk-oil-gas-reserves`  
**Attribution:** Contains information provided by the North Sea Transition Authority and/or other third parties.

## Reproduce

```bash
uv run python -m energy.connectors.uk_oil_gas_reserves --fetch
```

## Honesty

Reserves are remaining recoverable estimates — never equate to annual extraction. Classification changes (notably around 2015) break long-run comparability.
