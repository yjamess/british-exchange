# British Exchange — visual identity (v1 · One ink, drawn by instruments)

**Product:** [British Exchange (Notion)](https://app.notion.com/p/406654717685802987ffce671c6844e8)
**Tokens:** [`web/src/brand/brand.css`](../web/src/brand/brand.css) (class `.bo`, applied by `BrandRoot`)
**Fonts:** [`web/src/brand/fonts.ts`](../web/src/brand/fonts.ts) · **Plates:** [`web/src/brand/Plate.tsx`](../web/src/brand/Plate.tsx) + `web/public/brand/plates/`
**Reference page:** British Exchange Identity artifact — https://claude.ai/artifact/GtitrCz1unhu2dE3GDgaTM (private to the owner until shared)
**Plate generator:** `.claude/skills/observatory-imprint/scripts/halftone-plates.py`

Replaces v0.2 "Instrument + Imprint" (Admiralty/Portland, sector pigments, heavy condensed display). Legacy `--bo-*` names still resolve, mapped onto the v1 values, so existing pages render until they are rebuilt.

## Idea

Britain as a living system. Every public number, connected. The site is printed in **one electric ink on paper**. Its imagery is engineered drawings of the country's real machinery — towers, turbines, pylons, homes — rendered in 3D and screened through a coarse halftone, like plates in a technical journal. Some plates are **generated from the data itself**. Type stays quiet so the drawings can be intricate.

## Colour (locked)

| Token | Name | Hex | Role | Contrast on paper |
|-------|------|-----|------|-------------------|
| `--bo-electric` / `--bo-ink` | Electric | `#0618F5` | The one ink: headings, rules, marks, chart lines, every plate | 8.4:1 |
| `--bo-paper` | Paper | `#FDFDFF` | The sheet | — |
| `--bo-union` / `--bo-text` | Union | `#012169` | Running text, night plates, index and deep sections | 14.5:1 |
| `--bo-signal` | Signal | `#FF3347` | Live status only: the Live indicator and focus rings. **Not in charts** (the latest point is a labelled ink ring). Never text, never behind text | 3.6:1 (marks only) |
| `--bo-lavender` | Lavender | `#9C9EFF` | Film highlights; muted index type on Union (6.1:1) | — |

### Muted grounds and chart tones

| Token | Name | Hex | Role | Contrast |
|-------|------|-----|------|----------|
| `--bo-sage` | Sage | `#D5DCCB` | Green ground: flat section or panel backgrounds (`.bo-on-sage`) | Union 10.5:1 · Electric 6.1:1 |
| `--bo-straw` | Straw | `#E9DCB0` | Mustard ground: flat section or panel backgrounds (`.bo-on-straw`) | Union 10.8:1 · Electric 6.2:1 |
| `--bo-green` | Green | `#56755A` | Chart series and dot fills (`.bo-tint-green`) | 5.1:1 on paper |
| `--bo-mustard` | Mustard | `#A8852C` | Chart series and dot fills (`.bo-tint-mustard`) | 3.4:1 on paper (marks only) |

- Grounds are backgrounds, not inks: type on sage/straw is Union (or Electric for headings), rules and marks stay Electric.
- Categorical line comparisons use distinct chart-only colours: Electric, Ochre, Union, Verdigris and Plum (`--bo-chart-1…5`). These colours apply to traces, marks and matching legend/readout swatches only; page chrome and text retain the brand inks. Green and mustard remain available for existing statistical fills. Line charts have no decorative fill. Supplied statistical range bands are identified separately (see Charts).
- Decorative motion may use mustard (e.g. the Housing explorer's corner cloud), behind content on solid paper, never inside a plot.

- **One ink per surface:** electric on paper, paper on flat electric, paper/lavender on Union, or Union/electric on a sage or straw ground.
- **Tints are dots, never opacity.** Area shading in charts and UI uses the halftone screen (`.bo-tint-30`, `.bo-tint-60`, SVG dot patterns at 45°). Solid ink mixes (`--bo-ink-20` etc.) are for hairlines and chrome only. Type is never faded.
- Sector pigments are retired. `--bo-sector` now resolves to ink.

## Type (Caslon + Geist)

| Role | Face | Setting | Token / utility |
|------|------|---------|-----------------|
| Headlines | Libre Caslon Display | 400, sentence case, −0.01em | `--bo-f-head`, `.bo-hero` `.bo-d1–3` |
| The loud line + wordmark | Libre Caslon Display | 400, capitals; **one per page** | `.bo-statement` |
| Reading + UI | Geist | 400, 16–20px | `--bo-f-body` |
| Labels, data, notation | Geist Mono | 500, 11px caps, tracked | `--bo-f-data`, `.bo-label` |
| Figures | Archivo, condensed (wdth 62) | 300, tabular | `--bo-f-fig`, `.bo-fig` |
| Index | Archivo, condensed | 400 caps, two-tone (lavender run, paper keyword in `<b>`) | `.bo-caps` |

Headlines read as captions to the engravings, not slogans. Heavy capitals are reserved for the wordmark and one statement per page.

## Plates

One mask PNG per plate (ink as alpha), printed in token colours by `<Plate>`:

| Treatment | Look | Use |
|-----------|------|-----|
| `print` | Electric on paper | Default for every plate |
| `night` | Union on electric | Imagery only (low contrast) — dark sections |
| `negative` | Paper on electric, tones reversed | Section breaks only, sparingly |
| film *(motion only)* | Lavender highlights on electric, live grain | Moving loops — see Motion |

Treatments are imagery treatments, **not reading themes**. Copy over a plate always sits on a solid panel (`.bo-panel`, or flat electric/union) at full contrast.

Catalogue (`PLATES` in `Plate.tsx`): globe (the Exchange), cooling towers, offshore wind, terrace, land plots (cadastral), tower block, pylons, regional house prices (data-generated). Wide (`l-`, 2400×1350) and portrait (`p-`, 1060×1768) cuts. Dwelling-type specimens (`DWELLING_PLATES`: detached, semi-detached, terraced, purpose-built flat, other) are one matched set — same camera, light, ground and scale — so buildings compare at true relative size; drawn by `dwelling-types.py`. Tenure specimens (`TENURE_PLATES`: owner = sealed deed, private = door key, social = letterbox bank) are tenure instruments, not building form; drawn by `tenure-types.py`.

Uses: hero, full-bleed section background (monumental), card header, card fill with a solid label tag.

### Data-generated plates

Where possible the art is drawn by the numbers it describes. Each data plate **carries a source line like any chart**: publisher, series, period, release, link, Exchange indicator id. First example: `regionalHousePrices` — twelve engraved ridges, one per region/nation, height = UK HPI average price monthly, Jan 1995 – Aug 2026 (HM Land Registry / ONS, Aug 2026 release).

Regenerate from the API:

```bash
# fetch observations (API on :8000), then draw
curl "localhost:8000/indicators/house-prices-by-region/observations?limit=10000" -o data/house-prices-by-region.json
uv run .claude/skills/observatory-imprint/scripts/halftone-plates.py web/public/brand/plates \
  --bare --mask --only regions --size 2400x1350 --prefix l- --data data
```

## Motion

Plates can move, and large fields can breathe. Components live in `web/src/brand/motion/`; how to use and extend them is in the **exchange-motion** skill (`.claude/skills/exchange-motion/SKILL.md`); live check at `/design-lab/motion`.

- `<HalftoneMotion>` — a tone-frame atlas (e.g. one 120° rotor cycle, `turbine-atlas-4x6-768x432.jpg`) screened live on the GPU as **halftone** or **film**.
- `<DitherField>` — large ASCII-style fields: **dots** (ordered Bayer dither on a strict grid) or **numerals** (digits by ink coverage; data fields type real values). Fields: cloud, globe, ridges(real series).

Rules: reduced motion shows a still frame; pause off-screen; ≤24 fps; tone from density only; copy sits on solid panels above motion; one monumental motion per page; never inside a chart plot. GSAP is installed for orchestration; UI scramble/menus at `/design-lab/ui-motion` (see the skill).

## Instrument language

Recurring marks, **each plotted from something real** and labelled with what it measures:

fine rule (1px on the 8px baseline) · coordinate mark (a real place, e.g. Ratcliffe-on-Soar 52.86°N 1.26°W) · registration cross (a plate's corners) · measurement ticks (one per period that exists in the data) · contour lines (iso-lines through a real surface) · plotted points (dots only at observations).

Line language, in marks and charts: **solid** = observed · **dotted** = provisional · **dashed** = not observed, gap or reference. Gaps stay visible, never smoothed.

## Composition

Twelve columns (`.bo-grid`, max 1320px, 8px rhythm, square corners). Each section picks one mode:

- **Quiet** — wide margins, one text column, one small figure. Most of the site.
- **Monumental** — full-bleed plate or one huge figure, at a threshold. At most one per page.
- **Index** — dense condensed two-tone capitals on Union with dotted dividers, for sector menus.
- **Explorer** — the sector data canvas, canonical in `web/src/brand/template/` (`SectorPage` + `Explorer`, imported from `@/brand`; lab: `/design-lab/housing-canvas`):
  - *Index rail* on paper: one photo-reference plate per research domain (`REF_ICON_PLATES`), numbered `01…`, grouped Ready / In preparation, fixed 4.5rem rows. Current = negative plate + 3px ink bar on the rail edge. Condenses to plates only (GSAP width tween; reduced motion instant).
  - *Instrument frame* for every domain, in this order: crumb · question (Caslon, sentence case) · view tabs → figures strip → labelled controls (Place / Measure / Period, one row) → stage (figure bar “Fig. n” + title + span/geography · plot · **one** Notes foot). No separate Coverage facts strip under the stage (Housing does not use it).
  - *One Notes foot:* `FigureRecord` or `SourceLine` on `<Stage foot={…}>`. Definition, method, derived totals and caveats live there. Never a second Notes under the stage, and never patent detail callouts inside the plot. Housing is the reference.
  - *Source line grammar (every sector):* `Publisher · series · [Boundaries: …] · geography · [period / as at / release]`. Separate publisher from series with a middle dot (`MHCLG · Live Table 104`, never `MHCLG Live Table 104`). Drop empty parts (`formatSource` in `web/src/brand/template/Explorer.tsx`). Multi-publisher Data tabs list each publisher once, then the series. Full academic citations are for Data provenance desks only — not chart feet.
  - *Under the frame:* Notes foot first, then Next reading (`<Stage follow={…}>`) below a hairline. Both start level with the stage border. The hairline draws once from the left edge the first time it scrolls into view; type never moves; reduced motion shows it drawn. Lab: `/design-lab/under-stage` (B).
  - *Multi-chart stages:* separate plots with `<section>` + `explorerClasses.stageTitle` (sentence case, weight 400), as in Housing supply Pipeline. Prefer `<h3 className={stageTitle}>` (or `<p>`); do not use a bare heading level without the class — browser bold on `h4`/`h5` is not a brand face. Do not title charts with `.bo-label` “FIG. 1 · …” caps.
  - *View tabs* are joined square rectangles: selected and hover are the same solid ink block, with paper type. No underline tabs, no rounded cards.
  - Every state fills the stage at the same size (chart, table, map, in preparation). Derived measures say so in the Notes foot. State lives in the URL.
  - **Selection is one mark.** A chosen tab, chip, or starting place is solid ink with paper type. Hover is that same solid ink block. Focus is a Signal ring. A chosen row in a long list is an ink rule, not a tinted wash. Nothing selected is faded.
  - *Data tab:* observation / series tables (`explorerClasses.tableGroup` + `stageTitle` + `table`). Reference: Housing Land Data, Energy Generation History/Data. Never a “Ready catalogue records” link list as the body; no `data/...json` paths on screen. Empty Ready → In preparation stage.
  - *Exact values / Exact register:* closed disclosures only (TimeChart Exact values; brand `ExactRegister` under a Decision Ledger).
  - *Policy / event domains:* brand Decision Ledger (`web/src/brand/policy/`): electric closed slab → paper open → catalogue card (story left, label/value register right). Import; do not fork. Lab reference: `/design-lab/policy-ledger` Interior 3.

### A new sector (locked)

Housing & Land is the reference page, not a second design. The next sector copies the shell and brings its own questions and series.

**Copy, do not restyle**

| Piece | Where | What it is |
|-------|--------|------------|
| Page | `SectorPage` | Mast, hero plate, sector name on a solid ink strip under the plate. The sector name is the one loud line. |
| Canvas | `Explorer` | Left rail of domains, then crumb, Caslon question, view tabs, figures, controls, stage, source line (`formatSource` grammar above). |
| Charts | `TimeChart`, `RankBars`, `ChangeRows` | Pass data and a form. Ranked bars are solid ink, the same ink as the first line on a time chart. |
| Data | `tableGroup` / Land Data / Generation Data | Observation tables. Catalogue links live in Notes, not as the Data body. |
| Policy | `DecisionLedger`, `CatalogueDossier`, `ExactRegister` | Electric slab + catalogue card. One shared module for every event domain. |
| State | The URL | `domain`, `view`, and the controls. A shared link opens the same picture. |

Import them from `@/brand`. Wrap the route in `BrandRoot`. Lab: `/design-lab/housing-canvas`.

**Start from configuration.** Every sector except Housing is one entry in `web/src/brand/sector-pages.ts` (name, couplet, hero plate, domains with their catalogue series), served by `SectorTemplate` through the single route `app/[sector]`. A domain shows "In preparation" with its series listed until its stage is drawn. A domain without a drawn rail plate shows a numbered proof tile (dot screen), never another sector's plate.

**Add inside the stage only**

A sector may draw one instrument the template does not have (a map, a cutaway, a process). It still uses this type, these tokens, and the selection mark above. It does not invent a palette, a tab shape, or a chart style. Housing's land map, supply machine, and home cutaway are examples of that, not parts of the shell.

## Interaction and motion

Lab: `/design-lab/housing-canvas`, toggle 5 → **Carriage**. One ink. Hover of a choice is the solid ink block. No fades.

- **Dual scramble** (`web/src/brand/motion/DualScramble.tsx`). Text decodes in two phases: characters arrive left to right as instrument ASCII, then resolve left to right to the real text, in one colour throughout. It is the hover state for tabs, rail labels, place toggles and menu options, and figures run it when their value changes. Triggers: scroll (default), hover, click, load and manual. `ScrambleGroup` staggers a set from one trigger. The stacked-span DOM gives zero layout shift, screen readers get the real text, and with reduced motion it resolves instantly.
- **Ink carriage.** The selection is one solid block that travels between view tabs (GSAP, `power3.inOut`, about 550ms). The rail's 3px bar travels between rows the same way.
- **Loupe.** Hovering a rail row magnifies its plate's halftone around the cursor (the mask scales to 240%; the box stays put).
- **Menus** (`web/src/brand/PrintSelect.tsx`, Base UI). The trigger is a value on a rule with a drawn caret, and goes solid ink when open. The panel is square and ink-ruled. The highlighted option and the selected option are the same solid ink block, with paper type. Base UI handles keyboard, focus and positioning.

## Charts (template for every sector)

One component draws every time series: `TimeChart` in `web/src/brand/instrument/TimeChart.tsx` (snapshots: `RankBars`; geography: the map stage). Sector pages pass data and a form; they do not restyle charts.

**Pick the form from the data**

| Data | Form | `TimeChart` props |
|------|------|-------------------|
| Any level or rate over time — one place or several (price, rent, ratio, annual change) | Clean line; extra places/variants add lines with end labels | default (`zero` when zero is meaningful, e.g. change) |
| Counts per period (completions, decisions, sales) | Columns | `kind="bars"` |
| Shares of a whole over time | Stacked share | `kind="stack"` |
| Sparse annual series (≤60 points) | Line with rings at observations | `marks` |
| One period across places or categories | Ranked bars, solid ink | `RankBars` |
| One headline series and how far places spread around it | Line within a lavender screened range band (e.g. 10th–90th percentile of local authorities); band edges named in the margin, derivation in the source line | `band={{ lo, hi, loLabel, hiLabel }}` |
| How far each place moved between two periods | Start → latest rows: open ring = first period, ink dot = latest, reference row (e.g. England) on top | `ChangeRows` |
| A two-way table (e.g. income percentile × price percentile) | Grid in five stepped solid tones with a key; dark steps carry paper type; one highlighted reference cell | — (see `WhoCanAfford`) |

**Marks**

- **Cohesion:** a chart keeps its form when the reader adds a place, measure or period. Adding a series adds a line; it never switches the fill, the form or the grid.
- **Clean line (direction A):** no decorative contours or baseline fill. Every trace represents observations. Statistical range bands may remain only when supplied with named bounds; they are not decoration. Solid = observed, dotted = provisional, missing periods remain gaps.
- **Inspection:** shared period guide by pointer, touch or keyboard; unavailable values are explicit. All charts expose an exact-value table for the plotted series and period. Series selection belongs to the explorer controls above the chart. The chart displays all selected series together with labels; it does not add a second selector or layout toggle.
- **Comparisons:** never plot applications and dwellings on the same axis. Label units and reporting periods; use separate panels for incompatible measures. Headline figures outside a filtered period must say latest available.

- **Series order:** Electric (#0618F5), Ochre (#B45F06), Union (#012169), Verdigris (#00796B), Plum (#8E2C74). Prefer four series; a fifth is supported. Assign colours by series identity and retain assignments while the reader adds/removes places. Use equal 2px lines and direct end labels for up to five series on wide plots; narrow screens use a labelled legend. More than five retain all observations but disclose colour reuse.
- **References:** Slate (#5A6072), dashed, only for series explicitly marked as references. An ordinary third series uses Union; national totals are not automatically classified as references.
- **Range bands:** Lavender (#9C9EFF) dot screen only between supplied, matched lower/upper observations. Break bands at missing periods; never fabricate a confidence interval. Lavender is not a line or reading-text colour on paper. Reference and provisional conventions are labelled.

- **Columns:** solid ink; provisional periods in 45° pen hatching. Stack layers: Electric, Green, Mustard, then hatching, separated by paper hairlines, labelled with paper tags.
- **Rings:** small open rings at observations only for sparse series (≤60 points); dense series stay a clean line.
- **Latest point:** an open ink ring on the first series' last observation. Latest value and series names live in `SeriesLegend` under the plot so the plot fills the stage. End-of-line leaders (right gutter) are opt-in only — `leaders={true}` — never the default; a reserved empty gutter is what makes charts look shorter than the frame. Labels never sit on the line or the engraving. No Signal red in charts: every mark explains itself.
- **Series key:** line and stack charts use `SeriesLegend` under the plot for names and latest values. Never a bordered card; never in-plot stack tags. Do not patch empty right strips view-by-view — fix `leaders` / `chartMargins` at the instrument.
- **Grid:** solid hairlines in `--bo-ink-10`; zero line and axis in ink. Line language still holds: solid observed, dotted provisional, dashed not observed.
- **Grids:** stepped solid ink mixes (5 steps with a key), not dot density; values are printed in the cells.
- Never put a plate, dither field or texture inside a plot.

**Motion** (built into `TimeChart` and `RankBars`, on by default; `motion={false}` opts out; helpers in `web/src/brand/instrument/motion.ts`; lab `/design-lab/chart-motion`)

- **Draw on:** the first time a chart is half on screen, lines and stacks are printed left to right by a hairline carriage that reads out the period it passes; the latest ring and end labels appear when it arrives. Columns and ranked bars are set one after another, rising from the baseline, each easing to rest with no overshoot. Once per page view; ranked bars set again when their values change.
- **Retime:** when the period, place or measure changes, the axes travel to the new domain (about 650ms) and the marks stretch with them. The form never changes.
- **Inspect:** no motion. The period guide, its marks and the readout snap to the observation under the pointer or key; never glide the guide or tick a value under it.
- Server render, no JavaScript, printing and reduced motion all show the finished chart. Motion moves marks only: no fades, no texture.

## Rules

1. One ink per surface.
2. Tints are dots, never opacity; type is never faded.
3. Text on solid ground; plate treatments are imagery, not themes.
4. Quiet type, one loud line.
5. Marks are measurements; gaps stay visible.
6. Data can draw the art — and then it carries a source line.
7. Wrap pages in `BrandRoot`; no parallel palettes. Change the identity only by updating this doc and `brand.css` together.

## Migration from v0.2

- Legacy tokens (`--bo-ink`, `--bo-paper`, `--bo-signal`, `--bo-f-display`, `--bo-f-editorial`, `--bo-f-text`, `--sector-*`) are aliased to v1 values; pages render but are not yet redesigned.
- Remove hard-coded hexes left in older components (`#0d1258`, `#f0ede5`, `#b07c2c`, greys) as each page is rebuilt.
- Retire `Penwork`/ASCII imprint pieces from v0.2 in favour of plates; large ASCII motion is under exploration on the identity page, not yet part of v1.

## Source layout (shared template)

`Stage` groups a bordered figure/table with provenance outside the border. `SourceLine` defaults to one quiet row: an expandable “Sources & notes” summary with publisher names and dataset count, plus one “View data” action on the right. Full titles, releases, individual dataset links, coverage and methodology appear inside the disclosure, with aligned labels and natural wrapping. No repeated SOURCE headings or long citation paragraphs in the default view. On narrow screens publisher text wraps below the summary and notes stack. Domains supply metadata to the shared component, not custom layouts. Expanded stages retain the external block.
