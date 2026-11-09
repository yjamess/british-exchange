# Owner validation — housing atlas

Status: **owner checks pass; independent QA pending**. This report is not the independent Validation handoff and does not promote any indicator to Ready.

- Rechecked all 1,098,752 retained source measure cells against the archived CSV: exact numeric/null equality.
- Geography codes unique: 374 (360 local, 9 region, 4 nation, 1 UK).
- Shared contiguous month axis: 380 entries, January 1995–August 2026; every measure array is the same length.
- Populated values: 1,075,723; explicit null cells: 61,237.
- Rehashed both generated JSON outputs against the view manifest: pass.
- Re-ran the exporter and compared SHA-256 of both JSON files and the manifest: byte-identical deterministic regeneration passed.
- Tenure export has 35 complete 31 March snapshots, 1991–2025; maximum absolute official-total minus component-sum residual is 1000 dwellings.
- Source raw checksums were verified before generation; original retrieval and release timestamps are preserved. No network retrieval took place.
- The dataset remains experimental and is deliberately outside the Ready CSV catalogue. The geography boundary join and UI derived calculations require independent validation.

## Sample raw values

| Geography | Area | Month | Average price GBP | Sales count |
|---|---|---|---:|---:|
| N09000003 | Belfast | 2026-06 | 184768 | 374 |
| N09000003 | Belfast | 2026-08 | 184768 | missing |
| W06000015 | Cardiff | 1995-01 | 48615 | 224 |
| W06000015 | Cardiff | 2026-06 | 271437 | 291 |
| W06000015 | Cardiff | 2026-08 | 272443 | missing |
| S12000036 | City of Edinburgh | 2026-06 | 301434 | 909 |
| S12000036 | City of Edinburgh | 2026-08 | 301313 | missing |
| E09000033 | City of Westminster | 1995-01 | 141417 | 339 |
| E09000033 | City of Westminster | 2026-06 | 894417 | 104 |
| E09000033 | City of Westminster | 2026-08 | 887206 | missing |
| K02000001 | United Kingdom | 1995-01 | 51067 | missing |
| K02000001 | United Kingdom | 2026-06 | 270690 | 55159 |
| K02000001 | United Kingdom | 2026-08 | 273037 | missing |
