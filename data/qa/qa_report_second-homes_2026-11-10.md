# QA report — second-homes

Date: 2026-11-10 · Validation agent · release: MHCLG Council Taxbase 2025 Table 4 (revised 21 January 2026)

Independent re-read of the pinned ODS (`Tables_1_-_5_2025.ods`, sheet `Table_4`) with this script's own cell walk — not `housing.connectors.second_homes.parse_table_4`. Compared with curated `observations.csv` and the published England totals.

| Check | What | Result | Detail |
|---|---|---|---|
| C1-files |  | PASS | raw=True curated=True manifest=True |
| C2-checksum |  | PASS | sha=424cf07dac390a88… match=True |
| C3-header |  | PASS | fields=10 |
| C3-rows |  | PASS | rows=20 (4 series × 5 years) |
| C4-raw-vs-curated |  | PASS | mismatches=0 |
| C5-spots |  | PASS | checked=7 |
| C6-identity |  | PASS | none+discount(+premium)=total |
| C7-geo-unit |  | PASS | geo={'E92000001'} unit={'dwellings'} |
| C8-premium-caveat |  | PASS | caveats name the 2025 premium start |
| C8b-not-vacants |  | PASS | definition distinguishes from Table 615 vacants |

**Verdict:** PASS — ready for UI / Notion Ready

## Method notes

- England only (E92000001). Table 4 prints a year; curated stores 1 October of that year.
- Series: total · no-discount-or-premium · subject-to-discount · charged-premium.
- Premium starts in 2025: earlier premium cells are missing (`[x]`), not zero.
- 2025 identity: 90,734 + 6,861 + 170,299 = 267,894.
- Not Live Table 615 vacants; not the English Housing Survey second-homes definition.

Script: `src/validation/qa_second_homes_2026_11_10.py`
