# economic-inactivity-rate-by-region — validation notes (Regions)

**Checked:** 2026-11-15 by Regions. **Not a Validation sign-off.**

| Check | Result |
| --- | --- |
| Pin | `raw/2026-11-15/regionaltable1s.xlsx` (copy of the employment-package pin) |
| sha256 | `ff374cf96c5fa18a60f4540318b03a24fc06e9b0cd6af502c9dd205dcdc4967d` |
| ONS release | 2026-10-20. Next release 17 November 2026 |
| Rows | 5343 = 13 × 411. 5330 final + 13 provisional |
| Age / sex / SA | 16–64 · persons · SA · denominator = population 16–64 |

Spot check against the [October 2026 regional bulletin](https://www.ons.gov.uk/employmentandlabourmarket/peopleinwork/employmentandemployeetypes/bulletins/regionallabourmarket/october2026) Table 1, inactivity rate aged 16 to 64, June to August 2026.

| Geography | Code | Bulletin |
| --- | --- | --- |
| North East | E12000001 | 25.5 |
| North West | E12000002 | 21.6 |
| Yorkshire and The Humber | E12000003 | 23.0 |
| East Midlands | E12000004 | 20.0 |
| West Midlands | E12000005 | 22.8 |
| East of England | E12000006 | 19.0 |
| London | E12000007 | 20.1 |
| South East | E12000008 | 17.9 |
| South West | E12000009 | 17.5 |
| England | E92000001 | 20.4 |
| Wales | W92000004 | 24.0 |
| Scotland | S92000003 | 22.6 |
| Northern Ireland | N92000002 | 25.9 |

UK bulletin figure 20.9% is Economy LF2S, not a row here. North East CDID is LF59. England has no CDID on this column.

Do not check that employment + inactivity + unemployment = 100. Unemployment is a different age and a different denominator.
