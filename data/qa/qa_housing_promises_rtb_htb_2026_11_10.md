# QA — Housing Domain 10 promise sources: Right to Buy and Help to Buy (2026-11-10)

Indicators: `right-to-buy-sales-and-replacements`, `right-to-buy-one-for-one`, `help-to-buy-equity-loan`.
Purpose: to score the 2012 Right to Buy one-for-one pledge and to list the 2017 Help to Buy pledge with its real measure (`data/housing/policy-events/pledges.json`).

Result: **PASS** for all three. Each figure below was checked against an official release or a separately published table.

## Sources and pins

| Indicator | File | Release | SHA-256 (from manifest) |
| --- | --- | --- | --- |
| right-to-buy-sales-and-replacements | LT_691.ods, LT_693.ods, Right_to_Buy_sales_open_data.csv, Right_to_Buy_replacements_open_data.csv | Right to Buy sales and replacements, England: 2025 to 2026 (6 Aug 2026) | see `data/housing/right-to-buy-sales-and-replacements/manifest.yaml` |
| right-to-buy-one-for-one | Graph_Tables.ods (Figure 7) | Right to Buy sales and replacements, England: 2024 to 2025 (21 Aug 2025) | see `data/housing/right-to-buy-one-for-one/manifest.yaml` |
| help-to-buy-equity-loan | Help_to_Buy_Tables.ods (Table 2) | Help to Buy (equity loan scheme): data to 31 May 2023 (16 Nov 2023, final) | see `data/housing/help-to-buy-equity-loan/manifest.yaml` |

Entrypoints: `uv run python -m housing.connectors.right_to_buy`, `uv run python -m housing.connectors.help_to_buy_equity_loan`.

## Checks against the release text

| Check | Published | Curated | Result |
| --- | --- | --- | --- |
| Replacements 2025-26, England | 3,452 | 3,452 | match |
| Replacements 2012-13 to 2025-26 | 55,275 | 55,275 | match |
| New-build replacement completions 2025-26 | 2,597 | 2,597 | match |
| One-for-one target to March 2025 | 69,386 | 69,386.02 | match (unrounded) |
| Cumulative replacements to March 2025 | 51,643 | 51,643 | match |
| Shortfall to March 2025 | 17,743 | 69,386 − 51,643 | match |
| Gap fell in 2023-24 only | stated | gap 15,058 (2022-23) → 14,446 (2023-24) | match |
| Help to Buy completions, 2013-2021 scheme | 330,709 | 330,709 | match |
| Help to Buy completions, 2021-2023 scheme | 56,486 | 56,486 | match |

The Help to Buy connector also checks that each scheme's months add up to the published year rows. It fails if they do not.

## Open data against the Live Tables (England)

| FY | LT 691a eligible sales | open data | LT 693a replacements | open data | LT 693d completions | open data |
| --- | --- | --- | --- | --- | --- | --- |
| 2012-13 | 5,947 | 5,946.75 | 574 | 574 | 104 | 104 |
| 2015-16 | 12,254 | 12,254 | 2,512 | 2,512 | 1,582 | 1,582 |
| 2018-19 | 10,911 | 10,911.2 | 5,308 | 5,308 | 2,501 | 2,501 |
| 2021-22 | 10,963 | 10,966.65 | 5,116 | 5,116 | 3,167 | 3,167 |
| 2022-23 | 11,098 | 11,110.61 | 3,598 | 3,598 | 3,203 | 3,203 |
| 2023-24 | 7,015 | 7,016.3 | 3,445 | 3,445 | 2,263 | 2,263 |
| 2024-25 | 7,521 | 7,553.18 | 3,702 | 3,702 | 2,066 | 2,066 |
| 2025-26 | 14,275 | 14,275.33 | 3,452 | 3,452 | 2,597 | 2,597 |

Replacements and completions are identical. Eligible sales differ by up to 0.4% (2024-25). LT 691 note 5 says the open data reconciles incomplete sale-type returns and may not match LT 691a. The curated series uses the open data.

## Findings to carry

1. **Figure 7 and the open data differ by 180 replacements to March 2025.** Figure 7 has 51,643. The 2026 open data, summed from 2012-13 to 2024-25, gives 51,823 (later revisions). The one-for-one indicator keeps Figure 7 as published, because it is the only release that also gives the target. It is not mixed with the revised open data.
2. **The target series ends at 2024-25.** MHCLG stopped reporting it after the Government response of 2 July 2025. It is not extended here, because the baseline method for later years is not published.
3. **`replacement-ratio` is derived** (cumulative replacements ÷ target) from two published columns. The pledge is scored per year against 1. The ratio is 2.75 in 2015-16 and 1.20 in 2016-17. It is below 1 in every year from 2017-18, and 0.744 in 2024-25.
4. **Possible undercount from 2023-24.** Homes England stopped separately recording receipt-funded starts in 2023-24. The caveat is in both manifests and the pledge status note.
5. **Help to Buy pledge stays unscored.** The measure and unit now exist: one completion is one buyer. But the Budget gives no start date for "another 135,000". Choosing one would be our assumption, not the publisher's.

