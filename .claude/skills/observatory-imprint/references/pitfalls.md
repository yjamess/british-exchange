# Pitfalls: check before handing over a plate

## Identity
- **Plate inside a chart plot.** Never.
- **Wrong ink.** Plates print in Electric `#0618F5` on Paper `#FDFDFF` via CSS. Ship masks (`--bare --mask`), not coloured bitmaps.
- **Text baked into the plate.** Use `--bare`. Labels, sources and captions are set in HTML.
- **Copy directly on the dots.** Copy goes on a solid panel. Night and negative are imagery treatments, not reading themes.
- **Gradients, glow, neon, 3D sheen.** Tone comes from the screen only.

## Data plates
- **Invented or smoothed values.** Draw only real observations from the Exchange API. Show gaps (dashed) rather than interpolating across missing years.
- **No source line.** Every data plate needs a `source` entry in `PLATES`: publisher, series, period, release, indicator id.

## Subjects
- Postcard clichés (Big Ben, red buses, Union Jack bunting) unless the data is about them. Rotate across all four nations.
- Never generate real banknotes, the monarch, the royal arms, crowns, government or OS logos, or real people.

## Craft
- Check framing at both cuts (portrait 1060×1768, wide 2400×1350): subject clear, room for a panel.
- Line work is construction, not decoration: axes, dimension lines, registration crosses.
