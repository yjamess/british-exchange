# business-investment

**Owner:** Economy agent  
**Status:** Validation-ready after 2026-11-11 PN2→QNA source switch (dataset=QNA; **not Ready** — set only by Validation / Orchestrator)  
**Registry:** https://app.notion.com/40d654717685811baa79e904f8c3646b  
**indicator_id:** `business-investment`

## Series

| Field | Value |
|-------|--------|
| Publisher | ONS |
| Series ID (CDID) | **NPEL** |
| Dataset | **QNA** (switched from frozen PN2 on 2026-11-11) |
| Landing | https://www.ons.gov.uk/economy/grossdomesticproductgdp/timeseries/npel/qna |
| Data URL | https://www.ons.gov.uk/economy/grossdomesticproductgdp/timeseries/npel/qna/data |
| Geography | United Kingdom (`K02000001`) |
| Frequency | quarterly |
| Unit | £ million chained volume, SA |
| Licence | OGL v3.0 |

## Layout

```txt
data/economy/business-investment/
  manifest.yaml
  raw/2026-11-11/npel_qna.json
  curated/observations.csv
  validation_report.md
  README.md
src/economy/connectors/business_investment.py
```

## Reproduce

```bash
uv run python -m economy.connectors.business_investment
```

## Spot-checks (pinned 2026-11-11, dataset QNA)

Against pinned raw JSON `raw/2026-11-11/npel_qna.json` (release 2026-09-29):

| Period start | ONS JSON | Curated |
|--------------|----------|---------|
| 1997-01-01 | 38784.0 | 38784.0 |
| 2011-10-01 | 54150.0 | 54150.0 |
| 2026-04-01 | 83534.0 | 83534.0 |

Row count: **118** (1997-01-01 → 2026-04-01).

SHA-256: `09722c21c27a5d5462e176c19d568e6c23c0b55b30bd6e6b0c7c77a87a356076` (retired PN2 pin: `41125202…`)

## Related indicators

`real-gdp`

## Hand-off

Self-QA (2026-11-03) passed on the PN2 bytes only; raw↔curated recompute on the QNA bytes shows 0 mismatches over 118 quarters, but independent Validation must re-run. Validation-ready (dataset=QNA); Economy does **not** set registry Ready.

Switch: `docs/handover-economy-05-qna-switch-2026-11-11.md`. PN2 was frozen at 2026-08-12; QNA 2026-09-29 differs materially for NPEL (2026 Q2 83,534 vs 78,413; YoY +5.2% vs +0.8%), so the source choice affects growth, not just levels. Never mix vintages.

Ownership: primary home **Domain 09 (Trade & Investment)**; Domain 05 Follows. See `docs/handover-economy-05-growth.md`.
