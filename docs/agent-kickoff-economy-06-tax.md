# Kickoff — Economy Domain 06 Taxation & Revenue

**Template:** [agent-kickoff-economy-domain.md](agent-kickoff-economy-domain.md)  
**Notion plan:** [06 · Taxation & Revenue](https://app.notion.com/p/414654717685816bb414e87ccbd501fc)  
**Control:** [Economy Sector Control](https://app.notion.com/p/414654717685811caf11f9bfb7b3ef83)  
**Overlap:** [economy-overlap-matrix.md](economy-overlap-matrix.md)  
**Wave:** B · **Owner:** Economy · **Paths:** `src/economy/`, `data/economy/`

**Question (provisional):** How much does the state raise, and from which taxes?

## Non-negotiables

Follow the shared template. Extra for 06:

- **AHHY** is ONS public-sector taxes + NICs (PSF) — **not** HMRC cash receipts. Never label as HMRC cash without a separate series and registry row.
- Pair with Domain 07 TME and Domain 08 borrowing honestly (flows, not a closed identity).
- No frontend until Wave B G3 for this domain.

## Candidate inventory

| Indicator | Series | Path | Notes |
|-----------|--------|------|-------|
| `tax-receipts` | AHHY / PUSF | `data/economy/tax-receipts/` | Pin exists — re-check vs live ONS PSF |

Connector: `economy.connectors.tax_receipts` (confirm module name on disk).

**Gaps to scope (not ingest until Orchestrator says):** HMRC cash tax receipts; VAT / income tax / NICs breakdown; tax as % of GDP (official series only — do not invent).

## G2 deliverables

1. Re-pin AHHY vs latest PSF; checksums; validation notes.
2. Validation QA → Ready flip when passed.
3. Document HMRC cash vs PSF AHHY distinction in Notion + handover.
4. Mature Notion plan: flagship **What the state raises**; Follow to Debt / Spending.
5. Handover with recommended G3 views (requirements only).

## Do not

- Present AHHY as HMRC cash.
- Derive tax/GDP without an official ratio series (same rule as HF6X for debt).
- Build `/economy?domain=tax` canvas in G2.
