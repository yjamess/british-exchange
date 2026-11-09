# QA — Housing Domain 07 "Inside the home" (EHS) · 2026-11-04

Independent checks of the English Housing Survey packages behind the cutaway (energy · damp/mould · hazards · space · condition). Read-only: no source or curated data rewritten.

## 1. Package integrity

| Indicator | Rows | Years | Suppressed | Missing | Raw checksums | Keys unique | ≤10k web cap | Result |
|---|---:|---|---:|---:|---|---|---|---|
| `ehs-decent-homes` | 4499 | 2006–2024 | 162 | 648 | ok | yes | yes | PASS |
| `ehs-category-1-hazards` | 3624 | 2008–2024 | 146 | 648 | ok | yes | yes | PASS |
| `ehs-damp-surveyor` | 3630 | 1996–2024 | 205 | 648 | ok | yes | yes | PASS |
| `ehs-energy-efficiency-bands` | 4608 | 2008–2024 | 233 | 0 | ok | yes | yes | PASS |
| `ehs-overcrowding` | 120 | 1993–2022 | 0 | 0 | ok | yes | yes | PASS |
| `ehs-under-occupation` | 120 | 1995–2024 | 0 | 0 | ok | yes | yes | PASS |
| `ehs-damp-mould-reported` | 24 | 2023–2023 | 0 | 0 | ok | yes | yes | PASS |

## 2. Spot checks vs published cells

