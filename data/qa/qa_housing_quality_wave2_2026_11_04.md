# QA — Housing Domain 07 'Housing quality' wave 2 · 2026-11-04

Independent checks (raw cells re-read by this script, not the connectors' parsers) of the EPC register statistics and the new / extended EHS packages. Read-only: no source or curated data rewritten. Script: `src/validation/qa_housing_quality_wave2_2026_11_04.py`.

## 1. Package integrity

| Indicator | Rows | Periods | Final | Suppressed | Missing | Raw checksums | Natural keys unique | Notes keys / obs-type | ≤10k web load | Result |
|---|---:|---|---:|---:|---:|---|---|---|---|---|
| `epc-domestic-lodgements` | 26244 | 2008-10…2026-07 | 26244 | 0 | 0 | ok | yes | ok | no — API filter required (not loaded by web) | PASS |
| `epc-domestic-lodgements-by-local-authority` | 216918 | 2008-10…2026-07 | 216918 | 0 | 0 | ok | yes | ok | no — API filter required (not loaded by web) | PASS |
| `ehs-heating` | 6246 | 2008-01…2024-01 | 6140 | 106 | 0 | ok | yes | ok | yes | PASS |
| `ehs-insulation` | 5547 | 2008-01…2024-01 | 5402 | 125 | 20 | ok | yes | ok | yes | PASS |
| `ehs-disrepair` | 5376 | 2008-01…2024-01 | 4053 | 27 | 1296 | ok | yes | ok | yes | PASS |
| `ehs-thermal-comfort` | 304 | 2023-04…2023-04 | 287 | 17 | 0 | ok | yes | ok | yes | PASS |
| `ehs-repairs-satisfaction` | 946 | 1994-04…2024-04 | 943 | 3 | 0 | ok | yes | ok | yes | PASS |
| `ehs-accessibility-adaptations` | 88 | 2009-01…2019-04 | 88 | 0 | 0 | ok | yes | ok | yes | PASS |

## 2. EPC domestic lodgements (administrative record)

- **Bands + not recorded = lodgements total** on every published row: 27018/27018 exact — PASS
- **England + Wales = England and Wales (quarters and years)**: 2403/2403 cells equal — PASS
- **Σ 9 regions + 'Unknown' = England (quarters)**: 1944/1944 cells equal — PASS
- **Σ local authorities (E + W + 'Unknown') = England and Wales, D1 quarters**: 648/648 cells equal — PASS
- Σ English LA codes + LA-sheet 'Unknown' vs England sheet: max |gap| 0; Σ Welsh LA codes vs Wales sheet: max |gap| 0 — PASS. The LA-sheet 'Unknown' (1,322 lodgements over 62 quarters) is English: it equals the region-sheet 'Unknown'.
- Region-sheet 'Unknown' (D1, England region not allocated) total 1,322 — kept as EPC-UNALLOCATED in `epc-domestic-lodgements` so Σ regions reconciles to England.
- **Σ four quarters = published calendar-year row** (country sheets): 1377/1377 — PASS
- **Σ all quarters = published cumulative '(Total)' row** (raw re-read):

  | Table | Area | Published (Total) lodgements | Σ curated quarters | Result |
  |---|---|---:|---:|---|
  | D1 | England_and_Wales | 30,199,015 | 30,199,015 | PASS |
  | D1 | England_Only | 28,657,210 | 28,657,210 | PASS |
  | D1 | Wales_Only | 1,541,805 | 1,541,805 | PASS |
  | D1 | London (region sheet) | 4,601,583 | 4,601,583 | PASS |
  | EB1 | England_and_Wales | 26,696,166 | 26,696,166 | PASS |
  | EB1 | England_Only | 25,284,349 | 25,284,349 | PASS |
  | EB1 | Wales_Only | 1,411,817 | 1,411,817 | PASS |
  | EB1 | London (region sheet) | 4,029,891 | 4,029,891 | PASS |
  | NB1 | England_and_Wales | 3,502,849 | 3,502,849 | PASS |
  | NB1 | England_Only | 3,372,861 | 3,372,861 | PASS |
  | NB1 | Wales_Only | 129,988 | 129,988 | PASS |
  | NB1 | London (region sheet) | 571,692 | 571,692 | PASS |
- **Existing (EB1) + new (NB1) = all dwellings (D1)**, country + region cells: 8658/8658 equal — PASS

**Random spot checks vs raw cells (seeded)**

| Table | Sheet | Raw row | Series | Raw | Curated | Result |
|---|---|---|---|---:|---:|---|
| D1 | England_and_Wales | 2024 2024/3 | band-c | 185,548 | 185,548 | PASS |
| D1 | Wales_Only | 2014 2014/4 | band-e | 5,134 | 5,134 | PASS |
| D1 | by_Region | West Midlands 2010/2 | lodgements-total | 41,470 | 41,470 | PASS |
| D1 | by_LA | E07000041 2009/1 | band-f | 74 | 74 | PASS |
| D1 | by_LA | E07000224 2011/3 | band-not-recorded | 0 | 0 | PASS |
| D1 | by_LA | E07000198 2020/3 | band-a | 0 | 0 | PASS |
| EB1 | England_Only | 2019 2019/1 | band-f | 7,853 | 7,853 | PASS |
| EB1 | by_Region | East of England 2016/1 | band-g | 522 | 522 | PASS |
| NB1 | England_and_Wales | 2026 2026/2 | band-b | 34,757 | 34,757 | PASS |
| NB1 | by_Region | West Midlands 2022/4 | band-g | 0 | 0 | PASS |

- LA coverage: 349 area codes in total; 339 LAs in 2008-10, 318 in 2026-07. Codes starting after 2008 Q4: {'2020-04-01': 1, '2021-04-01': 2, '2023-04-01': 4, '2025-10-01': 2}; codes ending before 2026-07: {'2020-01-01': 4, '2021-01-01': 7, '2023-01-01': 17, '2025-10-01': 2}. These are LA reorganisations (codes as at lodgement) — **discontinuity**: an LA series is not a fixed geography across 2019/2020/2021/2023, and the 2025 Barnsley / Sheffield boundary change (E08000016→E08000038, E08000019→E08000039) has old and new codes both present in 2025 Q4.
- D1 rows with zero lodgements in a quarter (published 0, kept): 0.

## 3. EHS DA tables — spot checks vs published cells

| Indicator | Year | Selector | Raw cell | Curated | Result |
|---|---|---|---:|---:|---|
| `ehs-heating` | 2024 | series=central-heating, breakdown=dwelling-age, category=dwelling-age:pre-1919, tenure=all-tenures, geography_code=E92000001 | `93.2` (DA6101) | 93.2 | PASS |
| `ehs-heating` | 2024 | series=communal-heating, breakdown=dwelling-type, category=dwelling-type:purpose-built-flat-high-rise, geography_code=E92000001, tenure=all-tenures | `44.7` (DA6101) | 44.7 | PASS |
| `ehs-heating` | 2024 | series=heat-pump, breakdown=dwelling-type, category=dwelling-type:detached, geography_code=E92000001, tenure=all-tenures | `3.8` (DA6101) | 3.8 | PASS |
| `ehs-heating` | 2012 | series=storage-heaters, breakdown=floor-area, category=floor-area:under-50m2, geography_code=E92000001, tenure=all-tenures | `24.1` (DA6101) | 24.1 | PASS |
| `ehs-heating` | 2015 | series=boiler-condensing-combi, breakdown=none, tenure=social-rented, geography_code=E92000001 | `51.0` (DA6101) | 51.0 | PASS |
| `ehs-heating` | 2024 | series=main-fuel-gas, breakdown=region, geography_code=E12000007, tenure=all-tenures | `84.1` (DA6102) | 84.1 | PASS |
| `ehs-heating` | 2016 | series=main-fuel-electricity, breakdown=sub-national-area, geography_code=EHS-SNA-NORTHERN, tenure=all-tenures | `5.7` (DA6102) | 5.7 | PASS |
| `ehs-insulation` | 2024 | series=solid-wall-uninsulated, breakdown=dwelling-age, category=dwelling-age:pre-1919, geography_code=E92000001, tenure=all-tenures | `78.5` (DA6201) | 78.5 | PASS |
| `ehs-insulation` | 2024 | series=glazing-none, breakdown=dwelling-type, category=dwelling-type:converted-flat, geography_code=E92000001, tenure=all-tenures | `10.4` (DA6201) | 10.4 | PASS |
| `ehs-insulation` | 2024 | series=loft-depth-none, breakdown=dwelling-type, category=dwelling-type:converted-flat, geography_code=E92000001, tenure=all-tenures | `2.9` (DA6201) | 2.9 | PASS |
| `ehs-insulation` | 2009 | series=loft-depth-200mm-plus, breakdown=dwelling-age, category=dwelling-age:1945-1964, geography_code=E92000001, tenure=all-tenures | `27.5` (DA6201) | 27.5 | PASS |
| `ehs-insulation` | 2018 | series=cavity-insulated, breakdown=floor-area, category=floor-area:110m2-plus, geography_code=E92000001, tenure=all-tenures | `35.5` (DA6201) | 35.5 | PASS |
| `ehs-insulation` | 2024 | series=full-double-glazing, breakdown=region, geography_code=E12000001, tenure=all-tenures | `96.1` (DA6202) | 96.1 | PASS |
| `ehs-insulation` | 2012 | series=no-loft, breakdown=sub-national-area, geography_code=EHS-SNA-REST-OF-ENGLAND, tenure=all-tenures | `8.3` (DA6202) | 8.3 | PASS |
| `ehs-disrepair` | 2024 | series=repair-cost-gbp-over-65-per-m2, breakdown=dwelling-age, category=dwelling-age:pre-1919, tenure=private-rented, geography_code=E92000001 | `24.4` (DA5201) | 24.4 | PASS |
| `ehs-disrepair` | 2024 | series=no-basic-repair-costs, breakdown=none, tenure=all-tenures, geography_code=E92000001 | `42.9` (DA5201) | 42.9 | PASS |
| `ehs-disrepair` | 2012 | series=all-5-electrical-safety-features, breakdown=none, tenure=private-rented, geography_code=E92000001 | `54.8` (DA5201) | 54.8 | PASS |
| `ehs-disrepair` | 2023 | series=repair-cost-gbp-35-65-per-m2, breakdown=region, geography_code=E12000007, tenure=all-tenures | `6.8` (DA5202) | 6.8 | PASS |

## 4. EHS DA tables — denominators, sums, derived series, skipped rows

Published `row-dwellings-000s` / `row-sample-unweighted` for mutually exclusive category sets vs the all-dwellings row (same table, year). Tolerance: dwellings ±0.5%; samples exact.

| Indicator | Year | Set | Σ dwellings (000s) | All dwellings | Σ sample | All sample | Result |
|---|---|---|---:|---:|---:|---:|---|
| `ehs-heating` | 2010 | dwelling-age (6) | 22,387 | 22,386 | 16,670 | 16,670 | PASS |
| `ehs-heating` | 2010 | dwelling-type (8) | 22,385 | 22,386 | 16,670 | 16,670 | PASS |
| `ehs-heating` | 2010 | floor-area (5) | 22,385 | 22,386 | 16,670 | 16,670 | PASS |
| `ehs-heating` | 2010 | sub-national-area (3) | 22,385 | 22,386 | 16,670 | 16,670 | PASS |
| `ehs-heating` | 2019 | dwelling-age (6) | 24,414 | 24,414 | 12,300 | 12,300 | PASS |
| `ehs-heating` | 2019 | dwelling-type (8) | 24,413 | 24,414 | 12,300 | 12,300 | PASS |
| `ehs-heating` | 2019 | floor-area (5) | 24,415 | 24,414 | 12,300 | 12,300 | PASS |
| `ehs-heating` | 2019 | sub-national-area (3) | 24,414 | 24,414 | 12,300 | 12,300 | PASS |
| `ehs-heating` | 2024 | dwelling-age (8) | 25,618 | 25,617 | 14,919 | 14,919 | PASS |
| `ehs-heating` | 2024 | dwelling-type (8) | 25,617 | 25,617 | 14,919 | 14,919 | PASS |
| `ehs-heating` | 2024 | floor-area (5) | 25,617 | 25,617 | 14,919 | 14,919 | PASS |
| `ehs-heating` | 2024 | region (9) | 25,616 | 25,617 | 14,919 | 14,919 | PASS |
| `ehs-insulation` | 2010 | dwelling-age (6) | 22,387 | 22,386 | 16,670 | 16,670 | PASS |
| `ehs-insulation` | 2010 | dwelling-type (8) | 22,385 | 22,386 | 16,670 | 16,670 | PASS |
| `ehs-insulation` | 2010 | floor-area (5) | 22,385 | 22,386 | 16,670 | 16,670 | PASS |
| `ehs-insulation` | 2010 | sub-national-area (3) | 22,385 | 22,386 | 16,670 | 16,670 | PASS |
| `ehs-insulation` | 2019 | dwelling-age (6) | 24,414 | 24,414 | 12,300 | 12,300 | PASS |
| `ehs-insulation` | 2019 | dwelling-type (8) | 24,413 | 24,414 | 12,300 | 12,300 | PASS |
| `ehs-insulation` | 2019 | floor-area (5) | 24,415 | 24,414 | 12,300 | 12,300 | PASS |
| `ehs-insulation` | 2019 | sub-national-area (3) | 24,414 | 24,414 | 12,300 | 12,300 | PASS |
| `ehs-insulation` | 2024 | dwelling-age (8) | 25,618 | 25,617 | 14,919 | 14,919 | PASS |
| `ehs-insulation` | 2024 | dwelling-type (8) | 25,617 | 25,617 | 14,919 | 14,919 | PASS |
| `ehs-insulation` | 2024 | floor-area (5) | 25,617 | 25,617 | 14,919 | 14,919 | PASS |
| `ehs-insulation` | 2024 | region (9) | 25,616 | 25,617 | 14,919 | 14,919 | PASS |
| `ehs-disrepair` | 2010 | dwelling-age (6) | 22,387 | 22,386 | 16,670 | 16,670 | PASS |
| `ehs-disrepair` | 2010 | dwelling-type (8) | 22,385 | 22,386 | 16,670 | 16,670 | PASS |
| `ehs-disrepair` | 2010 | floor-area (5) | 22,385 | 22,386 | 16,670 | 16,670 | PASS |
| `ehs-disrepair` | 2010 | sub-national-area (3) | 22,385 | 22,386 | 16,670 | 16,670 | PASS |
| `ehs-disrepair` | 2019 | dwelling-age (6) | 24,414 | 24,414 | 12,300 | 12,300 | PASS |
| `ehs-disrepair` | 2019 | dwelling-type (8) | 24,413 | 24,414 | 12,300 | 12,300 | PASS |
| `ehs-disrepair` | 2019 | floor-area (5) | 24,415 | 24,414 | 12,300 | 12,300 | PASS |
| `ehs-disrepair` | 2019 | sub-national-area (3) | 24,414 | 24,414 | 12,300 | 12,300 | PASS |
| `ehs-disrepair` | 2024 | dwelling-age (6) | 25,618 | 25,617 | 14,919 | 14,919 | PASS |
| `ehs-disrepair` | 2024 | dwelling-type (8) | 25,617 | 25,617 | 14,919 | 14,919 | PASS |
| `ehs-disrepair` | 2024 | floor-area (5) | 25,617 | 25,617 | 14,919 | 14,919 | PASS |
| `ehs-disrepair` | 2024 | region (9) | 25,616 | 25,617 | 14,919 | 14,919 | PASS |

- Heating: central + storage + room heaters = 100 ±0.3 for 594/594 complete rows (15 rows have a suppressed component) — PASS
- Heating: derived `condensing-boiler` = boiler-condensing + boiler-condensing-combi on 605/605 rows (derived= flag on each) — PASS
- Disrepair: five repair-cost bands sum to 100 ±0.5 on 668/668 complete rows — PASS
- Disrepair 'N/A' cells kept as missing, by year: {'2020': 240, '2021': 240, '2022': 816} — 2020–2022 not collected (no full internal inspection, COVID-19). **Discontinuity:** 2019 → 2023 only.
- Insulation: DA6201 full-double-glazing (all tenures) = annex AT2.9 in 17/17 years — PASS
- DA6201 vs DA6202 all-dwellings 'no loft' cell identical in 4/4 sampled years (areas table is the same survey) — PASS

**Published rows not ingested (mislabelled in source):**
- DA6102 2008: the third sub-national-area row carries the footnote text as its label ('room heating includes fixed heaters/fires and non-fixed heat…'), sample size blank. Its dwellings (000s) 9,023 + Northern + London & SE = 22,240 vs all dwellings 22,239 — consistent with 'Rest of England', but the label is not inferred: row left out, `Rest of England` 2008 absent for heating/insulation.
- DA6202 2008: the third sub-national-area row carries the footnote text as its label ('non-cavity walls are predominantly brick and stone solid wal…'), sample size blank. Its dwellings (000s) 9,023 + Northern + London & SE = 22,240 vs all dwellings 22,239 — consistent with 'Rest of England', but the label is not inferred: row left out, `Rest of England` 2008 absent for heating/insulation.
- DA5201 2022 repeats tenure as rows inside the tenure column blocks (every cell N/A) — skipped as structurally redundant.

## 5. `ehs-thermal-comfort` (survey-response)

| Selector | Raw cell | Curated | Result |
|---|---:|---:|---|
| AT_2_9 able to keep warm during winter / no col 3 → series=unable-to-keep-warm-in-winter, tenure=private-rented, breakdown=none | `21.1` | 21.1 | PASS |
| AT_2_9 able to keep warm during winter / no col 4 → series=unable-to-keep-warm-in-winter, tenure=local-authority, breakdown=none | `24.9` | 24.9 | PASS |
| AT_2_9 reduce heating / mentioned col 7 → series=reduced-heating, tenure=all-tenures, breakdown=none | `62.5` | 62.5 | PASS |
| AT_2_11 rooms affected by overheating / attic rooms col 4 → series=overheating-room-attic-rooms, tenure=local-authority | `u` | suppressed | PASS |
| AT_2_13 household contains children aged below 5 / unable to keep warm during winter col 5 → series=unable-to-keep-warm-in-winter, tenure=housing-association, breakdown=household-composition | `25.0` | 25.0 | PASS |
| AT1_1 construction type / steel frame col 3 → series=home-gets-uncomfortably-hot, tenure=private-rented, breakdown=construction-type, category=construction-type:steel-frame | `26.3` | 26.3 | PASS |
| AT1_2 dwelling type / converted flat col 4 → series=unable-to-keep-warm-in-winter, tenure=social-rented, breakdown=dwelling-type, category=dwelling-type:converted-flat | `42.1` | 42.1 | PASS |
| AT1_2 dwelling type / detached house col 4 → series=unable-to-keep-warm-in-winter, tenure=social-rented, breakdown=dwelling-type, category=dwelling-type:detached | `u` | suppressed | PASS |
| AT1_3 tenure / private rented col 5 → series=both-overheating-and-unable-to-keep-warm, tenure=private-rented, breakdown=none | `3.0` | 3.0 | PASS |

- PIQ AT2.9 (households) vs weather AT1.1/AT1.2 all-dwellings rows (occupied dwellings): 8/8 identical — same respondents, two base labels; the weather total rows are not ingested to avoid duplicates — PASS
- Weather AT1.3: neither + overheating only + cold only + both = 100 ±0.2 on 13/14 rows (rows with a 'u' cannot be checked) — PASS
- AT1.3 overheating-only + both vs AT1.1 total; cold-only + both vs AT1.2 total: owner-occupied: 13.2 vs 13.1, 8.1 vs 8.1; private-rented: 11.2 vs 11.1, 21.3 vs 21.1; social-rented: 10.6 vs 10.6, 23.0 vs 22.9; all-tenures: 12.4 vs 12.4, 12.9 vs 12.9. Largest gap 0.2 pp — AT1.3 needs a valid answer to *both* questions (don't-know on either excluded), so its base is slightly smaller; gaps ≤0.25 pp accepted as base + rounding — PASS
- Complements not emitted (AT2.9 'yes'/'no' pairs) sum to 100 in 12/12 raw cells — PASS
- **Source anomaly:** weather AT1.2 detached house, all dwellings: thousands `4,190` but share `5.7%`; AT1.3 gives 4,422k detached occupied dwellings, so 5.7% ≈ 252k, and the owner-occupied + private-rented cells are 208k + 43k. The published 4,190 is inconsistent (likely a transposed total). Percentages kept; that row's `dwellings-000s` note is the published figure and must not be used.
- Unweighted bases on rows that carry one: {'≥100': 214, '<100': 24, '<30': 10}. Smallest are owner-occupied / private-rented cells for concrete boxwall / other concrete and purpose-built high-rise (italicised 'indicative' in source).

## 6. `ehs-repairs-satisfaction` (survey-response)

| Selector | Raw cell | Curated | Result |
|---|---:|---:|---|
| FT5421 local authority renters 2024-25 col 7 | `32.8` | 32.8 | PASS |
| FT5421 housing association renters 1994-95 col 1 | `49.3` | 49.3 | PASS |
| FT5421 all private renters 2008-093 col 3 | `68.7` | 68.7 | PASS |
| FT5421 all social renters 2015-16 col 4 | `8.6` | 8.6 | PASS |
| AT_3_1 damp present / dissatisfied col 4 | `56.9` | 56.9 | PASS |
| AT_3_1 damp present / neither satisfied nor dissatisfied col 2 | `u` | suppressed | PASS |
| AT_3_2 estate agent or property manager responsible for repairs / dissatisfied col 2 | `27.6` | 27.6 | PASS |
| AT_3_3 reason / landlord slow to get things done col 2 | `36.9` | 36.9 | PASS |

- FT5421: very + fairly = all satisfied and slightly + very = all dissatisfied (±0.2) in 107/112 tenure-years; the exceptions are all in survey years ['2001', '2002'] (SEH; published components rounded to whole numbers): 2001 housing-association -1.0/+0.0; 2001 local-authority -1.0/+0.0; 2002 housing-association -1.7/-0.6; 2002 local-authority -0.5/-0.2; 2002 social-rented -0.9/-0.4 — PASS (source rounding, kept as published)
- FT5421: 100 − (satisfied + neither + dissatisfied) ranges -0.0 to 6.6 pp — the residual is table note 1 (households where no repairs were done or repairs were not the landlord's responsibility are in the total). Never negative — PASS
- PIQ AT3.1: satisfied + neither + dissatisfied = 100 ±0.2 in 34/34 complete groups — PASS
- Base difference (not an error): 2024-25 private renters satisfied — FT5421 72.6% (all renting households, full household sample) vs PIQ AT3.1 67.5% (excludes landlord-not-responsible, household subsample). Kept as separate keys (breakdown=none vs housing-quality:all-households).
- FT5421 'all private renters' prints a values row with no year label between 2007-08 and a value-less '2008-09' label row, then '2008-09³' (note 3). The unlabelled row (42.5 / 29.0 / 71.5 … 2,423k) is not ingested; 2008-09 private renters = the '2008-09³' row. **Discontinuity** 2007-08 (SEH) → 2008-09 (EHS).

## 7. `ehs-accessibility-adaptations`

| Selector | Raw cell | Curated | Result |
|---|---:|---:|---|
| AT2 housing association / level access to main entrance | `38.4453` | 38.4 | PASS |
| AT1 all dwellings / all four accessibility features | `4.5133` | 4.5 | PASS |
| AT2 private rented / wc at entrance level? | `60.6731` | 60.7 | PASS |
| AT1_3 tenure / private renters col 8 | `24.9` | 24.9 | PASS |
| AT3_1 age / 75 or over col 2 | `35.6` | 35.6 | PASS |
| AT1_1 required adaptation(s) / yes col 3 | `8.2` | 8.2 | PASS |

- AT1.3 suitable + unsuitable and AT3.1 lack + all installed = 100 in 36/36 raw cells (complements not emitted) — PASS
- **Discontinuity / age:** accessibility features 2009 and 2018 only; adaptations 2014-15 and 2019-20 only. No later EHS accessibility or adaptations tables are published (checked gov.uk EHS collection, 2026-11-04).

## 8. Not published / not ingested / needs access

- **EPC certificate-level data** (England and Wales): get-energy-performance-data.communities.gov.uk (and the redirected epc.opendatacommunities.org) requires a GOV.UK One Login account for bulk CSV / API — **not registered, not used**. A stock view (latest valid certificate per dwelling) needs a separate pipeline: certificate lifecycle (10-year validity, expiry), supersession / repeat lodgements, UPRN / address matching to the dwelling stock, transaction-type and tenure fields, and licence terms (address data). The aggregate live tables ingested here count lodgements, not dwellings.
- **Scotland**: the Scottish EPC Register publishes quarterly *certificate-level* extracts (via the Scottish Government's open data portal); no aggregate domestic-EPC-by-band statistical table comparable to D1 was found. Aggregating certificates would be a derived pipeline (same lifecycle issues) — not ingested. Scottish House Condition Survey EPC-band estimates are a survey measure (comparable to EHS, not to D1) — out of scope for this wave.
- EB1 / NB1 by local authority, D2 (environmental impact rating), D3 (floor area / energy use / CO₂ / fuel cost), D4a/D4b (transaction type × tenure): published, not ingested.
- DA6101 solid fuel / biomass / water heating / standard, back and combination boilers; DA6201 'other' wall type and intermediate loft depths / glazing extents; DA5201 mean repair cost (£/m²) and the four other electrical features; DA6103/DA6203/DA5203 household tables: published, not ingested (kept heating/insulation under the 10k web load).
- DA7104 (energy performance by heating / insulation characteristics), DA1101 stock profile (construction type distribution — Stock & Tenure scope): published, not ingested. Construction (wall) type appears here only as a condition breakdown of thermal comfort (weather AT1.1/1.2).
- FA5431 / FA5441 (repairs satisfaction by respondent characteristics; main reason, live table) and FA5401 (satisfaction with accommodation): published, not ingested this wave.

## Verdict

**PASS** — all integrity, reconciliation, spot, sum and denominator checks passed.

Source issues recorded (not errors in ingestion; source data not rewritten):
- DA6102 2008 'Rest of England' row mislabelled in source — not ingested
- DA6202 2008 'Rest of England' row mislabelled in source — not ingested
- Weather AT1.2 detached/all-dwellings thousands (4,190) inconsistent with its share — published value carried in notes only
- FT5421 private renters: unlabelled 2008-09 values row not ingested (ambiguous label)

Ready recommendation: `epc-domestic-lodgements`, `epc-domestic-lodgements-by-local-authority`, `ehs-heating` and `ehs-insulation` (breakdowns), `ehs-disrepair`, `ehs-thermal-comfort`, `ehs-repairs-satisfaction`, `ehs-accessibility-adaptations` → **Ready** if the verdict above is PASS.
