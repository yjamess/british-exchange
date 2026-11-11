# QA report — public-sector-net-debt-percent-gdp — 2026-11-11

**Agent:** Validation  
**Overall verdict:** **pass** (with one standing warn: tail revision risk)

## Scope

- Indicator: `public-sector-net-debt-percent-gdp` (ONS PSND ex public sector banks as % of GDP, NSA; registry HF6X)
- Manifest: `data/economy/public-sector-net-debt-percent-gdp/manifest.yaml`
- Raw: `raw/2026-11-11/hf6x_pusf.json`
- Curated: `curated/observations.csv` (403 monthly rows)
- Connector: `economy.connectors.public_sector_net_debt_percent_gdp` (`src/economy/connectors/public_sector_net_debt_percent_gdp.py`)
- Handover: `docs/handover-economy-08-hf6x.md`
- Twin (not the same series): `public-sector-net-debt` (HF6W, £ billion)
- Official: [ONS HF6X / PUSF](https://www.ons.gov.uk/economy/governmentpublicsectorandtaxes/publicsectorfinance/timeseries/hf6x/pusf)
- Registry: https://app.notion.com/p/41565471768581e6ad97d6c10b9a5a1a

## Freeze

| Item | Value |
|------|-------|
| Claimed raw SHA-256 | `9e36441224589270407925629a6fbf4ec0428f485a8f328983fa255ada23f4e5` |
| Observed raw SHA-256 | `9e36441224589270407925629a6fbf4ec0428f485a8f328983fa255ada23f4e5` |
| Claimed curated SHA-256 (handover) | `d8dcf7c9479fc2f1155ae2a198793d26b0401ccc3fc89287cb16d5ac9c165baa` |
| Observed curated SHA-256 | `d8dcf7c9479fc2f1155ae2a198793d26b0401ccc3fc89287cb16d5ac9c165baa` |
| CDID / dataset | HF6X / PUSF |
| Title (raw) | PS: Net Debt (excluding public sector banks) as a % of GDP: NSA (unit `%`) |
| Rows | 403 (1993-03 → 2026-09), no gaps, sorted |
| Latest curated | 2026-09 → **94.0** |
| Geography | `K02000001` United Kingdom (all rows) |
| ONS release in pin | 2026-10-20 (next 20 Nov 2026) |

## Checks

| ID | Check | Result | Notes |
|----|-------|--------|-------|
| C1 | Freeze: raw and curated SHA-256 | **pass** | Both match the manifest / handover exactly |
| C2 | Row count and continuity | **pass** | Curated 403 = pinned `months` 403. 0 missing months, 0 duplicate periods, 0 empty values |
| C3 | Curated vs pinned raw, full series | **pass** | 403/403 values identical, 0 mismatches |
| C4 | Live ONS `/data` vs pin (retrieved 2026-11-11) | **pass** | Live cdid HF6X; months=403; last `2026 SEP` = 94.0; releaseDate 2026-10-20; nextRelease 20 Nov 2026; **0** diffs vs pin across all months |
| C5 | Spot-check latest | **pass** | 2026-09 = **94.0** (expected ~94.0); 2026-08 = 93.6; 2026-07 = 93.8 |
| C6 | Distinct from HF6W (`public-sector-net-debt`) | **pass** | HF6X is a ratio (`% of GDP`), HF6W is `£ billion`. Latest 2026-09: **94.0** vs **3005.0**. 0 of 403 common months share a value. Separate indicator ids, series ids, unit strings, notes |
| C7 | Unit and axis hygiene | **pass** | Unit `% of GDP, NSA (ex public sector banks)` on all rows; manifest caveat forbids sharing an axis with HF6W (£bn) or DZLS/NMFX (£m) |
| C8 | Plausibility: implied nominal GDP = HF6W / HF6X | **pass** | Implied denominator is smooth and rising: £2,116bn (2020-09), £2,865bn (2024-03), £3,021bn (2025-03), £3,076bn (2025-09), £3,130bn (2026-03), £3,197bn (2026-09). Consistent with centred 12-month nominal GDP. Full BKTL reconciliation not done because BKTL is not ingested (see Warn W1) |
| C9 | Known history | **pass** | Peak 97.8 in 2020-09 (matches handover and ONS profile of the pandemic peak). Minimum 26.7 in 1993-03. Largest m/m moves (>2.5 pp): 2008-09, 2008-12, 2009-12, 2020-04, 2020-05, 2021-10, all in crisis or GDP-denominator-shock periods |
| C10 | Geography UK | **pass** | `K02000001` on every row; manifest agrees |
| C11 | Manifest completeness | **pass** | Source URL, CDID, OGL v3, raw evidence (checksum, timestamp, release date, HTTP 200), transformations, revision notes with tail-risk, caveat not to derive from `real-gdp` (ABMI chained-volume SA vs nominal PSND), related ids to HF6W / DZLS / NMFX |
| C12 | Observation status | **pass** | All rows `provisional`, appropriate for PSF estimates |
| C13 | Independence: no silent rewrite | **pass** | Validation did not edit `data/economy/` |
| W1 | Tail revision risk and GDP reconciliation | **warn** | Latest ~6 months use OBR forecast GDP and revise heavily. Any UI must flag the tail. Record the HF6X revision size at the 2026-11-20 release. Reconciling HF6X x centred nominal GDP to HF6W (needs BKTL) is deferred |

## Summary

- Pass: **13**
- Warn: **1** (W1, standing caveat, non-blocking)
- Fail: **0**
- Blockers: **none**
- Recommended fixes (**owner: Economy**): none for Ready. Re-pin after 2026-11-20 and log tail revision size
- Observation for Economy (non-blocking, outside this indicator): `public-sector-net-debt` (HF6W) curated file has 619 rows from 1975-03, of which 198 (1975-04 → 1993-02) have an empty value; the 421 non-empty rows run 1993-03 → 2026-09 (same span as HF6X). Not part of this QA, but UI joins must tolerate empties. HF6X itself has no empties
- **Recommendation: Ready.** Notion Status stays **Validation**. Orchestrator flips it. Keep `provisional` and flag the tail in any UI. Postgres/Supabase load is not covered by this QA (AGENTS.md cloud rule applies before "Ready for UI")

## Reproduce

```bash
shasum -a 256 data/economy/public-sector-net-debt-percent-gdp/raw/2026-11-11/hf6x_pusf.json \
              data/economy/public-sector-net-debt-percent-gdp/curated/observations.csv
curl -sS 'https://www.ons.gov.uk/economy/governmentpublicsectorandtaxes/publicsectorfinance/timeseries/hf6x/pusf/data' \
  | uv run python -c "import sys,json; d=json.load(sys.stdin); print(d['description']['cdid'], len(d['months']), d['months'][-1])"
wc -l data/economy/public-sector-net-debt-percent-gdp/curated/observations.csv   # 404 incl. header
```
