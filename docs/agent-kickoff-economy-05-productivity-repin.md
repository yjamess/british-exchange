# Economy + Validation — Domain 05 productivity re-pin (BX-BACK-005 remainder)

**Owner:** Economy → Validation → Orchestrator  
**Domain:** [05 · Productivity & Economic Growth](https://app.notion.com/p/414654717685811a9435e45ebfe64a3b)  
**Unblock when:** ONS publishes PRDY on **17 November 2026** ([release page](https://www.ons.gov.uk/releases/productivityflashestimateandoverviewukjulytoseptember2026andapriltojune2026))  
**Date locked:** 2026-11-14  
**Paths:** `src/economy/`, `data/economy/`, `data/qa/`

## Already done (do not redo)

- GDP half of BX-BACK-005: live ABMI / IHXW / NPEL on **PN2** release 2026-11-12 (through 2026 Q3). QA pass. Cloud releases 224–226.
- Engine UI: hours (LZVA) + output per hour (LZVB) — design lock stays.

## G2 deliverables (Economy) — after 17 Nov

1. Re-run `labour_productivity` (LZVB/PRDY) and `labour_productivity_hours` (LZVA/PRDY).
2. Confirm `official_release_date` advances and latest quarter moves if the flash estimate adds 2026 Q3.
3. `load_ready --via-rest --only labour-productivity --only labour-productivity-hours`.
4. `archive_data push` both trees with `--keep-local`.
5. Handoff checksums + row counts to Validation.

## Validation

Independent QA under `data/qa/` vs the new PRDY bulletin / timeseries. Sample growth vs published flash estimate. Do not edit curated to pass.

## Discovery note (BX-BACK-009 — do not invent)

No standalone PRDY website timeseries CDID was found for a title like “Whole Economy: Output SA: Index” alongside LZVA/LZVB (search 2026-11-14). Engine published-output upgrade should discover the **GVA / output** column in [Output per hour worked, UK](https://www.ons.gov.uk/economy/economicoutputandproductivity/productivitymeasures/datasets/outputperhourworkeduk/current) (xlsx) on the same vintage — **never** derive Engine output from ABMI.

## Do not

- Switch GDP live source back to QNA until QNA `releaseDate` is newer than PN2.
- Put GDP and the Engine identity on one instrument.
- Claim Domain 05 / BX-BACK-005 closed before this re-pin + QA.
