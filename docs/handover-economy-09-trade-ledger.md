# Handover — Economy Domain 09 Tranche A · Trade Ledger

**Date:** 2026-11-16  
**Owner:** Economy → Validation **PASS** → Orchestrator cloud  
**Kickoff:** [agent-kickoff-economy-09-trade.md](agent-kickoff-economy-09-trade.md)

## Dataset foundation

| Indicator | Obs | Span | Cloud release | Registry |
|-----------|-----|------|---------------|----------|
| `uk-trade-mret` | 6546 | 1997-01 → 2026-09 | **281** | [Ready](https://app.notion.com/p/41a654717685818eae22d00ab6fc36ae) |
| `uk-trade-ex-precious-metals` | 2142 | (monthly, 6 CDIDs) | **280** | [Ready](https://app.notion.com/p/41a65471768581d1941ec9551d06ade1) |

- Connectors: `economy.connectors.uk_trade_mret` · `economy.connectors.uk_trade_ex_precious_metals`
- QA: [qa_report_economy_09_trade_mret_2026-11-16.md](../data/qa/qa_report_economy_09_trade_mret_2026-11-16.md) — **8/0 PASS**
- Notes dims: `series=<CDID>; category=<flow>-<component>-<basis>`
- Sep 2026 spot: IKBH 83382 · IKBI 88516 · IKBJ −5134 (exports−imports identity exact)

## Reproduce

```bash
uv run python -m economy.connectors.uk_trade_mret
uv run python -m economy.connectors.uk_trade_ex_precious_metals
PYTHONPATH=src uv run python -m validation.qa_economy_09_trade_mret_2026_11_16
uv run python -m britain_exchange.load_ready --only uk-trade-mret --only uk-trade-ex-precious-metals
```

## Honesty

- BoP SA £m — not HMRC customs.
- Headlines include precious metals; FSID/FSIE are underlying companions.
- CVM CDIDs IKBK/IKBL/IKBM/BQKQ/BQKO/IKBE/IKBF resolve under GDP timeseries path with dataset MRET.
