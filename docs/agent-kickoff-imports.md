# Kickoff — Energy Imports & Security (Domain 05)

**Opened:** 2026-11-07  
**Owners:** Energy (data) · Orchestrator/UI (Study D Lifelines)  
**Domain Notion:** https://app.notion.com/p/410654717685813f8062c65191f6c0bb  
**Mode:** Domain 05 Gate 3 supporting set **shipped** (Lifelines choropleth · Resilience + storage · Shock · Connectors capacity)

## Locked question

Where does Britain's imported energy enter the system, how has reliance changed, and what does resilience actually mean?

## Creative thesis (Notion)

Maritime charts / exchange diagrams — every arrow measured. Flagship name: **The Lifelines Map**. Supporting: Resilience Test · Shock & Response · Britain's Connectors · Gross trade. (Dependency Dial retired → Resilience.)

## Delivered

| Item | Location |
|------|----------|
| Gate 1 | `GATE1_COMPOSITION.md` · Study D locked |
| Ready series | Lifelines three · dependency · fossil · low-carbon · **gas storage** · trade · flows · capacity |
| Shock seed | `shock-events.json` |
| **UI** | `/energy?domain=imports` — all supporting views live |
| Storage package | `data/energy/natural-gas-storage/` · QA 2026-11-08 |

## Gate 2 routes

| URL | What |
|-----|------|
| `/energy?domain=imports` | **The Lifelines Map** (default) — Oil/Gas world choropleth + top-10/`list=all` RankBars + history; LNG RankBars until coords |
| `&view=resilience` | Three ET 1.3 ratios + DUKES 4.4a gas stock/capacity |
| `&view=shock&event=` | Sourced event cards |
| `&view=connectors&flow=` | ET 5.6 GWh + NESO Built MW |
| `&view=trade` / `data` | Gross trade · observation tables |
| `&view=dependency` | **Redirects to Resilience** (Dial retired) |

## Reproduce

```bash
uv run python -m energy.connectors.natural_gas_storage
uv run python -m energy.connectors.neso_interconnector_register --fetch
# …plus earlier Lifelines / dependency connectors
```

## Still open (honest residual)

- LNG UK terminal map pins — draft at `data/energy/lng-terminal-geo/` (3 harbour-authority pins sourced; Teesside blocked; RankBars until Ready + Validation)
- Study B fake partner shipping routes / landfalls remains **rejected**
- Optional DUKES 4.4b site mcm register (static; not the annual stock series)
- Gate 4 structural / a11y audit

## Unit lock (publisher native)

Keep each series in its publisher unit; label every chart; never convert across fuels for one axis.

| Series family | Unit |
|---------------|------|
| Oil partners (DUKES 3.7) | kt |
| Gas partners / LNG terminals / storage (DUKES 4.x) | GWh |
| Interconnector flows (ET 5.6) | GWh |
| Interconnector capacity (NESO) | MW |
| Import / fossil / low-carbon dependency (ET 1.3) | % (ktoe-based ratios) |
| Gross primary trade (energy trade) | Mtoe / ktoe as published |

## Forbidden

- Invent partner shipping routes or landfalls
- Mix unmarked units (kt · ktoe · GWh · MW · %)
- One fabricated security score
- Claim events caused series movements
