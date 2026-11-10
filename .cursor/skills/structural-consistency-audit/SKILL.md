---
name: structural-consistency-audit
description: >-
  Read-only structural and visual QC for British Exchange sector explorers.
  Use before a new sector, when finishing a domain/Gate 4, or when the owner asks to “scan” / “double-check” /
  “usual checks” / “repetitive checks”. Runs mechanical sweeps (source lines,
  Notes, controls, map keys, EmptyStage, Follow, labelled gaps, stocks≠flows,
  atlas chrome, domain-sources, cloud Ready), then the menu × served-data sweep
  (every option opens on data, multi-select only for lines, nothing loaded left
  unoffered, plain labels, phone width measured at 390px), then a short shell matrix.
  Does not audit datasets against publishers or redesign instruments.
---

# structural-consistency-audit

Read-only QC. Not a redesign, data audit, a11y cert, or refactor.

**North star:** Consistent grammar, flexible expression — one publication shell;
domain graphics may differ.

## Modes

| Mode | When | Scope | Verdict question |
|------|------|-------|------------------|
| **A — Housing baseline** | Before starting a *new* sector | All Housing domains + modes | Is Housing cohesive enough to template the next sector? |
| **B — Finishing sector / domain** | After styling or Gate 3–4 UI on a live sector (e.g. Energy › Prices) | Named sector; domain-by-domain; **cross-check against Housing + nearest approved Energy canvas** | Is this sector/domain structurally ready to mark complete / Gate 4? |
| **C — Cross-sector drift** | After many parallel canvas edits | Housing + Energy (and any other live sectors) side-by-side on the same slots | Have live sectors drifted from the locked Explorer grammar? |
| **S — Sweep only** | Owner says “scan sources”, “double-check all pages”, or “the usual checks” | Mechanical sweeps below on the named sector (default Housing) + sample one Energy canvas | List every hit; no deep matrix unless asked |

Default to **B** when a finishing domain is named; **S** for scan-only / polish / “usual checks” asks.
Do not run Housing-only when asked to close Energy.

## Boundaries

- Read-only until the user authorises fixes after the report.
- Placement, chrome and **controls against served data** (S18–S27: does every menu option
  open on what the API/packs actually hold?). Not data truth against the publisher,
  provenance, or ingest QA numbers — those stay with Validation (`data/qa/`).
- Do not standardise bespoke instruments (maps, cutaways, receipts); only their scaffolding.
- No speculative findings → **Not inspected**.
- Gate 2 (instruments live) ≠ Gate 4 (this audit’s full shell bar). Do not conflate them in the verdict.

## Canonical sources (re-read each run)

1. `docs/visual-identity.md`
2. `.cursor/rules/explorer-stage.mdc`
3. `.claude/skills/exchange-domain-view/SKILL.md`
4. `web/src/brand/brand.css` + `BrandRoot`
5. `web/src/brand/template/` (`Explorer`, `FigureRecord`, `formatSource`, `EmptyStage`, …)
6. `web/src/brand/instrument/TimeChart.tsx`
7. `web/src/brand/sector-pages.ts`
8. Housing Follow registry: `web/src/brand/connections/housing.ts` (+ tests)
9. Housing domain load boundary: `web/src/brand/housing/domain-sources.ts`
10. References: Housing `canvas/model.tsx` → Energy `ConsumptionCanvas` / `ConsumptionAppetite` → `GenerationCanvas` → domain under audit. Lab (`/design-lab/*`) is contrast only.
11. Housing polish backlog / gap notes: `docs/work-plan.md` (Housing Gate 2 polish table) + any `docs/domain*-gap-hunt-*.md`

## Mechanical sweeps (every mode; Mode S = this only)

Path roots: A/S → `web/src/brand/housing/`; B → `web/src/brand/<sector>/` (+ Housing sample); C → housing + energy (+ others). Replace `<sector>` accordingly. Helper: `formatSource` in `template/Explorer.tsx`.

Record Pass / Fail / N/A / Not inspected. Promote Fails into the matrix — do not fix in-audit.

### Shell & chrome (Energy frame)

These are the checks the owner kept asking for after each Housing domain polish. Fail = drift from Consumption / Generation.

