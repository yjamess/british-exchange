# Data loading and performance

## Changes verified on 9 November 2026

- Energy matches Housing's domain-scoped loading. Dependencies are declared in `web/src/brand/energy/domain-sources.ts`; `/energy` calls `loadEnergy(domain)` so opening Prices no longer also hydrates fossils, imports, manufacturing, atlas, and the other packs.
- Energy domain switches use `router.push` (not `history.replaceState`) so the server reloads the new domain's packs. In-domain controls still update the URL locally. Domain status in the index is catalogue readiness, not “was this pack present on this request”.
- Cross-domain packs stay explicit: low-carbon also loads generation + capacity; networks also loads yearMix; industrial-work reuses the manufacturing pack. Policy loads no observation packs.

## Changes verified on 5 November 2026

- Housing requests only the current domain's dependencies, declared in `web/src/brand/housing/domain-sources.ts`. Add cross-domain dependencies there when a view uses another domain's series.
- Domain switches navigate through Next so the server supplies the new domain's data. Place, period and measure controls within a domain continue to update locally. Map packs remain on demand.
- Successful domain payloads are cached for ten minutes in a bounded set of domain keys. Concurrent requests share work. Failed builds are retried; an existing good payload is retained during a temporary outage. This is a per-process cache, not a distributed cache.
- Exact-value chart tables mount only when opened.
- SQL migrations have a checksum ledger and a three-second lock wait limit. Importing data no longer reruns historical schema changes and dimension backfills. Changed recorded migration files are rejected; add a new migration instead.

The existing local database was baselined after checking the required tables, indexes, current releases and completed dimension backfills. A subsequent migration check applied nothing and took 256 ms. Fresh databases still apply the SQL normally. Other existing deployments need their schema and backfills verified before recording a baseline, or a maintenance window for the first tracked run.

## Measurements and limits

Local API loader measurement (uncompressed JSON, excludes maps and page HTML):

| Scope | Load time | Payload |
| --- | ---: | ---: |
| Prices, uncached | 17.8 seconds | 453,783 bytes |
| Prices, cached | 9 milliseconds | 453,783 bytes |
| Full Housing, uncached | 141.2 seconds | 1,347,215 bytes |

These are single observations on a busy development database, not a controlled benchmark or browser timings. Prices makes four indicator requests rather than the 64 dataset/filter requests in the full loader, with a payload about 66% smaller. Full Housing remains available for design-lab consumers; live domain pages do not use it.

Validation: 37 JavaScript tests (domain scoping/cache/retry, chart rendering, renting selection and affordability), three migration bookkeeping tests, and TypeScript checking passed. Browser automation was unavailable. A local Next route smoke request timed out after 30 seconds; end-to-end navigation and cold-page responsiveness still need validation once the development server is responsive. The uncached API time above remains a performance limitation.

For additional sectors, use a server data boundary per selected domain rather than appending all sector data to a shared initial payload. Scope caches to bounded domain identifiers, not arbitrary query strings. Larger individual series still need query-level profiling and suitable aggregation/pagination; these changes do not constitute a ten-times-volume load test.

## Changes verified on 14 November 2026

- Rail hops no longer go through a Next navigation. `useDomainData` (`web/src/brand/template/`) fetches the next domain from `/api/<sector>/domain?domain=…`, then commits data and URL together with `history.pushState`. The page never unmounts, so the full-page loading fallback, the scroll jump and the lost hero band are gone. Back/forward is followed by watching the URL; a failed fetch falls back to `router.push`. Housing, Energy and Economy all use it.
- The hero band flag (`useHeroSize`) lives in module scope per page rather than a component ref, so it survives any remount and resets only on a full page load.
- `loading.tsx` for `/housing` and `/[sector]` renders `SectorSkeleton` (crumb, ink strip, rail column, canvas) instead of one line. It now shows only on the first arrival at a sector, never on a hop; the Explorer shows a paper veil in the canvas while a hop is fetching.
- One stale-while-revalidate cache per sector and domain (`web/src/lib/domain-cache.ts`): stale entries are served at once and rebuilt behind the reader; a failed build keeps the last good payload. `instrumentation.ts` runs a rolling warmer (one domain build at a time, spaced across nine minutes; `BX_WARM_DOMAINS=0` disables it).
- Energy and Economy payloads are packed by column on the wire (`web/src/lib/wire.ts`): a raw observation row was ~440 bytes of JSON with most fields repeating. Page HTML: Energy Prices 6.1 MB → 2.5 MB, Economy Inflation 6.4 MB → 2.0 MB, Wages 3.2 MB → 1.3 MB. Canvases and models are untouched; the views unpack once.
- Root cause of cold builds: `observation` had no index on (indicator_id, release_id, geography_code). The UK private-rents query walked 270k rows (13 s); the rent place list 541k (16 s). Migration `007_observation_release_geography_idx.sql` adds `(indicator_id, release_id, geography_code, period_start) INCLUDE (geography_label)`. Apply with the migration runner before relying on the warm numbers below.

Measured against the dev server before the index (API already warm): Housing hop 25 s cold / 0.2 s warm; Energy Prices hop 5 s; Economy Wages hop 1.5 s. Dev module reloads empty the in-process cache, so dev timings after an edit are cold.
