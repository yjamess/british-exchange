# QA report — esa-gg-expenditure-by-function — 2026-11-15

Economy self-QA. **Not** independent Validation and **not** Registry Ready.

## Scope

- Package: `data/economy/esa-gg-expenditure-by-function/`
- Connector: `economy.connectors.esa_gg_expenditure_by_function`
- Curated workbook: ONS ESA Table 11 general government, column OTE
- Sector check only: central government and local government workbooks, same release
- SHA-256 (general government): `545236391260ca77580cff5d8dba243b35f1e588d48067ed0f02287c7c3afa09`
- Years: calendar 1995 to 2024. Not financial years.
- Unit: £ million, nominal.
- TES and EBFT: not in this package (correct)
- OSCAR: absent (correct)

## Checks

| ID | Check | Result | Notes |
|----|-------|--------|-------|
| E1 | 2024 OTE total = 1,330,532 | pass | 1,330,532 |
| E2 | 2024 OTE Health GF07 = 253,191; Education 141,118; Social protection 458,500 | pass | published cells |
| E3 | Level-1 OTE sums exactly to the published total, every calendar year | pass | no residual |
| E4 | Coversheet says local government only; year sheets say general government | pass | bad copy |
| E5 | 2024 OTE total is not CG 1,227,604 and not LG 268,424 | pass | siblings not curated |
| E6 | Central plus local is not rebuilt into general government | pass | gap 165,496 |
| E7 | Health 253,191 is not TES Health 242,429; no rescale onto TES or EBFT | pass | different concept |
| E8 | Calendar-year periods; unit is £ million; sub-functions skipped | pass | 30 years |

Curated rows: **330**.

## Coversheet

The general-government coversheet copies the local-government sentence. Year sheets, the table of contents, the filename, and the OTE total identify general government. Central plus local is larger than general government because transfers between subsectors are consolidated. Do not add the siblings to rebuild this total.

## Summary

- Overall: **pass** (Economy self-QA)
- Coversheet check: **general-government file** (coversheet sentence is a bad copy)
- Blockers for Ready: independent Validation `EC-VAL-07E`
