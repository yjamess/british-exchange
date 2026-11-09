# Independent QA — Housing atlas · 4 November 2026

Scope: archived observations, exported presentation bundles, ONS boundary geometry and selected numerical methods. No source data rewritten. This is local review evidence, not publication approval or registry Ready status.

Reproduce: `PYTHONPATH=src uv run python -m validation.qa_housing_atlas`

| Check | Result | Evidence |
|---|---|---|
| Provenance and output checksums | PASS | Five archived sources retain SHA-256, original retrieval timestamps and release dates; two output hashes agree. |
| Geography and time shape | PASS | 374 unique areas; 360 local, nine English regions, four nations and UK; 380 consecutive months Jan 1995–Aug 2026. |
| Every retained HPI source cell | PASS | 1,098,752 source cells independently compared, including blanks; 0 mismatches. |
| Missing values and padding | PASS | 1,075,723 observed cells; 61,237 null cells. No invented numbers in absent source months; no non-finite values. |
| Calendar-year change samples | PASS | Manchester 2.1150%; City of Westminster -14.2979%; City of Glasgow 1.7723%; Cardiff 2.1342%; Belfast 3.9430%; United Kingdom 0.9099%. Ratio of price values, not source index percentage; exact same month 12 months apart. |
| Exact boundary joins | PASS | 361 boundaries, 360 exact local HPI matches. Isles of Scilly (E06000053) must remain no-data. No fuzzy joins. |
| Boundary geometry preservation | PASS | 50,110 coordinates independently compared to ONS archive; all polygon/ring structures retained with ≤5-decimal rounding. |
| Boundary evidence hashes | PASS | All four boundary raw evidence hashes match; source licence and attribution recorded. |
| All completions values vs official workbook | PASS | 194 England quarters compared directly to archived LT213 All Completions. |
| Completions provisional flag | PASS | Official LT213 marks 2026 Q2 [p] in separate Notes column; the bundle must carry provisional status. |
| Rolling-year reference value | PASS | 2025 Q3–2026 Q2 = 30,930 + 41,570 + 33,760 + 37,530 = 143,790. Contains a provisional quarter. |
| All tenure values vs official workbook | PASS | 35 complete 31 March snapshots, 1991–2025; five components mapped independently from LT104. |
| Tenure share denominator | PASS | Largest published-total/component-sum difference = 1,000 dwellings. Exact shares must divide by component sum, not reported total. |
| Tenure provisional flag | PASS | Official LT104 marks 2022–2025 provisional; expose this status or an equally specific visible source caveat. |
| All rent index values vs official workbook | PASS | 141 UK PIPR index values match Table 1 exactly; no rent-level values substituted. |
| Rent annual change vs published percentage | PASS | September 2026 computed annual change 3.80527640%, source 3.805277%; rounding tolerance 0.00001 percentage points. |
| All affordability values vs official workbook | PASS | 29 England values match AFF1 Table 1c, workplace-based median ratio; 2025 = 7.63. |

**Overall: PASS** — 17/17 checks passed.

## Interpretation and limits

- Fixed December 2025 boundaries are used for every historical date; this is not historical boundary reconstruction.
- The 500m ultra-generalised boundary geometry is suitable for national/area exploration, not locating individual properties or determining legal boundaries.
- HPI prices are nominal, mix-adjusted area statistics. Northern Ireland monthly rows reflect its quarterly source contribution.
- Recent HPI estimates can revise; new/existing and sales-volume series lag headline average prices. Missing values must remain unavailable.
- Data QA covers archived releases; it does not establish that these are the newest publisher releases today.
- Browser, responsive and interaction QA is owned by Orchestrator; this report does not claim those checks.
