---
name: structural-consistency-audit
description: >-
  Read-only structural and visual QC for British Exchange sector explorers.
  Use before expanding to a new sector, or when finishing a sector/domain after
  styling work (e.g. Energy Prices Gate 4). Compares shell, Explorer grammar,
  typography, controls, Notes, legends and source UI against the locked identity.
  Does not audit datasets or redesign unique instruments.
---

# structural-consistency-audit

Quality-control pass for The British Exchange. **Not** a redesign, data audit,
accessibility certification, or refactor.

**North star:** Consistent grammar, flexible expression. Domain-specific
graphics stay distinct; the surrounding interface must feel like one carefully
authored publication.

## Modes (pick one from the user request)

| Mode | When | Scope | Verdict question |
|------|------|-------|------------------|
| **A — Housing baseline** | Before starting a *new* sector | All Housing domains + modes | Is Housing cohesive enough to template the next sector? |
| **B — Finishing sector / domain** | After styling or Gate 3–4 UI on a live sector (e.g. Energy › Prices) | Named sector; domain-by-domain; **cross-check against Housing + nearest approved Energy canvas** | Is this sector/domain structurally ready to mark complete / Gate 4? |
| **C — Cross-sector drift** | After many parallel canvas edits | Housing + Energy (and any other live sectors) side-by-side on the same slots | Have live sectors drifted from the locked Explorer grammar? |

If the user says “when this sector is finished” or names Energy / Prices / a
domain, default to **Mode B**. Do not run a Housing-only audit when they asked
to close Energy.

## Explicit boundaries

- **Read-only by default.** Inspect code, rendered views, screenshots. Do not
  edit, move copy, change components, implement fixes, update data, or commit
  unless the user explicitly authorises work *after* the audit report.
- **Do not** audit data accuracy, provenance, calculations, ingestion, APIs, or
  registry completeness (reviewed separately).
- **Do** inspect placement and visual treatment of attribution, definitions,
  date/geography qualifiers, legends, and controls — not the factual content.
- **Do not** standardise bespoke diagrams, maps, cutaways, receipts, or
  narrative instruments — only their scaffolding and surrounding chrome.
- **Do not** propose dashboards, generic component-library defaults, or forcing
  every view into identical chart layouts.
- Prefer proven shared patterns over new abstractions invented for the audit.
- **No speculative findings.** Unobserved routes/states → **Not inspected**.

## Locked sources of truth (re-read every audit — styling moves)

After the v1 identity and Explorer shell lock, these are canonical. Do not
infer grammar from an older canvas that still carries retired patterns.

1. `docs/visual-identity.md` — Colour, type, Explorer, Charts, Rules.
2. `.cursor/rules/explorer-stage.mdc` — One Notes foot; multi-chart titles;
   briefs do not override the shell.
3. `.claude/skills/exchange-domain-view/SKILL.md` (and `.cursor` mirror if
   present) — Frame order, body stack, do-not list (no body method essays,
   no jargon, `leaders={false}`, etc.).
4. Tokens / wrap: `web/src/brand/brand.css` (`.bo`), `BrandRoot`.
5. Shell: `web/src/brand/template/` (`SectorPage`, `Explorer`, `ExplorerHead`,
   `FigureStrip`, `ControlRow`, `MenuControl`, `Stage`, `FigureRecord` /
   `SourceLine`, `EmptyStage`).
6. Instruments: `web/src/brand/instrument/TimeChart.tsx` (`TimeChart`,
   `RankBars`, `ChangeRows`, `SeriesLegend`).
7. Sector config: `web/src/brand/sector-pages.ts`.
8. **Reference canvases (in this order for Mode B/C):**
   - Housing pipeline / multi-chart: `web/src/brand/housing/canvas/model.tsx`
   - Energy tab shape (owner-approved): `web/src/brand/energy/ConsumptionCanvas.tsx`,
     `ConsumptionAppetite.tsx`
   - Generation explorer: `web/src/brand/energy/GenerationCanvas.tsx`
   - Domain under audit (e.g. Prices): `web/src/brand/energy/PricesCanvas.tsx`
9. Lab only (not production grammar): `/design-lab/*` — cite only to contrast;
   never treat Lab as the sector baseline.

Retired / flag as drift if still present on a live sector stage:

- Sector pigment palettes or parallel tokens under `web/src/styles/tokens.css`
  for new pages
- Second Notes / `SourceLine` below the stage
- Explorer `<Coverage>` facts strip on domain stages
- `.bo-label` “FIG. 1 · …” chart titles
- In-plot series selectors, layout toggles, or “exact values” drawers
- Method / caveat essays in the stage body (`s.links` explaining the chart)
- Table/note numbers or jargon on public UI (W2, COP, “Exchange calculation”)
- `TimeChart` end leaders on framed stages (`leaders` not set false)
- Multi-series key anywhere except `SeriesLegend` under the plot

