# British Exchange — Work plan

## Adopt Electric spectrum · 2026-11-15

1. **Orchestrator — in progress:** user selected Electric spectrum. Promote twelve chart inks and companion sage ground to shared brand tokens; use one sequence for lines/stacks/legend/readout; let dense legends wrap full names; update visual identity and mark study adopted. Verify live ten-series spending chart, mobile and shared checks.

## Alternative chart palettes · 2026-11-15

1. **Orchestrator — complete:** three lab-only twelve-ink palette studies at `/design-lab/palettes` (Electric spectrum, Mineral daylight, Citrus & ink), linked from lab index. Real HMT spending functions compared against current five-ink palette. TimeChart accepts opt-in comparison tones; live tokens/defaults intact. Full names, line/composition modes, focus, contrast measurements, companion grounds and greyscale inspection included. TypeScript and targeted ESLint passed; browser verified ten unique series colours per study, view/focus controls and 390px layout. Every proposed chart ink has ≥3:1 contrast against paper (minimums 3.44/3.31/3.08). Screenshots `/private/tmp/bx-palette-{desktop,mobile,stack}.png`.

## Complete sector readout sweep · 2026-11-15

1. **Orchestrator — complete:** audited all ten Energy domains; migrated remaining custom selected-place/field-guide records and shared station, field, network and country map readouts; Useful Energy now uses shared card with pointer/touch/focus/Escape inspection. Added shared inline placement API.
2. **Housing sub-agent — complete:** audited all ten Housing domains; migrated custom map, selected-feature, comparison and scenario readouts in ten Housing components.
3. **Orchestrator — complete:** reviewed Housing handoff; full TypeScript passed and targeted ESLint has no errors (four existing Energy warnings). Checked Energy field guide and Housing supply at desktop/mobile widths; Useful Energy keyboard/pointer/Escape/mobile checks passed. Full coverage: [readout-rollout.md](readout-rollout.md).

## Shared inspection readout · 2026-11-15

1. **Orchestrator — complete:** extracted Tax Machine’s labelled paper card into exported `ReadoutCard`; migrated TaxYearRows, TaxDragRows, RevenueRows, shared TimeChart and legacy chart hover cards across Housing, Economy and Energy. People has no current readout implementation. Single-series values retain their labels; missing/provisional states, keyboard inspection and chart swatches are preserved. Removed obsolete card CSS. Added usage guidance to visual identity and exchange-domain-view. Targeted ESLint and TypeScript passed. Visually compared Tax Machine and Economy inflation cards at 1440px, plus inflation at 390px; screenshots in `/private/tmp/bx-readout-{tax,economy,mobile}.png`. Housing/Energy full-page visual checks were limited by slow page loads; their cards use the same shared renderers.

## Source-foot placement reference · 2026-11-15

1. **Orchestrator — implemented:** applied exchange-domain-view, explorer-stage rule and visual-identity shared source layout: one Sources & notes disclosure with source names in its summary, View data at right, disclosure content below, mobile source wrapping. Shared FigureRecord covers Economy, Housing and Energy. Browser screenshot comparison remains outstanding.

## Compact Economy source feet · 2026-11-15

1. **Orchestrator — complete:** per user clarification, Economy feet show publisher and source name only; removed coverage/date suffixes and the KAI7 pin. Shared desktop foot aligns source beside Notes and Data, with source wrapping below on mobile. Targeted lint and diff checks run.

## Shared explorer header spacing · 2026-11-15

1. **Orchestrator — complete:** removed the question’s additional 24px top margin. The shared header now uses its 16px grid gap on both sides of the question, across sectors and screen sizes. Verified shared CSS and checked the targeted diff.

## Glossary presentation · 2026-11-15

1. **Orchestrator — complete:** refined glossary typography, entry spacing, search feedback and section navigation within the shared visual identity. Targeted ESLint and TypeScript checks passed; browser visual review remains outstanding. Follow-up: data-catalogue inspired ruled search, numbered section headings and aligned column labels; retains PlainPage per visual-identity.md. Follow-up ESLint passed; full TypeScript check now reports unrelated nullable-number errors in TaxCanvas.tsx:517 and :522.

## Energy & Industry · Domain 01 Electricity Generation · 2026-11-06

