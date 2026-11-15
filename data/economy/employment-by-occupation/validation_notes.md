# employment-by-occupation — validation notes (Economy EC-G2-03d)

**Checked:** 2026-11-15 by Economy. **Not a Validation sign-off.**

| Check | Result |
|-------|--------|
| Pin | `raw/2026-11-15/aps_occupation_uk.csv` (Nomis `NM_17_5`, UK, variables 1815–1823, measures 20599/21001/21002) |
| Release | Nomis `LastUpdated` **2026-10-20** (APS Jul 2025–Jun 2026) |
| Rows | 361 = 19 windows × (9 share + 9 people + 1 employment) |
| Age / adjustment | 16 and over · **NSA** · UK · rolling twelve-month windows |
| Spot Jul 2025–Jun 2026 | group 2 Professional **27.2%** · 9,100,200 people · all in employment **33,470,000** |
| Share identity | worst gap people/employment×100 vs share = 0.05 points (shares to 1 dp, people to nearest 100) |
| Group sum | 99.4–99.8% of denominator in every window; remainder unclassified |
| Not the same as | `workforce-jobs-by-industry` (jobs) · `employment-level` (16–64 SA) |
| Left on Nomis | SOC 2010 windows (2004–2020) · sub-major groups 11–92 · male/female cuts |

Ask Validation to confirm the EMP04 discontinuation notice on the ONS dataset page, and the Nomis UK code 2092957697 = K02000001.
