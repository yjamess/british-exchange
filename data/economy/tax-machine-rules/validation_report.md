# QA report — tax-machine-income-tax-rules — 2026-11-15

## Scope
- Package: `data/economy/tax-machine-rules/`
- Connector: `economy.connectors.tax_machine_rules`
- Tax years: 2025-26, 2026-27
- Overall (Economy self-QA): **pass**

## Checks
| ID | Result | Notes |
|----|--------|-------|
| C1_checksum | pass | raw/2026-11-15/income_tax_rates.html sha256 match=True |
| C1_checksum | pass | raw/2026-11-15/nics_rates.html sha256 match=True |
| C1_checksum | pass | raw/2026-11-15/employers_2025_26.html sha256 match=True |
| C1_checksum | pass | raw/2026-11-15/employers_2026_27.html sha256 match=True |
| C1_checksum | pass | raw/2026-11-15/scottish_2025_26.html sha256 match=True |
| C2_raw_anchor | pass | income_tax_rates.html contains 'Personal Allowance': True |
| C2_raw_anchor | pass | income_tax_rates.html contains '£12,570': True |
| C2_raw_anchor | pass | income_tax_rates.html contains 'Up to £37,700': True |
| C2_raw_anchor | pass | income_tax_rates.html contains '£37,701 to £125,140': True |
| C2_raw_anchor | pass | nics_rates.html contains 'Primary Threshold': True |
| C2_raw_anchor | pass | nics_rates.html contains 'Upper Earnings Limit': True |
| C2_raw_anchor | pass | nics_rates.html contains 'Between Primary Threshold and Upper Earnings Limit': True |
| C2_raw_anchor | pass | employers_2025_26.html contains '2025 to 2026': True |
| C2_raw_anchor | pass | employers_2025_26.html contains 'Up to £37,700': True |
| C2_raw_anchor | pass | employers_2025_26.html contains 'Up to £2,827': True |
| C2_raw_anchor | pass | employers_2025_26.html contains '£12,570 per year': True |
| C2_raw_anchor | pass | employers_2025_26.html contains '£50,270 per year': True |
| C2_raw_anchor | pass | employers_2026_27.html contains '2026 to 2027': True |
| C2_raw_anchor | pass | employers_2026_27.html contains 'Up to £37,700': True |
| C2_raw_anchor | pass | employers_2026_27.html contains 'Up to £3,967': True |
| C2_raw_anchor | pass | employers_2026_27.html contains '£12,570 per year': True |
| C2_raw_anchor | pass | employers_2026_27.html contains '£50,270 per year': True |
| C2_raw_anchor | pass | scottish_2025_26.html contains '2025 to 2026': True |
| C2_raw_anchor | pass | scottish_2025_26.html contains '£12,571 to £15,397': True |
| C2_raw_anchor | pass | scottish_2025_26.html contains '19%': True |
| C2_raw_anchor | pass | scottish_2025_26.html contains '48%': True |
| C3_scotland_contrast | pass | Scotland IT £9127.20 > E/W/NI £7540.00 at gross £50,270 |
| C4_worked_example | pass | ewni_low: IT=3486.00 (exp 3486.00); NICs=1394.40 (exp 1394.40) |
| C4_worked_example | pass | ewni_basic_top: IT=7540.00 (exp 7540.00); NICs=3016.00 (exp 3016.00) |
| C4_worked_example | pass | ewni_higher: IT=19432.00 (exp 19432.00); NICs=3610.60 (exp 3610.60) |
| C4_worked_example | pass | scotland_contrast_basic_top: IT=9127.20 (exp 9127.20); NICs=3016.00 (exp 3016.00) |
| C5_no_blend | pass | income_tax_bands.csv has no NICs columns/labels |

## Sample liability
- `ewni_higher` · england-wales-ni · gross £80000.00 · 2025-26: income tax £19432.00; employee Class 1 NICs £3610.60

## Blockers for Ready
- Independent Validation task `EC-VAL-06C` not yet run under `data/qa/`.
- No React Tax Machine; EmptyStage remains until Review Gate after PASS.

## Accounting / legal reminders
- Statutory incidence ≠ economic incidence.
- Modelled liability ≠ observed population tax paid / AHHY receipts.
- Do not blend NICs into income-tax rates.
