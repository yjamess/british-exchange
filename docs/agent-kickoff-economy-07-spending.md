# Kickoff — Economy Domain 07 Public Spending & Services

**Template:** [agent-kickoff-economy-domain.md](agent-kickoff-economy-domain.md)  
**Notion plan:** [07 · Public Spending & Services](https://app.notion.com/p/41465471768581df9c9ad184839231b7)  
**Control:** [Economy Sector Control](https://app.notion.com/p/414654717685811caf11f9bfb7b3ef83)  
**Overlap:** [economy-overlap-matrix.md](economy-overlap-matrix.md)  
**Wave:** B · **Owner:** Economy · **Paths:** `src/economy/`, `data/economy/`

**Question (provisional):** How much does the state spend, and on what?

## Non-negotiables

Follow the shared template. Extra for 07:

- **EBFT** Total Managed Expenditure (TME) is the headline pin — declare NSA / coverage vs departmental DEL/AME.
- OSCAR / COFOG / function breakdowns stay **planned-not-ready** until sourced and registered (do not mock).
- Link Domain 06 tax receipts and Domain 08 borrowing; do not invent a residual identity in charts.
- No frontend until Wave B G3 for this domain.

## Candidate inventory

| Indicator | Series | Path | Notes |
|-----------|--------|------|-------|
| `total-managed-expenditure` | EBFT / PUSF | `data/economy/total-managed-expenditure/` | Pin exists — re-check vs live ONS PSF |

Connector: `economy.connectors.total_managed_expenditure` (confirm module name on disk).

**Gaps to scope:** COFOG / function split; DEL vs AME; real-terms TME (needs documented deflator — prefer CPIH link, Exchange-labelled).

## G2 deliverables

1. Re-pin EBFT vs latest PSF; checksums; validation notes.
2. Validation QA → Ready flip when passed.
3. Gap list for OSCAR / COFOG with verified sources (or explicit Blocked).
4. Mature Notion plan: flagship **What the state spends**; Follow to Tax + Debt.
5. Handover with recommended G3 views (requirements only).

## Do not

- Ship function breakdowns without official series.
- Build `/economy?domain=spending` canvas in G2.
- Equate TME with “services people receive” without a labelled gap.
