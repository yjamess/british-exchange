# Energy menus × served data — domains 01–05 (2026-11-10)

**Mode:** S18–S27 menu sweep while Session B does desktop click-through.  
**Scope:** Generation · Consumption · Prices · Fossils · Imports.  
**Against:** local FastAPI → Supabase Postgres / Storage (not laptop CSV as SoT).  
**Rule:** read-only findings — do not “fix in audit”; hand to Session B / polish.

Status key: **pass** · **fail** · **spot** · **n/a**

---

## Verdict

Menus for 01–05 are mostly honest after the accuracy wave + Session A cloud loads. **One clear S18/S19 fail remains on Fossils › Reserves** (year union). Labels are largely plain English; residual S27 is polish, not Gate-block.

---

## Menu table (controls that matter)

| Domain › view | Label | URL / state | Options source | Drives | Year / period honesty |
|---|---|---|---|---|---|
| Gen › History / Compare / Capacity | Year / From / To / Measure / Fuel | `year`, `compare`, `measure`, `fuel` | `lrYears` or `capacity.years` / `years` by view | Charts | **pass** — capacity uses capacity years; long-run uses lr years |
| Gen › Atlas | Reading / Stations / Technology | atlas keys | hard-coded families | Map | **pass** (spot) |
| Gen › Data | Series / Fuel | data series | history vs quarterly | Table | **pass**; “Energy Trends · quarterly” OK as series name |
| Cons › Metabolism / Demand | Measure / Break down / Sector / Year / Index base | measure, lens, sector, year | C1 years / sectors | Charts | **pass** (spot) |
| Cons › End use | Where / End use | endScope, endUse / crossEnd | domestic list + publisher `end_use=` | Charts | **spot S27** — cross uses raw publisher strings (plain English, long) |
| Cons › Useful | Sector / End use / Assumptions / Year | useSector, effEndUse, assume | pack end uses; reproducible flag | Charts | **spot S27** — end-use options = raw `id` (no title-case); end-use menu only when sector ≠ all |
| Cons › Geography | Sector / Measure | geoSector, geoMeasure | hard-coded; intensity needs pop pack | Map | **pass** — “Per resident (needs population)” when pack missing |
| Cons › Data | Series | dataSeries | Final / Primary / Domestic / Cross / Subnational | Table | **pass** — no C1/W1 codes in menu |
| Prices › Bill | Fuel / Meter / Year / Compare / Region / Use | bill_fuel, year, vs, region, kwh | bill years; usage options | Bill | **pass** |
| Prices › Afford | Fuel / Meter / Year / Payment / Tariff | + payment, tariff | **affordYears** = bills ∩ full earnings years | Share chart | **pass** — no bill-only fallback |
| Prices › Wholesale | Fuel | mppMeasure | Natural gas / Coal / Oil (generators) | Line | **pass** — plain labels; Postgres MPP |
| Prices › Regions | Region source / Price cap / Period / Year | desnz\|ofgem | OFGEM plain labels | Rank | **pass** (spot); Ofgem regional series may 404 — empty path should EmptyStage |
| Prices › Shock | Year / Industrial band | year, band | bill/shock years | Index | **pass** (spot) |
| Fossils › Fields | Year / View by / Fuel / Status | atlas_year, scale, fuel, status | atlas span; plain Oil/Gas | Map | **pass** |
| Fossils › Extraction / Gap | Year | year | **crude** (else gas/primary) years | Lines | **pass** — not reserves pool |
| Fossils › Reserves | Year | year | **union** oil_2p ∪ gas_2p ∪ oil_production | 2P + extracted charts | **fail S18/S19** — see below |
| Fossils › Data | Series | dataSeries | Crude / Gas / Coal / Primary / Fields / … | Table | **pass** |
| Imports › Lifelines | Year / Fuel / Direction / How it arrives / List | year, fuel, flow, mode, list | lifeline years per fuel | Map + ranks | **pass** — LNG option labelled “Liquefied natural gas terminals”; mode “By ship” |
| Imports › Resilience | Year / Period | year, basis | intersection of loaded ratio series | Ratio + storage | **pass** (Session A + pool fix) |
| Imports › Connectors | Direction (+ year if pool) | ic_flow | interconnector years | Flows | **pass** (spot) |
| Imports › Trade | Year | year | trade years | Trade chart | **pass** (spot) |
| Imports › Shock | — | event | no year menu | Ledger | **n/a** |

