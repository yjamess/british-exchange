# Energy Gate 4 — domain checklist (work through in order)

**Date:** 2026-11-10  
**How to use this:** one domain at a time, top to bottom. Tick only what you verify today.  
**Parents:** [finalise audit](gate4-audit-energy-finalise-2026-11-10.md) · [availability / Codex handoff](gate4-energy-availability-2026-11-10.md) · [source QA](../data/qa/qa_energy_finalise_sources_2026-11-10.md)

**Rule of thumb**

1. Do **§0 Sector-wide once** first (shared shell — don’t redo per domain).
2. Then walk **01 → 10**. Each domain has: *already done*, *open now*, *held / deferred*.
3. A domain is “closed for Gate 4 shell” when its open-now list is empty **and** you have done a quick desktop spot-check of its views. Phone 390px can wait until §0 phone pass if you prefer one sector sweep.
4. Do **not** claim the whole Energy sector Gate-4-final until every domain’s open-now is empty or explicitly held, plus §0 phone + Railway spot-check.

Status key: **done** · **open** · **held** · **deferred** (product backlog, not Gate 4 shell)

---

## §0 — Sector-wide (do once)

Shared across canvases. Codex already landed most of this locally; you only re-verify.

| Item | Status | Notes |
|------|--------|-------|
| Prep EmptyStage (no catalogue dump) | **done** (code) | Spot-check any In preparation domain |
| Notes feet use `formatSource` (publisher · series · geography · period) | **done** (verified 2026-11-10) | Structure + **Housing voice**: `citations.ts` rewritten (no bare ET/DUKES/…; table ids inside series like Live Table N; multi-publisher first). Geo/period evidence cleaned. Afford example: `DESNZ · ONS · Domestic bills and average weekly earnings · United Kingdom · Annual overlap…`. Audit S1/S10 → Pass; E-FIN-07 done |
| View-scoped Reset (Prices / Consumption / Imports) | **done** (code) | Flip tab, change a control, confirm Reset only for active view |
| Sampled S27 menu labels | **done** (sample) | 01–05 re-check 2026-11-10: mostly plain; residual P2 in [menus note](gate4-energy-menus-01-05-2026-11-10.md). **Reserves year union 1970–72 = S18/S19 fail** |
| Demand / bill missing ≠ zero | **done** (code) | Fossils map broader triage still under 04 |
| Six observation series in Postgres | **done** (cloud) | Reserves, fossil dependency, low-carbon share, gas storage, nominal earnings, MPP — 1,450 rows |
| Weights Storage pack + Notion registry | **done** (pack path) | Keep pack; do not force Postgres duplicate. Local pin delete only after you personally confirm cloud-only UI |
| Follow: Policy · Jobs Pay · Low-carbon Capacity | **done** (code + cloud dest) | |
| Follow: Networks Queue / Grid | **held** | Same as N07 operator hold |
| Desktop deep-link / history / empty states | **done** (Session C, 2026-11-10) | Headless Playwright, local dev. Cold `?domain=&view=` loads draw data on all 51 views. Tab/control = replace, domain = push, Back returns to previous domain (matches `explorer-url-contract.md`). Unknown `view=` falls back to default. Empty panels seen under 3 parallel loads were local API saturation (`loadSeriesPack … failed after retry`), not missing data — all fill when loaded one at a time |
| Phone 390px (all live domains) | **done, 2 bugs open** (Session C) | Device emulation (`is_mobile`, 390×844). All 51 views: no horizontal scroll, data drawn, Notes foot present. Pay overflow (504px layout) fixed by RankBars wrap — re-measured 390. **Open:** Imports Connectors + Trade show Reset at defaults (see 05). Prices loader 404s (see 03) |
| Dev console warnings | **open** (P2) | Hydration attribute mismatch (`style={{cursor:"pointer"}}`) on Fossils › North Sea and Networks › Invisible grid. SSEN duplicate-key warnings gone after Cursor fix |
| Railway / production UI without laptop files | **partial** | **Session A local cloud PASS** 2026-11-10: Afford · Wholesale · Reserves · Resilience · Anatomy weights all showed data from Supabase Postgres/Storage via FastAPI (`store=postgres`; weights Storage SHA `aec8c614…` matches disk pin). Resilience EmptyStage was **pool exhaustion** (`EMAXCONNSESSION` / session pool_size 15) — fixed with `psycopg_pool.ConnectionPool` in `britain_exchange.db` (max 8). Deploy that pool to Railway before treating production as proven; local pin delete still waits on Railway. |
| Notion domain brief gate boxes / sector “Not started” | **open** | Hygiene after product close — work-plan is ship SoT for now |
| Plate streak touch-ups | **deferred** | Imagery skill — not shell Gate 4 |

**§0 close when:** desktop + 390px + Railway spot-checks pass; local pins deleted only after cloud-only proof.

