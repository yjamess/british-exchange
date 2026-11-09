# QA report — manufacturing-iop-by-division — 2026-11-07

**Agent:** Validation  
**Overall verdict:** **pass-with-warns**  
**Notion:** not marked Ready (Orchestrator hand-off only)

## Scope

- Indicator: `manufacturing-iop-by-division` (ONS DIOP Section C CVMSA — subsections CA–CM + divisions 10–33; K22A excluded)
- Manifest: `data/energy/manufacturing-iop-by-division/manifest.yaml`
- Raw: `data/energy/manufacturing-iop-by-division/raw/2026-11-07/diop.csv`
- Curated: `data/energy/manufacturing-iop-by-division/curated/observations.csv` (33 984 rows)
- Connector (read-only): `energy.connectors.manufacturing_iop_by_division`
- Energy notes: `data/energy/manufacturing-iop-by-division/validation_notes.md`
- Distinct from Ready `manufacturing-output-index` (K22A) — that pipeline untouched
- Official: [ONS Index of Production time series (current)](https://www.ons.gov.uk/economy/economicoutputandproductivity/output/datasets/indexofproduction/current)

## Freeze

| Item | Value |
|------|-------|
| Claimed SHA-256 | `9ccd31271f98f97340a62f6ac207c8fbf2ef83f5c0a2c11d054e612b7a76e7a0` |
| Observed SHA-256 | `9ccd31271f98f97340a62f6ac207c8fbf2ef83f5c0a2c11d054e612b7a76e7a0` |
| Retrieved | 2026-11-07 |
| Official release (DIOP row) | 2026-10-15 |
| Rows | 33 984 (36 CDIDs × 944 monthly periods) |
| Series | 36 = 13 subsection + 22 division + 1 combined_division (DM4H 11+12) |

## Checks

| ID | Check | Result | Notes |
|----|-------|--------|-------|
| C1 | Freeze — pinned raw SHA-256 vs manifest | **pass** | Exact match; no re-ingest as primary path |
| C2 | Curated coverage — 33 984 UK monthly rows; unique keys | **pass** | Geo `K02000001` only; periods 1948-01 → 2026-08; unique `(period_start, series, geo)`; 0 dupes |
| C3 | Method — 36 catalogue CDIDs; all CVMSA; K22A absent | **pass** | Curated CDIDs == connector `SECTION_C_SERIES`. Zero `series=K22A` in curated. All 36 DIOP titles end CVMSA |
| C4 | Method — combined 11+12 honesty; divisions 11/12 not invented | **pass** | Only `classification=combined_division` is DM4H (`sic=11+12`). No separate 11 or 12 CVMSA rows |
| C5 | Method — monthly only; annual/quarterly DIOP rows omitted | **pass** | Raw has 944 monthly + 393 non-monthly period labels; curated has only monthly (`YYYY-MM-01` starts) |
| C6 | Numerical — Energy spots 2026-08 vs pinned raw | **pass** | K22C food = **99.4**; K232 chemicals = **94.2**; K23U motor vehicles = **87.8**. Curated = raw column exact |
| C7 | Numerical — Ready K22A still matches DIOP (untouched) | **pass** | Raw DIOP K22A 2026 AUG = **102.3** = Ready `manufacturing-output-index` curated 2026-08. Headline not forked into this package |
| C8 | Numerical — full recompute curated from pinned raw | **pass** | `ManufacturingIopByDivisionConnector.transform` → 33 984 rows, **0** mismatches vs curated (period bounds, value, geo, series) |
| C9 | Independence / no silent rewrite | **pass** | Validation did not edit Energy curated/raw/manifest. Connector inspected read-only |
| C10 | ONS DIOP correction context (1996–97) | **warn** | Landing lists a **21 Oct 2026** correction (selected 1996–97 series) superseding the 15 Oct file. Pin retrieved **7 Nov** from `/current` with in-file release date still **2026-10-15**. 2026-08 spots unaffected. Optional: Orchestrator may ask Energy to re-pin/compare if absolute certainty on 1996–97 is needed |
| C11 | Early missing values as published | **warn** | 11 676 curated cells empty (`observation_status=missing`) where DIOP has no value for early months of shorter series — expected, not a transform bug |

## Numerical samples (Validation)

| Period | CDID | SIC / label | Pinned raw | Curated | Match |
|--------|------|-------------|------------|---------|-------|
| 2026-08 | K22C | 10 Food | 99.4 | 99.4 | exact |
| 2026-08 | K232 | 20 Chemicals | 94.2 | 94.2 | exact |
| 2026-08 | K23U | 29 Motor vehicles | 87.8 | 87.8 | exact |
| 2026-08 | K22A (raw only) | C Manufacturing | 102.3 | *not curated* | Ready = 102.3 |

## Summary

- Pass: **9**
- Warn: **2**
- Fail: **0**
- Blockers: **none**
- Recommended fixes (owner Energy): none required for Validation accept. Optional: confirm pin equals post-21-Oct DIOP correction for 1996–97, or re-pin `/current` and re-checksum if Orchestrator wants a hard freeze against the corrected file.
- **Notion:** do **not** mark Ready from this agent — Orchestrator decides after review.

## Reproduce

```bash
# checksum
shasum -a 256 data/energy/manufacturing-iop-by-division/raw/2026-11-07/diop.csv

# recompute from pinned raw (transform only; do not rewrite curated for QA)
uv run python -c "
from energy.connectors.manufacturing_iop_by_division import ManufacturingIopByDivisionConnector
c = ManufacturingIopByDivisionConnector()
e = c.evidence_from_pinned_raw()
obs = c.transform([e])
print(e.checksum_sha256, len(obs))
"
```