| ID | Fail when | Scan |
|----|-----------|------|
| **S1** Source | Smashed publisher (`MHCLG Live…`); trailing `·`; slash geography; missing geography; academic citation on a chart foot | `rg -n --glob '*.{tsx,ts}' 'source:\s*[`"\x27]\|source:\s*$' …` then spot-check; also `rg 'source:.*[`"\x27](MHCLG\|ONS\|DESNZ\|HMRC\|FCA\|HM Land Registry\|Bank of England\|Planning Inspectorate) [A-Za-z]'` and `rg 'source:.*( / \|collection dumps\|\?\? "")'` |
| **S2** Notes | Second Notes; Coverage strip; body method/jargon; **stage-body lede** restating definition/method | `rg 'FigureRecord\|SourceLine\|<Stage\|Coverage'` · `rg '(Exchange calculation\|hatched means\|coefficient\|Note [0-9]\|W[0-9]\b)'` · body `className=.*(lede\|intro\|blurb)` outside Notes |
| **S3** Controls | Place/measure/period/search/breakdown only inside Stage (camera +/−/⌂ on map OK); in-stage measure tabs | `rg 'ControlRow\|MenuControl\|SearchControl\|PeriodControl'` · suspect in-body `role="tablist"\|setMeasure\|onChange.*measure` inside canvas view files (not Explorer) |
| **S4** Empty | Catalogue dump / `data/….json` on screen; peers use `EmptyStage`, this view does not | `rg 'EmptyStage\|Ready catalogue\|data/[a-z0-9_./-]+\.json'` |
| **S5** Charts | `leaders={true}` gutter on framed stage; `FIG. n` titles; Data body as link list not titled panels | `rg 'stageTitle\|SeriesLegend\|leaders=\{true\}\|FIG\.\s*[0-9]\|Ready catalogue'` |
| **S6** Map keys | Key swatch `url(#…)` without local `<defs><pattern>` in that SVG | `rg 'url\(#\|<pattern\|Map key\|swatch'` — open each hit |
| **S7** Map zoom | Named-place national map lacks zoom/search while Land / Field / GB history have them | `rg 'SearchControl\|zoom\|setCam\|focusPlace\|Find a '` vs map views |
| **S8** Signal / ink | Signal on prose; opacity washes; new `tokens.css` sector palette | `rg 'bo-signal\|opacity:\s*0\.\|tokens\.css'` |
| **S9** URL / Reset | Filter not in URL while peers sync; Reset misses a control | `rg 'setQuery\|searchParams\|ResetButton'` |
| **S10** Docs lock | Identity / explorer-stage / domain-view / `formatSource` disagree | Read those four; no code scan |
| **S11** Energy frame pack | View still needs the Housing 2026-11-10 polish pack: outer `ControlRow` · body ledes gone · one `FigureRecord` foot · `EmptyStage` · Data/Transactions as titled panels · FigureStrip ≤ 3 | Per domain × view against `docs/work-plan.md` “Energy frame” review bullets; spot-check Explorer + view file |

Grammar reminder (S1): `Publisher · series · [Boundaries: …] · geography · [period]`.

### Product honesty & wiring (Housing Gate 2 / polish)

Repeated product checks — not dataset QA, but “is the Explorer honest and wired”.

| ID | Fail when | Scan |
|----|-----------|------|
| **S12** Follow | Ready domain/view has no primary Follow edge while peers do | `web/src/brand/connections/housing.ts` (or sector connections) vs live views in `sector-pages` / `model.tsx`; run connections tests if present |
| **S13** Labelled gaps | Gap is closed in work-plan / gap-hunt docs but UI Notes/stage never says so; or UI implies data that the gap says is unavailable | Diff `docs/domain*-gap-hunt-*.md` + polish table ↔ `rg -n 'labelled gap\|not published\|not in these\|stay.*gap' web/src/brand/<sector>` |
| **S14** Stocks ≠ flows | Stage/Notes/figures add a stock to a flow, or draw them as one series without labels | Spot-check Mortgage / Supply / Insecurity / Ownership feet for “stock” / “flow” / “net additions” / “approvals”; fail if copy invites summing unlike quantities |
| **S15** Atlas chrome | District/LA choropleth peers (Displacement, Who owns, Quality Geography, Supply Geography) but this map lacks AreaMap + readout + `MapLegend` + `area` URL + authority `SearchControl` without a documented reason | `rg 'AreaMap\|MapLegend\|onArea\|Find an authority' web/src/brand/<sector>` · compare map views |
| **S16** Domain sources | Explorer `load` for a domain uses a series id not listed in `DOMAIN_SOURCES[domain]` (or sector equivalent) | `domain-sources.ts` vs `load.ts` / `loadFiltered(` / `sourceAllowed` |
| **S17** Cloud Ready | Ready series or pack still required from laptop `data/` for production UI; `store=files` fallback on Ready path | `rg 'store=files\|readFile\|data/housing/\|data/energy/' web/src` (API client + loaders); Ready must come from API / Storage packs |

### Menus × served data (added 2026-11-10 after the Housing menu review)

