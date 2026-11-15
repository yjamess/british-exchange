# gva-by-industry-section

**Owner:** Economy agent  
**Status:** Ready (2026-11-14) — cloud-loaded; Anatomy at `/economy?domain=growth&view=anatomy`  
**indicator_id:** `gva-by-industry-section`

## What this is

UK **output GVA** by SIC 2007 **section** (A–T) from the ONS GDP(O) low-level aggregates workbook.

| Measure (`kind=`) | Sheet | Unit | Use for |
|-------------------|-------|------|---------|
| `current_price` | 1 | £ million current prices, SA | Anatomy **shares** (additive) |
| `chained_volume` | 2a | £ million chained volume, SA | Volume levels / growth — **not** additive shares |

## Reproduce

```bash
uv run python -m economy.connectors.gva_by_industry_section
uv run python -m britain_exchange.load_ready --via-rest --only gva-by-industry-section
```

## Paths

```txt
data/economy/gva-by-industry-section/
  manifest.yaml
  raw/2026-11-14/gdplowlevelaggregates.xlsx
  curated/observations.csv
  curated/sections.json
  README.md
src/economy/connectors/gva_by_industry_section.py
```

## Do not

- Sum CVM section £m as if they equal Total GVA for composition.
- Fork Energy `manufacturing-share-of-gva` (L4NT / WGDP).
- Treat as regional GVA (`gva-by-uk-nation-and-region` is Regions-owned).
