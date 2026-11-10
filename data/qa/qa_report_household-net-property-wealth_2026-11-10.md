# QA report — household-net-property-wealth

Date: 2026-11-10 · Validation agent · release: ONS property wealth tables, July 2006 to June 2016 and April 2014 to March 2022 edition, released 24 January 2025

Independent re-read of the pinned workbook `raw/2026-11-05/propertywealthtables.xlsx` (openpyxl, labels and round headers parsed here, no Housing connector code), compared with every observation in the current Postgres release. Headline medians from the Domain 09 brief (docs/agent-kickoff-ownership.md); the ONS *Total wealth in Great Britain: April 2020 to March 2022* bulletin (24 January 2025, fetched 2026-11-10) gives the 40% property share but no median, so the medians are confirmed against the brief and Table 3.8 only.

| Check | What | Result | Detail |
|---|---|---|---|
| C1 | Raw workbook SHA-256 matches manifest | pass | a8b1ba7b715113d1… |
| C2 | Table 3.8/3.9/3.19 rows and round headers found where expected | pass | ok |
| C1b | Current release checksum matches manifest | pass | a8b1ba7b715113d1 |
| C3 | Row count: raw cells = served rows (54 + 9 + 56); no duplicate key | pass | raw 119 / served 119 / distinct 119 |
| C4 | Every served value equals the raw cell | pass | 3.8: 54, 3.9: 9, 3.19: 56; 0 differ |
| C5 | period_start/end map to the survey round in the header | pass | 0 bad |
| C6 | Period coverage: overlapping survey periods in one series | caveat | 3 overlap: Jul 2012–Jun 2014 vs Apr 2014–Mar 2016; Jul 2014–Jun 2016 vs Apr 2014–Mar 2016; Jul 2014–Jun 2016 vs Apr 2016–Mar 2018. Wave 5 (Jul 2014–Jun 2016) and Round 5 (Apr 2014–Mar 2016) are both served in each Table 3.8/3.9 series with no wave/round label in notes |
| C7 | Units/measure: gbp & stock (3.8), gbp-billions & stock (3.9), percent & share (3.19) | pass | 0 wrong |
| C8 | Geography is Great Britain only | pass | ['K03000001'] |
| C9 | Internal (3.9): gross property − mortgage debt = net, ±£1bn rounding | pass | 0 rounds off |
| C10 | Internal (3.19): each age row's bands sum to 100 ±2 (published whole %) | pass | under-16 99, 16-24 99, 25-34 100, 35-44 101, 45-54 100, 55-64 102, 65-plus 101, all-persons 102 |
| C11 | Internal (3.8): p25 ≤ median ≤ p75 in every round | pass | 18/18 |
| H1 | Published headline Apr 2020–Mar 2022 — median, all households £106,000 | pass | served 106,000 |
| H2 | Published headline Apr 2020–Mar 2022 — median, property owners £226,000 | pass | served 226,000 |
| H3 | Published headline — net property wealth is 40% of household wealth (ONS bulletin 24 Jan 2025) | not checkable | served aggregate £5,461bn; total household wealth is not in this workbook, so the 40% share cannot be recomputed here |

**Verdict:** PASS with caveat (C6) — values correct

Notes: C6 — the ONS table deliberately prints both the last wave (July 2014 to June 2016) and the first round on the new basis (April 2014 to March 2016). They are two estimates of almost the same period, not two points in time; a line chart that joins all nine points will draw a spurious step in 2014–16. The UI should break the line between waves and rounds or show one of the two. Accreditation was suspended for the April 2020 to March 2022 round (ONS, 13 June 2025); confidence intervals are not loaded.
