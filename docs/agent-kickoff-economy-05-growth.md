# Kickoff — Economy Domain 05 Productivity & Economic Growth

**Template:** [agent-kickoff-economy-domain.md](agent-kickoff-economy-domain.md)  
**Notion plan:** [05 · Productivity & Economic Growth](https://app.notion.com/p/414654717685811a9435e45ebfe64a3b)  
**Control:** [Economy Sector Control](https://app.notion.com/p/414654717685811caf11f9bfb7b3ef83)  
**Wave:** A · **Owner:** Economy · **Paths:** `src/economy/`, `data/economy/`

**Question (provisional):** How much does Britain produce, is output growing, and is productivity rising?

## Non-negotiables

- Do **not** fork Energy manufacturing output / output-per-hour / output-per-job / BRES. **Link** those IDs for industrial context.
- Whole-economy `labour-productivity` (LZVB) is Economy-owned; manufacturing productivity stays Energy Jobs.
- Blue Book / CVM rebasing: document revision behaviour; do not treat pinned historical levels as immutable.
- Overlap matrix recommendation: `business-investment` **primary home in Domain 09** — Domain 05 Follows it. Confirm on Notion; do not claim sole ownership in both plans.

## Candidate inventory

| Indicator | Series | Path |
|-----------|--------|------|
| `real-gdp` | ABMI | `data/economy/real-gdp/` |
| `real-gdp-per-head` | IHXW | `data/economy/real-gdp-per-head/` |
| `labour-productivity` | LZVB | `data/economy/labour-productivity/` |
| `business-investment` | NPEL | `data/economy/business-investment/` (shared with 09) |

## G2 deliverables

1. Re-validate GDP / productivity pins vs latest ONS GDP / productivity release.
2. Registry hygiene; related links to manufacturing series (Energy) as contextual only.
3. Gap list: regional GVA (prefer future Regions), hours components if needed.
4. Notion plan: flagship **What Britain produces**; Notes requirements for Blue Book.
5. Handover with recommended G3 views (requirements only).

## Do not

- Re-ingest manufacturing IoP / BRES under Economy.
- Build frontend before Review Gate.
