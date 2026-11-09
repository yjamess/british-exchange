# QA report — transmission-entry-capacity-register — 2026-11-07

## Scope
- Indicator: `transmission-entry-capacity-register` (NESO TEC Register)
- Raw: `data/energy/neso-tec-register/raw/2026-11-07/tec-register-05-november-2026.csv`
- Curated: `curated/observations.csv` (2211 rows)
- Manifest / notes: `manifest.yaml`, `validation_notes.md`, `README.md`
- Connector (read-only review): `src/energy/connectors/neso_tec_register.py`
- Related Blocked item: `data/energy/power-networks/DNO_TOPOLOGY_BLOCKED.md` (national DNO topology — not this series)
- Method: independent SHA-256 + full connector re-parse vs curated + Gate / date-basis honesty checks vs pinned CSV and NESO portal notes; no re-ingest; Energy curated/raw not edited

## Checks
| ID | Check | Result | Notes |
|----|-------|--------|-------|
| C1 | Pinned raw SHA-256 vs manifest | **pass** | Actual `35ec21f98e34e89c1e8e861fe1922c9fc852d69e9154f253539d5bce3bd9a097` matches manifest and `retrieval.json` |
| C2 | Full parse ↔ curated | **pass** | `parse_tec_register` → 2211/2211 multiset match; connector reports `built_connected_pin_snapshot=364; skipped_rows=9` |
| C3 | Claimed first dated sample PRO-003804 | **pass** | Raw: MW Increase/Decrease **92.4**, Effective From **31/10/2034**, Gate blank. Curated: value **92.4**, period **2034-10-31**, `gate=unassigned`, `date_basis=mw_effective_from_contractual` |
| C4 | Gate honesty (1 / 2 / unassigned only) | **pass** | Curated gates: Gate1=893, Gate2=150, unassigned=1168. No invented Gate 3+. Blank raw Gate → `unassigned` only. Matches NESO portal note (Gate blank until countersigned) |
| C5 | Skipped rows documented | **pass** | 9 Built rows with MW Connected=0 and blank Effective From correctly skipped (no usable MW/date). Raw 2220 − curated 2211 = 9 |
| C6 | Date bases — no speculative ETAs | **pass** | 1847 rows `mw_effective_from_contractual` (publisher Effective From); 364 Built pin-snapshots use filename date **2026-11-05** + `MW Connected`. No invented connection ETAs |
| C7 | Geography GB (not UK) | **pass** | All curated rows `K03000001` / Great Britain. NI excluded as claimed |
| C8 | Connections Reform duplicate capacity risk | **pass** (method) | NESO portal warns stage/technology aggregates may duplicate. Curated retains stage where present (255 rows); **118** Project IDs appear on >1 curated rows. Manifest caveats correctly forbid summing `cumulative_mw` without dedupe |
| C9 | DNO topology not invented | **pass** | Zero `dno`/`ltds` inventions in curated notes. National DNO topology remains Blocked in `DNO_TOPOLOGY_BLOCKED.md`; this package is connections queue only |
| C10 | Unit / status | **pass** | All `unit=MW`, `observation_status=final` |
| C11 | Live portal filename vs pin | **warn** | Portal curl example may show a different dated CSV (register updates twice weekly). Package correctly freezes `tec-register-05-november-2026.csv` — do not treat live drift as a curated fail |

## Method notes
- Value semantics: contractual MW increase (or Built connected MW at pin date) — not a speculative commissioning ETA.
- Host TO codes (`NGET`/`SHET`/`SPT`) are transmission hosts, not a DNO topology atlas.
- Do not blend GB TEC MW with UK REPD/DUKES totals without a labelled geography break.

## Summary
- Pass: 10
- Warn: 1
- Fail: 0
- Blockers: **none**
- Recommended fixes (owner: Energy): none required for acceptance. Optional later: aggregate view by `plant_type` × `gate` with explicit Project-ID dedupe rules for UI charts.
- Notion action: **do not mark Ready** (Validation hand-off only; Orchestrator decides).
- Independence: curated/raw untouched.
