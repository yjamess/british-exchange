# The Britain Exchange — product brief (from Notion)

**Source:** [British Exchange](https://app.notion.com/p/406654717685802987ffce671c6844e8)  
**Synced:** 2026-11-03  
**Canonical tracker:** [Dataset & Indicator Registry](https://app.notion.com/p/8780d864ff89472cac966464c4db7558)  
**Visual identity:** [docs/visual-identity.md](visual-identity.md) · live kit `web/src/brand/`

## Mission

An open British Observatory: deep public data and independent, original investigations.

## Working method

- One sector = one agent hand-off
- One registry = one record per dataset/indicator
- Priority: launch a **verified energy-data vertical slice** first
- Target: **December 2026** — cut scope before cutting evidence quality
- Monetisation: parked; public data stays free

## Architecture (shared platform)

`source connectors → raw archive → validation/normalisation → versioned PostgreSQL → FastAPI → Next.js chart + source panel`

Stack named in Notion: **Next.js / FastAPI / PostgreSQL**.

## First proof (current sprint)

1. App/repo shell + shared connector/manifest interface
2. **Energy & Industry** finds a consistent historical **electricity generation** series (registry: *Electricity generation by source*, DESNZ, P0)
3. Verify rights, exact series, geography, time basis, corrections
4. Connect **one** Energy & Industry indicator end to end
5. Only then parallelise more ingestion; other six sectors stay provisioned, not populated

**Initial hand-offs (P0):** Energy & Industry + Economy & Public Finance. Do not distract with Housing, People, Government, Infrastructure, Regions, or History yet.

## Sector pages (agent workspaces)

| Sector | Priority | Notion | Starting publishers |
|--------|----------|--------|---------------------|
| [Energy & Industry](https://app.notion.com/p/40d6547176858194bc18cec7be0a812d) | P0 | DESNZ; ONS | [Energy Trends](https://www.gov.uk/government/collections/energy-trends), [ONS API](https://developer.ons.gov.uk/) |
| [Economy & Public Finance](https://app.notion.com/p/40d65471768581419ceaefe6dec32ba2) | P0 | ONS; OBR; HMT; BoE | same + [OBR](https://obr.uk/data/), HMT OSCAR, [BoE](https://www.bankofengland.co.uk/boeapps/database/) |
| Other six sectors | later | — | provisioned only |

### Energy & Industry scope

Electricity generation by fuel, primary energy production, energy imports/exports, industrial electricity prices, gas, industrial energy consumption, manufacturing output/employment/GVA share, business investment (coordinate overlaps via registry — no duplicate pipelines).

### Economy & Public Finance scope

GDP, GDP per head, productivity, inflation, wages, employment, inactivity, borrowing, debt, taxation, spending, debt interest.

## Registry status meanings

`Inbox → Scoping → Sourcing → Ingesting → Validation → Ready` (+ `Blocked`).  
**Ready** = reproducible, source-validated output — not “research found”.

## Shared data contract (every agent)

Return all of:

1. **Manifest** — canonical indicator ID, dataset/table/series ID, definitions, publisher/source links, licence
2. **Raw evidence** — archived response/file, official release date, retrieval timestamp, checksum
3. **Clean data** — typed value, unit, time period, geography/code, version, observation status
4. **Reproducible retrieval** — Python connector or exact download/transform procedure + dependencies
5. **Validation** — sample vs official numbers, caveats, missing/suppressed values, revisions
6. **Hand-off** — code/output path or PR, data dictionary, update cadence, open questions, related indicators

### Compatibility rules

- UK / GB / England / regions are distinct; document boundary changes
- Declare frequency, nominal/real, SA/NSA, units, base years
- Observation period ≠ publication date ≠ retrieval date
- Type relationships: direct reference | contextual association | tested analytical connection — no inferred causality from correlation
- Keep authoritative current source **and** original raw snapshot; never silently overwrite cited history
- Do not mark Ready without source verification, reproducible transform, and a sample QA report

### Recommended hand-off layout

```txt
sector-name/
  manifest.yaml
  source_register.csv
  raw/
  curated/
  connector.py
  validation_report.md
  README.md
```

In this repo, map that to owned paths under `src/{energy,economy,validation}/` and `data/{energy,economy,qa}/` (see `AGENTS.md`).

## Investigations (later)

Candidates: *What Happened to British Industry?* and *The Price of British Power*. Stories reference accepted registry indicators; they are authored, not auto-inferred from parallel trends.

## Out of scope for launch

Maps / elaborate network graphs / extra indicator breadth (cut first). Subscription/paywall, market betting, AI research assistant — not at launch.