## Inputs and baseline discovery

1. Locate the web app (`web/`), sector routes (`app/[sector]`), brand kit, and
   the locked docs above — search the repo; do not assume stale paths.
2. Build the inventory for the chosen mode:
   - **A:** every Housing domain and each view/mode.
   - **B:** every domain in the finishing sector (from `sector-pages.ts`); for
     the domain just finished, every URL `view=` / control combination that is
     shipped; sample at least one earlier approved domain in the same sector
     (Energy: Consumption or Generation) plus one Housing pipeline view.
   - **C:** Housing (2–3 domains) + Energy (Generation, Consumption, Prices at
     minimum) on the same matrix rows.
3. Inspect in the browser where available. Include long/short copy, loading,
   empty, error, rail compact/expanded, desktop and a narrow viewport.
4. Record shared vs forked implementations. Provisional canonical = the locked
   docs + the most consistent live canvas that already obeys them. If Housing
   and an Energy canvas disagree, **prefer the locked docs**; if docs and all
   live canvases disagree, mark an unresolved decision — do not silently pick
   the first page.
5. Inventory before conclusions. Do not extrapolate from two screenshots.

### Live Energy inventory hint (Mode B/C)

Energy domains in `sector-pages.ts` (short labels): Generation · Use
(Consumption) · Prices · Oil & gas · Imports · Low carbon · Networks · Output
(Manufacturing) · Jobs · Policy. Prices explorer views (as shipped) may
include bill / afford / shock / economies / regions / wholesale / data — verify
against `PricesCanvas` / URL state; mark missing views Not inspected.

## Audit dimensions

### A. Page shell and navigation

- Global header, logo, breadcrumbs, sector identity, hero plate / ink strip
  (SectorPage: sector name is the one loud line).
- Index rail: Ready / In preparation groups, plate tiles, current = negative
  plate + ink edge bar, compact vs expanded width, toggle, scroll.
- Content gutter, max-width (`.bo-grid` / template), rail-to-stage relationship,
  breakpoints.
- Same actions in the same place (back, collapse/expand index).
- Domain URL state (`domain`, `view`, controls) preserves identity; do not
  inspect fetch correctness.

### B. Typographic and visual tokens

- **Libre Caslon Display** headlines (sentence case); **Geist** body/UI;
  **Geist Mono** labels/data; **Archivo** condensed figures. (Not “Giest”.)
- H1–H3 / `.bo-hero` / question / `explorerClasses.stageTitle` scale, wrap,
  weight 400 on stage titles, letter-spacing, responsive sizes.
- Colour **roles** from `brand.css`: Electric ink, Paper, Union text, Signal
  (live/focus only — never chart text), chart series tones only in plots.
- Spacing on 8px rhythm; square corners; vertical rhythm of Explorer slots.
- Rail plate crops and size consistency.
- Prefer computed styles / token usage over screenshot-only colour guesses.

### C. Information architecture and copy hierarchy

Locked Explorer editorial order:

**Crumb → Caslon question → view tabs (`ExplorerHead`) → FigureStrip (when
the view has figures) → ControlRow → Stage (title + meta + body) → one Notes
foot.**

- Standardise **roles**, not sentence lengths.
- No repeated explanation (body paragraph restating stage title / Notes).
- Voice: British English; plain; editorial; no padding or unsupported
  superlatives; sentence case for stage titles.
- Public UI: plain words; method and caveats in Notes only.

### D. Definitions and methodology — placement only

Locked placement rule:

- Stage **meta**: short unit / geography / span context.
- **FigureStrip**: three headline measures with short notes.
- **One** `FigureRecord` / `SourceLine` on `<Stage foot>` for definition +
  method + data link.
- No second disclosure under the stage; no patent callouts in the plot.

Flag if the same concept is a top paragraph in one domain, a toggle in
another, and absent in a third without reason. Do not require equal *volume*
of explanation — only the same disclosure logic.

### E. Controls, menus and view modes

- View tabs: joined square rectangles; selected/hover = solid ink + paper type
  (no underline tabs, no rounded cards).
- Filters: `MenuControl` / `PrintSelect` in `ControlRow`; Reset in the same row.
- View switch ∈ main view nav; filter ∈ controls for that visualisation.
- No series/scope selectors inside the plot.
- Absence of an irrelevant control is not an inconsistency.

### F. Visualisation scaffolding — not the marks

- Body: `stack` → `panel` → `stageTitle` → instrument (`TimeChart` /
  `RankBars` / `ChangeRows` / one custom instrument).
- Line charts: `SeriesLegend` under the plot; leaders default off so the plot fills the stage. Flag a reserved right gutter / `leaders={true}` on framed
  stages.
- Empty: `EmptyStage`. Tables: shared table styles, not a parallel design.
- Custom instrument: allowed; still one ink + Housing mark language; own CSS
  module only when needed; must not invent a palette or tab shape.
