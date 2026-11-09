# Kickoff — Energy Domain 01 Electricity Generation

**Brief:** [Electricity Generation](https://app.notion.com/p/410654717685812d9babc01e2f053c63)  
**Sector:** [Energy & Industry](https://app.notion.com/p/40d6547176858194bc18cec7be0a812d)  
**Question (locked):** How did Britain move from coal-fired electricity to today's generation mix, what does that change actually mean, and what connects power generation to the rest of the country?  
**Owner:** Energy (connectors + registry); Orchestrator (Changing Current / canvas UI); Validation before any new Ready mark.  
**Rule:** Finish Domain 01 Gate 2 before opening Domains 02–10 as full builds. Thin Notion scaffolds for 02–10 are not kickoffs.

**Skill:** `.cursor/skills/energy-agent/SKILL.md`  
**UI grammar:** [visual-identity.md](visual-identity.md) · copy Housing’s Explorer shell (`SectorPage` + `Explorer`); new composition only inside the stage. No parallel palette, tab shape, or chart style.

## Non-negotiables

- UK (`K02000001`) from ET 5.1 is not Great Britain. Do not blend NESO / GB operational series with UK annual/quarterly totals without an explicit geography break.
- Generation (TWh) ≠ capacity (GW) ≠ fuel used (Mtoe). Separate units on separate scales.
- Never sum `Total wind` or `Total all generating companies` with component fuels (documented double-count; API defaults `include_aggregates=false`).
- Reuse `electricity-generation-by-source` — no second generation-by-fuel pipeline.
- Milestones are dated sources, not causal claims. “What replaced coal?” is an investigation, not a verdict from the mix alone.
- Station atlas and half-hourly views stay Gate 3 until coverage and licence are checked.
- Brand: one electric ink; RankBars / TimeChart / ChangeRows only; Signal red never in charts; reduced motion respected.

## Already Ready

| Indicator | Geography | Use |
|-----------|-----------|-----|
| `electricity-generation-by-source` | UK quarterly (ET 5.1 Table 5.1b, All generating companies) | Flagship mix: absolute TWh + share; Changing Current + Archive |

Paths: `src/energy/connectors/electricity_generation.py`, `data/energy/electricity-generation-by-source/`, QA `data/qa/qa_report_2026-11-03.md` (pass-with-warns).  
Registry: [Electricity generation by source](https://app.notion.com/p/40d65471768581839535dd21683f6238).

Spot anchors (pinned release 2026-09-29): Q1 1998 Coal 35.3887 TWh · Q2 2026 Gas 18.3708 · Nuclear 8.742 · Total wind 19.1559 · Total 68.562.

## Grain decision (Gate 1 — locked for Gate 2)

**Calendar-year totals** derived by summing the four calendar quarters of **component** fuels only (never aggregate rows).  
- Source remains ET 5.1 quarterly; the annual view is Exchange-derived and labelled as such.  
- A year with fewer than four quarters is **partial** (provisional styling / note), not interpolated.  
- Optional DUKES annual sheet stays Gate 3 secondary — not a fork for Gate 2.

## Fuel taxonomy (Gate 1 — locked for Gate 2)

| Display id | ET 5.1 labels | Notes |
|------------|---------------|--------|
| `coal` | Coal | |
| `gas` | Gas | |
| `nuclear` | Nuclear | |
| `onshore-wind` | Onshore wind | |
| `offshore-wind` | Offshore wind | |
| `solar` | Solar | |
| `hydro` | Hydro (natural flow) | |
| `bioenergy` | Bioenergy | Breaks Q1 2007 / Q1 2013 — keep caveat |
| `oil` | Oil | |
| `other` | Other fuels; Shoreline wave / tidal | Wave/tidal kept out of “Total wind” double-count |
| `storage` | Pumped storage; Battery storage | Not generation of primary energy |

**Excluded (aggregates):** `Total wind`, `Total all generating companies`.

**Stack history (≤5 layers for TimeChart):** coal · gas · nuclear · renewables (wind + solar + hydro + bioenergy + wave/tidal) · other (oil + other fuels + storage).

## Target views (Notion)

**Changing Current · Compare · Capacity ≠ Electricity · Power Station Atlas · A Year in Power · Data** — default opens **The Changing Current**.

| View | Gate | Needs |
|------|------|--------|
| Changing Current | 2 | Annual composition (RankBars); Share / Absolute; year; fuel isolate + trajectory (TimeChart); source pane; URL state; Follow this fuel |
| Compare | 2 | Two years side-by-side via ChangeRows (and/or dual RankBars); difference labelled |
| Capacity ≠ Electricity | 3 | Installed capacity (GW) + generation (TWh) |
| Power Station Atlas | 3 | Partial atlas only if register coverage and licence clear |
| A Year in Power | 3 | Operational short-interval with GB/UK caveats |
| Data / Archive | 2 | Searchable curated observations; fuel taxonomy; revision notes |

## Selection model (URL)

`domain` · `view` · `measure` (`share` \| `absolute`) · `year` · `fuel` · `compare` (second year) · `from`/`to` (trajectory window) · `source_version` when multiple releases exist.

Coordinated: year and fuel persist when switching Current ↔ Data ↔ Compare. Only render supported options.

## Connection types (Follow this fuel)

| Type | Meaning | Gate 2 example |
|------|---------|----------------|
| Direct | Same canonical series / fuel entity | Stay on generation, open Data for that fuel |
| Contextual | Related measure, different definition | Gas → `/energy?domain=fossil` (domestic gas production when Ready) |
| Analytical | Documented comparison with assumptions | Deferred to editorial investigation |

UI must say **why related** and **what you will learn**. No decorative network.

## Implementation sequence

### Gate 1 — Evidence and visual research

1. Lock taxonomy + annual grain (above).
2. Three treatments considered: RankBars composition (ship) · TimeChart stack of five groups (trajectory context) · morphing plate (defer — must stay quantitatively honest).
3. Map Follow journeys to Ready records only (or honest “not linked yet”).

### Gate 2 — First working experience

1. `/energy?domain=generation` via shared SectorPage + Explorer; generation rail status Ready.
2. Changing Current: RankBars year mix + fuel TimeChart; Share/Absolute; provisional/partial years.
3. Compare view: ChangeRows between two years.
4. Data view: table + download; source line (publisher, series, geography, unit, release, retrieval, derived annual note).
5. URL state; keyboard + reduced motion; colour-independent fuel labels (names, not colour alone).
6. One Follow-this-fuel contextual hop (gas → fossil domain / catalogue).
7. Align `sector-pages.ts` question with locked Notion wording.

### Gate 3+ — done (2026-11-06)

Capacity (DUKES), Year (NESO GB half-hourly → monthly), Station atlas (REPD points + DUKES 5.11 fossil/nuclear) — Ready except Validation on `uk-power-stations-dukes`. Coal extras: “From peak to zero” reading + closure milestones.

### Gate 4 — Structural and editorial audit — **done**

See `data/qa/qa_energy_domain01_gate4_2026-11-06.md` (13/13 pass).

## Registry / ingest

| Indicator ID | Source | Status |
|--------------|--------|--------|
| `electricity-generation-by-source` | ET 5.1 TWh | Ready — do not re-ingest |
| `electricity-generation-long-run` | DESNZ Electricity since 1920 | Ready (UI) |
| `electricity-capacity-by-technology` | DUKES 5.12.C installed MW | Ready — QA 2026-11-06 |
| `gb-generation-mix-half-hourly` | NESO Historic GB Generation Mix | Ready — QA 2026-11-06 |
| `renewable-energy-planning-operational` | DESNZ REPD (renewables) | Ready — QA 2026-11-06; OSGB points on atlas |
| `uk-power-stations-dukes` | DUKES 5.11 Fossil + Nuclear | Ingested — Validation pending |

## Do not

- Touch `src/economy/` or rewrite Housing datasets.
- Mark new indicators Ready without Validation.
- Imply station-level output from the national ET 5.1 series.
- Call REPD alone a complete power-station atlas (pair with DUKES 5.11; still not every licence).
- Blend NESO GB half-hours into UK ET 5.1 annuals without a labelled break.
- Open Domains 02–10 full canvases until Domain 01 Gate 2 ships (Gate 2 done).
- Invent a second design system under `web/src/styles/` or sector pigments.
