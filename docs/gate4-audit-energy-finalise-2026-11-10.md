# Gate 4 / Mode B — Energy & Industry sector finalise audit

**Mode:** B — Finishing sector (all 10 domains) + Mode S menus×served-data spot  
**Date:** 2026-11-10  
**References:** `docs/visual-identity.md` · `.cursor/rules/explorer-stage.mdc` · `exchange-domain-view` · Housing · Consumption / Generation  
**Under audit:** `web/src/brand/energy/**` · `connections/energy.ts` · local API `store=postgres`  
**Owner open list:** re-checked against EA01–EA04 (claimed done) + served data

## 1. Verdict

**Not ready to mark the sector Gate-4-closed / final.** Explorer shell largely matches Consumption/Housing grammar and the 2026-11-10 accuracy wave **did** clear most single-domain UI bugs from the prior audit. What still blocks a honest close is **cloud completeness + menu honesty** (S18/S19/S24/S26) and a short shell backlog (S1/S4/S9/S12).

Gate 2 (instruments live) ≠ Gate 4 (this full shell + menus×data bar).

## 2. Coverage + Not inspected

| Item | Covered |
|------|---------|
| Domains | All 10: generation · consumption · prices · fossil · imports · low-carbon · networks · manufacturing · industrial-work · policy |
| S1–S17 | Mechanical code sweeps + Housing sample |
| S18–S27 | Spot audit vs local API `/indicators` + `/packs` (risk years + missing IDs) |
| Menu inventory | Compact table from view registries + canvases (see §3) |
| Notion domain briefs | Fetched all 10 child pages + sector page |
| Notion registry SQL | **Blocked** — Query Data Source allowance exhausted; retry later |
| Browser / phone 390px | **Inspected** — Session C 2026-11-10, headless Playwright (desktop 1440 + `is_mobile` 390×844), all 51 views. See §11 |
| Publisher numerical QA | Out of scope — Validation / `data/qa/` |

## 3. Sweep table (S1–S27)

| ID | Verdict | Notes |
|----|---------|-------|
| S1 Source | **Pass** (2026-11-10) | Structure: `energySource` → `formatSource` on every canvas; 47/47 geo+period. Voice aligned to Housing: `citations.ts` uses `Publisher · series` (table numbers inside series; no bare ET/DUKES/QEP/BRES/ASHE/TEC; multi-publisher listed first). Slash / mid-`·` geographies and acronym-only periods cleaned. |
| S2 Notes | Pass | One `FigureRecord` foot; no Coverage strip; no body ledes |
| S3 Controls | Pass | Outer `ControlRow` |
| S4 Empty | **Fail** | Prep branch in `EnergyCanvas.tsx` dumps catalogue links in body |
| S5 Charts | Pass | No `FIG. n`; no `leaders={true}` |
| S6 Map keys | Pass | |
| S7 Map zoom | Pass | Station / field / LA search present where peers have it |
| S8 Signal / ink | Pass | |
| S9 URL / Reset | **Fail (partial)** | Policy has no Reset; Prices / Consumption / Imports Reset can light from other tabs’ state |
| S10 Docs lock | **Pass** (2026-11-10) | `citations.ts` holds publisher·series only; `energySource` + view `evidence` append geography·period per identity / `formatSource` |
| S11 Energy frame | Pass | Residual = S4 prep dump |
| S12 Follow | **Fail** | Gaps: policy ledger; networks queue/grid; jobs pay; low-carbon capacity forces `follow={null}` |
| S13 Labelled gaps | N/A | No Energy gap-hunt docs |
| S14 Stocks ≠ flows | Pass | Fossils reserves vs production |
| S15 Atlas chrome | N/A | Not Housing AreaMap peers |
| S16 Domain sources | Pass | `DOMAIN_PACKS` gates loaders |
| S17 Cloud Ready | **Fail (partial)** | Most Ready series via API; **laptop-only** for Afford earnings + Wholesale MPP; several sector-pages IDs 404 on `/indicators` |
| S18 Empty defaults | **Fail** | Reserves year menu falls back to crude while charts EmptyStage; Resilience Year over missing ratios |
| S19 Pooled periods | **Fail** | Jobs Landscape `jobYears ∪ outputYears`; Buildout capacity∪LF; Reserves crude fallback |
| S20 Missing-as-zero | **Fail (mixed)** | Appetite then/now `?? 0`; Fossils map fuel sums; Bill compare rows — triage |
| S21 Options vs view | **Fail (spot)** | Reserves/Resilience Year options with empty stages |
| S22 One-option menus | Pass (spot) | Menus hidden rather than one-option |
| S23 Multi ≤5 | Pass / N/A | No `MultiMenuControl` |
| S24 Loaded not offered | **Fail** | Weights + NSTA annual only as packs; sector-pages still lists 404 indicator ids |
| S25 Stale lists | Not inspected | |
| S26 Honest availability | **Fail** | Sector series lists vs `/indicators` 404s |
| S27 Plain labels | **Fail (sample)** | Units/acronyms in some menu labels (`ktoe`, `TWh`, `LNG`) |
| Phone 390px | **Pass** (2026-11-10) | All 51 views fit 390 with data + Notes foot after RankBars wrap fix (Pay was 504px). Residuals filed in §11 |

