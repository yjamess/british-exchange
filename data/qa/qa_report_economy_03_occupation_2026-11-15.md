# QA — Economy Domain 03 employment by occupation (2026-11-15)

**Verdict:** PASS · 15 pass / 0 fail / 0 warn

Independent sample of `employment-by-occupation` against the Nomis pin and the published share identity. Does not rewrite the Economy package.

| Check | Result | Detail |
|-------|--------|--------|
| raw pin present | pass | aps_occupation_uk.csv |
| raw checksum matches manifest | pass | 0081a5276b77882b |
| ONS EMP04 discontinued → Nomis APS named | pass | ONS via Nomis |
| no missing rows | pass | 361 rows |
| window count | pass | 19 windows Jan 2021-Dec 2021 → Jul 2025-Jun 2026 |
| first SOC2020 window | pass | Jan 2021-Dec 2021 |
| latest window | pass | Jul 2025-Jun 2026 |
| latest shares match Nomis | pass | 1:11.4, 2:27.2, 3:15.0, 4:9.1, 5:8.3, 6:8.7, 7:5.6, 8:5.5, 9:9.0 |
| group 2 people | pass | 9100200.0 |
| denominator | pass | 33470000.0 |
| share identity every window | pass | worst gap 0.050 points |
| nine groups under 100% | pass | min 99.4 max 99.8 |
| latest window provisional only | pass | 19 provisional |
| units say people not jobs | pass | units |
| geography UK | pass | K02000001 |

## Ready recommendation

Promote `employment-by-occupation` to Ready and cloud-load when verdict is PASS. People, not jobs — never compare with Workforce Jobs. EMP04 is discontinued; Nomis APS is the official successor.
