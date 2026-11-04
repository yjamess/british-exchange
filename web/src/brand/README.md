# `web/src/brand` — British Exchange UI kit (v1)

"One ink, drawn by instruments." Read [`docs/visual-identity.md`](../../../docs/visual-identity.md) first.

| Path | Role |
|------|------|
| `brand.css` | Tokens and utilities under `.bo` (colour, type, grid, screen tints, plates, panels) |
| `fonts.ts` | Libre Caslon Display, Geist, Geist Mono, Archivo (condensed) via `next/font` |
| `BrandRoot.tsx` | Wraps a page: applies `.bo` + fonts |
| `Plate.tsx` | Halftone plate component + `PLATES` catalogue (files in `public/brand/plates/`) |
| `motion/` | `HalftoneMotion` (live halftone/film loops) and `DitherField` (dither dots / numerals fields) — see the exchange-motion skill; lab at `/design-lab/motion` |
| `instrument/` | v1 charts: `TimeChart` (line, bars, stack; dot-screen fills, Signal latest, keyboard inspection, data table) and `RankBars` |
| `housing/` | v1 Housing & Land explorer (`HousingExplorer`) and its loader |
| `sector/`, `charts/` | v0.2 components — render through legacy token aliases; retire as sectors move to v1 |

## Using a plate

```tsx
import { Plate } from "@/brand/Plate";

<Plate name="coolingTowers" treatment="print" position="50% 40%" style={{ minHeight: 640 }}>
  <div className="bo-panel">…copy on a solid panel…</div>
</Plate>
```

New plates come from `.claude/skills/observatory-imprint/scripts/halftone-plates.py` (`--bare --mask`), then get a `PLATES` entry. Data-generated plates need a `source`.

## New page

1. Wrap in `<BrandRoot>`.
2. Pick a mode per section: Quiet, Monumental (max one), Index.
3. Headlines `.bo-d1–3` (Caslon, sentence case), figures `.bo-fig`, labels `.bo-label`.
4. No parallel palettes, no opacity tints, no Signal on text.
