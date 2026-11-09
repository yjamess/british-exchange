# Energy evidence and domain view contract

## Why

Shared Explorer chrome (`FigureRecord` / `SourceLine`, stage meta, view tabs) does not by itself guarantee that every domain view carries equivalent **definitions**, **geography**, **dates** and **method** qualifications. Content is still authored per domain. The structural audit therefore checks declarative contracts, not pixels.

## Where it lives

| Concern | Location |
| --- | --- |
| View tabs, URL params, evidence fields | `web/src/brand/energy/views/<domain>.ts` |
| Registry + helpers | `web/src/brand/energy/views/index.ts` |
| Pack loading by domain | `web/src/brand/energy/domain-sources.ts` |
| Audit test | `web/scripts/energy-evidence.test.mjs` (`npm run test:evidence`) |

## Required evidence fields (every Ready view)

- `source` — publisher · series (Notes source row)
- `definition` — what the number is
- `method` — how counted / what not to infer
- `geography` — nation or coverage
- `period` — span or grain
- `dataHref` — catalogue link

Placement still follows the Explorer shell: definition + method in one Stage foot; geography/period in stage meta (and Notes when material).

## Readiness vs unavailable

| State | Meaning | UI |
| --- | --- | --- |
| `preparation` | Domain UI not shipped | Index “In preparation”; `STAGE_EMPTY.preparation` |
| `unavailable` | Domain is Ready; primary observations failed to load | Index stays Ready; `STAGE_EMPTY.unavailable` / canvas EmptyStage |
| `ok` | Ready and primary pack present | Render canvas |

Never infer index readiness from whether this request’s packs are empty (scoped loading leaves other domains empty by design).

## Gradual view modules

Canvases keep shared template components. Each domain’s **configuration** (tabs, allowed query keys, evidence) lives in its module. New views should be added to the module first; the audit fails if evidence fields are missing. Wiring Notes feet to call the module at runtime (instead of parallel copy) can continue domain-by-domain.

Housing may adopt the same pattern later under `web/src/brand/housing/views/`.
