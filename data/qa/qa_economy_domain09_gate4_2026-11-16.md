# QA report — Economy Domain 09 Gate 4 roll-up · 2026-11-16

## Scope

- Domain: [09 · Trade, Investment & Business](https://app.notion.com/p/4146547176858138a339d24221b5bda0)
- Structural audit: `docs/gate4-audit-economy-09-trade.md`
- Rolls up independent Validation already filed; does not re-ingest.

## Prior Validation / cloud pins

| Check | Verdict |
|-------|---------|
| `qa_report_economy_09_trade_mret_2026-11-16.md` | Pass — exports − imports ≈ balance by component × basis |
| Postgres `uk-trade-mret` | 6546 obs · 1992–2026-09 |
| Postgres `uk-trade-ex-precious-metals` | 2142 obs |
| Postgres `goods-trade-by-partner` | 170646 obs (UI uses annual ISO2 Storage rollup) |
| Postgres `goods-trade-by-commodity` | 7140 obs |
| Postgres `goods-trade-by-uk-region` | 320 obs |
| Postgres `services-trade-by-category` / `by-partner` | 1460 / 1660 |
| Postgres `business-investment` (+ asset / industry) | 355 / 590 / 3422 |
| Postgres `uk-fdi` | 2746 obs |
| Postgres `uk-business-enterprises` · `business-demography` · `company-insolvencies` | 288 / 18 / 3483 |
| Storage `economy.goods-trade-partners-annual` | Pass |

## Method checks carried forward

- ONS BoP (MRET) ≠ HMRC customs / all-countries partner packs.
- Goods SITC and services EBOPS never mixed on one chart.
- FDI flows / positions / earnings are ownership measures — not greenfield jobs.
- UK business counts are VAT/PAYE registered — not Companies House universe.
- Insolvency Service totals ≠ ONS demography deaths.
- Precious metals called out via ex-PM companion series.
- Country×commodity CN8 matrix not invented; commodity lens is SITC WW.

## Summary

- **Verdict: pass** for Gate 4 close on the live Explorer pin set.
- **UI:** eight views on `/economy?domain=investment`; `ECONOMY_READY_DOMAINS` includes `investment`.
- **Deferred (honesty, not fails):** full HMRC CN8×country history; Domain 10 Policy deepen; Growth Revision Archive; regional GVA (Regions-owned).

## Blockers

- None for Gate 4 on trade · world · products · capital · fdi · landscape · births · data.
