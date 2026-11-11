# real-gdp-per-head

**Owner:** Economy agent  
**Status:** Validation-ready after 2026-11-11 PN2→QNA source switch (dataset=QNA; **not Ready** — set only by Validation / Orchestrator)  
**Registry:** https://app.notion.com/40d65471768581e98479ff451a55164b  
**indicator_id:** `real-gdp-per-head`

## Series

| Field | Value |
|-------|--------|
| Publisher | ONS |
| Series ID (CDID) | **IHXW** |
| Dataset | **QNA** (switched from frozen PN2 on 2026-11-11) |
| Landing | https://www.ons.gov.uk/economy/grossdomesticproductgdp/timeseries/ihxw/qna |
| Geography | United Kingdom (`K02000001`) |
| Frequency | Quarterly |
| Unit | £ chained volume (market prices), SA; reference year 2024 at this vintage |
| Licence | OGL v3.0 |

## Reproduce

```bash
uv run python -m economy.connectors.real_gdp_per_head
```

## Pin (2026-11-11, dataset QNA)

- Raw: `raw/2026-11-11/ihxw_qna.json`, SHA-256 `7a03fd267fefc5fcc7e66bc9ac05bf3b42d24806696c4ef7530ac3dcf29fb7ba`
- Release date: 2026-09-29
- Rows: 322 (1946 Q1 → 2026 Q2). Latest: 2026 Q2 = £10,692. Raw↔curated recompute: 0 mismatches.
- **Known issue:** ONS publishes `0` as a placeholder before data exist. 36 curated rows (1946 Q1 → 1954 Q4) are `0.0`, not real values (PN2 had 28 zeros plus 8 blanks). Do not chart or index pre-1955 values; flagged to Orchestrator.

## Vintage caveat

The retired PN2 pin (2026-08-12) was on reference year 2023 (2026 Q2 = £10,234); QNA is about 4.5% higher. Growth is almost unchanged; levels are not comparable across vintages. See `docs/handover-economy-05-qna-switch-2026-11-11.md`.

## Hand-off

Validation-ready (dataset=QNA). Economy does **not** set registry Ready.
