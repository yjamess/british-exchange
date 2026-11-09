# LNG terminal coordinates (draft · not Ready)

**Related indicator:** `lng-imports-by-terminal` (DUKES 4.6 volumes — Ready)  
**Owner:** Energy · Gate 3 Imports Lifelines residual  
**Status:** **Blocked** for map pins — three harbour-authority positions sourced; Teesside GasPort has no harbour-authority pin; package not Validated.

Lifelines UI keeps **RankBars for LNG** until this package is Ready and Validation passes.

## Sourced pins (WGS 84 decimal degrees)

Converted from published Notice to Mariners positions (harbour authorities). Approximate berth / cargo-arm positions — not DESNZ GIS.

| DUKES 4.6 name | Lat | Lon | Authority source | Notes |
|----------------|-----|-----|------------------|-------|
| Isle of Grain | 51.432342 | 0.709080 | Port of Sheerness Ltd NtM 25/2014 — Jetty 10 cargo transfer arms `51° 25.9405'N 00° 42.5448'E` ([PDF](https://msba.org.uk/wp-content/uploads/2014/09/NtoM252014-Isle-of-Grain-LNG-Jetties-8-10-Reminder-of-vessel-exclusion-zone.pdf)) | Jetty 8 also published at 51.432182, 0.702933; map pin uses Jetty 10 |
| Dragon (Milford Haven) | 51.683667 | −4.999667 | Milford Haven Port Authority NtM 004/2026 — `51°41'.02N 004°59'.98W` ([notice](https://www.mhpa.co.uk/notice-to-mariners/notice-to-mariners-no-004-of-2026-dragon-lng-terminal-dive-inspection/)) | Approximate dive / terminal position |
| South Hook (Milford Haven) | 51.697906 | −5.077394 | MHPA NtM 064/2023 — Berth 2 `51°41' 52.46N 005°04' 38.62W` ([notice](https://www.mhpa.co.uk/notice-to-mariners/notice-to-mariners-no064-of-2023-crane-barge-operations-south-hook-lng-terminal-berth-2/)) | Berth 2 maintenance position |
| Teeside GasPort (Teeside) | — | — | **No harbour-authority pin found** | Excelerate: operated 2007–2015, then decommissioned. GEO/GEM coords are secondary aggregators — **do not invent** a Ready pin from them |

## Honesty

- Do not use Wikipedia / GEM / Global Energy Observatory alone for Ready pins.
- Do not invent pipeline landfalls or shipping routes.
- Map UI must label pins as harbour-authority berth positions, not DESNZ facility centroids.
- Teesside remains in the volume series (historical zeros/idle years); without an official pin it stays **off-map** (RankBars / table only).

## Next (Energy → Validation)

1. Optional: pin Teesside from PD Teesport / Admiralty chart citation if a published NtM exists.
2. Curate `terminals.csv` + checksum evidence; connector or documented procedure.
3. Validation sample vs source notices.
4. Orchestrator wires Lifelines LNG UK pin map only after Ready.
