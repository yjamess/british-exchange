# Kickoff — Power Networks (Domain 07)

**Opened:** 2026-11-07  
**Owners:** Energy (data) · Orchestrator/UI (Study C deepen)  
**Domain Notion:** https://app.notion.com/p/410654717685813e95fde77447f38ad5  
**Mode:** Interim deepen shipped (Study C) — Domain 07 **not** complete; Invisible Grid deferred

## Locked question

How does power move across Britain, where are the constraints and how is the network being changed?

## Creative thesis (Notion)

Infrastructural anatomy — cartography where real, schematics where topology matters. Flagship: **The Invisible Grid**. Never invent local spare capacity or treat a stylised circuit as an exact map.

## Delivered

| Item | Location |
|------|----------|
| Gate 1 inventory | `data/energy/power-networks/` |
| Gate 1 composition | `GATE1_COMPOSITION.md` — **Study C locked** |
| Ready series | `electricity-interconnector-flows` · reuse `gb-generation-mix-half-hourly` |
| **Gate 2 UI** | `/energy?domain=networks` · Border anatomy · Britain After Dark lite · Data |
| Load | `loadNetworks()` (links ET 5.6; no curated fork) + existing `loadYearMix()` |

## Gate 2 routes

| URL | What |
|-----|------|
| `/energy?domain=networks` | Border anatomy ledger (UK ET 5.6 GWh) |
| `&view=night` | GB NESO Imports fuel monthly TWh |
| `&view=data` | Catalogue records |

## Still open

- Invisible Grid topology / substations
- Thermal constraint costs
- Connections Queue
- Interconnector nameplate MW register
- Internal ET 5.6B transfers

## Forbidden

- Invent spare capacity or fake circuit maps
- Blend GB NESO with UK ET 5.6 without a geography label
- Treat GWh flows as MW capacity
- Claim Invisible Grid or Domain 07 complete
