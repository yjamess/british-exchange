# QA report — residential-mortgage-book

Date: 2026-11-10 · Validation agent · release: MLAR statistics summary long run, September 2026 edition (Q2 2026)

Independent re-read of the pinned workbook `raw/2026-11-05/mlar-statistics-summary-long-run.xlsx` (openpyxl, rows located by hand-written sheet/row/label, no Housing connector code), compared with every observation in the current Postgres release. Headlines from the FCA *Mortgage lending statistics* page, Q2 2026 edition published 8 September 2026, fetched 2026-11-10.

| Check | What | Result | Detail |
|---|---|---|---|
| C1 | Raw workbook SHA-256 matches manifest | pass | eafa2b4386ae1562… |
| C2 | All 16 rows found at the expected sheet/row/label/unit | pass | 16/16 |
| C1b | Current release checksum matches manifest | pass | eafa2b4386ae1562 |
| C3 | Row count: raw cells = served rows; same 16 series; no duplicate (series, quarter) | pass | raw 1,248 / served 1,248; series served 16; dupes 0 |
| C4 | Every served value equals the raw cell (16 series × all quarters) | pass | 1,248 equal; 0 differ |
| C5 | Quarterly coverage contiguous and identical for all series | pass | 2007-01–2026-04, 78 quarters |
| C6 | period_end is the quarter end | pass | 0 bad |
| C7 | Units match the workbook's unit column (£ millions / Per cent) | pass | 0 wrong |
| C8 | Stock/flow: balances and arrears = stock; advances, commitments, shares = flow | pass | 0 series wrong |
| C9 | Geography is UK only | pass | ['K02000001'] |
| C10 | Internal: unsecuritised + securitised = overall balances (±£1m) | pass | 0 quarters off |
| C11 | Internal: arrears £ / balances £ = published arrears % (±0.001pp) | pass | 0 quarters off |
| C12 | Internal: four LTV bands sum to 100% (±0.1) | pass | 0 quarters off |
| C13 | Buy-to-let row: is it a component of house purchase (FTB + BTL + other = house purchase)? | caveat | identity holds in 78/78 quarters — in Summary 1 the BTL row is house-purchase buy-to-let; the manifest caveat says it includes further advance and remortgage (workbook note (a) is a general MLAR definition) |
| H1 | FCA headline 2026 Q2 — Outstanding residential loans £1,760.6bn | pass | served 1,760,581.6 £m |
| H2 | FCA headline 2026 Q2 — Gross advances £77.4bn | pass | served 77,380.6 £m |
| H3 | FCA headline 2026 Q2 — New commitments £79.2bn | pass | served 79,176.2 £m |
| H4 | FCA headline — Outstanding +0.8% q/q | pass | served 0.83% |
| H5 | FCA headline — Gross advances +11.1% q/q | pass | served 11.14% |
| H6 | FCA headline — Commitments +1.4% q/q | pass | served 1.44% |

**Verdict:** PASS with caveat (C13) — values correct; fix the buy-to-let label/caveat before UI

Notes: the purpose shares are shares of gross advances, not balances. In Summary 1 the first-time-buyer, buy-to-let and other rows sum exactly to house purchase in every quarter (C13), so the served buy-to-let share is buy-to-let *house purchase* only and is already inside the house-purchase share; it must not be added to it, and the manifest/UI should not describe it as all buy-to-let advances. Arrears share is a stock ratio at quarter end. The FCA page gives no headline for arrears, LTV or buy-to-let, so those are checked against the workbook and internal identities only. Workbook note (b): unsecuritised balances revised down ~£10bn from 2024 Q3.
