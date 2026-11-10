# Validation notes — ssen-distribution-network-atlas

**Owner:** Energy  
**Pin date:** 2026-11-09  
**Status:** **Ready** after Validation QA 2026-11-09 — `data/qa/qa_report_ssen_distribution_network_atlas_2026-11-09.md`

## Sample checks (Validation)

1. Substation raw row count ≈ **125 900**; OHL segment count ≈ **140 057**.
2. Owner split includes both **SEPD** and **SHEPD**.
3. Atlas substations are **Existing** only and type ∈ {Primary, Grid/Bulk Supply pt, Switching Station}.
4. Atlas lines are **EHV** or **EHV+** only; every feature has ≥2 lon/lat coordinates.
5. Checksums in `raw/2026-11-09/retrieval.json` match archived objects in `bx-data-archive`.
6. Copy states: SSEN pilot only; overhead only; not spare capacity; © SSEN Distribution.

## Open (non-blocking)

- Confirm Overhead Lines portal Rights text still CC BY 4.0 on republish.
- Optional: pin licence-area boundary polygons for map clip.
