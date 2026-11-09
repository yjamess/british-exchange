---
name: exchange-motion
description: >-
  Build motion for British Exchange in the v1 brand: live halftone/film loops of
  plates (HalftoneMotion), large ASCII-style dither and numeral fields (DitherField),
  data-driven motion from real Exchange series, and (later) GSAP-orchestrated
  sequences. Use when adding any animation, moving background, loading or section-
  break field, scroll-linked effect, or motion study to a page.
license: MIT
version: 1.0.0
metadata:
  components: web/src/brand/motion/
  ui: web/src/brand/ui/
  lab: web/src/app/design-lab/motion/page.tsx
  uiLab: web/src/app/design-lab/ui-motion/page.tsx
  identity: docs/visual-identity.md
---

# Exchange motion

Read `docs/visual-identity.md` first. Motion follows the same rules as the static brand:
one ink, tone from density (never opacity), data drawn only from real series, copy on
solid panels. Motion is atmosphere at thresholds and in imagery. **Never inside a chart plot.**

Live reference: `/design-lab/motion` (run `npm run dev` in `web/`).

## The kit (`@/brand/motion`)

### `HalftoneMotion`: plates that move

A grayscale frame atlas, screened live on the GPU.

```tsx
import { HalftoneMotion } from "@/brand/motion";

<div style={{ height: 640 }}>
  <HalftoneMotion atlas="offshoreWind" mode="halftone" fallback="offshoreWind"
    label="Offshore wind turbines turning" />
</div>
```

| Prop | Notes |
|------|-------|
| `atlas` | Key of `ATLASES`, or `{ src, cols, rows, frames, frameWidth, frameHeight }` |
| `mode` | `halftone` (45° dot screen, ink on paper) or `film` (deep electric → lavender, live grain) |
| `fps` | Atlas frames per second; frames crossfade, so 8–14 reads smooth |
| `cell` | Screen pitch in CSS px (default 5.5) |
| `paused` | Freeze (e.g. driven by GSAP or a control) |
| `fallback` | `PlateName` shown if WebGL or the atlas fails |

It must sit inside `BrandRoot`, because it reads `--bo-ink`, `--bo-paper` and `--bo-lavender` from CSS.

**New atlas:** add a tone-frames function to the observatory-imprint generator (copy
`turbine_frames`). Make loops seamless: a 3-blade rotor loops after 120°. Render at
`--size 1536x864` (768×432 frames), pack 4 columns wide, keep the atlas ≤ 4096px on each side,
put it in `web/public/brand/plates/`, and add it to `ATLASES`.

### `DensityStrip`: small ASCII accents

```tsx
import { DensityStrip } from "@/brand/motion";

<span style={{ width: 52, height: 44, color: "var(--bo-ink)" }}>
  <DensityStrip progress={0.8} mark="dots" />
</span>
```

Drive `progress` (0–1) from hover/GSAP. Use for nav rows and marks — **not** full-bleed section fields (`DitherField`). Tone from density only; snaps under reduced motion.

### `FlickerFigure`: instrument scramble

Split-flap style: digits tick 0→9 at ~16 Hz, then lock left→right. Non-digits (`£`, `,`, `.`, `×`, `%`, spaces) stay stable. Not random 60fps noise, not an odometer roll of the whole number.

```tsx
import { FlickerFigure } from "@/brand/motion";

<span className="bo-fig">
  <FlickerFigure value="£273,037" />
</span>
```

| Prop | Notes |
|------|-------|
| `value` | Final display string |
| `duration` | Optional total window; default scales with digit count |
| `replayKey` | Bump to replay without changing `value` |
| `className` | Use with `.bo-fig` |

Wrap timelines in `gsap.matchMedia`; reduced motion snaps to the final string. Re-runs when `value` changes (e.g. after a menu pick). Lab: `/design-lab/ui-motion`.

### Menus: `InstrumentSelect` (`@/brand/ui`)

Custom listbox — not a restyled native `<select>` (OS popovers still look empty). Underline trigger + paper panel; option rows densify a `DensityStrip` on hover/focus; selected = ink registration mark. Arrow keys, Escape, click-outside, focus return. Open/close GSAP tween (instant under reduced motion).

