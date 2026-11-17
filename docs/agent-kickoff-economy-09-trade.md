# Kickoff — Economy Domain 09 · Trade, Investment & Business

**Template:** [agent-kickoff-economy-domain.md](agent-kickoff-economy-domain.md)  
**Notion plan:** [09 · Trade, Investment & Business](https://app.notion.com/p/4146547176858138a339d24221b5bda0)  
**Control:** [Economy Sector Control](https://app.notion.com/p/414654717685811caf11f9bfb7b3ef83)  
**Overlap:** [economy-overlap-matrix.md](economy-overlap-matrix.md)  
**Wave:** C · **Owner:** Economy · **Paths:** `src/economy/`, `data/economy/`  
**Opened:** 2026-11-16 (full completion — no EmptyStage deferrals)  
**Scope note:** Domain **09 only** — not Domain 10 Policy deepen.

**Question (locked):** What does Britain buy and sell internationally, where does investment come from, and how is British business changing?

**Flagship:** Britain's Trade Ledger · **Signature:** Britain's Trading World · **Core companion:** The Investment Ledger (NPEL primary home).

## Non-negotiables

- Dataset foundation + Validation through Ready before G3 canvas (Orchestrator owns React).
- `business-investment` (NPEL) **primary home** here; Domain 05 Growth **Follows** only — never fork.
- Energy owns energy import partner detail; link Imports, do not re-ingest DESNZ oil/gas trade.
- Employment owns jobs counts; Tax owns business tax; Policy owns legislative events — Follow only.
- ONS BoP ≠ HMRC customs; goods ≠ services granularity; FDI ≠ new plant/jobs; demography death ≠ insolvency.
- Precious metals / non-monetary gold: ship ex-PM series beside headlines.
- Cloud rule: Ready → Postgres; heavy partner×commodity blobs → Storage packs.

## Eight explorer views (G3 target — all live, no EmptyStage)

| View | Experience |
|------|------------|
| `trade` | Britain's Trade Ledger |
| `world` | Britain's Trading World |
| `products` | What Britain Trades |
| `capital` | The Investment Ledger |
| `fdi` | Capital Across Borders |
| `landscape` | British Business Landscape |
| `births` | Business Births & Deaths |
| `data` | Data |

## Candidate inventory (existing)

| Indicator | Path | Notes |
|-----------|------|-------|
| `business-investment` | `data/economy/business-investment/` | Ready · NPEL / PN2 · release 224 · Domain 09 primary |

## Evidence tranches

| Tranche | Packages | Unblocks |
|---------|----------|----------|
| A | `uk-trade-mret` · `uk-trade-ex-precious-metals` | `trade` |
| B | `goods-trade-by-partner` · `goods-trade-by-commodity` · `goods-trade-partner-commodity` · `services-trade-by-category` · `services-trade-by-partner` · `goods-trade-by-uk-region` | `world` · `products` |
| C | `business-investment-by-asset` · `business-investment-by-industry` (+ NPEL confirm) | `capital` |
| D | `uk-fdi` | `fdi` |
| E | `uk-business-enterprises` · `business-demography` · `company-insolvencies` | `landscape` · `births` |

## Do not

- Edit `web/src/brand/economy/**` until Orchestrator G3 after Validation Ready.
- Mix ONS BoP and HMRC OTS as one continuous series.
- Claim a trade deficit alone is an economic loss.
- Mark Ready without Validation QA in `data/qa/`.
