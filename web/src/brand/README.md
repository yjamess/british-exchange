# `web/src/brand` — Observatory UI kit

Shared **Instrument + Imprint** shell for every sector page.

- Tokens: [`brand.css`](./brand.css) (class `.bo`)
- Doc: [`docs/visual-identity.md`](../../../docs/visual-identity.md)
- Entry: wrap pages in [`BrandRoot.tsx`](./BrandRoot.tsx)

## Layout

| Path | Role |
|------|------|
| `BrandRoot.tsx` / `brand.css` / `fonts.ts` | Locked identity |
| `sector/` | Shared page primitives (MetricStrip, Choice, Evidence, TrendChart, Penwork) |
| `charts/` | Chart forms (Line, CombBars, ShareArea, …) |
| `housing/` | Sector one — template for other sectors |
| `playground/` | Lab reference for tokens (not production) |

## New sector

1. Add `brand/<sector>/` with load + overview (or reuse `sector/` components).
2. Set pigment via `<BrandRoot sector="#…">` (imprint only).
3. Follow Overview → topics → chart modules → condensed source.
4. Do not fork a parallel colour system.

Lab under `app/design-lab/` stays experimental.
