# Kickoff — Parallel Wave B (Energy Domains 06–10 Gate 1 + Prices Gate 3)

**Opened:** 2026-11-07  
**Orchestrator:** this chat  
**Rule:** Agents run in parallel on **disjoint packages**. No shared UI. Validation then Orchestrator UI serialise (Manufacturing / Jobs first when inventory clears — they already have Ready series).

## Why parallel works here

| Safe in parallel | Must stay serial |
|------------------|------------------|
| New `src/energy/connectors/<name>.py` | `EnergyCanvas.tsx` / `sector-pages.ts` / shared explorer chrome |
| New `data/energy/<indicator>/` only | Editing another agent’s package or Ready sibling |
| Gate 1 evidence + Gate 2 connectors + Notion registry rows | Claiming Ready without Validation QA |
| Reusing an existing Ready series (link, don’t fork) | Duplicate pipelines for the same publisher table |

Wave A closed Domains 03–05 Gate 2 UI. Wave B fills Domains 06–10 evidence gaps and Prices Gate 3 gas bills.

## Locked domain questions (Notion)

| Domain | id | Notion | Question |
|--------|-----|--------|----------|
| 06 Renewables & Nuclear | `low-carbon` | [Renewables & Nuclear](https://app.notion.com/p/4106547176858123a229f9dbcb1a93e7) | How much low-carbon electricity is installed, generated and planned, and where is the new energy landscape taking shape? |
| 07 Power Networks | `networks` | [Power Networks](https://app.notion.com/p/410654717685813e95fde77447f38ad5) | How does power move across Britain, where are the constraints and how is the network being changed? |
| 08 Manufacturing | `manufacturing` | [Manufacturing](https://app.notion.com/p/41065471768581afa032dec7299a7cfb) | What does Britain manufacture today, how has the composition of output changed, and where does production take place? |
| 09 Jobs & Productivity | `industrial-work` | [Jobs & Productivity](https://app.notion.com/p/4106547176858136acd8c6d6369fa87e) | Where did industrial employment change, how did output per worker or hour change, and who experienced those changes? |
| 10 Industrial Policy | `policy` | [Industrial Policy](https://app.notion.com/p/41065471768581dca8fbf13058c8dce5) | Which public decisions, incentives, institutions and investments shaped Britain's energy and industrial trajectory, and what can the evidence actually establish? |

## Wave B assignments (exactly one owner each)

### B1 — Renewables & Nuclear (Domain 06)
- **Owner:** Energy (Low-carbon lane)
- **Reuse first (do not rewrite):** `renewable-energy-planning-operational`, `electricity-capacity-by-technology`, `electricity-generation-by-source`
- **Owns:** only new packages you create under `data/energy/` with distinct ids (e.g. nuclear capacity/generation, load factors) + matching connectors
- **Deliver:** Gate 1 gap inventory under `data/energy/renewables-nuclear/` (or package README); ≥1 new complementary series → Validation; registry row honest
- **Forbidden:** shared UI; Fossils/Prices/Imports/Networks packages; forking REPD/DUKES capacity pipelines

### B2 — Power Networks (Domain 07)
- **Owner:** Energy (Networks lane)
- **Reuse first:** Generation half-hourly / Imports interconnect context — link, don’t fork
- **Owns:** only new `data/energy/*interconnector*` / `*constraint*` / `*network*` / related packages + connectors
- **Deliver:** Gate 1 inventory vs Notion §5; smallest useful official series (prefer NESO/Ofgem/DESNZ open tables with clear licence); registry → Validation
- **Forbidden:** inventing local spare capacity; rewriting Generation/Imports curated data; shared UI

### B3 — Manufacturing + Jobs Gate 1 (Domains 08–09)
- **Owner:** Energy (Industry lane)
- **Reuse first (Ready + QA already):** `manufacturing-output-index`, `manufacturing-share-of-gva`, `manufacturing-employment` — audit vs Notion; do **not** re-ingest
- **Owns:** Gate 1 notes under `data/energy/manufacturing/` and/or `data/energy/jobs-productivity/`; **one** new complementary series max if a clear Gate 2 gap (e.g. manufacturing productivity / output-per-hour) with a new indicator id
- **Deliver:** Gap inventory + reuse map; if new series, hand-off for Validation; confirm Ready trio sufficient for Gate 2 Manufacturing UI
- **Forbidden:** editing existing manufacturing curated CSVs; Networks/Renewables/Prices packages; shared UI

### B4 — Prices Gate 3 · domestic gas bills
- **Owner:** Energy (Prices lane)
- **Source pin:** QEP 2.3.1 (`data/energy/energy-prices/source_register.csv` row `qep-231-domestic-gas-bills`)
- **Owns:** only `data/energy/domestic-gas-bills/` + `src/energy/connectors/domestic_gas_bills.py` (mirror electricity bills pattern)
- **Deliver:** Connector + curated + manifest + Validation notes; Notion registry → Validation
- **Forbidden:** claiming Domain 03 complete; inventing Ofgem cap; mixing gas GBP with industrial p/kWh; Fossils/Imports packages; shared UI (Orchestrator extends PricesCanvas after QA)

### B5 — Industrial Policy Gate 1 (Domain 10) — Orchestrator or thin Energy pass
- **Owner:** Orchestrator (inventory) unless a free Energy agent finishes B1–B4 early
- **Owns:** `data/energy/industrial-policy/` notes only (source register of Acts/strategies + candidate quantitative series e.g. business investment — link Economy if already Ready)
- **Deliver:** Gate 1 inventory; Blocked/candidate list — **no** invented causal ledger; no UI
- **Forbidden:** claiming Decision Ledger complete; forking Economy business-investment if it exists

## After Wave B (Orchestrator)

1. Schedule **Validation** per new indicator that claims ingest done.
2. **UI wave (serial):** Manufacturing Gate 2 → Jobs Gate 2 → Renewables → Networks → Policy (as data readiness allows); Prices gas extends existing PricesCanvas after gas QA.
3. Update `sector-pages.ts` questions to Notion-locked wording when wiring each domain UI (serial).

## Shared contract

- `from britain_exchange import Connector, Manifest, Observation`
- Skills: `.cursor/skills/energy-agent/SKILL.md` then Validation skill on hand-off
- Visual identity: `docs/visual-identity.md` — Wave B does **not** write UI
- Definition of done for an indicator: source URL, retrieval date, checksum, connector entrypoint, curated paths, Validation sample vs official release, Notion status Ready
