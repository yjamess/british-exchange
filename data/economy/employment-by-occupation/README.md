# employment-by-occupation (APS via Nomis, SOC 2020 major groups)

**Owner:** Economy · EC-G2-03d  
**What it is:** People in employment by Standard Occupational Classification 2020 major group (1–9), United Kingdom, aged 16 and over, Annual Population Survey. Rolling twelve-month windows ending each quarter. **Not seasonally adjusted.** People, not jobs.

ONS discontinued the LFS table **EMP04** after April–June 2018 and directs users to the APS on Nomis (dataset `NM_17_5`, report `aps210`). That is the source here.

Three series per window: `share` (published % of all in employment), `people` (published numerator), `employment` (published denominator, once per window). The connector stops if `people ÷ employment × 100` misses the published share by more than 0.06 points.

## Reproduce

```bash
uv run python -m economy.connectors.employment_by_occupation
```

## Spot (Nomis last updated 2026-10-20 · window Jul 2025–Jun 2026)

| Group | Share | People |
|-------|-------|--------|
| 1 Managers, directors and senior officials | **11.4%** | 3,825,400 |
| 2 Professional occupations | **27.2%** | 9,100,200 |
| 3 Associate professional occupations | 15.0% | 5,015,200 |
| 4 Administrative and secretarial | 9.1% | 3,037,000 |
| 5 Skilled trades | 8.3% | 2,769,200 |
| 6 Caring, leisure and other service | 8.7% | 2,895,300 |
| 7 Sales and customer service | 5.6% | 1,878,800 |
| 8 Process, plant and machine operatives | 5.5% | 1,830,400 |
| 9 Elementary occupations | 9.0% | 3,026,900 |
| All in employment (denominator) | — | **33,470,000** |

Nine groups sum to 99.8%; the remainder is unclassified occupation. SOC 2020 windows begin Jan–Dec 2021; earlier windows use SOC 2010 codes on Nomis and are not bridged.
