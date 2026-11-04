# Britain Exchange — indicator catalogue (Layer A)

**Purpose:** Map what the observatory tracks.  
**Rule:** `Inbox` = named intent only. **Not sourced. Not in SQL. Not chartable.**  
**Canonical tracker:** [Dataset & Indicator Registry](https://app.notion.com/p/8780d864ff89472cac966464c4db7558)  
**Synced:** 2026-11-03 — **49 Ready** on disk (+ `uk-hpi-measures`); Postgres load may lag until re-ingest; **0 Blocked**; **0 Inbox**

## How to read status

| Status | Meaning |
|--------|---------|
| Inbox | Catalogued candidate |
| Scoping / Sourcing / Ingesting / Validation | Active evidence work |
| Ready | Reproducible, QA’d, allowed into API/SQL charts |
| Blocked | Unresolved rights/method issue |

## Totals by sector (local Ready packages)

| Sector | Ready | Notes |
|--------|------:|-------|
| Energy & Industry | 9 | DESNZ + ONS manufacturing |
| Economy & Public Finance | 13 | ONS / OBR / HMT family |
| Housing & Land | 6 | Several England-only; HPI measures for explorer |
| People & Society | 5 | NHS / GCSE England-only |
| Government & Politics | 4 | |
| Infrastructure | 4 | Ofwat company-level water |
| Regions & Places | 4 | |
| History & Change | 4 | |
| **Total** | **49** | |

## Sector map — all Ready

### Energy & Industry

| Indicator | Publisher | Frequency |
|-----------|-----------|-----------|
| Electricity generation by source | DESNZ | quarterly |
| Primary energy production | DESNZ | monthly |
| Domestic gas production | DESNZ | monthly |
| Energy imports and exports | DESNZ | quarterly |
| Industrial electricity prices | DESNZ | quarterly |
| Industrial energy consumption | DESNZ | annual |
| Manufacturing employment | ONS | quarterly |
| Manufacturing output index | ONS | monthly |
| Manufacturing share of GVA | ONS | annual (CVM industry weights, not current-price share) |

### Economy & Public Finance

| Indicator | Publisher | Frequency |
|-----------|-----------|-----------|
| Real GDP | ONS | quarterly |
| Real GDP per head | ONS | quarterly |
| Business investment | ONS | quarterly |
| CPI inflation | ONS | monthly (**CPI D7G7 — not CPIH**) |
| Economic inactivity rate | ONS | monthly |
| Employment rate | ONS | monthly |
| Labour productivity | ONS | quarterly |
| Real earnings | ONS | monthly |
| Public sector net borrowing | ONS | monthly |
| Public sector net debt | ONS | monthly |
| Public sector debt interest | ONS | monthly |
| Tax receipts | ONS | monthly |
| Total managed expenditure | ONS | monthly |

### Housing & Land

| Indicator | Publisher | Frequency | Geography note |
|-----------|-----------|-----------|----------------|
| UK average house price | HM Land Registry / ONS | monthly | UK |
| UK HPI measures (type and volume) | HM Land Registry / ONS | monthly | UK · series filter |
| Private rental price index | ONS | monthly | |
| House price to earnings ratio | ONS | annual | **England only** |
| Housing completions | MHCLG | quarterly | **England only** |
| Dwelling stock by tenure | MHCLG | annual | **England only** |

### People & Society

| Indicator | Publisher | Frequency | Geography note |
|-----------|-----------|-----------|----------------|
| UK population estimate | ONS | annual | UK |
| Long-term international net migration | ONS | quarterly | |
| Life expectancy at birth | ONS | annual | UK (sex breakdown) |
| NHS elective waiting list | NHS England | monthly | **England only** |
| GCSE grade 4+ English and maths | DfE | annual | **England only** |

### Government & Politics

| Indicator | Publisher | Frequency |
|-----------|-----------|-----------|
| Acts of Parliament passed | legislation.gov.uk | annual |
| General election turnout | UK Parliament | ad hoc / election |
| Departmental expenditure limits | HM Treasury | annual |
| Arm's-length bodies count | Cabinet Office | annual |

### Infrastructure

| Indicator | Publisher | Frequency | Notes |
|-----------|-----------|-----------|-------|
| Rail punctuality | ORR | quarterly | **PPM** (not On Time at all stops); GB |
| Road vehicle miles | DfT | annual | |
| Full-fibre broadband coverage | Ofcom | ad hoc | |
| Water supply interruptions | Ofwat | annual (FY) | **Company-level only — no industry aggregate** |

### Regions & Places

| Indicator | Publisher | Frequency |
|-----------|-----------|-----------|
| GVA by UK nation and region | ONS | annual |
| Employment rate by region | ONS | quarterly |
| Population by UK nation | ONS | annual |
| House prices by region | HM Land Registry / ONS | monthly |

### History & Change

| Indicator | Publisher | Frequency |
|-----------|-----------|-----------|
| Bank of England millennium GDP | Bank of England | annual |
| Long-run manufacturing employment | Bank of England | annual |
| UK unemployment rate long-run | Bank of England | annual |
| Historical coal production | DESNZ | annual |

## Orchestrator notes (this sync)

- Full-catalogue Ready wave landed; Layer B Postgres load preserves **release history** and stores **typed dimensions** (fuel, water company, demographic, series).
- API default observations use the **current** `data_release` (`is_current`); prior releases remain queryable by `release_id`.
- Chart contract distinguishes time series / snapshots / categorical / geographic views and surfaces source + caveat metadata.
- Do not invent Ofwat industry aggregates; do not conflate CPI with CPIH; label manufacturing GVA as CVM weights; label rail as PPM; flag England-only series.

## Next layers

- **B:** Done — Postgres spine + release-preserving Ready load + FastAPI DB path  
- **C–D:** Catalogue wave complete (48 Ready)  
- **E:** Query agents only against Ready SQL rows (current release by default)  
- **Review:** branch `cursor/first-proof-chart-ui` — merge only after P0/P1 verification below
