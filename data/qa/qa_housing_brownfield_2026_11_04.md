# QA — brownfield-land 2026-11-04

Independent read-only checks for Planning Data brownfield register aggregates.

| ID | Check | Result | Notes |
|----|-------|--------|-------|
| C1 | Checksum CSV=manifest | pass | 91023750fcfa10994311bdef6f1f1b240fedb197e001edecad1ba46c9977eef6 |
| C2 | Manifest owner + England geography | pass |  |
| C3 | Curated schema | pass |  |
| C4 | Row count matches independent recompute | pass | rows=49 recompute=49 dupes=0 |
| C5 | England current site-count spot | pass | value=32353.0 expected=32353 |

Overall: **pass**

