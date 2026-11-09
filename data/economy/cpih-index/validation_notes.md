# Validation notes — cpih-index (Economy self-check)

**Date:** 2026-11-07  
**Indicator:** `cpih-index` (ONS L522 / MM23)  
**Connector:** `economy.connectors.cpih_index`

| Artefact | Path |
|----------|------|
| Manifest | `data/economy/cpih-index/manifest.yaml` |
| Raw | `raw/2026-11-07/l522_mm23.json` |
| Curated | `curated/observations.csv` (465 monthly rows) |

## Self-check

- CDID L522 · dataset MM23 · title CPIH INDEX 00: ALL ITEMS 2015=100  
- Latest curated: 2026-09 → **144.0** (matches live `/data` spot)  
- Distinct from Ready `cpi-index` (D7BT)  
- Energy real-terms bills should **link** this id — never fork under `data/energy/`

## Hand-off

QA: `data/qa/qa_report_cpih_index_2026-11-07.md` — **pass**. Registry → **Ready** (2026-11-07).