### Menu table (compact)

Full control inventory lives in the audit run notes; summary by domain:

| Domain | Views | Key URL controls |
|--------|-------|------------------|
| generation | current · compare · capacity · atlas · year · data | measure, year, fuel/group, from/to, layout, atlas, family, dataset |
| consumption | metabolism · appetite · end-use · geography · useful · data | measure, year, sector, base, compare, lens, place, assume |
| prices | bill · afford · shock · regions · wholesale | bill_fuel, year, vs, region, payment, tariff, kwh, band, cap_*, mpp_measure |
| fossil | fields · extraction · gap · reserves · data | atlas_year, scale, fuel, status, field, q, year, dataset |
| imports | lifelines · resilience · shock · connectors · trade · data | year, fuel, flow, mode, list, partner, basis, event, dataset |
| low-carbon | guide · capacity · pipeline · buildout · data | tech, measure, year, lf_basis, pipe_tech, lane, stage, dataset |
| networks | border · queue · grid · night · data | year, flow, basis, gate, status, area, layer, lines, site, dataset |
| manufacturing | anatomy · output · places · data | measure, level, industry, from, year, dataset |
| industrial-work | landscape · productivity · pay · data | year, measure, pay_measure, sheet |
| policy | ledger | event |

## 4. What’s consistent

- SectorPage / Explorer order across Ready canvases.
- Outer ControlRow + one Notes foot + EmptyStage on missing packs.
- Custom instruments (receipt, metabolism, field guide, decision ledger) stay one-ink inside the shell.
- EA01–EA04 fixed: Generation map buckets, Data fuel filter, Bill `vs` URL, pay % not back-calculated, After Dark → Monthly imports, duplicate Atlas/Capacity redirects, “User scenario” wording.
- Year gates for Afford / Buildout / Jobs complete years largely correct **when the underlying series is cloud-present**.

## 5. Inconsistency matrix

