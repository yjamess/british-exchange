# British Exchange — Work plan

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
   - **Deferred (Free-tier):** Recorded-sales search (`price-paid-2025`, ~900k rows) not loaded into Postgres. HPI sales-volume chart stays. Tracked as BX-BACK-001 on [Notion — Cross-sector backlog](https://app.notion.com/p/41465471768581a5bef6d539d77dad53).
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
