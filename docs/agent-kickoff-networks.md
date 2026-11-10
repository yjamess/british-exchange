# Kickoff — Power Networks (Domain 07)

**Opened:** 2026-11-07  
**Owners:** Energy (data) · Orchestrator/UI  
**Domain Notion:** https://app.notion.com/p/410654717685813e95fde77447f38ad5  
**Mode:** Study C + Queue + Capacity Gate 4 complete; **Invisible Grid SSEN pilot Ready + map** (2026-11-09). National DNO still deferred.

## Locked question

How does power move across Britain, where are the constraints and how is the network being changed?

## Creative thesis (Notion)

Infrastructural anatomy — cartography where real, schematics where topology matters. Flagship: **The Invisible Grid**. Never invent local spare capacity or treat a stylised circuit as an exact map.

## Delivered

| Item | Location |
|------|----------|
| Gate 1 inventory | `data/energy/power-networks/` |
| Gate 1 composition | `GATE1_COMPOSITION.md` — **Study C locked** |
| Ready series | `electricity-interconnector-flows` · `electricity-interconnector-capacity` · `transmission-entry-capacity-register` · `ssen-distribution-network-atlas` · reuse `gb-generation-mix-half-hourly` |
| **UI** | Border · Queue · **Invisible Grid** · Monthly imports · Data (Capacity retired — see Imports › Connectors) |
| Load | `loadNetworks()` (flows + capacity + TEC + SSEN atlas pack + counts) |
| Gate 4 (pre-grid) | [gate4-audit-networks.md](gate4-audit-networks.md) |
| SSEN QA | [qa_report_ssen_distribution_network_atlas_2026-11-09.md](../data/qa/qa_report_ssen_distribution_network_atlas_2026-11-09.md) |

## Routes

| URL | What |
|-----|------|
| `/energy?domain=networks` | Border anatomy ledger (UK ET 5.6 GWh) |
| `&view=queue` | Connections Queue — NESO TEC register MW |
| `&view=capacity` | Retired — redirects to `/energy?domain=imports&view=connectors` (cable capacity still on Networks › Data) |
| `&view=grid` | Invisible Grid SSEN pilot map |
| `&view=night` | GB NESO Imports fuel monthly TWh |
| `&view=data` | Observation tables |

## Still open

- National multi-DNO topology
- Thermal constraint costs
- Internal ET 5.6B transfers
- Licence-area boundary clip (optional)
- NGET / TO circuit GIS (commercial clearance)

## Forbidden

- Invent spare capacity or fake circuit maps
- Blend GB NESO with UK ET 5.6 without a geography label
- Treat GWh flows as MW capacity
- Fork interconnector capacity curated data (link Imports Connectors)
- Claim national Invisible Grid complete from the SSEN pilot alone
