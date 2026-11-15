# QA report — Economy 06 Tax Machine statute pin · 2026-11-15

## Scope

- Indicator: `tax-machine-income-tax-rules`
- Package: `data/economy/tax-machine-rules/`
- Handover: `docs/handover-economy-06-tax-machine.md`
- Kickoff: `docs/agent-kickoff-validation-economy-06-tax-machine.md`
- Script: `validation.qa_economy_06_tax_machine_2026_11_15`
- Vintage: raw `2026-11-15` · tax years **2025–26** and **2026–27**

## Independence

Disk raw + curated only. Liabilities recomputed from
`income_tax_bands.csv` + `allowances.csv` + `employee_class1_nics.csv`
without reading connector source constants. No curated/raw rewrites.

## Checks

| ID | Check | Result | Notes |
|----|-------|--------|-------|
| C1 | checksum income_tax_rates.html | **pass** | manifest=True SHA256SUMS=True disk=c554bb32dd37880f |
| C1 | checksum nics_rates.html | **pass** | manifest=True SHA256SUMS=True disk=d8d15066bccdbbd6 |
| C1 | checksum employers_2025_26.html | **pass** | manifest=True SHA256SUMS=True disk=c2984177ca616a90 |
| C1 | checksum employers_2026_27.html | **pass** | manifest=True SHA256SUMS=True disk=2161c1e6baceb9c2 |
| C1 | checksum scottish_2025_26.html | **pass** | manifest=True SHA256SUMS=True disk=22d6bbbed7f6b408 |
| C2 | tax years in bands | **pass** | 2025-26,2026-27 |
| C2 | E/W/NI + Scotland bands | **pass** | england-wales-ni,scotland |
| C2 | allowances + NICs years | **pass** | allow=['2025-26', '2026-27'] nics=['2025-26', '2026-27'] |
| C3 | NICs separate file | **pass** | employee_class1_nics.csv present; bands have no NICs cols |
| C3 | stages note ewni_low | **pass** | combined ≠ blended rate |
| C3 | stages note ewni_basic_top | **pass** | combined ≠ blended rate |
| C3 | stages note ewni_higher | **pass** | combined ≠ blended rate |
| C3 | stages note scotland_contrast_basic_top | **pass** | combined ≠ blended rate |
| C4 | recompute ewni_low | **pass** | IT 3486.00 (exp 3486.00); NICs 1394.40 (exp 1394.40) |
| C4 | recompute ewni_basic_top | **pass** | IT 7540.00 (exp 7540.00); NICs 3016.00 (exp 3016.00) |
| C4 | recompute ewni_higher | **pass** | IT 19432.00 (exp 19432.00); NICs 3610.60 (exp 3610.60) |
| C5 | recompute scotland_contrast_basic_top | **pass** | IT 9127.20 (exp 9127.20); NICs 3016.00 (exp 3016.00) |
| C5 | Scotland IT > E/W/NI same NICs | **pass** | Scot IT 9127.20 vs E/W/NI 7540.00; NICs 3016.00 vs 3016.00 |
| C6 | PA £12,570 vs GOV.UK HTML | **pass** | curated 12570 + income_tax_rates.html anchors |
| C6 | basic 20% / £37,700 vs GOV.UK HTML | **pass** | income_tax_rates + employers_2025_26 anchors |
| C6 | Scotland starter vs scottish_2025_26.html | **pass** | upper_after_allowance=2827 |
| C7 | not tax advice documented | **pass** | manifest + README + worked_examples.json |
| C7 | exclusions listed | **pass** | n=10 exclusions in JSON |
| C8 | no Ready claim / no UI | **pass** | Statute pin for Tax Machine evidence. Validation-ready, not Ready. No calculator |
| C8 | no CT/VAT/CGT curated tables | **pass** | stems=['allowances', 'employee_class1_nics', 'income_tax_bands', 'observations', 'self_qa', 'worked_examples'] |

## Worked examples recomputed

- `ewni_low` (E/W/NI £30,000): IT £3486.00; employee Class 1 NICs £1394.40
- `ewni_basic_top` (E/W/NI £50,270): IT £7540.00; employee Class 1 NICs £3016.00
- `ewni_higher` (E/W/NI £80,000 (spot)): IT £19432.00; employee Class 1 NICs £3610.60
- `scotland_contrast_basic_top` (Scotland £50,270): IT £9127.20; employee Class 1 NICs £3016.00

Tax year for examples: **2025–26**. Income tax and employee Class 1 NICs
remain separate stages (combined sum is not a blended rate).

## Summary

- **Verdict: pass** (25 pass / 0 warn / 0 fail)
- **Ready recommendation: yes** — statute-pin evidence package may flip to Registry Ready after Orchestrator review (cloud load + registry row still Orchestrator-owned).
- Out of scope: Tax Machine React UI; Anatomy; AHHY re-QA.

## Blockers

- None for statute-pin Validation PASS.
- Open (Orchestrator): Notion registry row for `tax-machine-income-tax-rules`?
- UI / EmptyStage replacement waits on Review Gate after Ready + product decision.

