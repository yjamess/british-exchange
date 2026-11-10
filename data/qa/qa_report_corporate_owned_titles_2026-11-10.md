# QA report — corporate-owned-titles

Date: 2026-11-10 · Validation agent · release: HM Land Registry CCOD and OCOD 2026-11, published 2026-11-03

Independent recount: both full files re-downloaded through the HM Land Registry API, read with csv.DictReader (no Housing connector code), compared with the current Postgres release. Authority spot-checks use hand-written ONS codes, not the connector's name matching.

| Check | What | Result | Detail |
|---|---|---|---|
| C1-ocod | OCOD_FULL_2026_11.zip SHA-256 matches manifest | pass | 79cfe2cbf5dd371b… |
| C2-ocod | Titles = trailer = publisher row count − 2 | pass | 90,949 / 90,949 / 90,949 |
| C1-ccod | CCOD_FULL_2026_11.zip SHA-256 matches manifest | pass | efdf0691f989e1d5… |
| C2-ccod | Titles = trailer = publisher row count − 2 | pass | 4,485,123 / 4,485,123 / 4,485,123 |
| C3 | One period, November 2026 | pass | {('2026-11-01', '2026-11-30')} |
| C4-overseas-company | England and Wales total and tenure split | pass | 90,949 titles; freehold 49,841 |
| C5-overseas-company | Owner-type counts (all categories) | pass | 4 categories |
| C6-overseas-company | Local authority rows sum to the total; all E/W codes | pass | 318 authorities, sum 90,949 |
| C7-overseas-company | Spot-check 8 named authorities | pass | all equal |
| C4-uk-company | England and Wales total and tenure split | pass | 4,485,123 titles; freehold 3,196,999 |
| C5-uk-company | Owner-type counts (all categories) | pass | 22 categories |
| C6-uk-company | Local authority rows sum to the total; all E/W codes | pass | 318 authorities, sum 4,485,123 |
| C7-uk-company | Spot-check 8 named authorities | pass | all equal |
| C8 | Overseas country counts | pass | 206 countries; top raw ('Jersey', 24372) |
| C9 | Distinct UK company registration numbers | pass | served 830,420 vs recount 830,420 |

**Verdict:** PASS — ready for UI

Not checked: HM Land Registry publishes no aggregate tables for these files, so the official cross-check is the publisher's row count (C2). Raw zips are not retained, so this recount is only possible while the release is current on the API.
