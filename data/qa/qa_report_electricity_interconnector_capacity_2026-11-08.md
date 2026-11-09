# QA report — electricity-interconnector-capacity — 2026-11-08

## Scope
- Indicator: `electricity-interconnector-capacity` (NESO Interconnector Register)
- Raw: `data/energy/electricity-interconnector-capacity/raw/2026-11-08/interconnector-register-05-november-2026.csv`
- Curated: `data/energy/electricity-interconnector-capacity/curated/observations.csv` (35 rows)
- Manifest / notes: `manifest.yaml`, `validation_notes.md`, `README.md`
- Connector (read-only review): `src/energy/connectors/neso_interconnector_register.py`
- Method: independent SHA-256 + full connector re-parse vs curated + Built MW sample vs pinned CSV; no re-ingest; Energy curated/raw not edited

## Checks
| ID | Check | Result | Notes |
|----|-------|--------|-------|
| C1 | Pinned raw SHA-256 vs manifest | **pass** | Actual `97e09cef423d9530d14fa7342d6d3a6ed3369e8b1690717fd83159a311624dcf` |
| C2 | Full parse ↔ curated | **pass** | parsed=35 curated=35 multiset_match=True |
| C3 | Built import-current sample (11 links) | **pass** | built=11; IFA=1988.0; Viking=1500.0 |
| C4 | Gate honesty (1 / 2 / unassigned only) | **pass** | gates={'unassigned': 23, '1': 11, '2': 1} |
| C5 | Geography GB (not UK) | **pass** | All curated rows K03000001 / Great Britain |
| C6 | Unit MW · measure=mw_import | **pass** | Import-side firm TEC; export MW in notes only |
| C7 | Built pin date from filename | **pass** | Filename interconnector-register-05-november-2026 → 2026-11-05 |
| C8 | Capacity distinct from ET 5.6 flows | **pass** | Unit is MW only; related_indicator_ids includes electricity-interconnector-flows |

## Method notes
- Built current import MW is a pin-date snapshot, not a commissioning ETA.
- Contractual rows use MW Effective From + Import Increase/Decrease.
- Do not blend GB capacity MW with UK ET 5.6 GWh without labelled units.

## Summary
- Pass: 8
- Warn: 0
- Fail: 0
- Blockers: none
- Recommended fixes (owner: Energy): none required for acceptance.
- Notion action: Orchestrator may mark Ready after this report.
- Independence: curated/raw untouched.
