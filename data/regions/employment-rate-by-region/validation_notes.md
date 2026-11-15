# employment-rate-by-region — validation notes (Regions)

**Checked:** 2026-11-15 by Regions. **Not a Validation sign-off.** Ready only after an independent QA report in `data/qa/`.

| Check | Result |
| --- | --- |
| Pin | `raw/2026-11-15/regionaltable1s.xlsx` |
| sha256 | `ff374cf96c5fa18a60f4540318b03a24fc06e9b0cd6af502c9dd205dcdc4967d` (unchanged vs 2026-11-03) |
| ONS release | 2026-10-20. Next HI00 release 17 November 2026 |
| Rows | 5343 = 13 geographies × 411 rolling quarters (Mar–May 1992 to Jun–Aug 2026) |
| Status | 5330 final + 13 provisional (latest quarter only, one per geography) |
| Age / sex / SA | 16–64 · persons · SA · denominator = population 16–64 |
| Column guard | North East Jun–Aug 2026 stored as **70.5%**. The 16-and-over employment rate on the same sheet is about 55.3% and must not be this series |

Spot check against [Labour market in the regions of the UK: October 2026](https://www.ons.gov.uk/employmentandlabourmarket/peopleinwork/employmentandemployeetypes/bulletins/regionallabourmarket/october2026) Table 1, employment rate aged 16 to 64, June to August 2026. Curated values are full workbook precision; compare after rounding half-up to 1 decimal place.

| Geography | Code | Bulletin |
| --- | --- | --- |
| North East | E12000001 | 70.5 |
| North West | E12000002 | 74.9 |
| Yorkshire and The Humber | E12000003 | 72.9 |
| East Midlands | E12000004 | 76.3 |
| West Midlands | E12000005 | 72.5 |
| East of England | E12000006 | 77.7 |
| London | E12000007 | 74.5 |
| South East | E12000008 | 78.6 |
| South West | E12000009 | 79.2 |
| England | E92000001 | 75.6 |
| Wales | W92000004 | 73.3 |
| Scotland | S92000003 | 74.0 |
| Northern Ireland | N92000002 | 72.5 |

The connector raises if these 13 spots do not match. UK bulletin figure 75.3% is Economy LF24, not a row in this file.

## Caveats for Validation

- Do not treat the old Ready registry status as trusted. The previous parser selected the wrong age column.
- England has no CDID on this column. Other geographies store `cdid=` in notes (North East is LF3P).
- No UK or GB row. Do not sum regions.
