# Kickoff — Economy Domain 01 Inflation & Prices

**Template:** [agent-kickoff-economy-domain.md](agent-kickoff-economy-domain.md)  
**Notion plan:** [01 · Inflation & Prices](https://app.notion.com/p/41465471768581d09883c708f8f5f27c)  
**Control:** [Economy Sector Control](https://app.notion.com/p/414654717685811caf11f9bfb7b3ef83)  
**Wave:** A · **Owner:** Economy · **Paths:** `src/economy/`, `data/economy/`

**Question (provisional):** How fast are prices rising in Britain, what does money buy, and how do CPI and CPIH differ?

## Non-negotiables

Follow the shared template. Extra for 01:

- CPI (`D7G7` / `D7BT`) ≠ CPIH (`L522`). Never label one as the other.
- Energy Prices **links** `cpih-index` — do not move or fork under `data/energy/`.
- “Price of everyday Britain” / item baskets stay **planned-not-ready** until official average-price series are sourced and registered.

## Candidate inventory

| Indicator | Series | Path |
|-----------|--------|------|
| `cpi-inflation` | D7G7 | `data/economy/cpi-inflation/` |
| `cpi-index` | D7BT | `data/economy/cpi-index/` |
| `cpih-index` | L522 | `data/economy/cpih-index/` |

Connectors: `economy.connectors.cpi_inflation`, `cpi_index`, `cpih_index`.

## G2 deliverables

1. Re-check pins vs latest ONS Consumer price inflation release; refresh raw checksums if stale.
2. Registry hygiene (status, Last checked, Evidence paths) for all three.
3. Gap list: COICOP contributions, CPIH annual rate companion if needed, average prices.
4. Mature Notion plan: flagship **Changing Price of Britain**; tech requirements; planned-not-ready graphics.
5. Handover note with recommended G3 views (requirements only).

## Do not

- Build frontend or expand `sector-pages.ts`.
- Ingest retailer shelf scrapes as ONS averages.
