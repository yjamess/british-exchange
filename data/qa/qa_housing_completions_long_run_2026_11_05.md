# QA — housebuilding-completions-long-run · 2026-11-05

**Indicator:** `housebuilding-completions-long-run`
**Connector:** `uv run python -m housing.connectors.housebuilding_completions_long_run`
**Curated:** `data/housing/housebuilding-completions-long-run/curated/observations.csv` (600 rows; sha256 `a505e128…d0f0`)
**Owner check:** Housing ingest QA. Validation to counter-sign before Ready.

## Sources (retrieved 2026-11-05)

| File | Publisher release | sha256 | Coverage |
|---|---|---|---|
| [LiveTable244.ods](https://assets.publishing.service.gov.uk/media/6ab3e27a997a4b2950ccedf8/LiveTable244.ods) | 24 Sep 2026 (2026 Q2 release) | `dcab2c5b89b6a8c3405e99dbf7187600091ea77eb7d658e5edba495826778048` | England, 1946–2025, 320 rows |
| [Discontinued-LiveTable241.xlsx](https://assets.publishing.service.gov.uk/media/5d94affaed915d55461b180a/Discontinued-LiveTable241.xlsx) | 4 Jul 2019 (discontinued) | `70424e63e99c97f72329d4d77f9a7f7113292b05ce46dc0ae17c0bdbb57ca64c` | UK, 1949–2018, 280 rows (1946–48 are `..` in source) |

Landing page: https://www.gov.uk/government/statistical-data-sets/live-tables-on-house-building

## Checks

| Check | Result |
|---|---|
| Tenures (PE + HA + LA) sum to All | PASS within rounding. England: 57/80 years exact, 22 off by 10, 1 off by 20 (2011). UK: 46/70 exact, 23 off by 10, 1 off by 30 (2011). Source states totals may not equal the sum of components because of rounding to the nearest 10. |
| England ≤ UK every overlapping year (1949–2018) | PASS |
| Spot values vs source cells | PASS: England 1946 all 49,250; England 1968 all 352,540; England 2025 all 142,050 (provisional); UK 1953 all 326,820; UK 1954 all 354,130; UK 2018 all 198,930 (provisional). |
| Status flags | England 2025 `[r]; [p]` → provisional; 2023–24 `[r]` → final. UK 2018 `P` → provisional (frozen; never finalised in Table 241). |
| Overlap vs `housing-completions` (LT213 quarters summed to calendar years, England, all tenures) | **1978–1979 and 1990–2025: PASS** (difference 0–50; within rounding of four quarterly cells). **1980–1989: DIFFERENCE** — LT244 annual totals exceed the LT213 quarterly sum by 1,760 (1980) to 11,010 (1987); private enterprise accounts for most of it. Neither table explains the gap. The source note says earlier years are less reliable and definitions may not be consistent. Recorded, not corrected. The Time Machine should use one table per track and must not splice LT213 into LT244. |
| 2026 | Not in LT244 (calendar year incomplete); LT213 has 2026 Q1–Q2 only. Expected. |

## Definition notes

- New-build permanent dwellings only (building-control based). Not net additional dwellings; do not compare with `net-additional-dwellings` or score net-additions pledges against this series.
- England and UK are separate geographies in one package (`geography_code` E92000001 / K02000001). Do not splice.
- UK pre-2005 includes Northern Ireland data that used different definitions (source note 2).
- England Oct 2005–Mar 2007 omits a small number of approved-inspector completions (source note 3).
- Postgres release row is keyed on the first raw evidence (LT244 checksum); both files are listed in the manifest.

## Load

Loaded single package to Postgres 2026-11-05 (600 observations, release_id 1104, current) via `load_ready.upsert_indicator / upsert_release / replace_release_observations`. `GET /indicators/housebuilding-completions-long-run/observations` returns 600 rows; `?geography_code=K02000001&series=all-completions` returns 70 rows 1949–2018.

## Verdict

**PASS (with documented 1980s LT213/LT244 difference)** — ready for Validation counter-sign.