## Unrelated failures seen while testing

`tests/test_policy_records.py` and `tests/test_policy_events.py` fail locally because `epc-domestic-lodgements` and `dwelling-stock-by-tenure` have no curated CSV on disk (both are archived to Storage). They predate this work.

---

# Addendum — Affordable Homes Programme pledges (2026-11-10)

Indicator: `affordable-homes-programme-delivery` (44 obs). Entrypoint: `uv run python -m housing.connectors.affordable_homes_programme`.
Sources: Homes England Housing Statistics June 2026, Table 1 (25 Jun 2026), and GLA affordable housing statistics, general programmes to end of June 2026, Table 1 (11 Aug 2026). Checksums are in the manifest.

Result: **PASS for AHP 2021-26.** Homes England's part of AHP 2016-23 is ingested as context. London's part is not built.

## Checks against the MHCLG AHP annual report 2024-25 (position at 31 March 2025)

| Check | Report | Curated | Result |
| --- | --- | --- | --- |
| AHP 21-26 completions, England | 33,072 | 892 + 3,920 + 10,059 + 18,201 = 33,072 | match |
| AHP 21-26 completions, outside London (HE) | 32,201 | 32,201 | match |
| AHP 21-26 completions, London (GLA) | 871 | 215 + 656 = 871 | match |
| AHP 21-26 starts, London (GLA) | 5,188 | 1,777 + 3,411 = 5,188 | match |
| AHP 21-26 starts, outside London (HE) | 77,207 | 76,265 | −942 (1.2%) |
| AHP 16-23 starts, outside London (HE) | 133,360 | 136,157 | +2,797 (2.1%) |
| AHP 16-23 completions, outside London (HE) | 125,340 | 128,310 | +2,970 (2.4%) |

The Homes England differences likely come from revisions and from scope (the report counts "nil grant" homes in its own way). They are recorded, not adjusted. The 2021-26 score uses starts, so the 942 shortfall in HE starts is in the caveats.

## Scoring decisions

1. **AHP 2021-26 is scored on starts, summed over 2021-22 to 2025-26.** Total: 117,947 against "up to 180,000". The pledge says homes are "delivered over 5 years from 2021 to 2026", and March 2026 is the programme's start deadline. Completions continue to March 2029, so a completions score would have no defined end. The pledge's status note says the 180,000 was conditional and was replaced by 110,000 to 130,000 in July 2024.
2. **AHP 2016-23 stays listed.** It has no completion end date, and the GLA's programme lines cannot be mapped to the London total. The obvious lines give about 92,000 to 98,000 starts against the report's 116,782.
3. **New `match.dimensions`.** The Python validator now accepts the `dimensions` filter the UI already used, limited to the keys `category`, `fuel` and `demographic`, and a test covers it.

---

# Addendum — Parliament housing milestones (2026-11-10)

Indicator: `parliament-housing-milestones` (52 obs). Entrypoint: `uv run python -m housing.connectors.parliament_housing_milestones`.
Sources: MHCLG *Housing supply: indicators of new supply, England: April to June 2026* (accredited official statistics, 24 Sep 2026), the table of net additions since 9 July 2024; DLUHC *Measuring progress towards one million homes* (24 May 2024), Table 1. Raw evidence is the GOV.UK Content API JSON, pinned and archived to Storage.

Result: **PASS.** Every value is copied from the HTML table. Nothing is apportioned or derived.

| Check | Published | Curated |
| --- | --- | --- |
| England, 9 Jul 2024 to 20 Sep 2026 | 437,900 | 437,900 (estimated) |
| England 2024-25 (outturn) | 208,600 | 208,600 (final) |
| England 2025-26 | 196,900 | 196,900 (estimated) |
| England 1 Apr to 20 Sep 2026 | 90,200 | 90,200 (estimated) |
| London, since 9 Jul 2024 | 68,800 | 68,800 |
| 2019 Parliament, progress to 19 May 2024 | 1,001,000 | 1,001,000 (estimated) |
| 2019 Parliament, 17 Dec 2019 to 31 Mar 2020 | 60,770 | 60,770 (estimated) |

