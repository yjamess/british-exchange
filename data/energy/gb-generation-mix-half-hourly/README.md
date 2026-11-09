# GB generation mix (NESO half-hourly → monthly)

**Indicator:** `gb-generation-mix-half-hourly`  
**Publisher:** NESO · Historic GB Generation Mix  
**Geography:** Great Britain (`K03000001`) — not UK  
**Pin year:** 2024

## Reproduce

```bash
# Raw already pinned under raw/2026-11-06/
uv run python -m energy.connectors.gb_generation_mix
```

Half-hourly average MW × 0.5 h → monthly MWh per component fuel. Aggregate `GENERATION` columns are excluded.

## UI

`/energy?domain=generation&view=year` — monthly stack in TWh with GB caveats in Notes.

## Do not

Blend these monthly GB totals into ET 5.1 UK annual/quarterly TWh without a labelled geography break.
