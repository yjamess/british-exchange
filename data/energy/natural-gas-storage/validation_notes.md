# Validation notes — `natural-gas-storage`

**Agent:** Energy (self-check before Validation)  
**Pin:** `raw/2026-11-08/DUKES_4.4.xlsx`  
**SHA-256:** `0c9f37a6561c18c7ed6065da42f7e454452e8aa368dab95068a00ad72326daa8`

## Method

- Official GOV.UK asset pin (immutable).
- Sheet `4.4a` only — Stock / Stock change / Storage capacity × year.
- notes: `measure=stock|stock_change|storage_capacity`.
- Years ≥ 2016 tagged `series_break_2016=note1` (National Grid source; LNG stock included).
- Sheet `4.4b` site register **not** ingested.

## Sample vs pin

| Year | Measure | Curated | Workbook |
|------|---------|---------|----------|
| 2008 | stock | 44229.43 | 44229.43 |
| 2016 | stock | 33397.74 | 33397.74 |
| 2025 | stock | 23313.17 | 23313.17 |
| 2015 | storage_capacity | 50820 | 50820 |
| 2017 | storage_capacity | 15862 | 15862 |
| 2025 | storage_capacity | 35530 | 35530 |
| 2022 | stock_change | −4065.09 | −4065.09 |

## Honesty

- Positive stock change = gas taken from storage (Note 2).
- Do not splice pre-/post-2016 as one unbroken stock level without the break label.
- Never average storage GWh with ET 1.3 ratios into one score.
- Not electricity storage / REPD / pumped storage.
