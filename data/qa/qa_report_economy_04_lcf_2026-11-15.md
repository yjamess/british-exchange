# QA report — Economy 04 LCF Cost / Ledger · 2026-11-15

## Scope

- Domain: 04 · Household Finances & Living Standards — Cost of Living / Ledger
- Kickoff: `docs/agent-kickoff-validation-economy-04-lcf.md`
- Handover: `docs/handover-economy-04-household-deepen.md` (Cost/Ledger section)
- Packages: `family-spending-by-category` (ONS Family Spending WB1 Table 4.1),
  `family-spending-by-income` (WB1 Tables 3.1E5 + 3.2E5, two-adult OECD)
- Script: `validation.qa_economy_04_lcf_2026_11_15`
- Out of scope: WAS Buffer (`household-financial-wealth`); BoE Weight of Debt
  (`consumer-credit-outstanding`); Domain 06 ETB; UKEA RHDI / DGD8;
  frontend / work-plan edits; curated rewrites.

## Independence

Pinned raw SHA-256 checked against manifests. Table 4.1 and the **left-hand**
2-adult OECD blocks of 3.1E5 / 3.2E5 were recomputed from
`workbook1detailedexpenditureandtrends.xlsx` with a Validation parser that
does not import Economy connectors. Workbook 2 was opened only to confirm it
is a landing/inventory pin (3.3E / 3.7E subsets). Curated CSVs were not edited.

ONS bulletin (Family spending in the UK: April 2024 to March 2025, released
11 June 2026) independently quotes £676.60 all-household weekly total;
housing (net), fuel and power £118.40 (stated as 18%); transport £96.40;
lowest / highest equivalised fifths £407.30 / £1,083.60 (2.7 times).
Food £73.70 and quintile **shares** 15.2% / 25.7% are published workbook
cells (3.1E5 / 3.2E5), not bulletin headline levels.

## Checks

| ID | Check | Result | Notes |
|----|-------|--------|-------|
| C1 | Category files + connector | **pass** | /Users/yettyjames/Workspace/machine/british-exchange/data/economy/family-spending-by-category |
| C1 | Income files + connector | **pass** | /Users/yettyjames/Workspace/machine/british-exchange/data/economy/family-spending-by-income |
| C1 | Workbook 1 SHA-256 (category pin) | **pass** | disk=af8d4a4464c0cc0a49195495a6e665667234379ac08293037a69e065d8931076 |
| C1 | Workbook 1 SHA-256 (income pin, same file) | **pass** | disk=af8d4a4464c0cc0a49195495a6e665667234379ac08293037a69e065d8931076 |
| C1 | Workbook 2 SHA-256 (income landing pin) | **pass** | disk=2c5d57c9b1afb97533105a83fbc0b92627154ccf62a8ef15fb483e1cb8aa2978 |
| C1 | Official release 2026-06-11 + OGL v3.0 | **pass** | licence_cat=Open Government Licence v3.0 |
| C4 | Table 4.1 parsed cell count (15 × 26) | **pass** | parsed=390 expected=390 |
| C4 | Category curated row count | **pass** | curated=390 expected=390 |
| C4 | Tables 3.1E5+3.2E5 parsed cell count (90+90) | **pass** | 3.1E5=90 3.2E5=90 |
| C4 | Income curated row count | **pass** | curated=180 expected=180 |
| C1 | Table 4.1 workbook cells == curated (full recon) | **pass** | mismatches=0 extra=0 |
| C1 | Tables 3.1E5/3.2E5 left block == curated (full recon) | **pass** | mismatches=0 extra=0 |
| C2 | FYE 2025 all-household total £676.60 (Table 4.1 / bulletin) | **pass** | workbook=676.6 bulletin=676.60 |
| C2 | FYE 2025 housing (net), fuel & power £118.40 | **pass** | workbook=118.4 bulletin=118.40 |
| C2 | FYE 2025 food & non-alcoholic drinks £73.70 | **pass** | workbook=73.7 (bulletin quotes YoY change, not this level) |
| C2 | FYE 2025 transport £96.40 | **pass** | workbook=96.4 bulletin=96.40 |
| C2 | 2001-02 food £82.70 and total £756.20 (Table 4.1) | **pass** | history cells vs workbook (not in FYE 2025 bulletin headline) |
| C2 | Quintile totals £407.30 / £1,083.60 / all £676.60 (3.1E5 left) | **pass** | lowest=407.3 highest=1083.6 all=676.6 |
| C2 | Highest/lowest total ratio ≈ 2.7 (bulletin) | **pass** | ratio=2.66 if computed; bulletin says 2.7 times |
| C2 | Lowest quintile food share 15.2% (3.2E5 left) | **pass** | workbook=15.2 |
| C2 | Lowest quintile housing (net) share 25.7% (3.2E5 left) | **pass** | workbook=25.7 |
| C2 | All-household food share 10.9% and housing share 17.5% (3.2E5) | **pass** | food=10.9 housing=17.5 |
| C2 | Bulletin 18% housing is rounded vs 3.2E5 17.5% | **pass** | 118.40/676.60=17.50%; bulletin states 18%; package stores 17.5% |
| C3 | Category unit is real £/week, FYE 2025 prices | **pass** | units={'£ per week (household average, FYE 2025 prices)'} |
| C3 | Two calendar-2006 weighting versions kept separate | **pass** | total_2006_rows=2 |
| C3 | UK geography K02000001 on all curated rows | **pass** | codes=['K02000001'] |
| C3 | 2-adult OECD only — no 1-adult-reference right block | **pass** | equivalisation={'modified_OECD_two_adult_reference'} one_adult_rows=0 |
| C3 | Income package is FYE 2025 only (2024-04-01 → 2025-03-31) | **pass** | periods=[('2024-04-01', '2025-03-31')] |
| C3 | Housing (net) footnote: mortgage interest / Council Tax not in group 4 | **pass** | manifest/README document COICOP other-items placement |
| C4 | Lowest-quintile food/housing shares round from 3.1E5 £ cells | **pass** | food_re=15.17 housing_re=25.71 vs published 15.2 / 25.7 |
| C4 | Category mix: 15 headline codes × 26 years | **pass** | {'1': 26, '2': 26, '3': 26, '4': 26, '5': 26, '6': 26, '7': 26, '8': 26, '9': 26, '10': 26, '11': 26, '12': 26, '1-12': 26, '13': 26, 'total': 26} |
| C4 | Income mix: 90 weekly £ + 90 published shares | **pass** | {('3.1E5', 'weekly_gbp'): 90, ('3.2E5', 'share_of_total_expenditure'): 90} |
| C4 | Workbook 2 has 3.3E/3.7E subsets, not 3.1E5 all-households | **pass** | wb2_sheets=['Contents', 'Annex', 'A4', 'A5', 'A7', 'A8', 'A12', 'A13', 'A14', 'A15', 'A16', 'A23', 'A26', 'A29', 'A32', '3.3', '3.3E', '3.7', '3.7E', 'Background notes'] |
| C4 | Source register: 3.3E/3.7E and 1-adult block inventoried, not curated | **pass** | income source_register.csv |
| C5 | No invented essentials share (published 3.2E5 cells only) | **pass** | source_register: published shares only; no custom basket |
| C7 | Ledger Notes forbid stitching LCF + ETB + RHDI/DGD8 | **pass** | README/manifest treat ETB as adjacent only; no reconciled budget |
| C5 | Buffer/Debt packs not re-Readied by this ticket | **pass** | out of scope: household-financial-wealth, consumer-credit-outstanding |
| C3 | Category notes price_basis=fye_2025_prices on every row | **pass** | price_basis={'fye_2025_prices'} |