```tsx
import { InstrumentSelect } from "@/brand/ui";

<InstrumentSelect
  label="Place"
  value={place}
  options={[{ id: "england", label: "England" }]}
  onChange={setPlace}
/>
```

Lab: `/design-lab/ui-motion`. Promote into housing explorer controls only after lab sign-off.

### `DitherField`: large ASCII fields

```tsx
import { DitherField, cloudField, globeField, ridgesField } from "@/brand/motion";

<section className="bo-on-ink" style={{ height: "80vh" }}>
  <DitherField field={cloudField} mark="dots" />
</section>
```

| Prop | Notes |
|------|-------|
| `field` | `(t, grid, mark) => { tone, glyphs? }`. Built-ins: `cloudField`, `globeField`, `ridgesField(series, opts)` |
| `mark` | `dots`: square dots on a strict grid, ordered 4×4 Bayer dither (the reference look). `numerals`: digits ordered by ink coverage |
| `pitch` | Dot pitch in CSS px (default 5) |
| `lens` | Pointer raises density nearby (default on) |
| `fps` | ≤ 24 |

- Colour is `currentColor`, so put it on a token surface (`bo-on-ink`, `bo-on-union`, or paper with `color: var(--bo-ink)`).
- Memoise data fields (`useMemo(() => ridgesField(series), [series])`). A new function on every render restarts the field.
- `ridgesField(series, { periodsPerSecond, digitsDivisor, onPeriod })` stacks real series back to front, with a playhead. In numerals mode it types each crest with the real value. Use `onPeriod` to drive a readout, and show the source like any chart.

**New field:** a pure function from time and grid to a brightness per cell (0–1). Keep the
per-frame cost to about 40k noise samples. Data fields take real Exchange series only (API
`/indicators/{id}/observations`), keep gaps empty rather than interpolated, and cite the source.

## Rules every motion piece follows

1. **Respect `prefers-reduced-motion`:** show one meaningful still frame. Both components already do.
2. **Pause off-screen** (IntersectionObserver), cap DPR at 2, and cap at 24 fps.
3. **Tone from density only:** dots, screen or glyphs. No opacity fades of type or plates.
4. **Copy never moves under the reader:** text sits on a solid panel above motion, never inside the field.
5. **Measured easing:** `--bo-ease` `cubic-bezier(0.2, 0.8, 0.2, 1)`, durations `--bo-fast/med/slow`. Nothing bouncy.
6. **One monumental motion per page**, at a threshold (hero or section break).
7. **Decorative motion** is `aria-hidden`. Give it a `label` only when it carries meaning, such as a data field.
8. **Fallbacks:** without WebGL use the static `<Plate>`. Without JS, the server-rendered page still reads.

## GSAP (installed)

Pinned exact `gsap@3.15.1` in `web/`. Register only the plugins you use (likely ScrollTrigger when needed).

- Use GSAP for **orchestration**: entrance sequences, scroll-linked progress and timelines across elements. Keep the GPU and canvas loops inside the components.
- Drive components through props, not by reaching into canvases. For example, map a ScrollTrigger's `progress` to the ridges playhead by adding a `progress` prop, or toggle `paused`.
- Wrap every timeline in `gsap.matchMedia()` with a `(prefers-reduced-motion: no-preference)` branch, and clean up with `ctx.revert()` in `useEffect`.
- Use the brand easing (`CustomEase` or `power2.out` near `--bo-ease`). No elastic or bounce.
- Labs: `/design-lab/housing-nav` (nav hovers / plate-icon rails); `/design-lab/ui-motion` (FlickerFigure + InstrumentSelect).

## Checklist before shipping motion

- [ ] Works with reduced motion (still frame), without WebGL (plate), and on a phone (no horizontal scroll)
- [ ] Data motion cites its source (publisher, series, period, release, indicator id)
- [ ] Nothing animates inside a chart plot
- [ ] `npx tsc --noEmit` and `npx eslint` pass. Check the result in `/design-lab/motion` or the page itself
