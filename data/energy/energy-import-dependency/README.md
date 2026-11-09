# Energy import dependency

**Registry:** [Energy import dependency](https://app.notion.com/41165471768581f1b20de3b144f17d52) — **Validation**  
**`indicator_id`:** `energy-import-dependency`  
**Owner:** Energy (DESNZ)  
**Related Ready:** [`energy-imports-and-exports`](../energy-imports-and-exports/) — gross Imports/Exports from the same workbook  
**Domain notes:** [`energy-imports-security`](../energy-imports-security/)

## Source

| Field | Value |
|-------|--------|
| Landing | https://www.gov.uk/government/statistics/total-energy-section-1-energy-trends |
| Table | ET 1.3 — Annual / Quarter dependency & low carbon — Import dependency [note 6] |
| Pinned raw | `raw/2026-11-03/ET_1.3_SEP_26.xlsx` |
| Checksum | `7e3d230e7cdcc45f3eef2b1ec5c866a30ffc26218fdd486cbae59f55eb34bf81` |
| Release | 29 Sep 2026 |
| Unit | ratio (workbook decimal; 0.43 ≈ 43%) |
| Frequency | annual + quarterly |
| Geography | UK (`K02000001`) |
| Licence | Open Government Licence v3.0 |
| Observations | 142 (28 annual, 114 quarterly) |

## Scope choices

- **Ingest:** Import dependency column only (DESNZ note 6 definition / denominator).
- **Notes:** `measure=import_dependency; basis=annual|quarterly`.
- **Sign:** Negative ratio = net exporter period (e.g. late 1990s).
- **Not ingested:** Fossil fuel dependency, low carbon share (separate Gate 3 indicators if needed).
- **Safeguard:** This ratio is **not** a vulnerability, resilience, or price-exposure score.

## Reproduce

```bash
uv run python -m energy.connectors.energy_import_dependency
```

Copies the Ready sibling pinned XLSX if missing, then refuses checksum drift.
