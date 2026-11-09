# Kickoff — Energy Prices & Costs (Domain 03)

**Opened:** 2026-11-07  
**Owners:** Energy (data) · Orchestrator/UI (Gate 2–3 explorer)  
**Domain Notion:** https://app.notion.com/p/41065471768581b6a1f2c431166de362  
**Mode:** Gate 3 UI wire shipped (Ofgem + CPIH + Cost Shock + Regional) — Domain 03 **not** complete (income burden, wholesale, full Ofgem history, Gate 4)

## Locked question

What does energy really cost British households and industries, how has that changed, and what is being compared?

## Creative thesis (Notion)

Receipts / measured price scales / financial anatomy — **not** another generation area chart. Flagship name: **The Dissected Bill**.

## Delivered

| Item | Location |
|------|----------|
| Gate 1 source register / taxonomy / reuse map | `data/energy/energy-prices/` |
| Ready series | `domestic-electricity-bills` (QEP 2.2.1) · `domestic-electricity-unit-standing` (QEP 2.2.4) · `domestic-gas-bills` (QEP 2.3.1) · `domestic-gas-unit-standing` (QEP 2.3.4) · `ofgem-default-tariff-cap` |
| Linked Economy | `cpih-index` (L522) — real-terms only; never forked under `data/energy/` |
| Reused Ready | `industrial-electricity-prices` (QEP 3.1.2) — no rewrite |
| Connectors | `domestic_electricity_bills` · `domestic_electricity_unit_standing` · `domestic_gas_bills` · `domestic_gas_unit_standing` · `ofgem_default_tariff_cap` · Economy `cpih_index` |
| Gate 1 composition | `data/energy/energy-prices/GATE1_COMPOSITION.md` — **Study C locked** (engraved receipt) |
| **UI** | `/energy?domain=prices` · `PricesCanvas` · Dissected Bill + Cost Shock + Economies + Regional + Afford + Wholesale (catalogue via Notes View data) |
| Load path | `loadPrices()` → `domestic` · `gas` · `layers` · `gasLayers` · `industrial` · `ofgem` · `cpih` |
| Sector config | `sector-pages.ts` prices question + series list |

## Gate 2–3 routes / views

| URL | What |
|-----|------|
| `/energy?domain=prices` | Default → The Dissected Bill (Overall · cash) |
| `&view=bill&year=&payment=&bill_fuel=&region=&kwh=&vs=` | Engraved receipt + £ strips · hover/focus detail pane (Open catalogue record) · optional Compare · one typical-bill TimeChart (house exact-value table) |
| `&view=bill&bill_fuel=gas` | Gas layers (2.3.4) + total (2.3.1) |
| `&view=shock` | The Cost Shock — indexed domestic elec / gas / industry (base year = 100) |
| `&view=economies&band=` | Two British Energy Economies — separate GBP and p/kWh charts |
| `&view=regions&bill_fuel=&payment=&year=` | Regional Price Anatomy — RankBars of reconstructed bills (DESNZ regions) |
| `&view=afford` | Typical bills as a share of average pay |
| `&view=wholesale` | Generator input fuel prices (MPP) |
| Follow | Bill → Consumption domestic end-use (contextual, year retained) |

## Reproduce data

```bash
uv run python -m energy.connectors.domestic_electricity_bills
uv run python -m energy.connectors.domestic_electricity_unit_standing
uv run python -m energy.connectors.ofgem_default_tariff_cap
uv run python -m economy.connectors.cpih_index
```

## Verify UI

1. Start API + `web` (or rely on CSV fallback if API is down).
2. Open `/energy?domain=prices` — receipt + engraved strips + idle detail prompt; hover a line fills the pane (no jump to `/data`).
3. **Open catalogue record** in the pane (or Notes View data) is the only navigation to the catalogue.
4. Bill controls stay short: Fuel · Year · Region · Payment · Use · Compare. Real-terms sits as a receipt memo when CPIH is loaded.
5. **The Cost Shock** — three indexed lines; Notes say units/geography differ.
6. **Regional Price Anatomy** — RankBars with UK dashed reference; select a region in URL.
7. Do **not** claim Domain 03 complete.

## Still open

| Item | Status |
|------|--------|
| Income burden / earnings scenario (“What Can You Afford?” beyond CPIH) | open — needs Ready income/earnings link |
| Wholesale price series | open — not ingested |
| Full Ofgem history + Annex 9 regional rates | open — pin is recent GB-average periods only |
| Economy 7 / 4,800 kWh cut | open |
| Gate 4 structural + a11y audit · editorial essay | open |

## Forbidden (still)

- Invent Ofgem regional caps from DESNZ PES/LDZ averages
- Mix nominal GBP bills with industrial p/kWh on one cash axis (index chart is OK when labelled)
- Mix electricity and gas bills on one unmarked cash series
- Fork CPIH under `data/energy/`
- Claim Domain 03 complete
