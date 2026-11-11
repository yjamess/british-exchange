# Handover — Economy Domain 01 · L55O (`cpih-inflation`)

**Author:** Economy agent · **Date:** 2026-11-11  
**Context:** Appendix to [handover-economy-01-inflation.md](handover-economy-01-inflation.md) §2.3 / §4.4 item 5. Orchestrator approved this pin in the Wave A review.  
**Scope:** dataset + Notion only. No frontend, no `sector-pages.ts`, no brand edits.

> **Status: Validation-ready, not Ready.** Economy self-check only; independent QA not yet run.

## What shipped

| Item | Value |
|------|-------|
| `indicator_id` | `cpih-inflation` |
| ONS series | **L55O** / MM23, "CPIH ANNUAL RATE 00: ALL ITEMS" |
| Rows | 453 monthly, 1989-01 → 2026-09 |
| Latest | **2026-09 = 3.6 %** (CPI D7G7 same month: 3.5) |
| ONS release | 2026-10-20 (next 2026-11-18) |
| Raw sha256 | `7783d086411a1b3aa8c776eb219e328799a522e2ef8e0c171b80d9fabcb53120` |
| Registry | https://app.notion.com/p/415654717685815b877cc6795dac6273 (Validation) |

## Paths

- `data/economy/cpih-inflation/{manifest.yaml, curated/observations.csv, README.md, validation_notes.md}`
- Raw (gitignored): `data/economy/cpih-inflation/raw/2026-11-11/l55o_mm23.json`
- Connector: `src/economy/connectors/cpih_inflation.py`; spec `CPIH_INFLATION` in `labour_prices_series.py`
- Re-run: `uv run python -m economy.connectors.cpih_inflation`

## Code changes in shared Economy files

- `labour_prices_series.py`: added `cpih-inflation` to `Y1_RELATED`, added `CPIH_INFLATION`.
- `_related_except()` now takes optional extras and lists each id once. Root cause of the old duplicate `cpi-index` in the `cpih-index` manifest: the spec appended ids already in `Y1_RELATED`. `CPI_INDEX` and `CPIH_INDEX` now use the helper.
- `CPIH_INFLATION` is **not** added to `ALL_Y1_SPECS` — that tuple drives the historic Validation script `qa_economy_y1_labour_prices_2026_11_03.py`, which is Validation-owned and was scoped to the earlier pins.

## Two-way links

`cpih-inflation` ↔ `cpih-index`, `cpi-inflation`, `cpi-index`. Manifests of those three were updated (related ids only; raw pins and checksums unchanged, no refetch). Other Y1 manifests (`real-gdp-per-head`, `labour-productivity`, etc.) pick up the new id the next time their connector runs, since `Y1_RELATED` is shared.

## Closes / changes in the Domain 01 handover

- §2.2 question 3 (CPI vs CPIH): the rate pin now exists; a like-for-like rate view is unblocked **once Validation passes**.
- §4.4 item 5 (L55O not ingested): done. Item 6 (`chart_contract.py` `is_cpih` / `MEASURE_FAMILY`) is still Orchestrator-owned and untouched. A CPIH rate chart will need a `cpih-inflation` entry there.

## Open for Orchestrator / Validation

1. Schedule independent QA for `cpih-inflation` (checklist in `validation_notes.md`).
2. Re-pin after 2026-11-18 (all four prices pins are now on the monthly cadence).
3. `cpi-index` still has no Notion registry row (unchanged from the main handover).