| ID | Where | Issue | Canonical | P | File / path |
|----|-------|-------|-----------|---|-------------|
| E-FIN-01 | Fossils › Reserves | `uk-oil-gas-reserves` 404; year menu uses crude; charts EmptyStage | S18 / cloud Ready | P0 | `load.ts` · `FossilsCanvas.tsx` · local `data/energy/uk-oil-gas-reserves/` |
| E-FIN-02 | Imports › Resilience | `fossil-fuel-dependency`, `low-carbon-energy-share`, `natural-gas-storage` 404 | S18/S26 | P0 | `load.ts` · Imports canvas · sector-pages |
| E-FIN-03 | Prices › Afford / Wholesale | `nominal-earnings`, `major-power-producer-fuel-prices` laptop CSV only | S17 / work-plan backlog | P0 | `data/economy/nominal-earnings/` · `data/energy/major-power-producer-fuel-prices/` |
| E-FIN-04 | Manufacturing weights | Pack Ready in Storage; no Notion row; no QA; no Postgres indicator (404) | Cloud completeness | P0 | `energy.manufacturing-iop-weights` · connector · local `weights.json` |
| E-FIN-05 | Jobs Landscape years | Union of jobs ∪ output years | S19 | P1 | `JobsCanvas.tsx` |
| E-FIN-06 | Reset leak | Prices / Consumption / Imports cross-tab dirty | S9 | P1 | `*Canvas.tsx` |
| E-FIN-07 | Source feet | Missing geography · period via `formatSource` | S1/S10 | P1 | **Done** — `energySource` + view evidence; slash-geo cleanup 2026-11-10 |
| E-FIN-08 | Follow gaps | Policy; networks queue/grid; jobs pay; LC capacity null | S12 | P1 | `connections/energy.ts` · canvases |
| E-FIN-09 | Prep EmptyStage | Catalogue dump in preparation stage | S4 | P1 | `EnergyCanvas.tsx` |
| E-FIN-10 | Policy Reset | `event` in URL, no Reset | S9 | P2 | `PolicyCanvas.tsx` |
| E-FIN-11 | Menu labels | Units/acronyms in options | S27 | P2 | Consumption / Renewables / Generation / Imports |
| E-FIN-12 | `?? 0` chart maths | Appetite / Fossils map / Bill compare | S20 | P2 | listed canvases |
| E-FIN-13 | Notion briefs | Domain pages still unchecked Gate boxes; sector page Status “Not started” | Registry / brief hygiene | P2 | Notion (not product blocker if work-plan is SoT for ship status) |

## 6. Intentional variations to keep

- Consumption Geography map = nine English regions (`E12*`); nations in Data — labelled.
- Networks national DNO / NGET maps **paused** until licence reply; SSEN pilot only.
- Policy = Decision Ledger only (no measure ControlRow). **Correction 2026-11-10:** Energy has no Promise panel — the "0/9" note was never true of an Energy surface (Promise UI is Housing only). Energy Promise Ledger is now a Gate 3 draft (`data/energy/industrial-policy/pledges.json`).
- Jobs › Atlas and Networks › Capacity = legacy redirects (not duplicate products).
- Manufacturing Product Ledger + full regional GVA atlas deferred.
- Useful Energy user recalculation deferred.
- Imports 4.4b sites / 4.5b capacity deferred.
- Jobs Industrial Lives waiting on owner register.

## 7. Owner open-list re-check (prior audit)

| Prior item | Status now |
|------------|------------|
| Year menus empty (Reserves, Afford, Buildout, Jobs) | **Mostly fixed in code**; Reserves **still fails in practice** because reserves series not in Postgres |
| Part years as full years | **Mostly fixed**; residual if annual pack leaks months |
| Spurious Reset | **Partial** — Fossils/Gen/Jobs/Renewables/Networks OK; Prices/Consumption/Imports leak |
| Generation map double register | **Fixed** |
| Generation Data Fuel filter | **Fixed** |
| Bill Compare with URL | **Fixed** |
| Pay back-calc | **Fixed** |
| Consumption Geography English-only | **Confirmed intentional** |
| After Dark = monthly imports | **Fixed** (renamed) |
| Duplicate Atlas / Capacity / cards | **Fixed** (redirects + strip) |
| Wording pass | **Fixed** (minor CSS comment residue) |
| manufacturing-iop-weights cloud + Notion + QA | **Still open** (pack only) |
| Networks UI paused / N07 | **Still held** — correct |
| Manufacturing deepen / Anatomy redesign | **Still open** (owner) |
| Policy stage 2 of 4 | **Wired locally 2026-11-10** — Promises tab (3 scored / 9 listed); pledges draft in owner review; Storage push pending |
| Prices earnings/MPP cloud | **Still open** — laptop only |
| Jobs Industrial Lives / multi-year pay | **Still deferred** |
| Renewables phone check | **Done** 2026-11-10 (Session C) |
| Consumption user scenario | **Still deferred** |
| Imports 4.4b / 4.5b | **Still deferred** |
| Plate touch-ups | **Still open** (imagery — not this audit) |

## 8. Notion domain check (briefs vs local SoT)