Code review alone missed every one of these: a menu can be wired, styled and in the URL
and still open on an empty chart. **Build a menu table first**, one row per control:
domain › view · label · URL key · default · options source (hard-coded / derived) ·
what it drives (lines · stack · RankBars · ChangeRows · map · table · layout switch ·
one-place instrument). Then check each row against the **served** data — local API
`/indicators/<id>/observations?limit=10000` (`dimensions`, `period_start`,
`available_dimensions`), `/packs/<id>`, or Postgres current release — never the
laptop CSV. Split large sectors across parallel read-only agents by domain; verify
their top findings yourself before reporting (one agent called intended `place`
persistence a bug — read the code comment first).

| ID | Fail when | How to catch it (Housing example that failed) |
|----|-----------|----------------------------------------------|
| **S18** Empty options | Any option, or the default, opens on an empty / all-zero / "not published" stage | For each option × view, count rows the stage would draw at its default period. Defaults must be the **last period with data for that measure**, not the newest period in the file (Prices map new build/sales volume opened on Aug 2026 with 0 of 374 areas; data ended Jun) |
| **S19** Pooled periods | Year/quarter menu built from the union of several series, or from a sibling series | Options must come from the **selected** measure × breakdown (Condition pooled 11 measures; EPC "A–C share" took its quarters from lodgements). Footer slice must use the same list |
| **S20** Missing as zero | Absent value defaulted to `0` (`?? 0`, `a: 0` init) then drawn or divided | `rg '\?\? 0\b\|: 0, b: 0' web/src/brand/<sector>` near chart maths — missing must be unshaded / "not published" (EPC drew 0% for every council in 7 of 8 quarters) |
| **S21** Options vs view | One option list reused across views that cannot all draw it; a pick silently ignored while the title shows it | Filter options by what the view publishes (`isPublished`-style check), coerce the URL value, hide the menu when one option remains (Renting Property on Annual change/Index; By size ignored "Detached") |
| **S22** One-option menus | Menu with a single option, or `onChange={() => undefined}` | Render a fixed label (`UnavailableControl` with "… only") instead (Quality Energy tenure/period; Pathways quarter with a place) |
| **S23** Multi-select rule | Multi where choices are not lines on a time chart; >5 series; adding a series changes the form; cap enforced in the menu but not in URL parse | Multi only for TimeChart lines/stack layers; maps, one-period RankBars, layout switches, one-place instruments stay single. `rg 'MAX_[A-Z_]*PLACES\s*=\|MultiMenuControl'` — cap = 5 in menu **and** parser. Count lines per chart: >5 → group with a partition check (parts sum to total every period) + Notes "Exchange grouping" (Affordable products drew 7 lines; Renting Map/By size took several places) |
| **S24** Loaded but not offered | Served geographies / series / dimensions no menu reaches | Diff `available_dimensions` and geography codes vs menu options. Watch aggregate filters (`AGG = new Set([... "E92000001"])` dropped England), loader fields nothing renders (`taByType`), Data tabs listing a subset, packs with regions the chart ignores, locked latest-year views with full history served |
| **S25** Stale reference lists | Search/place list from an old boundary set; an endpoint guard rejects current codes | Compare against current ONS LAD (Land Explorer used 2022 councils: 17 abolished, 4 unitaries unreachable; `query_place` raised "not in the 2022 list"). Also check the list is in Storage, not only on disk |
| **S26** Honest availability | A feature flag/`available` reports true while the table or pack is empty | Hit the meta endpoint and the table count (Price Paid: `available: true`, 0 rows in Supabase) |
| **S27** Plain labels | Codes or acronyms in option labels, menu labels or figure notes | `rg '\(P\)\|\(CPI\)\|EPC\b\|EHS\b\|HHSRS\|P120\|Instrument"\|Section"\|Ledger"\|· \$\{.*level'` on controls; source titles are fine in the source line, not in menus |

Also check, per row: **figures follow the controls** (FigureStrip and Notes read the same
selected year/place as the stage — Supply Geography showed 2024–25 figures over a 2015–16
stage) and **URL keys** shared between views/domains are either documented persistence
or cleared on change (Quality views leaked `qy`/`qf` and showed a false Reset).

**Phone width (Responsive, every mode):** measure, don't eyeball. Desktop headless
`--window-size` will not go below ~500px and crops, so screenshots lie. Use DevTools
Protocol device emulation (`Emulation.setDeviceMetricsOverride`, width 390, `mobile: true`),
wait for render, and compare `document.documentElement.scrollWidth` with the viewport;
list the outermost elements whose right edge exceeds it. Housing failed at 890px because the
narrow shell used `grid-template-columns: 1fr` (min-content of the plate strip) — fixed with
`minmax(0, 1fr)` + `min-width: 0` on the rail.

