# Validation notes — domestic-electricity-unit-standing

**Indicator:** `domestic-electricity-unit-standing`  
**Source:** DESNZ QEP table 2.2.4 (calendar-year standard electricity)  
**Raw:** `raw/2026-11-07/table_224.xlsx`  
**sha256:** `1a28aad7d06bc2696dafef85704e6aa308d7c4b0d1e2fdfcbbd21d4d811f8d02`  
**Reproduce:** `uv run python -m energy.connectors.domestic_electricity_unit_standing`

## Spot samples (Energy self-check)

| Year | Region | Payment | Measure | Value |
|------|--------|---------|---------|------:|
| 2025 | United Kingdom | Overall | unit_price | 0.257461 £/kWh |
| 2025 | United Kingdom | Overall | fixed_cost | 193.976 £/year |
| 2025 | London | Overall | unit_price | 0.257725 £/kWh |
| 2025 | London | Overall | fixed_cost | 163.782 £/year |

Reconstruction UK Overall @ 3,400 kWh: `193.976 + 0.257461×3400 ≈ £1,069.34`.  
Published QEP 2.2.1 Overall/All 2025 illustrative bill is ~£1,059 — close but not identical (methodology: weighted quarters / tariff mix). UI must show both layer reconstruction and official bill total without forcing equality.

## Method flags

- Units: `GBP_per_kWh` vs `GBP_per_year` in `unit` column; `measure=` in notes.
- Credit → Standard credit in notes.
- Economy 7 / financial-year sheets **not** ingested.
- Official statistics in development; modal split ~900 kWh caveat.
