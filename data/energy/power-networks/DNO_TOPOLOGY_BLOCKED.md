# National DNO topology — Blocked (national) · SSEN pilot open

**Date:** 2026-11-07 (updated 2026-11-09)  
**Domain:** 07 Power Networks · Gate 3 gated item

## Why national remains Blocked

There is **no single official national distribution-network topology** (all substations, feeders, spare capacity by node) published under one open licence for Great Britain.

- **14 DNO licence areas** publish LTDS / open data on different schedules, schemas and licences.  
- **Local spare capacity by node** is not a national Official Statistics series.  
- Inventing a UK circuit map from incomplete operator feeds would fail Observatory honesty rules.

## Pilot unlocked — SSEN Distribution

Product owner dropped SEPD + SHEPD open assets into `data/energy/ssen-dno-pilot/` (2026-11-09).

| Layer | Status | Notes |
|-------|--------|-------|
| Substations + overhead lines | **Ready** (QA 2026-11-09) | indicator `ssen-distribution-network-atlas` |
| Lean display atlas | Pack `energy.ssen-dno-atlas` | Primary/Grid/Switching + EHV/EHV+ only · UI `&view=grid` |
| Raw CSVs | Supabase `bx-data-archive` | Pull for Validation; archive remains source of truth |
| Underground cables | Absent | Label overhead-only |
| Licence-area boundaries | Still to pin | Optional clip layer (SSEN open) |
| NGET / TO circuit GIS | **Held** | No clean public reuse; product owner emailing for licence |
| Connections 360 | **Held** | Same — outreach; TEC register already covers contracted queue |

Registry: [SSEN distribution network atlas (DNO pilot)](https://app.notion.com/p/4136547176858141b066ff8d9b836ca9)

## What would unblock a *national* product

1. Partner-supplied national topology with CRS + update cadence, **or**  
2. More named DNO pilots under pinned open licences (same pattern as SSEN), **or**  
3. Keep Study C Border anatomy + SSEN Invisible Grid pilot as the interim flagship spine.

## Related that proceeds without national DNO GIS

- Ready NESO **TEC Register**  
- Ready **ET 5.6** interconnector flows  
- NESO GSP / ETYS boundary open layers (next spine pass)  
- NESO thermal constraint costs (later; boundary mapping required)
