# QA report — cpih-index — 2026-11-07

**Agent:** Validation  
**Overall verdict:** **pass**

## Scope

- Indicator: `cpih-index` (ONS CPIH all-items index, 2015=100)
- Manifest: `data/economy/cpih-index/manifest.yaml`
- Raw: `raw/2026-11-07/l522_mm23.json`
- Curated: `curated/observations.csv` (465 monthly rows)
- Connector: `economy.connectors.cpih_index` (`src/economy/connectors/cpih_index.py` → `CPIH_INDEX` / L522)
- Distinct Ready twin: `cpi-index` (D7BT) under `data/economy/cpi-index/`
- Official: [ONS L522 / MM23](https://www.ons.gov.uk/economy/inflationandpriceindices/timeseries/l522/mm23)

## Freeze

| Item | Value |
|------|-------|
| Claimed SHA-256 | `883b0b911e2977ddb0c1aecbe99e42f3b5c45367f868e245579f84801982ce80` |
| Observed SHA-256 | `883b0b911e2977ddb0c1aecbe99e42f3b5c45367f868e245579f84801982ce80` |
| CDID / dataset | L522 / MM23 |
| Title (raw) | CPIH INDEX 00: ALL ITEMS 2015=100 |
| Rows | 465 (1988-01 → 2026-09) |
| Latest curated | 2026-09 → **144.0** |
| Geography | `K02000001` United Kingdom (all rows) |
| ONS release in pin | 2026-10-20 |

## Checks

| ID | Check | Result | Notes |
|----|-------|--------|-------|
| C1 | Freeze — pinned raw SHA-256 | **pass** | Exact match |
| C2 | Observation count ~465 | **pass** | Curated **465** = pinned `months` length **465** |
| C3 | Spot-check latest month vs pinned raw JSON | **pass** | Curated 2026-09 = 144.0; pinned `2026 SEP` = `144.0`; 0 value mismatches across full series |
| C4 | Spot-check vs live ONS `/data` | **pass** | Live L522 (retrieved 2026-11-07): cdid L522; months=465; `2026 SEP` = 144.0; **0** diffs vs pin |
| C5 | Distinct from Ready `cpi-index` (D7BT) | **pass** | Separate indicator id, series L522 vs D7BT; latest CPI = **144.1** vs CPIH **144.0** (same month) |
| C6 | Units / base / frequency | **pass** | Index 2015=100; monthly; notes carry `series=L522; dataset=MM23` |
| C7 | Geography UK (not GB-only fork) | **pass** | Manifest and rows use `K02000001` — correct for national CPIH |
| C8 | Independence — no silent rewrite | **pass** | Validation did not edit Economy curated/raw |

## Summary

- Pass: **8**
- Warn: **0**
- Fail: **0**
- Blockers: **none**
- Recommended fixes (**owner: Economy**): none for Ready
- Reminder: Energy real-terms bills should **link** `cpih-index` — do not fork under `data/energy/`
- **Notion:** Hand to Orchestrator — Validation recommends **Ready** (Validation does not flip Notion status)

## Reproduce

```bash
shasum -a 256 data/economy/cpih-index/raw/2026-11-07/l522_mm23.json
curl -sS 'https://www.ons.gov.uk/economy/inflationandpriceindices/timeseries/l522/mm23/data' \
  | uv run python -c "import sys,json; d=json.load(sys.stdin); print(d['description']['cdid'], len(d['months']), d['months'][-1])"
wc -l data/economy/cpih-index/curated/observations.csv
```
