# QA report — tax-machine-income-tax-history — 2026-11-15

## Scope
- Package: `data/economy/tax-machine-income-tax-history/`
- Connector: `economy.connectors.tax_machine_income_tax_history`
- Year span: 2010-11…2026-27
- Related Ready: `tax-machine-income-tax-rules`
- Overall (Economy self-QA): **pass**
- Fiscal drag: **documented** (see `curated/fiscal_drag_self_qa.json` / `EC-VAL-06E-DRAG`; history C10 below is superseded)

## Checks
| ID | Result | Notes |
|----|--------|-------|
| C1_checksum | pass | raw/2026-11-15/table_a2_rates.ods sha256 match=True |
| C1_checksum | pass | raw/2026-11-15/table_a1_allowances.ods sha256 match=True |
| C1_checksum | pass | raw/2026-11-15/table_a4_nics.ods sha256 match=True |
| C1_checksum | pass | raw/2026-11-15/income_tax_rates.html sha256 match=True |
| C1_checksum | pass | raw/2026-11-15/nics_rates.html sha256 match=True |
| C1_checksum | pass | raw/2026-11-15/rates_of_income_landing.html sha256 match=True |
| C1_checksum | pass | raw/2026-11-15/allowances_landing.html sha256 match=True |
| C1_checksum | pass | raw/2026-11-15/nics_stats_landing.html sha256 match=True |
| C1_checksum | pass | raw/2026-11-15/sco_2017_18_govscot.html sha256 match=True |
| C1_checksum | pass | raw/2026-11-15/sco_2018_19_govscot.html sha256 match=True |
| C1_checksum | pass | raw/2026-11-15/sco_hmrc_sit_2019.html sha256 match=True |
| C1_checksum | pass | raw/2026-11-15/sco_hmrc_sit_2020.html sha256 match=True |
| C1_checksum | pass | raw/2026-11-15/sco_hmrc_sit_2021.html sha256 match=True |
| C1_checksum | pass | raw/2026-11-15/sco_2020_21_govscot.html sha256 match=True |
| C1_checksum | pass | raw/2026-11-15/sco_2021_22_budget.html sha256 match=True |
| C1_checksum | pass | raw/2026-11-15/sco_2022_23_govscot.html sha256 match=True |
| C1_checksum | pass | raw/2026-11-15/sco_hmrc_sit_2023.html sha256 match=True |
| C1_checksum | pass | raw/2026-11-15/employers_2018_19.html sha256 match=True |
| C1_checksum | pass | raw/2026-11-15/employers_2020_21.html sha256 match=True |
| C2_raw_anchor | pass | income_tax_rates.html contains 'Personal Allowance': True |
| C2_raw_anchor | pass | income_tax_rates.html contains '£12,570': True |
| C2_raw_anchor | pass | income_tax_rates.html contains 'Up to £37,700': True |
| C2_raw_anchor | pass | income_tax_rates.html contains 'Starter rate': True |
| C2_raw_anchor | pass | nics_rates.html contains 'Primary Threshold': True |
| C2_raw_anchor | pass | nics_rates.html contains 'Upper Earnings Limit': True |
| C2_raw_anchor | pass | nics_rates.html contains 'Between Primary Threshold and Upper Earnings Limit': True |
| C2_raw_anchor | pass | sco_2017_18_govscot.html contains '£43,000': True |
| C2_raw_anchor | pass | sco_2017_18_govscot.html contains 'Scottish Basic rate': True |
| C2_raw_anchor | pass | sco_2017_18_govscot.html contains '20%': True |
| C2_raw_anchor | pass | sco_2018_19_govscot.html contains 'Starter Rate': True |
| C2_raw_anchor | pass | sco_2018_19_govscot.html contains '19%': True |
| C2_raw_anchor | pass | sco_2018_19_govscot.html contains '£13,850': True |
| C2_raw_anchor | pass | sco_2018_19_govscot.html contains '£43,430': True |
| C2_raw_anchor | pass | sco_hmrc_sit_2019.html contains '2017 to 2018': True |
| C2_raw_anchor | pass | sco_hmrc_sit_2019.html contains '2018 to 2019': True |
| C2_raw_anchor | pass | sco_hmrc_sit_2019.html contains '2019 to 2020': True |
| C2_raw_anchor | pass | sco_hmrc_sit_2019.html contains '19%': True |
| C2_raw_anchor | pass | sco_hmrc_sit_2020.html contains '2019 to 2020': True |
| C2_raw_anchor | pass | sco_hmrc_sit_2020.html contains '£14,549': True |
| C2_raw_anchor | pass | sco_hmrc_sit_2020.html contains '41%': True |
| C2_raw_anchor | pass | sco_hmrc_sit_2021.html contains '2020 to 2021': True |
| C2_raw_anchor | pass | sco_hmrc_sit_2021.html contains '£14,585': True |
| C2_raw_anchor | pass | sco_hmrc_sit_2021.html contains '£25,158': True |
| C2_raw_anchor | pass | sco_2020_21_govscot.html contains '2020-21': True |
| C2_raw_anchor | pass | sco_2020_21_govscot.html contains '£14,585': True |
| C2_raw_anchor | pass | sco_2020_21_govscot.html contains '£43,430': True |
| C2_raw_anchor | pass | sco_2020_21_govscot.html contains '2021-22': True |
| C2_raw_anchor | pass | sco_2021_22_budget.html contains '2021-22': True |
| C2_raw_anchor | pass | sco_2021_22_budget.html contains '£14,667': True |
| C2_raw_anchor | pass | sco_2021_22_budget.html contains '£25,296': True |
| C2_raw_anchor | pass | sco_2021_22_budget.html contains '£43,662': True |
| C2_raw_anchor | pass | sco_2022_23_govscot.html contains '2022 to 2023': True |
| C2_raw_anchor | pass | sco_2022_23_govscot.html contains '£14,732': True |
| C2_raw_anchor | pass | sco_2022_23_govscot.html contains '£25,688': True |
| C2_raw_anchor | pass | sco_2022_23_govscot.html contains '£43,662': True |
| C2_raw_anchor | pass | sco_hmrc_sit_2023.html contains '2022 to 2023': True |
| C2_raw_anchor | pass | sco_hmrc_sit_2023.html contains '£14,732': True |
| C2_raw_anchor | pass | sco_hmrc_sit_2023.html contains '£25,688': True |
| C2_raw_anchor | pass | employers_2018_19.html contains 'Scottish starter': True |
| C2_raw_anchor | pass | employers_2018_19.html contains '£2,000': True |
| C2_raw_anchor | pass | employers_2018_19.html contains '£31,580': True |
| C2_raw_anchor | pass | employers_2020_21.html contains 'Scottish starter': True |
| C2_raw_anchor | pass | employers_2020_21.html contains '£2,085': True |
| C2_raw_anchor | pass | employers_2020_21.html contains '£30,930': True |
| C3_year_span | pass | E/W/NI years 2010-11…2026-27 (target 2010-11…2026-27) |
| C4_pa_2025_26 | pass | 2025–26 PA=12570 |
| C5_basic_upper_2025_26 | pass | basic upper=37700 rate=20 |
| C6_scotland_2025_26_vs_ready_pin | pass | Scotland 2025–26 starter upper 2827; top rate 48% (matches Ready pin family) |
| C7_scotland_2017_22_filled | pass | Scotland historical pinned=True; remaining gaps=[] |
| C7b_scotland_2018_19_employers | pass | 2018–19 starter 2000 / intermediate 31580 / higher 41% (employers + gov.scot) |
| C7c_scotland_2020_21_employers | pass | 2020–21 starter 2085 / intermediate 30930 (employers + HMRC SIT) |
| C7d_scotland_2021_22_srr | pass | 2021–22 SRR rate limits 2097 / 12726 / 31092 |
| C7e_scotland_not_ewni_copy | pass | 2018–19 Scotland has starter + higher 41% vs E/W/NI higher 40% |
| C8_no_nics_blend_in_it_bands | pass | income_tax_bands.csv has no NICs threshold columns |
| C9_nics_split_2022-23 | pass | 2022-23 status=intra_year_change; main_rate_parsed=None |
| C9_nics_split_2023-24 | pass | 2023-24 status=intra_year_change; main_rate_parsed=None |
| C10_fiscal_drag_deferred | superseded | was deferred at history pin; now documented — `fiscal_drag_self_qa.json` |
| C11_2010_11_additional_50 | pass | 2010–11 additional=50 |

## Sample rules
- 2025-26: PA £12570; E/W/NI basic upper £37700; Scotland starter upper £2827; NICs PT weekly £242

## Blockers for Ready
- Independent Validation tasks `EC-VAL-06E` / `EC-VAL-06E-SCOT` under `data/qa/`.
- No Time Machine React / EmptyStage replacement this Economy pass.
