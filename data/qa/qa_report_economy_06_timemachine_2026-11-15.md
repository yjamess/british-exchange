# QA report — Economy 06 Tax Time Machine history pin · 2026-11-15

## Scope

- Indicator: `tax-machine-income-tax-history`
- Package: `data/economy/tax-machine-income-tax-history/`
- Handover: `docs/handover-economy-06-timemachine.md`
- Kickoff: `docs/agent-kickoff-validation-economy-06-timemachine.md`
- Script: `validation.qa_economy_06_timemachine_2026_11_15`
- Vintage: raw `2026-11-15` · years **2010–11…2026–27**
- Related Ready pin (read-only): `data/economy/tax-machine-rules/` · `tax-machine-income-tax-rules`

## Independence

Disk raw + curated only. HMRC ODS re-parsed with stdlib zip/XML
(Validation reimplementation — not Economy connector imports).
Spot cells vs Tables A.1 / A.2 / A.4 and GOV.UK HTML.
Overlap years vs Ready pin curated tables. No curated/raw rewrites.

## Checks

| ID | Check | Result | Notes |
|----|-------|--------|-------|
| C1 | checksum table_a2_rates.ods | **pass** | manifest=True SHA256SUMS=True disk=31281efc152adf8c |
| C1 | checksum table_a1_allowances.ods | **pass** | manifest=True SHA256SUMS=True disk=5b91e2bb93f0bc69 |
| C1 | checksum table_a4_nics.ods | **pass** | manifest=True SHA256SUMS=True disk=0928355419d32ea4 |
| C1 | checksum income_tax_rates.html | **pass** | manifest=True SHA256SUMS=True disk=4bc1dcf24bf378b2 |
| C1 | checksum nics_rates.html | **pass** | manifest=True SHA256SUMS=True disk=c930011e4ed5f660 |
| C1 | checksum rates_of_income_landing.html | **pass** | manifest=True SHA256SUMS=True disk=1311f8903a6786ea |
| C1 | checksum allowances_landing.html | **pass** | manifest=True SHA256SUMS=True disk=857c87b7a7d75de1 |
| C1 | checksum nics_stats_landing.html | **pass** | manifest=True SHA256SUMS=True disk=904b41a8f4691ac8 |
| C2 | E/W/NI year span 2010-11…2026-27 | **pass** | n=17 first=2010-11 last=2026-27 |
| C2 | Scotland rows for all years (labelled) | **pass** | n=17 |
| C2 | jurisdictions E/W/NI + Scotland | **pass** | england-wales-ni,scotland |
| C3 | E/W/NI 2010-11 basic | **pass** | ODS→(0,37400 @20%) curated→(0,37400 @20%) |
| C3 | E/W/NI 2010-11 higher | **pass** | ODS→(37401,150000 @40%) curated→(37401,150000 @40%) |
| C3 | E/W/NI 2010-11 additional | **pass** | ODS→(150001,open @50%) curated→(150001,open @50%) |
| C3 | E/W/NI 2015-16 basic | **pass** | ODS→(0,31785 @20%) curated→(0,31785 @20%) |
| C3 | E/W/NI 2015-16 higher | **pass** | ODS→(31786,150000 @40%) curated→(31786,150000 @40%) |
| C3 | E/W/NI 2015-16 additional | **pass** | ODS→(150001,open @45%) curated→(150001,open @45%) |
| C3 | E/W/NI 2023-24 basic | **pass** | ODS→(0,37700 @20%) curated→(0,37700 @20%) |
| C3 | E/W/NI 2023-24 higher | **pass** | ODS→(37701,125140 @40%) curated→(37701,125140 @40%) |
| C3 | E/W/NI 2023-24 additional | **pass** | ODS→(125141,open @45%) curated→(125141,open @45%) |
| C3 | E/W/NI 2025-26 basic | **pass** | ODS→(0,37700 @20%) curated→(0,37700 @20%) |
| C3 | E/W/NI 2025-26 higher | **pass** | ODS→(37701,125140 @40%) curated→(37701,125140 @40%) |
| C3 | E/W/NI 2025-26 additional | **pass** | ODS→(125141,open @45%) curated→(125141,open @45%) |
| C4 | PA 2010-11 | **pass** | A.1=6475 curated=6475 |
| C4 | PA 2015-16 | **pass** | A.1=10600 curated=10600 |
| C4 | PA 2023-24 | **pass** | A.1=12570 curated=12570 |
| C4 | PA 2025-26 | **pass** | A.1=12570 curated=12570 |
| C5 | Scotland gap 2017-18 (no silent fill) | **pass** | rows=1 status=gap_awaiting_clean_pin band_id=gap |
| C5 | Scotland gap 2018-19 (no silent fill) | **pass** | rows=1 status=gap_awaiting_clean_pin band_id=gap |
| C5 | Scotland gap 2019-20 (no silent fill) | **pass** | rows=1 status=gap_awaiting_clean_pin band_id=gap |
| C5 | Scotland gap 2020-21 (no silent fill) | **pass** | rows=1 status=gap_awaiting_clean_pin band_id=gap |
| C5 | Scotland gap 2021-22 (no silent fill) | **pass** | rows=1 status=gap_awaiting_clean_pin band_id=gap |
| C5 | Scotland gap 2022-23 (no silent fill) | **pass** | rows=1 status=gap_awaiting_clean_pin band_id=gap |
| C5 | Scotland 2010–16 mirror 2010-11 | **pass** | labelled pre_divergence_mirrors_ewni + same bands |
| C5 | Scotland 2010–16 mirror 2011-12 | **pass** | labelled pre_divergence_mirrors_ewni + same bands |
| C5 | Scotland 2010–16 mirror 2012-13 | **pass** | labelled pre_divergence_mirrors_ewni + same bands |
| C5 | Scotland 2010–16 mirror 2013-14 | **pass** | labelled pre_divergence_mirrors_ewni + same bands |
| C5 | Scotland 2010–16 mirror 2014-15 | **pass** | labelled pre_divergence_mirrors_ewni + same bands |
| C5 | Scotland 2010–16 mirror 2015-16 | **pass** | labelled pre_divergence_mirrors_ewni + same bands |
| C5 | Scotland 2010–16 mirror 2016-17 | **pass** | labelled pre_divergence_mirrors_ewni + same bands |
| C5 | Scotland 2026-27 starter vs GOV.UK HTML | **pass** | curated upper=3967 html Up to £3,967 rate=19% status=pinned_govuk_after_allowance |
| C5 | Scotland 2025-26 starter vs GOV.UK HTML | **pass** | curated upper=2827 html Up to £2,827 rate=19% status=pinned_govuk_after_allowance |
| C5 | Scotland 2024-25 starter vs GOV.UK HTML | **pass** | curated upper=2306 html Up to £2,306 rate=19% status=pinned_govuk_after_allowance |
| C5 | Scotland 2023-24 starter vs GOV.UK HTML | **pass** | curated upper=2162 html Up to £2,162 rate=19% status=pinned_govuk_after_allowance |
| C5 | Scotland 2023-24 top rate 47% | **pass** | curated=47 |
| C5 | Scotland 2025-26 top rate 48% | **pass** | curated=48 |
| C5 | Scotland 2026-27 top rate 48% | **pass** | curated=48 |
| C5 | coverage_inventory Scotland gaps | **pass** | gaps=['2017-18', '2018-19', '2019-20', '2020-21', '2021-22', '2022-23'] |
| C6 | NICs separate stage (file, not blended) | **pass** | employee_class1_nics.csv; bands header clean |
| C6 | NICs weekly↔A.4 2015-16 | **pass** | PT=155 UEL=815 main=12.0% x52 ok=True |
| C6 | NICs weekly↔A.4 2025-26 | **pass** | PT=242 UEL=967 main=8.0% x52 ok=True |
| C6 | NICs intra-year not invented 2022-23 | **pass** | status=intra_year_change main_parsed='' published_main='13.25%/12% (note 16)' |
| C6 | NICs intra-year not invented 2023-24 | **pass** | status=intra_year_change main_parsed='' published_main='12%/10% (note 20)' |
| C7 | fiscal drag deferred | **pass** | status=deferred examples=None |
| C7 | no Ready / frontend claim | **pass** | Time Machine history pin. Validation-ready, not Ready. No UI. |
| C7 | no Time Machine UI wiring | **pass** | no web/src reference to history indicator id |
| C8 | overlap bands 2025-26 england-wales-ni | **pass** | hist_n=3 ready_n=3 |
| C8 | overlap bands 2025-26 scotland | **pass** | hist_n=6 ready_n=6 |
| C8 | overlap PA 2025-26 england-wales-ni | **pass** | hist=12570 ready=12570 |
| C8 | overlap PA 2025-26 scotland | **pass** | hist=12570 ready=12570 |
| C8 | overlap NICs 2025-26 thresholds | **warn** | rates match; weekly×52 PT/UEL 12584/50284 vs Ready annual 12570/50270 (educational ×52 — not invented) |
| C8 | overlap bands 2026-27 england-wales-ni | **pass** | hist_n=3 ready_n=3 |
| C8 | overlap bands 2026-27 scotland | **pass** | hist_n=6 ready_n=6 |
| C8 | overlap PA 2026-27 england-wales-ni | **pass** | hist=12570 ready=12570 |
| C8 | overlap PA 2026-27 scotland | **pass** | hist=12570 ready=12570 |
| C8 | overlap NICs 2026-27 thresholds | **warn** | rates match; weekly×52 PT/UEL 12584/50284 vs Ready annual 12570/50270 (educational ×52 — not invented) |

