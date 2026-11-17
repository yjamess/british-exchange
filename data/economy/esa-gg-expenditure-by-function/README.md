# esa-gg-expenditure-by-function

**Owner:** Economy agent
**Status:** Validation-ready (Economy self-QA) — **not** Registry Ready
**indicator_id:** `esa-gg-expenditure-by-function`
**Source:** ONS ESA Table 11, general government, column OTE, £ million, calendar year

This is general government expenditure on an ESA basis. It is not TES and it is not monthly EBFT.

## Reproduce

```bash
uv run python -m economy.connectors.esa_gg_expenditure_by_function
```

## What is curated

| Role | What | Chart as a function slice? |
|------|------|----------------------------|
| `function` | Ten COFOG level-1 rows, column OTE | Yes, these ten only |
| `total` | Published `_T` total government expenditure | No. It is the total |

Sub-functions (GF0101 and below) are not curated. Other transaction columns are not curated.
Central and local government workbooks are not curated.

History: **1995 to 2024** (30 calendar years). Every curated row is `final` on this vintage. ONS can still revise them.

## Spot — calendar 2024, OTE, £ million

Total **1,330,532**. Health GF07 **253,191**. Education GF09 **141,118**. Social protection GF10 **458,500**.

TES Health, financial year 2024-25, is **242,429** £ million. That is a different year, a different sector, and a different concept. It is not stored in this package.

Level-1 rows sum exactly to the published total in every pinned year. No residual was added.

## Coversheet check

Verdict: **general-government file**. The coversheet conflict is real.

| File | What the coversheet says | What the 2024 sheet says | 2024 OTE total | Curated? |
|------|--------------------------|--------------------------|---------------:|----------|
| General government | local government only | general government only | 1,330,532 | Yes |
| Central government | central government only | central government only | 1,227,604 | No |
| Local government | local government only | local government only | 268,424 | No |

Central plus local = **1,496,028**, which is **165,496** above the general-government total. Do not add the siblings to rebuild general government.

The general-government coversheet copies the local-government sentence. Year sheets, the table of contents, the filename, and the OTE total identify general government. Central plus local is larger than general government because transfers between subsectors are consolidated. Do not add the siblings to rebuild this total.

## Raw

- Curated file: `raw/2026-11-15/esatable11generalgovernment.xlsx`
- SHA-256: `545236391260ca77580cff5d8dba243b35f1e588d48067ed0f02287c7c3afa09`
- Release date on the pin: 2026-04-23
- Sibling checksums are in `manifest.yaml`. They are the sector check, not a second series.

Docs: `docs/handover-economy-07-longrun-esa.md`