| Indicator | Year | Geo | Selector | Raw cell | Curated | Result |
|---|---|---|---|---|---|---|
| `ehs-decent-homes` | 2024 | E92000001 | series=non-decent, tenure=all-tenures, dwelling-age=pre-1919 | `30.3` (DA3201 2024) | 30.3 | PASS |
| `ehs-decent-homes` | 2024 | E92000001 | series=non-decent, tenure=private-rented, dwelling-age=pre-1919 | `33.6` (DA3201 2024) | 33.6 | PASS |
| `ehs-decent-homes` | 2024 | E92000001 | series=fails-thermal-comfort, tenure=social-rented, dwelling-type=converted-flat | `6.6` (DA3201 2024) | 6.6 | PASS |
| `ehs-decent-homes` | 2015 | E92000001 | series=non-decent, tenure=all-tenures, dwelling-type=converted-flat | `35.7` (DA3201 2015) | 35.7 | PASS |
| `ehs-decent-homes` | 2015 | E92000001 | series=non-decent, tenure=social-rented, breakdown=none | `13.0` (DA3201 2015) | 13.0 | PASS |
| `ehs-decent-homes` | 2008 | E92000001 | series=non-decent, tenure=all-tenures, breakdown=none | `33.1` (DA3201 2008) | 33.1 | PASS |
| `ehs-decent-homes` | 2024 | E12000007 | series=non-decent, tenure=all-tenures | `13.1` (DA3202 2024) | 13.1 | PASS |
| `ehs-decent-homes` | 2024 | E12000007 | series=non-decent, tenure=private-rented | `16.8` (DA3202 2024) | 16.8 | PASS |
| `ehs-decent-homes` | 2015 | EHS-SNA-NORTHERN | series=non-decent, tenure=all-tenures | `20.0` (DA3202 2015) | 20.0 | PASS |
| `ehs-category-1-hazards` | 2024 | E92000001 | series=any-category-1-hazard, tenure=private-rented, dwelling-type=detached | `17.2` (DA4101 2024) | 17.2 | PASS |
| `ehs-category-1-hazards` | 2024 | E92000001 | series=excess-cold, tenure=all-tenures, breakdown=none | `2.5` (DA4101 2024) | 2.5 | PASS |
| `ehs-category-1-hazards` | 2021 | E92000001 | series=any-category-1-hazard, tenure=all-tenures, dwelling-age=pre-1919 | `26.3` (DA4101 2021) | 26.3 | PASS |
| `ehs-category-1-hazards` | 2024 | E92000001 | series=falls-on-stairs, tenure=all-tenures | `3.7` (ANNEX AT1_8) | 3.7 | PASS |
| `ehs-damp-surveyor` | 2024 | E92000001 | series=rising-damp, tenure=all-tenures, dwelling-age=pre-1919 | `5.0` (DA5101 2024) | 5.0 | PASS |
| `ehs-damp-surveyor` | 2024 | E92000001 | series=condensation-mould, tenure=private-rented, breakdown=none | `5.7` (DA5101 2024) | 5.7 | PASS |
| `ehs-damp-surveyor` | 2019 | E92000001 | series=any-damp, tenure=all-tenures, dwelling-type=converted-flat | `8.6` (DA5101 2019) | 8.6 | PASS |
| `ehs-damp-surveyor` | 1996 | E92000001 | series=any-damp, tenure=all-tenures | `12.8` (ANNEX AT1_9) | 12.8 | PASS |
| `ehs-damp-surveyor` | 2024 | E92000001 | series=any-damp, tenure=housing-association | `6.2` (ANNEX AT1_10) | 6.2 | PASS |
| `ehs-energy-efficiency-bands` | 2024 | E92000001 | series=band-a-b-c, tenure=all-tenures, dwelling-age=post-2013 | `93.8` (DA7101 2024) | 93.8 | PASS |
| `ehs-energy-efficiency-bands` | 2024 | E92000001 | series=band-a-b-c, tenure=local-authority | `71.4` (DA7101 2024) | 71.4 | PASS |
| `ehs-energy-efficiency-bands` | 2010 | E92000001 | series=band-d, tenure=all-tenures, breakdown=none | `46.9` (DA7101 2010) | 46.9 | PASS |
| `ehs-energy-efficiency-bands` | 2010 | E92000001 | series=band-c, tenure=all-tenures, breakdown=none | `11.7` (DA7101 2010) | 11.7 | PASS |
| `ehs-overcrowding` | 2022 | E92000001 | series=overcrowded, tenure=all-tenures, survey-year-label=2024-25 | `3.3` (ANNEX AT1_2) | 3.3 | PASS |
| `ehs-overcrowding` | 1993 | E92000001 | series=overcrowded, tenure=owner-occupied, survey-year-label=1995-96 | `1.8` (ANNEX AT1_2) | 1.8 | PASS |
| `ehs-under-occupation` | 2024 | E92000001 | series=under-occupied, tenure=all-tenures | `39.8` (ANNEX AT1_3) | 39.8 | PASS |
| `ehs-under-occupation` | 2020 | E92000001 | series=under-occupied, tenure=private-rented | `12.7` (ANNEX AT1_3) | 12.7 | PASS |
| `ehs-damp-mould-reported` | 2023 | E92000001 | series=resident-reports-damp-mould, tenure=private-rented | `46.5` (ANNEX AT1_11) | 46.5 | PASS |
| `ehs-energy-efficiency-bands` | 2008–2011 | any | series=band-a-b-c | not published (no A/B/C column) | 0 rows | PASS |
| `ehs-decent-homes` | 2008–2021 | England | dwelling-age/type × tenure | not published before 2022 | 0 rows | PASS |

## 3. Denominators and bases

Published `row-dwellings-000s` / `row-sample-unweighted` for mutually exclusive category sets vs the all-dwellings base (same table, same year). Tolerance: dwellings ±0.5% (independent rounding); samples exact.

