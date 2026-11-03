# public-sector-net-debt

**Owner:** Economy agent  
**Status:** Ready (self-QA pass)  
**Registry:** https://app.notion.com/40d65471768581aba151c1ec18617559  
**indicator_id:** `public-sector-net-debt`

## Series

| Field | Value |
|-------|--------|
| Publisher | ONS |
| Series ID (CDID) | **HF6W** |
| Dataset | **PUSF** |
| Landing | https://www.ons.gov.uk/economy/governmentpublicsectorandtaxes/publicsectorfinance/timeseries/hf6w/pusf |
| Data URL | https://www.ons.gov.uk/economy/governmentpublicsectorandtaxes/publicsectorfinance/timeseries/hf6w/pusf/data |
| Geography | United Kingdom (`K02000001`) |
| Frequency | monthly |
| Unit | £ billion, NSA (ex public sector banks) |
| Licence | OGL v3.0 |

## Layout

```txt
data/economy/public-sector-net-debt/
  manifest.yaml
  raw/2026-11-03/hf6w_pusf.json
  curated/observations.csv
  validation_report.md
  README.md
src/economy/connectors/public_sector_net_debt.py
```

## Reproduce

```bash
uv run python -m economy.connectors.public_sector_net_debt
```

## Spot-checks (2026-11-03 ingest)

Against pinned raw JSON:

| Period start | ONS JSON | Curated |
|--------------|----------|---------|
| 1975-03-01 | 52.1 | 52.1 |
| 2000-12-01 | 333.3 | 333.3 |
| 2026-09-01 | 3005.0 | 3005.0 |

Row count: **619** (1975-03-01 → 2026-09-01).

SHA-256: `1c277e826426a35dc5cbe8dd3d7330275f523ec23edd6890c3fef2cc0cb8540e`

## Related indicators

`public-sector-net-borrowing`, `public-sector-debt-interest`, `tax-receipts`, `total-managed-expenditure`

## Hand-off

Self-QA verdict **pass**. Registry → Ready.
