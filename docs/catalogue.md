# Britain Exchange — indicator catalogue (Layer A)

**Purpose:** Map what the observatory will eventually track.  
**Rule:** `Inbox` = named intent only. **Not sourced. Not in SQL. Not chartable.**  
**Canonical tracker:** [Dataset & Indicator Registry](https://app.notion.com/p/8780d864ff89472cac966464c4db7558)  
**Synced:** 2026-11-03 — **48 Ready** in Postgres; **0 Blocked**; **0 Inbox**

## How to read status

| Status | Meaning |
|--------|---------|
| Inbox | Catalogued candidate |
| Scoping / Sourcing / Ingesting / Validation | Active evidence work |
| Ready | Reproducible, QA’d, allowed into API/SQL charts |
| Blocked | Unresolved rights/method issue |

## Totals by sector

| Sector | Ready | Inbox | Priority mix |
|--------|------:|------:|--------------|
| Energy & Industry | 2 | 7 | all P0 |
| Economy & Public Finance | 1 | 12 | all P0 |
| Housing & Land | 0 | 5 | P1×4, P2×1 |
| People & Society | 0 | 5 | P1×4, P2×1 |
| Government & Politics | 0 | 4 | P1×3, P2×1 |
| Infrastructure | 0 | 4 | P1×3, P2×1 |
| Regions & Places | 0 | 4 | P1×3, P2×1 |
| History & Change | 0 | 4 | P1×3, P2×1 |

## Sector map

### Energy & Industry (P0) — agents live

| Status | Indicator | Publisher |
|--------|-----------|-----------|
| Ready | Electricity generation by source | DESNZ |
| Ready | Primary energy production | DESNZ |
| Inbox | Domestic gas production | DESNZ |
| Inbox | Energy imports and exports | DESNZ |
| Inbox | Industrial electricity prices | DESNZ |
| Inbox | Industrial energy consumption | DESNZ |
| Inbox | Manufacturing employment | ONS |
| Inbox | Manufacturing output index | ONS |
| Inbox | Manufacturing share of GVA | ONS |

### Economy & Public Finance (P0) — agents live

| Status | Indicator | Publisher |
|--------|-----------|-----------|
| Ready | Real GDP | ONS |
| Inbox | Business investment | ONS |
| Inbox | CPI inflation | ONS |
| Inbox | Economic inactivity rate | ONS |
| Inbox | Employment rate | ONS |
| Inbox | Labour productivity | ONS |
| Inbox | Public sector debt interest | ONS / OBR |
| Inbox | Public sector net borrowing | ONS / OBR |
| Inbox | Public sector net debt | ONS / OBR |
| Inbox | Real earnings | ONS |
| Inbox | Real GDP per head | ONS |
| Inbox | Tax receipts | HMRC / OBR |
| Inbox | Total managed expenditure | HM Treasury / OBR |

### Housing & Land — catalogue only (no agent yet)

| Pri | Indicator | Publisher | Frequency |
|-----|-----------|-----------|-----------|
| P1 | House price to earnings ratio | ONS | annual |
| P1 | UK average house price | HM Land Registry / ONS | monthly |
| P1 | Private rental price index | ONS | monthly |
| P1 | Housing completions | MHCLG / DLUHC | quarterly |
| P2 | Dwelling stock by tenure | MHCLG / ONS | annual |

### People & Society — catalogue only

| Pri | Indicator | Publisher | Frequency |
|-----|-----------|-----------|-----------|
| P1 | UK population estimate | ONS | annual |
| P1 | Long-term international net migration | ONS | annual |
| P1 | NHS elective waiting list | NHS England | monthly |
| P1 | Life expectancy at birth | ONS | annual |
| P2 | GCSE grade 4+ English and maths | DfE | annual |

### Government & Politics — catalogue only

| Pri | Indicator | Publisher | Frequency |
|-----|-----------|-----------|-----------|
| P1 | Acts of Parliament passed | UK Parliament | annual / sessional |
| P1 | General election turnout | HoC Library / Electoral Commission | election |
| P1 | Departmental expenditure limits | HM Treasury | annual |
| P2 | Arm's-length bodies count | Cabinet Office | annual |

### Infrastructure — catalogue only

| Pri | Indicator | Publisher | Frequency |
|-----|-----------|-----------|-----------|
| P1 | Rail punctuality | ORR | periodic / annual |
| P1 | Road vehicle miles | DfT | annual |
| P1 | Full-fibre broadband coverage | Ofcom | annual / quarterly |
| P2 | Water supply interruptions | Ofwat | annual |

### Regions & Places — catalogue only

| Pri | Indicator | Publisher | Frequency |
|-----|-----------|-----------|-----------|
| P1 | GVA by UK nation and region | ONS | annual |
| P1 | Employment rate by region | ONS | quarterly |
| P1 | Population by UK nation | ONS | annual |
| P2 | House prices by region | ONS / HM Land Registry | monthly |

### History & Change — catalogue only

| Pri | Indicator | Publisher | Frequency |
|-----|-----------|-----------|-----------|
| P1 | Bank of England millennium GDP | Bank of England / ONS | annual |
| P1 | Long-run manufacturing employment | ONS | annual |
| P1 | UK unemployment rate long-run | ONS / Bank of England | annual / quarterly |
| P2 | Historical coal production | DESNZ / historical DUKES | annual |

*(History rows often cross-link Economy/Energy series — do not fork duplicate pipelines.)*

## Orchestrator notes (this sync)

- Notion now has **publisher / frequency / geography** filled on the six non-P0 sectors (created ~17:22 UTC).
- Manufacturing is **three** registry rows (employment, output index, GVA share), not one combined bullet.
- Still **only two Ready** series in Postgres/API. New rows stay Inbox until assigned → sourced → QA’d.
- Do **not** staff Housing / People / etc. agents yet. Next ingest work stays inside Energy + Economy P0 Inbox (Layer C).

## Next layers

- **B:** Done — Postgres spine + Ready load + FastAPI DB path  
- **C–D:** **Autonomous full-catalogue wave in progress** — all Inbox → Ready or Blocked (see [work-plan.md](work-plan.md))  
- **E:** Query agents only against Ready SQL rows  
- **Your review:** wait until Inbox count is 0
