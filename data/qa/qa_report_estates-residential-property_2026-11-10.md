# QA report — estates-residential-property

Date: 2026-11-10 · Validation agent · release: HMRC Inheritance Tax assets in estates by range of net estate (Table 12.4 to July 2022, Table 12.3 from July 2023), editions July 2015 to 30 July 2026

Independent re-read of all 12 pinned HMRC editions (Table 12.4a to July 2022, 12.3a from July 2023) with this script's own reader — zipfile + ElementTree for .ods, openpyxl for .xlsx, xlrd for .xls; no Housing connector code. The tax year is taken from the title inside each file and the first `Total` column is read (the September 2019 file carries a 2015-16 comparison block to its right). Compared with the current Postgres release; the current edition is re-downloaded from GOV.UK.

| Check | What | Result | Detail |
|---|---|---|---|
| C1 | SHA-256 of all 12 pinned editions equals manifest | pass | 12/12 match |
| C2a | Edition → tax year read from each file's title; one year per edition, 2012-13…2023-24 | pass | 2015-07→2012-13, 2016-07→2013-14, 2017-07→2014-15, 2018-07→2015-16, 2019-09→2016-17, 2020-07→2017-18, 2021-07→2018-19, 2022-07→2019-20, 2023-07→2020-21, 2024-07→2021-22, 2025-07→2022-23, 2026-07→2023-24 |
| C2b | All 72 served values equal the raw Total cell of that year's edition (and cite it) | pass | 72 rows, 72/72 equal |
| C3a | Live GOV.UK Table 12.3 equals pinned current edition | pass | unchanged; table_12_3_final.ods sha fcc6a09d9dd07f46…; page updated 2026-07-30 |
| C3b | Postgres current release cites the current edition | pass | release raw/2026-11-10/2026-07_table_12_3.ods |
| C4a | Residential £ ≤ gross £; net £ ≤ gross £; residential estates ≤ gross estates | pass | 12/12 years |
| C4b | One row per series per tax year, no gaps or duplicates | pass | 72 keys, 0 duplicates |
| C4c | Units gbp-millions / estates; geography K02000001; periods 6 Apr–5 Apr | pass | units ['estates', 'gbp-millions'] |
| C5a | HMRC text confirms the 1 January 2022 break and 2021-22 part-year mix | pass | commentary: found, commentary-2021-22: found, bqr: found |
| C5b | Manifest caveat states the break, the 2021-22 mix and not to read the drop as a fall | pass | caveat present |
| C5c | `category` on every row: before / mixed (2021-22) / full-returns-only | pass | `returns-incl-excepted-estates` 2012-13…2020-21; `transition-excepted-to-dec-2021` 2021-22; `full-iht-accounts-only` 2022-23…2023-24 |

**Verdict:** PASS — ready for UI

## Coverage break — HMRC wording relied on

- Commentary: “Following a reporting requirement change from 1 January 2022, non-taxpaying estates which are classed as ‘excepted’ are no longer required to report their valuations to HMRC through tax forms.”
- Commentary (Table 12.2 section): “…by estates required to send HMRC either a full IHT400 account, or for years up to and partially including 2021 to 2022, a reduced excepted estate return, such as an IHT205.”
- Background quality report: “Following a reporting requirement change from 1 January 2022, non-taxpaying estates which are classed as ‘excepted’ are no longer required to report their valuations to HMRC via IHT forms or notify HMRC that they have obtained a grant of representation. As such, their details are no longer included in these statistics, which now have reduced coverage.”

## Notes

- Served values (£m / estates, Total column): residential value 2012-13 36,301, 2013-14 40,171, 2014-15 42,659, 2015-16 41,200, 2016-17 43,200, 2017-18 51,400, 2018-19 48,700, 2019-20 50,200, 2020-21 59,200, 2021-22 52,200, 2022-23 29,500, 2023-24 28,700.
- Informational, not a failure: net-capital estate counts exceed gross-capital counts in 2013-14, 2014-15 (by under 0.1%) — as published by HMRC in those sample-weighted editions; served as published.
- 2012-13 to 2014-15 values carry HMRC's unrounded sample-weighted figures (e.g. 195,871.20 estates); later editions are 3 s.f. Served exactly as published.
- Not checked: other asset rows and range-of-estate bands (not served).