## Method notes

- **Cost of Living (category history)** is UK (`K02000001`) LCF private
  households, **real** £/week at **FYE 2025 prices** (COICOP-specific CPI
  deflators; group 13 also uses RPI for mortgage interest / Council Tax).
  Table 4.3 current prices is inventoried, not curated. Two calendar-2006
  columns are different census weighting versions, not a revision of one year.
- **Ledger (income quintiles)** ranks households with the **modified OECD**
  scale on a **two-adult reference** (FYE 2025 methodology update). Only the
  left-hand block of 3.1E5 / 3.2E5 is curated. The right-hand 1-adult
  comparison block and WB2 Tables 3.3E / 3.7E (non-retired subsets) stay raw.
  £ figures are unequivalised household means.
- **Housing (net), fuel and power** excludes mortgage interest, Council Tax
  and Northern Ireland rates; those sit in group 13 / other expenditure items
  (bulletin Figure 3 note; Table 4.1 footnote).
- Bulletin housing **18%** is a rounded share of £118.40 / £676.60; Table
  3.2E5 publishes **17.5%**. The package stores the published cell.
- **No essentials basket** is derived. Shares are published 3.2E5 cells.
- **Ledger stitching is forbidden.** LCF weekly £ must not be added to Domain
  06 `effects-of-taxes-and-benefits` (ETB, FYE 2024) or to UKEA RHDI / DGD8.
  Different surveys, years, and income concepts. Follow chips / adjacent view
  only. A reconciled Household Ledger remains Blocked on the handover.

## Summary

- **Verdict: pass** (38 pass / 0 warn / 0 fail)
- Recommend registry **Ready** on these two ids only:
  `family-spending-by-category`, `family-spending-by-income`.
- Do **not** re-Ready Buffer (`household-financial-wealth`) or Debt
  (`consumer-credit-outstanding`) from this ticket.

## Blockers

- None for Ready on these two pins.

## Economy fix tasks

- None required to pass this vintage.