---

## 01 — Electricity generation

**Work-plan:** complete Gate 4 (earlier). **UI:** Ready.

| | |
|--|--|
| **Already done** | Map buckets; Data Fuel filter; EA wording; no open E-FIN P0 |
| **Open now** | Desktop click-through (Session B). **390px done** (Session C): all six views clean — data drawn, no scroll, no Reset at defaults, Notes foot |
| **Deferred** | None for shell |

**Views to click:** `current` · `compare` · `capacity` · `atlas` · `year` · `data`  
**Close:** screenshots or notes that defaults show data; Reset only when dirty; Notes foot has geography·period.

---

## 02 — Energy consumption

**Work-plan:** complete. **UI:** Ready.

| | |
|--|--|
| **Already done** | English-only geography map labelled intentional; Useful “User scenario” wording; Reset scoped; missing≠zero on Appetite |
| **Open now** | Desktop click-through (Session B). **390px done** (Session C): all six views clean |
| **Deferred** | User recalculation of Useful Energy experiment |

**Close:** Geography still honest about England map + nations in Data; Useful published path works.

---

## 03 — Energy prices & costs

**Work-plan:** complete; earnings/MPP were backlog. **UI:** Ready instruments; cloud series now loaded.

| | |
|--|--|
| **Already done** | Bill `vs` in URL; Reset scoped; bill missing components not zero-filled; `nominal-earnings` + MPP in Postgres |
| **Open now** | **Loader 404s — resolved 2026-11-10:** `domestic-economy7-electricity-bills` + `ofgem-default-tariff-cap-regional` now HTTP 200 from Postgres (loaded after the Session C sweep); Bill + Geography load with no console errors. Desktop click-through (Session B). **390px done** (Session C): all five views draw and fit. **Cloud verify done (Session A):** Afford 2025 bill £1,069 · pay £35,312 · share 3.0%; Wholesale 3.82 p/kWh (MPP from Postgres) |
| **Deferred** | Annex 9 map restore; editorial essay; Economy 7 layers (backlog) |

**Views:** `bill` · `afford` · `shock` · `regions` · `wholesale`  
**Close:** Afford + Wholesale cloud-only on a machine without those local CSVs (or with API forced).

---

## 04 — Oil, gas & fossil fuels

**Work-plan:** complete. **UI:** Ready; Reserves was empty — series now in Postgres.

| | |
|--|--|
| **Already done** | Reserves year no longer falls back to crude; empty/single-year menus hidden; `uk-oil-gas-reserves` loaded; missing oil shows dash; North Sea hydration sort/locale harden (code) |
| **Open now** | **Map triage — done 2026-11-10:** source has no blank values (every 0 is a reported 0; `|| 0` parse invents nothing); glyphs skip suppressed + zero (no square); cells read "Suppressed"; fuel sums leave suppressed years as gaps; OTTER 2011–13 small negative oil shown as published, no glyph. **Fixed:** All-fuel rank used raw gas, so suppressed rows topped "Largest in" (Hewett 1983–87/1990, Frigg 1994, Strathspey 1996) — rank now uses `fieldFuelValue` for both fuels; re-verified Brent/Forties top. **All-fuel measure — done 2026-11-10 (owner chose oil equivalent):** list ranks and shows oil + gas converted to oil by energy content, DUKES A.1 (30 Jul 2026) 2025 gross CVs — produced gas 40.326 MJ/m³, crude 45.654 GJ/t → 0.883 t oil per thousand m³ (`GAS_KSM3_TO_OIL_TONNES`, `fieldOilEquivalentTonnes` in `fossils-model.ts`); header "Largest in {year} · oil and gas as oil"; Notes method line added. Verified descending on 1984 (Brent 29.04 Mt), 1994, 2024 (Culzean 3.90 Mt). **Reserves year pool — fixed 2026-11-10:** intersection of oil 2P · gas 2P · oil extracted (skips a series that failed to load) → 1973–2024; stale `year=1970` resolves to 1973 with all three figures. North Sea hydration warning (P2, see §0). **`nsta-field-production` loaded 2026-11-10:** was 404 on every Fossils load and the two "Field production sums" Data links landed on the bare catalogue. Loaded to Supabase Postgres (`load_ready --only`, release 185, 104 obs, 1975–2026, migrations none; QA pass 2026-11-07). API 200 `store=postgres`; `/data?record=nsta-field-production` lists the series; Fossils loads with no console errors. Notion registry → Ready still to set (Orchestrator); local pin kept. Desktop click-through (Session B). **390px done** (Session C): all five views draw and fit. **Menus:** fix Reserves year pool (union includes 1970–72 with no 2P — see [menus note](gate4-energy-menus-01-05-2026-11-10.md)). **Cloud verify done (Session A):** Reserves 2024 oil 261 Mt · gas 148 bcm · oil extracted 30.4 Mt |
| **Deferred** | BGS coalfields; NSTA wells/NDR; DUKES F.1 NGL; editorial |