| # | Domain | Notion brief gates | Local work-plan | Live UI status |
|---|--------|--------------------|-----------------|----------------|
| 01 | Generation | Unchecked Gate 1–4 boxes | **complete** Gate 4 | Ready |
| 02 | Consumption | Unchecked | **complete** | Ready; user-scenario deferred |
| 03 | Prices | Unchecked | **complete**; earnings/MPP backlog | Afford/Wholesale empty without laptop |
| 04 | Fossil | Unchecked | **complete** | Reserves empty without cloud series |
| 05 | Imports | Gate 3/4 partly unchecked | **complete** Gate 4 | Resilience ratios 404 |
| 06 | Renewables | Unchecked | Gate 4 passed; phone residual | Ready |
| 07 | Networks | Unchecked | Gates 1–4 + SSEN; **N07 held** | Further UI paused — correct |
| 08 | Manufacturing | Unchecked | Deepen wave; Anatomy redesign | Weights pack-only gap |
| 09 | Jobs | Unchecked | **complete**; Lives deferred | Atlas → Places redirect |
| 10 | Policy | Unchecked | Gate 2 + Promise UI; Gate 3 open | Stage 2 of 4 |

**Hygiene:** Notion sector page still says Status “Not started”; child pages are still planning checklists. Treat `docs/work-plan.md` + this audit as ship SoT until registry statuses are refreshed. Registry SQL listing of non-Ready Energy rows was **unavailable this run** (Query Data Source limit).

## 9. Minimal fix plan (do not implement here)

**Wave 1 — P0 cloud honesty (Energy + Validation)**  
1. Load to Postgres (+ registry Ready after QA): `uk-oil-gas-reserves`, `fossil-fuel-dependency`, `low-carbon-energy-share`, `natural-gas-storage`, `nominal-earnings`, `major-power-producer-fuel-prices`.  
2. `manufacturing-iop-weights`: Notion row → QA `data/qa/` → Postgres indicator → README/manifest → delete local pin after push.  
3. Until then: hide Year on empty Reserves/Resilience; stop listing 404 ids as live series in `sector-pages` / Follow.

**Wave 2 — P1 shell**  
4. View-scoped Reset on Prices / Consumption / Imports.  
5. ~~`formatSource` on Notes feet (S1/S10).~~ **Done** 2026-11-10.  

6. Follow primaries for Policy, Networks queue/grid, Jobs pay; document or restore low-carbon capacity Follow.  
7. Jobs year = intersection / measure-scoped.  
8. Prep EmptyStage without catalogue dump.

**Wave 3 — P2 polish**  
9. Policy Reset; S27 labels; S20 `?? 0` triage; Renewables + sector phone 390px pass; plate touch-ups (imagery skill).

**Held / owner**  
10. Networks N07 — wait for operator email.  
11. Manufacturing Anatomy redesign; Product Ledger; GVA atlas.  
12. Policy Gate 3–4 content.  
13. Jobs Industrial Lives register.

## 10. Gate ticks (Mode B)

- [x] Sweeps on finishing tree (S1–S27 spot)
- [x] Explorer slots match Consumption/Housing (with listed fails)
- [x] Custom instruments one ink
- [ ] URL+Reset clean — **Fail partial**
- [ ] EmptyStage honest everywhere — **Fail prep + cloud empties**
- [ ] Follow where Ready — **Fail gaps**
- [ ] No open P0/P1 vs references — **P0 cloud gaps remain**
- [x] Exceptions listed
- [x] Phone 390px measured — Session C 2026-11-10 (§11)

**Close:** Do **not** mark Energy sector Gate 4 final until Wave 1 cloud honesty lands and Wave 2 shell P1s are triaged. EA01–EA04 remain valid for the UI bugs they targeted.

## How to work the findings

**Use the chronological checklist:** [gate4-energy-domain-checklist-2026-11-10.md](gate4-energy-domain-checklist-2026-11-10.md)  
That page merges this audit + the Codex availability pass into **§0 sector-wide once**, then **domains 01→10**. Prefer it over re-reading the wave/E-FIN matrices below.

Evidence / code handoff: [availability](gate4-energy-availability-2026-11-10.md) · `data/qa/qa_energy_finalise_sources_2026-11-10.md`.

