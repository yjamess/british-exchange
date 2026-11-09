# Validation notes — manufacturing-iop-by-division (Energy self-check)

**Date:** 2026-11-07  
**Owner:** Energy (Industry)  
**Status:** **Ready** (Orchestrator after Validation pass-with-warns — `data/qa/qa_report_manufacturing_iop_by_division_2026-11-07.md`)  
**Indicator:** `manufacturing-iop-by-division`  
**Series:** ONS DIOP Section C CVMSA catalogue (36 CDIDs; excludes K22A)

## Paths

| Artefact | Path |
|----------|------|
| Manifest | `data/energy/manufacturing-iop-by-division/manifest.yaml` |
| Raw pin | `data/energy/manufacturing-iop-by-division/raw/2026-11-07/diop.csv` |
| Curated | `data/energy/manufacturing-iop-by-division/curated/observations.csv` |
| Connector | `src/energy/connectors/manufacturing_iop_by_division.py` |

## Freeze

| Item | Value |
|------|-------|
| SHA-256 | `9ccd31271f98f97340a62f6ac207c8fbf2ef83f5c0a2c11d054e612b7a76e7a0` |
| Retrieved | 2026-11-07 |
| Official release (DIOP row) | 2026-10-15 |
| Observations | 33 984 (36 series × monthly rows with values/missing as published) |
| Series count | 36 (13 subsections + 22 divisions + 1 combined 11+12) |

## Spot samples (2026-08)

| CDID | SIC | Value |
|------|-----|-------|
| K22C | 10 Food | 99.4 |
| K232 | 20 Chemicals | 94.2 |
| K23U | 29 Motor vehicles | 87.8 |
| K22A (raw only, not curated) | C headline | 102.3 — matches Ready `manufacturing-output-index` |

## Method

1. Download DIOP current CSV from ONS landing.
2. Select explicit CDID catalogue under Section C (CA–CM + divisions 10–33 + DM4H).
3. Keep monthly labels only; map to ISO month bounds; UK `K02000001`.
4. Do not emit K22A rows.

## Suggested Validation checks

- [ ] Checksum matches manifest `raw_evidence`
- [ ] Recompute curated from pinned CSV; confirm 36 CDIDs and zero `series=K22A`
- [ ] Spot K22C / K232 / K23U vs ONS DIOP / IoP release tables
- [ ] Confirm Ready K22A still matches DIOP column K22A for a shared month
- [ ] Confirm `classification=combined_division` only for DM4H (11+12)
- [ ] Confirm annual/quarterly DIOP period rows are omitted

## Reproduce

```bash
uv run python -m energy.connectors.manufacturing_iop_by_division
```

## Blockers / honesty

- Divisions 11 and 12 have no separate CVMSA columns in DIOP — combined only.
- Marked Ready by Orchestrator after Validation (2026-11-07).
