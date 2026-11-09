# Reuse map — Jobs & Productivity (Domain 09) Gate 1

**Locked question:** Where did industrial employment change, how did output per worker or hour change, and who experienced those changes?

**Notion:** [Jobs & Productivity](https://app.notion.com/p/4106547176858136acd8c6d6369fa87e)  
**Wave:** B3 · Energy (Industry lane) · 2026-11-07  
**Rule:** Reuse Manufacturing employment Ready series; do **not** fork History long-run employment pipelines. Do not invent productivity by dividing output by jobs.

## Ready / new series

| Notion §1 / §5 need | indicator_id | Package | Series | Geography | Frequency | Status |
|---------------------|--------------|---------|--------|-----------|-----------|--------|
| Manufacturing employment (workforce jobs) | `manufacturing-employment` | `data/energy/manufacturing-employment/` | ONS JWR7 / LMS | UK | quarterly | **Ready** + QA (reuse) |
| Manufacturing output per hour (productivity) | `manufacturing-output-per-hour` | `data/energy/manufacturing-output-per-hour/` | ONS DJK6 / PRDY | UK | quarterly | **Ready** + QA |
| Matched output trajectory (Jobs vs Output) | `manufacturing-output-index` | `data/energy/manufacturing-output-index/` | ONS K22A / DIOP | UK | monthly | **Ready** + QA (reuse; reindex carefully) |

### Cross-sector (do not fork)

| Need | Owner | Action |
|------|-------|--------|
| Whole-economy output per hour | Economy `labour-productivity` (LZVB / PRDY) | Link for national context; **not** manufacturing |
| Long-run manufacturing employment | History `long-run-manufacturing-employment` | Catalogue / journey only — Jobs uses modern JWR7 |
| Real earnings / pay | Economy / ONS ASHE | Earnings gaps stay candidate (see source_register) |

## Domain boundaries with Manufacturing (08)

- **Manufacturing owns** volume index + GVA share + Production Anatomy composition story.
- **Jobs owns** employment change, official productivity (output per hour/job), earnings, and Labour Landscape geography when regional sources clear Validation.
- Shared Ready employment/output series are **linked once** in the registry — one connector each.

## Gate 2 Jobs readiness (honest)

National Jobs vs Output + Productivity Machine **shipped** as Study C interim (2026-11-07), reusing Ready employment + output index + DJK6 with disclosed frequency/base-year differences. Regional Employment Atlas, earnings, and demographics remain Gate 3 / blocked until sourced.
