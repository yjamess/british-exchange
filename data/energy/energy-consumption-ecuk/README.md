# Energy Consumption — ECUK 2026 (Domain 02 Gate 1 pin)

Shared raw evidence for Domain 02. **Not** a Ready indicator package by itself — connectors and curated CSVs land under named indicator ids (e.g. existing `industrial-energy-consumption`).

## Pin

`raw/2026-11-06/` — see `retrieval.json` for URLs and sha256.  
`source_register.csv` — table inventory and Gate 2 priorities.  
`GATE1_TAXONOMY.md` · `GATE1_METABOLISM.md` — taxonomy breaks and flagship choice.

## Already Ready (reuse)

| Indicator | Table | Path |
|-----------|-------|------|
| `industrial-energy-consumption` | C1 Industry | `data/energy/industrial-energy-consumption/` |

Checksum of Consumption XLSX matches this pin (`e0b73e34…`).

## Gate 2 next ingest (proposed)

1. `final-energy-consumption-by-sector` — C1 all five sector **Total** columns (and optionally fuels).  
2. `primary-energy-flow-allocation` — W1 (flag pack as stats in development).  
3. Keep primary (P1/P2) and end-use (U3) as separate indicators — do not merge stages in one CSV.

## Reproduce checksums

```bash
shasum -a 256 data/energy/energy-consumption-ecuk/raw/2026-11-06/*.xlsx
```
