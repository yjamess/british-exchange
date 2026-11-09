# British Exchange — Work plan

## Energy & Industry · Domain 01 Electricity Generation · 2026-11-06

Follow [Energy & Industry](https://app.notion.com/p/40d6547176858194bc18cec7be0a812d) and [Electricity Generation domain brief](https://app.notion.com/p/410654717685812d9babc01e2f053c63). Kickoff: [agent-kickoff-generation.md](agent-kickoff-generation.md).

**Domain 01 question (locked):** How did Britain move from coal-fired electricity to today's generation mix, what does that change actually mean, and what connects power generation to the rest of the country?

**Status:** **Gate 3 tranche B complete (2026-11-07) — ingest + Validation → Ready.** Next: UI wire / Gate 4 audits per domain; DNO stays Blocked.  
**Updated:** 2026-11-07  
**Orchestrator:** this chat  
**Rule:** Notion Gate 2 = named flagship + Ready evidence + one journey — not a recycled line-chart shell. Gate 1 composition studies required before locking UI.

1. **Done — Domain 01–10 Gate 2** · deepen wave complete
2. **Done — Gate 3 tranche A** · stations Ready · gas Dissected Bill layers (2.3.4)
3. **Done — G3B-00 source discovery** · `data/energy/gate3-source-discovery/`
4. **Done — Gate 3 gated** · Ofgem+CPIH Ready · NSTA licence · DNO Blocked note
5. **Done — Gate 3 tranche B** · Imports · IoP/BRES · REPD/TEC/5.10 · NSTA spatial — all Ready
6. **In progress — UI / UX pass** · Generation history + map (Housing pan/zoom; Notes/Data grammar); then mirror across Energy domains
7. **Next — Gate 4** · structural audits domain-by-domain after UX grammar settles
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
- Status: done
- Output: `data/qa/qa_energy_domain01_gate4_2026-11-06.md` (13/13 pass)
- Notes: deferred polish shipped as E03d

### Review — Energy Domain 01 (complete)
- **Shipped:** Gates 1–4; Station atlas (REPD + DUKES 5.11); six explorer views
- **Blocked:** none for stations ingest — Validation QA **pass** 2026-11-07 (`qa_report_uk_power_stations_dukes_2026-11-07.md`) → Ready
- **Next:** Domain 02 Gate 1 (ECUK tables + taxonomy + Metabolism prototypes)

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

**Status:** Flagship deepen **shipped** (2026-11-07) — Study C receipt. Receipt UX pass **shipped** (2026-11-07) — hover detail, lean bill menus, no Data tab / HTML table. Domain **not** complete — remaining Gate 3/4 gaps below.

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

### Review — Energy Domain 03 (flagship deepen)
- **Shipped:** Study C Dissected Bill; Two British Energy Economies; gas bill total; Follow → Consumption; unit/standing Ready
- **Shipped (P05):** Ofgem cap panel; CPIH real memo; Cost Shock index; Regional Price Anatomy RankBars
- **Shipped (P06):** Receipt hover detail; lean bill menus; catalogue via pane / Notes only
- **Blocked:** none for this Gate 3 UI slice
- **Still open (do not mark Domain 03 complete):** full Ofgem history / Annex 9 regional rates polish; Economy 7 layers; Gate 4 audit; editorial essay
- **Gate 3 shipped:** gas layers QEP 2.3.4 (`domestic-gas-unit-standing`) + Dissected Bill gas receipt + P05/P06 UI wire
- **Next:** Gate 4 structural + a11y audit for Domain 03

---

## Energy & Industry · Domain 04 Oil, Gas & Fossil Fuels · 2026-11-07

Follow [Oil, Gas & Fossil Fuels](https://app.notion.com/p/410654717685815db976d589af8be69f). Kickoff: [agent-kickoff-fossils.md](agent-kickoff-fossils.md).

**Domain 04 question (locked):** Where did Britain's fossil fuels come from, what was extracted, and how did domestic production change?

**Status:** **Flagship + supporting views shipped** (2026-11-07 evening; UX harden 2026-11-07 night; Gap dependency de-duplicated 2026-11-08) — North Sea fields · Extraction Century (fuels folded in; gas in bcm) · Production Gap (shared years, leaders, Follow → Imports Resilience) · What's left (year + split charts). Gate 4 audit still open.

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

### Review — Energy Domain 04 (flagship deepen)
- **Shipped:** True flagship atlas + supporting experiences (gap · reserves · extraction) + coal Mt wire-in + PPRS + reserves ingest; Closure Register folded into North Sea Status = ceased; Gap no longer duplicates the Imports dependency TimeChart
- **Still open:** Gate 4 structural audit; BGS coalfields; NSTA wells/NDR; DUKES F.1 NGL detail; editorial North Sea essay
- **Unit lock:** Mt · bcm · Mtoe · % labelled separately; Fossils gas bcm conversion is display-only (Imports gas stays GWh)
- **Next:** Gate 4 audit when UX grammar settles across Energy

---

## Energy & Industry · Domain 05 Energy Imports & Security · 2026-11-07

Follow [Energy Imports & Security](https://app.notion.com/p/410654717685813f8062c65191f6c0bb). Kickoff: [agent-kickoff-imports.md](agent-kickoff-imports.md).

**Domain 05 question (locked):** Where does Britain's imported energy enter the system, how has reliance changed, and what does resilience actually mean?

**Status:** Domain 05 Gate 3 supporting set **complete** (2026-11-08) — Lifelines (Oil/Gas **world choropleth** + top-10/`list=all` RankBars + history; LNG RankBars until coords) · Resilience (+ gas storage + ratio-beside-gross) · Shock · Connectors · trade · Data. **Dependency Dial retired** (`?view=dependency` → resilience). Residual: Study B fake routes rejected; LNG map pins deferred; Gate 4 audit.

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

### Review — Energy Domain 05 (Gate 3 complete)
- **Shipped:** Lifelines Map (country choropleth Oil/Gas + ranks); Resilience Test (ratios + ratio-beside-gross + gas storage); Shock & Response (Decision Ledger); Connectors (RankBars + ExactRegister); gross trade; Data (observation tables). Dial retired.
- **Still open:** Gate 4 audit; optional 4.4b site register; LNG map pins (`data/energy/lng-terminal-geo/` draft — 3 harbour NtM pins; Teesside blocked; RankBars until Ready); Study B fake routes stay rejected
- **Honesty:** measured country choropleth + named LNG terminals — not landfalls or shipping arrows; Resilience ≠ single score; events ≠ causes; capacity MW ≠ flow GWh; stock GWh ≠ ratios; publisher-native units (kt · GWh · MW · % · Mtoe) never on one unmarked axis; no parallel Exact figures echo tables
- **Cross-domain:** Fossils Production Gap keeps a one-year dependency figure + Follow links; full dependency chart lives only on Imports › Resilience

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

**Status:** Interim deepen **shipped** (2026-11-07) — Study C Border anatomy. Notion true flagship **Invisible Grid** blocked (no Ready topology / spare capacity forbidden).

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

### Review — Energy Domain 07 (interim deepen)
- **Shipped:** Study C border anatomy; Britain After Dark lite; Data; Follow → Imports / Generation / Renewables
- **Blocked for true flagship:** topology map; constraint £; connection queue; DNO geospatial
- **Next sector deepen:** Manufacturing (done below)

---

## Energy & Industry · Domain 08 Manufacturing · 2026-11-07

Follow [Manufacturing](https://app.notion.com/p/41065471768581afa032dec7299a7cfb). Kickoff: [agent-kickoff-manufacturing.md](agent-kickoff-manufacturing.md).

**Domain 08 question (locked):** What does Britain manufacture today, how has the composition of output changed, and where does production take place?

**Status:** Interim deepen **shipped** (2026-11-07) — Study C national Anatomy card. Full subsector Production Anatomy deferred.

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

### Review — Energy Domain 08 (interim deepen)
- **Shipped:** Study C Anatomy card; Output vs Jobs; Data; Follow → Jobs / Prices / Consumption
- **Blocked for true flagship:** subsector IoP catalogue; regional atlas; product ledger
- **Next sector deepen:** Domain 09 Jobs & Productivity (done below)

---

## Energy & Industry · Domain 09 Jobs & Productivity · 2026-11-07

Follow [Jobs & Productivity](https://app.notion.com/p/4106547176858136acd8c6d6369fa87e). Kickoff: [agent-kickoff-jobs.md](agent-kickoff-jobs.md).

**Domain 09 question (locked):** Where did industrial employment change, how did output per worker or hour change, and who experienced those changes?

**Status:** Interim deepen **shipped** (2026-11-07) — Study C national Labour Landscape. True place atlas deferred (BRES).

### J01 — Ready trio inventory
- Owner: Energy → Validation
- Status: done
- Output: employment · output index · output-per-hour Ready; reuse map under `data/energy/jobs-productivity/`

### J02 — Gate 1 composition
- Owner: Orchestrator
- Status: done
- Output: `data/energy/jobs-productivity/GATE1_COMPOSITION.md` — Study C locked interim

### J03 — Labour Landscape + Productivity Machine (Study C)
- Owner: Orchestrator (UI)
- Status: done
- Output: `/energy?domain=industrial-work` · jobs/volume/productivity ledger · paired charts · formula panel · Data
- Files: `JobsCanvas.tsx` · `jobs-model.ts` · Energy wiring (reuses Manufacturing pack — no fork)
- Notes: never IoP÷jobs; GB/UK N/A (UK national); Atlas / Lives / earnings Gate 3

### Review — Energy Domain 09 (interim deepen)
- **Shipped:** Study C national Labour Landscape; Productivity Machine; Data; Follow → Manufacturing / Consumption / Policy
- **Blocked for true flagship:** BRES Employment Atlas; Industrial Lives; ASHE; hours component series
- **Next sector deepen:** Domain 10 Industrial Policy (done below)

---

## Energy & Industry · Domain 10 Industrial Policy · 2026-11-07

Follow [Industrial Policy](https://app.notion.com/p/41065471768581dca8fbf13058c8dce5). Kickoff: [agent-kickoff-industrial-policy.md](agent-kickoff-industrial-policy.md).

**Domain 10 question (locked):** Which public decisions, incentives, institutions and investments shaped Britain's energy and industrial trajectory, and what can the evidence actually establish?

**Status:** Gate 2 **shipped** (2026-11-07) — Study C expandable Decision Ledger. Promise vs Outcome deferred.

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
- **Blocked / Gate 3:** Promise vs Outcome; full commencement SIs; business-investment spark; Counterfactual Desk
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
- Status: blocked (documented)
- Output: `data/energy/power-networks/DNO_TOPOLOGY_BLOCKED.md`
- Notes: No national open topology. Unblock only with partner GIS, single-DNO pilot, or keep Border anatomy interim.

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
- **Needs you only if:** you want a national DNO product (partner GIS) or a single-DNO pilot
- **Tranche B:** B1–B3 + NSTA **Ready** (Validation closed 2026-11-07)
- **Next:** UI wire remaining Gate 3 surfaces (TEC / NSTA / IoP–BRES; Lifelines partly live); Gate 4 audits on other Energy domains; DNO only if you supply GIS
- **Domain 06 (2026-11-08):** Gate 4 passed — Field Guide · Pipeline · Buildout · nuclear DUKES 5.10 LF

---

## Housing & Land · Gate 2 · Domain 03 Affordability · 2026-11-04

Follow [Housing & Land product scope](https://app.notion.com/p/40d65471768581feaca9f75117f149c0) and [Affordability domain brief](https://app.notion.com/p/40e654717685817cb98bdec53c60b676).

1. **Done — Domain 01 (prices):** History · Types · Segments · Transactions · Map.
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
   - **QA:** `data/qa/qa_housing_stock_2026_11_04.md` — PASS for the series in that report. `second-homes` is ingested (2025 England total 267,894 matches the revised release) and still needs a Validation pass.
5. **Done — Domain 05 (Construction & Supply):** [Notion brief](https://app.notion.com/p/40e65471768581ffb44ef707f8ccf483). Kickoff: [agent-kickoff-supply.md](agent-kickoff-supply.md).
   - **Live:** Supply (Machine) · Pipeline · Geography · Who builds · Data.
   - **Series:** `net-additional-dwellings`, `net-additions-by-authority`, `housing-starts`, `housing-completions` (tenure), `affordable-housing-supply`, `planning-decisions-granted`.
   - **QA:** `data/qa/qa_housing_supply_net_additions_2026_11_04.md`, `data/qa/qa_housing_supply_affordable_2026_11_04.md`.
   - **Polish later:** map atlas, rate per 1,000 dwellings, Table 123, delivery vs targets, devolved nations.
6. **In progress — Domain 06 Land Explorer:** [Notion brief](https://app.notion.com/p/40e65471768581f6bdacec2e38c31367). Kickoff: [agent-kickoff-land.md](agent-kickoff-land.md).
   - **Views (Notion):** Land Explorer · Development Sites · Planning Decisions · Historical Change · Data.
   - **Live:** Land Explorer opens on York’s map. Search replaces the council. Historical change is the Green Belt hectare series, not a blank page and not a rewound boundary. Data tables stay split by dataset.
   - **Anatomy:** place brownfield marks are the England register, clipped, with the national site total beside them.
   - **Labelled gaps:** Flood polygons are counted, not drawn. Historical geometries, local-plan allocations, appeals, and case-level applications are not loaded. Planning decisions are England quarterly totals (P120).
7. **In progress — Domain 07 (Housing Quality):** [Notion brief](https://app.notion.com/p/40e654717685816cb965c1336cb686e5). Kickoff: [agent-kickoff-quality.md](agent-kickoff-quality.md).
   - **Live:** Inside Britain's Homes · Energy Anatomy · State of Repair · Geography (English regions and the three survey areas) · Data, one series at a time.
   - **Labels:** the 15% figure is the non-decent share. EPC bands do not carry an overlap caveat. The Data source line follows the selected indicator.
   - **Still open:** Validation QA. Local-authority geography and the EPC certificate register are not loaded. Sample counts are not confidence intervals; the survey tables here do not publish intervals.
8. **Done — Domain 08 (Housing Insecurity):** [Notion brief](https://app.notion.com/p/40e65471768581a2a277cc76f104f990). Kickoff: [agent-kickoff-insecurity.md](agent-kickoff-insecurity.md). Catalogue ingested, including RO4 spend and the rough sleeping data framework. Registry rows are Ready.
   - **Views (locked):** Pathways · Temporary Housing · Displacement · Housing Need · Data.
   - **Full source set (do not skip):** H-CLIC / TA · rough sleeping · MoJ possessions · Table 600 · CORE · Census concealed · TA spend · devolved returns.
   - **Verify headlines:** 135,580 TA hh · 177,530 children (31 Mar 2026) · 83,850 assessed Q1 2026 · 4,793 rough sleeping autumn 2025.
   - **Rule:** stocks ≠ flows; homelessness ≠ rough sleeping; no wait-time from 600÷lettings.
9. **In progress — Domain 09 (Ownership & Property Economics):** [Notion brief](https://app.notion.com/p/40e6547176858199b8e5c169cbbdee84). Kickoff: [agent-kickoff-ownership.md](agent-kickoff-ownership.md).
   - **Views (locked):** Ownership · Property Rights · Mortgages · Wealth · Data.
   - **Live:** Anatomy of Property Ownership (phase 1, 5 Nov 2026): leasehold and commonhold sections, register cards, a duration strip with the seven-year registration line, and an inspector citing legislation.gov.uk · Mortgage machine (stock, advances, approvals and the reused quoted rate on separate charts) · Wealth distribution from the published survey table, with the accreditation suspension on the sheet · Data glossary.
   - **Not drawn:** named companies or titles. CCOD and OCOD need a Land Registry account; the network shows relationship types only. Inheritance is not a chain.
   - **Next:** phase 2 Mortgage Machine composition; phase 3 CCOD/OCOD assessment (licence and update frequency unverified). Graphics A–E and phases are in the kickoff.
10. **In progress — Domain 10 (Housing Policy & History):** [Notion brief](https://app.notion.com/p/40f6547176858196aeacd8c3155fee87). Kickoff: [agent-kickoff-policy.md](agent-kickoff-policy.md).
   - **Question:** How did Britain build the housing system it has today, and which decisions shaped the way we live?
   - **Live:** Time Machine · Housing Eras · Policy Observatory · Promise vs Delivery · Archive.
   - **Register:** four Acts in `data/housing/policy-events/events.json`. Marks use Royal Assent. Commencement is separate. Right to Buy’s start date is blank until the appointing order is pinned.
   - **Not drawn:** welfare-state essay, scored targets, institutional map, council-house sales.

**Domain 03 question (locked):** Who can actually afford to live in Britain?  
**Domain 04 question (locked):** What homes does Britain actually have, who occupies them, and how has that changed?  
**Domain 05 question (locked):** How many homes is Britain building, where are they being built, and why does the number delivered differ from the number planned?  
**Domain 06 question (locked):** How is Britain's land used, who decides what can be built on it, and how do those decisions shape the country?  
**Domain 07 question (locked):** What is the actual condition of Britain's homes, and how does housing quality differ according to location, building characteristics and tenure?  
**Domain 08 question (locked):** What happens when people cannot secure, maintain or remain in a stable home?

**Orchestrator:** this chat  

**Domain 09 question (locked):** Who owns Britain's property, how is that ownership structured, and how does housing generate, concentrate and transfer wealth?

**Domain 10 question (locked):** How did Britain build the housing system it has today, and which decisions shaped the way we live?

**Status:** Domains 01–05 done for Gate 2; Domain 04 second homes still need Validation; Domain 06 Explorer with Orchestrator; Domain 07 Quality instruments live, Validation and the EPC register still open; Domain 08 Insecurity catalogue done; Domain 09 Ownership in progress; Domain 10 Policy & History started (four checked Acts)
**Updated:** 2026-11-05

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
- Status: Energy Domain 01 Generation **complete**. Next Energy: Domain 02 Consumption. Housing Gate 2 Domain 10 / 06 / 09 still open in parallel only if needed.
- **Domain 02 Renting review (2026-11-05):** chart, map, table and download share place, property, period and measure. The table follows the series being inspected (index and bedroom rents included) and can download the full series. The index baseline is read from the series unit. A date range inherited from another domain no longer blanks the chart. Social rent is one tab, with the total, the rent type and the housing-needs split of the same lettings. Social rents in pounds are not estimated. The private-rent note distinguishes the official stock measure from an advertised asking rent.
- Branding: [visual-identity.md](visual-identity.md)
- Then: Energy Domain 02 Consumption (or Economy); Housing Domain 10 / 06 / 09 as needed
- Homepage: deferred

### T05 — Net additional dwellings + components (Supply Machine)
- Owner: Housing
- Status: done (curated + loaded; Validation counter-sign pending)
- Inputs: Live Table 118 ODS (pin 2026-11-04)
- Output: `data/housing/net-additional-dwellings/` (1,181 obs); spot QA `data/qa/qa_housing_supply_net_additions_2026_11_04.md`
- Notes: England 2024–25 unrounded: net 208,600 · new-build 190,602 (provisional); component identity PASS

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

### Review — Housing Domain 04 Stock & Tenure
- **Shipped:** Composition · Dwelling types (TS044 households) · Geography (year slider through Table 109; district ranks stay on the latest Table 100; England total is a sentence, not a bar) · Vacancy (October ÷ 31 March labelled) · Second homes (Council Taxbase Table 4, England, 2021–2025) · Tenure · Data
- **Blocked:** Validation has not yet checked `second-homes`
- **Next:** was Domain 05 Supply

### Review — Housing Domain 05 Construction & Supply
- **Shipped:** Tables 118/122/213/1000 · Supply Machine · Pipeline · Geography · Who builds (builder + affordable) · Data
- **Blocked:** none for Gate 2
- **Next:** Domain 06 Planning & Land (map / per-1k rates are Domain 05 polish only)
- **Review 2026-11-05:** The net-additional-dwellings record opens from the catalogue query. Pipeline keeps applications and dwellings on separate charts and says so. Geography ranks local authority districts only. Who builds opens on the builder; affordable products are a separate measure, labelled as a financial year. Data lists every supply series, the Live Table 118 term definitions, the CSV, and the England reconciliation ledger, with (P) on a provisional year. The Supply Machine uses a View menu (section or ledger) and a financial-year menu.

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
- **Shipped:** Search opens one council from Planning Data. Layer availability and reference dates sit before any comparison. Data is grouped: annual Green Belt, 2022 land use, quarterly P120, brownfield snapshot. A blank dwelling maximum is missing, not zero. Notion “Environment & Energy” is now Energy & Industry.
- **Blocked:** Flood polygons (count only). Historical geometries. Local-plan allocations. Appeals. Case-level applications.
- **Next:** Validation does not rewrite layers. Drawing every council’s flood geometry is not this pass.

### T13 — Domain 06 Land Explorer (Orchestrator)
- Owner: Orchestrator
- Status: in_progress
- Inputs: Planning Data, asked for the council the visitor searches; `brownfield-land` England totals
- Output: `LandExplorer` briefing, then the live query; `LandData` tables by dataset
- Notes: Flood polygons stay a count. Cached live JSON is a request cache, not a set of starting places.

### T11 — Domain 07 Housing Quality (cutaway + EHS)
- Owner: Housing + Orchestrator
- Status: in_progress
- Inputs: [Housing Quality brief](https://app.notion.com/p/40e654717685816cb965c1336cb686e5); EHS live tables DA3201 / DA4101 / DA5101 / DA7101 / DA6101 / DA6201 + Ch2 annex
- Output: kickoff; `ehs_quality_indicators` + `ehs_energy_anatomy`; Inside Britain's Homes; **Energy Anatomy**
- Notes: Survey estimates stay separate from the EPC register. The non-decent share is labelled as non-decent. Data shows one series, and its source line matches that indicator.

### T12 — Domain 07 Energy Anatomy
- Owner: Housing + Orchestrator
- Status: done (instrument live; Validation QA pending)
- Inputs: DA6101 · DA6201 · DA7101 · Ch2 AT2.9/2.13/2.14
- Output: `ehs-heating` · `ehs-insulation` · `ehs-energy-improvement`; `canvas/quality/EnergyAnatomy.tsx`
- Headlines 2024: A–C 56.2% · central heating 92.8% · wall insulation 54.3% · loft ≥200mm 41.7% · improvable to C 42% · mean cost £7,480
- Caveat: EHS survey ≠ EPC register (still Scoping)

### Review — Housing Domain 07 Housing Quality
- **Shipped:** Inside Britain's Homes · Energy Anatomy · State of Repair · Geography at the survey's own scale · Data with one series and a matching source line
- **Blocked:** Local-authority rates need a source other than the EHS sample. The EPC certificate register is still not loaded. Validation has not signed the quality series off.
- **Kept:** Survey versus administrative labels, suppressed and missing cells, source links, and the full export. Sample counts are shown as a base, not as a confidence interval.

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
- Status: done (instruments). Named-title network still blocked on a Land Registry download
- Output: mortgage time charts · WAS distribution (`household-net-property-wealth`, 119 rows on disk) · relationship diagram with no named proprietor. The Property Rights tab was removed; the legal distinctions stay on Who owns.
- Notes: April 2020–March 2022 median net property wealth is £106,000 for all households and £226,000 for owners. Accreditation of that round is suspended and stays on the chart. Postgres load of the wealth table waits on migration 002 if that session is still holding `observation`

### T21 — Domain 09 wealth table into Postgres
- Owner: Housing
- Status: done (release 997, 119 rows). Validation spot-check of Table 3.8 and Table 3.19 still open
- Output: `data/housing/household-net-property-wealth/`

### T20 — Domain 10 anchor Acts and Time Machine
- Owner: Orchestrator (shared event shape) + Housing (the housing file and the canvas)
- Status: in_progress
- Inputs: [Housing Policy & History](https://app.notion.com/p/40f6547176858196aeacd8c3155fee87)
- Output: `britain_exchange.policy_event`; `data/housing/policy-events/events.json`; Time Machine on `/housing?domain=policy`
- Notes: 1919, 1947 and 1980 assent dates are pinned. 1980 Part I commencement is not. Renters’ Rights Act 2025 Chapter 1 (except s.25(3)) is appointed for 1 May 2026 for private assured tenancies only (SI 2026/421).

### Review — Housing Domain 10 Policy & History
- **Shipped:** Four-Act register and the five views. The Time Machine opens first.
- **Blocked:** Right to Buy commencement order; commencement of the 1919 and 1947 Acts; sales under the right to buy; promise-versus-delivery scoring
- **Next:** Pin the order that brought Housing Act 1980 Chapter I into force, then link only series whose definition matches that event

### Review — Housing Domain 08 Insecurity
- **Shipped:** Pathways stack · Temporary Life · Displacement · Waiting for a Home · Data glossary · RO4 homelessness spend · rough sleeping data framework
- **Blocked / deferred:** Scotland SPARQL (devolved TA stays a bulletin transcription). Temporary-accommodation entries and exits are not loaded. No origin–destination file, so Displacement stays duty location. The Cost of Insecurity is not built; the RO4 total is spending only.
- **Next:** Notion registry rows marked Ready; resume Domain 07 State of Repair when you want
- **2026-11-05:** Catalogue links use `/data?record=`. Displacement says England. Lettings axis prints financial years. The five-years-or-more band is labelled open-ended in the drawing and the table. The brief no longer names a Health sector. Pathways is one stage at a time (View, Stage, Place, Quarter), with an All stages table. The flow diagram and the stacked plates are gone.

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

### Energy generation usability — 7 November 2026

1. Orchestrator: simplify generation navigation and explain each view’s question and coverage — implemented.
2. Orchestrator: use a zero-baseline historical chart by default; keep selected-year breakdown stable and below the chart; separate year picking from fuel selection — implemented.
3. Orchestrator: move guided stories out of the primary control row into an optional disclosure — implemented.
4. Validation: browser connection unavailable; code validation recorded in the task handoff. No source data or fuel taxonomy changed.

### Cloud data offload — 7 November 2026

- Owner: Orchestrator
- Status: **done** (Phase 1 archive + Phase 2 schema/load)
- Project: Supabase `british-exchange` (`wqofhaddnavcthuqpijv`, eu-west-2)
- Storage: private bucket `bx-data-archive` (Free plan ≤50 MB/object — large files gzipped on push)
- Index: `data/_archive_index.json` (~847 MiB logical archived; local `data/` ≈ 219 MiB)
- Tooling: `uv run python -m britain_exchange.archive_data push|pull|status|push-largest`
- Postgres: migrations applied; Ready observations loaded via PostgREST (`load_ready --via-rest`) — 132 indicators
- Env: `SUPABASE_URL` + `SUPABASE_ANON_KEY` in `.env` (gitignored)
- User one-step: paste Database URI into `DATABASE_URL` so FastAPI/`load_ready` use psycopg against cloud (API already falls back to files until then)
- **Shipped:** laptop relief + cloud archive + cloud observation spine
- **Blocked:** none for archive; FastAPI→Postgres waits on dashboard DB password paste

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
