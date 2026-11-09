# Validation notes — manufacturing-output-per-hour (Energy self-check)

**Date:** 2026-11-07  
**Owner:** Energy (Industry) → Validation  
**Indicator:** `manufacturing-output-per-hour`  
**Series:** ONS DJK6 / PRDY

## Paths

| Artefact | Path |
|----------|------|
| Manifest | `data/energy/manufacturing-output-per-hour/manifest.yaml` |
| Raw pin | `data/energy/manufacturing-output-per-hour/raw/2026-11-07/djk6_prdy.json` |
| Curated | `data/energy/manufacturing-output-per-hour/curated/observations.csv` |
| Connector | `src/energy/connectors/manufacturing_output_per_hour.py` |
| Registry | https://app.notion.com/41165471768581c89c2ce8e92d3134e3 |

## Freeze

| Item | Value |
|------|-------|
| SHA-256 | `cbe5a021d243f44e5b56f00fe583ee5d8af5687886ca687ed06fa7e61fe82d53` |
| Retrieved | 2026-11-07 (Wave B3 pin) |
| Official release | 2026-08-17 |
| Rows | 129 quarterly (1994 Q1 → 2026 Q1) |
| Spot | 1994Q1=38.7; 2026Q1=103.3 |

## Method

1. Download ONS timeseries JSON `.../timeseries/djk6/prdy/data`.
2. Keep `quarters` only; map to ISO quarter bounds; geography `K02000001`.
3. Do not derive from IoP ÷ Workforce Jobs.

## Suggested Validation checks

- [ ] Checksum matches manifest `raw_evidence`
- [ ] Recompute curated from pinned raw (quarters only)
- [ ] Spot sample vs ONS DJK6 page / PRDY release
- [ ] Confirm distinct from Economy `labour-productivity` (LZVB)
- [ ] Confirm annual rows in raw are omitted from curated (documented)

## Reproduce

```bash
uv run python -m energy.connectors.manufacturing_output_per_hour
```
