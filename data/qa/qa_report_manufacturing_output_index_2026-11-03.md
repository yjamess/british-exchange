# QA report — Manufacturing output index — 2026-11-03

**Agent:** Validation (Energy self-QA hand-off)  
**Overall verdict:** **pass-with-warns**

## Scope

- Manifest: `data/energy/manufacturing-output-index/manifest.yaml`
- Curated: `data/energy/manufacturing-output-index/curated/observations.csv` (944 rows)
- Raw: `data/energy/manufacturing-output-index/raw/2026-11-03/k22a_diop.json`
- Registry: https://app.notion.com/40d65471768581af8d35fbee740cd16f

## Freeze

| Item | Value |
|------|-------|
| SHA-256 | `09bad65a53ca3b1e057af434a4173f60bbc691ee76487d0c44e790b6542e924b` |
| Series | K22A / DIOP (IOP: C:MANUFACTURING: CVMSA) |
| Rows | 944 monthly (1948-01 → 2026-08) |
| Spots | 1948-01=23.9; 2020-04=71.9; 2026-08=102.3 |

## Checks

| ID | Result | Notes |
|----|--------|-------|
| C1–C6 | pass | checksum, manifest, schema, uniqueness, full recompute, CVMSA title |
| C7 | warn | quarters/years in raw omitted from curated (documented) |

## Blockers

none

## Repro

```bash
uv run python -m validation.qa_manufacturing_output_index_2026_11_03
```
