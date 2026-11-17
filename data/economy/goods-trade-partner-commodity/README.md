# goods-trade-partner-commodity

UK goods **imports and exports by partner country × SITC section (0–9)**.

## Source

- Publisher: HMRC Overseas Trade Statistics (customs / physical movement)
- API: [https://www.uktradeinfo.com/api-documentation/](https://www.uktradeinfo.com/api-documentation/) · `GET https://api.uktradeinfo.com/OTS`
- Aggregation: OData `$apply=groupby((CountryId,SITC/Sitc1Code), sum(Value))`

## Run

```bash
uv run python -m economy.connectors.goods_trade_partner_commodity
uv run python -m britain_exchange.archive_data push \
  data/economy/goods-trade-partner-commodity/curated/partner_commodity_annual.json --keep-local
```

## Outputs

| Path | Contents |
|------|----------|
| `curated/observations.csv` | Typed Observation rows (£m, ISO2, sitc1 in notes) |
| `curated/partner_commodity_annual.json` | Storage pack `economy.goods-trade-partner-commodity` for Trading World |
| `curated/partners_annual.json` | Separate ONS BoP partner *totals* pack (other connector) |

## Honesty

- **OTS ≠ ONS BoP.** Partner totals on the map stay on BoP SA; product mix here is customs.
- SITC **section** only — not full CN8 × country.
- Latest calendar year is year-to-date until December publishes.
