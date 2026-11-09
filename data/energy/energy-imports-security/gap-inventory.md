# Gate 1 gap inventory — Energy Imports & Security

**Date:** 2026-11-07  
**Against:** Notion Domain 05 §1 investigative scope + §5 candidate sources  
**Baseline Ready:** `energy-imports-and-exports` (ET 1.3 Quarter supply and use — Imports/Exports)

## §1 scope vs current data

| Scope item | Ready / new coverage | Gap status |
|------------|----------------------|------------|
| Gross imports (all fuels, energy balance) | Ready `energy-imports-and-exports` `flow=Imports` | **Covered** (Gate 2 slice) |
| Gross exports | Ready `flow=Exports` (signed) | **Covered** |
| Net trade | Computable as Imports + Exports from Ready; also published on ET 1.3 dependency sheets (not separately curated) | **Derived OK for Gate 2**; optional later series if UI needs publisher-labelled net |
| Import dependency | **New** `energy-import-dependency` (annual + quarterly ratios) | **Covered this wave** |
| Import dependency **by fuel** | Not in ET 1.3 dependency sheet (all-fuels ratio only) | **Gate 3** — needs fuel-balance construction or another DESNZ table; do not invent |
| Oil and gas trade, LNG vs pipeline, origin/destination | **Ready** `oil-imports-by-country` · `gas-trade-by-partner` · `lng-imports-by-terminal` (G3B + QA) | **Covered for Lifelines Map** (partners + LNG terminals — not landfalls) |
| Electricity interconnector flows, capacities, net imports | Flows Ready `electricity-interconnector-flows` (ET 5.6); capacity Ready `electricity-interconnector-capacity` (NESO) | **Covered** (GWh ≠ MW) |
| Energy security, storage, diversity, seasonal measures | **Ready** `fossil-fuel-dependency` · `low-carbon-energy-share` · `natural-gas-storage` (DUKES 4.4a) | **Resilience Test covered** (three ratios + gas stock/capacity); never one score |
| Major disruptions / policy context | Editorial, not a time series | Out of ingest scope (Gate 3 editorial) |

## §5 candidate sources — pin status

| Candidate | Role for Domain 05 | This wave |
|-----------|--------------------|-----------|
| [DESNZ Energy Trends](https://www.gov.uk/government/collections/energy-trends) ET 1.3 | Gross trade + import dependency | **Pinned** `ET_1.3_SEP_26.xlsx` (same release as Ready) |
| [DUKES 2026 commodity balances](https://www.gov.uk/government/statistics/digest-of-uk-energy-statistics-dukes-2026) | Annual fuel balances / foreign trade depth | Scoping only — not required once ET 1.3 dependency ships |
| [NESO Data Portal](https://www.neso.energy/data-portal) | Interconnector operational flows | Gate 3 |
| Ofgem | Market / security-of-supply publications | Gate 3 context, not primary flow series |

## Non-overlap notes

- **Prices (Domain 03):** no price series touched.
- **Fossils (Domain 04):** production indicators stay Fossils-owned; import volumes here are balance-table trade, not North Sea production.
- **Generation / Consumption:** electricity *trade* in 1.3b is not generation mix; do not merge with `electricity-generation*` packages.
- **Table 1.3b by fuel:** only latest 1–2 years/quarters side-by-side — weak long-run series. Prefer Gate 3 dedicated fuel-trade ingest over pretending 1.3b is a history pack.

## Gate 2 vertical slice decision

Smallest useful official series that adds a **new investigative dimension** beyond Ready gross flows:

→ **Import dependency ratio** from ET 1.3 `Annual dependency & low carbon` + `Quarter dependency & low carbon`.

Ready already supplies the Lifelines Map’s aggregate Import/Export toggle. Dependency Dial needs the published ratio with DESNZ denominator — not a home-made Imports÷Production invent.

## Gate 3 backlog (explicit)

1. Interconnector atlas (capacity MW vs transferred energy vs net) — **shipped 2026-11-08**: ET 5.6 flows + NESO `electricity-interconnector-capacity` on Britain's Connectors (project MW ranks; corridor GWh stay separate).
2. Partner-country / entry-point geography at official specificity only — **pinned 2026-11-07** (see `data/energy/gate3-source-discovery/`):
   - Oil/products by origin: [DUKES 3.7](https://www.gov.uk/government/statistics/petroleum-chapter-3-digest-of-united-kingdom-energy-statistics-dukes) · [XLSX](https://assets.publishing.service.gov.uk/media/6a69f0a74dda8076771a433f/DUKES_3.7.xlsx)
   - Gas trade + facilities: [DUKES 4.5](https://assets.publishing.service.gov.uk/media/6aba96a9734e2435f202f1d6/DUKES_4.5.xlsx)
   - LNG by terminal (entry-point honesty): [DUKES 4.6](https://assets.publishing.service.gov.uk/media/6a69f46eb5fc953081705fea/DUKES_4.6.xlsx)
   - Aggregate fuel trade volumes: [DUKES G.1](https://assets.publishing.service.gov.uk/media/6a69e9780825cc51a6c37cee/DUKES_G.1.xlsx)
   - Honesty: partner countries + LNG terminals — **not** a full pipeline landfall atlas.
3. Fuel-split long-run imports/exports (if a multi-year table is pinned).
4. Storage / diversity indicators as **separate** registry rows — **shipped 2026-11-08**: Ready `natural-gas-storage` (DUKES 4.4a stock / stock change / capacity GWh) on Resilience Test.
5. Shock & Response editorial cards — **shipped 2026-11-08** (`shock-events.json` · `view=shock`); extend seed only with pinned sources.
