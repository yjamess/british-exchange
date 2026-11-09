# Kickoff — Housing Domain 07 Housing Quality

**Brief:** [Housing Quality](https://app.notion.com/p/40e654717685816cb965c1336cb686e5)  
**Question (locked):** What is the actual condition of Britain's homes, and how does housing quality differ according to location, building characteristics and tenure?  
**Owner:** Housing (connectors + registry); Orchestrator (cutaway / Energy Anatomy / State of Repair UI); Validation after ingest.  
**Parallel:** Domain 06 Land Explorer stays with the user — do not block Quality on spatial Land work.

## Design non-negotiables (brief)

- Look **inward** (architectural / forensic), not like a stock dashboard.
- Flagship is **Inside Britain's Homes** — engraved cutaway wired to real indicators; illustration does **not** assess any individual property.
- Distinguish observation types: survey estimate · resident report · administrative EPC · derived. Never invent a single “quality score”.
- England EHS figures stay labelled England — never UK / Britain totals.
- Surveyor damp ≠ resident-reported damp/mould — separate series.
- EPC register ≠ representative stock census — coverage caveats always on.
- Overcrowding reuses Stock / Census occupancy where Ready — no duplicate pipeline.
- No false local accuracy from national/regional sample estimates.

## Target views (Notion)

**Inside the Home · Energy · Condition · Geography · Data**  
Default opens **The condition of Britain's homes** (cutaway).

| View | Experience |
|------|------------|
| Inside the Home | Cutaway layers → evidence panel (condition, hazards, damp, space, energy) |
| Energy | Energy Anatomy — bands · heating · insulation · improvement; EHS ≠ EPC register |
| Condition | State of Repair — Decent Homes, Cat 1, damp; tenure / period |
| Geography | Only measures supported at selected scale (EPC grain ≠ EHS sample) |
| Data | Tables, definitions, downloads |

## Verified headlines (EHS 2024 dwellings, England — check annex before Ready)

Source chapter: [Chapter 1: Housing quality](https://www.gov.uk/government/statistics/chapters-for-english-housing-survey-2024-to-2025-headline-findings-on-housing-quality-and-energy-efficiency/chapter-1-housing-quality) (published 2026-01-29).

| Measure | Headline | Notes |
|---------|----------|-------|
| Non-decent (Decent Homes) | **15.3%** (chapter rounds to 15%) · ~4.0m | DA3201 2024 all dwellings · all tenures; PRS 22.1% · OO 14.7% · social 10.1% |
| HHSRS Category 1 hazard | **8.8%** (chapter rounds to 9%) · ~2.3m | DA4101 2024; PRS 10.3% · OO 9.4% · social 4.8% |
| Surveyor-recorded damp | **5.5%** (chapter rounds to 5%) · ~1.4m | DA5101 2024; PRS 9.9% · OO 3.8% · social 6.9% |
| Energy bands A–C | **56.2%** (chapter rounds to 56%) | DA7101 2024 col A/B/C; EHS modelled ≠ EPC register |

Pinned ODS (2026-11-04): `data/housing/_ehs_pin/2026-11-04/{DA3201,DA4101,DA5101,DA7101,DT3101}.ods`

## Ingest sequence

1. Pin EHS live tables / annex ODS: Decent Homes (`DA3201` / trends), hazards (`DA4101`), damp (`DA5101`), energy (`DA7101`).
2. Emit typed indicators with `series=` + tenure dimensions; registry rows.
3. Prototype cutaway SVG (keyboard / reduced-motion / mobile detail states) linked to those indicators.
4. Energy Anatomy view from EHS energy tables; EPC certificate pipeline later (lifecycle + bias gates).
5. State of Repair + Geography (defensible scales only).
6. Validation QA vs annex tables.

## Registry rows to create

| Indicator ID | Source |
|--------------|--------|
| `ehs-decent-homes` | EHS DA3201 / annex — % / count non-decent |
| `ehs-category-1-hazards` | EHS DA4101 / annex |
| `ehs-damp-surveyor` | EHS DA5101 / annex (surveyor) |
| `ehs-energy-efficiency-bands` | EHS DA7101 — bands A–C share (+ full band mix) |
| `ehs-heating` | EHS DA6101 — central heating, room heaters, condensing boilers |
| `ehs-insulation` | EHS DA6201 + Ch2 AT2.9 — wall, loft ≥200mm, full double glazing |
| `ehs-energy-improvement` | EHS Ch2 AT2.13–2.14 — improvable to C + mean cost |
| `epc-domestic-certificates` | EPB data (later — Scoping until pipeline designed) |

## Out of scope this wave

- Domain 06 Land Explorer / polygons.
- Individual-home “inspection report” fiction.
- Small-area EHS maps from national estimates.
- Full EPC bulk ingest (design coverage pipeline first).