| Indicator | Year | Set | Σ dwellings (000s) | All dwellings | Σ sample | All sample | Result |
|---|---|---|---:|---:|---:|---:|---|
| `ehs-decent-homes` | 2010 | dwelling-age-pre-2024 | 22,387 | 22,386 | 16,670 | 16,670 | PASS |
| `ehs-decent-homes` | 2010 | dwelling-type | 22,385 | 22,386 | 16,670 | 16,670 | PASS |
| `ehs-decent-homes` | 2010 | floor-area | 22,385 | 22,386 | 16,670 | 16,670 | PASS |
| `ehs-decent-homes` | 2010 | sub-national-area | 22,385 | 22,386 | 16,670 | 16,670 | PASS |
| `ehs-decent-homes` | 2019 | dwelling-age-pre-2024 | 24,414 | 24,414 | 12,300 | 12,300 | PASS |
| `ehs-decent-homes` | 2019 | dwelling-type | 24,413 | 24,414 | 12,300 | 12,300 | PASS |
| `ehs-decent-homes` | 2019 | floor-area | 24,415 | 24,414 | 12,300 | 12,300 | PASS |
| `ehs-decent-homes` | 2019 | sub-national-area | 24,414 | 24,414 | 12,300 | 12,300 | PASS |
| `ehs-decent-homes` | 2024 | dwelling-age-pre-2024 | 25,618 | 25,617 | 14,919 | 14,919 | PASS |
| `ehs-decent-homes` | 2024 | dwelling-type | 25,617 | 25,617 | 14,919 | 14,919 | PASS |
| `ehs-decent-homes` | 2024 | floor-area | 25,617 | 25,617 | 14,919 | 14,919 | PASS |
| `ehs-decent-homes` | 2024 | region | 25,616 | 25,617 | 14,919 | 14,919 | PASS |
| `ehs-damp-surveyor` | 2010 | dwelling-age-pre-2024 | 22,387 | 22,386 | 16,670 | 16,670 | PASS |
| `ehs-damp-surveyor` | 2010 | dwelling-type | 22,385 | 22,386 | 16,670 | 16,670 | PASS |
| `ehs-damp-surveyor` | 2010 | floor-area | 22,385 | 22,386 | 16,670 | 16,670 | PASS |
| `ehs-damp-surveyor` | 2010 | sub-national-area | 22,385 | 22,386 | 16,670 | 16,670 | PASS |
| `ehs-damp-surveyor` | 2019 | dwelling-age-pre-2024 | 24,414 | 24,414 | 12,300 | 12,300 | PASS |
| `ehs-damp-surveyor` | 2019 | dwelling-type | 24,413 | 24,414 | 12,300 | 12,300 | PASS |
| `ehs-damp-surveyor` | 2019 | floor-area | 24,415 | 24,414 | 12,300 | 12,300 | PASS |
| `ehs-damp-surveyor` | 2019 | sub-national-area | 24,414 | 24,414 | 12,300 | 12,300 | PASS |
| `ehs-damp-surveyor` | 2024 | dwelling-age-pre-2024 | 25,618 | 25,617 | 14,919 | 14,919 | PASS |
| `ehs-damp-surveyor` | 2024 | dwelling-type | 25,617 | 25,617 | 14,919 | 14,919 | PASS |
| `ehs-damp-surveyor` | 2024 | floor-area | 25,617 | 25,617 | 14,919 | 14,919 | PASS |
| `ehs-damp-surveyor` | 2024 | region | 25,616 | 25,617 | 14,919 | 14,919 | PASS |
| `ehs-energy-efficiency-bands` | 2010 | dwelling-age-pre-2024 | 22,387 | 22,386 | 16,670 | 16,670 | PASS |
| `ehs-energy-efficiency-bands` | 2010 | dwelling-type | 22,385 | 22,386 | 16,670 | 16,670 | PASS |
| `ehs-energy-efficiency-bands` | 2010 | floor-area | 22,385 | 22,386 | 16,670 | 16,670 | PASS |
| `ehs-energy-efficiency-bands` | 2010 | sub-national-area | 22,385 | 22,386 | 16,670 | 16,670 | PASS |
| `ehs-energy-efficiency-bands` | 2019 | dwelling-age-pre-2024 | 24,414 | 24,414 | 12,300 | 12,300 | PASS |
| `ehs-energy-efficiency-bands` | 2019 | dwelling-type | 24,413 | 24,414 | 12,300 | 12,300 | PASS |
| `ehs-energy-efficiency-bands` | 2019 | floor-area | 24,415 | 24,414 | 12,300 | 12,300 | PASS |
| `ehs-energy-efficiency-bands` | 2019 | sub-national-area | 24,414 | 24,414 | 12,300 | 12,300 | PASS |
| `ehs-energy-efficiency-bands` | 2024 | dwelling-age-pre-2024 | 25,618 | 25,617 | 14,919 | 14,919 | PASS |
| `ehs-energy-efficiency-bands` | 2024 | dwelling-type | 25,617 | 25,617 | 14,919 | 14,919 | PASS |
| `ehs-energy-efficiency-bands` | 2024 | floor-area | 25,617 | 25,617 | 14,919 | 14,919 | PASS |
| `ehs-energy-efficiency-bands` | 2024 | region | 25,616 | 25,617 | 14,919 | 14,919 | PASS |

