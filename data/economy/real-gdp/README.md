# real-gdp

**Owner:** Economy agent  
**Status:** Ready (cloud) — re-pinned 2026-11-14 from ONS GDP first quarterly estimate  
**Registry:** https://app.notion.com/40d6547176858109b56fe01fb94ff2eb  
**indicator_id:** `real-gdp`

## Series

| Field | Value |
|-------|--------|
| Publisher | ONS |
| Series ID (CDID) | **ABMI** |
| Dataset | **PN2** (live first estimate as of 2026-11-14; prefer QNA when newer) |
| Landing | https://www.ons.gov.uk/economy/grossdomesticproductgdp/timeseries/abmi/pn2 |
| Data URL | https://www.ons.gov.uk/economy/grossdomesticproductgdp/timeseries/abmi/pn2/data |
| Geography | United Kingdom (`K02000001`) |
| Frequency | Quarterly |
| Unit | £ million chained volume (market prices), SA |
| Licence | OGL v3.0 |
| Latest pin | 2026 Q3 = 749 999 · release 2026-11-12 · ref year 2024 |

## Layout

```txt
data/economy/real-gdp/
  manifest.yaml
  raw/2026-11-11/   # Aug PN2 + Sep QNA (vintage-band inputs)
  raw/2026-11-14/   # live PN2 + retained QNA snapshot
  curated/observations.csv
  README.md
src/economy/connectors/real_gdp.py
```

## Reproduce

```bash
# If corporate/sandbox proxies block ONS, unset proxy env vars first.
uv run python -m economy.connectors.real_gdp
uv run python -m britain_exchange.load_ready --via-rest --only real-gdp
```

This fetches the timeseries JSON, archives it under `raw/<UTC-date>/`, writes
curated observations + manifest, then loads to Supabase Postgres.

## QA

- `data/qa/qa_report_economy_05_gdp_repin_2026-11-14.md` — pass
