# business-investment

**Owner:** Economy agent  
**Status:** Ready (self-QA pass)  
**Registry:** https://app.notion.com/40d654717685811baa79e904f8c3646b  
**indicator_id:** `business-investment`

## Series

| Field | Value |
|-------|--------|
| Publisher | ONS |
| Series ID (CDID) | **NPEL** |
| Dataset | **PN2** |
| Landing | https://www.ons.gov.uk/economy/grossdomesticproductgdp/timeseries/npel/pn2 |
| Data URL | https://www.ons.gov.uk/economy/grossdomesticproductgdp/timeseries/npel/pn2/data |
| Geography | United Kingdom (`K02000001`) |
| Frequency | quarterly |
| Unit | £ million chained volume, SA |
| Licence | OGL v3.0 |

## Layout

```txt
data/economy/business-investment/
  manifest.yaml
  raw/2026-11-03/npel_pn2.json
  curated/observations.csv
  validation_report.md
  README.md
src/economy/connectors/business_investment.py
```

## Reproduce

```bash
uv run python -m economy.connectors.business_investment
```

## Spot-checks (2026-11-03 ingest)

Against pinned raw JSON:

| Period start | ONS JSON | Curated |
|--------------|----------|---------|
| 1997-01-01 | 37825.0 | 37825.0 |
| 2011-10-01 | 52186.0 | 52186.0 |
| 2026-04-01 | 78413.0 | 78413.0 |

Row count: **118** (1997-01-01 → 2026-04-01).

SHA-256: `41125202c10b9399d436b59b1934cc7d061c099474d4e2de0ea0f038e6b86f7c`

## Related indicators

`real-gdp`

## Hand-off

Self-QA verdict **pass**. Registry → Ready.