EER band shares (A/B…G, published 1 dp) sum to 100 ±0.6 for 420 of 420 complete rows; 190 rows have a suppressed band so cannot be checked.

Overcrowding: 120/120 rows carry the pooled 3-year sample; every row is `observation-type=survey-estimate-3-year-average`, `base=households`; periods span 3 survey years. Manual cross-check: AT1.2 2022-23 (0.9 / 5.1 / 8.2 / 2.9 %) equals live table FA1422 'three year average 2020-21 to 2022-23' and FT1421 2021-22 equals AT1.2 2021-22 — confirms AT1.2 is a 3-year average. AT1.3 2022-23 under-occupation (40.1 %) differs from FA1422's 3-year average (38.8 %) — confirms AT1.3 is single-year.

## 4. Live tables vs 2024-25 annex (overlap years)

Values ingested from live tables (published later, July 2026); annex differences reported only.

- **ehs-decent-homes** vs AT1.4: 129 cells compared, 15 differ.
  - 2023 owner-occupied: annex 14.3 vs curated 14.2 (DA3201)
  - 2024 owner-occupied: annex 14.8 vs curated 14.7 (DA3201)
  - 2022 private-rented: annex 21.3 vs curated 21.2 (DA3201)
  - 2023 private-rented: annex 21.1 vs curated 21.0 (DA3201)
  - 2024 private-rented: annex 22.3 vs curated 22.1 (DA3201)
  - 2022 all-private: annex 15.5 vs curated 15.4 (DT3101)
  - 2023 all-private: annex 15.9 vs curated 15.8 (DT3101)
  - 2024 all-private: annex 16.5 vs curated 16.4 (DT3101)
  - 2023 local-authority: annex 12.1 vs curated 12.0 (DT3101)
  - 2024 local-authority: annex 11.7 vs curated 11.5 (DT3101)
  - 2023 housing-association: annex 9.3 vs curated 9.2 (DT3101)
  - 2024 social-rented: annex 10.2 vs curated 10.1 (DA3201)
  - 2022 all-tenures: annex 14.7 vs curated 14.6 (DA3201)
  - 2023 all-tenures: annex 15.0 vs curated 14.9 (DA3201)
  - 2024 all-tenures: annex 15.4 vs curated 15.3 (DA3201)
- **ehs-category-1-hazards** vs AT1.6: 119 cells compared, 0 differ.
- **ehs-damp-surveyor** vs AT1.9 (2008–2024): 59 cells compared, 2 differ.
  - 2010 rising-damp: annex 2.3 vs DA5101 2.4
  - 2010 any-damp: annex 6.5 vs DA5101 6.6
