# QA — People wave 2026-11-03

Independent read-only checks against `data/people/`.

| ID | Check | Result | Notes |
|----|-------|--------|-------|
| uk-population-estimate:C1 | Checksum | pass | 7d954811f1cecf49264695f0ed98106b7408deb0212c90703141d6968b847b6b |
| uk-population-estimate:C2 | Manifest/owner/geo | pass | missing=none |
| uk-population-estimate:C3 | Schema | pass |  |
| uk-population-estimate:C4 | Rows/uniqueness | pass | rows=55 dupes=0 |
| uk-population-estimate:C5 | Spot recompute | pass | json_years=55 |
| long-term-international-net-migration:C1 | Checksum | pass | 254a57a0d1e30c40c42843290c6dcc8ccb935ad26ac9148ad2665846ff7e9147 |
| long-term-international-net-migration:C2 | Manifest/owner/geo | pass | missing=none |
| long-term-international-net-migration:C3 | Schema | pass |  |
| long-term-international-net-migration:C4 | Rows/uniqueness | pass | rows=55 dupes=0 |
| long-term-international-net-migration:C5 | Spot recompute | pass | net_rows=55 last=171000 |
| nhs-elective-waiting-list:C1 | Checksum | pass | 33686d41dbd075d7530bcc227a675226f2aac5fdd70c07e843ca33aecfd1f447 |
| nhs-elective-waiting-list:C2 | Manifest/owner/geo | pass | missing=none |
| nhs-elective-waiting-list:C3 | Schema | pass |  |
| nhs-elective-waiting-list:C4 | Rows/uniqueness | pass | rows=228 dupes=0 |
| nhs-elective-waiting-list:C5 | Spot recompute | pass | Aug2026 raw=7370100 curated=7370100.0 |
| life-expectancy-at-birth:C1 | Checksum | pass | cbc71edc1a46b75f3ecf6326f05501216c68fa2d648f54f231a4a82cea786846 |
| life-expectancy-at-birth:C2 | Manifest/owner/geo | pass | missing=none |
| life-expectancy-at-birth:C3 | Schema | pass |  |
| life-expectancy-at-birth:C4 | Rows/uniqueness | pass | rows=86 dupes=0 |
| life-expectancy-at-birth:C5 | Spot recompute | pass | 2022-2024 male=79.12 female=83.02 |
| gcse-grade-4-english-maths:C1 | Checksum | pass | bc2fb3d7020bbd1a641be6e09eebee00b7b0ae24385a6db4681d6613a37d68e9 |
| gcse-grade-4-english-maths:C2 | Manifest/owner/geo | pass | missing=none |
| gcse-grade-4-english-maths:C3 | Schema | pass |  |
| gcse-grade-4-english-maths:C4 | Rows/uniqueness | pass | rows=16 dupes=0 |
| gcse-grade-4-english-maths:C5 | Spot recompute | pass | national_total_rows=16 last=64.8 |

Overall: **pass**

