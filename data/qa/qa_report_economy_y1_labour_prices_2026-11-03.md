# QA report — Economy Y1 labour/prices — 2026-11-03

## Scope
- CPI inflation (D7G7), Real GDP per head (IHXW), Labour productivity (LZVB),
  Employment rate (LF24), Economic inactivity (LF2S), Real earnings (A2FC)

## Checks
| ID | Check | Result | Notes |
|----|-------|--------|-------|
| cpi-inflation/files | manifest+raw+curated | **pass** | raw=d7g7_mm23.json |
| cpi-inflation/manifest | id+series | **pass** | series=D7G7 |
| cpi-inflation/schema | curated schema+nonempty | **pass** | rows=453 |
| cpi-inflation/tail | last curated == last raw | **pass** | raw=3.5 curated=3.5 |
| cpi-inflation/spot | latest vs published expectation | **pass** | got=3.5 expected~3.5 |
| cpi-inflation/checksum | manifest checksum matches disk | **pass** | f05709a7d468e405 |
| real-gdp-per-head/files | manifest+raw+curated | **pass** | raw=ihxw_pn2.json |
| real-gdp-per-head/manifest | id+series | **pass** | series=IHXW |
| real-gdp-per-head/schema | curated schema+nonempty | **pass** | rows=322 |
| real-gdp-per-head/tail | last curated == last raw | **pass** | raw=10234.0 curated=10234.0 |
| real-gdp-per-head/checksum | manifest checksum matches disk | **pass** | 245f3fea0aebba90 |
| labour-productivity/files | manifest+raw+curated | **pass** | raw=lzvb_prdy.json |
| labour-productivity/manifest | id+series | **pass** | series=LZVB |
| labour-productivity/schema | curated schema+nonempty | **pass** | rows=221 |
| labour-productivity/tail | last curated == last raw | **pass** | raw=100.1 curated=100.1 |
| labour-productivity/checksum | manifest checksum matches disk | **pass** | 0203bfc8991c4e31 |
| employment-rate/files | manifest+raw+curated | **pass** | raw=lf24_lms.json |
| employment-rate/manifest | id+series | **pass** | series=LF24 |
| employment-rate/schema | curated schema+nonempty | **pass** | rows=666 |
| employment-rate/tail | last curated == last raw | **pass** | raw=75.3 curated=75.3 |
| employment-rate/spot | latest vs published expectation | **pass** | got=75.3 expected~75.3 |
| employment-rate/checksum | manifest checksum matches disk | **pass** | b68f87c2ed598965 |
| economic-inactivity-rate/files | manifest+raw+curated | **pass** | raw=lf2s_lms.json |
| economic-inactivity-rate/manifest | id+series | **pass** | series=LF2S |
| economic-inactivity-rate/schema | curated schema+nonempty | **pass** | rows=666 |
| economic-inactivity-rate/tail | last curated == last raw | **pass** | raw=20.9 curated=20.9 |
| economic-inactivity-rate/spot | latest vs published expectation | **pass** | got=20.9 expected~20.9 |
| economic-inactivity-rate/checksum | manifest checksum matches disk | **pass** | dff86605f7fe5667 |
| real-earnings/files | manifest+raw+curated | **pass** | raw=a2fc_emp.json |
| real-earnings/manifest | id+series | **pass** | series=A2FC |
| real-earnings/schema | curated schema+nonempty | **pass** | rows=320 |
| real-earnings/tail | last curated == last raw | **pass** | raw=494.0 curated=494.0 |
| real-earnings/checksum | manifest checksum matches disk | **pass** | 27a063a1b31cdcd3 |

## Summary
- Fail: 0
- Blockers: none
