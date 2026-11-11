# nominal-earnings (KAI7) — validation notes (Economy G2, not a Validation sign-off)

**Checked:** 2026-11-11 by Economy domain 02 subagent. **Status claim:** none — Validation agent still owns Ready.

| Check | Result |
|-------|--------|
| Live ONS `/data` JSON vs pin | `months` array identical: 320 points, 2000 JAN – 2026 AUG (707), 0 value differences |
| Raw checksum | live bytes sha256 `c23b05e8873d568c7cab0dd7779b442e9370bb477b1705c544bf34d1634c7c98` = manifest `raw_evidence[0]` |
| ONS release | 2026-10-19; next release 17 November 2026 |
| Curated rows | 320 (+ header); matches `months` count |
| ONS title | "AWE: Whole Economy Level (£): Seasonally Adjusted Regular Pay Excluding Arrears" |

## Geography (open defect — not fixed here)

ONS AWE (MWSS) covers **Great Britain** (AWE QMI: "Geographic coverage: Great Britain"; excludes Northern Ireland). Curated rows carry `geography_code=K02000001`, `geography_label=United Kingdom` from the shared `ons_timeseries.py` constants. The manifest `geography` text says "Great Britain / UK" but the row-level label is UK. Proposed fix (Orchestrator decision, affects Postgres identity hash + Energy consumer): add a GB geography override (`K03000001`, "Great Britain") for AWE specs in `labour_prices_series.py`, re-ingest, and reload. Until then, any chart pairing AWE with UK-wide labour rates (LF24, LF2S) must label the geography break.

## Notes

- Regular pay only (excludes bonuses and arrears). Not household income.
- Energy consumes this series for bills ÷ pay (`web/src/brand/energy/prices-model.ts`); keep `indicator_id` stable.
