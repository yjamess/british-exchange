# public-sector-debt-interest

**Owner:** Economy agent  
**Status:** Ready (self-QA pass)  
**Registry:** https://app.notion.com/40d654717685815cb4e5d52cb43c17f3  
**indicator_id:** `public-sector-debt-interest`

## Series

| Field | Value |
|-------|--------|
| Publisher | ONS |
| Series ID (CDID) | **NMFX** |
| Dataset | **PUSF** |
| Landing | https://www.ons.gov.uk/economy/governmentpublicsectorandtaxes/publicsectorfinance/timeseries/nmfx/pusf |
| Data URL | https://www.ons.gov.uk/economy/governmentpublicsectorandtaxes/publicsectorfinance/timeseries/nmfx/pusf/data |
| Geography | United Kingdom (`K02000001`) |
| Frequency | monthly |
| Unit | £ million, NSA (CG net interest payable) |
| Licence | OGL v3.0 |

## Layout

```txt
data/economy/public-sector-debt-interest/
  manifest.yaml
  raw/2026-11-03/nmfx_pusf.json
  curated/observations.csv
  validation_report.md
  README.md
src/economy/connectors/public_sector_debt_interest.py
```

## Reproduce

```bash
uv run python -m economy.connectors.public_sector_debt_interest
```

## Spot-checks (2026-11-03 ingest)

Against pinned raw JSON:

| Period start | ONS JSON | Curated |
|--------------|----------|---------|
| 1997-04-01 | 1703.0 | 1703.0 |
| 2012-01-01 | 4281.0 | 4281.0 |
| 2026-09-01 | 10933.0 | 10933.0 |

Row count: **354** (1997-04-01 → 2026-09-01).

SHA-256: `56e3bf137fbb764fb5ea198af5644816c5e7da756e1b818631a8b2aafd9dc620`

## Related indicators

`public-sector-net-borrowing`, `public-sector-net-debt`, `tax-receipts`, `total-managed-expenditure`

## Hand-off

Self-QA verdict **pass**. Registry → Ready.