- Compare overflow/clipping at more than one viewport.

### G. Sources and metadata — UI consistency only

- Publisher / series line via Notes `source`; definition + method bullets;
  catalogue `dataHref` where used.
- Qualifiers (nation, period, “cash” vs “real”) near the figure they govern
  (meta, strip note, or Notes) — check clarity of placement, not factual truth.

### H. Interaction and responsive states

- Rail collapse, tab carriage, focus Signal ring, reduced-motion stills where
  observable.
- Long questions/labels must not collide with chrome.
- Loading / empty / disabled / error: consistent EmptyStage / template
  treatment.
- Narrow viewport: control wrap, stack, no horizontal overflow.

## Procedure

1. **Announce mode + inventory** before findings.
2. **Comparison matrix** — for each domain × view: header; question; tabs;
   figures; controls; stage scaffold; legend; Notes; empty/responsive. File
   refs + screen locations.
3. **Classify each difference**
   - System inconsistency
   - Intentional domain variation (keep)
   - Possible improvement (not a defect)
   - Not inspected
4. **Prioritise**
   - **P0** — Blocks expansion or Gate 4 close: broken shell, inaccessible
     Notes, severe hierarchy/responsive failure.
   - **P1** — Fix before calling the sector/domain finished or starting the
     next sector: repeated heading/spacing/control/Notes/source drift from the
     locked grammar.
   - **P2** — Polish without material reader impact.
5. **Interface Consistency Contract** — short; derive tokens from
   `brand.css` / identity doc; mark unresolved decisions. No invented hexes.
6. **Report and stop.** Wait for explicit approval before any edits.

## Required output format

1. **Verdict** — Ready / Ready with fixes / Not ready + one-sentence rationale  
   (worded for the chosen mode’s verdict question).
2. **Mode & coverage** — Mode A/B/C; domains; views; viewports; states;
   gaps (Not inspected).
3. **What is consistent** — patterns to retain, with evidence.
4. **Inconsistency matrix** — ID · location(s) · issue · canonical pattern
   (doc or file) · priority · file reference.
5. **Intentional variations to preserve** — bespoke instruments (e.g. Dissected
   Bill receipt, Metabolism, Housing cutaway) and why their form stays.
6. **Interface Consistency Contract** — shell slots, type roles, controls,
   Notes, legends, sources, responsive rules (as observed + locked docs).
7. **Minimal fix plan** — dependency order; scope by components/files; **do
   not implement**.
8. **Gate checklist** — pass / fail / not inspected (below).

## Gate checklists

### Mode A — Housing as template for a new sector

- [ ] Shell, rail states, global nav, hierarchy match across reviewed Housing domains
- [ ] Type, spacing, colour roles, responsive text use one grammar
- [ ] Question / orientation / section titles occupy predictable roles
- [ ] Equivalent controls and disclosures match
- [ ] Chart scaffolding, legends, source UI follow common placement when applicable
- [ ] Unique graphics remain free in form without breaking shared chrome
- [ ] Desktop and mobile coherent
- [ ] Findings and exceptions documented; material issues have an approved plan

### Mode B — Finishing a sector or domain (e.g. Energy Prices)

- [ ] Domain uses `SectorPage` / `Explorer` slots in locked order (no parallel layout)
- [ ] View tabs + ControlRow + Stage foot match Consumption / Housing reference
- [ ] One Notes foot only; no Coverage strip; no body method essays
- [ ] `stageTitle` panels; shared instruments; `SeriesLegend` / `leaders={false}` where required
- [ ] Custom instrument (if any) is one ink and does not fork chrome
- [ ] URL state covers view + filters; Reset returns defaults
- [ ] Empty / missing-data states use `EmptyStage`
- [ ] Cross-check: no P0/P1 drift vs Housing pipeline + Consumption (or named reference)
- [ ] Deliberate exceptions listed (e.g. receipt instrument on Prices › bill)

### Mode C — Cross-sector drift

- [ ] Housing and Energy share shell and Explorer grammar on compared slots
- [ ] No sector-specific palette or tab shape has reappeared
- [ ] Notes / controls / figure strip roles align
- [ ] Drift items triaged P0–P2 with a single canonical target each

## Invocation examples

```text
/structural-consistency-audit Mode A: Audit every Housing domain and its modes.
Do not modify files. Inconsistency matrix + minimum fixes before the next sector.

/structural-consistency-audit Mode B: Energy › Prices is finishing after the
styling lock. Audit all Prices views against docs/visual-identity.md,
explorer-stage, and ConsumptionCanvas. Cross-check Generation. Read-only.

/structural-consistency-audit Mode C: Drift check Housing vs Energy (Generation,
Consumption, Prices) on Explorer slots only. Ignore data QA.

/structural-consistency-audit Re-audit Mode B Prices after the approved P1 fixes
only. Confirm previous findings; do not expand scope.
```