---

## S18–S27 (01–05)

| ID | Result | Notes |
|----|--------|-------|
| **S18** Empty options | **fail (Reserves)** | `year=1970` allowed; figures show recoverable “—”; oil extracted 0.16 Mt. Years **1970–1972** are in the menu from `oil_production_mt` only — oil/gas **2P** start **1973** (API). Chart legends still show latest 2P values (261 Mt / 148 bcm) while the selected year has no 2P point — confusing. |
| **S19** Pooled periods | **fail (Reserves)** | `reserveYears` = union of oil_2p + gas_2p + oil_production. Prefer intersection of series the stage draws as lines, or hide years with no 2P. Afford / Resilience / Imports view pools: **pass**. |
| **S20** Missing as zero | **spot** | Consumption geography / useful still use `?? 0` in places; Appetite/Demand missing≠zero was fixed earlier — Claude should spot-check Demand zeros. Reserves figures use “—” for missing 2P at 1970 (**pass**). |
| **S21** Options vs view | **pass** (spot) | Fossils reserves vs extraction/gap use different year pools. Imports year pool is view-scoped. Prices Afford uses affordYears only. |
| **S22** One-option menus | **pass** (spot) | Year menus gated `length > 1`. |
| **S23** Multi-select | **n/a** | No MultiMenuControl in 01–05 canvases. |
| **S24** Loaded but not offered | **pass** (spot) | MPP three fuels all in menu; ET 1.3 three ratios on Resilience. |
| **S25** Stale lists | **n/a** | No LAD search lists in 01–05. |
| **S26** Honest availability | **pass** (spot) | Session A series `store=postgres`. Geography intensity labelled when pop pack missing. |
| **S27** Plain labels | **spot / P2** | Mostly plain. Residuals: Gen Measure “Share of generation (%)”; stage titles still say ktoe/TWh (OK in stage, not menus); Cons End-use / Useful raw publisher strings; Imports chart rule “2016 · LNG added” (chart annotation, not menu). Renewables “Average BoE capacity” / “Built · MW” are **domain 06** — out of this pass. |

---

## Evidence (API)

- `uk-oil-gas-reserves`: oil/gas 2P **1973–2024** (52 yrs); oil_production **1970–2024** (55) → menu union adds **1970–1972**.
- ET 1.3 ratios: annual **1998–2025** aligned across three series.
- `nominal-earnings`: complete years **2000–2025** (2026 partial) — Afford filter correct in code.
- MPP: three `measure=` fuels present (405 obs).

Browser: `/energy?domain=fossil&view=reserves&year=1970` — figures dash for recoverable; Reset dirty; legends still show full-series latest 2P.

---

## Minimal fix plan (do not implement here)

1. **P1 — Reserves year pool:** build `reserveYears` from years that have **oil_2p and gas_2p** (intersection), and keep oil_production on its own chart without extending the year menu. Or: year menu = 2P years only; extracted series may start earlier on the chart without selectable empty 2P years.
2. **P2 — S27:** title-case Useful end-use options (same helper as domestic End use); optional shorten Gen “Share of generation” (drop `%` in the menu label — unit stays on the axis).
3. **P2 — TimeChart legend vs selected year:** when the active year has no point, legend should not imply the latest 2P value is “for” that year (or hide legend value).

---

## Hand-off

- **Claude / Session B:** treat Reserves year=1970 as the known menu fail; no need to re-litigate Afford/Wholesale/Resilience year pools.
- **Owner:** S27 residuals are polish; not Gate-4 blockers once Reserves pool is fixed.
- Domains **06–10** menus not in this note.
