# Kickoff — Parallel Wave A (Energy Domains 03–05 · ingest only)

**Opened:** 2026-11-07  
**Launched:** 2026-11-07 (A1–A3 agents in flight)  
**Orchestrator:** this chat  
**Rule:** Agents run in parallel on **disjoint packages**. No shared UI. Validation then Orchestrator UI serialise.

## Why parallel works here

| Safe in parallel | Must stay serial |
|------------------|------------------|
| New `src/energy/connectors/<name>.py` | `EnergyCanvas.tsx` / `sector-pages.ts` / shared explorer chrome |
| New `data/energy/<indicator>/` only | Editing another agent’s package or manifest |
| Gate 1 evidence + Gate 2 connectors + Notion registry rows | Claiming Ready without Validation QA |
| Reusing an existing Ready series (link, don’t fork) | Duplicate pipelines for the same publisher table |

Domain 02 taught us: **close Notion gaps before moving on** — but different domains can Gate-1/ingest at once if paths don’t overlap.

## Wave A assignments (exactly one owner each)

### A1 — Energy Prices & Costs (Domain 03)
- **Notion:** [Energy Prices & Costs](https://app.notion.com/p/41065471768581b6a1f2c431166de362)
- **Owner:** Energy (Prices lane)
- **Owns:** only `data/energy/*price*` / `*bill*` packages you create + matching connectors
- **Reuse first:** `industrial-electricity-prices` (Ready) — do not re-ingest; registry-link and note coverage gaps
- **Deliver:** Gate 1 source pin + taxonomy notes under a new `docs/` or package README; ≥1 new household or industrial series connector + curated hand-off; registry → Validation
- **Forbidden:** `web/src/brand/energy/**` except reading patterns; Fossils/Imports packages

### A2 — Oil, Gas & Fossil Fuels (Domain 04)
- **Notion:** [Oil, Gas & Fossil Fuels](https://app.notion.com/p/410654717685815db976d589af8be69f)
- **Owner:** Energy (Fossils lane)
- **Owns:** only `data/energy/*gas*` / `*oil*` / `*coal*` / `*fossil*` packages you create
- **Reuse first:** `domestic-gas-production`, `primary-energy-production`, Generation long-run coal — link, don’t fork
- **Deliver:** Gate 1 inventory vs Notion; fill highest-priority missing series; registry → Validation
- **Forbidden:** Prices/Imports packages; shared UI

### A3 — Energy Imports & Security (Domain 05)
- **Notion:** [Energy Imports & Security](https://app.notion.com/p/410654717685813f8062c65191f6c0bb)
- **Owner:** Energy (Imports lane)
- **Owns:** only extensions under `data/energy/energy-imports-and-exports/` **or** new sibling packages with distinct indicator ids
- **Reuse first:** `energy-imports-and-exports` (Ready) — audit vs Notion brief; add missing dimensions only
- **Deliver:** Gap list + any new connector; registry status honest (Ready stays Ready; new rows → Validation)
- **Forbidden:** rewriting Prices/Fossils data; shared UI

## After Wave A (Orchestrator)

1. Schedule **Validation** per indicator that claims ingest done (`data/qa/`).
2. **UI wave (serial):** one domain explorer at a time — Prices first — using Housing/Energy chrome.
3. Do **not** open Domain 06–10 UI until Wave A QA clears blockers; Gate 1 inventory for 06–10 can start as Wave B if paths stay free.

## Shared contract

- `from britain_exchange import Connector, Manifest, Observation`
- Skills: `.cursor/skills/energy-agent/SKILL.md` then Validation skill on hand-off
- Visual identity: `docs/visual-identity.md` — agents writing UI later wrap with `BrandRoot`; Wave A does not write UI
- Definition of done for an indicator: source URL, retrieval date, checksum, connector entrypoint, curated paths, Validation sample vs official release, Notion status Ready
