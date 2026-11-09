# Gate 1 — The Dissected Bill · composition studies

**Domain:** 03 Energy Prices & Costs  
**Notion:** https://app.notion.com/p/41065471768581b6a1f2c431166de362  
**Date:** 2026-11-07  
**Rule:** Three materially different studies; lock one before Gate 2 UI rebuild.

## Creative thesis (locked from Notion)

Treat the electricity bill as an economic artefact you can dismantle. Receipts, measured price scales, typographic layers and financial anatomy — not another generation area chart.

## Study A — “Timeline of totals” (current thin Gate 2)

One line chart of illustrative annual bills (GBP @ fixed kWh) with payment/tariff filters.

- **Truthful:** uses Ready QEP 2.2.1 / 2.3.1.
- **Fails thesis:** does not dismantle the bill; looks like every other Energy domain TimeChart.
- **Reject** as flagship encoding.

## Study B — “Invoice mock”

Fake interactive PDF-style invoice with editable line items and a calculated total.

- **Expressive:** matches “receipt” metaphor.
- **Fails honesty:** invites invented unit rates / standing charges if components are missing; feels like a billing product, not an Observatory instrument.
- **Reject** as primary encoding (table-first alternative remains required).

## Study C — “Engraved receipt layers” (**selected**)

A typographic receipt for one selected year × fuel × payment × tariff:

1. **Header** — period, geography, assumed kWh (labelled DESNZ fixed, not Ofgem TDCV).
2. **Layer 1 — Energy** — unit rate (p/kWh or £/kWh) × assumed kWh → usage pounds.
3. **Layer 2 — Standing** — fixed annual charge (£/year).
4. **Layer 3 — Total** — published illustrative bill (QEP 2.2.1 / 2.3.1) as the official receipt total; show reconciliation when unit+standing reconstruct it.
5. **Historical dial** — same cut across years (valid matched series only).
6. **Exact-data table** — always available under the receipt.

- **Requires:** QEP **2.2.4** (elec unit + fixed costs) for layers; Ready 2.2.1 for official total; gas twin later via 2.3.4.
- **Does not invent:** no DIY unit rate from bill÷kWh when 2.2.4 is missing for a cut.
- **Measure switch (later Gate 3):** Unit rate / Typical bill / Real cost / Income burden — separate modes, never one unmarked axis.

## Locked for Gate 2 rebuild

**Study C.** Supporting “Two British Energy Economies” stays as a secondary view (domestic bill vs industrial p/kWh, separate charts). Cost Shock / Afford / Regional wait on further Ready series (deflators, Ofgem cap, regional tables).

## Journeys (Gate 2 minimum)

One context-preserving link: dissected domestic electricity bill → Energy Consumption domestic end-use (year retained; use ≠ cost).