Follow [Energy & Industry](https://app.notion.com/p/40d6547176858194bc18cec7be0a812d) and [Electricity Generation domain brief](https://app.notion.com/p/410654717685812d9babc01e2f053c63). Kickoff: [agent-kickoff-generation.md](agent-kickoff-generation.md).

**Domain 01 question (locked):** How did Britain move from coal-fired electricity to today's generation mix, what does that change actually mean, and what connects power generation to the rest of the country?

**Status:** **complete** (2026-11-09) — Gates 1–4; Gate 4 re-check cleared body-note drift. Audit: [gate4-audit-generation.md](gate4-audit-generation.md) · prior QA `data/qa/qa_energy_domain01_gate4_2026-11-06.md`.  
**Updated:** 2026-11-09  
**Orchestrator:** this chat  
**Rule:** Notion Gate 2 = named flagship + Ready evidence + one journey — not a recycled line-chart shell. Gate 1 composition studies required before locking UI.

1. **Done — Domain 01–10 Gate 2** · deepen wave complete
2. **Done — Gate 3 tranche A** · stations Ready · gas Dissected Bill layers (2.3.4)
3. **Done — G3B-00 source discovery** · `data/energy/gate3-source-discovery/`
4. **Done — Gate 3 gated** · Ofgem+CPIH Ready · NSTA licence · DNO Blocked note
5. **Done — Gate 3 tranche B** · Imports · IoP/BRES · REPD/TEC/5.10 · NSTA spatial — all Ready
6. **Done — UI / UX pass** · Generation history + map (Housing pan/zoom; Notes/Data grammar)
7. **Done — Gate 4** · Domains 01–07 structural audits closed 2026-11-09 (national DNO Blocked; SSEN pilot = N06)
8. **Done — Station atlas wave 2** · Regions (mapped GW ranks) + Openings & closures (DESNZ List of Electricity Generators decades) on `/energy?domain=generation&view=atlas` (`atlas=regions|openings`); live points carry region / operational / commission years; historical register experimental (Notes caveat) — no invented joins to live sites; map foot instruction strip removed

### E01 — Gate 1 evidence + fuel taxonomy
- Owner: Energy + Orchestrator
- Status: done
- Output: kickoff taxonomy + annual grain; `web/src/brand/energy/fuels.ts`
- Notes: aggregates excluded; stack history uses five groups

### E02 — Gate 2 Changing Current (first explorer)
- Owner: Orchestrator (UI) + Energy (series already Ready)
- Status: done
- Inputs: `electricity-generation-by-source`; `Explorer` / `SectorPage`; brand charts
- Output: `/energy?domain=generation` · Changing Current · Compare · Data · Share/Absolute · two-year compare · URL state · Follow-this-fuel · a11y
- Notes: locked Notion question in `sector-pages.ts`; Housing Notes/Coverage/stageTitle pattern applied

### E03 — Gate 3 capacity / atlas / short-interval
- Owner: Energy + Orchestrator (+ Validation)
- Status: done
- Inputs: DUKES 5.12.C; NESO year mix; REPD operational
- Output: Capacity · Year · Renewables atlas all live and Ready
- Notes: see E03a–c

### E03a — Validation QA capacity (Gate 3)
- Owner: Validation
- Status: done
- Output: `data/qa/qa_report_electricity_capacity_2026-11-06.md`

### E03b — A Year in Power (NESO half-hourly, GB)
- Owner: Energy + Orchestrator
- Status: done
- Output: `gb-generation-mix-half-hourly`; `/energy?domain=generation&view=year`
- Notes: QA 6/6; Notion Ready

### E03c — Renewables atlas (REPD, honest coverage)
- Owner: Energy + Orchestrator + Validation
- Status: done
- Output: `renewable-energy-planning-operational`; `/energy?domain=generation&view=atlas`
- Notes: QA 9/9; Notion [Ready](https://app.notion.com/p/41065471768581eaa19fc687e6b766f7)

### E03d — Station atlas polish (OSGB points · fossil/nuclear · coal extras)
- Owner: Energy (+ Validation for Ready)
- Status: done (ingest); Validation pending for `uk-power-stations-dukes`
- Output: `energy.geo.osgb`; REPD `atlas.json` points; `uk-power-stations-dukes`; `StationPointMap`; coal reading “From peak to zero” + closure milestones
- Notes: `/energy?domain=generation&view=atlas` — family filter; NI DUKES sites listed not plotted; QA draft `data/qa/qa_uk_power_stations_dukes_2026-11-06.md`

### E04 — Gate 4 structural + editorial audit
- Owner: Orchestrator + Validation
- Status: done (re-check 2026-11-09)
- Output: `data/qa/qa_energy_domain01_gate4_2026-11-06.md` (13/13 pass) · [gate4-audit-generation.md](gate4-audit-generation.md)
- Notes: 2026-11-09 moved remaining atlas/year body method notes into Notes foot

### Review — Energy Domain 01 (complete)
- **Shipped:** Gates 1–4; Station atlas (REPD + DUKES 5.11); six explorer views
- **Blocked:** none for stations ingest — Validation QA **pass** 2026-11-07 (`qa_report_uk_power_stations_dukes_2026-11-07.md`) → Ready
- **Next:** Domains 07+ when Orchestrator schedules (01–06 Gate 4 closed)

---

## Energy & Industry · Domain 02 Energy Consumption · 2026-11-06

Follow [Energy Consumption](https://app.notion.com/p/410654717685812499c8ca3a99f1b9c2). Kickoff: [agent-kickoff-consumption.md](agent-kickoff-consumption.md).

**Domain 02 question (locked):** Who uses Britain's energy, for what purposes, where does it go, and how has this changed over time?

**Status:** **complete** (2026-11-07) — intensity + cutaway closed; Domain 03 Prices unblocked.

### C01 — Gate 1 evidence + Metabolism visual language
- Owner: Energy + Orchestrator
- Status: done
- Inputs: ECUK 2026 (C/U/W/P/I); catalogue XLSX; `industrial-energy-consumption` Ready
- Output: `data/energy/energy-consumption-ecuk/` (five XLSX + methodology PDF, `source_register.csv`, `GATE1_TAXONOMY.md`, `GATE1_METABOLISM.md`)
- Notes: Flagship choice = stacked composition + W1 strip. C1 2025 all-final total 127 688.54 ktoe. Subnational still separate product.

### C02 — Gate 2 national final consumption + Metabolism spine
- Owner: Energy → Validation → Orchestrator (UI)
- Status: done
- Inputs: C01 pin
- Output: `final-energy-consumption-by-sector` (2912 obs); `primary-energy-flow-allocation` (336 obs); `/energy?domain=consumption`
- QA: `data/qa/qa_report_energy_consumption_c1_w1_2026-11-06.md` — 15 pass / 1 warn
- Registry: [Final energy consumption by sector](https://app.notion.com/p/4106547176858136bf03d3c05acc909b) · [Primary energy flow allocation](https://app.notion.com/p/41065471768581d18928cb6afe8cc5e1) Ready
- Notes: 2025 all-final Total 127 688.54 ktoe; Industry 616/616 matches Ready industrial series

### C03 — Gate 3 partial (ingest + first UI)
- Owner: Orchestrator (UI) + Energy (new pins)
- Status: done (partial vs Notion §3)
- Output: useful toggle; Follow electricity; U3 end-use; subnational regions
- Notes: Declared “done” too early — remaining gaps are C04–C08

### C04 — The Changing Appetite (Notion §3B)
- Owner: Orchestrator
- Status: done
- Inputs: `final-energy-consumption-by-sector`
- Output: view `appetite` — Absolute / Share / Index; Then/Now two-year compare; URL `compare` / `base`
- Notes: Demand narrative distinct from Generation; no causal fuel-substitution claims

### C05 — The Useful Energy Experiment (Notion §3D)
- Owner: Energy + Orchestrator
- Status: done (published path); user-scenario recalculation deferred
- Inputs: W1 useful/rejected; `curated/assumed_efficiencies.json` from Assumed Efficiencies sheet
- Output: view `useful` — modelled bands + coefficients table; no national efficiency score
- Notes: User scenarios withheld until labelled as non-DESNZ

### C06 — Energy Geography depth (Notion §3C)
- Owner: Energy + People + Validation
- Status: done (totals + intensity); UI polish 2026-11-07 — shared `RegionMap` + search/click
- Inputs: `subnational-final-consumption` + `authorities.json` + People `subnational-population-estimate` + brand `RegionMap` (`web/src/brand/map/`)
- Output: Measure Total | Per resident; map + clickable nation/region ranks (Housing `geoSplit`); LA SearchControl + clickable top-20 / match ranks; place drill-down
- Notes: Denominator mid-year ONS; regions fall back to mid-2024; Barnsley/Sheffield April-2025 codes unmatched (warn); StationPointMap stays generation-specific

### C07 — Inside Britain's Energy Use depth (Notion §3A)
- Owner: Orchestrator + Energy
- Status: done
- Output: purpose-drawn `energyCutaway` plate (`l-16-energy-cutaway.png`) + chips; U3; U1 cross-sector Ready

### C08 — Follow journeys + Gate 4 audit
- Owner: Orchestrator + Validation
- Status: done; re-audit note 2026-11-07
- Output: `data/qa/qa_energy_domain02_gate4_2026-11-06.md` + population QA `qa_report_subnational_population_estimate_2026-11-07.md`

### Review — Energy Domain 02
- **Shipped:** Metabolism · Appetite · end-use (U3+U1 + cutaway plate) · geography (map+LA+intensity) · Useful Experiment · Follow 1–4 · Data
- **Blocked:** none for Domain 02 product gaps
- **Next:** Domain 03 Prices Gate 2 (done below)

---

## Energy & Industry · Domain 03 Energy Prices & Costs · 2026-11-07

Follow [Energy Prices & Costs](https://app.notion.com/p/41065471768581b6a1f2c431166de362). Kickoff: [agent-kickoff-prices.md](agent-kickoff-prices.md).

**Domain 03 question (locked):** What does energy really cost British households and industries, how has that changed, and what is being compared?

**Status:** **complete** (2026-11-09; UI empty-state polish 2026-11-10) — Gates 1–4. Flagship Dissected Bill + Afford · Shock · Geography · Wholesale. Gate 4: [gate4-audit-prices.md](gate4-audit-prices.md). Earnings / MPP cloud packs still backlog for Afford & Wholesale charts.

### P01 — Gate 1 + domestic bills ingest + QA
- Owner: Energy → Validation
- Status: done
- Output: `domestic-electricity-bills` Ready; reuse `industrial-electricity-prices`; Gate 1 under `data/energy/energy-prices/`
- QA: `data/qa/qa_report_domestic_electricity_bills_2026-11-07.md` — 9 pass / 1 warn

### P02 — Gate 2 UI vertical slice (thin)
- Owner: Orchestrator (UI)
- Status: done (superseded by P04 for flagship encoding)
- Inputs: Ready `domestic-electricity-bills` + `industrial-electricity-prices`
- Output: `/energy?domain=prices` · views `bill` · `economies` · `data`

### P03 — QEP 2.2.4 unit + standing ingest + QA
- Owner: Energy → Validation
- Status: done
- Output: `domestic-electricity-unit-standing` (2048 obs); connector `domestic_electricity_unit_standing.py`
- QA: `data/qa/qa_report_domestic_electricity_unit_standing_2026-11-07.md` — 9 pass / 1 warn → Notion **Ready** ([Validation](ad3fed92-0bf0-4340-befa-7f708775f268))
- Notes: reconstruction `fixed + unit×3400` exact vs Ready 2.2.1 Overall/All 2014–2025; Orchestrator receipt UI used this as trusted layers after Ready

### P04 — Dissected Bill receipt rebuild (Study C)
- Owner: Orchestrator (UI)
- Status: done
- Inputs: Ready bills + unit/standing; `GATE1_COMPOSITION.md` Study C
- Output: engraved receipt (unit × kWh + fixed + official total) · historical dial · exact table · Tariff·All gates layers
- Files: `PricesCanvas.tsx` · receipt CSS in `generation.module.css` · `loadPrices().layers` · `sector-pages.ts`
- Notes: Fixed/Variable do not invent layers from aggregate 2.2.4 / 2.3.4; gas layers shipped Gate 3 tranche A

### P05 — Gate 3 UI: Ofgem + CPIH + Cost Shock + Regional
- Owner: Orchestrator (UI) · data already Ready (Ofgem, CPIH, QEP layers)
- Status: done (2026-11-07)
- Inputs: `ofgem-default-tariff-cap` · `cpih-index` (Economy) · unit/standing regions
- Output: `/energy?domain=prices` · `bill_measure=cash|real` · Ofgem pin panel · views `shock` · `regions` · Data links
- Files: `PricesCanvas.tsx` · `prices-model.ts` · `load.ts` · `citations.ts` · `sector-pages.ts`
- Notes: Real pounds = Exchange CPIH restate (labelled). Regional = DESNZ PES/LDZ reconstruct, not Ofgem Annex 9 regions. Ofgem pin is recent periods only.

### P06 — Dissected Bill receipt UX (hover detail)
- Owner: Orchestrator (UI)
- Status: done (2026-11-07)
- Inputs: P04/P05 Study C receipt
- Output: receipt lines no longer navigate away; hover/focus detail pane under £ strips with Open catalogue record; bill controls Fuel·Year·Region·Payment·Use·Compare; Data tab removed (Notes View data); one typical-bill TimeChart; HTML figures table removed
- Files: `BillReceipt.tsx` · `billReceipt.module.css` · `PricesCanvas.tsx` · `docs/agent-kickoff-prices.md`

### P07 — Gate 4 structural audit + fixes
- Owner: Orchestrator
- Status: done (2026-11-09)
- Output: [gate4-audit-prices.md](gate4-audit-prices.md)
- Notes: Wholesale Notes P0; Geography copy; Reset `capPeriod`; tariff leak; EmptyStage; jargon

### Review — Energy Domain 03 (complete)
- **Shipped:** Study C Dissected Bill; Afford; Shock; Geography; Wholesale; gas bill total; Follow → Consumption
- **Shipped (P05–P07):** Ofgem + CPIH + Gate 4 fixes
- **Blocked:** none for Gate 4 close
- **Backlog (not Gate 4):** Annex 9 map restore; editorial essay; optional Economy 7 unit/standing layers
- **Next:** Domains 07+ when scheduled

---

## Energy & Industry · Domain 04 Oil, Gas & Fossil Fuels · 2026-11-07

Follow [Oil, Gas & Fossil Fuels](https://app.notion.com/p/410654717685815db976d589af8be69f). Kickoff: [agent-kickoff-fossils.md](agent-kickoff-fossils.md).

**Domain 04 question (locked):** Where did Britain's fossil fuels come from, what was extracted, and how did domestic production change?

**Status:** **complete** (2026-11-09) — Gates 1–4. North Sea · Extraction · Gap · Reserves · Data. Gate 4: [gate4-audit-fossils.md](gate4-audit-fossils.md).

### F01 — Gate 1 taxonomy + crude ingest + QA
- Owner: Energy → Validation
- Status: done
- Output: `crude-oil-production` Ready; reuse gas + primary; Gate 1 under `data/energy/oil-gas-fossil-fuels/`

### F02 — Thin Gate 2 UI
- Owner: Orchestrator
- Status: done (superseded by F04 / F05)
- Output: `/energy?domain=fossil` · extraction · fuels · data

### F03 — Gate 1 composition (flagship honesty)
- Owner: Orchestrator
- Status: done
- Output: `GATE1_COMPOSITION.md` — Study C interim superseded by F05 NSTA atlas

### F04 — Extraction Century ledger rebuild (Study C)
- Owner: Orchestrator (UI)
- Status: done
- Output: ledger (crude Mt · gas GWh · **historical coal Mt**) · peak plate · dial · exact table

### F05 — North Sea Time Machine + supporting Gate 3
- Owner: Energy (ingest) + Orchestrator (UI) + Validation
- Status: done
- Inputs: Ready `nsta-ukcs-fields` / licences; new `nsta-field-production` (PPRS); new `uk-oil-gas-reserves`
- Output: `/energy?domain=fossil` views — `northsea` · `extraction` · `gap` · `reserves` · `fuels` · `data` (legacy `view=closures` redirects to `northsea&status=ceased&scale=field`)
- QA: `data/qa/qa_report_nsta_field_production_2026-11-07.md` · `qa_report_uk_oil_gas_reserves_2026-11-07.md` — **pass**
- Notes: Field centroids + PPRS annual by field; national DESNZ totals never summed from incomplete maps. Ceased-field register lives inside North Sea (Status = ceased) — NSTA fields only, not coal mines / BGS. Reserves glossary uses historic 1P/2P/3P/2C.

### F06 — Gate 4 structural audit + fixes
- Owner: Orchestrator
- Status: done (2026-11-09)
- Output: [gate4-audit-fossils.md](gate4-audit-fossils.md)
- Notes: leaders defaults; FigureStrip Selected-field only on Field scale; chart-reference token

### Review — Energy Domain 04 (complete)
- **Shipped:** North Sea atlas + extraction · gap · reserves · Data; coal Mt; PPRS; Closure Register in Status = ceased; Gap Follow → Imports Resilience
- **Blocked:** none for Gate 4 close
- **Backlog (not Gate 4):** BGS coalfields; NSTA wells/NDR; DUKES F.1 NGL; editorial essay
- **Unit lock:** Mt · bcm · Mtoe · % labelled separately; Fossils gas bcm is display-only (Imports gas stays GWh)
- **Next:** Domains 07+ when scheduled

---

## Energy & Industry · Domain 05 Energy Imports & Security · 2026-11-07

Follow [Energy Imports & Security](https://app.notion.com/p/410654717685813f8062c65191f6c0bb). Kickoff: [agent-kickoff-imports.md](agent-kickoff-imports.md).

**Domain 05 question (locked):** Where does Britain's imported energy enter the system, how has reliance changed, and what does resilience actually mean?

**Status:** **complete** (2026-11-09) — Gates 1–4. Lifelines · Resilience · Shock · Connectors · trade · Data. Dial retired. Gate 4: [gate4-audit-imports.md](gate4-audit-imports.md).

### I01 — Gate 1 gap + dependency ingest + QA
- Owner: Energy → Validation
- Status: done
- Output: `energy-import-dependency` Ready; reuse `energy-imports-and-exports`

### I02 — Thin Gate 2 UI
- Owner: Orchestrator
- Status: done (superseded by I04 / I05)
- Output: `/energy?domain=imports` · dependency · trade · data

### I03 — Gate 1 composition
- Owner: Orchestrator
- Status: done
- Output: `data/energy/energy-imports-security/GATE1_COMPOSITION.md` — Study D locked flagship; Study C supporting
- Notes: Partner/terminal series Ready after G3B; Study B (fake map) remains rejected

### I04 — Dependency ledger + Connectors rebuild (Study C)
- Owner: Orchestrator (UI)
- Status: done (Dial tab retired 2026-11-08 — pairing folded into Resilience)
- Output: Britain's Connectors · gross trade; former Dial honesty strip on Resilience
- Files: `ImportsCanvas.tsx` · `imports-model.ts` · `loadImports().interconnectors` · `sector-pages.ts`

### I05 — Lifelines Map flagship (Study D)
- Owner: Orchestrator (UI)
- Status: done (choropleth upgrade 2026-11-08)
- Inputs: Ready `oil-imports-by-country` · `gas-trade-by-partner` · `lng-imports-by-terminal` (G3V-B1)
- Output: `/energy?domain=imports` default `view=lifelines` · Oil/Gas `WorldChoropleth` · top-10 / `list=all` RankBars · partner history TimeChart · LNG RankBars-only
- Files: `ImportsCanvas.tsx` · `imports-model.ts` · `partner-geo.ts` · `web/src/brand/map/WorldChoropleth.tsx` · `world-countries-display.json` · `loadImports()` · `citations.ts` · `GATE1_COMPOSITION.md`
- Notes: Natural Earth 110m country fills (not Study B routes); unmatched partners RankBars-only; oil kt ≠ gas GWh; gas Net = UK aggregate only; no Lifelines Exact figures echo table

### I06 — Resilience Test (ET 1.3 sibling ratios)
- Owner: Energy (ingest) → Validation → Orchestrator (UI)
- Status: done
- Inputs: same pinned `ET_1.3_SEP_26.xlsx` as import dependency
- Output: Ready `fossil-fuel-dependency` · `low-carbon-energy-share`; `/energy?domain=imports&view=resilience`
- Files: `et13_dependency_sheets.py` · `fossil_fuel_dependency.py` · `low_carbon_energy_share.py` · QA 2026-11-08 · `ImportsCanvas` resilience tab
- Notes: three separate ratios; never one security score; storage deferred

### I07 — Shock & Response (editorial event cards)
- Owner: Orchestrator (UI + editorial seed)
- Status: done (Decision Ledger body 2026-11-08)
- Inputs: Ready interconnectors · gas partners · operator / DESNZ / National Grid / Statnett pins
- Output: `shock-events.json` (4 cards) · `/energy?domain=imports&view=shock&event=` · brand `DecisionLedger` + context TimeChart
- Files: `ImportsCanvas.tsx` · `imports-shock-events.ts` · `citations.ts` · `EnergyCanvas.tsx` (`?event=` retained on imports)
- Notes: chart = context only; France–UK aggregate ≠ IFA alone; GWh ≠ MW; no parallel event HTML card

### I08 — Interconnector capacity MW (NESO register)
- Owner: Energy → Validation → Orchestrator (UI)
- Status: done
- Inputs: NESO Interconnector Register CKAN `64f7908f-…` pin 2026-11-08
- Output: Ready `electricity-interconnector-capacity`; Connectors view Built MW RankBars + table
- Files: `neso_interconnector_register.py` · package under `data/energy/electricity-interconnector-capacity/` · QA 2026-11-08 · `ImportsCanvas` / `loadImports` / `imports-model`
- Notes: import-side firm TEC; GWh ≠ MW; GB ≠ UK; Moyle restrictions noted

### I09 — Natural gas storage (DUKES 4.4a)
- Owner: Energy → Validation → Orchestrator (UI)
- Status: done
- Inputs: DUKES_4.4.xlsx pin 2026-11-08
- Output: Ready `natural-gas-storage`; Resilience Test stock + capacity GWh chart
- Files: `natural_gas_storage.py` · package · QA 2026-11-08 · `ImportsCanvas` resilience panels
- Notes: 2016 series break labelled; never one security score; 4.4b sites deferred

### I10 — Gate 4 structural audit + fixes
- Owner: Orchestrator
- Status: done (2026-11-09)
- Output: [gate4-audit-imports.md](gate4-audit-imports.md)
- Notes: Data body note removed; plain table titles; quarterly period labels

### Review — Energy Domain 05 (complete)
- **Shipped:** Lifelines · Resilience · Shock (Decision Ledger) · Connectors · trade · Data. Dial retired. Gate 4 closed.
- **Blocked:** none for Gate 4 close
- **Backlog (not Gate 4):** optional 4.4b sites; LNG map pins (RankBars until Ready); Study B fake routes stay rejected
- **Honesty:** country choropleth + named LNG terminals — not shipping arrows; Resilience ≠ single score; events ≠ causes; MW ≠ GWh; publisher-native units never on one unmarked axis
- **Cross-domain:** Fossils Gap Follow → Imports Resilience; full dependency chart only on Resilience
- **Next:** Domains 07+ when scheduled

---

## Energy & Industry · Domain 06 Renewables & Nuclear · 2026-11-07

Follow [Renewables & Nuclear](https://app.notion.com/p/4106547176858123a229f9dbcb1a93e7). Kickoff: [agent-kickoff-renewables.md](agent-kickoff-renewables.md).

**Domain 06 question (locked):** How much low-carbon electricity is installed, generated and planned, and where is the new energy landscape taking shape?

**Status:** Gate 4 **passed with fixes** (2026-11-08) — Field Guide · Pipeline · Buildout (+ EventRail) · journeys. Audit: [gate4-audit-renewables.md](gate4-audit-renewables.md).

### R01 — Gate 1 inventory + load factors ingest + QA
- Owner: Energy → Validation
- Status: done
- Output: `renewable-electricity-load-factors` Ready; reuse capacity + generation + REPD atlas

### R02 — Gate 1 composition
- Owner: Orchestrator
- Status: done
- Output: `data/energy/renewables-nuclear/GATE1_COMPOSITION.md` — Study C locked interim

### R03 — Capacity ≠ Output field card (Study C)
- Owner: Orchestrator (UI)
- Status: done
- Output: `/energy?domain=low-carbon` · tech selector · MW/TWh/% ledger · dial · table · Follow → Generation atlas
- Files: `RenewablesCanvas.tsx` · `renewables-model.ts` · `loadRenewables()` · Energy wiring · `sector-pages.ts`
- Notes: Nuclear capacity+generation only; load factor n/a; no REPD fork

### R04 — Gate 3 UI · Pipeline + nuclear LF
- Owner: Orchestrator (UI)
- Status: done
- Inputs: Ready `renewable-energy-planning-pipeline` · `plant-load-factors` (G3B / G3V-B3)
- Output: `/energy?domain=low-carbon&view=pipeline` · Capacity ≠ Output nuclear % from DUKES 5.10 · Data archive for both
- Files: `RenewablesCanvas.tsx` · `renewables-model.ts` · `loadRenewables()` · citations
- Notes: Active vs not-proceeding lanes; Operational still on Generation atlas

### R05 — Gate 3 UI · Field Guide + Buildout + journeys
- Owner: Orchestrator (UI)
- Status: done
- Output: default `view=guide` specimens · Buildout chronology · Observatory journey links
- Files: `RenewablesFieldGuide.tsx` · `ENERGY_TECH_PLATES` · `e-*.png` · `energy-tech-types.py`
- Notes: Plate area is never MW; Built/Generating/Running measure control

### R06 — Gate 4 structural audit + fixes
- Owner: Orchestrator (UI)
- Status: done
- Output: `docs/gate4-audit-renewables.md`
- Fixes: capacity-led year default; ExactRegister on Capacity; drop field-card body method note; Buildout EventRail from Ready industrial-policy events; journey note cleanup
- Notes: Narrow viewport live pass residual P2 only

### Review — Energy Domain 06
- **Shipped:** Field Guide · Capacity ≠ Output · Pipeline · Buildout (EventRail context) · Data · journeys · Gate 4
- **Still open:** optional mobile screenshot pass; no invented causal arrows on Buildout
- **Next sector deepen:** Domain 07 Networks (done below)

---

## Energy & Industry · Domain 07 Power Networks · 2026-11-07

Follow [Power Networks](https://app.notion.com/p/410654717685813e95fde77447f38ad5). Kickoff: [agent-kickoff-networks.md](agent-kickoff-networks.md).

**Domain 07 question (locked):** How does power move across Britain, where are the constraints and how is the network being changed?

**Status:** Gates 1–4 + SSEN Invisible Grid pilot shipped (2026-11-09). Gate 4: [gate4-audit-networks.md](gate4-audit-networks.md). **N07 held** — NGET/Connections 360 pending operator email; national DNO still Blocked.

### N01 — Gate 1 inventory + ET 5.6 ingest + QA
- Owner: Energy → Validation
- Status: done
- Output: `electricity-interconnector-flows` Ready; reuse GB half-hourly Imports fuel

### N02 — Gate 1 composition
- Owner: Orchestrator
- Status: done
- Output: `data/energy/power-networks/GATE1_COMPOSITION.md` — Study C locked interim

### N03 — Border anatomy + After Dark lite (Study C)
- Owner: Orchestrator (UI)
- Status: done
- Output: `/energy?domain=networks` · Border ledger · dial · corridor table · GB Imports fuel · Follow a megawatt strip
- Files: `NetworksCanvas.tsx` · `networks-model.ts` · `loadNetworks()` · Energy wiring · `sector-pages.ts`
- Notes: no invented map; GB ≠ UK labelled; same ET 5.6 as Imports Connectors (link, no fork)

### N04 — Connections Queue + cable capacity MW
- Owner: Orchestrator (UI) · Energy (Ready series already in)
- Status: done
- Output: `&view=queue` (NESO TEC RankBars + largest lines) · `&view=capacity` (built import TEC MW RankBars)
- Series: `transmission-entry-capacity-register` · `electricity-interconnector-capacity` (link Imports Connectors — no fork)
- Cloud: capacity loaded to Postgres 2026-11-09 (`load_ready --only electricity-interconnector-capacity`)

### N05 — Gate 4 structural audit + fixes
- Owner: Orchestrator
- Status: done
- Output: [gate4-audit-networks.md](gate4-audit-networks.md)
- Fixes: pack defaults · empty Capacity ControlRow · sector series list · cloud load for capacity

### N06 — SSEN DNO topology pilot (Invisible Grid Layer 1)
- Owner: Energy → Validation → Orchestrator (UI)
- Status: done
- Inputs: Operator drop pin `raw/2026-11-09/` under `data/energy/ssen-dno-pilot/`
- Output: `ssen-distribution-network-atlas`; connector `ssen_dno_pilot.py`; lean atlas 4 649 substations + 14 412 EHV/EHV+ lines; packs `energy.ssen-dno-atlas` / `energy.ssen-dno-spatial-meta`
- Registry: [SSEN distribution network atlas](https://app.notion.com/p/4136547176858141b066ff8d9b836ca9) · mark **Ready** (Notion write needs your approval)
- Cloud: raw + atlas in `bx-data-archive`; counts in Postgres (`load_ready` 2026-11-09)
- QA: `data/qa/qa_report_ssen_distribution_network_atlas_2026-11-09.md` — Pass 8 / Fail 0
- UI: `/energy?domain=networks&view=grid` · `NetworkTopologyMap` · Area / Layer / Lines controls
- Honesty: SEPD+SHEPD only; overhead only; not spare capacity; HV 11 kV in raw archive only
- Backlog: optional SSEN licence-area boundaries; further open DNO pilots when supplied
- **Held (N07):** NGET/TO circuit GIS · Connections 360 — no clean public reuse; product owner emailing operators

### N07 — NGET / TO circuit GIS + Connections 360
- Owner: Orchestrator (licence) → Energy (ingest if cleared)
- Status: blocked / held
- Notes: Public NGET route-map terms forbid commercial use. Connections 360 is not a drop-in open national topology. Resume only after written licence clearance from operator email.
- Notion: [Cross-sector backlog BX-BACK-004](https://app.notion.com/p/41465471768581a5bef6d539d77dad53) — national / transmission network maps (2026-11-10)

### Review — Energy Domain 07 (Study C + Queue + Capacity + SSEN pilot)
- **Shipped:** Border · Queue · Capacity · Invisible Grid SSEN pilot · After Dark lite · Data · Gate 4
- **Shipped (N06):** Validation Ready path + Networks map tab
- **Held:** NGET/TO GIS · Connections 360 (email outreach — N07)
- **Blocked for national Invisible Grid:** multi-DNO GIS; spare capacity; thermal £
- **Parked (2026-11-10):** no further Networks UI until public/cleared layers — resume on N07 replies or a named open NESO spine

---

## Energy & Industry · Domain 08 Manufacturing · 2026-11-07

Follow [Manufacturing](https://app.notion.com/p/41065471768581afa032dec7299a7cfb). Kickoff: [agent-kickoff-manufacturing.md](agent-kickoff-manufacturing.md).

**Domain 08 question (locked):** What does Britain manufacture today, how has the composition of output changed, and where does production take place?

**Status:** **deepen wave** (2026-11-10) — M05–M07 Gate 4 closed; M08 Composition + M09 Industry Ledger + Output vs Jobs deepen while owner redesigns Anatomy.

### M01 — Ready trio + productivity
- Owner: Energy → Validation
- Status: done
- Output: output index · GVA share · employment · output-per-hour Ready

### M02 — Thin Gate 2 UI
- Owner: Orchestrator
- Status: done (superseded by M04)

### M03 — Gate 1 composition
- Owner: Orchestrator
- Status: done
- Output: `data/energy/manufacturing/GATE1_COMPOSITION.md` — Study C locked interim

### M04 — Production Anatomy card rebuild (Study C)
- Owner: Orchestrator (UI)
- Status: done
- Output: `/energy?domain=manufacturing` · four-measure ledger · dial measure switch · Output vs Jobs · exact table
- Files: `ManufacturingCanvas.tsx` · `manufacturing-model.ts` · `GATE1_COMPOSITION.md`

### M05 — Subsector Production Anatomy (IoP by division)
- Owner: Orchestrator (UI) · Energy (Ready series already in)
- Status: done (verified 2026-11-10 — 13 subsections ChangeRows; From/Level/Industry dials)
- Inputs: Ready `manufacturing-iop-by-division` (Gate 3 B); national Ready quartet
- Output: `/energy?domain=manufacturing` Anatomy — SIC subsection/division catalogue (ChangeRows of index levels) · branch TimeChart · national section C ledger + dial · Data branch table
- Files: `ManufacturingCanvas.tsx` · `manufacturing-model.ts` · `loadIopByDivision()` · views / citations / sector-pages
- Pack: `energy.manufacturing-iop-annual` → `curated/annual_means.json` (year-means; not the ~34k monthly CSV — that hung SSR)
- Honesty: catalogue compares index change / levels — not industry size or additive shares; never IoP÷jobs

### M06 — Manufacturing Atlas lite (BRES regions)
- Owner: Orchestrator (UI)
- Status: done (2026-11-10) — Places tab: RankBars + ChangeRows; Data table
- Inputs: Ready `bres-manufacturing-employee-jobs-by-region`
- Output: `/energy?domain=manufacturing&view=places` — regional employee-jobs ranks / change — not a fake plant map
- Notes: 2024p no NI; employee jobs ≠ JWR7 workforce jobs

### M07 — Gate 4 structural audit
- Owner: Orchestrator
- Status: done (2026-11-10)
- Output: `docs/gate4-audit-manufacturing.md` — Ready

### M08 — Industrial Composition
- Owner: Orchestrator (UI)
- Status: **removed** (2026-11-10) — content already on Output vs Jobs / Places; misleading name

### M09 — Industry Ledger (SIC specimens)
- Owner: Orchestrator (UI)
- Status: **removed** (2026-11-10) — duplicated Anatomy volume change in a form the site does not use

### M10 — Places branch × region (Nomis)
- Owner: Energy + Orchestrator (UI)
- Status: done (2026-11-10)
- Output: `bres-manufacturing-jobs-by-division-region` (1584 obs) loaded; Places Industry/Branches menus filter Nomis SIC×region
- Honesty: GB only (no NI); Table 4 still used for all-manufacturing; employee jobs ≠ workforce jobs

### Review — Energy Domain 08 (flagship deepen)
- **Tabs (locked):** Anatomy · Output vs Jobs · Places · Data
- **Shipped:** Anatomy; Places (+ Nomis branch×region); Gate 4; Output vs Jobs; Data; Follow anatomy↔places
- **Pack:** `energy.manufacturing-iop-annual` · Nomis division×region curated + Postgres
- **Still deferred:** British Product Ledger (true products/trade); full regional GVA atlas; editorial

---

## Energy & Industry · Domain 09 Jobs & Productivity · 2026-11-07

Follow [Jobs & Productivity](https://app.notion.com/p/4106547176858136acd8c6d6369fa87e). Kickoff: [agent-kickoff-jobs.md](agent-kickoff-jobs.md).

**Domain 09 question (locked):** Where did industrial employment change, how did output per worker or hour change, and who experienced those changes?

**Status:** **complete** (2026-11-10) — Gates 1–4. Landscape · Atlas · Productivity · Data. Gate 4: [gate4-audit-jobs.md](gate4-audit-jobs.md).

### J01 — Ready trio inventory
- Owner: Energy → Validation
- Status: done
- Output: employment · output index · output-per-hour Ready; reuse map under `data/energy/jobs-productivity/`

### J02 — Gate 1 composition
- Owner: Orchestrator
- Status: done
- Output: `data/energy/jobs-productivity/GATE1_COMPOSITION.md` — Study C locked interim; Atlas unlocked when BRES Ready

### J03 — Labour Landscape + Productivity Machine (Study C)
- Owner: Orchestrator (UI)
- Status: done
- Output: `/energy?domain=industrial-work` · jobs/volume/productivity ledger · paired charts · formula panel · Data
- Files: `JobsCanvas.tsx` · `jobs-model.ts` · Energy wiring (reuses Manufacturing pack — no fork)
- Notes: never IoP÷jobs; GB/UK N/A (UK national)

### J04 — Gate 3 Employment Atlas + PRDY deepen
- Owner: Energy → Validation → Orchestrator (UI)
- Status: done (2026-11-10)
- Inputs: Ready BRES region + Nomis division×region (reuse Manufacturing); new `manufacturing-output-per-job` (DJ4P) · `manufacturing-productivity-hours` (DK3V)
- Output: `/energy?domain=industrial-work&view=atlas` · Productivity `measure=hour|job` + hours chart · Data tables
- QA: `data/qa/qa_report_manufacturing_output_per_job_2026-11-10.md` · `qa_report_manufacturing_productivity_hours_2026-11-10.md` — **pass**
- Cloud: both loaded Postgres 2026-11-10

### J05 — Gate 4 structural audit
- Owner: Orchestrator
- Status: done (2026-11-10)
- Output: [gate4-audit-jobs.md](gate4-audit-jobs.md)

### J06 — ASHE manufacturing pay (Pay tab)
- Owner: Energy → Validation → Orchestrator (UI)
- Status: done (2026-11-10)
- Inputs: Owner pin `ashetable42025revised.zip` (Downloads → `data/energy/ashe-manufacturing-earnings/raw/2026-11-10/`)
- Output: Ready `ashe-manufacturing-earnings` (96 obs) · `/energy?domain=industrial-work&view=pay`
- QA: `data/qa/qa_report_ashe_manufacturing_earnings_2026-11-10.md` — **pass**
- Notes: Weekly gross + hourly ex-OT · All + Full-Time · section C + divisions; cash £ only

### Review — Energy Domain 09 (complete)
- **Shipped:** Labour Landscape · Employment Atlas · Productivity Machine (hour/job + hours) · Pay (ASHE) · Data · Gate 4
- **Honesty:** Workforce Jobs ≠ BRES employee jobs; never IoP÷jobs; hours = official DK3V; ASHE median ≠ mean
- **Backlog (not Gate 4):** Industrial Lives (plant openings/closures — owner sourcing); ASHE multi-year / real £; demographics
- **Next:** Domain 10 Gate 3 when scheduled; resume Industrial Lives when register arrives

---

## Energy & Industry · Domain 10 Industrial Policy · 2026-11-07

Follow [Industrial Policy](https://app.notion.com/p/41065471768581dca8fbf13058c8dce5). Kickoff: [agent-kickoff-industrial-policy.md](agent-kickoff-industrial-policy.md).

**Domain 10 question (locked):** Which public decisions, incentives, institutions and investments shaped Britain's energy and industrial trajectory, and what can the evidence actually establish?

**Status:** Gate 2 **shipped** (2026-11-07) — Study C expandable Decision Ledger. Promise Ledger UI shipped 2026-11-10 (verdict panel; scoring still data-blocked — 0/9 pledges meet match rule).

### P01 — Gate 1 inventory + composition
- Owner: Orchestrator
- Status: done
- Output: `data/energy/industrial-policy/` · `GATE1_COMPOSITION.md` Study C locked

### P02 — Events seed (shared `policy_event` shape)
- Owner: Orchestrator
- Status: done
- Output: `events.json` — six checked records (5 Acts + Modern Industrial Strategy programme); topics extended in `britain_exchange.policy_event`
- Notes: Assent dates from legislation.gov.uk introductory text; commencement mostly unpinned (honest)

### P03 — Decision Ledger UI (Study C)
- Owner: Orchestrator (UI)
- Status: done
- Output: `/energy?domain=policy` · large electric titles · expand/collapse dossiers · exact table · `?event=`
- Files: `PolicyCanvas.tsx` · `policy-events.ts` · `policy.module.css` · Energy wiring
- Notes: **No tabs.** Linked Ready series are context journeys only — never causal.

### Review — Energy Domain 10 (Gate 2)
- **Shipped:** Decision Ledger accordion; six seeded decisions; typed relationships; Follow links into Generation / Networks / Jobs / Manufacturing
- **Commencement pins (2026-11-10):** principal dates for 1989 / 2000 / 2008 / 2023 Acts (not every SI); Register figure uses en-GB date format
- **Blocked / Gate 3:** Promise vs Outcome; exhaustive commencement SI catalogue; business-investment spark; Counterfactual Desk
- **Next:** Sector Gate 3 polish (tranche A below)

---

## Energy & Industry · Gate 3 tranche A · 2026-11-07

**Goal:** Close Validation backlog that already has evidence; deepen Prices Dissected Bill for gas. Spatial true flagships stay parked.

### G3A-01 — Validation `uk-power-stations-dukes`
- Owner: Validation
- Status: done
- Output: `data/qa/qa_report_uk_power_stations_dukes_2026-11-07.md` — **pass** → Ready
- Notes: SHA match; 74 stations / 68 plotted; NI skipped; complements REPD

### G3A-02 — Ingest QEP 2.3.4 gas unit + standing
- Owner: Energy
- Status: done
- Output: `domestic-gas-unit-standing` · connector `domestic_gas_unit_standing` · 1 920 obs
- QA: `data/qa/qa_report_domestic_gas_unit_standing_2026-11-07.md` — **pass** (UK Overall 2023 reconstruct = 2.3.1 bill)

### G3A-03 — Prices UI gas layers
- Owner: Orchestrator (UI)
- Status: done
- Output: `/energy?domain=prices&bill_fuel=gas` · receipt layers from 2.3.4 + total 2.3.1
- Files: `prices-model.ts` · `load.ts` · `PricesCanvas.tsx`

### Review — Gate 3 tranche A
- **Shipped:** Stations Ready; gas Dissected Bill layers
- **Still open Gate 3:** Field Guide / BRES / subsector IoP / Imports (tranche B); Ofgem+CPIH Validation; NSTA spatial ingest
- **Next:** Gate 3 tranche B — **locked order below** (sources in `data/energy/gate3-source-discovery/`)

### G3B-00 — Source discovery (parked Gate 3)
- Owner: Energy (research subagent)
- Status: done
- Output: `data/energy/gate3-source-discovery/README.md` + `source_register.csv`; patches to domain source registers
- Notes: discovery only — no ingest. Top ready: DUKES 3.7/4.5/4.6 · IoP DIOP subsectors · REPD full + DUKES 5.10. Gated wave closed separately (G3G).

### G3G-01 — Ofgem default-tariff cap pin archive
- Owner: Energy
- Status: done (ingest; Validation pending — **not Ready**)
- Output: `data/energy/ofgem-default-tariff-cap/` · `energy.connectors.ofgem_default_tariff_cap` · 4 periods × 3 measures (12 obs)
- Notes: GB only (K03000001); Annex 9 GB average inc VAT Other Payment Method; dual-fuel Oct–Dec 2026 = £1,723.36

### G3G-02 — NSTA open-data licence
- Owner: Orchestrator / Energy
- Status: done (unlocked)
- Output: `data/energy/oil-gas-fossil-fuels/licence/` (PDF pin + README)
- Notes: NSTA User Agreement — required attribution. Spatial ingest may proceed.

### G3G-03 — Economy CPIH L522
- Owner: Economy
- Status: done (ingest; Validation pending)
- Output: `data/economy/cpih-index/` · `economy.connectors.cpih_index` · 465 months · 2026-09 = 144.0
- Notes: Energy real-terms must **link** this id — never fork under `data/energy/`

### G3G-04 — National DNO topology
- Owner: Orchestrator
- Status: blocked nationally; **SSEN pilot open** (see N06)
- Output: `data/energy/power-networks/DNO_TOPOLOGY_BLOCKED.md` (updated 2026-11-09)
- Notes: National multi-DNO still Blocked. SSEN SEPD+SHEPD pilot ingesting under `ssen-distribution-network-atlas`.

### G3B — Locked order (in progress 2026-11-07)
1. **Imports Lifelines** — DUKES 3.7 + 4.5a + 4.6 — Owner: Energy · Status: done (**Ready**)
   - `oil-imports-by-country` (896) · `lng-imports-by-terminal` (130) · `gas-trade-by-partner` (464)
   - 4.5b capacity deferred; no invented landfalls
2. **Manufacturing / Jobs atlas spine** — IoP DIOP + BRES Table 4 — Owner: Energy · Status: done (**Ready**)
   - `manufacturing-iop-by-division` (33 984; K22A excluded) · `bres-manufacturing-employee-jobs-by-region` (71; ≠ JWR7; 2024p no NI; 2015–18 deferred)
3. **Field Guide + Networks queue** — REPD non-op + DUKES 5.10 + NESO TEC — Owner: Energy · Status: done (**Ready**)
   - `renewable-energy-planning-pipeline` (142) · `plant-load-factors` (300) · `transmission-entry-capacity-register` (2211)
   - Same REPD pin as operational sibling; DNO still Blocked
4. **NSTA UKCS spatial** — fields/licences (licence cleared) — Owner: Energy · Status: done (**Ready**)
   - `nsta-ukcs-fields` (478 polys WGS84) · `nsta-ukcs-licences` (345 Extant Production offshore, ~41 855 km²)
   - Attribution required; blocks/sub-areas deferred; UKCS offshore only

### G3V-B1 — Validation Imports Lifelines
- Owner: Validation → Orchestrator
- Status: done
- Scope: `oil-imports-by-country` · `lng-imports-by-terminal` · `gas-trade-by-partner`
- Output: three `data/qa/qa_report_*_2026-11-07.md` — all **pass** (soft warns only)
- Notes: Registry → **Ready** for all three

### G3V-B2 — Validation IoP + BRES
- Owner: Validation → Orchestrator
- Status: done
- Scope: `manufacturing-iop-by-division` · `bres-manufacturing-employee-jobs-by-region`
- Output: two `data/qa/qa_report_*_2026-11-07.md` — **pass-with-warns** (no blockers)
- Notes: Registry → **Ready**. IoP: DIOP correction context; BRES: Employment sheet title vs employee-jobs measure.

### G3V-B3 — Validation Field Guide + Networks
- Owner: Validation → Orchestrator
- Status: done
- Scope: `renewable-energy-planning-pipeline` · `plant-load-factors` · `transmission-entry-capacity-register`
- Output: three `data/qa/qa_report_*_2026-11-07.md` — all **pass** (cosmetic warns only)
- Notes: Registry → **Ready** for all three

### G3V-NSTA — Validation NSTA UKCS spatial
- Owner: Validation → Orchestrator
- Status: done
- Scope: `nsta-ukcs-fields` · `nsta-ukcs-licences`
- Output: `data/qa/qa_report_nsta_ukcs_fields_2026-11-07.md` (**pass**) · `data/qa/qa_report_nsta_ukcs_licences_2026-11-07.md` (**pass**, W1 region label)
- Notes: Both registry rows → **Ready**. W1: P534 REGIONS includes secondary “Onshore” while LOCATION=OFFSHORE — map copy caveat only.

### G3V — Validation backlog (gated packages)
- Owner: Validation → Orchestrator
- Status: done
- Scope: `ofgem-default-tariff-cap` · `cpih-index`
- Output: `data/qa/qa_report_ofgem_default_tariff_cap_2026-11-07.md` (warn→fixed) · `data/qa/qa_report_cpih_index_2026-11-07.md` (**pass**)
- Notes: Energy fixed Jul–Sep TDCV footnotes (period-dated `1c` columns). Both registry rows → **Ready**.

### Review — Gate 3 gated
- **Shipped:** Ofgem pin-archive Ready; CPIH Ready; NSTA licence unlock; DNO Blocked doc
- **Needs you only if:** more DNO pilots, or replies from NGET/Connections 360 outreach (N07 held)
- **Tranche B:** B1–B3 + NSTA **Ready** (Validation closed 2026-11-07)
- **Next:** Domains 08+ backlog as scheduled; Domains 01–07 Gate 4 closed; SSEN Invisible Grid pilot = N06
- **Domain 06 (2026-11-08):** Gate 4 passed — Field Guide · Pipeline · Buildout · nuclear DUKES 5.10 LF
- **Domain 07 (2026-11-09):** Gate 4 + SSEN pilot map shipped; **N07 held** pending operator email

---

## Housing & Land · Gate 2 · Domains 01–10 · 2026-11-04

Follow [Housing & Land product scope](https://app.notion.com/p/40d65471768581feaca9f75117f149c0).

**Status (2026-11-10):** **Gate 2 done** for Housing Domains 01–10 — instruments live and open Validation items closed. That is **not** Energy’s Gate 4 structural-audit bar; Housing has **not** run a full Gate 4 sweep per domain.

**Registry catch-up (2026-11-10):** Validation **PASS** on **23** series that were live but missing/stale in Notion — report `data/qa/qa_housing_registry_catchup_23_2026-11-10.md`. Created 14 Ready rows; flipped 9 Sourcing/Ingesting/Validation rows to Ready (EHS core + brownfield + net-additions-by-authority). Still open outside the 23: `local-plan-status` council-page sample; `planning-appeals` formal registry row.

**Polish / backlog (not Gate blockers) — updated 2026-11-10:**

| Domain | Item | Status |
|--------|------|--------|
| 05 Supply | Map atlas / per-1,000 dwellings rates | **Done** — LA AreaMap + `gm=rate` (stock open ÷ Tables 100/109) |
| 06 Land | Labelled gaps (allocations, case apps) | **Verified** — honesty copy live ([domain06-gap-hunt-2026-11-10.md](domain06-gap-hunt-2026-11-10.md)) |
| 09 Ownership | Monthly CCOD/OCOD refresh cadence | **Done** — runbook in [`data/housing/corporate-owned-titles/README.md`](../data/housing/corporate-owned-titles/README.md) (no in-repo cron) |
| 10 Policy | Help to Buy FTB quarterly | **Done** — Release Table 2 in `help-to-buy-equity-loan` (41 quarters; cumulative 328,346) |
| 10 Policy | 1919 / 1947 commencement | **Done** — 1919 by 1793 default; 1947 by s.120(2) + SI 1948/213 |
| 10 Policy | London AHP 2016-23 by year | **Closed as labelled gap** — GLA programme names do not map to MHCLG totals; cumulative London stays on the annual report; do not invent a year path |

1. **Done — Domain 01 (prices):** History · Types · Segments · Transactions · Map · Data.
   - **Review 2026-11-10 (Energy frame):** Data / Transactions as titled panels; ledes moved to Notes feet; empties use `EmptyStage`. History / Types / Segments / Map already used outer place/measure/period controls.
   - **Done (2026-11-15):** Recorded-sales search loaded after Pro upgrade — `price-paid-2025` **992 278** rows in `price_paid_transaction`; `GET /housing/price-paid` live. BX-BACK-001 closed.
2. **Done — Domain 02 (Renting):** Monthly · Map · Change · Index · By size · Table ([brief](https://app.notion.com/p/40e65471768580d6ab18c12c0424c865)).
3. **Done — Domain 03 (Affordability):** [Notion brief](https://app.notion.com/p/40e654717685817cb98bdec53c60b676).
   - **Live:** Budget (BoE IUMBV34 default rate) · Map · Ages · Rent burden · Households · Ratio · Table.
   - **Series:** `ehs-housing-costs-by-age` (Annex Tables 2.7 and 4.4), `ehs-mortgage-by-age` (FA2555), `rent-to-earnings-ratio` (derived), `housing-purchase-affordability`, `mortgage-rate-2yr-fixed` (Economy).
   - **Caveats:** the 2016 ONS age chart is removed. Ages shows the English Housing Survey share of income for ages 16–34 and 65 or over (mortgage, private rent, social rent). Ages 35–64 are unpublished in that release; FA2555 covers mortgagors at finer ages, including 35–64. Rent burden is derived PIPR×AFF1. Purchase affordability uses household disposable income and financial years. Budget deposit stays 10%; the quoted rate is a 75% loan-to-value product and the mismatch is written beside the rate. Map download says year; geography says England and Wales.
   - **Do not fork:** house-price and PIPR rent pipelines.
4. **Done for Gate 2 — Domain 04 (Housing Stock & Tenure):** [Notion brief](https://app.notion.com/p/40e65471768581b39a4ceb6876e88c22).
   - **Live:** Composition (CSV of the three-group denominator, 31 March, and categories) · Dwelling types · Geography (31 March year slider, Table 109) · Vacancy · Second homes · Tenure · Data.
   - **Series:** `dwelling-stock-by-tenure`, `vacant-dwellings` (615), `second-homes` (Council Taxbase Table 4, England, 2021–2025), `dwelling-stock-by-region` (109), `dwelling-stock-by-district` (100), `dwelling-type` (Census TS044 households).
   - **Caveats:** dwellings ≠ households; Table 100 private sector not OO/PR and the district list stays on the latest year; vacancy rate is October Table 615 ÷ 31 March Table 104, same calendar year, Exchange-derived; second homes are not in that rate. Table 4 prints a year (stored as 1 October). The second-homes premium starts in 2025.
   - **QA:** `data/qa/qa_housing_stock_2026_11_04.md` — PASS. `second-homes` Validation PASS 2026-11-10 (`data/qa/qa_report_second-homes_2026-11-10.md`) — England 2025 total 267,894; identity none+discount+premium.
5. **Done — Domain 05 (Construction & Supply):** [Notion brief](https://app.notion.com/p/40e65471768581ffb44ef707f8ccf483). Kickoff: [agent-kickoff-supply.md](agent-kickoff-supply.md).
   - **Live:** Supply (Machine) · Pipeline · Geography · Who builds · Data.
   - **Series:** `net-additional-dwellings`, `net-additions-by-authority`, `housing-starts`, `housing-completions` (tenure), `affordable-housing-supply`, `planning-decisions-granted`.
   - **QA:** `data/qa/qa_housing_supply_net_additions_2026_11_04.md`, `data/qa/qa_housing_supply_affordable_2026_11_04.md`.
   - **Polish 2026-11-10:** Geography LA AreaMap + per-1,000 dwellings (`gm=rate`, stock open from Tables 100/109). Still later: Table 123, delivery vs targets, devolved nations.
6. **Done — Domain 06 Planning & Land:** [Notion brief](https://app.notion.com/p/40e65471768581f6bdacec2e38c31367). Kickoff: [agent-kickoff-land.md](agent-kickoff-land.md).
   - **Views (Notion):** Land Explorer · Development Sites · Planning Decisions · Historical Change · Data.
   - **Live:** Land Explorer — publisher FeatureServers + EA flood + Storage CSV dumps (brownfield / Article 4 / TPO). Development Sites — brownfield inventory. Planning Decisions — P120 Decision Machine + Inspectorate appeals (`pm=appeals`). Historical change — Green Belt hectares + landmark-year England boundary map (`gby`). Data tables split by dataset.
   - **Labelled gaps (closed as gaps):** Local-plan allocations (no England polygon feed); case-level applications (Planning Data unavailable). Brownfield ≠ allocation; P120 ≠ case files. Gap hunt: [domain06-gap-hunt-2026-11-10.md](domain06-gap-hunt-2026-11-10.md).
7. **Done — Domain 07 (Housing Quality):** [Notion brief](https://app.notion.com/p/40e654717685816cb965c1336cb686e5). Kickoff: [agent-kickoff-quality.md](agent-kickoff-quality.md).
   - **Live:** Inside Britain's Homes · Energy Anatomy · State of Repair · Geography (English regions and the three survey areas) · Data, one series at a time.
   - **Labels:** the 15% figure is the non-decent share. EPC bands do not carry an overlap caveat. The Data source line follows the selected indicator.
   - **QA:** EHS inside + wave2 Validation PASS (re-run 2026-11-10: `qa_housing_ehs_inside_home_2026_11_04.md` failures=0; `qa_housing_quality_wave2_2026_11_04.md` fails=0). Sample counts are not confidence intervals.
   - **2026-11-10:** EPC register loaded to Postgres (`epc-domestic-lodgements` 26 244; `epc-domestic-lodgements-by-local-authority` 216 918). Geography scale chip unlocks Local authorities · EPC certificates (lodgements + A–C share).
8. **Done — Domain 08 (Housing Insecurity):** [Notion brief](https://app.notion.com/p/40e65471768581a2a277cc76f104f990). Kickoff: [agent-kickoff-insecurity.md](agent-kickoff-insecurity.md). Catalogue ingested, including RO4 spend and the rough sleeping data framework. Registry rows are Ready.
   - **Views (locked):** Pathways · Temporary Housing · Displacement · Housing Need · Cost · Data.
   - **Full source set (do not skip):** H-CLIC / TA · rough sleeping · MoJ possessions · Table 600 · CORE · Census concealed · TA spend · devolved returns.
   - **Verify headlines:** 135,580 TA hh · 177,530 children (31 Mar 2026) · 83,850 assessed Q1 2026 · 4,793 rough sleeping autumn 2025.
   - **Rule:** stocks ≠ flows; homelessness ≠ rough sleeping; no wait-time from 600÷lettings.
9. **Done — Domain 09 (Ownership & Property Economics):** [Notion brief](https://app.notion.com/p/40e6547176858199b8e5c169cbbdee84). Kickoff: [agent-kickoff-ownership.md](agent-kickoff-ownership.md).
   - **Views (locked):** Who owns · Mortgages · Wealth · Data. (Property Rights folded into Who owns.)
   - **Live:** Who owns — CCOD/OCOD corporate titles map + RankBars (`corporate-owned-titles`, QA PASS 2026-11-10) · Mortgage machine · Wealth distribution (`household-net-property-wealth`) · Data.
   - **Review 2026-11-10 (Energy frame):** Wealth age filter on outer `ControlRow` (URL: `wa`). One `FigureRecord` Notes foot. Empties use `EmptyStage`.
   - **Also live (2026-11-10):** Mortgages purpose (lines) and loan-to-value (stack) history; Wealth waves and rounds drawn apart; HMRC `estates-residential-property` (Table 12.3) on Wealth with the 1 Jan 2022 reporting break. QA PASS for `mortgage-approvals`, `residential-mortgage-book`, `household-net-property-wealth`; buy-to-let relabelled "Of which buy to let".
   - **Dropped (owner, 2026-11-10):** phase 4 company/title lookup and Companies House joins. Counts only. Inheritance is not a chain.
   - **Polish 2026-11-10:** monthly CCOD/OCOD refresh runbook (`data/housing/corporate-owned-titles/README.md`). WAS wealth (`household-net-property-wealth`) already QA PASS 2026-11-10.
10. **Done — Domain 10 (Housing Policy & History) Gate 2 anchors:** [Notion brief](https://app.notion.com/p/40f6547176858196aeacd8c3155fee87). Kickoff: [agent-kickoff-policy.md](agent-kickoff-policy.md).
   - **Question:** How did Britain build the housing system it has today, and which decisions shaped the way we live?
   - **Live:** Timeline · Promise vs delivery · Archive · Data. Register from Storage pack `housing.policy-events` (no webpack `events.json` import).
   - **1980 Chapter I:** commencement pinned 3 October 1980 (enacted s.153(1); eight weeks from Royal Assent). Context → `right-to-buy-sales-and-replacements`.
   - **1919 / 1947:** commencement pinned 2026-11-10 (1793 default; s.120(2) + SI 1948/213).
   - **Promise sources (2026-11-10):** `right-to-buy-sales-and-replacements`, `right-to-buy-one-for-one`, `help-to-buy-equity-loan`, `affordable-homes-programme-delivery`, `parliament-housing-milestones`, `house-building-completions-by-country`. **8 of 9 pledges scored.** QA: `data/qa/qa_housing_promises_rtb_htb_2026_11_10.md`.
   - **Registry (2026-11-10):** Notion Ready rows for the six promise indicators + `corporate-owned-titles`, `estates-residential-property`, `dwelling-stock-by-district`, `ehs-housing-costs-by-age`; `rough-sleeping-framework` last-checked refreshed.
   - **Polish 2026-11-10:** Help to Buy FTB quarterly (Release Table 2) ingested into `help-to-buy-equity-loan`.
   - **Labelled gap (closed):** London AHP 2016-23 by year — GLA names ≠ MHCLG programme; cumulative London only.
   - **Still open:** Renters’ Rights social-housing appointment when made.

**Domain 03 question (locked):** Who can actually afford to live in Britain?  
**Domain 04 question (locked):** What homes does Britain actually have, who occupies them, and how has that changed?  
**Domain 05 question (locked):** How many homes is Britain building, where are they being built, and why does the number delivered differ from the number planned?  
**Domain 06 question (locked):** How is Britain's land used, who decides what can be built on it, and how do those decisions shape the country?  
**Domain 07 question (locked):** What is the actual condition of Britain's homes, and how does housing quality differ according to location, building characteristics and tenure?  
**Domain 08 question (locked):** What happens when people cannot secure, maintain or remain in a stable home?

**Orchestrator:** this chat  

**Domain 09 question (locked):** Who owns Britain's property, how is that ownership structured, and how does housing generate, concentrate and transfer wealth?

**Domain 10 question (locked):** How did Britain build the housing system it has today, and which decisions shaped the way we live?

**Status:** Domains 01–06 and 08 Gate 2 instruments live (Domain 06 closed 2026-11-10 with allocations + case applications as labelled gaps); Domain 04 `second-homes` Validation **PASS** 2026-11-10; Domain 07 EHS + EPC Validation **PASS** (re-confirmed 2026-11-10); Domain 09 Ownership complete (all series QA); Domain 10 Policy live (register from Storage; 8/9 pledges scored); cloud must-fix 2026-11-10 closed.
**Updated:** 2026-11-10

### T01 — Affordability scenario engine + official ratio stage
- Owner: Orchestrator (Next.js)
- Status: done
- Output: `affordability/scenario.ts` + Experiment canvas; `npm run test:affordability`

### T02 — Geography of affordability map
- Owner: Orchestrator
- Status: done
- Output: `build_afford_atlas.py` → `afford-atlas.json`; Map via `PricesMapStage` `variant="afford"`

### T03 — Ages / rent burden / households / BoE rate
- Owner: Housing + Economy + Orchestrator
- Status: done
- Output: connectors + Postgres load; Ages / Rent burden / Households views; Budget BoE default
- QA: `data/qa/housing_domain03_affordability_2026_11_04.md`
- **5 Nov 2026:** Removed the 2016 ONS age chart (`housing-affordability-by-age`) from data and code. Ages now leads with EHS Annex Tables 2.7 and 4.4.

### T04 — Validation (spot QA filed)
- Owner: Validation
- Status: done (spot checks; no silent rewrites)

## Sector pages (UI)

- Owner: Orchestrator (Next.js)
- Status: Energy Domain 01 Generation **complete**. Next Energy: Domain 02 Consumption. Housing Domains 03–06 and 08–09 Gate 2 done; Domain 07 / 10 still open where noted.
- **Domain 02 Renting review (2026-11-05):** chart, map, table and download share place, property, period and measure. The table follows the series being inspected (index and bedroom rents included) and can download the full series. The index baseline is read from the series unit. A date range inherited from another domain no longer blanks the chart. Social rent is one tab, with the total, the rent type and the housing-needs split of the same lettings. Social rents in pounds are not estimated. The private-rent note distinguishes the official stock measure from an advertised asking rent.
- **Review 2026-11-10 (Energy frame):** Social rent breakdown lifted to outer `ControlRow` (URL: `lettings`). Empties use `EmptyStage`. Data / Social rent as titled panels. One `FigureRecord` Notes foot on Social rent and Data. Private-rent chart views keep shared place/property/period controls.
- Branding: [visual-identity.md](visual-identity.md)
- Then: Energy Domain 02 Consumption (or Economy); Housing Domain 10 / 06 / 09 as needed
- Homepage: deferred

### T05 — Net additional dwellings + components (Supply Machine)
- Owner: Housing
- Status: done (curated + loaded; Validation Ready 2026-11-10 for Table 122 LA series)
- Inputs: Live Table 118 ODS (pin 2026-11-04)
- Output: `data/housing/net-additional-dwellings/` (1,181 obs); spot QA `data/qa/qa_housing_supply_net_additions_2026_11_04.md`; LA series `net-additions-by-authority` Ready via `qa_housing_registry_catchup_23_2026-11-10.md`
- Notes: England 2024–25 unrounded: net 208,600 · new-build 190,602 (provisional); component identity PASS; Table 122 England = Σ LAD = 208,600

### T06 — Starts + tenure on Table 213; Geography 122; affordable supply
- Owner: Housing
- Status: done
- Output: `housing-starts` (776), `net-additions-by-authority` (8,784), `affordable-housing-supply` (277); completions tenure extended

### T07 — Supply canvas (Machine · Pipeline · Geography · Who builds · Data)
- Owner: Orchestrator
- Status: done
- Output: `canvas/supply/*` + Who builds affordable products tab

### T08 — Validation Domain 05
- Owner: Validation
- Status: done (spot QA; Ready for Gate 2)
- Output: `data/qa/qa_housing_supply_net_additions_2026_11_04.md`, `data/qa/qa_housing_supply_affordable_2026_11_04.md`

### Review — Housing Domain 03 Affordability
- **Shipped:** Budget (+ BoE rate) · Map · Ages · Rent burden · Households · Ratio · Table
- **Blocked:** none for Gate 2 Domain 03
- **Next:** was Domain 04 (done)
- **Review 2026-11-10 (Energy frame):** Ages breakdown + Budget price-benchmark lifted to outer `ControlRow`s (URL: `ages`, `bench`). Body ledes removed. Sliders stay as the Budget instrument. One `FigureRecord` Notes foot on Budget / Ages / Households / Data. Empties use `EmptyStage`. Households / Ages / Data as titled panels.

### Review — Housing Domain 04 Stock & Tenure
- **Shipped:** Composition · Dwelling types (TS044 households) · Geography (year slider through Table 109; district ranks stay on the latest Table 100; England total is a sentence, not a bar) · Vacancy (October ÷ 31 March labelled) · Second homes (Council Taxbase Table 4, England, 2021–2025) · Tenure · Data
- **Blocked:** none for Gate 2 — `second-homes` Validation PASS 2026-11-10
- **Next:** was Domain 05 Supply
- **Review 2026-11-10 (Energy frame):** Composition / Types / Geography controls lifted to outer `ControlRow`s (URL: `sy`, `sp`, `sgm`). Body ledes and in-stage year/measure chrome removed. One `FigureRecord` Notes foot per view. Empties use `EmptyStage`. Vacancy/Tenure/Data as titled panels. Vacancy strip capped at three.

### Review — Housing Domain 05 Construction & Supply
- **Shipped:** Tables 118/122/213/1000 · Supply Machine · Pipeline · Geography · Who builds (builder + affordable) · Data
- **Blocked:** none for Gate 2
- **Next:** Domain 06 Planning & Land (map / per-1k rates are Domain 05 polish only)
- **Review 2026-11-05:** The net-additional-dwellings record opens from the catalogue query. Pipeline keeps applications and dwellings on separate charts and says so. Geography ranks local authority districts only. Who builds opens on the builder; affordable products are a separate measure, labelled as a financial year. Data lists every supply series, the Live Table 118 term definitions, the CSV, and the England reconciliation ledger, with (P) on a provisional year. The Supply Machine uses a View menu (section or ledger) and a financial-year menu.
- **Review 2026-11-10 (Energy frame S1–S5):** Machine / Who builds / Geography controls lifted to outer `ControlRow`s (URL: `panel`, `wb`, `gm`). Body ledes and in-stage measure tabs removed. One `FigureRecord` Notes foot per view. Who builds strip is three mode-aware figures. Empties use `EmptyStage`. Data is panel stack without opening lede.

### T08b — Validation Domain 04 second-homes
- Owner: Validation
- Status: done (2026-11-10)
- Inputs: pinned `Tables_1_-_5_2025.ods` Table 4; curated `second-homes`
- Output: `data/qa/qa_report_second-homes_2026-11-10.md` — PASS; Notion Ready
- Notes: Independent ODS re-read (not connector parser). 2025 total 267,894; identity none+discount+premium.

### T09 — Domain 06 Phase 1 (P120 expand + Decision Machine)
- Owner: Housing + Orchestrator
- Status: done (Phase 1 stats + Decision Machine; spatial later)
- Inputs: Live Tables P120–P138 ODS (existing pin); Notion brief Planning & Land
- Output: expanded `planning-decisions-granted` (171 obs); `canvas/land/PlanningDecisionMachine.tsx`; land views Land Explorer · Development Sites · Planning Decisions · Historical Change · Data
- QA: `data/qa/qa_housing_land_2026_11_04.md` — PASS

### T10 — Domain 06 Development Sites (brownfield inventory)
- Owner: Housing + Orchestrator
- Status: done (stats inventory; spatial parcels later with Land Explorer)
- Inputs: Planning Data brownfield-land CSV dump + local-authority entity map
- Output: `brownfield-land` (49 obs); `canvas/land/DevelopmentSites.tsx`; coverage notes; registry Ready
- QA: `data/qa/qa_housing_brownfield_2026_11_04.md` — PASS (32,353 current sites)
- Registry: [Brownfield land register](https://app.notion.com/p/40e65471768581ad87d4d6ea4e676890); [Planning Data coverage](https://app.notion.com/p/40e6547176858188b67de94e9865e76f) (Scoping)

### Review — Housing Domain 06 Planning & Land
- **Shipped:** Land Explorer (publisher FeatureServers + EA flood + Storage dumps) · Development Sites (brownfield) · Planning Decisions (P120 + Inspectorate appeals) · Historical Change (hectares + landmark GB years) · Data. Explorer frame Energy-standard (2026-11-10).
- **Labelled gaps (accepted):** Local-plan allocations — no England polygon feed (re-probe 503). Case-level applications — Planning Data stub / 403 dump; keep P120. Do not scrape LPA portals. London GLA allocations only if commissioned as a labelled pilot.
- **Next:** none for Domain 06 Gate 2. Earlier GB SHP years deferred until MHCLG GeoServer recovers.
- **Closed:** 2026-11-10 (T13–T15 + gap closeout).

### T13 — Domain 06 Land Explorer (Orchestrator)
- Owner: Orchestrator
- Status: done (2026-11-10)
- Inputs: Publisher FeatureServers + EA flood + Planning Data collection CSV dumps in Storage; `brownfield-land` England totals
- Output: `LandExplorer` briefing, then the live query; `LandData` tables by dataset
- Notes: Flood from EA FeatureServer (no national dump). Article 4 / TPO / brownfield from `bx-data-archive`. Cached live JSON is a request cache, not a set of starting places.

### T14 — Domain 06 Historical Green Belt geometries (Orchestrator)
- Owner: Orchestrator / Housing
- Status: done (2026-11-10)
- Inputs: MHCLG English local authority Green Belt annual boundaries (ArcGIS FeatureServer mirrors; GeoServer SHAPE-ZIP was 504); existing `green-belt-area` hectare series
- Output: Landmark plates `2010-11`, `2019-20`…`2024-25` in Storage (`housing.green-belt-history-*`); Historical Change `gby` "Map date" control + England map (outline, named cities, key) under the hectare chart. Rebuilt 2026-11-10 at ≈0.5 km after the 5–8 km first build was unreadable; duplicate `2022` dropped.
- Notes: Land Explorer keeps the current designation only. No invented intermediate years. Earlier years deferred until official zip recovers.
- Gap hunt: [domain06-gap-hunt-2026-11-10.md](domain06-gap-hunt-2026-11-10.md) — appeals = T15 candidate; allocations + case applications stay labelled gaps.

### T15 — Domain 06 PINS appeals casework (Orchestrator)
- Owner: Orchestrator / Housing
- Status: done (2026-11-10)
- Inputs: [Planning Inspectorate Casework Database](https://www.gov.uk/government/publications/planning-inspectorate-appeals-database) XLSX (OGL); field quality notes
- Output: `housing.planning-appeals` summary pack; Planning decisions › Measure = Appeals (TimeChart + RankBars). Not geocoded.
- Notes: 91,038 decided cases kept (2021–2026). Allow rate = Allowed ÷ (Allowed + Dismissed). Raw XLSX → Storage; curated JSON is the UI pack.

### T16 — Domain 06 labelled-gap closeout (Orchestrator)
- Owner: Orchestrator
- Status: done (2026-11-10)
- Inputs: Re-probe Planning Data local-plan / planning-application (503 / 403); [domain06-gap-hunt-2026-11-10.md](domain06-gap-hunt-2026-11-10.md)
- Output: Honesty copy on Land Explorer · Development Sites · Planning Decisions · Data; Domain 06 marked Done
- Notes: Allocations and case applications stay labelled gaps. No scrape; no London pilot unless commissioned.

### T17 — Domain 06 Local plan status (Orchestrator)
- Owner: Orchestrator / Housing
- Status: done — instrument live; Validation sample of 10 council plan pages still open (not in the 23-series catch-up)
- Inputs: Planning Data `local-plan.csv` + `organisation.csv` bulk files (OGL); found in the [gap hunt](domain06-gap-hunt-2026-11-10.md)
- Output: `local-plan-status` (536 obs, Postgres release 172); `housing.local-plan-status` summary pack; Planning decisions › Measure = Local plans (`pm=plans`): plan age bands, adoption year of today's plans, preparation stage, every-council table
- Headlines (as at 2026-11-10): 293 of 310 LPAs have an adopted plan in the data; 212 adopted 5+ years ago; 137 preparing a new plan
- Notes: Plan status, not allocations. Joint plans credited to each member; their housing figure is not attributed to one council. Adoption date falls back to `start-date` for 202 plans. 17 LPAs with no plan in the data (mostly new unitaries; North Herts is a data gap). Spot-checked adoption dates: Arun, Bury (PfE), Birmingham, Cornwall, Oxford, Leeds, Peak District. Validation: sample 10 councils' own plan pages.
- Not done: Green Belt appeals panel on Historical change (waits for the map zoom work in that file).

### T11 — Domain 07 Housing Quality (cutaway + EHS)
- Owner: Housing + Orchestrator
- Status: done (instruments live; EHS Validation PASS — re-run 2026-11-10)
- Inputs: [Housing Quality brief](https://app.notion.com/p/40e654717685816cb965c1336cb686e5); EHS live tables DA3201 / DA4101 / DA5101 / DA7101 / DA6101 / DA6201 + Ch2 annex
- Output: kickoff; Inside Britain's Homes; Energy; State of Repair; Geography; Data
- Notes: Survey estimates stay separate from the EPC register. The non-decent share is labelled as non-decent.

### T12 — Domain 07 Energy Anatomy
- Owner: Housing + Orchestrator
- Status: done (instrument live; Validation PASS in wave2 / inside-home reports)
- Inputs: DA6101 · DA6201 · DA7101 · Ch2 AT2.9/2.13/2.14
- Output: `ehs-heating` · `ehs-insulation` · `ehs-energy-improvement`; `canvas/quality/EnergyView.tsx`
- Headlines 2024: A–C 56.2% · central heating 92.8% · wall insulation 54.3% · loft ≥200mm 41.7% · improvable to C 42% · mean cost £7,480
- Caveat: EHS survey ≠ EPC register (EPC on Geography scale)

### T12b — Domain 07 EPC certificate register
- Owner: Housing + Orchestrator
- Status: done (2026-11-10)
- Inputs: EPB live tables D1 / EB1 / NB1 (pinned 2026-10-29); curated in Storage
- Output: Postgres releases 166 / 167; Geography `qscale=epc` (lodgements + A–C share); Data lists both indicators; `period_start` observation filter
- QA: `data/qa/qa_housing_quality_wave2_2026_11_04.md` — EPC section PASS (already filed)

### Review — Housing Domain 07 Housing Quality
- **Shipped:** Inside Britain's Homes · Energy · State of Repair · Geography (survey regions + EPC local authorities) · Data
- **QA:** EHS + EPC Validation signed off (`qa_housing_ehs_inside_home_2026_11_04.md`, `qa_housing_quality_wave2_2026_11_04.md` — re-run 2026-11-10 fails=0).
- **Kept:** Survey versus administrative labels, suppressed and missing cells, source links, and the full export. Sample counts are shown as a base, not as a confidence interval.
- **Review 2026-11-10 (Energy frame):** Filters lifted to outer `ControlRow`s (URL: `qf`/`qarch`/`qar`/`qt`/`qy`/`qcat`/`qm`/`qk`/`qi`/`qs`/`qscale`/`qp`). Body ledes removed. One `FigureRecord` Notes foot per view. Empties use `EmptyStage`. Data is panel stack. Figure strip capped at three.
- **Review 2026-11-10 (EPC):** Register loaded from Storage → Postgres; Geography LA map live.

### T13 — Domain 08 Housing Insecurity (full catalogue)
- Owner: Housing + Orchestrator
- Status: done (catalogue ingested; registry rows Ready)
- Inputs: [Housing Insecurity brief](https://app.notion.com/p/40e65471768581a2a277cc76f104f990); kickoff [agent-kickoff-insecurity.md](agent-kickoff-insecurity.md)
- Output: H-CLIC/TA · rough sleeping snapshot + data framework · MoJ · Table 600 · CORE · Census concealed · devolved TA · RO4 spend; Pathways · Temporary Life · Displacement · Housing Need · Data
- Registry: 19 Domain 08 rows marked Ready in the Dataset & Indicator Registry

### T14 — Domain 08 England H-CLIC + TA ingest
- Owner: Housing
- Status: done (loaded Postgres)
- Verified: 135,580 TA hh · 177,530 children · 83,850 owed duty · A3 support needs · MD3 priority need · TA2 composition

### T15 — Domain 08 rough sleeping + MoJ + 600 + CORE + concealed + devolved
- Owner: Housing
- Status: done (loaded Postgres)
- Output: snapshot 4,793 · possession · Table 600 · CORE · `concealed-households` (352,979 England) · `homelessness-devolved-ta` (Sc/W/NI)
- Deferred: Scotland SPARQL machine feed (bulletin transcription remains)

### T16 — Domain 08 Pathways / Temporary Life / Displacement / Need UI
- Owner: Orchestrator
- Status: done (canvas instruments live)
- Output: `Pathways` · `TemporaryLife` · `Displacement` · `HousingNeed` · `InsecurityData`

### T17 — Domain 08 Validation
- Owner: Validation
- Status: done (spot QA)
- Output: `data/qa/qa_housing_insecurity_2026_11_04.md` — PASS with deferred notes

### T18 — Domain 09 mortgage stocks and flows
- Owner: Housing
- Status: done (Postgres: approvals 1,554 rows, MLAR book 1,248 rows)
- Output: `mortgage-approvals` · `residential-mortgage-book`
- Verify: Sep 2026 house-purchase approvals 53,443 · Q2 2026 balances £1,760,582 million · gross advances £77,381 million
- Reused: Economy `mortgage-rate-2yr-fixed` (IUMBV34). Not forked

### T19 — Domain 09 canvas
- Owner: Orchestrator
- Status: done (Who owns rewrite 2026-11-10)
- Output: Who owns CCOD/OCOD map + RankBars (`corporate-owned-titles`) · mortgage time charts · WAS wealth · Data. Property Rights tab removed.
- Notes: QA PASS `data/qa/qa_report_corporate_owned_titles_2026-11-10.md`. Named title-level rows still out of scope (licence).

### T21 — Domain 09 wealth table into Postgres
- Owner: Housing
- Status: done (release 997, 119 rows). Validation spot-check of Table 3.8 and Table 3.19 still open
- Output: `data/housing/household-net-property-wealth/`

### T20 — Domain 10 anchor Acts and Time Machine
- Owner: Orchestrator (shared event shape) + Housing (the housing file and the canvas)
- Status: done (2026-11-10 — Chapter I + 1919/1947 commencement pinned)
- Inputs: [Housing Policy & History](https://app.notion.com/p/40f6547176858196aeacd8c3155fee87)
- Output: `britain_exchange.policy_event`; `data/housing/policy-events/events.json`; Time Machine on `/housing?domain=policy`
- Notes: 1919 assent **and** commencement **31 July 1919** (1793 default; s.52 short title only). 1947 assent 6 August 1947; passing-day list under s.120(2); appointed day **1 July 1948** (SI 1948/213). Housing Act 1980 Chapter I (right to buy) **3 October 1980** by enacted s.153(1). Context link: `right-to-buy-sales-and-replacements`. Renters’ Rights Act 2025 Chapter 1 (except s.25(3)) appointed 1 May 2026 for private assured tenancies only (SI 2026/421).

### Review — Housing Domain 10 Policy & History
- **Shipped:** Register and views (Timeline · Promise · Archive · Data). 1980 Chapter I, 1919 and 1947 commencements pinned. Help to Buy FTB quarterly in `help-to-buy-equity-loan`. Promise scoring 8/9.
- **Labelled gap (closed):** London AHP 2016-23 by year.
- **Open:** Renters’ Rights social-housing appointment when made.
- **Next:** social-housing commencement when the SI is made.

### Review — Housing Domain 08 Insecurity
- **Shipped:** Pathways stack · Temporary Life · Displacement · Waiting for a Home · Cost of Insecurity · Data glossary · RO4 homelessness spend (multi-year) · rough sleeping data framework
- **Blocked / deferred:** Scotland SPARQL (devolved TA stays a bulletin transcription). Gross temporary-accommodation entries and exits are not published in open MHCLG live tables (labelled gap); Temporary Life shows net quarter-end stock change instead. No origin–destination file, so Displacement stays duty location.
- **Next:** Notion registry rows marked Ready; resume Domain 07 State of Repair when you want
- **2026-11-05:** Catalogue links use `/data?record=`. Displacement says England. Lettings axis prints financial years. The five-years-or-more band is labelled open-ended in the drawing and the table. The brief no longer names a Health sector. Pathways is one stage at a time (View, Stage, Place, Quarter), with an All stages table. The flow diagram and the stacked plates are gone.
- **Review 2026-11-10 (Energy frame):** Already on frame — outer `ControlRow`s, `EmptyStage`, one `FigureRecord` Notes foot per view. No further shell drift found.
- **2026-11-10 (Cost + TA net):** Cost view shipped from Revenue Outturn multi-year England RO4 (120 obs). Temporary Life adds net stock change; QA addendum `data/qa/qa_housing_insecurity_cost_2026_11_10.md`.

## Registry / Postgres

| Status | Count |
|--------|------:|
| Ready (on disk / Postgres after load) | 54 |
| Blocked | 0 |
| Inbox | 0 |

## Review

### Pre-merge P0/P1 (this branch)

- Owner: Orchestrator
- Status: done (awaiting human merge approval — do not auto-merge)
- Next: human review / PR approval only

### Performance — domain loading and import locks (5 November 2026)

1. Orchestrator: record migrations once, enforce checksums and bound lock waits — implemented; existing local database verified and baselined.
2. Orchestrator: scope Housing payloads to the selected domain, retain bounded caching and deduplicate concurrent requests — implemented and tested across ten domains.
3. Orchestrator: mount exact-value tables only when opened; add route loading feedback — implemented.
4. Orchestrator: measure and document the remaining cold-load cost — recorded in `docs/performance.md`; browser validation unavailable and local Next smoke request timed out. End-to-end cold-page performance remains open.

### Structural — Energy domain-scoped loading (9 November 2026)

- Owner: Orchestrator
- Status: done
- Inputs: Housing `loadHousing(domain)` + `domain-sources.ts`; Energy route was loading twelve packs on every `/energy` open
- Output: `web/src/brand/energy/domain-sources.ts`; `loadEnergy(scope)`; `/energy` reads `?domain=` and loads only that domain’s packs; domain switches use `router.push` so the server refills; docs in `docs/performance.md`
- Notes: Visual structure unchanged.

### Structural — Energy evidence, readiness, view modules (9 November 2026)

- Owner: Orchestrator
- Status: done (first tranche)
- Inputs: consistency risks before completing Energy — evidence content drift; readiness inferred from loads; growing domain/view conditionals
- Output:
  - `web/src/brand/energy/views/*` — per-domain tabs, allowed URL params, evidence contract (source, definition, method, geography, period, dataHref)
  - `npm run test:evidence` — structural audit of those fields + readiness helpers + canvas imports
  - Domain index status from `domainUiStatus` (never from empty packs); `STAGE_EMPTY` distinguishes **In preparation** vs **Series unavailable**
  - Domain switches strip query keys via `allowedParams(domain)`
  - Doc: `docs/energy-evidence-contract.md`
- Next (still open): wire Notes feet to read evidence modules at runtime (remove parallel copy); Housing `views/` mirror; split large loaders; provenance contract; distinguish missing vs failed at the loader Result layer

### Structural — Explorer URL / browser-history contract (9 November 2026)

- Owner: Orchestrator
- Status: done (Energy fully migrated)
- Inputs: Housing push-on-domain / replace-on-control vs Energy’s fragile delete lists; need reliable hops before connections
- Output:
  - Shared utility `web/src/brand/navigation/explorer-url.ts` (resolve / patch / switch / commit)
  - Energy adapter `web/src/brand/energy/navigation.ts` (`useEnergyNavigation`)
  - Domain hops via `goDomain` (push; portable `year` only)
  - All Energy canvases (Generation…Policy) use `sync` — no local `history.replaceState`
  - `npm run test:url`; doc `docs/explorer-url-contract.md`
- Notes: `retain` allowlist is consumed by the Connections engine (below). Housing can point `setQuery` at this utility when convenient.

### Structural — Portable station selection (9 November 2026)

- Owner: Orchestrator
- Status: done
- Inputs: Power Station Atlas as proof that connections fit the Explorer; selection details must not live only in Atlas UI state
- Output:
  - `StationRef` / `StationSelection` + `resolveStationSelection` / `parseStationKey` in `station-model.ts`
  - Atlas evidence panel reads the portable selection (identity, technology, dates, geography honesty, national generation href)
  - URL `station=repd:…|dukes:…` only; region labels flagged as filter/caption — not join keys (`geographyCode`/`geometryId` reserved null)
  - `npm run test:station`; doc `docs/station-selection.md`
- Notes: No employment/government links yet. Future joins must use validated geography identifiers or geometry.

### Structural — P2 editorial hierarchy & Reset (9 November 2026)

- Owner: Orchestrator
- Status: done
- Inputs: Audit P2 — Energy tabs mixed long instrument names with task labels; Reset often shown at defaults
- Output:
  - Energy `views/*` tab `label`s shortened (Metabolism, Bill, Lifelines, Anatomy…); optional `instrument` keeps figure names
  - Stage titles unchanged (still use full instrument names in canvases)
  - Energy `ResetButton`s gated on adjusted filters (Housing pattern) across Generation, Consumption, Prices, Fossils, Imports, Renewables, Manufacturing, Jobs, Networks
- Notes: Does not change visual identity tokens or mobile overflow (P0)

### Structural — Connections contract (9 November 2026)

- Owner: Orchestrator
- Status: done (Energy seed + locked chrome)
- Inputs: brief kinds (direct / contextual / analytical); explorer-url `retain`; station selection; ad-hoc Follow hrefs; design-lab/follow
- Output:
  - Contract: `docs/connections-contract.md`
  - Module: `web/src/brand/connections/` — types, resolve, `ENERGY_CONNECTIONS`, **`FollowStep` + `ArrivalFrom`** (lab **1 + 4** locked)
  - One `primary` Follow per origin; `via` / `via_return` query keys on hops; Arrival chip in `EnergyCanvas`
  - Migrated: Changing Current, Atlas station, Imports, Fossils gap, Prices bill
  - Lab: `/design-lab/follow`; `npm run test:connections`
- Gate: mark registry edges `ready` only when destination instruments are cloud-served (Cloud Completeness). Cross-sector edges deferred until geography identifiers exist.
- Notes: No graph UI; no auto-discovery; strip capped so other sectors cannot grow a related-links dump.
- **Housing (same day):** `housing.ts` registry + `FollowStep` / `ArrivalFrom` in `HousingExplorer`; primary hops Prices↔Afford, Renting→Afford, Stock→Supply, Supply↔Land, Insecurity→Renting, Ownership mortgages→Afford; cross-sector Quality›Energy→Energy bills (ratings ≠ bills).
- **Housing Follow coverage (2026-11-10):** Full Ready domain/view coverage — Policy→Supply; Quality (non-Energy)→Stock; Ownership (non-Mortgages)→Stock tenure; Insecurity›Cost→Affordability rent burden. Cross-sector People/Government/Regions still deferred (geography joins).

### Energy generation usability — 7 November 2026

1. Orchestrator: simplify generation navigation and explain each view’s question and coverage — implemented.
2. Orchestrator: use a zero-baseline historical chart by default; keep selected-year breakdown stable and below the chart; separate year picking from fuel selection — implemented.
3. Orchestrator: move guided stories out of the primary control row into an optional disclosure — implemented.
4. Validation: browser connection unavailable; code validation recorded in the task handoff. No source data or fuel taxonomy changed.

### Cloud data offload — 7 November 2026

- Owner: Orchestrator
- Status: **done** (Phase 1 archive + Phase 2 schema/load) — superseded for UI by **Cloud Completeness** below
- Project: Supabase `british-exchange` (`wqofhaddnavcthuqpijv`, eu-west-2)
- Storage: private bucket `bx-data-archive` (Free plan ≤50 MB/object — large files gzipped on push)
- Index: `data/_archive_index.json` (~847 MiB logical archived; local `data/` ≈ 219 MiB)
- Tooling: `uv run python -m britain_exchange.archive_data push|pull|status|push-largest`
- Postgres: migrations applied; Ready observations loaded via PostgREST (`load_ready --via-rest`) — 132 indicators
- Env: `SUPABASE_URL` + `SUPABASE_ANON_KEY` in `.env` (gitignored)
- **Shipped:** laptop relief + cloud archive + cloud observation spine
- **Gap:** Phase 1 archived blobs; explorers still `readFile` many of them from local `data/`

### Cloud Completeness — Supabase as sole live store (9 November 2026)

- Owner: Orchestrator (API + Storage contract); Energy / Housing / Economy keep ingest ownership
- Status: **in_progress** — governing rule for every sector going forward
- Mandate: production UI and Railway must not need local `data/`. Observations → Postgres; heavy packs → Storage + API. Local disk = connector/QA cache only. New sector pages inherit this; no new `node:fs` pack loaders.
- Gate: restore audit P0 availability **via cloud**, not by re-pinning files on the laptop. Connections wait until instruments they need are cloud-served.

#### Remaining disk readers (inventory)

| Surface | Still reads local | Target |
|---------|-------------------|--------|
| FastAPI Ready observations | OK when `DATABASE_URL` → Supabase (`store=postgres`) | Keep; disable file fallback in production |
| Energy `load.ts` | atlas.json, stations.json, station-history, efficiencies, population, geography/authorities, NSTA points/CSV, Ofgem components, some observations.csv, boundaries.geojson | Storage + `/energy/...` pack routes (or Postgres where tabular) |
| Housing atlas `server.ts` | housing-atlas / rent-atlas / map packs under `data/housing` | Storage + existing or new API pack routes |
| Housing Next routes | `api/housing/regions`, `housing/land-layers/*` | Same — Storage-backed |
| Bundled JSON imports | ~~Energy / Housing policy-events~~ (packs via API) | done — Storage packs; Housing Policy no longer webpack-imports `events.json` |

#### Tasks

### CC01 — Production store gate
- Owner: Orchestrator
- Status: done
- Output: `britain_exchange.runtime.require_postgres`; `/health` → 503 when required store missing; Ready `/indicators*` refuse files; auto-on for Railway (`RAILWAY_*`) or `BX_REQUIRE_POSTGRES=1`; `.env.example` updated
- Notes: Dev keeps file fallback when require flag is off

### CC02 — Energy pack API (atlas / stations / geography)
- Owner: Orchestrator (+ Energy for checksum pins)
- Status: done (Energy UI path)
- Inputs: Energy `load.ts` disk inventory; `bx-data-archive`
- Output: `GET /packs` + `GET /packs/{id}`; `britain_exchange.packs.PACK_REGISTRY`; Energy `load.ts` uses `fetchPackJson`/`fetchPackText` only (no `node:fs`); 13 Energy/regions/people packs pushed to Storage (`--keep-local`); tests in `tests/test_runtime_packs.py`
- Notes: Unblocks Generation Atlas/Map, Consumption geography, Useful efficiencies, Fossils field atlas in deploy once API has Supabase env

### CC03 — Housing pack API (atlas / regions / land layers)
- Owner: Orchestrator (+ Housing ingest unchanged)
- Status: done (Housing UI path)
- Inputs: `housing/atlas/server.ts`, land-layers routes, regions route, policy.server, EHS JSON
- Output: Housing packs in `PACK_REGISTRY`; `GET /packs/rel/{path}` for planning-layer plates; atlas/geometry/EHS/policy registries + regions/land-layers routes use `fetchPack*`; packs pushed to Storage (`--keep-local`)
- Notes: Rent observations already cloud. Live Planning Data spawn removed from Next. **2026-11-10:** live path on FastAPI (`GET /housing/land-layers/{code}` → pack, else `query_place`). Default live builder is `publisher_layers.py` (ONS LAD, MHCLG Green Belt 2022, Natural England, Historic England NHLE, EA Flood Map for Planning FZ2/FZ3). Brownfield / Article 4 / TPO from Planning Data **collection CSV dumps** in Supabase Storage (`housing.brownfield-land-csv`, `housing.article-4-direction-area-csv`, `housing.tree-preservation-zone-csv`) — not the live entity API; laptop stays thin. Verified York (flood + A4) and Leeds (flood + A4 + TPO truncated at 400). **2026-11-10 (cloud must-fix):** Housing Policy register loads from pack `housing.policy-events` via `/api/housing/policy` — no webpack `events.json` import.

### CC04 — Sector rule lock-in
- Owner: Orchestrator
- Status: done (docs)
- Output: `AGENTS.md` Cloud Completeness section; README reframed; this work-plan block
- Notes: Future sectors (People, Government, …) use Postgres + Storage from day one — no parallel laptop UI path

### CC05 — Housing cloud gaps (three series + Policy pack)
- Owner: Orchestrator (+ Housing curated pins)
- Status: done (2026-11-10)
- Inputs: local curated rebuilds; `load_ready`; `archive_data push`; PolicyCanvas cutover
- Output:
  - Postgres current releases: `dwelling-stock-by-district` (release 164, 26 235 obs), `rough-sleeping-framework` (release 165, 43 452 obs)
  - Storage pack `housing.ehs-costs-by-age` (Affordability › Ages) refreshed
  - Policy: `events.ts` helpers-only; `PolicyPayload.events` / eras / relationships from Storage; `PolicyCanvas` / `model` no longer import register constants
- Notes: Rough-sleeping Storage CSV re-push may need delete-then-upload when TUS 409s; Postgres path is what the Insecurity Data view uses. EHS is pack JSON, not observation rows.

- **Shipped:** CC01–CC05 (Energy + Housing explorers off laptop for Ready series and Policy register)
- **Blocked:** none for these four surfaces; Railway still needs `DATABASE_URL` + `SUPABASE_*`
- **Next:** verify deploy Affordability Ages / Stock / Insecurity Data / Policy Timeline. Registry catch-up for 23 live series closed 2026-11-10 (`qa_housing_registry_catchup_23_2026-11-10.md`).

### Energy generation structure — 7 November 2026 (supersedes label tidy-up)

1. Orchestrator: reconcile the supplied Notion brief with Housing's single-stage structure — completed; rationale in `docs/generation-ux.md`.
2. Orchestrator: replace the stacked history/composition/fuel mini-page with one changing chart surface; remove duplicate visuals in Compare, Monthly and Map; pair Capacity scales — implemented.
3. Orchestrator: put historical annual observations in Data, preserve fuel context and use URL-derived state; keep sources and catalogue access — implemented.
4. Validation: TypeScript and rendering/state tests passed; browser visual verification blocked by unavailable/unreliable browser control. This is not full brief sign-off.

### Energy station investigation — 7 November 2026

1. Orchestrator: inventory the existing station evidence; 3,080 REPD coordinate points across 20 technology labels plus 68 DUKES coordinate points — inspected.
2. Orchestrator: build technology/search/storage filtering, fixed-scale map with ONS context, and one persistent station-evidence panel — implemented.
3. Orchestrator: connect explicit station technology matches to latest complete national ET 5.1 generation; add descriptive generation readings — implemented without station-output or causal inference.
4. Validation: TypeScript and model/rendering tests; visual browser verification remains outstanding.

---

## Energy accuracy wave — 2026-11-10

Audit → Waves A–D (shared fixes, domain bugs, duplicates, wording). Charts never plot provisional points.

### EA01 — Wave A shared nine
- Owner: Orchestrator + Energy (connectors) + Validation (sample)
- Status: done
- Output:
  - A1: TimeChart stack axis defaults to % labels
  - A2: ONS manufacturing connectors parse final + revision window; curated reloaded to Postgres; UI drops provisional from series / year means
  - A3–A4: per-view complete-year menus (Fossils Reserves, Afford, Buildout, Jobs, Manufacturing); IoP annual_means omit part years
  - A5: AnnualSeriesTable uses fmtT + cadence
  - A6: RankBars signed zero-baseline; net corridor flows keep sign
  - A7: `energy.industrial-policy-events` + `energy.imports-shock-events` packs; fetchPackJson; archived to Storage
  - A8–A9: Next reading plain English + live links; Reset matches tab defaults
- Notes: Validation sample = connector status counts after reload (IoP 21876 final / 432 provisional; employment 189/4; etc.)

### EA02 — Wave B domain bugs
- Owner: Orchestrator
- Status: done
- Notes: Map separate renewables/storage/fossil buckets; Data keeps fuel group; Bill vs URL; Shock cash labels; Consumption Data/Geography copy; Jobs Pay %; Landscape 1978; Monthly imports title; Crude oil and NGLs

### EA03 — Wave C duplicates
- Owner: Orchestrator
- Status: done
- Notes: Kept Manufacturing Places (Jobs Atlas redirects); kept Imports Connectors (Networks Capacity redirects); removed restating ledger/cards

### EA04 — Wave D wording
- Owner: Orchestrator
- Status: done
- Notes: Body method notes → Notes foot; no History in-chart labels; codes stripped from body; sentence-case titles; user empty states; Useful “User scenario — not a DESNZ statistic”; one-ink station/field maps

- **Shipped:** EA01–EA04
- **Blocked:** none
- **Next:** browser spot-check Reserves/Afford/Jobs/Metabolism stacks; optional Validation formal QA note under `data/qa/`

---

## Energy finalise Mode B audit — 2026-11-10

**Owner working board (chronological):** [gate4-energy-domain-checklist-2026-11-10.md](gate4-energy-domain-checklist-2026-11-10.md) — §0 once, then domains 01→10.  
Evidence: [finalise audit](gate4-audit-energy-finalise-2026-11-10.md) · [availability / Codex](gate4-energy-availability-2026-11-10.md) · [source QA](../data/qa/qa_energy_finalise_sources_2026-11-10.md).

**Verdict:** Sector **not** Gate-4-final. Cloud loads + most shell P1s landed; remaining = browser/Railway verify per domain + held/deferred tracks.

### EF01 — Cloud honesty (P0)
- Owner: Energy → Validation → Orchestrator
- Status: **done (cloud load)** — six observation series in Postgres (releases 174–179); weights Storage + Notion registry (no Postgres duplicate). Local pin delete waits on Railway proof in domain checklist Session A
- Notes: See availability doc “Resumed after storage cutover”

### EF02 — Shell P1 (Reset / source / Follow / year pool / prep empty)
- Owner: Orchestrator
- Status: **done (code)** — view-scoped Reset; `formatSource` feet; Jobs year intersection; prep EmptyStage; Follow for Policy / Jobs Pay / LC Capacity. Networks Queue/Grid Follow **held** with N07
- Notes: Browser visual re-check still open on domain checklist

### EF03 — Polish P2 + phone
- Owner: Orchestrator (+ imagery for plates)
- Status: **partial** — Policy Reset + sampled labels + demand/bill missing≠zero done; EF09 phone/Data/key/hydration code fixes landed; Fossils map triage + sector 390px re-measure + plates **open** on checklist §0 / 04 / 06

### EF04 — Local closure + cloud resume (2026-11-10)
- Owner: Orchestrator
- Status: **superseded by domain checklist** — local + cloud evidence recorded in availability doc; owner walks 01→10 for visual close
- Output: availability matrix; shell fixes; Follow; cloud loads; QA pack

### Held / owner (unchanged — not on shell critical path)
- Networks N07 — operator email; no further Networks UI until cleared layers
- Manufacturing Anatomy redesign; Product Ledger; regional GVA atlas
- Networks N07 / BX-BACK-004 (national maps); Jobs Industrial Lives (owner register); optional Imports 4.4b/4.5b + LNG pins; Consumption user-scenario; Energy Promise UI wire (draft `pledges.json` only)

- **Next:** Session **B** (domains 01→05 desktop click-through). Session A cloud spot-check **done** locally 2026-11-10 (see below). Do not claim Energy Gate 4 final until the checklist board is ticked.

### EF06 — Session A cloud verify + DB pool (2026-11-10)
- Owner: Orchestrator
- Status: **done (local cloud)** — Afford · Wholesale · Reserves · Resilience · Anatomy weights all populated from Supabase; Resilience EmptyStage root cause was Supabase `EMAXCONNSESSION` (session pool_size 15) under Energy SSR parallel fetches
- Output: `psycopg[binary,pool]` + shared `ConnectionPool` in `britain_exchange.db` (default max 8, `BX_DB_POOL_MAX`); FastAPI lifespan closes pool; `loadSeriesPack` one silent retry + log; Resilience stage draws if any ratio pack loads
- Evidence: postgres `store=` for the seven Session A series; weights Storage SHA matches local pin; browser figures recorded on [domain checklist](gate4-energy-domain-checklist-2026-11-10.md)
- Remaining: deploy pool to Railway and re-spot-check production; then Sessions B–C desktop/390px; pin delete after Railway proof

### EF07 — Menus 01–05 sweep (parallel to Session B · 2026-11-10)
- Owner: Orchestrator (read-only)
- Status: **done (note)** — [gate4-energy-menus-01-05-2026-11-10.md](gate4-energy-menus-01-05-2026-11-10.md)
- Output: Afford / Resilience / Imports view year pools **pass**; **P1** Fossils › Reserves year menu = union of 2P + oil_production → empty recoverable figures for 1970–72; S27 residuals P2 only
- Next: Energy agent or Session B polish — intersect Reserves years on oil_2p ∩ gas_2p (or equivalent) before Gate 4 final

### EF08 — Source feet S1 / formatSource (2026-11-10)
- Owner: Orchestrator
- Status: **done** — structure + Housing-voice rewrite
- Output:
  - Structure: every Energy Notes foot via `energySource` → `formatSource`; 47/47 views have geography + period; slash / mid-`·` geographies cleaned
  - Voice (Housing match): rewrote `citations.ts` so publisher · series reads like `MHCLG · Live Table 213` — expanded bare ET/DUKES/QEP/BRES/ASHE/TEC; table numbers stay inside the series name; multi-publisher lists publishers first (`DESNZ · ONS · …`). Cleaned period evidence of acronym-only labels and mid-string `·`
- Audit: [finalise](gate4-audit-energy-finalise-2026-11-10.md) S1/S10 Pass, E-FIN-07 done; checklist §0 Notes feet verified
- Next: none for source feet; Session B continues desktop click-through

### EF09 — UI bug batch (phone / Data / keys / hydration · 2026-11-10)
- Owner: Orchestrator
- Status: **done (code)** — browser re-measure still open on checklist §0 phone pass
- Output:
  - Jobs › Pay 390px: RankBars name column `minmax(0, …)` + wrap (shared `instrument.module.css`) — no more `max-content` page blow-out
  - Networks › Data: interconnector table uses `interconnectorAnnualSeries` (one row per year) under “annual sum of quarters”
  - Networks › Invisible Grid: uniquify SSEN substation/line ids in `loadNetworks` (operator pin reused `UNKNOWN` ids → 47 duplicate React keys)
  - Manufacturing › Data 390px: `.wrap` branch cells + fixed table layout under 560px so names wrap inside the stage
  - Renewables › Buildout: earliest capacity year from capacity series (not load-factor-only 2008)
  - Manufacturing › Anatomy: share/volume year pools capped to last complete IoP/output year (no default part-year 2026)
  - Fossils › North Sea: stable field count + `localeCompare(..., "en-GB")` sort; drop locale grouping on constant GWh copy
  - TimeChart default `gaps="dashed"` (Housing grammar) — empty stretches between observations draw as dashed, not blank (fixes Fossils coal mid-series hole among others)
- Next: Session C phone 390px sweep to confirm; Railway still on EF06

---

## Observation storage / uniqueness — Phase 1 · 2026-11-10

Audit: [audit-observation-storage-uniqueness.md](audit-observation-storage-uniqueness.md). QA: [../data/qa/qa_observation_identity_hash_2026-11-10.md](../data/qa/qa_observation_identity_hash_2026-11-10.md).

### OS01 — Note dictionary + identity_hash (Phase 1)
- Owner: Orchestrator
- Status: **done (production)**
- Output: `004` applied via batched RW transactions after Pro upgrade; `schema_migration` recorded; collision groups = 0

### OS02 — Phase 2 drop legacy unique / notes column
- Owner: Orchestrator
- Status: **done (production)**
- Output: `005` applied; `VACUUM FULL observation` (+ note table); loader/store already on join path
- Production measure after cutover: observation indexes **499 MB → ~196 MB pre-vacuum**, then full rewrite; see QA note
- Incident lesson: never one-shot fat DDL on Free Plan disk; Pro + batched `BEGIN; SET TRANSACTION READ WRITE; …` required while platform read-only lingered


### EF05 — Resume after storage cutover (2026-11-10)
- Owner: Orchestrator + Validation
- Status: cloud observation gaps closed; remaining visual/suppression checks open
- Output: six missing indicators loaded (1,450 rows, releases 174–179); all six FastAPI metadata/observations HTTP 200, store=postgres, notes preserved; weights verified from Storage with disk fallback disabled (1,110 rows; no duplicate Postgres copy). Source checks and registry catch-up recorded in `data/qa/qa_energy_finalise_sources_2026-11-10.md`.
- Follow: Policy Ledger → Generation History; Jobs Pay → Labour Landscape; Low-carbon Capacity → Generation History. Cloud-backed destinations verified. Networks hold unchanged.
- Validation: 38 web tests and TypeScript; six raw checksum/key checks; all earnings months and MPP numeric source cells; exact weights reproduction/additive checks and independent Section C samples.
- Remaining: browser access host unavailable, so desktop/390px inspection pending; Fossils suppression/glyph triage; full stale-menu sweep and deployed Railway verification; held owner content unchanged. Energy not Gate-4-final.

---

## Economy & Public Finance · Gate 1 orchestration · 2026-11-10

**Status:** Wave A **G3 complete** (2026-11-11) for Explorer UI + cloud Ready loads. Review Gate **locked**. **Wave B unblocked** for evidence kickoffs (still no Wave B UI until Wave B G2+G3).  
**Notion Control:** [Economy Sector Control](https://app.notion.com/p/414654717685811caf11f9bfb7b3ef83)  
**Sector:** [Economy & Public Finance](https://app.notion.com/p/40d65471768581419ceaefe6dec32ba2)  
**Overlap:** [economy-overlap-matrix.md](economy-overlap-matrix.md)  
**Wave A review:** [economy-wave-a-review-2026-11-11.md](economy-wave-a-review-2026-11-11.md)  
**Visual contract:** [economy-visual-contract.md](economy-visual-contract.md)  
**Kickoff template:** [agent-kickoff-economy-domain.md](agent-kickoff-economy-domain.md)  
**Orchestrator:** this chat  
**Rule (locked 2026-11-11):** Finish Wave A **G2** (done) and Wave A **G3** (Explorer build under shared shell + Review Gate visual contract) **before** opening Wave B (03·06·07). No parallel Wave B research while Wave A G3 is open.

Wave A production rail: Inflation · Wages · Growth · Debt (`sector-pages.ts`).

### EC-G1-01 — Notion Sector Control + domain stubs
- Owner: Orchestrator
- Status: done (2026-11-10)
- Output: Control Page + domains 01–10 under Economy workspace; sector status → Gate 1 in progress
- Notes: Wave A = 01·02·05·08; B = 03·06·07; C = 04·09·10

### EC-G1-02 — Overlap matrix + inventory
- Owner: Orchestrator
- Status: done (2026-11-10)
- Output: `docs/economy-overlap-matrix.md`
- Notes: 17 Economy pins mapped; Energy Jobs/BRES/ASHE manufacturing + Housing mortgage/CPI links recorded; recommend `business-investment` primary home in Domain 09

### EC-G1-03 — Repo artefacts (skill + kickoff template)
- Owner: Orchestrator
- Status: done (2026-11-10)
- Output: `.cursor/skills/economy-agent/SKILL.md` (no UI before Review Gate); `docs/agent-kickoff-economy-domain.md`

### EC-G1-04 — Wave A kickoffs (01 · 02 · 05 · 08)
- Owner: Orchestrator → Economy domain subagents
- Status: done (kickoffs 2026-11-10; artefacts returned 2026-11-11)
- Inputs: overlap matrix; existing `data/economy/` pins; Notion domain pages
- Output: kickoffs + `docs/handover-economy-01-inflation.md` · `…-02-wages.md` · `…-05-growth.md` · `…-08-debt.md`
- Notes: See EC-G2-WA

### EC-G1-05 — Visual elevation lab (orchestrator-owned)
- Owner: Orchestrator
- Status: done (lab + draft contract 2026-11-10)
- Output: `/design-lab/economy-elevation`; `docs/economy-visual-contract-draft.md`
- Notes: Winners fold into Review Gate visual contract only; production canvas still frozen

### EC-G2-WA — Wave A evidence review
- Owner: Orchestrator
- Status: done (2026-11-11)
- Output: [economy-wave-a-review-2026-11-11.md](economy-wave-a-review-2026-11-11.md)
- Decisions: NPEL → Domain 09; HF6X for debt%; AWE GB override approved in principle; L55O next CPIH rate pin; GDP re-pin before Growth Ready
- Notes: Four artefacts accepted; **not** G3; Validation P0 = `cpi-index` + debt trio

### EC-G2-VAL — Validation P0 (Wave A)
- Owner: Validation → Orchestrator Ready flip
- Status: **done** (2026-11-11)
- Output:
  - `data/qa/qa_report_cpi_index_2026-11-11.md` — pass → Ready ([registry](https://app.notion.com/p/41565471768581feb1d3e53475e9220a))
  - `data/qa/qa_report_public_sector_debt_trio_2026-11-11.md` — pass → Ready (HF6W / DZLS / NMFX)
  - Script: `src/validation/qa_economy_wave_a_p0_2026_11_11.py`
- Notes: W1 raw absent locally (gitignore); re-pin after 18/20 Nov releases

### EC-G2-PIN — Wave A+ pins L55O + HF6X
- Owner: Economy → Validation → Orchestrator
- Status: **done** (2026-11-11)
- Output:
  - `cpih-inflation` (L55O) Ready — QA `qa_report_cpih_inflation_2026-11-11.md`; 2026-09 = 3.6%
  - `public-sector-net-debt-percent-gdp` (HF6X) Ready — QA `qa_report_public_sector_net_debt_percent_gdp_2026-11-11.md`; 2026-09 = 94.0% (warn: OBR forecast tail)
- Notes: Unlocks CPI vs CPIH rate view + debt %GDP dial without deriving from ABMI

### EC-G2-GROWTH — Growth QNA + earnings Ready
- Owner: Economy → Validation → Orchestrator
- Status: **done** (2026-11-11)
- Output:
  - ABMI/IHXW/NPEL on **QNA** (2026-09-29); LZVB on PRDY (2026-08-17) — QA `qa_report_economy_growth_qna_2026-11-11.md`
  - IHXW: `zero_as_missing_before=1955-01-01` → 36 pre-1955 zeros → missing; first real 1955 Q1 = 2,936
  - AWE: geography override **K03000001 / Great Britain** on `nominal-earnings` + `real-earnings` — QA `qa_report_economy_earnings_2026-11-11.md`
  - Registry Ready flips: `real-gdp`, `real-gdp-per-head`, `business-investment`, `labour-productivity`, `nominal-earnings`, `real-earnings`
- Notes: Live ONS re-fetch blocked in this session (DNS); curated re-written from existing QNA/AWE pins. Re-pin ABMI/IHXW/NPEL after 12 Nov; LZVB + AWE after 17 Nov. Energy Prices joins earnings by year — GB code change is safe.

### EC-G2-CLOSE — Wave A G2 closed
- Owner: Orchestrator
- Status: **done** (2026-11-11)
- Output: Wave A domains 01·02·05·08 evidence + Validation Ready; Control board updated
- Notes: Review Gate + G3 still required before Wave B

### EC-G3-PREP — Review Gate → Wave A G3
- Owner: Orchestrator
- Status: **done** (2026-11-11)
- Inputs: `docs/economy-visual-contract-draft.md`; `/design-lab/economy-elevation`; Wave A Ready series
- Output: Locked [economy-visual-contract.md](economy-visual-contract.md); Wave A rail in `sector-pages.ts`
- Notes: Sage/straw by domain family; hero `containerPort` print; proof-tile rail until Economy REF_ICON set; ship order 01→08→05→02

### EC-G3-01 — Inflation domain (Changing Price of Britain)
- Owner: Orchestrator
- Status: **done** (2026-11-11)
- Output: `/economy?domain=inflation` (rate · index · data); CPI/CPIH switch; cloud-loaded MM23 quartet
- Notes: `chart_contract` CPIH flags fixed

### EC-G3-02 — Wages domain (Pay cheque vs prices)
- Owner: Orchestrator
- Status: **done** (2026-11-11)
- Output: `/economy?domain=wages` (real · pay vs prices · cash · data); GB≠UK chip
- Notes: Cloud-loaded AWE + CPIH

### EC-G3-03 — Growth domain
- Owner: Orchestrator
- Status: **done** (2026-11-11)
- Output: `/economy?domain=growth` (GDP · per head · productivity · data)
- Notes: QNA ABMI/IHXW + PRDY LZVB cloud-loaded; IHXW missing pre-1955

### EC-G3-04 — Debt domain (Debt dial)
- Owner: Orchestrator
- Status: **done** (2026-11-11)
- Output: `/economy?domain=debt` (dial measure switch · data); HF6X official %GDP
- Notes: Never derive %GDP from ABMI

### EC-G3-CLOSE — Wave A G3 closed
- Owner: Orchestrator
- Status: **done** (2026-11-11)
- Output: Four Wave A domains live under [economy-visual-contract.md](economy-visual-contract.md); Ready series in Supabase
- Notes: G4 structural audit still pending. Wave B evidence may start; Wave B UI still gated on B G2+G3.

### EC-G3-RAIL — Ten-domain rail + REF_ICON plate set
- Owner: Orchestrator (+ owner photo-refs)
- Status: **done** (2026-11-11) — **owner confirmed outlines/plates placed**
- Output: `sector-pages.ts` economy → 01–10; `REF_ICON_PLATES.economy*` (ten `i-ref-economy-*.png`); rail wired in `EconomyCanvas`
- Notes: Status from `ECONOMY_READY_DOMAINS`, never from packs. Wave B/C canvases still gated on their own G2+G3.

### EC-G4 — Structural consistency audit (Wave A Economy)
- Owner: Orchestrator
- Status: **done** (2026-11-11) — conditional close
- Output: [gate4-audit-economy-wave-a-2026-11-11.md](gate4-audit-economy-wave-a-2026-11-11.md)
- Notes: No P0. P1 partially closed by EC-DB-01/02 (Inflation + Wages Follow + `domain-sources.ts`). Remaining P1: Follows on Growth · Debt. P2: 390px measure; sage/straw on Growth/Debt.

### EC-WB-KICK — Wave B evidence kickoffs (03 · 06 · 07)
- Owner: Orchestrator → Economy domain subagents
- Status: **done** (kickoffs 2026-11-11)
- Output: [agent-kickoff-economy-03-employment.md](agent-kickoff-economy-03-employment.md) · […-06-tax.md](agent-kickoff-economy-06-tax.md) · […-07-spending.md](agent-kickoff-economy-07-spending.md)
- Notes: Evidence + Notion only — no Wave B canvases until each domain’s G2+G3

### EC-DB-CYCLE — Chronological deep briefs (Energy/Housing bar)
- Owner: Orchestrator
- Status: **Wave A done** (2026-11-11) — 01 · 02 · 05 · 08 elevated
- Inputs: Locked Wave A G3; Energy Prices-style deep briefs; owner chronological order
- Output: Notion deep brief + canvas elevation per domain before treating UI as “deep”
- Notes: Wave A order **01 → 02 → 05 → 08** complete. Wave B **03 → 06 → 07** only after each domain’s G2+G3. Wave B canvases still gated.

### EC-DB-01 — Inflation deep brief + elevation
- Owner: Orchestrator
- Status: **done** (2026-11-11)
- Output: Notion Domain 01 deep brief (*The Changing Price of Britain*); `connections/economy.ts` + `EconomyStageFollow`; `economy/domain-sources.ts`; Inflation tabs Categories / Everyday basket (`EmptyStage`); sage Data section breaks; ArrivalFrom on Economy explorer
- Notes: Follows — rate→Energy bill · index→Housing prices · data→Wages vs-prices. Re-pin after **18 Nov** CPI. Source feet: no CDID / `source_version` pin leaks (`economy/citations.ts`).

### EC-01-EDIT — Inflation editorial pass (brief 01–04)
- Owner: Orchestrator
- Status: **done** (2026-11-11)
- Output: *What £1 buys* rebuilt to brief 02 (Year + Measure; `PoundBuys` area-true instrument; cost-of-£1 `TimeChart`; derived, said so in Notes); public copy cleaned on all tabs (no pp / COICOP / planned-not-ready / owner notes); peak figure on Changing price; sage removed from Inflation + Wages Data (contract: paper only); sector band hero = night (template)
- Notes: Provisional bug fixed in EC-01-PROV (latest month only; charts plot final).

### EC-01-CLOSE — Inflation domain close
- Owner: Orchestrator
- Status: **done** (2026-11-11) — Categories + Everyday basket wired; provisional fixed; contributions shipped
- Done: tabs 01 Changing price · 02 What £1 buys · 03 What's driving it (contributions default + annual-rates lens) · 04 Everyday basket · Data
- Notes: Basket Notes state official statistics in development; pin ends Jan 2025. Charts / Data tables use **final** rows only.
- Editorial (Orchestrator, 2026-11-11): *What £1 buys* = two titled coin cards (`PoundBuys`, King Charles III reverses under Royal Mint permission — `docs/permissions/royal-mint-coins.md`; light/ink-numeral variant). *Everyday basket* = price-tag wall (`BasketWall`): Show menu + search over 326 items, year menus (January prices), Play the months, pinned till strip; featured ten drawn + 20 generic type plates (`basket-items.py`). Basket loads by January + per item (API caps 10k rows) — `basket-load.ts`. Public copy and Follow lines de-jargoned.
- Later (owner): tidy weaker plates (kettle, ticket, hammer, broccoli; scale of chair/bike/car); Clothing and Recreation not yet in the basket pin.

### EC-01-CONTRIB — CPIH contributions by COICOP division
- Owner: Economy / Orchestrator
- Status: **done** (2026-11-11) — Ready + cloud + UI
- Output: CDIDs L5H5–L5HG → `cpih-contribution-*` (165 months each); QA [qa_report_economy_01_contributions_2026-11-11.md](../data/qa/qa_report_economy_01_contributions_2026-11-11.md); Supabase releases 204–215; Categories Lens = Contributions | Annual rates
- Notes: Aug 2026 sum 3.28pp vs headline 3.3%. Rounding L5GO not pinned.

### EC-01-PROV — CPI/CPIH observation_status fix
- Owner: Economy / Orchestrator
- Status: **done** (2026-11-11)
- Output: `OnsTimeseriesConnector` marks latest month provisional only; older months `final`. Everyday basket archive all `final`. Reloaded headline quartet + 12 COICOP + basket to Supabase.
- Notes: Spot-check cloud: `cpi-inflation` 452 final / 1 provisional; basket 802 final.

### EC-01-COICOP — Ingest CPIH COICOP divisions
- Owner: Economy (Orchestrator CDID map)
- Status: **Ready** (2026-11-11) — cloud-loaded + UI wired
- Output: [economy-01-coicop-cdid-map.md](economy-01-coicop-cdid-map.md); 12 pins `cpih-inflation-*`; QA pass; Supabase releases 191–202; Inflation › What's driving it RankBars
- Notes: CPIH annual rates L55P–L55Z + L562 only.

### EC-01-BASKET — Official average prices (everyday basket)
- Owner: Economy
- Status: **Ready** (2026-11-11) — cloud-loaded + UI wired
- Output: `everyday-basket-average-prices` (802 obs); QA pass; Supabase release 203; Inflation › Everyday basket
- Notes: Official statistics in development; pin ends Jan 2025. Post-2025 live tool download still open. **Superseded by EC-01-BASKET-X** (Category1 expand).

### EC-01-BASKET-X — Everyday basket Category1 expand
- Owner: Economy → Validation → Orchestrator
- Status: **Ready** (2026-11-11) — ingest + QA pass + Supabase reload (release 203, 26 306 obs)
- Inputs: ONS shopping-prices pre-2025 xlsx; Orchestrator Category1 allowlist
- Output: `everyday-basket-average-prices` (26 306 obs, 326 items); `curated/items.json`; QA [qa_report_everyday_basket_expand_2026-11-11.md](../data/qa/qa_report_everyday_basket_expand_2026-11-11.md); kickoff [agent-kickoff-validation-economy-01-basket-expand.md](agent-kickoff-validation-economy-01-basket-expand.md)
- Notes: Groups = Food and drink (+ establishments) · Household items · Services · Health · Transport. Original 10 slug overrides kept. Clothing / Recreation excluded. Search UI owner-owned (no `web/` in this task).

### EC-DB-02 — Wages deep brief + elevation
- Owner: Orchestrator
- Status: **done** (2026-11-11)
- Output: Notion Domain 02 deep brief (*Pay cheque vs prices*); Wages Follows; Wage ladder `EmptyStage`; sage Data breaks
- Notes: Follows — real→Inflation CPIH · vs-prices→Inflation index · cash→Energy afford · data→Energy Jobs pay. Re-pin after **17 Nov** AWE. National ASHE planned-not-ready.

### EC-DB-02b — Wages · The Value of Work
- Owner: Orchestrator
- Status: **done** (2026-11-11)
- Inputs: Notion Domain 02 §7 approved refinement; Ready `real-earnings` (A2FC)
- Output: `/economy?domain=wages&view=value` — Compare year menu; distance-to-peak figures; TimeChart peak/year rules; exact levels table; Follow → Inflation CPIH
- Notes: Final months only. Peak = observed high in pin. ASHE ladder still EmptyStage.

### EC-DB-05 — Growth deep brief + elevation
- Owner: Orchestrator
- Status: **done** (2026-11-11)
- Output: Notion Domain 05 deep brief locked; `/economy?domain=growth` tabs produce · ledger · productivity · revisions · data; Follows → Energy Jobs productivity · Debt dial · Wages real; provisional = latest quarter only (reloaded)
- Notes: Live vintage stamp updated 2026-11-14 → **PN2 2026-11-12** (ref yr 2024, through 2026 Q3). Productivity half of BX-BACK-005 still waits on **17 Nov** PRDY.

### EC-05-REPIN-GDP — Post-12-Nov GDP first estimate (BX-BACK-005 half)
- Owner: Economy → Validation → Orchestrator
- Status: **done** (2026-11-14) — GDP half closed; productivity half still open
- Output: Live source switched **QNA→PN2** (QNA stayed on 2026-09-29; PN2 published Q3). Re-pinned `real-gdp` / `real-gdp-per-head` / `business-investment`; Supabase releases **225** / **226** / **224**; Storage archive `raw/2026-11-14/*_pn2.json`; QA [qa_report_economy_05_gdp_repin_2026-11-14.md](../data/qa/qa_report_economy_05_gdp_repin_2026-11-14.md) **pass**; Produce Notes stamp → PN2 2026-11-12
- Spot: ABMI 2026 Q3 = 749 999 (£m); QoQ ~+0.7% / YoY ~+1.9% vs [ONS bulletin](https://www.ons.gov.uk/economy/grossdomesticproductgdp/bulletins/gdpfirstquarterlyestimateuk/julytoseptember2026)
- Notes: Revisions pack still Aug-PN2 vs Sep-QNA rebase (BX-BACK-008). Prefer QNA again only when its `releaseDate` is newer than PN2.

### EC-DB-05c — Growth §7 refine (Produce · Ledger · Engine honesty)
- Owner: Orchestrator
- Status: **done** (2026-11-11) — UI refinements; release-gated work on Notion Cross-sector backlog
- Output: Produce measure definitions + vintage Notes; Growth Ledger **From** baseline menu (2019 Q4 default · 2008 · 1990 · 1979 · 1955; URL `base`); Data cells body type (no `bo-fig`)
- Parked → [Cross-sector backlog](https://app.notion.com/p/41465471768581a5bef6d539d77dad53): **BX-BACK-005** GDP/productivity re-pins + vintage-band rebuild · **BX-BACK-007** Anatomy GVA · **BX-BACK-008** full Revision Archive
- Notes: IHXW pre-1955 already blank in curated (not charted as zero). Structural audit still open after Wave A polish. **BX-BACK-006 closed** by EC-05-HOURS.

### EC-05-HOURS — Productivity hours (LZVA) + Engine UI
- Owner: Economy → Validation → Orchestrator
- Status: **Ready** (2026-11-11)
- Output: `labour-productivity-hours` (221 obs, LZVA/PRDY); connector `economy.connectors.labour_productivity_hours`; QA [qa_report_labour_productivity_hours_2026-11-11.md](../data/qa/qa_report_labour_productivity_hours_2026-11-11.md); Supabase release **223**; registry [Ready](https://app.notion.com/p/41565471768581e788f5d9373c99e34c); Growth › Productivity Engine dual chart (hours + output per hour)
- Notes: Same periods as LZVB; accounting split labelled (not causal; not ABMI). Re-pin with LZVB after **17 Nov** (BX-BACK-005). Design lock: Produce/Ledger keep total output; Engine stays hours+OPH only (not GDP on the same instrument).

### EC-05-DATA — Next Economy data wave (output index · Anatomy · Revisions)
- Owner: Economy (later)
- Status: **partial** — Anatomy GVA ingest done (EC-05-GVA); Engine output + full Revision Archive still open
- Output: [agent-kickoff-economy-05-data-wave.md](agent-kickoff-economy-05-data-wave.md)
- Scope remaining: (1) pin ONS **productivity output** index (BX-BACK-009); (2) dated GDP vintages for full Revision Archive (BX-BACK-008)
- Notes: Do not invent output from ABMI.

### EC-05-GVA — Industry GVA by SIC section (BX-BACK-007)
- Owner: Economy → Validation → Orchestrator
- Status: **Ready** (2026-11-14) — ingest + Validation pass + Anatomy UI live
- Output: `gva-by-industry-section` (7098 obs); connector `economy.connectors.gva_by_industry_section`; source [GDP(O) LLA](https://www.ons.gov.uk/economy/grossdomesticproductgdp/datasets/ukgdpolowlevelaggregates/current) release 2026-11-12; Supabase release **230**; QA [qa_report_gva_by_industry_section_validation_2026-11-14.md](../data/qa/qa_report_gva_by_industry_section_validation_2026-11-14.md); registry [Ready](https://app.notion.com/p/4186547176858181a65bd3ad760c924a)
- UI: `/economy?domain=growth&view=anatomy` — RankBars shares (current prices) · ChangeRows vs compare quarter · Data table · `anatomy-model.ts`
- Spot: 2026 Q3 current-price Total GVA 726 868 £m; A–T sum within £1; Manufacturing C ≈ 8.4% (not L4NT)
- Notes: `kind=current_price` → API `category`; `series=` = section letter. Do not fork Energy `manufacturing-share-of-gva`.

### EC-DB-05b — Growth vintage-band store
- Owner: Economy (+ Orchestrator UI)
- Status: **done** (2026-11-11)
- Output: `economy.connectors.gdp_vintage_band` → `data/economy/gdp-vintage-band/curated/band.json`; pack id `economy.gdp-vintage-band` in `PACK_REGISTRY` + Storage (`--keep-local`); Growth › Revisions plots PN2 vs QNA rebased to 2019 Q4 = 100 (GDP · per head)
- Notes: Absolute £ levels kept in spot table only (ratio ~1.045). Do not overlay levels.
- **Rebuilt 2026-11-14:** vintages are now `first` (PN2 2026-08-12, 2023 prices) vs `latest` (PN2 2026-11-12, 2024 prices), spot at the shared latest quarter (2026 Q2). The 12 Nov PN2 carried the 29 Sep QNA history unchanged (max index diff 0.00), so QNA-vs-Nov would plot two identical lines. Pack pushed to Storage (`--keep-local`). UI ids `pn2`/`qna` → `first`/`latest`; copy is plain words (no PN2/QNA on screen).

### EC-V-05b — Validation Growth vintage-band
- Owner: Validation
- Status: **done** (2026-11-11)
- Output: [qa_report_economy_05_vintage_band_2026-11-11.md](../data/qa/qa_report_economy_05_vintage_band_2026-11-11.md) — **pass** (19/19); kickoff [agent-kickoff-validation-economy-05-vintage-band.md](agent-kickoff-validation-economy-05-vintage-band.md)
- Notes: Rebased indexes trusted for Revisions; rebuild pack after 12 Nov GDP re-pin.

### EC-G4-05 — Growth Gate 4 structural + Validation roll-up
- Owner: Orchestrator (+ Validation priors)
- Status: **done** (2026-11-15)
- Output: [gate4-audit-growth.md](gate4-audit-growth.md) · [qa_economy_domain05_gate4_2026-11-15.md](../data/qa/qa_economy_domain05_gate4_2026-11-15.md)
- Cleanups: Follow on Anatomy → Employment industry · Revisions → Produce; Stage Follow on all six views
- Notes: connections tests 23/23; calendar PRDY **17 Nov** remains; full Revision Archive deferred

### Review — Economy Domain 05 (complete)
- **Shipped:** Gates 2–4 · Produce · Ledger · Anatomy · Productivity · Revisions (two-vintage) · Data · Follows complete
- **Calendar:** Re-pin LZVB + LZVA after **17 Nov 2026**
- **Deferred:** Full Revision Archive · Engine output index · regional GVA
- **Next:** Wave B Tax/Spending polish · Wave C

### EC-DB-08 — Debt deep brief + elevation
- Owner: Orchestrator
- Status: **done** (2026-11-11)
- Output: Notion Domain 08 deep brief (*What Britain owes*); `/economy?domain=debt` tabs dial · borrowing · interest · data; Follows → Growth ledger/data; PSF `observation_status` fixed (latest month only provisional) + cloud reload releases 49–51 / 188; 12-month rolling sums labelled derived
- Notes: HF6X official only. Re-pin after **20 Nov** PSF.

### EC-DB-08b — Debt §7 visual refinement (approved 2026-11-12)
- Owner: Orchestrator (+ Validation for stock-flow bridge)
- Status: **done** (2026-11-14) — Cost of Debt + CG Cash to debt + Gate 4; open tail: PSF re-pin **20 Nov**
- **2026-11-14 (owner-approved):** Tab **Cash to debt** shows the **central government** cash-to-debt bridge (REC3) — `cg-cash-debt-reconciliation` loaded to Postgres (release **236**) + archived; `debt-bridge-model.ts`; Period menu (last twelve months · financial years from 2000/01); RankBars cash → named adjustments with Change in debt as the reference; 12-month-sum TimeChart; Data tab FY table. Scope stated on screen as central government; not labelled public sector. Tab order: owes · who owns · anatomy · repayment · borrowing · cash to debt · interest · data. Plain-word pass on dial / borrowing / interest labels and Notes.
- **2026-11-14 visual pass (owner-directed):** Follow lines in plain words; Data tab tiles = tables / latest month / release; Ownership groups holders under 0.5% as "Other holders"; Anatomy replaces the 4-quarter stack (three fills) with ChangeRows Q1→selected quarter, basis menu "Held outside government / All in issue", no "uplifted nominal" on screen; Repayment leads with the 10-year bars, line chart = All gilts + index-linked reference (conventional dropped), Reset hidden on views without controls; Cost of debt = one chart (12-month sum ink, month reference) matching Borrowing, Scope tile → "A year earlier" 12-month sum; Machine 12-month chart from 2010. Open: active-tab style renders blank in headless Chromium on every tab — check in Arc.
- Inputs: Notion Domain 08 §7 + §8 data work order; live `/economy?domain=debt`; cloud Ready HF6W / HF6X / DZLS / NMFX
- Tasks:
  1. **EC-DB-08b-1…3** Dial / Cost of debt / conceptual Machine — **done** (Cost of Debt: separate month + 12m panels; CG scope Notes)
  2. **EC-DB-08b-3v** PSNB→PSND sample — **done · fail** → [qa_report_economy_08_borrowing_machine_2026-11-14.md](../data/qa/qa_report_economy_08_borrowing_machine_2026-11-14.md)
  3. **EC-DB-08c** Official reconciliation evidence (Notion §8) — **done** (see below)
  4. **EC-DB-08b-4** Re-pin PSF after **20 Nov 2026**
  5. **EC-DB-08b-5** Structural audit — **done** 2026-11-14 → [gate4-audit-debt.md](gate4-audit-debt.md)
- Do not: invent residual; numeric public-sector Machine; Fiscal Balance without 06/07

### EC-DB-08c — Borrowing Machine official reconciliation evidence (Option 1)
- Owner: Economy → Validation → Orchestrator
- Status: **done** (2026-11-14) — evidence Ready; gate = CG cash/debt only; **numeric public-sector Machine deferred**
- Output:
  - Source matrix [economy-08-borrowing-machine-source-matrix.md](economy-08-borrowing-machine-source-matrix.md)
  - Decision memo [economy-08-borrowing-machine-decision-memo.md](economy-08-borrowing-machine-decision-memo.md)
  - Package `data/economy/cg-cash-debt-reconciliation/` (Appendix A + 14 REC3 CDIDs; 5343 obs)
  - Connector `economy.connectors.cg_cash_debt_reconciliation`
  - QA [qa_report_economy_08_cg_cash_debt_rec3_2026-11-14.md](../data/qa/qa_report_economy_08_cg_cash_debt_rec3_2026-11-14.md) — **pass** (disk+live pin, re-parse, identity 317/317 from 2000-04, Appendix A FY samples £0)
  - Kickoff closed: [agent-kickoff-economy-08-borrowing-machine.md](agent-kickoff-economy-08-borrowing-machine.md)
- Gate: verified **central-government** M98R+adj=MW4W only — may later name a separate CG cash/debt instrument; **not** public-sector Borrowing Machine
- Residual Orchestrator: registry row + optional cloud load for REC3; PSF re-pin 20 Nov
- Do not: UI numeric public-sector Machine; conflate with Debt Anatomy / ownership / repayment (EC-DB-08d)

### EC-V-08c — Validation REC3 CG cash/debt package
- Owner: Validation
- Status: **done · pass** (2026-11-14)
- Output: [qa_report_economy_08_cg_cash_debt_rec3_2026-11-14.md](../data/qa/qa_report_economy_08_cg_cash_debt_rec3_2026-11-14.md) · script `validation.qa_economy_08_cg_cash_debt_rec3_2026_11_14`
- Notes: Pre-2000-04 monthly gaps are official (workbook); not a connector fail. Re-run after 20 Nov PSF.

### EC-DB-08d — What Britain Owes · Debt Anatomy / Ownership / Repayment
- Owner: Economy → Validation → Orchestrator G3
- Status: **done** (2026-11-14) — G2 curated + Validation pass + cloud **231–235** + G3 UI + Gate 4
- Views: `/economy?domain=debt&view=anatomy|ownership|repayment` — [UI](0695d331-2624-4bd8-9f0f-29f837b1e77f)
- Packages: `dmo-gilts-in-issue` · `dmo-gilt-future-redemptions` · `gilt-holdings-by-sector` · `dmo-debt-portfolio-composition` · `dmo-government-holdings` (Data tab only)
- QA: `data/qa/qa_report_economy_08_dmo_d8b_d1a_2026-11-14.md` · `…_debt_ownership_2026-11-14.md`
- Gate 4: [gate4-audit-debt.md](gate4-audit-debt.md) — Follow edges + Cash to debt label + `dmo_pins` checksum share
- Open (non-blocking): registry rows; ONS CDIDs; NS&I panel; PSF re-pin **20 Nov**
- Deferred: numeric public-sector Borrowing Machine; invent totals ≠ HF6W

### EC-02-PROV — AWE observation_status fix
- Owner: Economy / Orchestrator
- Status: **done** (2026-11-11)
- Output: Offline re-curate `nominal-earnings` / `real-earnings` → latest month provisional only; cloud reload (releases 179 / 52). Fixes empty Wages charts that filtered to `final`.
- Notes: Same root cause as EC-01-PROV / Debt PSF — curated written before mark_latest applied.

### EC-02-ASHE — National Wage ladder (ASHE Table 1)
- Owner: Economy / Orchestrator
- Status: **done** (2026-11-11)
- Output: `ashe-national-earnings` from `ashetable12026provisional.zip`; connector `economy.connectors.ashe_national_earnings`; QA pass; cloud release **217**; `/economy?domain=wages&view=ladder` RankBars (All / Full-Time); Follow → Energy Jobs Pay
- Notes: Spot All median **£673.1** · Full-Time **£811.2**. UK ≠ GB AWE. Manufacturing Table 4 stays Energy. Re-pin on 2026 revised.

### EC-02-GEO — Geography of Pay (ASHE Table 7 workplace)
- Owner: Economy / Orchestrator
- Status: **done** (2026-11-11)
- Output: `ashe-regional-earnings` from `ashetable72026provisional.zip`; connector `economy.connectors.ashe_regional_earnings`; QA pass; cloud release **218**; `/economy?domain=wages&view=geography` RegionMap + RankBars (English regions) + nations RankBars; Coverage All / Full-Time; Follow → Wage ladder + Energy Jobs Pay
- Notes: Workplace ≠ residence (Table 8 deferred). Spot Full-Time UK **£811.2** · London **£1038.1**. LA rows curated for later AreaMap. Re-pin on 2026 revised.

### EC-02-ASHE-B — Wages domain data completion (ASHE extensions)
- Owner: Economy
- Status: **done · Validation PASS · Ready** (2026-11-11)
- Output (no frontend):
  1. `ashe-national-earnings` — 2026 provisional + 2025 revised; sheets All / Full-Time / Part-Time; **72** obs; cloud release **220**; QA `data/qa/qa_report_ashe_national_earnings_2026-11-11b.md`
  2. `ashe-regional-earnings` — 2026 provisional + 2025 revised workplace Table 7.1a; **1576** obs; cloud release **222**; QA `…_regional_earnings_2026-11-11b.md`
  3. `ashe-industry-earnings` **(new)** — Table 4.1a SIC sections A–U; median/mean/percentiles; All + Full-Time; both editions; **954** obs; cloud release **219**; QA `…_industry_earnings_2026-11-11.md`
  4. `ashe-region-industry-earnings` **(new)** — Table 5.1a workplace region × SIC section medians; 2026 provisional; **402** obs; cloud release **221**; QA `…_region_industry_earnings_2026-11-11.md`
- Entrypoints: `economy.connectors.ashe_national_earnings` · `ashe_regional_earnings` · `ashe_industry_earnings` · `ashe_region_industry_earnings` (+ shared `ashe_common.py`)
- Archive: Storage push `--keep-local` for all four packs under `data/economy/`
- **Manufacturing boundary:** Energy `ashe-manufacturing-earnings` remains authoritative for manufacturing Jobs Pay (section C + divisions 10–33). Economy Table 4 pack loads all sections including C for Wages — link only; do not fork Energy.
- Coverage gap: Table 5.1a has no England / NI × section cross-tabs (regions + Wales + Scotland only). Table 8 residence deferred.
- **Validation (2026-11-11):** Independent sample QA **pass** — script `src/validation/qa_economy_02_ashe_b_2026_11_11.py`; report `data/qa/qa_report_economy_02_ashe_b_2026-11-11.md`. Registry Status → **Ready** (all four). Spots: national All median 673.1/641.7; PT 288.1; FT London 1038.1/959.5; FT Manufacturing C 808.6/774.0 (= Energy); London×C 947.2.

### EC-V-02-ASHE-B — Validation ASHE-B Ready flip
- Owner: Validation
- Status: **done** (2026-11-11)
- Output: `data/qa/qa_report_economy_02_ashe_b_2026-11-11.md` · Notion Ready on national / regional / industry / region-industry
- Notes: No data edits. UI may now treat multi-year + industry series as trusted.

### EC-CTRL — Economy control-density parity (Energy frame)
- Owner: Orchestrator
- Status: **done** (2026-11-15)
- Output: Generation-style **From** / Month / **Series** menus where Ready packs already hold history; Data tabs show one full series (no 24-row truncate). Shared helper `web/src/brand/economy/series-window.ts`.
- Shipped: Debt (From + Data Series) · Inflation (From + categories Month + Data Series) · Growth (produce From via `start` + Data Series) · Wages (Data Series) · Employment (From on rates/inactive/hours/vacancies + Data Series)
- Skipped (honest): Tax/Spending prep EmptyStages; MultiMenu / ExactRegister; chart `showTable={false}` kept (Energy convention)

### Review — Economy deep-brief cycle (01 · 02 · 05 · 08)
- **Shipped:** Inflation · Wages · Growth **Gate 4 closed** ([gate4-audit-growth.md](gate4-audit-growth.md)) · Debt **Gate 4 closed** · Employment **Gate 4 closed**
- **Shipped (08):** Dial · anatomy · ownership · repayment · borrowing · **Cash to debt** · Cost of debt · Data; Follows complete; numeric PS Machine deferred
- **Shipped (05):** Produce · Ledger · Anatomy · Productivity Engine · Revisions (two-vintage) · Data; Follows complete
- **Shipped (03):** Workforce · Rates · Outside · Industry plates · Hours · Vacancies · Geography · Data
- **Shipped (control density 2026-11-15):** EC-CTRL — From / Month / Data Series across Debt · Inflation · Growth · Wages · Employment
- **Next:** Wave B Tax/Spending polish; calendar re-pins (**17 Nov** LMS + PRDY productivity · **20 Nov** PSF)
- **Still deferred:** Numeric public-sector Borrowing Machine; full Growth Revision Archive. (Employment underemployment UI + occupation closed 2026-11-15 — EC-G2-03d)
- **Blockers for user:** none — Domains 03 · 05 · 08 Gate 4 closed barring calendar re-pins

---

## Economy & Public Finance · Domain 03 Employment & Labour Market · 2026-11-14

Follow [03 · Employment & Labour Market](https://app.notion.com/p/414654717685813fb55ad2fc81cd4e4f). Kickoff: [agent-kickoff-economy-03-employment.md](agent-kickoff-economy-03-employment.md).

**Domain 03 question (provisional):** Who is in work in Britain, who is inactive, and how has the labour market changed?

**Flagship (Notion-locked):** **The British Workforce** — working-age composition (employed / unemployed / inactive). Signature second: **Outside the Workforce**.

**Status:** **complete** (2026-11-15) — Gates 2–4. Gate 4: [gate4-audit-employment.md](gate4-audit-employment.md) · Validation roll-up `data/qa/qa_economy_domain03_gate4_2026-11-15.md`.  
**Updated:** 2026-11-15  
**Orchestrator:** this chat  
**Rule:** Rates do not compose a population. Flagship uses matched official **counts**. Link Energy Jobs manufacturing — never fork. Underemployment UI deferred; EMP04 occupation labelled gap.

### EC-G2-03 — Employment Phase 0 evidence gate
- Owner: Economy → Validation → Orchestrator
- Status: **done** (Economy Phase 0, 2026-11-14) — Validation QA still open
- Inputs: Notion Domain 03 deep brief; kickoff; pins `employment-rate` (LF24) · `economic-inactivity-rate` (LF2S) last retrieved 2026-11-03 / release 2026-10-19; overlap matrix
- Output:
  1. Re-pin LF24 + LF2S vs latest LMS; provisional = latest month only
  2. Count/rate inventory (CDIDs) for employed · unemployed · inactive · economically active — same age/geo/SA basis
  3. Companion registry rows + ingest for any series required to prove flagship composition (or explicit Blocked if ONS does not publish matched counts)
  4. Gap list for Outside the Workforce · industry/occupation · hours · vacancies · geography (planned-not-ready unless scoped)
  5. Four artefacts → `docs/handover-economy-03-employment.md`; Notion plan checkboxes updated
- Do not: frontend; fork Energy manufacturing / BRES; invent rate→composition; claim claimant count = ILO unemployment
- **Economy status note (2026-11-14):**
  - Re-pinned LF24 + LF2S (`raw/2026-11-14/`); ONS release still **2026-10-19**; checksums unchanged vs 2026-11-03 pin; spots Jul 2026 (Jun–Aug) **75.3%** / **20.9%**; `observation_status` fixed to **latest month provisional only**
  - Flagship composition **proven** from matched UK 16–64 SA counts: LF2G 32,823 + LF2I 1,675 + LF2M 9,091 = 43,589 (~LF2O 43,590)
  - New indicators ingested + registry → Validation: `employment-level` (LF2G), `unemployment-level` (LF2I), `economic-inactivity-level` (LF2M), `unemployment-rate` (LF2Q, not MGSX)
  - Handover: `docs/handover-economy-03-employment.md` · Notion Domain 03 Phase 0 checkboxes + experience states updated
  - Next LMS release **17 Nov 2026** — re-pin all six after bulletin
  - **Next:** Validation task VAL-EC-03-LMS (sample QA vs A02 SA / Oct 2026 bulletin → `data/qa/`) before Ready / G3

### EC-DB-03 — Employment deep brief (Orchestrator)
- Owner: Orchestrator
- Status: **done** (Notion elevated 2026-11-14) — G3 UI still gated on Validation Ready + Review
- Output: Notion Domain 03 deep brief (six experiences · phased programme · evidence gate); kickoff refreshed
- Notes: Canvas `/economy?domain=employment` only after G2 Ready + Review + G3 authorisation

### VAL-EC-03-LMS — Validation LMS flagship set
- Owner: Validation → Orchestrator (subagent hit weekly usage limit; Orchestrator completed QA)
- Status: **done · pass** (2026-11-14)
- Inputs: [handover-economy-03-employment.md](handover-economy-03-employment.md) · kickoff [agent-kickoff-validation-economy-03-lms.md](agent-kickoff-validation-economy-03-lms.md)
- Series: LF24 · LF2S · LF2G · LF2I · LF2M · LF2Q (UK 16–64 SA; release 2026-10-19)
- Output: [qa_report_economy_03_lms_2026-11-14.md](../data/qa/qa_report_economy_03_lms_2026-11-14.md) — **50/0/0 pass**; script `validation.qa_economy_03_lms_2026_11_14`
- Notes: Bulletin confirms LF24 75.3% / LF2S 20.9%; composition 43,589 vs LF2O 43,590; LF2Q 4.9% kept distinct from bulletin 16+ 4.7%. Registry → **Ready** (all six).
- Do not: edit curated; frontend; Energy manufacturing QA as Economy

### EC-03-CLOUD — Cloud load LMS six
- Owner: Orchestrator
- Status: **done** (2026-11-14)
- Inputs: Ready packages under `data/economy/{employment,unemployment,economic-inactivity}-*/`
- Output: Supabase via `load_ready --via-rest` — releases **45–46** (rates) · **237–240** (levels + LF2Q); 666 obs each
- Notes: Production UI may read these without local files

### EC-G3-03 — The British Workforce (flagship UI)
- Owner: Orchestrator
- Status: **done** (2026-11-14)
- Output: `/economy?domain=employment` — views workforce · rates · inactive (EmptyStage) · data; `EmploymentCanvas` + `workforce-model`; pack load + Follows (Wages · Energy Jobs)
- Notes: Composition from LF2G/LF2I/LF2M only; rates tab labels denominators; GB≠UK chip in Follow honesty

### EC-G4-03 — Employment Gate 4 structural + Validation roll-up
- Owner: Orchestrator (+ Validation priors)
- Status: **done** (2026-11-15)
- Output: [gate4-audit-employment.md](gate4-audit-employment.md) · [qa_economy_domain03_gate4_2026-11-15.md](../data/qa/qa_economy_domain03_gate4_2026-11-15.md)
- Cleanups: Follow on inactive · hours · vacancies · geography; Hours Notes honesty (EMP16/YCCX Ready not drawn); `sector-pages` series list; industry specimen wall restored
- Notes: connections tests 23/23; no curated rewrites

### Review — Economy Domain 03 (complete)
- **Shipped:** Gates 2–4 · Workforce · Rates · Outside the Workforce (incl. discouraged) · Working Week · Demand · Industry (JOBS02 + plates) · Geography (HI00) · Data · Follows complete
- **Closed 2026-11-15 (EC-G2-03d):** Underemployment + involuntary part-time drawn on Working Week; occupation ingested from Nomis APS (EMP04 discontinued) and drawn on What Britain Does for Work
- **Calendar:** Re-pin LMS / HI00 / EMP16 / YCCX / APS after **17 Nov 2026**
- **Next:** Wave B Tax/Spending polish · Wave C

### EC-G2-03c — Employment labelled gaps (Economy)
- Owner: Economy → Validation → Orchestrator
- Status: **done · Ready + cloud** (2026-11-15)
- Kickoff: [agent-kickoff-economy-03-gaps.md](agent-kickoff-economy-03-gaps.md)
- Handover: [`handover-economy-03-gaps.md`](handover-economy-03-gaps.md)
- Owns: JOBS02 industry sections · underemployment · discouraged levels
- Do not: React; fork Energy manufacturing; invent discouraged from %; invent shares of DYDC; Geography atlas (Regions owns)
- **Economy status note (2026-11-15):**
  - `workforce-jobs-by-industry` — JOBS02 WFJ SA, sections A–T + total. 2026 Q2 total **36,734** (matches DYDC), manufacturing **2,460** (matches Energy JWR7). Section sum 36,733 (rounding). No shares stored.
  - `underemployment` — EMP16 NSA, aged 16+, **people** (banner says thousands; rate identity holds). Apr–Jun 2026 level **2,768,796**. No SA twin.
  - `involuntary-part-time` — YCCX, thousands SA, UK: All. Jul 2026 = **915**.
  - `inactivity-reason-discouraged` — LFL8, the INAC01 SA all-persons level. Jul 2026 = **30**. Seven reasons sum **9,090** vs LF2M **9,091**.
  - `inactivity-reason-discouraged-rate` — LF77 **0.3%**. Not a level. Do not multiply by LF2M.
  - Not ingested: EMP04 occupation (LFS people by SOC); JOBS02 employee/self-employment/NSA sheets; EMP16 overemployment; LF8B wants-a-job subset (Jul 2026 = 19).
  - Registry: five rows → Ready after Validation. Cloud releases **255–259**.

### EC-G2-03d — Occupation + Working Week UI (Economy → Validation → Orchestrator)
- Owner: Economy (ingest) · Validation (QA) · Orchestrator (G3 UI)
- Status: **done · Ready + cloud + UI** (2026-11-15)
- Handover: [handover-economy-03-occupation.md](handover-economy-03-occupation.md)
- **EMP04 is discontinued** (ONS, last edition Apr–Jun 2018). Source is the official successor: Nomis APS `NM_17_5` / `aps210`.
- `employment-by-occupation` — nine SOC 2020 major groups, UK, 16+, people + share + denominator, rolling twelve-month windows from Jan–Dec 2021. Jul 2025–Jun 2026: Professional **27.2%**, all in employment **33,470,000**. 361 rows. People, not jobs.
- Validation: [qa_report_economy_03_occupation_2026-11-15.md](../data/qa/qa_report_economy_03_occupation_2026-11-15.md) **15/0/0**. Cloud: Postgres 361 rows · archive pushed, local deleted.
- UI: Working Week — want-more-hours rate (EMP16) + part-time-could-not-find-full-time (YCCX) panels, figure strip Average hours · Part-time · Want more hours, Notes rewritten. What Britain Does for Work — occupation `RankBars` (latest final window). Data — three new series. `tsc` / `eslint` clean; headless desktop 1440 inspected vs Energy Consumption.
- Open: Notion registry row for `employment-by-occupation` (MCP cannot open the registry); SOC 2010 windows not bridged.

### RG-EMP-GEO — Geography of Employment (Regions)
- Owner: Regions → Validation → Orchestrator
- Status: **done · Regions hand-off** (2026-11-15)
- Kickoff: [agent-kickoff-regions-employment-geography.md](agent-kickoff-regions-employment-geography.md)
- Handover: [handover-regions-employment-geography.md](handover-regions-employment-geography.md)
- **Shipped:** HI00 three series · release **2026-10-20** · sha `ff374cf9…` · 5343 rows each · employment 16–64 **column fix** (was 16+ mis-parse) · ILO unemployment 16+ · inactivity 16–64

### VAL-RG-EMP-GEO — Validation HI00 regional labour
- Owner: Validation → Orchestrator (in-orchestrator)
- Status: **done · pass** (2026-11-15)
- Output: [qa_report_regions_employment_geography_2026-11-15.md](../data/qa/qa_report_regions_employment_geography_2026-11-15.md) — **59/0/0**
- Notes: NE employment **70.5** (not ~55.3); all 13 geos × 3 measures match bulletin Jun–Aug 2026; cloud releases **252–254**

### EC-G3-03-GEO — Economy Geography tab (Orchestrator)
- Owner: Orchestrator
- Status: **done** (2026-11-15)
- Output: `/economy?domain=employment&view=geography` — RankBars + ChangeRows; measure control (employment / unemployment / inactivity); Regions HI00 packs via API (no Economy fork)
- Notes: No UK/GB invent; Claimant≠ILO; Stage Follow on

### EC-VAL-03-GAPS — Validation Economy 03c packs
- Owner: Validation → Orchestrator (in-orchestrator)
- Status: **done · pass** (2026-11-15)
- Output: [qa_report_economy_03_gaps_2026-11-15.md](../data/qa/qa_report_economy_03_gaps_2026-11-15.md) — **24/0/0**
- Notes: JOBS02 total 36,734 + C 2,460; EMP16 people identity; YCCX 915; LFL8 30; LF77 0.3 not ×LF2M; seven reasons 9,090 vs LF2M 9,091

### EC-03c-CLOUD — Cloud load gap packs
- Owner: Orchestrator
- Status: **done** (2026-11-15)
- Releases: **255** discouraged · **256** discouraged-rate · **257** involuntary-part-time · **258** underemployment · **259** workforce-jobs-by-industry

### EC-G3-03-GAPS — Industry + discouraged UI
- Owner: Orchestrator
- Status: **done** (2026-11-15)
- Output: Industry RankBars (JOBS02 A–T) · Outside the Workforce includes LFL8 discouraged · Geography wired
- Deferred UI: underemployment / involuntary part-time on Working Week

### EC-G2-03b — Employment domain completion (remaining experiences)
- Owner: Economy → Validation → Orchestrator
- Status: **done** (2026-11-14)
- Kickoff: [agent-kickoff-economy-03-employment-complete.md](agent-kickoff-economy-03-employment-complete.md)
- Handover: [`handover-economy-03-employment-complete.md`](handover-economy-03-employment-complete.md)
- **Shipped:** reason levels LF63/65/67/69/6B/6D · YBUV · YCBE/YCBH · AP2Y · DYDC
- **Blocked / planned-not-ready:** discouraged levels; JOBS02 industry; underemployment; Geography
- **Link only:** Energy manufacturing / BRES

### EC-VAL-03-COMPLETE — Validation employment completion packs
- Owner: Validation → Orchestrator (in-orchestrator)
- Status: **done · pass** (2026-11-14)
- Output: [qa_report_economy_03_employment_complete_2026-11-14.md](../data/qa/qa_report_economy_03_employment_complete_2026-11-14.md) — **82/0/0**; script `validation.qa_economy_03_employment_complete_2026_11_14`
- Notes: sum reasons 9,060 vs LF2M 9,091; AP2Y 691; DYDC 36,734 Q2; FT/PT 16+ labelled

### EC-03b-CLOUD — Cloud load completion packs
- Owner: Orchestrator
- Status: **done** (2026-11-14)
- Output: releases **241–251** (hours · FT/PT · six reasons · vacancies · workforce-jobs)

### EC-G3-03b — Employment remaining experiences UI
- Owner: Orchestrator
- Status: **done** (2026-11-14)
- Output: `/economy?domain=employment` — inactive · industry · hours · vacancies · geography EmptyStage; Follow industry → Energy Jobs
- Notes: Reason RankBars + stack; FT/PT age-break in Notes; industry sections EmptyStage under workforce-jobs chart

### EC-03-CSV — Owner ONS CSV pins beside JSON
- Owner: Economy
- Status: **done** (2026-11-14)
- Inputs: six CSVs copied into `data/economy/inactivity-reason-*/raw/2026-11-14/*.csv` (LF63/65/67/69/6B/6D)
- Output: second `raw_evidence` rows + package READMEs; spot-check vs curated/JSON **pass** (no re-curate); note in `inactivity-reason-pack/reconciliation_notes.md`

---

---

## Economy & Public Finance · Domain 06 Taxation & Revenue · 2026-11-14

Follow [06 · Taxation & Revenue](https://app.notion.com/p/414654717685816bb414e87ccbd501fc). Kickoff: [agent-kickoff-economy-06-tax.md](agent-kickoff-economy-06-tax.md).

**Domain 06 question (provisional):** How does Britain raise public money, who contributes, and how has the tax system changed?

**Flagship (Notion-locked):** **What Britain Raises** — AHHY public-sector taxes + NICs. Signature concept: **The Tax Machine** (rules — not G2 UI).

**Status:** Wave B **G3 complete deepen** (2026-11-15) — `/economy?domain=tax` · Raises · Machine · Anatomy · Burden · Time Machine · Gap · Data.  
**Updated:** 2026-11-15  
**Orchestrator:** this chat  
**Rule:** AHHY ≠ HMRC cash. No invented tax/GDP. No mixing HMRC cash into ONS accruals. Tax Machine / Time Machine ≠ tax advice.

### EC-G2-06 — Taxation Phase 0 evidence gate
- Owner: Economy → Validation → Orchestrator
- Status: **done** (2026-11-14)
- Inputs: Notion Domain 06 deep brief; kickoff; pin `tax-receipts` (AHHY)
- Output: Re-pin AHHY; accounting note; breakdown inventory (no component ingest); handover [`handover-economy-06-tax.md`](handover-economy-06-tax.md)
- **Economy note:** release **2026-10-20**; spot **2026-09 = 88,127** £m NSA; 353 final + 1 provisional; next PSF **20 Nov**

### EC-VAL-06 — Validation tax-receipts (AHHY)
- Owner: Validation → Orchestrator (completed in-orchestrator after prior Validation agent usage limit)
- Status: **done · pass** (2026-11-14)
- Output: [qa_report_economy_06_tax_receipts_2026-11-14.md](../data/qa/qa_report_economy_06_tax_receipts_2026-11-14.md) — **12/0/0**; script `validation.qa_economy_06_tax_receipts_2026_11_14`
- Notes: Registry → **Ready**; cloud release **54** (354 obs)

### EC-G3-06 — What Britain Raises (flagship UI)
- Owner: Orchestrator
- Status: **done** (2026-11-14)
- Output: `/economy?domain=tax` — views raises · anatomy · machine · data; `TaxCanvas`; month + derived 12-month sum; Follows → Debt
- Notes: AHHY ≠ HMRC cash in Notes; no tax/GDP; Anatomy/Machine EmptyStage

### EC-G2-06B — Anatomy of Revenue reconcile discovery
- Owner: Economy
- Status: **done** (2026-11-15) — [Anatomy revenue discovery](29437e87-656d-4b0f-af2c-8823c478b331)
- Inputs: [handover-economy-06-tax.md](handover-economy-06-tax.md) §2.2; Notion Domain 06 Anatomy brief
- Output: [economy-06-anatomy-source-matrix.md](economy-06-anatomy-source-matrix.md) + [handover-economy-06-anatomy.md](handover-economy-06-anatomy.md); kickoff [agent-kickoff-economy-06-anatomy.md](agent-kickoff-economy-06-anatomy.md)
- **Verdict:** `path-found-ons-nab` — Appendix D heads `MF6P + AIIH + NMHM + AHGR = AHHY` (Sep 2026 spot 88,127). Prefer EmptyStage until pin task; proposed id `tax-receipts-composition`. Never HMRC cash under AHHY.
- Do not: ingest components until Orchestrator opens pin; frontend; mix frameworks
- Blockers for pin: AHGR PUSF `/data` 404 (workbook/residual); next PSF 20 Nov

### EC-G2-06C — Tax Machine statute pin (income tax + employee NICs)
- Owner: Economy → Validation
- Status: **done** (2026-11-15) — [Tax Machine statute pin](66717d30-f2ad-40d8-9d09-543e0ab79455) · Validation-ready (not Ready)
- Inputs: Notion Tax Machine brief; GOV.UK rates/allowances; Scotland separate
- Output: `data/economy/tax-machine-rules/` · id `tax-machine-income-tax-rules` · years 2025–26 + 2026–27 · E/W/NI + Scotland · [handover-economy-06-tax-machine.md](handover-economy-06-tax-machine.md)
- Self-QA: pass · sample £80k E/W/NI → IT £19,432 · NICs £3,610.60 (separate stage)
- Do not: frontend calculator; Ready without Validation; invent rates; blend NICs into income tax

### EC-VAL-06C — Validation tax-machine-income-tax-rules
- Owner: Validation
- Status: **done · pass** (2026-11-15) — [Validate Tax Machine rules](a4da3eba-f921-4097-a753-a4128c67de88) · **25/0/0**
- Inputs: [handover-economy-06-tax-machine.md](handover-economy-06-tax-machine.md); kickoff [agent-kickoff-validation-economy-06-tax-machine.md](agent-kickoff-validation-economy-06-tax-machine.md)
- Output: [qa_report_economy_06_tax_machine_2026-11-15.md](../data/qa/qa_report_economy_06_tax_machine_2026-11-15.md); script `validation.qa_economy_06_tax_machine_2026_11_15`
- Notes: Registry → **Ready** · [Tax Machine income-tax rules](https://app.notion.com/p/4196547176858125b10af2e78e4b5c6c); cloud load below

### EC-06C-CLOUD — Cloud load tax-machine-income-tax-rules
- Owner: Orchestrator
- Status: **done** (2026-11-15)
- Output: `load_ready --via-rest --only tax-machine-income-tax-rules` → release **261** · 46 observations

### EC-G4-06 — Gate 4 / polish What Britain Raises
- Owner: Orchestrator
- Status: **done** (2026-11-15)
- Inputs: live `/economy?domain=tax`; structural-consistency-audit; Anatomy + Tax Machine handovers
- Output: EmptyStage/Notes honesty polish in `TaxCanvas`; [gate4-audit-economy-06-tax.md](gate4-audit-economy-06-tax.md); [qa_economy_domain06_gate4_2026-11-15.md](../data/qa/qa_economy_domain06_gate4_2026-11-15.md)
- Notes: Anatomy EmptyStage (pin gated); Tax Machine EmptyStage until Review Gate UI; phone 390px deferred

### EC-G3-06C — Tax Machine calculator UI (Review Gate)
- Owner: Orchestrator
- Status: **done** (2026-11-15)
- Inputs: Ready `tax-machine-income-tax-rules` (cloud 261); Validated arithmetic
- Output: `/economy?domain=tax&view=machine` — tax year · place · gross presets; income-tax + employee NICs step tables; URL `ty`/`juris`/`gross`; model `tax-machine-model.ts` (API observations only)
- Notes: Educational not advice; presets ≤ £100k; Scotland labelled; stages separate; matches QA spots (£80k → IT £19,432 · NICs £3,610.60)

### EC-G2-06B-PIN — Anatomy composition pin (`tax-receipts-composition`)
- Owner: Economy → Validation → Orchestrator (UI)
- Status: **done** (2026-11-15) — [Pin Anatomy tax composition](3e23d995-ba70-4a64-8e4b-2a8ff05fc36b) · Validation-ready
- Inputs: [economy-06-anatomy-source-matrix.md](economy-06-anatomy-source-matrix.md); kickoff [agent-kickoff-economy-06-anatomy-pin.md](agent-kickoff-economy-06-anatomy-pin.md)
- Output: `data/economy/tax-receipts-composition/` · 1,509 rows · identity exact Jul/Aug/Sep 2026 · [handover-economy-06-anatomy-pin.md](handover-economy-06-anatomy-pin.md)
- AHGR: Appendix D Time Series (PUSF `/data` still 404)
- Registry: [Validation](https://app.notion.com/p/419654717685818dac2bc06033d4a01c)
- Do not: frontend; HMRC cash; JW2O as total; Ready without Validation

### EC-VAL-06B — Validation tax-receipts-composition
- Owner: Validation
- Status: **done · pass** (2026-11-15) — [Validate tax composition](a701de41-4a3e-4e97-bf74-f92845bea6ec) · **23/0/0**
- Inputs: [handover-economy-06-anatomy-pin.md](handover-economy-06-anatomy-pin.md); kickoff [agent-kickoff-validation-economy-06-anatomy.md](agent-kickoff-validation-economy-06-anatomy.md)
- Output: [qa_report_economy_06_tax_composition_2026-11-15.md](../data/qa/qa_report_economy_06_tax_composition_2026-11-15.md)
- Notes: Registry → **Ready**; identity 345 months; AHGR workbook-sourced

### EC-06B-CLOUD — Cloud load tax-receipts-composition
- Owner: Orchestrator
- Status: **done** (2026-11-15)
- Output: `load_ready --via-rest --only tax-receipts-composition` → release **262** · 1,509 observations

### EC-G3-06B — Anatomy of Revenue UI
- Owner: Orchestrator
- Status: **done** (2026-11-15)
- Output: `/economy?domain=tax&view=anatomy` — RankBars + stack history; Measure Pounds / Share; `tax-anatomy-model.ts`
- Notes: Four Appendix D heads under AHHY; not HMRC cash; AHGR may be small negative

### EC-G3-06-TABS — Notion six-experience tab rail
- Owner: Orchestrator
- Status: **done** (2026-11-15)
- Output: Tax canvas tabs match brief order — Raises · Machine · Anatomy · Burden · Time Machine · Gap · Data; last three = honest EmptyStages (Effects of taxes and benefits / rates archive / Measuring tax gaps)
- Notes: no invented distributional, historical, or gap series

### EC-G2-06D — Who Bears the Tax Burden? evidence pin
- Owner: Economy → Validation → Orchestrator (UI)
- Status: **done** (2026-11-15) — [Pin tax burden evidence](d4d53c6f-ff16-48aa-88bd-1c003255d6f3)
- Inputs: Notion §D; kickoff [agent-kickoff-economy-06-burden.md](agent-kickoff-economy-06-burden.md)
- Output: `effects-of-taxes-and-benefits` (ETB Table 8 + Table 2a FYE 2024) + [handover-economy-06-burden.md](handover-economy-06-burden.md); registry [Validation](https://app.notion.com/p/41965471768581f5a6d8f652ce533d8c)
- Do not: frontend; invent shares; fairness claims; Ready without Validation

### EC-VAL-06D — Validation effects-of-taxes-and-benefits
- Owner: Validation
- Status: **done** (2026-11-15) — [Validate tax burden pin](d0960c46-0e3d-42e5-856e-c53586293bf6) · **PASS 30/0/0**
- Inputs: [handover-economy-06-burden.md](handover-economy-06-burden.md); kickoff [agent-kickoff-validation-economy-06-burden.md](agent-kickoff-validation-economy-06-burden.md)
- Output: `data/qa/qa_report_economy_06_burden_2026-11-15.md`
- Do not: edit curated; frontend; Ready without PASS

### EC-G3-06D — Who Bears the Tax Burden? UI
- Owner: Orchestrator
- Status: **done** (2026-11-15) — Notion Ready · `load_ready` release **263** (42 obs) · RankBars live
- Inputs: Ready `effects-of-taxes-and-benefits`; `tax-burden-model.ts`; Explorer shell
- Output: `/economy?domain=tax&view=burden` · measure menu (`bm`) · published ETB denominators only
- Do not: invent direct×disposable/expenditure shares; fairness claims

### EC-G2-06E — Tax Time Machine evidence pin
- Owner: Economy → Validation → Orchestrator (UI)
- Status: **done** (2026-11-15) — Economy self-QA pass; fiscal drag deferred
- Inputs: Notion §E; Ready `tax-machine-income-tax-rules`; kickoff [agent-kickoff-economy-06-timemachine.md](agent-kickoff-economy-06-timemachine.md)
- Output: `tax-machine-income-tax-history` · `data/economy/tax-machine-income-tax-history/` · years 2010–11…2026–27 · [handover-economy-06-timemachine.md](handover-economy-06-timemachine.md) · ask `EC-VAL-06E`
- Do not: frontend; invent rates; silent Scotland=rUK

### EC-VAL-06E — Validation tax-machine-income-tax-history
- Owner: Validation
- Status: **done** (2026-11-15) — [Validate Time Machine history](bd21d3c2-d6e8-4c81-bc5a-c98054ba2011) · **PASS 64/2/0**
- Inputs: [handover-economy-06-timemachine.md](handover-economy-06-timemachine.md); kickoff [agent-kickoff-validation-economy-06-timemachine.md](agent-kickoff-validation-economy-06-timemachine.md)
- Output: [qa_report_economy_06_timemachine_2026-11-15.md](../data/qa/qa_report_economy_06_timemachine_2026-11-15.md) · script `validation.qa_economy_06_timemachine_2026_11_15`
- Notes: Scotland 2017–22 gap documented; NICs weekly×52 ≠ Ready PAYE annual PT/UEL (warn only); fiscal drag deferred
- Follow-up: Notion **Ready** · cloud release **265** (228 obs)

### EC-G3-06E — The Tax Time Machine UI
- Owner: Orchestrator
- Status: **done** (2026-11-15) — [Ship Time Machine G3 UI](1e29eddb-b240-4f8a-8d8b-089cfd22a8e6) · cloud **release_id=265**
- Inputs: Ready `tax-machine-income-tax-history` · release **265** · Explorer shell
- Output: `/economy?domain=tax&view=timemachine` live · Place / Stage / Tax year · PA + basic-upper TimeCharts · band RankBars · NICs separate stage · Scotland 2017–22 gap honest
- Do not: invent Scotland 2017–22; blend NICs into income tax; fiscal-drag calculator

### EC-G2-06F — Tax Gap evidence pin
- Owner: Economy → Validation → Orchestrator (UI)
- Status: **done** (2026-11-15) — [Pin HMRC tax gap evidence](c648ca7e-a93c-4fee-becd-538466e762aa)
- Indicator: `hmrc-tax-gap` · package `data/economy/hmrc-tax-gap/` · MTG 2026 · 2024–25 headline £59.2bn / 6.4%
- Registry: [Ready](https://app.notion.com/p/41965471768581969367c87a93f92f58)
- Inputs: Notion §F; kickoff [agent-kickoff-economy-06-tax-gap.md](agent-kickoff-economy-06-tax-gap.md)
- Output: HMRC Measuring tax gaps pin + [handover-economy-06-tax-gap.md](handover-economy-06-tax-gap.md)
- Do not: frontend; equate gap with fraud; invent components; Ready without Validation

### EC-VAL-06F — Validation hmrc-tax-gap
- Owner: Validation
- Status: **done** (2026-11-15) — [Validate HMRC tax gap pin](dfa99a9c-fe24-441f-bb22-76f0049532ed) · **PASS 32/0/0**
- Inputs: [handover-economy-06-tax-gap.md](handover-economy-06-tax-gap.md); kickoff [agent-kickoff-validation-economy-06-tax-gap.md](agent-kickoff-validation-economy-06-tax-gap.md)
- Output: `data/qa/qa_report_economy_06_tax_gap_2026-11-15.md`
- Do not: edit curated; frontend; Ready without PASS

### EC-G3-06F — The Tax Gap UI
- Owner: Orchestrator
- Status: **done** (2026-11-15) — [Ship Tax Gap G3 UI](d467f22d-2c14-4203-85a9-dae5af094e31) · cloud **release_id=264**
- Inputs: Ready `hmrc-tax-gap`; QA PASS 32/0/0; Explorer shell
- Output: `/economy?domain=tax&view=gap` live · by tax / by behaviour / history · gap ≠ fraud Notes
- Do not: invent components; equate gap with fraud

### EC-G2-06E-SCOT — Scotland income-tax bands 2017–18…2022–23
- Owner: Economy → Validation → Orchestrator (UI refresh)
- Status: **done** (2026-11-15) — Validation **PASS** 77/0/0; Orchestrator may re-load cloud + refresh Time Machine gap copy
- Inputs: Ready `tax-machine-income-tax-history`; kickoff [agent-kickoff-economy-06-scotland-bands.md](agent-kickoff-economy-06-scotland-bands.md)
- Output: Scotland 2017–18…2022–23 pinned (`pinned_govscot_hmrc_sit`); [handover-economy-06-scotland-bands.md](handover-economy-06-scotland-bands.md)
- Do not: invent bands; copy E/W/NI; frontend; Ready without Validation
- Validation: **`EC-VAL-06E-SCOT`** PASS

### EC-VAL-06E-SCOT — Validation Scotland 2017–22 bands
- Owner: Validation
- Status: **done** (2026-11-15) — **PASS** 77/0/0; Ready recommendation **yes** (cloud re-load + gap-copy refresh)
- Inputs: [handover-economy-06-scotland-bands.md](handover-economy-06-scotland-bands.md); kickoff [agent-kickoff-validation-economy-06-scotland-bands.md](agent-kickoff-validation-economy-06-scotland-bands.md)
- Output: [qa_report_economy_06_scotland_bands_2026-11-15.md](../data/qa/qa_report_economy_06_scotland_bands_2026-11-15.md) · script `validation.qa_economy_06_scotland_bands_2026_11_15`
- Years checked: 2018–19, 2020–21, 2022–23 (primary) + 2017–18, 2019–20, 2021–22
- Blockers: none; fiscal drag still deferred; Notion Ready / UI = Orchestrator
- Do not: silently rewrite curated bands; flip Ready without Orchestrator

### EC-G2-06B-DRILL — Anatomy CG drill under MF6P
- Owner: Economy → Validation → Orchestrator (UI)
- Status: **done** (2026-11-15) — Economy pin + Validation **PASS**; Ready flip / cloud / UI = Orchestrator
- Inputs: [economy-06-anatomy-source-matrix.md](economy-06-anatomy-source-matrix.md); kickoff [agent-kickoff-economy-06-anatomy-cg-drill.md](agent-kickoff-economy-06-anatomy-cg-drill.md)
- Output: `data/economy/tax-receipts-cg-composition/` · 1,113 rows · identity exact Jul/Aug/Sep 2026 (354 months) · [handover-economy-06-anatomy-cg-drill.md](handover-economy-06-anatomy-cg-drill.md) · registry [Validation](https://app.notion.com/p/41965471768581ceb258cd766de891cb)
- Do not: HMRC cash under AHHY; rewrite four-head Ready package; frontend; Ready without Validation

### EC-VAL-06B-DRILL — Validation tax-receipts-cg-composition
- Owner: Validation
- Status: **done** (2026-11-15) — **PASS** 25/0/0; Ready recommendation **yes**
- Inputs: [handover-economy-06-anatomy-cg-drill.md](handover-economy-06-anatomy-cg-drill.md); kickoff [agent-kickoff-validation-economy-06-anatomy-cg-drill.md](agent-kickoff-validation-economy-06-anatomy-cg-drill.md)
- Output: [qa_report_economy_06_tax_cg_composition_2026-11-15.md](../data/qa/qa_report_economy_06_tax_cg_composition_2026-11-15.md) · script `validation.qa_economy_06_tax_cg_composition_2026_11_15`
- Checks: V1 identity NMBY+NMCU+LIQR=MF6P **354** months exact; V2 leaves vs PUSF+workbook; V3 MF6P vs Ready composition **0** mismatches; V4 accruals caveats; V5 no HMRC cash / LIBR·NZGF·CPRN deferred
- Blockers: none for Ready (calendar re-pin after **20 Nov 2026** PSF)
- Follow-up: Notion **Ready** · cloud release **266** (1,113 obs)

### EC-G3-06B-DRILL — Anatomy CG drill UI
- Owner: Orchestrator
- Status: **done** (2026-11-15) — Level `al` AHHY heads vs CG under MF6P; release **266** confirmed (1,113 obs)
- Inputs: Ready `tax-receipts-cg-composition` · release **266** · existing Anatomy tab
- Output: `/economy?domain=tax&view=anatomy&al=cg` — RankBars + stack; `taxCgComposition` in TaxPack; `anatomyCg*` in `tax-anatomy-model.ts`
- Do not: invent LIBR/NZGF/CPRN; HMRC cash; rewrite four-head AHHY package

### EC-G3-06E-SCOT — Time Machine UI refresh (Scotland 2017–22)
- Owner: Orchestrator
- Status: **done** (2026-11-15) — cloud history **262** obs (release **265** upsert); removed hardcoded `SCOTLAND_GAP_YEARS`
- Output: Scotland 2017–22 selectable from pinned data; Notes no longer call those years a gap

### EC-G2-06E-DRAG — Fiscal drag examples
- Owner: Economy → Validation → Orchestrator (UI)
- Status: **done** (2026-11-15) — Economy self-QA **pass** 10/10; `fiscal_drag_status.json` → **documented**
- Inputs: kickoff [agent-kickoff-economy-06-fiscal-drag.md](agent-kickoff-economy-06-fiscal-drag.md); ONS **AWE KAI7** (EMP release 2026-10-19)
- Output: `curated/fiscal_drag_examples.json` (3 profiles) + `awe_kai7_tax_year.csv` + raw `kai7_emp.json`; [handover-economy-06-fiscal-drag.md](handover-economy-06-fiscal-drag.md)
- Earnings path: tax-year mean KAI7 ×52, **2021–22…2025–26**; Scotland 2017–22 bands **unchanged**
- Do not: invent wage growth; frontend calculator; Ready flip by Economy
- Validation: **`EC-VAL-06E-DRAG`** **done** (PASS 16/1/0)

### EC-VAL-06E-DRAG — Validation fiscal-drag examples
- Owner: Validation
- Status: **done** (2026-11-15) — PASS **16 pass / 1 warn / 0 fail**
- Inputs: [handover-economy-06-fiscal-drag.md](handover-economy-06-fiscal-drag.md); kickoff [agent-kickoff-validation-economy-06-fiscal-drag.md](agent-kickoff-validation-economy-06-fiscal-drag.md)
- Output: [qa_report_economy_06_fiscal_drag_2026-11-15.md](../data/qa/qa_report_economy_06_fiscal_drag_2026-11-15.md); script `validation.qa_economy_06_fiscal_drag_2026_11_15`
- Findings: KAI7 checksum + tax-year ×52 match; E/W/NI liability + KAI7-indexed counterfactual recompute; Scotland uses Scottish bands; 2017–22 fingerprint `c3ab0cbf…8f1a` unchanged; status=`documented` / `ready=false`
- Warn (non-blocking): package `manifest.yaml` `transformations` has unquoted colon — `yaml.safe_load` fails (owner: Economy quote-fix optional)
- UI recommendation: Orchestrator **may** ship Time Machine fiscal-drag overlay (educational caveats); do **not** flip Registry Ready for fiscal-drag alone
- Do not: rewrite curated bands; frontend by Validation; Ready without Orchestrator

### EC-G3-06E-DRAG — Tax Time Machine fiscal-drag overlay UI
- Owner: Orchestrator
- Status: **done** (2026-11-15) — [Ship fiscal drag Time Machine UI](dff17af1-9614-4918-bcd7-c88ab79d740c)
- Inputs: Validation PASS 16/1/0; pack `economy.tax-fiscal-drag` (Storage archived); Explorer shell
- Output: `/economy?domain=tax&view=timemachine&ts=income-tax&tf=fiscal-drag` · Focus + Profile menus · effective rate + tax £ TimeCharts · E/W/NI extra-tax panel · Notes cite ONS KAI7 (not deferred)
- Honesty: educational only; 3 JSON profiles only; Scotland = actual bands (no freeze); NICs excluded
- Do not: flip Notion Registry Ready for fiscal-drag alone; rewrite Scotland bands / Burden / Gap / Anatomy

### Review — Economy Domain 06 (complete deepen)
- **Shipped:** AHHY flagship + Gate 4; Tax Machine; Anatomy (+ **CG drill G3**, cloud **266**); **Burden G3** (cloud **263**); **Tax Gap G3** (cloud **264**); **Time Machine G3** (cloud **265**, PASS 64/2/0) + **fiscal-drag overlay G3** (pack `economy.tax-fiscal-drag`, status `documented`)
- **Scotland 2017–22:** Validation PASS 77/0/0 · cloud **262** obs · Time Machine UI gap hardcode removed
- **Fiscal drag:** Validation PASS 16/1/0 · pack archived · **EC-G3-06E-DRAG done** — Frozen thresholds focus on Time Machine; **no** Registry Ready flip for drag alone
- **Calendar:** re-pin AHHY + composition (+ CG drill) after **20 Nov 2026** PSF; AWE KAI7 next release **17 Nov 2026**

---

## Economy & Public Finance · Domain 07 Public Spending & Services · 2026-11-14

Follow [07 · Public Spending & Services](https://app.notion.com/p/41465471768581df9c9ad184839231b7). Kickoff: [agent-kickoff-economy-07-spending.md](agent-kickoff-economy-07-spending.md).

**Domain 07 question (provisional):** What does the state spend, and where does managed expenditure go?

**Flagship (planned):** **What the state spends** — EBFT Total Managed Expenditure. Function breakdowns planned-not-ready until OSCAR/COFOG sourced.

**Status:** Wave B **G3 live** (2026-11-14) — `/economy?domain=spending` · What the state spends + Function/DEL·AME EmptyStages + Data.  
**Updated:** 2026-11-14  
**Orchestrator:** this chat  
**Rule:** No invented function shares. No residual identity with Tax or Debt. TME ≠ services delivered without a labelled gap.

### EC-G2-07 — Spending Phase 0 evidence gate
- Owner: Economy → Validation → Orchestrator
- Status: **done** (2026-11-14)
- Inputs: Notion Domain 07 stub; kickoff; pin `total-managed-expenditure` (EBFT)
- Output: Re-pin EBFT; accounting note; OSCAR/COFOG inventory (no component ingest); handover [`handover-economy-07-spending.md`](handover-economy-07-spending.md)
- **Economy note:** release **2026-10-20**; spot **2026-09 = 123,791** £m NSA; 353 final + 1 provisional; next PSF **20 Nov**; raw sha `2669443f…` (unchanged vs 2026-11-03 vintage)
- Do not: frontend; invent COFOG shares; residual Tax−Spend=Borrow charts

### EC-VAL-07 — Validation total-managed-expenditure (EBFT)
- Owner: Validation → Orchestrator (completed in-orchestrator after prior Validation agent usage limit)
- Status: **done · pass** (2026-11-14)
- Inputs: [`handover-economy-07-spending.md`](handover-economy-07-spending.md); `data/economy/total-managed-expenditure/`
- Output: [qa_report_economy_07_tme_2026-11-14.md](../data/qa/qa_report_economy_07_tme_2026-11-14.md) — **17/0/0**; script `validation.qa_economy_07_tme_2026_11_14`
- Notes: Registry **Ready** confirmed; cloud release **55** (354 obs). Spots 1997-04 / 2012-01 / 2026-08 / 2026-09 match raw JSON; provisional = latest only.
- Do not: edit curated; frontend; invent COFOG / residual identities

### EC-07-CLOUD — Cloud load TME
- Owner: Orchestrator
- Status: **done** (2026-11-14)
- Output: `load_ready --via-rest` → release **55** · 354 observations

### EC-G3-07 — What the state spends (flagship UI)
- Owner: Orchestrator
- Status: **done** (2026-11-14)
- Output: `/economy?domain=spending` — views spends · function · delame · data; `SpendingCanvas`; month + derived 12-month sum; Follows → Tax (primary) · Debt (registry)
- Notes: TME ≠ OSCAR/TES/COFOG in Notes; no residual Tax−Spend=Borrow; Function/DEL·AME EmptyStage

### Review — Economy Domain 07
- **Shipped:** EBFT Ready + cloud + G3 *What the state spends*
- **EmptyStage:** Where spending goes · DEL and AME (real-terms gap in Notes)
- **Calendar:** Re-pin after **20 Nov 2026** PSF
- **Next:** Wave B deepen — Function / DEL·AME source discovery (opened 2026-11-15)

### EC-G2-07B — Function / DEL·AME source discovery
- Owner: Economy ([Economy function discovery](5a77541a-a50c-41f5-9b26-933a43fb2ddd))
- Status: **done** (2026-11-15)
- Inputs: [handover-economy-07-spending.md](handover-economy-07-spending.md) §2.2–2.3; kickoff [agent-kickoff-economy-07-function.md](agent-kickoff-economy-07-function.md)
- Output: [economy-07-spending-source-matrix.md](economy-07-spending-source-matrix.md) + [handover-economy-07-function.md](handover-economy-07-function.md); Notion Domain 07 deepen notes
- **Verdict:** Function **`path-found-tes-cofog`** (PSS/PESA Table 5.4); DEL·AME **`path-found-pss-table-1-1`** (Table 1.1). Spot Health 2024-25 = **242,429** £m; DEL+Dept AME+Other AME = table TME **1,290,012**. Neither is a split of monthly EBFT (FY sum gap ~£4.8bn in 2024-25). OSCAR / ESA / real-terms monthly deferred.
- Do not: frontend; invent EBFT shares; residual Tax−Spend=Borrow; equate TME with services without a labelled gap

### EC-G2-07B-PIN — Function / DEL·AME pin
- Owner: Economy ([Economy function pin](b0c42301-14e2-436d-a04a-a168bb1dff79))
- Status: **done** (2026-11-15) — Validation-ready (not Ready)
- Inputs: matrix + [handover-economy-07-function.md](handover-economy-07-function.md); kickoff [agent-kickoff-economy-07-function-pin.md](agent-kickoff-economy-07-function-pin.md)
- Output: `data/economy/tes-by-function/` (140 rows) · `data/economy/tme-del-ame/` (20 rows) · connectors · [handover-economy-07-function-pin.md](handover-economy-07-function-pin.md)
- Spots: Health 2024-25 **242,429**; DEL+Dept AME+Other AME = table TME **1,290,012**; raw sha match discovery
- Registry: [TES](https://app.notion.com/p/41965471768581c5a15bea3cca34d474) · [DEL/AME](https://app.notion.com/p/419654717685815dbb3de6db75d6a00d) — **Validation**
- Do not: frontend; rescale onto EBFT; Ready without Validation

### EC-VAL-07B — Validation function / DEL·AME pins
- Owner: Validation ([Validate Economy 07 pins](8a31c479-8ef4-41e0-a765-58020201bac2))
- Status: **done · pass** (2026-11-15) — **7 pass / 1 warn / 0 fail**
- Inputs: [handover-economy-07-function-pin.md](handover-economy-07-function-pin.md); kickoff [agent-kickoff-validation-economy-07-function.md](agent-kickoff-validation-economy-07-function.md)
- Output: [qa_report_economy_07_function_delame_2026-11-15.md](../data/qa/qa_report_economy_07_function_delame_2026-11-15.md); script `validation.qa_economy_07_function_delame_2026_11_15`
- Notes: Warn = documented 2023-24 £1m TES rounding; EBFT FY gap context only. Registry → **Ready** (Orchestrator)

### EC-07B-CLOUD — Cloud load tes-by-function + tme-del-ame
- Owner: Orchestrator
- Status: **done** (2026-11-15)
- Output: `load_ready --via-rest` → `tes-by-function` release **267** (140 obs) · `tme-del-ame` release **268** (20 obs)

### EC-G3-07B — Function / DEL·AME UI
- Owner: Orchestrator
- Status: **done** (2026-11-15)
- Output: `/economy?domain=spending&view=function|delame` — RankBars + history; Measure Pounds/Share; FY menu; Data tables; model `spending-function-model.ts`
- Notes: TES/COFOG ≠ monthly EBFT; Other AME kept; no residual function; Notes cover services↔table-TME bridge

### Review — Economy Domain 07 (deepen)
- **Shipped:** EBFT flagship; `tes-by-function` + `tme-del-ame` Ready · cloud **267**/**268** · G3 Function + DEL·AME
- **Warn:** 2023-24 £1m TES rounding (published cells kept)
- **Calendar:** re-pin EBFT after **20 Nov 2026** PSF; next PSS cycle Nov/Feb/Apr
- **Next:** none for real terms / services — see Review below
- **Still deferred:** ESA Table 11; OSCAR; Table 4.2 as its own pin; Gate 4

### EC-G2-07C-PIN — Real terms pin (Tables 1.2 + 4.3)
- Owner: Economy
- Status: **done** (2026-11-15) — Validation-ready (not Ready)
- Inputs: [economy-07-spending-source-matrix.md](economy-07-spending-source-matrix.md) §E; kickoff [agent-kickoff-economy-07-real-pin.md](agent-kickoff-economy-07-real-pin.md)
- Output: `data/economy/tme-del-ame-real/` (20 rows) · `data/economy/tes-by-function-real/` (322 rows) · [handover-economy-07-real-pin.md](handover-economy-07-real-pin.md)
- Spots: Table 1.2 resource DEL 2025-26 **496,670** (equals nominal); Table 4.3 Health 2024-25 **250.8** £bn (Table 4.2 companion 242.4, not curated)
- Registry: [real DEL/AME](https://app.notion.com/p/419654717685815ba4c7d9d669dd661b) · [real TES](https://app.notion.com/p/4196547176858116bd53d358fb541942) — **Validation**
- Do not: frontend; deflate monthly EBFT; plan years; Ready without `EC-VAL-07C`

### EC-VAL-07C — Validation real-terms pins
- Owner: Validation ([Validate Economy 07 real](47dff7d3-163a-47cf-a25b-dfd065a318df))
- Status: **done · pass** (2026-11-15) — **8 pass / 0 warn / 0 fail**
- Inputs: [handover-economy-07-real-pin.md](handover-economy-07-real-pin.md); kickoff [agent-kickoff-validation-economy-07-real.md](agent-kickoff-validation-economy-07-real.md)
- Output: [qa_report_economy_07_real_2026-11-15.md](../data/qa/qa_report_economy_07_real_2026-11-15.md); script `validation.qa_economy_07_real_2026_11_15`
- Notes: Registry → **Ready** (Orchestrator)

### EC-07C-CLOUD — Cloud load real-terms pins
- Owner: Orchestrator
- Status: **done** (2026-11-15)
- Output: `tme-del-ame-real` release **269** (20) · `tes-by-function-real` release **270** (322)

### EC-G3-07C — Real terms UI + Services narrative
- Owner: Orchestrator
- Status: **done** (2026-11-15)
- Output: `/economy?domain=spending&view=real` (Instrument DEL·AME / Functions) · `view=services` (TES↔adjustments↔table TME bridge)
- Notes: 2025-26 prices labelled; not monthly EBFT; Services uses nominal `tes-by-function` bridge rows

### Review — Economy Domain 07 (real terms + services)
- **Shipped:** Real terms Ready · cloud **269**/**270** · G3 Real + Services narrative
- **Still deferred:** ESA Table 11; OSCAR; Table 4.2 nominal long-run companion; Gate 4
- **Calendar:** re-pin EBFT after **20 Nov 2026** PSF


## Review — BX-BACK-001 Price Paid search · 2026-11-15

- **Shipped:** Pro Postgres already live; table was still empty. Restored `pp-2025.csv` from Storage, loaded **992 278** rows (~323 MB). Meta `available: true`; sample search OX28 returns sales.
- **Blocked:** none
- **Next:** hard-refresh Housing › Prices › Transactions; Railway API already points at the same Supabase DB so no redeploy needed for data

## Cross-sector · Terms registry and `Term` marker · 2026-11-14

Decided with owner 2026-11-14. Pages read as if written for people who already know the data. Fix in two layers: expand bare acronyms in copy, and a shared "i" marker that opens a plain definition. Sector by sector, Housing first; the glossary is derived from each sector's real copy, not written in the abstract. Seed: `docs/glossary-seed-housing.md`.

### GLOSS-01 — Terms registry (Orchestrator) — done 2026-11-14

- `data/glossary/terms.yaml`: slug, short, full name, one-sentence plain definition, longer note (optional), sector, related indicator ids, source URL. Shipped: migration `008_glossary_terms.sql`, loader `britain_exchange.glossary`, 77 rows loaded to Supabase.
- Postgres table `glossary_terms` loaded by `src/britain_exchange/` loader; local YAML is connector pin only (cloud rule).
- API: `GET /glossary` (all, by sector) and `GET /glossary/{slug}`.
- Indicator manifests may list `terms: [slug]`.
- Seed from the Housing table; Validation checks each definition against the publisher's own wording.

### GLOSS-02 — `Term` primitive and glossary page (Orchestrator, `web/src/brand/`) — done 2026-11-14

- One component `<Term slug>children</Term>`: small mono "i" in a hairline circle after the term, ink only, no underline on the text. Opens a paper popover on click or keyboard focus (not hover only): short form, full name, one sentence, "More" link. Popover reuses existing disclosure and panel styles.
- Allowed in labels, menus, figure strip, stage meta, Notes foot. Never inside a plot. First occurrence per stage only.
- Rule: more than three markers on one stage means the copy is wrong; send it back to the copy pass.
- "Terms" row inside the existing Sources & notes disclosure listing terms used on that stage. No separate "How to read" section; the one-Notes-foot rule stands.
- `/glossary` page listing terms by sector; footer link; terms included in search alongside indicators.

### GLOSS-03-HOUSING — Housing copy pass (Housing, with Orchestrator review) — first pass done 2026-11-14; owner review of placements pending

- Expand the bare labels listed at the end of `docs/glossary-seed-housing.md`.
- Place `Term` markers on first occurrences across the nine Housing domains.
- No new notes blocks; definitions come from the registry only.
- Then repeat for Energy (GLOSS-03-ENERGY) and Economy (GLOSS-03-ECONOMY), each deriving its own seed first.
