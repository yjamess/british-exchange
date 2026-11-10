# QA report — ssen-distribution-network-atlas — 2026-11-09

## Scope
- Indicator: `ssen-distribution-network-atlas` (SSEN Distribution DNO Invisible Grid pilot)
- Raw: `data/energy/ssen-dno-pilot/raw/2026-11-09/substation-locations-nov-2026.csv` · `data/energy/ssen-dno-pilot/raw/2026-11-09/overhead-lines-nov-1-2026.csv`
- Curated: `data/energy/ssen-dno-pilot/curated/observations.csv` (32 rows) · `data/energy/ssen-dno-pilot/curated/spatial_meta.json`
- Pack (UI): `energy.ssen-dno-atlas` / `energy.ssen-dno-spatial-meta` (Storage)
- Manifest / notes: `manifest.yaml`, `validation_notes.md`, `README.md`
- Connector (read-only rebuild): `src/energy/connectors/ssen_dno_pilot.py`
- Method: independent SHA-256 + full rebuild from raw vs curated/spatial_meta; no re-ingest; Energy curated/raw not edited

## Checks
| ID | Check | Result | Notes |
|----|-------|--------|-------|
| C1 | Pinned raw SHA-256 vs retrieval.json + manifest | **pass** | subs=6eb19abd1fe1… ohl=132740b30562… |
| C2 | Independent rebuild totals vs Energy pin | **pass** | raw_subs=125900 raw_ohl=140057 atlas_subs=4649 atlas_ohl=14412 |
| C3 | Curated observations ↔ rebuild kinds/values | **pass** | curated=32 rebuilt=32 match=True |
| C4 | spatial_meta.json counts ↔ rebuild | **pass** | owners SEPD=65709 SHEPD=60191 |
| C5 | Atlas filters (Existing types + EHV/EHV+) and WGS84 coords | **pass** | types=Counter({'Switching Station': 3478, 'Primary': 1167, 'Grid/Bulk Supply pt': 4}) nets=Counter({'EHV': 13269, 'EHV+': 1143}) |
| C6 | Atlas includes SEPD and SHEPD | **pass** | atlas_owners={'SHEPD': 693, 'SEPD': 3956} |
| C7 | Geography + honesty (pilot / overhead / not spare capacity / CRS) | **pass** | crs=EPSG:4326 |
| C8 | Licence / attribution (CC BY 4.0 · © SSEN Distribution) | **pass** | Portal Rights for Overhead Lines remain confirm-on-republish (Energy open Q). |

## Method notes
- Display atlas is a filtered view of the pin (Existing Primary/Grid/Switching + EHV/EHV+). Full HV 11 kV stays in archived raw only.
- Geography is SSEN SEPD + SHEPD only — not a national DNO product and not spare capacity by node.
- Overhead-lines portal Rights should be re-confirmed when SSEN republishes (Energy open question; not a fail on this pin).

## Summary
- Pass: 8
- Warn: 0
- Fail: 0
- Blockers: none
- Recommended fixes (owner: Energy): none required for acceptance.
- Notion action: Orchestrator may mark **Ready** after this report.
- Independence: curated/raw untouched.
