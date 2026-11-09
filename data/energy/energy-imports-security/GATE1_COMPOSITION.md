# Gate 1 — Energy Imports & Security · composition studies

**Domain:** 05  
**Notion:** https://app.notion.com/p/410654717685813f8062c65191f6c0bb  
**Updated:** 2026-11-08  
**Rule:** Three materially different studies; lock one before Gate 2 UI rebuild.  
**True Notion flagship:** **The Lifelines Map**.

## Creative thesis (locked from Notion)

Maritime charts and international exchange diagrams — every arrow a measured flow or clearly labelled conceptual connection. A beautiful network must not become a false map of supply routes.

## Study A — “Dependency TimeChart” (thin Gate 2)

One line of import dependency % with a separate gross trade chart.

- **Truthful:** Ready `energy-import-dependency` + `energy-imports-and-exports`.
- **Fails thesis:** Notion flagship is a **lifelines map**; a lone dependency line is supporting context only.
- **Reject** as flagship. **2026-11-08:** Dependency Dial tab **retired** — ratio history sits on Resilience; gross volumes on Gross trade; series remain in Data.

## Study B — “Fake partner lifelines”

Schematic UK coastline with invented country arrows / shipping routes sized by “feel”.

- **Expressive:** matches maritime metaphor.
- **Fails honesty:** no Ready lat/lon for partners; would invent routes and precision.
- **Reject** permanently for partner countries. LNG *terminals* are named UK facilities — still no Ready map geometry; do not invent landfalls.

## Study C — “Dependency ledger + Connectors strip” (interim, shipped)

Until partner series were Ready: Dependency Dial ledger + Britain's Connectors (ET 5.6). Dial later retired once Resilience + Gross trade covered the same honesty.

## Study D — “Measured Lifelines ranks” (**locked flagship**)

Gate 3B Validated packages unlock the flagship without inventing geography. **2026-11-08 upgrade:** Oil/Gas use a **world country choropleth** (Natural Earth 110m public domain) of published country-of-origin volumes — not Study B shipping arrows.

| Fuel cut | Ready series | Geographic honesty |
|----------|--------------|--------------------|
| Oil | `oil-imports-by-country` (DUKES 3.7, thousand tonnes) | Partner **countries of origin** on choropleth + ranks — not landfalls |
| Gas | `gas-trade-by-partner` (DUKES 4.5a, GWh) | Partner countries on choropleth · Pipeline / LNG / Combined · Import / Export / Net (Net = UK aggregate only) |
| LNG entry | `lng-imports-by-terminal` (DUKES 4.6, GWh) | Named UK **terminals** · **RankBars only** until an official terminal coordinate pin exists |

**Encoding (Explorer shell, Housing grammar):**

1. Fuel control → Oil / Gas / LNG terminals.
2. Flow control → Import / Export / Net where the publisher publishes that cut (oil and LNG terminals = Imports only; gas Net = UK aggregate, not by partner).
3. Gas mode → Pipeline / LNG / Combined (sum partner rows by name; never mix with oil tonnes).
4. Oil/Gas year → `WorldChoropleth` of partner countries (DUKES label → Natural Earth ADM0_A3; unmatched stay RankBars-only).
5. Top 10 RankBars by default (`list=top`); full ranked list via `list=all` as RankBars (published total as reference when present).
6. Select a partner/terminal (map or ranks) → TimeChart history with Exact values disclosure on the instrument — no parallel HTML echo table.
7. Notes foot · Data catalogue.

- **Does not invent:** shipping itineraries, partner coordinates, pipeline landfalls, LNG map pins without a sourced geometry, security scores, ktoe = GWh.
- **Study B** (fake routes / landfalls) stays **rejected**.
- **Units stay labelled:** oil thousand tonnes; gas and LNG GWh — never one unmarked axis.
- **Supporting views remain:** Resilience (ratios + ratio-beside-gross strip + gas storage) · Shock · Britain's Connectors · Gross trade · Data.

## Locked for Gate 2 flagship rebuild

**Study D.** View id `lifelines`. Default domain tab. Supporting views shipped (2026-11-08): Resilience Test (ratios + gas storage), Shock & Response, Connectors (flows + capacity). Domain 05 Gate 3 supporting set complete for the Notion brief.

## Journeys (with Lifelines)

1. Oil/gas partner year → Fossils production (contextual) · Prices (contextual)
2. LNG terminal → Connectors is electricity — do **not** pretend LNG = interconnector
3. Lifelines fuel → Resilience same year (contextual; ratio ≠ partner map; gross ktoe strip on Resilience)
