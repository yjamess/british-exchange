# QA — net-additional-dwellings (Domain 05) · 2026-11-04

**Indicator:** `net-additional-dwellings`  
**Source:** MHCLG Live Table 118 unrounded (`Live_Table_118.ods`, release 20 Nov 2025)  
**Curated:** `data/housing/net-additional-dwellings/curated/observations.csv` (1,181 observations)  
**Owner check:** Housing ingest spot QA (Validation to confirm / file formal Ready)

## Anchors vs [official bulletin](https://www.gov.uk/government/statistics/housing-supply-net-additional-dwellings-england-2024-to-2025/housing-supply-net-additional-dwellings-england-2024-to-2025)

| Series | Bulletin (rounded) | Curated England 2024–25 (unrounded) | Match |
|--------|-------------------:|------------------------------------:|:-----:|
| Net additions | 208,600 | 208,600 | PASS |
| New build | 190,600 | 190,602 | PASS (rounding) |
| Net conversions | 3,850 | 3,846 | PASS (rounding) |
| Net change of use | 17,710 | 17,708 | PASS (rounding) |
| Net other gains | 1,080 | 1,076 | PASS (rounding) |
| Demolitions | 4,630 | 4,632 | PASS (rounding) |

**Identity:** new-build + conversions + change-of-use + other − demolitions = **208,600** (exact on unrounded cells).

**Status:** latest year tagged `provisional` from table Notes `[p]`. Geography England + nine regions; not UK.

## Verdict

**PASS** for Supply Machine England components (subject to Validation counter-sign).
