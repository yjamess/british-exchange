# Kickoff — Economy Domain 08 Public Debt & Government Finances

**Template:** [agent-kickoff-economy-domain.md](agent-kickoff-economy-domain.md)  
**Notion plan:** [08 · Public Debt & Government Finances](https://app.notion.com/p/414654717685811cb155f725cba481a3)  
**Control:** [Economy Sector Control](https://app.notion.com/p/414654717685811caf11f9bfb7b3ef83)  
**Wave:** A · **Owner:** Economy · **Paths:** `src/economy/`, `data/economy/`

**Question (provisional):** What does the state owe, what does it borrow, and what does debt interest cost?

## Non-negotiables

- Keep **debt**, **borrowing**, and **interest** as separate measures — never one unmarked axis.
- Debt-as-%-of-GDP: **Orchestrator 2026-11-11** — ingest official ONS **HF6X**; do **not** derive from `real-gdp` (ABMI CVM ≠ PSND denominator).
- PSF monthly estimates revise — keep observation_status / revision notes honest.
- Domains 06 (tax) and 07 (TME) are separate; link, don’t merge fiscal stories into one chart.

## Candidate inventory

| Indicator | Series | Path |
|-----------|--------|------|
| `public-sector-net-debt` | HF6W | `data/economy/public-sector-net-debt/` |
| `public-sector-net-borrowing` | DZLS | `data/economy/public-sector-net-borrowing/` |
| `public-sector-debt-interest` | NMFX | `data/economy/public-sector-debt-interest/` |

Connectors: `economy.connectors.public_sector_net_debt`, `public_sector_net_borrowing`, `public_sector_debt_interest` (and fiscal helpers).

## G2 deliverables

1. Re-validate pins vs latest Public Sector Finances release.
2. Registry hygiene; related links to tax-receipts / TME / real-gdp.
3. Gap list: official PSND as % of GDP series, ex/incl banks clarity in UI copy requirements.
4. Notion plan: flagship **Debt dial**; planned-not-ready %GDP instrument requirements.
5. Handover with recommended G3 views (requirements only).

## Do not

- Invent %GDP from `real-gdp`; use HF6X once ingested.
- Build frontend before Review Gate.
