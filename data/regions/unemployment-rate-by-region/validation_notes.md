# unemployment-rate-by-region — validation notes (Regions)

**Checked:** 2026-11-15 by Regions. **Not a Validation sign-off.**

| Check | Result |
| --- | --- |
| Pin | `raw/2026-11-15/regionaltable1s.xlsx` (copy of the employment-package pin) |
| sha256 | `ff374cf96c5fa18a60f4540318b03a24fc06e9b0cd6af502c9dd205dcdc4967d` |
| ONS release | 2026-10-20. Next release 17 November 2026 |
| Rows | 5343 = 13 × 411. 5330 final + 13 provisional |
| Definition | ILO unemployment, aged 16 and over, share of the economically active aged 16 and over, persons, SA |
| Not ingested | Claimant Count. HI00 column 17 (unemployment aged 16–64). Men and women sheets |

Spot check against the [October 2026 regional bulletin](https://www.ons.gov.uk/employmentandlabourmarket/peopleinwork/employmentandemployeetypes/bulletins/regionallabourmarket/october2026) Table 1, unemployment rate aged 16 and over, June to August 2026. Round curated values half-up to 1 decimal place.

| Geography | Code | Bulletin |
| --- | --- | --- |
| North East | E12000001 | 4.7 |
| North West | E12000002 | 4.6 |
| Yorkshire and The Humber | E12000003 | 5.2 |
| East Midlands | E12000004 | 4.7 |
| West Midlands | E12000005 | 5.7 |
| East of England | E12000006 | 3.9 |
| London | E12000007 | 6.6 |
| South East | E12000008 | 4.2 |
| South West | E12000009 | 3.8 |
| England | E92000001 | 4.9 |
| Wales | W92000004 | 3.4 |
| Scotland | S92000003 | 4.3 |
| Northern Ireland | N92000002 | 2.1 |

## Do not “confirm” this against Economy LF2Q

LF2Q is **4.9%** for the **UK**, aged **16 to 64**. England’s 4.9% above is aged **16 and over**. The UK figure in this bulletin column is **4.7%** (16 and over). There is no UK row in HI00.

North East CDID on this column is YCNC. England has no CDID in the sheet.
