# British Observatory — visual identity

**Product:** [British Exchange (Notion)](https://app.notion.com/p/406654717685802987ffce671c6844e8)  
**Code source of truth:** [`web/src/brand/`](../web/src/brand/)  
**Token file:** [`web/src/brand/brand.css`](../web/src/brand/brand.css)  
**Craft references:** [Hermes / Nous](https://hermes-agent.nousresearch.com/) · [Content Architecture](https://www.contentarchitecture.dev/#pricing) · [every.to](https://every.to/)

This is the locked identity for the **whole Observatory** (eight sectors + investigations). Housing is sector one — the first proof of the shared system, not a separate brand.

## Mission (from Notion)

A beautifully designed, trustworthy home for fragmented British public data. Clean and intuitive by default; depth on deliberate interaction. Branding, typography, layout, motion and craft are **central requirements**, not final polish. Sectors may introduce distinctive views **without fragmenting the system**.

## Personality: Instrument + Imprint

| Mode | Meaning | Where it appears |
|------|---------|------------------|
| **Instrument** | Precise chrome — mono readouts, hairlines, exact units, measured motion | KPI strips, charts, filters, source disclosure, tables |
| **Imprint** | Printed matter — engraving, halftone, stamps, sparse ASCII | Page thresholds only (hero / cover / section hand-off) |

**Rule:** Imprint at the threshold, instrument in the data. Never put stamps, ASCII fields, or halftone textures *inside* a chart plot.

## Steal / don't steal

| Reference | Steal | Don't steal |
|-----------|--------|-------------|
| Hermes / Nous | Ink field + classical/engraved imprint; condensed display; technical chrome beside craft | Generic AI-product blue as brand colour |
| Content Architecture | Warm paper; huge quiet type; mono labels; one decisive surface; “decisions already made” | Pricing-page structure on data pages |
| every.to | Editorial calm; serif for questions; mono for meta/time; sparse hierarchy; one accent for the single important action | Every’s blue; media-homepage layout as the data product |

Product inspirations (behaviour, not skin): State of Britain, SEZ Explorer, PlasticList, Who Funded Genocide.

## Palette (encoded in `.bo`)

| Token | Role | Hex |
|-------|------|-----|
| `--bo-ink` | Admiralty — primary ink | `#0d1258` |
| `--bo-ink-deep` | Ink-on-ink / deep field | `#05072a` |
| `--bo-paper` | Portland — reading surface | `#f0ede5` |
| `--bo-paper-lift` / `--bo-paper-sink` | Raised / recessed paper | `#f7f5ef` / `#e6e1d4` |
| `--bo-signal` | The **one** highlight that matters | `#b3122e` |
| `--bo-sector` | Sector pigment — **imprint only** | Housing default `#b07c2c` |

Charts and series use ink tints (`--bo-ink-80` … `--bo-ink-10`) and signal sparingly. Sector pigment never colours data series.

## Type roles

| Role | Token / utility | Face |
|------|-----------------|------|
| Display / figures | `--bo-f-display`, `.bo-hero` / `.bo-d1`… | Sofia Sans Extra Condensed |
| Editorial / questions | `--bo-f-editorial`, `.bo-ed` | Libre Caslon Display |
| Reading | `--bo-f-text` | Source Sans 3 |
| Data / labels | `--bo-f-data`, `.bo-label` | IBM Plex Mono |

Keep these four roles. Change faces only by updating this doc and `brand.css` together.

## Chart line language

- **Solid** — observed
- **Dotted** — provisional
- **Dashed** — not observed / reference / target

## Chart forms (data chooses the form)

| Data shape | Form | Brand component |
|------------|------|-----------------|
| Level over time | Line | `charts/LineChart` or sector `TrendChart` |
| Flow / counts over time | Comb / bars | `charts/CombBars` or `TrendChart` bars |
| Parts of a whole over time | Stacked share | `charts/ShareArea` |
| Snapshot categories | Bars / table | categorical view |

Never one chart type for everything.

## Sector page pattern (shared shell)

1. **Threshold imprint** — wordmark / mast on ink; hero with one engraved or penwork figure  
2. **KPI instrument strip** — latest Ready figures (sector-wide summary)  
3. **Topics / questions** — progressive disclosure (Overview → Explore → Data)  
4. **Module** — title + **one** geography badge + chart + condensed source (`details`: publisher + measure note + official link)  
5. **No metadata walls** — series IDs, observation counts, licences live in source disclosure, not the chart caption  

Live UI kit: `web/src/brand/`. Wrap pages with `BrandRoot` (applies `.bo` + fonts + `brand.css`).

Lab (`web/src/app/design-lab/`) is experimental. Do not invent a second design system for Energy, Economy, etc.

## Adopting a new sector page

1. Create `web/src/brand/<sector>/` (overview + load) or reuse `sector/` components.  
2. Set `--bo-sector` to that sector’s imprint pigment only (stamp / hero art).  
3. Wrap the page in `<BrandRoot>`.  
4. Follow the sector page pattern above; Ready registry series only.  
5. Do not fork colours or type into a parallel `--sector-*` palette — alias to `--bo-*`.  
6. Distinctive views (maps, special diagrams) are allowed as **modules**, not as a new identity.

Suggested pigments (imprint only): Housing brick `#b07c2c` · Energy (set when shipping) · Economy (set when shipping).

## Non-negotiables

1. Imprint at threshold; instrument in data.  
2. Data chooses the form.  
3. Geography once per module.  
4. Depth is a choice (Overview → Explore → Data).  
5. Shared shell first; sector views second.  
6. No redesign without updating this doc **and** `brand.css`.  
7. Evidence quality beats visual breadth (Notion Dec gate).

## Changing the identity

Edit `docs/visual-identity.md` and `web/src/brand/brand.css` in the same change. Agents must not invent new cream/navy/red systems under `web/src/styles/tokens.css` or `(sectors)/` for new work.
