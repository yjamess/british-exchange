# QA report — renewable-electricity-load-factors — 2026-11-07

## Scope
- Indicator: `renewable-electricity-load-factors` (DESNZ DUKES 6.3)
- Raw: `data/energy/renewable-electricity-load-factors/raw/2026-11-07/DUKES_6.3.xlsx`
- Curated: `curated/observations.csv` (558 rows; 549 valued, 9 missing)
- Manifest / notes: `manifest.yaml`, `validation_notes.md`
- Connector (read-only review): `src/energy/connectors/renewable_electricity_load_factors.py`
- Inventory context: `data/energy/renewables-nuclear/`
- Notion: https://app.notion.com/41165471768581dfbb30e984c9aa01ba
- Method: independent SHA-256 of pinned raw + full sheet `6.3` re-parse vs curated (no re-ingest as primary path)

## Checks
| ID | Check | Result | Notes |
|----|-------|--------|-------|
| C1 | Pinned raw SHA-256 vs manifest / claim | **pass** | Actual `4f0c19f1b063ae20f71e11dd3744c1fb37df484e9873f510e817a3a1711bb53a` matches manifest, `retrieval.json`, and claimed checksum (36 985 bytes) |
| C2 | Unit = percent (0–100 scale) | **pass** | All 558 rows `unit=percent`; valued range 0.01–87.3 (no MW/TWh-scale values) |
| C3 | Geography / frequency / periods | **pass** | All `K02000001`; annual calendar years 2008–2025; `period_start`/`period_end` = Jan 1 / Dec 31 |
| C4 | Two bases present and labelled | **pass** | `average_boe_capacity` (288) and `unchanged_configuration` (270) in `notes`; both table headers found on sheet `6.3` |
| C5 | Renewable fuels only; nuclear absent | **pass** | 17 technology labels; zero `nuclear` hits in fuel labels. Aligns with renewables-nuclear inventory (nuclear via capacity/generation reuse, not this series / not REPD) |
| C6 | REPD not claimed as load-factor source | **pass** | Manifest/caveats/README correctly state REPD does not publish load factors and does not cover nuclear; source is DUKES 6.3 |
| C7 | Full Excel ↔ curated reconcile | **pass** | Independent re-parse of sheet `6.3`: 558/558 match; 0 value, status, missing, or extra-row mismatches |
| C8 | Claimed 2025 samples (`average_boe_capacity`) | **pass** | Onshore 24.02; Offshore 36.12; Solar PV 11.08 — Excel pin = curated |
| C9 | Extra Energy self-check samples | **pass** | 2025 Bioenergy 63.0; All renewables 28.32; 2024 Solar 9.22; 2011 Solar 5.08 (first valued solar year) |
| C10 | 2010 Solar missing as claimed | **pass** | Excel `[x]` → curated `value` empty, `observation_status=missing` |
| C11 | Publisher label casing (Plant Biomass) | **warn** | `Plant Biomass [note 5]` vs `Plant biomass [note 5]` preserved across bases (documented). UI must not merge by case-fold without care |
| C12 | `retrieved_at` timestamp drift | **warn** | `retrieval.json` 09:34:52Z vs manifest evidence 09:35:25Z — same pin/checksum; cosmetic only |

## Method notes
- Load factor ≠ capacity (MW) ≠ generation (TWh). This package is percent only.
- Prefer Excel pin over DUKES Chapter 6 narrative rounding (e.g. Onshore ~24.1% in prose vs 24.02 in table).
- Parent aggregates (`Wind`, `Hydro`, `Bioenergy…`, `All renewable technologies…`) sit alongside children — do not sum children into parents in the UI.
- Nuclear load factors (if wanted later) belong on DUKES 5.10 / a separate series — correctly left out of scope.

## Summary
- Pass: 10
- Warn: 2
- Fail: 0
- Blockers: none
- Recommended fixes (owner): none required for Ready. Optional Energy polish: align `retrieved_at` between `retrieval.json` and manifest on next pin refresh; document case-sensitive biomass labels in UI copy if surfaced.
- Notion action: **Ready** (critical checks passed; curated not edited).
