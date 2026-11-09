# QA report — plant-load-factors — 2026-11-07

## Scope
- Indicator: `plant-load-factors` (DESNZ DUKES 5.10.B / 5.10.C)
- Raw: `data/energy/plant-load-factors/raw/2026-11-07/DUKES_5.10.xlsx`
- Curated: `curated/observations.csv` (300 rows; 299 valued, 1 missing)
- Manifest / notes: `manifest.yaml`, `validation_notes.md`, `README.md`
- Connector (read-only review): `src/energy/connectors/plant_load_factors.py`
- Distinct from Ready `renewable-electricity-load-factors` (DUKES 6.3)
- Method: independent SHA-256 + full connector re-parse vs curated + Excel cell spot-check for Nuclear 2025; no re-ingest; Energy curated/raw not edited

## Checks
| ID | Check | Result | Notes |
|----|-------|--------|-------|
| C1 | Pinned raw SHA-256 vs manifest | **pass** | Actual `ee622e8e5bf7ad6643f348f62090a5e76ef03e7e854537448dc323d359ef9c7d` matches manifest and `retrieval.json` |
| C2 | Official release / landing | **pass** | GOV.UK DUKES electricity chapter last updated **30 July 2026** matches manifest `official_release_date`; table asset `DUKES_5.10.xlsx` is the chapter companion |
| C3 | Full Excel parse ↔ curated | **pass** | `parse_dukes_510_plant_loads` → 300/300 multiset match (value, status, generator, series, period) |
| C4 | Claimed Nuclear LF 2025 = 64.04% | **pass** | Sheet `5.10.B and 5.10.C` Table 5.10.B row `Nuclear stations`, year 2025 cell = **64.04**; curated match. Thermal efficiency companion 2025 = **39.19** |
| C5 | Extra Energy self-check samples | **pass** | Coal-fired subset 1997 LF = 48.4; 1996 `[x]` → curated `value` empty, `observation_status=missing` |
| C6 | Unit = percent (0–100) | **pass** | All 300 rows `unit=percent`; valued range compatible with plant LF / efficiency (not MW/TWh) |
| C7 | Geography / frequency / years | **pass** | All `K02000001`; annual 1996–2025; period Jan 1–Dec 31 |
| C8 | Distinct from Ready renewable LF (DUKES 6.3) | **pass** | Generator labels are MPP plant classes (Nuclear, CCGT, conventional thermal, pumped storage, coal, all plant, system LF). No onshore/offshore/solar renewable-fuel LF series. `related_indicator_ids` points at `renewable-electricity-load-factors` |
| C9 | Series split labelled | **pass** | `load_factor` 210 rows (5.10.B); `thermal_efficiency` 90 rows (5.10.C). Table 5.10.A (simultaneous maximum demand) correctly out of scope |
| C10 | Parent aggregates retained | **pass** | `All plant` and `System load factor` present — UI must not sum children into parents |
| C11 | `retrieved_at` timestamp drift | **warn** | `retrieval.json` `15:34:09Z` vs manifest evidence `15:36:04Z` — same pin/checksum; cosmetic only |

## Method notes
- MPP scope only (DUKES note 1) — not all UK generators.
- Nuclear plant LF lives here; renewable technology LFs stay on DUKES 6.3.
- Prefer Excel pin over any Chapter 5 narrative rounding.

## Summary
- Pass: 10
- Warn: 1
- Fail: 0
- Blockers: **none**
- Recommended fixes (owner: Energy): optional align `retrieved_at` between `retrieval.json` and manifest on next pin refresh.
- Notion action: **do not mark Ready** (Validation hand-off only; Orchestrator decides).
- Independence: curated/raw untouched.