**Views:** `fields` · `extraction` · `gap` · `reserves` · `data`  
**Close:** Reserves default year has 2P (or chosen measure) data; map never invents zeros for missing oil.

---

## 05 — Energy imports & security

**Work-plan:** complete Gate 4. **UI:** Ready; Resilience ratios were 404 — now loaded.

| | |
|--|--|
| **Already done** | Resilience years = intersection of three ratio series; Reset scoped; dependency / low-carbon share / storage in Postgres |
| **Open now** | **Reset at defaults — fixed 2026-11-10:** `resetDefaults.year = clampYear(latest, yearPool, latest)` (`ImportsCanvas.tsx`). Verified on Lifelines · Resilience · Connectors · Trade: no Reset on clean URL; Reset shows with `year=2019`; Reset restores 2025 and hides. tsc clean; url + evidence tests pass. Desktop click-through (Session B). **390px done** (Session C): all six views draw and fit, incl. Shock. **Cloud verify done (Session A):** Resilience 2024 import 43.7% · fossil 75.1% · low carbon 21.8%; gas stock 23.3 TWh / capacity 35.5 TWh; YEAR+PERIOD menus; stage drawn (after DB pool fix) |
| **Deferred** | DUKES 4.4b individual storage sites; 4.5b import capacity |

**Close:** no Year menu over an empty Resilience stage; storage EmptyStage only if genuinely unpublished for that cut.

---

## 06 — Renewables & nuclear (low-carbon)

**Work-plan:** Gate 4 passed; phone residual. **UI:** Ready.

| | |
|--|--|
| **Already done** | Buildout year pool capacity/LF-led; Capacity Follow restored (view-specific primary); EventRail; Buildout first-capacity year from capacity series (not LF-only 2008 dash) |
| **Open now** | None for shell. **Done** (Session C): desktop + 390px all five views; Capacity Follow → Generation · History (no self-loop); Buildout re-measured after first-year fix |
| **Deferred** | None for shell |

**Close:** phone pass + Capacity Follow does not self-loop. **Closed 2026-11-10.**

---

## 07 — Power networks

**Work-plan:** Gates 1–4 + SSEN; **N07 held**. **UI:** further Networks UI paused.

| | |
|--|--|
| **Already done** | Border · Queue · Invisible Grid SSEN · Monthly imports · Data; Capacity → Imports Connectors redirect; Data interconnector annual rows; SSEN unique React keys |
| **Open now** | Invisible grid hydration warning (P2, see §0). **Done** (Session C): desktop + 390px all five shipped views; Monthly imports titled GB / half-hourly NESO mix, not UK corridor figures; Data interconnector table now one row per year (re-measured) |
| **Held** | **N07** NGET / Connections portal — wait for operator email. National DNO map. **No Follow** on Queue/Grid until cleared. **No more Networks UI** until public/cleared layers |

**Close for “shipped slice”:** SSEN pilot + Border/Queue/Monthly honest. Sector Gate 4 can list N07 as **held exception**, not a blocker for other domains.

---

## 08 — Manufacturing & output

**Work-plan:** deepen wave; Anatomy redesign (owner). **UI:** Anatomy · Output vs Jobs · Places · Data.

| | |
|--|--|
| **Already done** | IoP annual pack; Places + Nomis; weights Storage pack + Notion registry; Gate 4 audit earlier; Anatomy year pool capped to complete IoP year; Data branch wrap at 390px (code) |
| **Open now** | Local `weights.json` pin delete **after Railway proof**. **Done** (Session C): desktop + 390px all four views; Data + Anatomy re-measured after wrap / year-cap fix — fit 390. **Cloud verify done (Session A):** Anatomy shares (CA 16.9% etc.); Storage has matching SHA `aec8c614…` (1,110 obs); API prefers disk when pin present |
| **Deferred / owner** | **Anatomy redesign** (you). British Product Ledger. Full regional GVA atlas |

**Close for shell:** weights cloud-only; no 404 for anything the UI claims. Anatomy redesign is separate from Gate 4 shell close.

---

## 09 — Jobs & productivity

**Work-plan:** complete; Lives deferred. **UI:** Landscape · Productivity · Pay · Data (Atlas → Manufacturing Places).

| | |
|--|--|
| **Already done** | Complete-year intersection; Pay % not back-calculated; Pay Follow; ASHE Ready; RankBars long-name wrap (Pay 390px) |
| **Open now** | None for shell. **Done** (Session C): desktop + 390px all four views; Pay re-measured after RankBars fix — 390 layout (was 504) |
| **Deferred** | Industrial Lives (your register); multi-year / inflation-adjusted pay; demographics |