**Hand-off to Validation (not this audit):** a breakdown that should partition a total
but is missing parts in the time series (TA by type had 3 of 6 types because the
connector's header keywords did not match the file) is a connector bug — file it, with
the "parts sum to total per period" check as the test.

## Visual matrix (Modes A/B/C only — after sweeps)

Do not re-litigate S1–S27 here. Check what sweeps miss:

- **Shell** — SectorPage loud line; rail Ready / prep; compact rail; breakpoints.
- **Type / tokens** — Caslon / Geist / Geist Mono / Archivo; Electric / Paper / Union; Signal live-only; 8px rhythm; square corners.
- **Order** — Crumb → question → tabs → figures → ControlRow → Stage → one Notes foot → follow.
- **Voice** — British English; sentence-case titles; roles shared even if copy length differs.
- **Responsive** — rail, tabs, focus ring, reduced motion; narrow wrap; no overflow (measured at 390px via emulation — see S18–S27 note).

Canonical vs forks: prefer locked docs when Housing and Energy disagree.

Energy domains (B/C hint): Generation · Use · Prices · Oil & gas · Imports · Low carbon · Networks · Output · Jobs · Policy — verify views against the canvas, not memory.

## Procedure & output

1. Announce mode + inventory.
2. Run **S1–S17** (S12–S17 N/A only when the sector truly has no Follow registry / no gaps / no maps / no domain-sources file — say so), then build the menu table and run **S18–S27** against served data.
3. Modes A/B/C: domain × view matrix (shell slots only) + browser sample.
4. Classify: system inconsistency · intentional variation · possible improvement · not inspected.
5. Priority: **P0** blocks Gate/expansion · **P1** before finish/next sector (incl. sweep fails) · **P2** polish.
6. Report and stop.

**Report**

1. Verdict (mode question; Mode S: “Sweep clean” / “N fails”).
2. Coverage + Not inspected.
3. Sweep table (S1–S27) + the menu table (one row per control).
4. What’s consistent.
5. Inconsistency matrix (ID · where · issue · canonical · P0–P2 · file).
6. Intentional variations to keep (incl. labelled gaps kept as gaps).
7. Minimal fix plan — **do not implement**.
8. Gate ticks below.

## Gate ticks

**A** — Sweeps clean (or triaged) · shell/type coherent across Housing · unique graphics free · desktop+mobile · S10 docs agree · findings documented.

**B** — Sweeps on finishing tree · Explorer slots match Consumption/Housing · custom instrument one ink if any · URL+Reset · EmptyStage · Follow where Ready · no P0/P1 vs references · exceptions listed.

**C** — Sweeps on each tree · shared shell · no pigment/tab fork · drift triaged to one canonical each.

**S** — S1–S27 done · menu table attached · each Fail has file + canonical · no edits.

### Housing Gate 2 / Energy-frame close (Mode S or A after polish)

Use when the owner says Gate 2 is done and wants the repetitive polish pack checked once:

- [ ] S11 Energy frame pack pass on every live domain × view (or Fail listed)
- [ ] S12 every Ready view has a primary Follow (or intentional exception)
- [ ] S13 every documented labelled gap appears in UI honesty copy
- [ ] S14 stocks and flows stay apart in figures and Notes
- [ ] S15 map views share atlas chrome (or documented thinner map)
- [ ] S16 `DOMAIN_SOURCES` covers what `load` pulls per domain
- [ ] S17 Ready instruments load from cloud without laptop files
- [ ] S18–S22 every menu option and default opens on data for that measure; no pooled periods, no missing-as-zero, no one-option menus
- [ ] S23 multi-select only for lines/layers, ≤5 in menu and URL, form unchanged when adding
- [ ] S24–S26 nothing loaded is unreachable; reference lists current; availability flags honest
- [ ] S27 plain labels in menus and figure notes
- [ ] Phone width measured at 390px: `scrollWidth` = viewport on every domain
- [ ] Verdict states Gate 2 ≠ Gate 4

## Examples

```text
Mode A: Housing baseline before next sector. Read-only.
Mode B: Energy › Prices finishing — vs identity + Consumption. Read-only.
Mode C: Housing vs Energy drift on Explorer slots.
Mode S: Housing usual checks — Energy frame, sources, Notes, Follow, labelled gaps, atlas, cloud.
Mode S: Housing Gate 2 polish pack — S11–S17 only if S1–S10 already green.
Mode S: Energy menus — build the menu table, S18–S27 against the local API, phone width.
Re-audit Mode B Prices — previous P1s only.
```
