# real-gdp

**Owner:** Economy agent  
**Status:** Ingesting → hand to Validation (do not mark Ready here)  
**Registry:** https://app.notion.com/40d6547176858109b56fe01fb94ff2eb  
**indicator_id:** `real-gdp`

## Series

| Field | Value |
|-------|--------|
| Publisher | ONS |
| Series ID (CDID) | **ABMI** |
| Dataset | **PN2** |
| Landing | https://www.ons.gov.uk/economy/grossdomesticproductgdp/timeseries/abmi/pn2 |
| Data URL | https://www.ons.gov.uk/economy/grossdomesticproductgdp/timeseries/abmi/pn2/data |
| Geography | United Kingdom (`K02000001`) |
| Frequency | Quarterly |
| Unit | £ million chained volume (market prices), SA |
| Licence | OGL v3.0 |

## Layout

```txt
data/economy/real-gdp/
  manifest.yaml
  raw/2026-11-03/abmi_pn2.json
  curated/observations.csv
  README.md
src/economy/connectors/real_gdp.py
```

## Reproduce

```bash
# If corporate/sandbox proxies block ONS, unset proxy env vars first.
uv run python -m economy.connectors.real_gdp
```

This fetches the timeseries JSON, archives it under `raw/<UTC-date>/`, writes
`curated/observations.csv` (quarterly only), and refreshes `manifest.yaml`
(including SHA-256 of the raw file).

## Transform rules

- Source: ONS website timeseries JSON (`quarters` array only; annual rows kept in raw, not curated).
- Period: calendar quarter ISO bounds (`YYYY-MM-DD`).
- Geography: fixed `K02000001` / `United Kingdom`.
- `observation_status`: `provisional` (PN2 first-estimate family; ONS revises history).
- `source_version`: `PN2/ABMI <official_release_date>`.

## Spot-checks (2026-11-03 ingest)

Against pinned raw JSON `raw/2026-11-03/abmi_pn2.json`:

| Period | ONS JSON | Curated |
|--------|----------|---------|
| 1955 Q1 | 145457 | 145457 |
| 2019 Q4 | 670587 | 670587 |
| 2020 Q2 | 522356 | 522356 |
| 2026 Q2 | 712545 | 712545 |

Row count: **286** quarterly observations (1955 Q1 → 2026 Q2).

## Open questions for Validation / Orchestrator

- Prefer QNA vintage after second estimate vs always PN2 landing URL?
- Also curate annual ABMI aggregates as a second file?

## Hand-off

Ready for Validation QA once Orchestrator schedules it. Economy does **not** set registry Ready.
