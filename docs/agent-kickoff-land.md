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
| Land Explorer | ~~Publisher FeatureServers + EA flood + Storage dumps~~ Done |
| Development Sites | ~~Brownfield register inventory~~ Done (allocations = labelled gap) |
| Planning Decisions | ~~P120 Decision Machine + Inspectorate appeals~~ Done |
| Historical Change | ~~Hectares + landmark GB years~~ Done (earlier SHP years deferred) |
| Data | ~~Table + provenance~~ Done |

## Phase sequence — closed 2026-11-10

1. ~~Expand P120 → received / decided / granted (same ODS).~~ Done — 171 obs; QA pass.
2. ~~Restructure land canvas views; ship Planning Decision Machine.~~ Done.
3. ~~Registry rows: brownfield + Planning Data coverage.~~ Done.
4. ~~Land Explorer spatial — publisher path + Storage dumps.~~ Done (T13).
5. ~~Validation QA on expanded planning + brownfield.~~ Pass.
6. ~~Historical Green Belt landmark years.~~ Done (T14).
7. ~~PINS Casework appeals instrument.~~ Done (T15).
8. ~~Labelled-gap closeout (allocations + case applications).~~ Done (T16).

## Caveats from brief (still true)

- Registration/allocation ≠ deliverable site. Local-plan allocations stay a labelled gap (no England polygon feed).
- Current designations ≠ historic years (landmark plates only on Historical change).
- Case-level applications stay a labelled gap — keep P120; do not scrape LPA portals.
