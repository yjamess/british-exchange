# QA report — cpi-index — 2026-11-11

**Agent:** Validation  
**Overall verdict:** **pass** (0 fail, 0 warn, 2 informational notes)

## Scope

- Indicator: `cpi-index` (ONS CPI all-items index, 2015=100, CDID **D7BT**, dataset MM23)
- Manifest: `data/economy/cpi-index/manifest.yaml`
- Raw: `raw/2026-11-04/d7bt_mm23.json`
- Curated: `curated/observations.csv` (465 monthly rows, 1988-01 → 2026-09)
- Connector (not re-run): `economy.connectors.cpi_index`
- Official: [ONS D7BT / MM23](https://www.ons.gov.uk/economy/inflationandpriceindices/timeseries/d7bt/mm23) · [Consumer price inflation, UK: September 2026](https://www.ons.gov.uk/economy/inflationandpriceindices/bulletins/consumerpriceinflation/september2026)
- Distinct twins: `cpi-inflation` (D7G7, annual rate) and `cpih-index` (L522, CPIH). Not duplicated here.
- First formal QA for this indicator. Economy self-check (`data/economy/cpi-index/validation_notes.md`) is not counted as Validation.

## Freeze

| Item | Value |
|------|-------|
| Manifest SHA-256 | `a0e630b09306a449f79de41ced22bb5640f34c6cab6923900a4fb8b101c69c93` |
| Pinned raw SHA-256 (observed) | `a0e630b09306a449f79de41ced22bb5640f34c6cab6923900a4fb8b101c69c93` |
| Live ONS `/data` SHA-256 (fetched 2026-11-11) | `a0e630b09306a449f79de41ced22bb5640f34c6cab6923900a4fb8b101c69c93` |
| Curated CSV SHA-256 | `9d918fff0838d9b2e3e4915a7f56e88c5b15287311c89eb1d2c0e3755a448f75` |
| Live title / CDID | "CPI INDEX 00: ALL ITEMS 2015=100" / D7BT |
| ONS release / next release | 2026-10-20 / 18 November 2026 |
| Latest | 2026-09 = **144.1** |
| Postgres current release | id 42, `MM23/D7BT 2026-10-20`, checksum equals manifest, 465 rows |

## Checks

| ID | Check | Result | Notes |
|----|-------|--------|-------|
| C1 | Freeze — pinned raw SHA-256 vs manifest | **pass** | Exact match |
| C2 | Freeze — live ONS `/data` vs pin | **pass** | Byte-identical; pin is current until the 18 Nov 2026 release |
| C3 | Row count and span | **pass** | Curated 465 = live `months` 465; 1988-01 → 2026-09; 0 calendar gaps; 0 duplicates |
| C4 | Full-series value compare, curated vs live (independent `json` parse) | **pass** | 465 / 465, **0** value diffs, 0 only-live, 0 only-curated |
| C5 | Spot-check vs ONS bulletin Table 1 (Sep 2025 → Sep 2026) | **pass** | 13 / 13 months equal the bulletin's CPI index column (e.g. Aug 143.6, Sep 144.1) |
| C6 | Growth recompute | **pass** | 2026-09 / 2025-09 from curated = 3.45%; ONS D7G7 headline = **3.5** (bulletin: "CPI rose by 3.5%"). See note N1 |
| C7 | Base year / units | **pass** | Index 2015=100; 2015 monthly mean = 100.01; unit string on all rows `Index 2015=100 (CPI all items)` matches manifest |
| C8 | Frequency / geography | **pass** | Monthly, period bounds valid (0 bad); geography `K02000001` on every row |
| C9 | Missing / suppressed | **pass** | 0 missing in curated and in live; status = `provisional` on all rows (conservative, consistent with manifest revision note) |
| C10 | CPI ≠ CPIH ≠ rate | **pass** | Sep 2026 CPI 144.1 vs CPIH (L522) 144.0 (bulletin Table 1 confirms both). Manifest definition says "not the annual rate (D7G7) and not CPIH" |
| C11 | Cloud completeness | **pass** | Postgres `observation` rows for the current release equal the curated CSV: 0 only-in-DB, 0 only-in-CSV, 0 value diffs; unit identical |
| C12 | Independence — no silent rewrite | **pass** | Validation did not edit `data/economy/`; live payloads were fetched to `/tmp` only |

## Notes (informational, not warnings)

- **N1 — rate recompute tolerance.** ONS publishes index values to 1 d.p. but computes the annual rate from unrounded indices. Recomputing from the published index matches D7G7 exactly in 263 / 453 months and within 0.1 pp in 448 / 453 (max gap 0.2 pp, all pre-2000 months: 1990-01, 1994-07, 1995-06, 1998-07). Consumers who need the official rate should use `cpi-inflation`; do not derive it from `cpi-index`.
- **N2 — manifest nits (Economy, low risk).** `notion_registry_url` is empty in the manifest. A registry row was created by Validation on 2026-11-11 (see below); Economy can paste the URL on the next connector run.

## Summary

- Pass: **12**
- Warn: **0**
- Fail: **0**
- Blockers: **none**
- Recommended fixes (**owner: Economy**): none for Ready. Optional: fill `notion_registry_url`; re-pin all three CPI series after the 18 Nov 2026 release.
- **Notion:** registry row created at Status **Validation** (same practice as CPIH: Validation recommends, Orchestrator flips). **Validation recommends Ready.**
- Downstream already consuming `cpi-index` (Housing real house prices; `sector-pages.ts`) — no data change needed.
- Re-check due: light re-check after **2026-11-18** (October CPI).

## Reproduce

```bash
shasum -a 256 data/economy/cpi-index/raw/2026-11-04/d7bt_mm23.json
curl -sS -A 'Mozilla/5.0' 'https://www.ons.gov.uk/economy/inflationandpriceindices/timeseries/d7bt/mm23/data' | shasum -a 256
PYTHONPATH=src uv run python -m validation.qa_economy_wave_a_p0_2026_11_11
```

Script: `src/validation/qa_economy_wave_a_p0_2026_11_11.py` (reads manifests and curated CSVs, fetches live ONS, queries Postgres read-only; writes nothing under `data/economy/`).
