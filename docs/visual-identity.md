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
| `--bo-signal` | Signal | `#FF3347` | Live marks only: a latest point, a live dot. **Never text, never behind text** | 3.6:1 (marks only) |
| `--bo-lavender` | Lavender | `#9C9EFF` | Film highlights; muted index type on Union (6.1:1) | — |

- **One ink per surface:** electric on paper, paper on flat electric, or paper/lavender on Union.
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

Catalogue (`PLATES` in `Plate.tsx`): globe (the Exchange), cooling towers, offshore wind, tower block, pylons, regional house prices (data-generated). Wide (`l-`, 2400×1350) and portrait (`p-`, 1060×1768) cuts.

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

Rules: reduced motion shows a still frame; pause off-screen; ≤24 fps; tone from density only; copy sits on solid panels above motion; one monumental motion per page; never inside a chart plot. GSAP is planned for orchestration (see the skill).

## Instrument language

Recurring marks, **each plotted from something real** and labelled with what it measures:

fine rule (1px on the 8px baseline) · coordinate mark (a real place, e.g. Ratcliffe-on-Soar 52.86°N 1.26°W) · registration cross (a plate's corners) · measurement ticks (one per period that exists in the data) · contour lines (iso-lines through a real surface) · plotted points (dots only at observations).

Line language, in marks and charts: **solid** = observed · **dotted** = provisional · **dashed** = not observed, gap or reference. Gaps stay visible, never smoothed.

## Composition

Twelve columns (`.bo-grid`, max 1320px, 8px rhythm, square corners). Each section picks one mode:

- **Quiet** — wide margins, one text column, one small figure. Most of the site.
- **Monumental** — full-bleed plate or one huge figure, at a threshold. At most one per page.
- **Index** — dense condensed two-tone capitals on Union with dotted dividers, for navigation and sector menus.

## Charts

Data chooses the form (line, comb/bars, stacked share, table). Series in ink and ink mixes; areas filled with the dot screen; the latest point may be marked in Signal. Never put a plate or texture inside a plot.

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
