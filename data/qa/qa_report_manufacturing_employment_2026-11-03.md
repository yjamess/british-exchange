# QA report — Manufacturing employment — 2026-11-03

**Agent:** Validation (Energy self-QA hand-off)  
**Overall verdict:** **pass-with-warns**

## Scope

- Manifest: `data/energy/manufacturing-employment/manifest.yaml`
- Curated: `data/energy/manufacturing-employment/curated/observations.csv` (193 rows)
- Raw: `data/energy/manufacturing-employment/raw/2026-11-03/jwr7_lms.json`
- Registry: https://app.notion.com/40d65471768581e3a829d4cad506e0bc

## Freeze

| Item | Value |
|------|-------|
| SHA-256 | `183a4c071f83844af74520398bd4d0c8f56c3076dc22b8bd2ca7437a7256173b` |
| Series | JWR7 / LMS |
| Rows | 193 quarterly (1978 Q2 → 2026 Q2) |
| Spots | 1978Q2=6732; 2020Q2=2619; 2026Q2=2460 |

## Checks

| ID | Result | Notes |
|----|--------|-------|
| C1–C5 | pass | checksum, manifest, schema, uniqueness, full recompute 0 mismatches |
| C6 | pass | related_indicator_ids includes History long-run (no duplicate pipeline) |
| C7 | warn | 49 annual rows in raw JSON omitted from curated (documented) |

## Blockers

none

## Repro

```bash
uv run python -m validation.qa_manufacturing_employment_2026_11_03
```
