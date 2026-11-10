# Domain 06 gap hunt — allocations, appeals, applications

Retrieved: 2026-11-10 · Re-probe: 2026-11-10 (post-appeals) · Bulk-file probe + T14 map fix: 2026-11-10 afternoon

Domain question: *How is Britain's land used, who decides what can be built on it, and how do those decisions shape the country?*

## Summary

| Gap | Verdict | Product |
|-----|---------|---------|
| Appeals | **Shipped** (T15) | Planning decisions › Inspectorate appeals — aggregates only, no geocode |
| Allocations | Labelled gap | No England polygon feed; brownfield ≠ allocation |
| Local-plan status (adjacent) | **Shipped** (T17) | Planning decisions › Local plans — plan age, preparation stage, every council (`local-plan-status`) |
| Case applications | Labelled gap | P120 district totals until Planning Data publishes cases |
| Historical Green Belt map (T14) | **Fixed** | Plates rebuilt at screen resolution; map drawn inside England with named cities and a key |

**Domain 06 closed** with the two national gaps labelled in Explorer honesty copy. T17 local plans shipped from the bulk-file finding.

## Appeals — SHIPPED (T15)

- GOV.UK Casework Database page: HTTP 200
- XLSX links found on page: 2
  - https://assets.publishing.service.gov.uk/media/6ad9fcc1c818345ad8aca325/Casework_Database_-_2610.xlsx
  - https://assets.publishing.service.gov.uk/media/6ad9fcd12263175ac2aca2f7/Older_Casework_Data_-_2610.xlsx
- Decision: **shipped** — OGL casework aggregates on Planning decisions (`pm=appeals`). Addresses stay text; no geocode.

Field profile of the current file (sheet `Data Set`, release 2026-10-26), for Validation:

| Check | Result |
|-------|--------|
| Cases | 91,216 rows, 91,216 unique case numbers |
| Decision date span | 2021-10-01 → 2026-09-30 — first and last years are part years |
| Decision | Dismissed 53,525 · Allowed 24,326 · Unknown 3,186 · rest enforcement outcomes and split decisions |
| LPA | Named on every row; 3,163 rows coded `Legacy LPA` instead of an ONS code |
| Site Green Belt | Yes 8,631 · No 80,380 · blank 2,205 |
| Number of residences | Populated (> 0) on 25,200 rows |
| Site location | Free-text `Site Address` only — no coordinates, no UPRN |
| Errors seen | One `Received Date` after retrieval (2026-12-09); some `Call In Date` values are Excel serials |

- Allowed share (planning + householder + CAS, April–March years, allowed ÷ allowed + dismissed): 2022-23 30.8% · 2023-24 30.8% · 2024-25 31.0% · 2025-26 32.4%. T15's calendar-year, all-casework rates are 31.1–33.2%: same picture, different basis. Check both against the PINS official statistics release before the registry row moves past Validation.
- Green Belt sites: 7,595 planning appeals, 2,263 allowed and 5,172 dismissed. Candidate follow-up panel linking appeals to Historical Change (table, not map).

## Local-plan allocations — LABELLED GAP (national)

- `local-plan`: HTTP 503 (re-probe)
- `development-plan-document`: HTTP 503
- `brownfield-land`: HTTP 503 (dataset page; dumps already in Storage for Explorer)
- entity sample local-plan: HTTP 503
- site-allocations consideration page: HTTP 503 (deprioritised in design notes)
- Decision: **labelled gap** for England polygons. Brownfield remains the national development-sites layer. London GLA Site Allocations only if a labelled London pilot is commissioned.

Bulk files on `files.planning.data.gov.uk/dataset/` (afternoon probe):

| File | HTTP | Size |
|------|------|------|
| `site-allocation.csv` | 403 | — |
| `allocation.csv` | 403 | — |
| `development-plan-boundary.csv` | 403 | — |
| `local-plan-housing-numbers.csv` | 403 | — |
| `local-plan.csv` | **200** | 371 KB |
| `local-plan-boundary.csv` | **200** | 40 MB |
| `development-plan-document.csv` | **200** | 1.1 MB |
| `development-plan-timetable.csv` | **200** | 2.6 MB |

- Still no allocation polygons, so the gap stands.
- **Local-plan status is available, though.** `local-plan.csv` has 987 plan records across 331 organisations. Stage: adopted 421 · regulation 18 67 · draft 35 · examination 24 · regulation 19 16 · submitted 11 · withdrawn 9 · **blank 403**. `required-housing` on 367 rows; boundary reference on 855; adoption date and plan period present.
- It answers "who decides" at plan level (which councils have an adopted plan, how old, how many homes it requires). Blank stage on 41% of rows must be labelled as missing, not inferred.
- **Shipped T17 (2026-11-10):** `local-plan` + `organisation` → `local-plan-status`. 293 of 310 LPAs have an adopted plan in the data; 212 adopted 5+ years ago; 137 preparing a new plan. Adoption date falls back to `start-date` (blank `adopted-date`) for 202 plans; joint plans credited to every member. `local-plan-boundary` and `development-plan-timetable` not used yet (timetable `actual-date` / `predicted-date` are blank; dates sit in `start-date` — usable for a later milestones view). Validation samples 10 councils' own plan pages.

## Case-level planning applications — LABELLED GAP

- planning-application dataset JSON: HTTP 503
- entity API limit=1: HTTP 503
- dump /dataset/planning-application.csv: HTTP 403 (re-probed afternoon, still 403 · 111 bytes)
- Decision: **labelled gap**. Keep Live Tables P120 as the applications/decisions product. Do not scrape LPA portals.

## Historical Green Belt (T14) — map fixed

The first Historical Change map could not be read: hatched fragments, no England, no place names, no key, cut off at the bottom.

| Problem | Cause | Fix |
|---------|-------|-----|
| Boundary shattered into triangles | Connector simplified to 0.05° then 0.08° (≈5–8 km) | 0.002° / 0.006° (≈0.5 km, under a screen pixel); parts and holes < 0.0004 sq° dropped |
| No sense of place | No England outline; frame was each year's Green Belt extent | ONS Countries (Dec 2024) England outline in every plate; one fixed England frame so years compare |
| Shapes unnamed | — | City marks (London, Birmingham, Manchester, Liverpool, Leeds, Sheffield, Nottingham, Newcastle, Bristol, Oxford, Cambridge, York, Stoke-on-Trent) + key |
| Holes filled | Non-zero fill rule | `fill-rule: evenodd` |
| Same map offered twice | `2021-22` and `2022` layers identical (185 features, same geometry, both 31 March 2022) | `2022` dropped |
| Years read as codes ("2019-20") | — | Menu reads "31 March 2020"; stage title "England's Green Belt: how much, and where"; figures add change in a year and since first record |

Still deferred: 1997 and mid-2010s boundaries (MHCLG GeoServer SHAPE-ZIP 504). No year between published files is drawn.
