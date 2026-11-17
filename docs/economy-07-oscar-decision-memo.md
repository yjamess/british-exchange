# OSCAR decision — Economy Domain 07

**Author:** Economy domain subagent · **Date:** 2026-11-15  
**Work plan:** `EC-G2-07F-OSCAR`  
**Matrix:** [economy-07-spending-source-matrix.md](economy-07-spending-source-matrix.md) §D  
**Verdict:** **`blocked-as-tme-composition`**

No curated OSCAR package was written. No OSCAR observations were ingested. No registry row was opened.

## Why it is blocked

HM Treasury’s September 2026 in-year guidance says OSCAR cannot be tied exactly to the National Accounts or to Public Sector Finances:

> Treasury publications are sourced from OSCAR II, however National Statistics draw on additional sources. As a consequence it will not be possible to exactly tie back the new dataset containing in-year data with the aggregated data for central government spending published in the National Accounts or Public Sector Finances release.

Source: [OSCAR in-year dataset guidance, September 2026](https://www.gov.uk/government/publications/oscar-ii-publishing-data-from-the-database-september-2026/oscar-in-year-dataset-guidance) (published 22 September 2026; next in-year release due at the end of December 2026). Collection: [HMT OSCAR publishing](https://www.gov.uk/government/collections/hmt-oscar-publishing-from-the-database).

That is a composition block, not a missing-file block. The files exist. They are the wrong instrument for “where spending goes” and for “DEL versus AME” as those views are already pinned:

| Already pinned | What it is | OSCAR is not this |
|----------------|------------|-------------------|
| `tes-by-function` and `tes-by-function-long-run` | TES / COFOG | Not an organisation pie |
| `tme-del-ame` | PSS Table 1.1 control totals | Not a substitute for Total DEL + Departmental AME + Other AME |
| `total-managed-expenditure` | Monthly ONS EBFT | Not a split of EBFT |

Other limits on the same guidance page: Security and Intelligence Agencies are removed; in-year figures are provisional; values are in **£ thousands**.

## What this pass did not do

- No download of an OSCAR workbook or CSV into `data/economy/`
- No `curated/observations.csv` for OSCAR
- No manifest
- No registry status of Ingesting, Validation, or Ready

## Future instrument — Inbox draft id only

If a later pass wants departmental transparency, the id is already named and must stay separate:

| Field | Value |
|-------|--------|
| Draft id | `oscar-control-budget` |
| What it would be | Departmental Control Budget outturn (DEL, AME, non-budget) by organisation |
| Unit | £ thousands |
| Status this pass | **Inbox draft id only.** Not a registry page. Not a package. |

That name must not be used as a composition of EBFT, of TES, or of Table 1.1 TME. It does not unlock a chart on the function view or the DEL view.

## Do not

- Put OSCAR organisation lines in the function view or the DEL view
- Rescale £ thousands OSCAR rows onto £ million TES, £ billion Table 4.2, or monthly EBFT
- Treat a later `oscar-control-budget` pin as closing this block