Decisions:
1. **The 1.5 million pledge is scored as progress to date** (`latest` of progress-since-start-of-parliament, England). The period runs from 9 July 2024, as MHCLG counts it, to 8 July 2029. That is the latest possible last day: under the Dissolution and Calling of Parliament Act 2022, s.4, a Parliament dissolves at the start of the fifth anniversary of first meeting. The source is accredited official statistics. The figure will move each quarter.
2. **The 2019 one-million pledge stays listed.** DLUHC's note is departmental, not an official statistic, and the register owner had declined to score from it. It is now held as context.
3. The 2019 running totals are all marked `estimated`, because each includes the EPC-apportioned first segment.
4. The 2024-25 column of the 2024 table covers the whole financial year, including weeks before 9 July 2024. It is kept as published, and the pledge uses the cumulative column, not a sum.

---

# Addendum — Autumn Budget 2017, 300,000 a year (2026-11-10)

**Owner decision:** read "mid-2020s" as 2025. The Budget gives no year, so this is an Exchange assumption, and the pledge says so.

The pledge is scored against `net-additional-dwellings` (series=net-additions, England), aggregation `latest`, from 2017-18 to 2024-25. The verdict is FY 2024-25 (208,600, outturn): the latest financial year ending in 2025. Earlier years show the path. No new data was needed; the series is already in Postgres. If the year were 2025-26 instead, the outturn is due in November 2026, and MHCLG's interim EPC-based estimate is 196,900 (`parliament-housing-milestones`). Both years are below 300,000.

---

# Addendum — 1951 and 2019 "300,000 a year" pledges (2026-11-10)

**New indicator:** `house-building-completions-by-country` (2,734 obs). Source: ONS *Indicators of house building, UK: by country*, Tables 3a-3e, calendar years (release of 23 Oct 2026). Great Britain is derived as England + Wales + Scotland. The connector fails if GB differs from UK − NI by more than 20.

| Year | England | Wales | Scotland | GB (derived) | NI | UK (published) |
| --- | --- | --- | --- | --- | --- | --- |
| 1952 | 196,930 | 12,050 | 30,950 | 239,930 | 8,400 | 248,330 |
| 1953 | 263,680 | 15,570 | 39,550 | 318,800 | 8,030 | 326,830 |
| 1954 | 293,110 | 15,840 | 38,850 | 347,800 | 6,320 | 354,120 |

UK 1953 also matches discontinued Live Table 241 (326,820, within rounding) and the Guardian's "almost 327,000".

**1951 (owner decision, from Hansard research):** the measure is permanent dwellings completed in Great Britain, calendar year, all builders, as used by Dalton (HC Deb 4 Dec 1951) and Silkin (HL Deb 26 Feb 1952). The pledge is scored per year across 1952-1954, the calendar years wholly inside the Parliament elected on the pledge. Result: 2 of 3 years at or above 300,000 (1953, 1954). It was first exceeded in 1953; the 1984 "1954" remark is the peak year.

**2019 manifesto "by the mid-2020s" (owner decision):** read as 2025, as for the 2017 Budget. Scored on England net additions, latest year from 2020-21 to 2024-25: 208,600.

Attribution check: the statement "Our target remains 300,000 houses a year." is in the 1951 Conservative manifesto (*Britain Strong and Free*), so `made_by`/`made_date` are correct. HC Deb 20 Nov 1951 has Macmillan calling it "a target which we shall aim to achieve". The manifesto is now the first source; the Hansard debates support it.

Tests: `test_policy_records` and `test_policy_events` read indicator ids from manifests, because archived indicators have no local curated CSV. That also clears the long-standing `epc-domestic-lodgements` and `dwelling-stock-by-tenure` failures.

---

# Addendum — remaining pledges (2026-11-10, owner decisions)

- **2019 one million homes: scored** on DLUHC's own count (`parliament-housing-milestones`, category parliament-2019, latest): 1,001,000 by 19 May 2024. The period is 17 Dec 2019 to 30 May 2024 (dissolution). The page notes that it is a departmental estimate, not an official statistic.
- **AHP 2016-23: scored on completions to date.** The MHCLG annual report 2024-25 is now a third source in `affordable-homes-programme-delivery` (series cumulative-starts / cumulative-completions, to 31 March 2025, for England, London and the Homes England regions; 82 obs in total). Checks: London 84,718 + HE 125,340 = England 210,058; the HE regional rows sum to their totals; the same holds for AHP 2021-26 (871 + 32,201 = 33,072). The period runs to March 2026 (Homes England's completion longstop), so the result is labelled progress to date.
- **Help to Buy 2017: stays listed.** "Another 135,000" is measured against an unpublished baseline.

**Correction (same day):** NAO 2022 para 1.9 says the final targets were set in June 2018. The published target is 250,000, and the internal targets are housing starts (HE 130,000, GLA 116,000), counting some 2015 programme and 'no grant' homes. The pledge is therefore re-scored on `cumulative-starts`: 250,142 against 250,000, met. The period runs April 2016 to March 2024 (last start deadline), and `made_date` is now 2018-06-01 (the month is from NAO; the day is not given). Completions (210,058) are in the status note.