**Close for shell:** year menu never offers a year with only jobs or only output; Pay Follow works.

---

## 10 — Industrial policy

**Work-plan:** Gate 2; Gate 3 content open. **UI:** Decision Ledger only.

**Correction (2026-11-10):** Energy Policy has **no Promise panel**. `PromiseVerdict` is wired only into Housing Policy (`brand/housing/canvas/policy/PolicyCanvas.tsx`, commit `bef37db`); Energy `PolicyCanvas.tsx` has no pledge code. The "Promise UI · 0/9" line belonged to no Energy surface — work-plan line under Domain 10 needs the same fix.

| | |
|--|--|
| **Already done** | Ledger; Policy Reset; Policy Follow. **Done** (Session C): desktop + 390px Ledger (6 decisions, Notes foot) |
| **Open now** | None for shell |
| **Gate 3 content (in progress)** | **Promise Ledger draft:** [`data/energy/industrial-policy/pledges.json`](../data/energy/industrial-policy/pledges.json) — 9 pledges, Housing shape, verbatim quotes checked 2026-11-10. 3 scored (coal · 6 of 7 quarters at zero, Q4 2024 residual 0.0028 TWh; 40GW / 50GW offshore · 16.6 GW so far), 6 listed with reasons. **Wired locally 2026-11-10:** Energy Policy › Promises tab (`view=promise&pledge=`), shared `DecisionLedger` + `PromiseVerdict`, scorer honours `match.direction` (`web/src/brand/energy/policy-pledges.ts`), pack `energy.industrial-policy-pledges`. Still open: owner review of the draft, push `pledges.json` to Storage + Railway redeploy (production shows empty until then), registry rows |
| **Deferred / Gate 3–4 content** | Commencement SI catalogue; business-investment chart; Counterfactual Desk; full stage 4 audit |

**Close for shell:** Ledger + Reset + Follow. Content Gate 3–4 stays a separate track — do not block domains 01–09 on it.

---

## Suggested session order (practical)

| Session | Do | Stop when |
|---------|----|-----------|
| A | §0 Railway/cloud spot-check: Afford, Wholesale, Reserves, Resilience, weights | **Local cloud done** 2026-11-10 (all five). Railway re-check after pool deploy still open |
| B | Domains **01 → 05** desktop click-through + notes | Each domain’s open-now empty or filed |
| C | Domains **06 → 10** desktop + **06 phone** + sector 390px sweep | **Done** 2026-11-10 (Claude, headless). 06/09/10 closed; 07 shipped slice + 08 shell closed bar P2 / Railway items. Filed: Imports Reset, Prices 404s, hydration warnings |
| D | Owner tracks in parallel: Anatomy redesign, Policy Gate 3, Industrial Lives, plate imagery | Anytime — not on the shell critical path |
| E | Notion hygiene + work-plan “complete” lines | After A–C |

---

## Quick progress board

Copy and tick as you go:

```text
[x] §0 cloud spot-check (Afford, Wholesale, Reserves, Resilience, weights) — local→Supabase 2026-11-10
[ ] §0 Railway production re-check after ConnectionPool deploy + pin delete
[x] §0 desktop deep-link / history — Session C 2026-11-10
[x] §0 phone 390px sector sweep — closed
[x] §0 hydration / P2 shell bugs — closed (owner 2026-11-10)
[x] 01–05 Generation…Imports — closed (Session B + C; owner)
[x] 06 Renewables — closed
[x] 07 Networks shipped slice — closed; national maps → BX-BACK-004 (held)
[x] 08 Manufacturing shell — closed; pin delete waits on Railway
[x] 09 Jobs — closed
[x] 10 Policy shell — closed
[x] Notion hygiene — closed (owner 2026-11-10; nsta-field-production Ready)
```

### What's left (owner re-check 2026-11-10 evening)

| # | Item | Status |
|---|------|--------|
| 1 | **Railway:** deploy ConnectionPool, re-check five cloud views, delete local pins | **Open** — only Gate 4 production closer |
| 2 | **Network maps** (N07 / national DNO · NGET · Connections 360) | **Held** — [BX-BACK-004](https://app.notion.com/p/41465471768581a5bef6d539d77dad53) |
| 3 | **Jobs Industrial Lives** | **Deferred** — waiting on owner register |
| 4 | **Imports deepen** (DUKES 4.4b sites · 4.5b facility capacity · LNG map pins) | **Optional backlog** — not Gate 4; see Imports note below |
| 5 | Energy Promise UI wire | **Wired locally** — Promises tab live on dev; needs owner review of `pledges.json`, Storage push, Railway redeploy |

**Sector Gate 4 final (production):** Railway proof + pin delete. Held/deferred rows stay held — do not fake-done them.
