# tax-receipts

**Owner:** Economy agent  
**Status:** Ready (self-QA pass)  
**Registry:** https://app.notion.com/40d654717685811090b0dba9cfd17526  
**indicator_id:** `tax-receipts`

## Series

| Field | Value |
|-------|--------|
| Publisher | ONS |
| Series ID (CDID) | **AHHY** |
| Dataset | **PUSF** |
| Landing | https://www.ons.gov.uk/economy/governmentpublicsectorandtaxes/publicsectorfinance/timeseries/ahhy/pusf |
| Data URL | https://www.ons.gov.uk/economy/governmentpublicsectorandtaxes/publicsectorfinance/timeseries/ahhy/pusf/data |
| Geography | United Kingdom (`K02000001`) |
| Frequency | monthly |
| Unit | £ million, NSA (PS taxes + NICs) |
| Licence | OGL v3.0 |

## Layout

```txt
data/economy/tax-receipts/
  manifest.yaml
  raw/2026-11-03/ahhy_pusf.json
  curated/observations.csv
  validation_report.md
  README.md
src/economy/connectors/tax_receipts.py
```

## Reproduce

```bash
uv run python -m economy.connectors.tax_receipts
```

## Spot-checks (2026-11-03 ingest)

Against pinned raw JSON:

| Period start | ONS JSON | Curated |
|--------------|----------|---------|
| 1997-04-01 | 21096.0 | 21096.0 |
| 2012-01-01 | 56444.0 | 56444.0 |
| 2026-09-01 | 88127.0 | 88127.0 |

Row count: **354** (1997-04-01 → 2026-09-01).

SHA-256: `ea9d05903b6d5287484b95bd8c7d7eb5985d2e4b897d30070be6be3f65748ed1`

## Related indicators

`public-sector-net-borrowing`, `public-sector-net-debt`, `public-sector-debt-interest`, `total-managed-expenditure`

## Hand-off

Self-QA verdict **pass**. Registry → Ready.
