# Validation notes — cpi-inflation (Economy self-check)

**Date:** 2026-11-11
**Indicator:** `cpi-inflation` (ONS D7G7 / MM23)
**Connector:** `economy.connectors.cpi_inflation`
**Author:** Economy (self-check only — this is not a Validation-agent QA pass)

| Artefact | Path |
|----------|------|
| Manifest | `data/economy/cpi-inflation/manifest.yaml` |
| Raw | `raw/2026-11-03/d7g7_mm23.json` (sha256 `f05709a7…787604`) |
| Curated | `curated/observations.csv` (453 monthly rows, 1989-01 → 2026-09) |

## Self-check (2026-11-11)

- Live ONS `/timeseries/d7g7/mm23/data` re-fetched: byte-identical to the pinned checksum
  (release 2026-10-20; ONS says next release 18 Nov 2026). Pin is **not stale**.
- Every curated value matches the live `months` array: 453 / 453, 0 mismatches, no duplicates, no missing values.
- Latest: 2026-09 = **3.5 %**. Peak in series from 1989 = 11.1 % (2022-10).
- CDID D7G7 title: "CPI ANNUAL RATE 00: ALL ITEMS 2015=100". This is the **rate**, not the index (D7BT) and not CPIH (L55O/L522).
- `raw/` is gitignored (`data/**/raw/**`) and was missing on this laptop. It was restored on
  2026-11-11 by saving the live payload, whose checksum equals the manifest checksum. The manifest was
  **not** rewritten: `retrieved_at` stays 2026-11-03.

## Prior QA

`data/qa/qa_report_economy_y1_labour_prices_2026-11-03.md` — cpi-inflation checks pass (files, manifest,
schema, tail, spot, checksum). Registry row is already **Ready** (Last checked 2026-11-03).

## Open points for Validation (do not treat as pass)

- Unit string is awkward: `% annual rate (CPI all items, 2015=100 base for index companion)`. The
  "2015=100" belongs to the index series, not a rate. Cosmetic; changing it needs a connector rerun
  (Economy-owned) and a new manifest.
- Values are labelled `provisional` (ONS revises). Re-check after the 18 Nov 2026 release.
- No COICOP / category rates yet — see `docs/handover-economy-01-inflation.md`.