- **ehs-decent-homes** region 2024 vs AT1.5: 36 cells compared, 18 differ.
  - North East owner-occupied: annex 9.1 vs DA3202 9.0
  - North East all-tenures: annex 9.0 vs DA3202 8.9
  - Yorkshire and the Humber private-rented: annex 27.4 vs DA3202 26.8
  - Yorkshire and the Humber all-tenures: annex 17.8 vs DA3202 17.7
  - East Midlands social-rented: annex 12.2 vs DA3202 11.7
  - West Midlands owner-occupied: annex 14.6 vs DA3202 14.5
  - West Midlands social-rented: annex 11.7 vs DA3202 11.6
  - West Midlands all-tenures: annex 15.9 vs DA3202 15.8
  - East of England owner-occupied: annex 12.2 vs DA3202 12.0
  - East of England all-tenures: annex 12.8 vs DA3202 12.7
  - London private-rented: annex 16.9 vs DA3202 16.8
  - London social-rented: annex 11.7 vs DA3202 11.4
  - London all-tenures: annex 13.2 vs DA3202 13.1
  - South East owner-occupied: annex 16.2 vs DA3202 16.1
  - South East private-rented: annex 28.0 vs DA3202 27.4
  - South East all-tenures: annex 17.3 vs DA3202 17.1
  - South West owner-occupied: annex 18.0 vs DA3202 17.9
  - South West all-tenures: annex 18.4 vs DA3202 18.3

## 5. Sample size and suppression profile

EHS replaces estimates from unweighted cell counts of 1–4 with `u` (kept as `observation_status=suppressed`, no value). EHS does not publish standard errors in these tables; the published unweighted row base is carried in notes so the UI can caveat small bases. For 2022+ tenure-by-characteristic cells the base is the whole row (all tenures) — the tenure-specific base is smaller and unpublished. Where EHS does publish tenure × region bases (annex AT1.5, 2024) they fall to 112 (North West local authority) and 148–149 (North East LA / private rented).

| Indicator | Final values | Base < 200 | Base < 100 | Smallest published bases |
|---|---:|---:|---:|---|
| `ehs-decent-homes` | 3670 | 0 | 0 | 243 (2021 dwelling-type:purpose-built-flat-high-rise); 264 (2022 dwelling-type:purpose-built-flat-high-rise); 275 (2015 dwelling-type:purpose-built-flat-high-rise); 283 (2016 dwelling-type:purpose-built-flat-high-rise) |
| `ehs-category-1-hazards` | 2789 | 0 | 0 | 243 (2021 dwelling-type:purpose-built-flat-high-rise); 264 (2022 dwelling-type:purpose-built-flat-high-rise); 275 (2015 dwelling-type:purpose-built-flat-high-rise); 283 (2016 dwelling-type:purpose-built-flat-high-rise) |
| `ehs-damp-surveyor` | 2730 | 0 | 0 | 243 (2021 dwelling-type:purpose-built-flat-high-rise); 264 (2022 dwelling-type:purpose-built-flat-high-rise); 275 (2015 dwelling-type:purpose-built-flat-high-rise); 283 (2016 dwelling-type:purpose-built-flat-high-rise) |
| `ehs-energy-efficiency-bands` | 4375 | 0 | 0 | 243 (2021 dwelling-type:purpose-built-flat-high-rise); 264 (2022 dwelling-type:purpose-built-flat-high-rise); 275 (2015 dwelling-type:purpose-built-flat-high-rise); 283 (2016 dwelling-type:purpose-built-flat-high-rise) |

## 6. Audit — `ehs-heating` / `ehs-insulation` column location

The v1 `ehs_energy_anatomy` parser read fixed columns (DA6101 13+14 as condensing boilers; DA6201 1+2+4 as wall insulation and 16 as full double glazing). In most years those indexes hold other measures: DA6101 13 = 'instantaneous' water heating 2008–2022; DA6201 4 = 'non-cavity wall' 2008–2023 (v1 wall-insulation ≈78 % 2010–2023 vs ≈50 % published); DA6201 16 = 'none' glazing in 2014 (v1 5.1 %) and sample size in 2023. Housing fixed the parser the same day (header text per year). Validation re-checks the **fixed** output here with its own header lookup on the all-dwellings row:

