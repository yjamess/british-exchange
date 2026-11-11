# Validation notes — cpi-index (Economy self-check)

**Date:** 2026-11-11
**Indicator:** `cpi-index` (ONS D7BT / MM23)
**Connector:** `economy.connectors.cpi_index`
**Author:** Economy (self-check only — this is not a Validation-agent QA pass)

| Artefact | Path |
|----------|------|
| Manifest | `data/economy/cpi-index/manifest.yaml` |
| Raw | `raw/2026-11-04/d7bt_mm23.json` (sha256 `a0e630b0…c69c93`) |
| Curated | `curated/observations.csv` (465 monthly rows, 1988-01 → 2026-09) |

## Self-check (2026-11-11)

- Local raw file checksum matches the manifest. Live ONS `/timeseries/d7bt/mm23/data` is byte-identical
  to the pin (release 2026-10-20; next release 18 Nov 2026). Pin is **not stale**.
- Every curated value matches the live `months` array: 465 / 465, 0 mismatches, no duplicates, no missing values.
- Latest: 2026-09 = **144.1** (2015=100). CPIH same month = 144.0 (L522) — different series, do not swap.
- CDID D7BT title: "CPI INDEX 00: ALL ITEMS 2015=100".

## Gaps Validation should know about

- **No dedicated QA report for `cpi-index`.** The prior Economy Y1 QA (2026-11-03) covered D7G7 only.
  `qa_report_cpih_index_2026-11-07.md` only checks that D7BT and L522 are distinct.
- **No Notion registry row found** for `cpi-index` (`notion_registry_url` is empty in the manifest).
  Orchestrator / Validation: create or locate the row before claiming Ready.
- The repo already consumes it: Housing loads `cpi-index` for real house prices and
  `web/src/brand/sector-pages.ts` lists it. So it is in use before it has been formally validated.
- Values are labelled `provisional` (ONS revises). Re-check after the 18 Nov 2026 release.
