# Power station selection (portable context)

The Station Atlas already proves the Explorer can host **connections** without a redesign: selecting a station opens an evidence panel and can lead to a related national generation series.

## Contract

Selection is not Atlas-only React state. It is a resolvable object in `web/src/brand/energy/station-model.ts`:

| Field | Meaning |
| --- | --- |
| `ref.register` + `ref.id` | Stable identity (`repd:` or `dukes:`) |
| `technology` / `group` | Register technology and family (incl. storage) |
| `capacityMw` | Installed capacity — not generated electricity |
| `opened` | Operational (REPD) or commissioned (DUKES) date/year |
| `geography.regionLabel` | Publisher region/nation label — **filter/caption only** |
| `geography.geographyCode` / `geometryId` | Always `null` until validated identifiers exist |
| `nationalGeneration` | Optional contextual hop to UK Energy Trends (not site output) |

URL: `?domain=generation&view=atlas&station=repd:<id>` or `dukes:<id>`.

Resolve anywhere with:

```ts
resolveStationSelection(atlasPoints, searchParams.get("station"), annualMix)
```

## Honesty rules (do not weaken)

- Capacity ≠ generation; national TWh beside a station is technology context, never that site’s output.
- Two registers, incomplete coverage — not every licensed generator.
- Region labels are not spatial joins. Future employment / government / LA links must use validated geography codes or geometry, not the region string alone.

## Not in scope yet

Employment, government, or other sector connections. Keep using `nationalGeneration.href` / `retain` on the explorer URL utility when those arrive.
