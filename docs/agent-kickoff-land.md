# Kickoff — Housing Domain 06 Planning & Land

**Brief:** [Planning & Land](https://app.notion.com/p/40e65471768581f6bdacec2e38c31367)  
**Question (locked):** How is Britain's land used, who decides what can be built on it, and how do those decisions shape the country?  
**Owner:** Housing (connectors + registry); Orchestrator (canvas / Anatomy + Decision Machine); Validation after ingest.  
**Rule:** Finish Domain 06 fully before later preparation domains.

## Non-negotiables

- England-only layers stay England — never “UK / Britain” coverage claims.
- Green Belt = planning **designation**, not a blanket build ban.
- Applications received in a period ≠ permissions granted in that period (unmatched sets).
- Do not compute permission rates from mismatched numerators/denominators.
- Reuse `green-belt-area`, `land-use-stock`, `planning-decisions-granted` — no duplicate pipelines.
- Spatial novelty must not invent boundaries or false precision.

## Already Ready

| Indicator | Use |
|-----------|-----|
| `green-belt-area` | England (+ region) Green Belt hectares over time |
| `land-use-stock` | England 2022 land-use shares |
| `planning-decisions-granted` | P120 received / decided / granted |
| `brownfield-land` | Planning Data register inventory (sites / ha / dwellings) |

## Target views (Notion)

**Land Explorer · Development Sites · Planning Decisions · Historical Change · Data**  
Default opens **The land beneath Britain** (Anatomy / Land Explorer).

| View | Needs |
|------|--------|
| Land Explorer | Spatial layers (Planning Data) + existing area/share series as national context |
| Development Sites | ~~Brownfield register inventory~~ Done (allocations / parcels later) |
| Planning Decisions | P120 received / decided / granted + Decision Machine |
| Historical Change | Dated geometries when available (later) |
| Data | Table + provenance |

## Phase 1 sequence (this wave)

1. ~~Expand P120 → received / decided / granted (same ODS).~~ Done — 171 obs; QA pass.
2. ~~Restructure land canvas views; ship Planning Decision Machine.~~ Done (Sites / Historical Change placeholder).
3. ~~Registry rows: brownfield + Planning Data coverage.~~ Done.
4. Land Explorer spatial — any of the 309 English districts, queried from Planning Data when opened and cached under `curated/live/`. The four full plates were deleted. Manchester, St Albans, York and Derbyshire Dales remain as starting places and use the same query. Allocations and appeals stay labelled gaps.
5. ~~Validation QA on expanded planning + brownfield.~~ Pass.

## Caveats from brief

- Registration/allocation ≠ deliverable site.
- Current designations ≠ historic years.
- Case-level applications/ownership need licence + quality gates before publish.
