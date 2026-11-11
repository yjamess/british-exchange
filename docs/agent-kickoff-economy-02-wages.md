# Kickoff — Economy Domain 02 Wages, Earnings & Income

**Template:** [agent-kickoff-economy-domain.md](agent-kickoff-economy-domain.md)  
**Notion plan:** [02 · Wages, Earnings & Income](https://app.notion.com/p/41465471768581018788fcb363cb4734)  
**Control:** [Economy Sector Control](https://app.notion.com/p/414654717685811caf11f9bfb7b3ef83)  
**Wave:** A · **Owner:** Economy · **Paths:** `src/economy/`, `data/economy/`

**Question (provisional):** Are earnings keeping up with prices, and how does pay differ across the country and workforce?

## Non-negotiables

- Whole-economy AWE (`KAI7` / `A2FC`) ≠ Energy `ashe-manufacturing-earnings`. **Link** manufacturing ASHE; do not fork.
- If national ASHE is ingested, it is a **new** Economy indicator with its own registry row.
- Geography: confirm GB vs UK notes on AWE pages before pairing with UK labour rates.
- Household income (HBAI) likely belongs with Domain 04 / future People — do not silently expand scope; note on Notion plan.

## Candidate inventory

| Indicator | Series | Path |
|-----------|--------|------|
| `nominal-earnings` | KAI7 | `data/economy/nominal-earnings/` |
| `real-earnings` | A2FC | `data/economy/real-earnings/` |

Connectors: `economy.connectors.nominal_earnings`, `real_earnings` (and labour helpers if used).

**Consumers already linking:** Energy Prices Afford (nominal earnings); Housing affordability paths — keep IDs stable.

## G2 deliverables

1. Re-validate pins vs latest AWE release; document real-terms deflator family.
2. Registry hygiene; related_indicator links to CPI/CPIH.
3. Gap list: national ASHE percentiles, regional earnings.
4. Notion plan: flagship **Pay cheque vs prices**; planned-not-ready wage ladder.
5. Handover with recommended G3 views (requirements only).

## Do not

- Fork manufacturing ASHE under `data/economy/`.
- Build frontend before Review Gate.
