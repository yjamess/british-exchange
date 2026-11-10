---
name: exchange-domain-view
description: >-
  Build or update a British Exchange sector domain view (a tab inside an Explorer
  canvas — e.g. Energy › Consumption › Useful Energy, Generation › History, Housing ›
  Supply). Use for ANY change to a sector page's tabs, controls, stage, charts or
  notes, including "update X to this brief", "add a view", "redesign this chart",
  or a Notion brief section. Encodes the structure the owner has locked: copy
  Housing / Generation / Consumption, never invent a parallel layout.
license: MIT
version: 1.0.0
metadata:
  identity: docs/visual-identity.md
  rule: .cursor/rules/explorer-stage.mdc
  template: web/src/brand/template/Explorer.tsx
  instruments: web/src/brand/instrument/TimeChart.tsx
  references:
    - web/src/brand/housing/canvas/model.tsx
    - web/src/brand/energy/ConsumptionCanvas.tsx
    - web/src/brand/energy/ConsumptionAppetite.tsx
    - web/src/brand/energy/GenerationCanvas.tsx
    - web/src/brand/housing/canvas/land/LandData.tsx
    - web/src/brand/policy/DecisionLedger.tsx
---

# Exchange domain view

The owner has rebuilt pages that strayed from the shell. A brief describes **content and
honesty rules**, not a licence for a new visual system. "Signature design", "woven
ribbons", "instrument-style split flow" in a brief = at most **one** custom instrument
inside the stage, drawn in the house style. Everything around it is the template.

## 0. Read before writing (every time)

1. `docs/visual-identity.md` — Explorer, Charts, Rules. It changes; re-read it.
2. `.cursor/rules/explorer-stage.mdc` — always, every change; check the result against each of its sections.
3. The nearest reference, in this order:
   - **Charts:** `web/src/brand/energy/ConsumptionCanvas.tsx` (Metabolism, End use) /
     `ConsumptionAppetite.tsx`, or `housing/canvas/model.tsx` (pipeline).
   - **Data tab:** `web/src/brand/housing/canvas/land/LandData.tsx` or Energy Generation
     History/Data — observation tables, never catalogue link lists.
   - **Policy / events:** `web/src/brand/policy/` (`DecisionLedger` + `CatalogueDossier` +
     `ExactRegister`) — do not fork slabs.
   - A Housing custom instrument (`supply/SupplyMachine.tsx`, `quality/EnergyView.tsx`)
     — only if the brief needs one and the template cannot draw it.
4. Check the data's **verified coverage** (years, sectors, end uses actually published)
   before choosing controls. Controls offer only what exists.

## 1. The frame is fixed (in the canvas, not the view component)

`ExplorerHead` (view tabs) → `FigureStrip` (3 figures) → `ControlRow` of `MenuControl`s
(+ `ResetButton`) → `<Stage title meta foot={<FigureRecord … />}>` → body.

- State lives in the URL via the canvas `sync()`; add new keys there and to Reset.
- Controls are `MenuControl` (PrintSelect). Series/scope selection belongs here, never
  inside the plot. No in-plot toggles, legends-as-selectors or layout switches.
- **One Notes foot**: definition + method bullets in `FigureRecord`. Never a second notes
  block, never method essays in the body.

## 2. The body is a stack of titled panels

```tsx
<div className={s.stack}>                       // generation.module.css
  <section className={s.panel}>
    <h3 className={t.stageTitle}>Thing · scope · year · unit</h3>   // explorerClasses
    <TimeChart … showTable={false} />   // or RankBars / ChangeRows; leaders default off (full width)
  </section>
  …
</div>
```

Pick the form from the identity doc's table: lines/stack → `TimeChart`; one period across
categories → `RankBars`; two periods → `ChangeRows`; tables → `s.table` or `DataTable`.
Line charts use `SeriesLegend` under the plot for names and latest values so the plot fills
the stage. End-of-line leaders default **off** — pass `leaders={true}` only when deliberate.
Empty states use `EmptyStage`.

