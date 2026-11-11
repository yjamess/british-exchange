# real-gdp

**Owner:** Economy agent  
**Status:** Validation-ready after 2026-11-11 PN2→QNA source switch (dataset=QNA; **not Ready** — set only by Validation / Orchestrator)  
**Registry:** https://app.notion.com/40d6547176858109b56fe01fb94ff2eb  
**indicator_id:** `real-gdp`

## Series

| Field | Value |
|-------|--------|
| Publisher | ONS |
| Series ID (CDID) | **ABMI** |
| Dataset | **QNA** (switched from frozen PN2 on 2026-11-11) |
| Landing | https://www.ons.gov.uk/economy/grossdomesticproductgdp/timeseries/abmi/qna |
| Data URL | https://www.ons.gov.uk/economy/grossdomesticproductgdp/timeseries/abmi/qna/data |
| Geography | United Kingdom (`K02000001`) |
| Frequency | Quarterly |
| Unit | £ million chained volume (market prices), SA |
| Licence | OGL v3.0 |

## Layout

```txt
data/economy/real-gdp/
  manifest.yaml
  raw/2026-11-11/abmi_qna.json
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
- `observation_status`: `provisional` (QNA vintage; ONS revises history).
- `source_version`: `QNA/ABMI <official_release_date>`.

## Spot-checks (pinned 2026-11-11, dataset QNA)

Against pinned raw JSON `raw/2026-11-11/abmi_qna.json` (SHA-256 `6ce4b868fc86af44653ae0ae864e587d15a849c54f347b22830cddaa92ad7693`, release 2026-09-29, reference year 2024). Raw↔curated recompute: 0 mismatches over 286 quarters.

| Period | ONS JSON | Curated |
|--------|----------|---------|
| 1955 Q1 | 149440 | 149440 |
| 2019 Q4 | 700898 | 700898 |
| 2020 Q2 | 545357 | 545357 |
| 2026 Q2 | 744453 | 744453 |

Row count: **286** quarterly observations (1955 Q1 → 2026 Q2).

## Open questions for Validation / Orchestrator

- Also curate annual ABMI aggregates as a second file?

## Hand-off

Validation-ready (dataset=QNA). Switch evidence: `docs/handover-economy-05-qna-switch-2026-11-11.md`. The old PN2 pin (2026-08-12, reference year 2023, SHA-256 `a1265250…`) is retired; levels are not comparable across vintages. The 2026-11-03 Validation report (`data/qa/qa_report_real_gdp_2026-11-03.md`) covers the PN2 bytes only and needs a re-run. Economy does **not** set registry Ready.
