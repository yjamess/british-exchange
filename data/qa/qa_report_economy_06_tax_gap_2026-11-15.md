# QA report — Economy 06 hmrc-tax-gap · 2026-11-15

## Scope

- Indicator: `hmrc-tax-gap`
- Package: `data/economy/hmrc-tax-gap/`
- Handover: `docs/handover-economy-06-tax-gap.md`
- Kickoff: `docs/agent-kickoff-validation-economy-06-tax-gap.md`
- Script: `validation.qa_economy_06_tax_gap_2026_11_15`
- Vintage: Measuring tax gaps **2026** edition · tax year **2024–25** · release **2026-06-23** · raw `2026-11-15`

## Independence

Disk raw + curated only. No curated/raw rewrites. Headline and breakdown
cells recomputed from pinned xlsx via zipfile/XML (not Economy self_qa).
Curated observation rows: **1682**.

## Checks

| ID | Check | Result | Notes |
|----|-------|--------|-------|
| C1 | checksum Measuring_tax_gap_online_tables_2026.xlsx | **pass** | disk=8af0e2c7722eee3d… sums=8af0e2c7722eee3d… manifest=8af0e2c7722eee3d… |
| C1 | checksum tables_landing.html | **pass** | disk=35d8319475130fe5… sums=35d8319475130fe5… manifest=35d8319475130fe5… |
| C1 | checksum summary.html | **pass** | disk=2b68427439f526ab… sums=2b68427439f526ab… manifest=2b68427439f526ab… |
| C1 | checksum behaviour.html | **pass** | disk=ef14565822c187be… sums=ef14565822c187be… manifest=ef14565822c187be… |
| C1 | checksum methodological_annex.html | **pass** | disk=5d768e1a6d8bef71… sums=5d768e1a6d8bef71… manifest=5d768e1a6d8bef71… |
| C1 | checksum quality_report.html | **pass** | disk=b46021daa51bcf1c… sums=b46021daa51bcf1c… manifest=b46021daa51bcf1c… |
| C1 | checksum main_statistics.html | **pass** | disk=91552596575a6e99… sums=91552596575a6e99… manifest=91552596575a6e99… |
| C1 | curated row count | **pass** | rows=1682 expected=1682 |
| C2 | source_version MTG-2026 | **pass** | versions=['MTG-2026'] |
| C2 | official_release_date 2026-06-23 | **pass** | dates=['2026-06-23'] |
| C2 | UK geography K02000001 | **pass** | geos=[('K02000001', 'United Kingdom')] |
| C2 | tax year 2024-25 = 6 Apr–5 Apr | **pass** | bounds=[('2024-04-06', '2025-04-05')] |
| C2 | headline_2024_25.json vintage | **pass** | tax_year=2024-25 status=provisional |
| C3 | Table 1.1 total gap % 2024-25 | **pass** | workbook=6.4 curated=6.4 expected=6.4 |
| C3 | Table 1.2 total gap £bn 2024-25 | **pass** | workbook=59.2 curated=59.2 expected=59.2 |
| C3 | Table 1.2 theoretical liabilities £bn 2024-25 | **pass** | workbook=924.4 curated=924.4 expected=924.4 |
| C3 | identity gap/theory ≈ 6.4% | **pass** | 59.2/924.4→6.4% expected=6.4 |
| C3 | headline_2024_25.json figures | **pass** | £59.2bn / 6.4% / theory £924.4bn |
| C3 | summary.html headline strings | **pass** | has_6.4%=True has_59.2bn=True |
| C4 | VAT total gap £bn 2024-25 | **pass** | workbook=12.1 curated=12.1 expected=12.1 |
| C4 | CT total gap % 2024-25 | **pass** | workbook=18.1 curated=18.1 expected=18.1 |
| C4 | behaviour failure-to-take-reasonable-care share % | **pass** | workbook=35.0 curated=35.0 expected=35.0 |
| C4 | behaviour evasion share % | **pass** | workbook=12.0 curated=12.0 expected=12.0 |
| C5 | methodology_breaks labelled | **pass** | ids=['behaviour-series-start', 'ct-step-2019-20', 'gap-not-fraud', 'note-comparability', 'projection-years'] |
| C5 | caveat: gap ≠ fraud | **pass** | README/manifest deny whole-gap=fraud |
| C5 | caveat: provisional / projection years | **pass** | projection wording present |
| C5 | 2023-24 / 2024-25 observation_status=provisional | **pass** | non_provisional=0 sample=[] |
| C5 | Table 7.1 no pre-2019-20 rows | **pass** | early_rows=0 sample=[] |
| C6 | behaviour labels = HMRC set only | **pass** | behaviours=['avoidance', 'criminal-attacks', 'error', 'evasion', 'failure-to-take-reasonable-care', 'hidden-economy', 'legal-interpretation', 'non-payment', 'total'] extra=[] |
| C6 | evasion is one HMRC category (not sole gap) | **pass** | has_evasion=True has_failure=True |
| C6 | curated tables ⊆ {1.1,1.2,1.3,7.1} | **pass** | tables=['1.1', '1.2', '1.3', '7.1'] |
| C7 | no Ready / frontend claim | **pass** | not_ready=True no_frontend=True claims_ready=False |

## Spots checked (tax year 2024–25)

| Spot | Expected | Source |
|------|----------|--------|
| Total tax gap | £59.2bn / 6.4% | Tables 1.2 / 1.1 + summary |
| Theoretical liabilities | £924.4bn | Table 1.2 |
| VAT total gap | £12.1bn | Table 1.2 |
| Corporation Tax total gap | 18.1% | Table 1.1 |
| Failure to take reasonable care | 35% of gap | Table 7.1 |
| Evasion | 12% of gap | Table 7.1 |

## Summary

- **Verdict: pass** (32 pass / 0 warn / 0 fail)
- **Ready recommendation: yes**
- Orchestrator may flip registry to Ready + schedule cloud load after PASS.
- Out of scope: Tax Gap UI / EmptyStage; detailed chapter tables (2.x / 5.x); cloud load.

## Blockers

- None for Ready on `hmrc-tax-gap` (MTG-2026 pin).