## 2b. Data tab and policy bodies

**Data tab** (when Ready series exist):

```tsx
<div className={t.tableGroup}>
  <p className={t.stageTitle}>Series title · unit</p>
  <div className={t.tableWrap}>
    <table className={t.table}>…</table>
  </div>
</div>
```

Reference: `housing/canvas/land/LandData.tsx`. One table per dataset/frequency. Sources stay
in the Stage foot — never `data/...json` paths on screen. If there are no observations yet,
use `EmptyStage` (“In preparation”). **Never** a “Ready catalogue records” link list as the
Data body.

**Policy / event domains:** import `DecisionLedger`, `CatalogueDossier`, and `ExactRegister`
from `@/brand` / `web/src/brand/policy/`. Closed = electric slab; open = paper catalogue card
(Interior 3). Exact register = closed disclosure under the ledger. Do not re-skin or fork.

## 3. Do not

- Do not write a new chart component when `TimeChart` / `RankBars` / `ChangeRows` fit.
- Do not add a new CSS module for a view that only uses shared instruments. Reuse
  `generation.module.css` (`stack`, `panel`, `links`, `table`) and `explorerClasses`.
- Do not invent a second end-label system, numbered markers on axes, in-plot annotations,
  custom legends with values, or turning-point lists — unless the identity doc shows that
  pattern. Keep `TimeChart` leaders off (default) so plots fill the stage. Exact values /
  exact register stay in closed disclosures (TimeChart or brand `ExactRegister`).
- Do not fork Decision Ledger CSS or invent a parallel policy dossier.
- Do not use chart colours for a custom instrument. Custom instruments are **one ink**
  (Electric) with Housing's patterns (stipple / sparse dots / hatch / cross / engrave) to
  separate parts, paper hairlines between, condensed figures, Geist Mono labels.
- Do not invent copy that states causes. Context belongs in Notes with a source.
- **No explanatory notes in the page body.** The UI is public. Do not add `s.links`
  paragraphs that describe the chart ("bars are measured…", "hatched means…"), caveats,
  or method. A legend/key explains marks; the Notes foot holds method in plain words.
  Anything meant for the owner goes in the chat reply, never in the UI.
- **No jargon on screen.** Plain words for the public: "lost" not "rejected", "heat from
  surroundings" not "ambient heat", "%" not "COP", no table or note numbers (W2, Note 7),
  no "pp", no "coefficient", no "Exchange calculation".
- **A custom chart must still look like the site.** Build it from existing grammar first —
  RankBars rows, ChangeRows keys, TimeChart — and only change the mark inside the row.

## 4. A custom instrument (only when the brief asks and the template cannot draw it)

- Lives inside one `section.panel` with its own `stageTitle`, full stage width, its own
  `*.module.css` next to it (as Housing's `supplyMachine.module.css`).
- Drawn from published values on one fixed scale; widths/heights are measured, never
  decorative. Line language: solid observed, dotted provisional, dashed not observed /
  reconciliation.
- Selection = solid ink block; hover = same; focus = Signal ring. No fades, no opacity.
- Motion only via the template's restrained tween (Housing `useTween`), reduced-motion safe.
- Followed by shared-instrument panels for exact comparison.

## 5. Modelled numbers and user scenarios

- Published figures and Exchange-derived figures are labelled differently; derived ones say
  so in the stage meta/title and in Notes.
- A "change assumptions" mode is allowed only when the publisher's identity is reproducible
  from published coefficients — check by recomputing the published values first.
  Outputs are titled **User scenario — not a DESNZ statistic** wherever they appear.

## 6. Verify like the owner will

- `npx tsc --noEmit -p .` and `npx eslint <files>` in `web/`.
- Headless screenshot (user has Arc, not Chrome — no browser extension) of the new tab
  **and** the reference tab at the same width; compare frame, spacing, titles, notes.
  If the new tab looks like a different site, it is wrong.
