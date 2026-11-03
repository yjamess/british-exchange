# total-managed-expenditure

**Owner:** Economy agent  
**Status:** Ready (self-QA pass)  
**Registry:** https://app.notion.com/40d65471768581fdbd63d0fe45d94e87  
**indicator_id:** `total-managed-expenditure`

## Series

| Field | Value |
|-------|--------|
| Publisher | ONS |
| Series ID (CDID) | **EBFT** |
| Dataset | **PUSF** |
| Landing | https://www.ons.gov.uk/economy/governmentpublicsectorandtaxes/publicsectorfinance/timeseries/ebft/pusf |
| Data URL | https://www.ons.gov.uk/economy/governmentpublicsectorandtaxes/publicsectorfinance/timeseries/ebft/pusf/data |
| Geography | United Kingdom (`K02000001`) |
| Frequency | monthly |
| Unit | £ million, NSA |
| Licence | OGL v3.0 |

## Layout

```txt
data/economy/total-managed-expenditure/
  manifest.yaml
  raw/2026-11-03/ebft_pusf.json
  curated/observations.csv
  validation_report.md
  README.md
src/economy/connectors/total_managed_expenditure.py
```

## Reproduce

```bash
uv run python -m economy.connectors.total_managed_expenditure
```

## Spot-checks (2026-11-03 ingest)

Against pinned raw JSON:

| Period start | ONS JSON | Curated |
|--------------|----------|---------|
| 1997-04-01 | 26918.0 | 26918.0 |
| 2012-01-01 | 66277.0 | 66277.0 |
| 2026-09-01 | 123791.0 | 123791.0 |

Row count: **354** (1997-04-01 → 2026-09-01).

SHA-256: `2669443f7b262618fe67a0346c5b0c58fba700f1091fd234dfb9977a5268cfbc`

## Related indicators

`public-sector-net-borrowing`, `public-sector-net-debt`, `public-sector-debt-interest`, `tax-receipts`

## Hand-off

Self-QA verdict **pass**. Registry → Ready.
