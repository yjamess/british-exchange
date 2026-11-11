# QA report — cpih-inflation — 2026-11-11

**Agent:** Validation  
**Overall verdict:** **pass**

## Scope

- Indicator: `cpih-inflation` (ONS CPIH annual rate, all items; registry L55O)
- Manifest: `data/economy/cpih-inflation/manifest.yaml`
- Raw: `raw/2026-11-11/l55o_mm23.json`
- Curated: `curated/observations.csv` (453 monthly rows)
- Connector: `economy.connectors.cpih_inflation` (`src/economy/connectors/cpih_inflation.py`)
- Handover: `docs/handover-economy-01-l55o.md`
- Twins (all Ready): `cpi-inflation` (D7G7, CPI rate), `cpih-index` (L522, index level), `cpi-index` (D7BT)
- Official: [ONS L55O / MM23](https://www.ons.gov.uk/economy/inflationandpriceindices/timeseries/l55o/mm23)
- Registry: https://app.notion.com/p/415654717685815b877cc6795dac6273

## Freeze

| Item | Value |
|------|-------|
| Claimed raw SHA-256 | `7783d086411a1b3aa8c776eb219e328799a522e2ef8e0c171b80d9fabcb53120` |
| Observed raw SHA-256 | `7783d086411a1b3aa8c776eb219e328799a522e2ef8e0c171b80d9fabcb53120` |
| Curated SHA-256 (observed) | `eeb7c6d254d9823f5ab446b3885fb6f415bbaf984090a7439e19f0fe3ca45d1e` |
| CDID / dataset | L55O / MM23 |
| Title (raw) | CPIH ANNUAL RATE 00: ALL ITEMS 2015=100 (unit `%`) |
| Rows | 453 (1989-01 → 2026-09), no gaps, sorted |
| Latest curated | 2026-09 → **3.6** |
| Geography | `K02000001` United Kingdom (all rows) |
| ONS release in pin | 2026-10-20 (next 2026-11-18) |

## Checks

| ID | Check | Result | Notes |
|----|-------|--------|-------|
| C1 | Freeze: pinned raw SHA-256 vs manifest | **pass** | Exact match |
| C2 | Row count and continuity | **pass** | Curated 453 = pinned `months` 453. 0 missing months, 0 duplicate periods, 0 empty values |
| C3 | Curated vs pinned raw, full series | **pass** | 453/453 values identical, 0 mismatches |
| C4 | Live ONS `/data` vs pin (retrieved 2026-11-11) | **pass** | Live cdid L55O; months=453; last `2026 SEP` = 3.6; releaseDate 2026-10-20; nextRelease 18 Nov 2026; **0** diffs vs pin across all months |
| C5 | Spot-check latest | **pass** | 2026-09 = **3.6** (expected ~3.6); 2026-08 = 3.3, 2026-07 = 3.1 |
| C6 | Distinct from CPI rate D7G7 (`cpi-inflation`) | **pass** | Different indicator id and series. Same month 2026-09: CPIH **3.6** vs CPI **3.5**. Only 43 of 453 common months are identical, so the series are not copies |
| C7 | Distinct from CPIH index L522 (`cpih-index`) | **pass** | Rate (%) vs index level (2015=100): 3.6 vs 144.0 for 2026-09. Different unit strings and `series=` notes |
| C8 | Recompute rate from L522 index (12-month change) | **pass** | 453 months tested. 450 within 0.11 pp of the published rate. 3 early months differ by 0.2 pp (1989-01 5.7 vs 5.5, 1991-01 8.6 vs 8.8, 1991-11 6.5 vs 6.3). This is ONS rounding of a low-level index to 1 dp, not an ingest error, so methodology is consistent |
| C9 | Known mid-history point | **pass** | Peak 2022-10 = **9.6** (matches ONS published CPIH peak). Trough 2015-09 = 0.2 |
| C10 | Units / frequency / status | **pass** | `% annual rate (CPIH all items)`; monthly; `observation_status=provisional`; notes carry `series=L55O; dataset=MM23` |
| C11 | Geography UK, not a GB/England fork | **pass** | `K02000001` on every row; manifest agrees |
| C12 | Manifest completeness | **pass** | Source URL, CDID, licence (OGL v3), raw evidence (checksum, timestamp, release date, HTTP 200), transformations, revision notes, caveats ("never label as CPI"), two-way related ids |
| C13 | Independence: no silent rewrite | **pass** | Validation did not edit `data/economy/` |

## Summary

- Pass: **13**
- Warn: **0**
- Fail: **0**
- Blockers: **none**
- Recommended fixes (**owner: Economy**): none for Ready
- Housekeeping (non-blocking): re-pin after the 2026-11-18 ONS release; keep labelling as CPIH, never CPI. `chart_contract.py` still needs a `cpih-inflation` entry before any UI chart (Orchestrator-owned, per handover).
- **Recommendation: Ready.** Notion Status stays **Validation**. Orchestrator flips it. Postgres/Supabase load is not covered by this QA (AGENTS.md cloud rule applies before "Ready for UI").

## Reproduce

```bash
shasum -a 256 data/economy/cpih-inflation/raw/2026-11-11/l55o_mm23.json
curl -sS 'https://www.ons.gov.uk/economy/inflationandpriceindices/timeseries/l55o/mm23/data' \
  | uv run python -c "import sys,json; d=json.load(sys.stdin); print(d['description']['cdid'], len(d['months']), d['months'][-1])"
wc -l data/economy/cpih-inflation/curated/observations.csv   # 454 incl. header
```
