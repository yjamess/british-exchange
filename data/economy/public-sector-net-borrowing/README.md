# public-sector-net-borrowing

**Owner:** Economy agent  
**Status:** Ready (self-QA pass)  
**Registry:** https://app.notion.com/40d65471768581d0b736e7e36e6b56d7  
**indicator_id:** `public-sector-net-borrowing`

## Series

| Field | Value |
|-------|--------|
| Publisher | ONS |
| Series ID (CDID) | **DZLS** |
| Dataset | **PUSF** |
| Landing | https://www.ons.gov.uk/economy/governmentpublicsectorandtaxes/publicsectorfinance/timeseries/dzls/pusf |
| Data URL | https://www.ons.gov.uk/economy/governmentpublicsectorandtaxes/publicsectorfinance/timeseries/dzls/pusf/data |
| Geography | United Kingdom (`K02000001`) |
| Frequency | monthly |
| Unit | £ million, NSA (ex public sector banks) |
| Licence | OGL v3.0 |

## Layout

```txt
data/economy/public-sector-net-borrowing/
  manifest.yaml
  raw/2026-11-03/dzls_pusf.json
  curated/observations.csv
  validation_report.md
  README.md
src/economy/connectors/public_sector_net_borrowing.py
```

## Reproduce

```bash
uv run python -m economy.connectors.public_sector_net_borrowing
```

## Spot-checks (2026-11-03 ingest)

Against pinned raw JSON:

| Period start | ONS JSON | Curated |
|--------------|----------|---------|
| 1993-01-01 |  |  |
| 2009-11-01 | 14175.0 | 14175.0 |
| 2026-09-01 | 24520.0 | 24520.0 |

Row count: **405** (1993-01-01 → 2026-09-01).

SHA-256: `6244b0066ca00a74aa32c09b35a6f3213b48a7a236fbd6d5fe9aa7a20edcb6dc`

## Related indicators

`public-sector-net-debt`, `public-sector-debt-interest`, `tax-receipts`, `total-managed-expenditure`

## Hand-off

Self-QA verdict **pass**. Registry → Ready.
