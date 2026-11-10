# Connections contract

Typed, declared edges between Explorer destinations. This is the connection engine; the [Explorer URL contract](explorer-url-contract.md) remains the navigation substrate (`push` + `retain`).

## Non-goals

- No force-directed “connections graph” UI
- No auto-suggested related series from names or correlation
- No Supabase connection table for v1 (code registry is enough)
- Not grid “Connections Queue” / DNO topology (infrastructure data, different meaning)

## Kinds (from the brief)

| Kind | Meaning | Example |
| --- | --- | --- |
| `direct` | Same canonical series / entity, different presentation | Fuel on History → Generation Data for that fuel |
| `contextual` | Related measure, different definition — say so | Gas generation → fossil production |
| `analytical` | Documented comparison with assumptions | Deferred unless editorial investigation exists |

Never infer causality from parallel trends.

## Shape

One `Connection` object everywhere (`web/src/brand/connections/`):

- **Identity:** stable `id` (e.g. `gen.fuel.gas→fossil`)
- **from:** sector, domain, optional view, optional selection key/values
- **to:** pathname, domain, optional view, static `params`, `mapSelection` keys, typed `retain` allowlist
- **Copy:** `label`, `why`, `learn`, optional `honesty`
- **Gate:** `readiness: "ready" | "deferred"`

## Rules

1. **Declared, not discovered** — authors register edges; nothing is auto-wired from the catalogue.
2. **Ready + cloud only** — `ready` only when the destination instrument is cloud-served (Postgres observations and/or Storage packs via API). Otherwise `deferred`: show copy, no live `href`.
3. **Retain is typed** — each edge lists which query keys may cross the hop. Default portable Energy key remains calendar `year`. Never port polysemous keys (`measure`, `region`, `event`, `fuel`) unless the edge explicitly retains them **and** both sides agree on meaning.
4. **Selection is portable** — entities (station, fuel, event) resolve via helpers (e.g. `resolveStationSelection`), not canvas-local state alone.
5. **One UI pattern** — locked chrome (design-lab/follow **1 + 4**):
   - **FollowStep** — one primary hop via Stage `follow` prop: **under the framed figure, outside the border**, below the Notes foot behind a hairline that draws once from the frame edge on first view; Notes and Follow start level with the border (never inside the stage body)
   - **ArrivalFrom** — destination chip (`via` / `via_return` query keys) so Return is shareable
6. **Navigate via the URL utility** — resolve with `resolveConnectionHref` (+ arrival context); do not hand-build incompatible query strings in canvases.
7. **Cap the strip** — at most one `primary` Follow per origin. Extra registry edges stay undeclared in the chrome.

## Layers

1. **Selection** — what the reader is looking at (fuel, year, station, …)
2. **Connection** — what else is honestly related (registry row)
3. **Navigation** — open the destination without carrying wrong filters (`explorer-url` + `retain`)

## Adoption

| Piece | Path |
| --- | --- |
| Types + resolve | `web/src/brand/connections/` |
| Energy seed registry | `web/src/brand/connections/energy.ts` (all Ready domains) |
| Housing seed registry | `web/src/brand/connections/housing.ts` |
| UI | `EnergyStageFollow` / `FollowStep` via Stage `follow` + `ArrivalFrom` (lab 1 + 4; never inside the stage body) |
| Visual lab | `/design-lab/follow` |
| Tests | `npm run test:connections` |

Housing domain Follows are live with **full Ready domain/view coverage** (one primary per origin). Cross-sector edges that need **validated geography joins** (People, Government, LA codes as join keys) still wait. One Housing → Energy hop is registered (Quality › Energy → Dissected Bill) with explicit honesty that ratings ≠ bills.

## Honesty examples (do not weaken)

- Station capacity MW ≠ site generation; national TWh beside a station is technology context only.
- Production / trade ≠ electricity generation.
- Load factor ≠ a single plant’s metered output.
- House price ≠ affordability; rent level ≠ rent burden; stock ≠ supply flow; planning ≠ completions.
- EHS / EPC home energy ratings ≠ DESNZ domestic energy bills.
