# QA report — mortgage-approvals

Date: 2026-11-10 · Validation agent · release: BoE Money and Credit September 2026 (LPMVTVX, LPMB4B3, LPMVTVJ, LPMVTVC)

Independent recount of the pinned raw file `raw/2026-11-05/boe_mortgage_flows.csv` (csv.reader, no Housing connector code), compared with every observation in the current Postgres release. Headlines from Bank of England *Money and Credit — September 2026* (published 29 October 2026), fetched 2026-11-10.

| Check | What | Result | Detail |
|---|---|---|---|
| C1 | Raw CSV SHA-256 matches manifest | pass | ec1046c10d2597ac… |
| C1b | Current release checksum matches manifest | pass | ec1046c10d2597ac |
| C2 | Row count: raw non-empty cells = served rows; no duplicate (series, month) | pass | raw 1,554 / served 1,554 / distinct 1,554 |
| C3 | Every served value equals the raw cell (all 4 series, all months) | pass | 1,554 equal; 0 mismatched/missing; 0 extra |
| C4 | period_end is the last day of period_start's month | pass | 0 bad |
| C5 | Monthly coverage contiguous per series | pass | LPMVTVX 1993-04–2026-09 n=402 gaps=0; LPMB4B3 1997-10–2026-09 n=348 gaps=0; LPMVTVJ 1993-04–2026-09 n=402 gaps=0; LPMVTVC 1993-04–2026-09 n=402 gaps=0 |
| C6 | Units: approvals for LPMVTVX/LPMB4B3, gbp-millions for LPMVTVJ/LPMVTVC | pass | 0 wrong |
| C7 | Stock/flow: every row measure=flow; one BoE code per served series | pass | gross-secured-lending=LPMVTVC, house-purchase-approvals=LPMVTVX, net-secured-lending=LPMVTVJ, remortgage-approvals=LPMB4B3 |
| C8 | Geography is UK only | pass | ['K02000001'] |
| H1 | Publisher headline — House-purchase approvals Sep: 53,400 | pass | served 53,443 |
| H2 | Publisher headline — Remortgage approvals Sep: 42,600 | pass | served 42,613 |
| H3 | Publisher headline — Remortgage approvals Aug: 34,000 | pass | served 34,023 |
| H4 | Publisher headline — Net mortgage borrowing Sep: £3.9bn | pass | served 3,866 |
| H5 | Publisher headline — Net mortgage borrowing Aug: £4.2bn | pass | served 4,174 |
| H6 | Publisher headline — Gross secured lending Sep: £24.2bn | pass | served 24,219 |
| H7 | Publisher headline — Gross secured lending Aug: £23.7bn | pass | served 23,654 |
| H0 | Brief headline: Sep 2026 house-purchase approvals 53,443 exactly | pass | served 53443.0 |

**Verdict:** PASS — ready for UI

Notes: the publisher rounds approvals to the nearest 100 and lending to £0.1bn, so H checks allow ± half a rounding step. LPMB4B3 (remortgage) starts October 1997 in the Bank's database; the earlier blank cells are correctly absent rather than zero. Recent months are revised each release; this QA covers the 29 Oct 2026 vintage only.
