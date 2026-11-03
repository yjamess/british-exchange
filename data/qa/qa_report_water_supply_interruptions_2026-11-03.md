# QA — water-supply-interruptions — 2026-11-03

## Scope
- Ofwat WCPR 2024-25 open data XLSX (manual pin; CDN previously 403)
- Item APR3A_02 actual performance, minutes per property

## Checks
| ID | Result | Notes |
|----|--------|-------|
| C1 raw present | **pass** | sha256 `62fe9156388f76c04e36cd494ba927124dc7f239928dc0f7e1e257b91168976b` |
| C2 curated rows | **pass** | 168 rows |
| C3 ANH 2023-24 | **pass** | curated=9.1327104 vs excel day-fraction×1440 |
| C4 BLOCKED removed | **pass** | |

## Summary
- Blockers: none — promote Ready
