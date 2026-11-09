# QA report — renewable-energy-planning-pipeline — 2026-11-07

## Scope
- Indicator: `renewable-energy-planning-pipeline` (DESNZ REPD — non-operational stages)
- Raw: `data/energy/renewable-energy-planning-pipeline/raw/2026-11-06/REPD_Publication_Q2_2026.csv`
- Curated: `curated/observations.csv` (142 status × technology rows)
- Manifest / notes: `manifest.yaml`, `validation_notes.md`, `README.md`
- Connector (read-only review): `src/energy/connectors/renewable_energy_planning.py` (shared with Ready `renewable-energy-planning-operational`)
- Method: independent SHA-256 of pinned raw + independent status×technology MW re-sum vs curated; no re-ingest; Energy curated/raw not edited

## Checks
| ID | Check | Result | Notes |
|----|-------|--------|-------|
| C1 | Pinned raw SHA-256 vs manifest | **pass** | Actual `84c1b5f958a934d8b4b86ec88f50bdcf43830ded7ff2efc27bffca0c98695035` matches manifest, `retrieval.json`, and Ready operational sibling pin (byte-identical copy) |
| C2 | Same connector module (no forked REPD pipeline) | **pass** | `energy.connectors.renewable_energy_planning` exposes both operational and pipeline connectors; `_ensure_pipeline_raw_pin` copies the operational pin (`shutil.copy2`) — no second fetch |
| C3 | Operational excluded | **pass** | Raw has 3,132 Operational rows (58,603.6 MW); zero curated rows with `status=Operational` |
| C4 | Full parse ↔ curated reconcile | **pass** | `parse_pipeline` → 142/142 multiset match vs curated |
| C5 | Claimed Under Construction Solar PV | **pass** | Independent sum = **3213.16 MW** = curated `status=Under Construction; technology=Solar Photovoltaics` |
| C6 | Claimed Awaiting Construction total | **pass** | Independent sum across technologies = **146996.67 MW** (Energy note 146996.7) |
| C7 | Status inventory honesty | **pass** | Pipeline includes refused / withdrawn / abandoned / expired as well as active stages; 13 non-operational status labels in curated. UI must filter `status=` for Field Guide conveyor |
| C8 | ≥150 kW publisher threshold | **pass** | Documented in manifest caveats; confirmed on GOV.UK REPD landing (≥150 kW; ≥1 MW before 2021) |
| C9 | Geography / unit / period | **pass** | All `K02000001`; unit `MW`; extract window 2026-07-01→2026-09-30; `source_version=REPD_Q2_2026` |
| C10 | Float string noise in curated CSV | **warn** | ~38 values show binary float tails (e.g. `78.69999999999999`). Sums match raw; cosmetic — optional Energy round on next write |
| C11 | `retrieved_at` drift (copy vs manifest) | **warn** | `retrieval.json` `2026-11-06T22:48:17Z` (copied from operational) vs manifest evidence `2026-11-07T15:36:03Z`. Same checksum; cosmetic |
| C12 | Newer REPD extract on landing page | **warn** | Live GOV.UK page (fetched 2026-11-07) lists a July 2026 / Aug update. Package correctly pins Q2 2026 alongside Ready operational sibling — do not silently swap pins |

## Method notes
- One source → two indicators. Pipeline MW ≠ built capacity; do not blend with operational sibling without a labelled break.
- Zero-MW status×technology combos are omitted by design (`mw <= 0` skipped) — not a coverage gap for charts.
- Nuclear is not in REPD (correctly out of scope).
- Encoding of the pin is cp1252 (same as operational QA).

## Summary
- Pass: 9
- Warn: 3
- Fail: 0
- Blockers: **none**
- Recommended fixes (owner: Energy): optional float rounding on next curated write; optional align `retrieved_at` wording for the copied pin. No data rewrite required.
- Notion action: **do not mark Ready** (Validation hand-off only; Orchestrator decides).
- Independence: curated/raw untouched.