## Implementation follow-up — after storage cutover

See [availability and closure handoff](gate4-energy-availability-2026-11-10.md) and `data/qa/qa_energy_finalise_sources_2026-11-10.md` for current evidence. The findings above are the original audit snapshot.

- E-FIN-01–03 observation availability: six missing indicators loaded to production Postgres, 1,450 rows; all metadata/observations HTTP 200 through cloud-backed FastAPI, notes preserved. Existing live local API also returns earnings from Postgres. Reserves SSR HTTP 200, contains recoverable-reserves content and no reserves-unavailable message.
- E-FIN-04: Storage-only weights delivery verified, source QA recorded, registry row created. Kept the existing Storage representation and local dev pin; did not duplicate the pack into Postgres merely to expose an indicator endpoint.
- E-FIN-05–07/09–11: local year/Reset/source/preparation and sampled label fixes; Policy Reset implemented. **E-FIN-07 / S1 / S10 re-verified 2026-11-10:** browser feet show publisher · series · geography · period; seven slash geographies and two mid-string `·` geographies rewritten in `views/*.ts`.
- E-FIN-08: Policy, Jobs Pay and Low-carbon Capacity Follow added; destination series cloud-verified. Networks Queue/Grid held under existing operator restriction.
- E-FIN-12: demand gaps and bill-component comparison fixed; missing oil display uses a dash. Broader Fossils suppression/glyph triage remains open.
- Validation: TypeScript and 38 web tests pass; source checks pass. Browser access host unavailable, so visual desktop/390px remains open. Full stale-menu sweep and Railway verification remain open. No final Gate 4 tick.

## 11. Session C — browser pass (2026-11-10)

**Method:** headless Playwright against local dev (`localhost:3000` + FastAPI `store=postgres`). Desktop 1440×900 for 06–10; device emulation 390×844 (`is_mobile`, `has_touch`) for all 51 views; cold deep links; tab → Back/Forward per domain. Views loaded one at a time — three in parallel saturates the local API and produces false EmptyStages. Screenshots kept in the session scratchpad, not committed.

| Check | Result |
|-------|--------|
| Defaults draw data | **Pass** — all 51 views |
| Notes foot (publisher · series · geography · period) | **Pass** — every drawn view |
| 390px no horizontal scroll | **Pass** after RankBars long-label wrap (Pay was a 504px layout; re-measured 390) |
| URL / history | **Pass** — matches `explorer-url-contract.md` (replace on tab/control, push on domain); unknown `view=` → default |
| Reset only when dirty | **Pass** (fixed same day) — Imports Connectors + Trade opened on Lifelines `latest` while Reset defaulted to `yearPool.at(-1)`; default now `clampYear(latest, yearPool, latest)`, re-verified |
| Follow | **Pass** — Low-carbon Capacity → Generation · History (no self-loop) |
| Honest availability (S26) | **Pass** (resolved same day) — Prices 404s (`domestic-economy7-electricity-bills`, `ofgem-default-tariff-cap-regional`) cleared by a later Postgres load. `nsta-field-production` (QA pass 2026-11-07, never loaded) loaded to Supabase Postgres, release 185, 104 obs — Fossils loader + Data deep links now resolve |
| Console | **P2** — hydration attribute mismatch on Fossils › North Sea and Networks › Invisible grid; SSEN duplicate keys fixed |
| Networks Data | **Fixed** — interconnector table one row per year (was quarters labelled by year) |
| S18/S19 Reserves years | **Pass** (fixed same day) — year pool = intersection of oil 2P · gas 2P · oil extracted → 1973–2024; `year=1970` resolves to 1973 |
| S20 Fossils map | **Pass** (fixed same day) — no blanks in source, so no invented zeros; suppressed gas no longer tops All-fuel "Largest in" (Hewett / Frigg / Strathspey). All-fuel list now ranks and shows oil + gas as oil equivalent (DUKES A.1 2025 gross CVs, 0.883 t per thousand m³) |

**Remaining for sector Gate 4 final:** Session B desktop 01–05 · Railway pool deploy + re-check + pin delete · hydration P2s. Tracked in the checklist's "What's left" table.
