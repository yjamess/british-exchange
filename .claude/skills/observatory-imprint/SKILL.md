---
name: observatory-imprint
description: >-
  Make British Exchange imagery: halftone "plates" of Britain's real machinery
  (cooling towers, offshore wind, tower blocks, pylons, the globe) and plates
  generated from real Exchange API data, screened in one electric ink. Use for any
  hero, section background, card image, motion loop or data-art plate. Outputs
  mask PNGs for the <Plate> component. Never for chart plots.
license: MIT
version: 3.0.0
metadata:
  canonical_identity: docs/visual-identity.md and web/src/brand/brand.css
---

# Observatory Imprint — plates for British Exchange

Read `docs/visual-identity.md` first; it wins over this file.

**Look:** engineered 3D drawings screened through a coarse 45° halftone in one ink,
Electric `#0618F5` on Paper `#FDFDFF`, with technical line work (construction circles,
axes, dimension lines, registration crosses). No labels baked into plates.

## Generator

`scripts/halftone-plates.py` raymarches each subject, screens it, and knocks line work
out of the halftone. Run with `uv` (dependencies are inline).

```bash
G=.claude/skills/observatory-imprint/scripts/halftone-plates.py
OUT=web/public/brand/plates

# portrait (1060x1768) and wide (2400x1350) masks for the <Plate> component
uv run $G $OUT --bare --mask --only globe,towers,turbine,block --prefix p-
uv run $G $OUT --bare --mask --only globe,towers,turbine,pylons,street --size 2400x1350 --prefix l-

# data-generated plate from API observations (fetch JSON into DATA first)
uv run $G $OUT --bare --mask --only regions --size 2400x1350 --prefix l- --data DATA

# motion: tone frames for one 120° rotor cycle, packed as a grayscale atlas
uv run $G $OUT --only frames --size 1536x864

# icon plates (small 3D + halftone subjects for nav / condensed UI)
uv run .claude/skills/observatory-imprint/scripts/penship-icons.py $OUT --size 320

# dwelling-type specimens (Census accommodation types): one matched set, true relative scale
uv run .claude/skills/observatory-imprint/scripts/dwelling-types.py $OUT --size 1000x1000   # d-detached … d-other

# tenure specimens (MHCLG dwelling stock by tenure): same camera as dwelling-types
uv run .claude/skills/observatory-imprint/scripts/tenure-types.py $OUT --size 1000x1000   # t-owner, t-private, t-social

# Energy Field Guide tech specimens (Domain 06): illustrative forms — plate area is never MW
# Writes e-<id>.png (still = frame 0) and e-<id>-atlas-4x5-500.jpg (seamless loop for HalftoneMotion).
# Wind rotors re-render per frame (~25 min total); --no-atlas for stills only.
uv run .claude/skills/observatory-imprint/scripts/energy-tech-types.py $OUT --size 1000x1000   # e-offshore … e-nuclear
```

| Flag | Meaning |
|------|---------|
| `--bare` | Keep line work, drop all text and label tags (use for site assets) |
| `--mask` | Ink as alpha on transparent, so CSS prints it in any token pair |
| `--size WxH` | Output size (portrait framing by default) |
| `--prefix` | Filename prefix (`p-` portrait, `l-` wide) |
| `--data DIR` | Folder of API observation JSON for data plates |
| `--only` | `globe, towers, turbine, block, pylons, regions, frames, terrace, plots, street, cutaway` |

Without `--bare --mask` it writes a finished two-colour PNG with annotations, useful for review.

## Adding a subject

Add a `plate_<name>(out, seed)` function: build a signed-distance scene, `render()` it
to a tone image, draw line work with `Notes` (lines, circles, dimension marks), then
`compose()`. Register it in `PLATES`, render both cuts, and add it to the `PLATES`
catalogue in `web/src/brand/Plate.tsx`.

Subjects should be British and about what the data measures, across all four nations.
Avoid postcard clichés, real banknotes, royal arms, crowns, government logos and real people.

## Data-generated plates

Draw from real Exchange series only (fetch from the API, never invent values). Show gaps
honestly. Every data plate needs a `source` in the catalogue: publisher, series, period,
release, indicator id. Example: `plate_regions` (UK HPI average price by region, monthly).

## Treatments (applied in CSS, not in the file)

print (electric on paper, default) · night (union on electric, imagery only) ·
negative (paper on electric, section breaks) · film (motion only, lavender highlights
with live grain). Copy over a plate always sits on a solid panel.