## Spot cells

- E/W/NI 2010-11 basic upper after PA = 37400 @ 20% (match A.2)
- E/W/NI 2015-16 basic upper after PA = 31785 @ 20% (match A.2)
- E/W/NI 2023-24 basic upper after PA = 37700 @ 20% (match A.2)
- E/W/NI 2025-26 basic upper after PA = 37700 @ 20% (match A.2)
- PA 2010-11 = £6475 (match A.1)
- PA 2015-16 = £10600 (match A.1)
- PA 2023-24 = £12570 (match A.1)
- PA 2025-26 = £12570 (match A.1)
- Scotland 2017–22: explicit gap rows only (no E/W/NI fill)
- Scotland 2010–16: labelled mirror of E/W/NI
- Scotland 2025-26 starter upper=2827 @ 19% (match HTML)
- Scotland 2023-24 starter upper=2162 @ 19% (match HTML)
- NICs 2025–26 PT weekly £242 (match A.4)
- NICs 2022-23: intra_year_change; published main '13.25%/12% (note 16)'; no invented annual rate
- NICs 2023-24: intra_year_change; published main '12%/10% (note 20)'; no invented annual rate
- Overlap vs Ready: Scotland 2025–26 starter upper=2827

## Summary

- **Verdict: pass** (64 pass / 2 warn / 0 fail)
- **Ready recommendation: yes** — history pin may flip to Registry Ready after Orchestrator review (cloud load + registry row still Orchestrator-owned). Fiscal drag remains deferred; Time Machine UI stays out of scope until Review Gate.
- Out of scope: Time Machine React UI; inventing Scotland 2017–22; fiscal-drag calculator.

## Blockers

- None for history-pin Validation PASS.
- Open (documented, non-blocking): Scotland 2017–22 gap until clean gov.scot / HMRC SIT pin.
- Open (documented warn): NICs weekly×52 educational annual ≠ Ready PAYE annual PT/UEL (£12,570 / £50,270) — rates still match.
- UI / EmptyStage replacement waits on Review Gate after Ready + product decision.