| Year | condensing + condensing-combi (raw) | curated condensing-boiler | glazing 'all' (raw) | curated full-double-glazing | annex AT2.9 | wall-insulation rows | Result |
|---|---:|---:|---:|---:|---:|---|---|
| 2008 | 16.8 | 16.8 | 70.8 | 70.8 | 70.8 | — (no solid-wall-insulated column; none emitted) | PASS |
| 2009 | 24.2 | 24.2 | 72.9 | 72.9 | 72.9 | — (no solid-wall-insulated column; none emitted) | PASS |
| 2010 | 31.6 | 31.6 | 74.2 | 74.2 | 74.2 | — (no solid-wall-insulated column; none emitted) | PASS |
| 2011 | 37.9 | 37.9 | 76.3 | 76.3 | 76.3 | — (no solid-wall-insulated column; none emitted) | PASS |
| 2012 | 43.5 | 43.5 | 78.8 | 78.8 | 78.8 | — (no solid-wall-insulated column; none emitted) | PASS |
| 2013 | 48.7 | 48.7 | 80.0 | 80.0 | 80.0 | — (no solid-wall-insulated column; none emitted) | PASS |
| 2014 | 53.5 | 53.5 | 80.8 | 80.8 | 80.8 | — | PASS |
| 2015 | 58.8 | 58.8 | 81.4 | 81.4 | 81.4 | — (no solid-wall-insulated column; none emitted) | PASS |
| 2016 | 62.7 | 62.7 | 82.5 | 82.5 | 82.5 | — (no solid-wall-insulated column; none emitted) | PASS |
| 2017 | 66.3 | 66.3 | 84.6 | 84.6 | 84.6 | — (no solid-wall-insulated column; none emitted) | PASS |
| 2018 | 70.0 | 70.0 | 85.3 | 85.3 | 85.3 | — (no solid-wall-insulated column; none emitted) | PASS |
| 2019 | 73.8 | 73.8 | 85.8 | 85.8 | 85.8 | — (no solid-wall-insulated column; none emitted) | PASS |
| 2020 | 76.0 | 76.0 | 86.7 | 86.7 | 86.7 | — (no solid-wall-insulated column; none emitted) | PASS |
| 2021 | 77.6 | 77.6 | 87.5 | 87.5 | 87.5 | — (no solid-wall-insulated column; none emitted) | PASS |
| 2022 | 80.4 | 80.4 | 87.7 | 87.7 | 87.7 | — (no solid-wall-insulated column; none emitted) | PASS |
| 2023 | 81.0 | 81.0 | 88.5 | 88.5 | 88.5 | — (no solid-wall-insulated column; none emitted) | PASS |
| 2024 | 81.5 | 81.5 | 88.9 | 88.9 | 88.9 | 54.3 | PASS |

condensing-boiler remains a connector-derived sum of two published columns (`derived=` note on each row). DA6201 wall-insulation is emitted only for years that publish a 'solid wall insulated' column (2024); 2014 publishes the column but the all-tenures cell parses empty, so no row. Use `wall-insulation-annex` (AT2.9, published total) for the trend. Breakdowns by dwelling age / type / region for heating and insulation are published (DA6101/DA6102, DA6201/DA6202) but **not yet ingested**.

## Verdict

PASS — all integrity, spot, denominator and negative checks passed.
 Live-vs-annex differences (section 4) are not errors in ingestion: the January 2026 annex is 0.1–0.6 pp higher than the July 2026 live tables for Decent Homes 2022–2024 only (2008–2021 identical; hazards identical). Cause not stated by MHCLG — either a revision between releases or a different hazard model for the minimum-standard criterion (DT3101 is labelled '15 hazard model' and matches DA3201 exactly). Curated values follow the live tables and are not rewritten; the UI should cite the live table id on each row (`table=`). Two 2010 damp cells differ by 0.1 (AT1.9 vs DA5101).

Ready recommendation: `ehs-decent-homes`, `ehs-category-1-hazards`, `ehs-damp-surveyor`, `ehs-energy-efficiency-bands`, `ehs-overcrowding`, `ehs-under-occupation`, `ehs-damp-mould-reported` → **Ready** (sample QA vs official tables passed). `ehs-heating`, `ehs-insulation` → **Ready after same-day fix** (section 6 re-check passed); breakdowns for those two remain un-ingested.

