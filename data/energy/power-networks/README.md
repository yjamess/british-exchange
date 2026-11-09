# Power Networks — Gate 1 inventory (Domain 07)

**Domain Notion:** [Power Networks](https://app.notion.com/p/410654717685813e95fde77447f38ad5)  
**Locked question:** How does power move across Britain, where are the constraints and how is the network being changed?  
**Wave:** Parallel Wave B2 — Gate 1 inventory + Gate 2 ingest (no UI)  
**Owner:** Energy (Networks lane)  
**Date:** 2026-11-07

## Reuse first (do not fork)

| Indicator | Package | Why link |
|-----------|---------|----------|
| `gb-generation-mix-half-hourly` | `data/energy/gb-generation-mix-half-hourly/` | NESO GB half-hourly mix includes an `Imports` fuel component — operational GB context for interconnector *supply share*, not link-level trade. Geography **GB**, not UK. |
| `energy-imports-and-exports` | `data/energy/energy-imports-and-exports/` | DESNZ ET 1.3 all-fuels Imports/Exports in **ktoe**. Aggregate energy balance — not electricity GWh by corridor. |

## Gate 2 vertical slice (this wave)

| Indicator | Package | Source |
|-----------|---------|--------|
| `electricity-interconnector-flows` | `data/energy/electricity-interconnector-flows/` | DESNZ **ET 5.6** quarterly Imports / Exports / Net imports by interconnector corridor (GWh), OGL v3.0 |

This answers “how does power move across borders” with official link-level trade. It does **not** invent local spare capacity, topology, or constraint assignment.

## Geography boundaries (honest)

| Layer | Geography | Notes |
|-------|-----------|-------|
| ET 5.6 electricity trade | **UK** (`K02000001`) | Includes NI–Republic of Ireland; France column sums IFA + IFA2 + ElecLink (Note 2) |
| NESO operational / generation mix | **GB** (`K03000001`) | England, Scotland, Wales — Northern Ireland excluded |
| Internal transfers (ET 5.6B) | UK nations / grids | Scotland↔England, Scotland↔NI — **not** international interconnectors |
| Distribution networks | DNO licence areas | Operator investment plans / geospatial — licence & coverage vary; **Blocked** for Gate 2 national series |

Never blend GB NESO MW with UK ET 5.6 GWh without a labelled geography break.

## What is Blocked / deferred

See [source_register.csv](source_register.csv). Hard Blocked for Gate 2:

1. **Invented local spare capacity** — no official national “spare MW by substation” series; do not fabricate.
2. **Stylised circuit as exact map** — schematic topology ≠ surveyed assets.
3. **NESO NTC restriction files as “capacity”** — published only when NESO applies a restriction; sparse, not rated nameplate capacity.
4. **Full DNO geospatial atlas** — multi-operator, mixed licences, incomplete national coverage.
5. **Connection-queue ETAs** — NESO registers give contracted TEC dates where published; speculative project completion dates are out of scope.

## Cross-domain journeys (evidence links only)

1. Interconnector corridor (this series) → `energy-imports-and-exports` / Imports & Security (contextual: all-fuels vs electricity).
2. ET 5.6 Imports → `gb-generation-mix-half-hourly` `fuel=Imports` (contextual: UK quarterly GWh vs GB monthly derived MWh).
3. Constraint costs (Gate 3 candidate) → Renewables / Industrial Policy when a Ready constraint series exists.

Full candidate table: [source_register.csv](source_register.csv).
