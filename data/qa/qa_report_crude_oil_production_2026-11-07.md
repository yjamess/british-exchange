# QA report — crude oil production — 2026-11-07

## Scope
- Indicator: `crude-oil-production` (DESNZ historical Oil Production & Trade since 1890)
- Manifest: `data/energy/crude-oil-production/manifest.yaml`
- Raw: `data/energy/crude-oil-production/raw/2026-11-07/Oil_Production_Trade_since_1890.xls`
- Curated: `data/energy/crude-oil-production/curated/observations.csv` (106 rows)
- Connector: `src/energy/connectors/crude_oil_production.py`
- Gate 1: `data/energy/oil-gas-fossil-fuels/`
- Registry: https://app.notion.com/411654717685812d92a6d647e28cd8a3

## Checks
| ID | Check | Result | Notes |
|----|-------|--------|-------|
| C1 | Freeze — pinned raw SHA-256 vs manifest | **pass** | File `4537b0a9882c28da296104b161bef9a0c79161fad4703040fc3bc245364b7b7d` matches manifest + `retrieval.json` |
| C2 | Curated row count + coverage | **pass** | 106 annual rows, contiguous 1920–2025; blank pre-1920 omitted (not zeroed) |
| C3 | Method — unit Mt, geography UK, Total definition | **pass** | unit=`million tonnes`; geo=`K02000001` / United Kingdom; sheet `Production, Imports & Exports` col Indigenous production → Total; thousand tonnes ÷1000 documented |
| C4 | Method — shale oil caveat through 1962 | **pass** | Sources sheet: indigenous production included shale oil until 1962; 1963 “completely crude oil”; mirrored in manifest `caveats` |
| C5 | Method — licence OGL | **pass** | Manifest `Open Government Licence v3.0`; registry Licence / caveats states OGL v3.0 |
| C6 | Numerical sample vs pinned workbook | **pass** | Independent xlrd parse: 0/106 mismatches. Spot: 1920=0.227595; 1999=137.099 (peak); 2024=30.6578; 2025=31.40605 Mt. 2025/2024 ≈ +2.4% |
| C7 | No fork of Ready gas / primary / coal packages | **pass** | Own package + raw pin (not symlink). Mentions of Ready ids are `related_indicator_ids` / distinctness only; Gate1 `REUSE_MAP.md` registry-link rule followed |
| C8 | Manifest / connector reproducibility | **pass** | Headers asserted; transform matches curated; entrypoint `uv run python -m energy.connectors.crude_oil_production` |

## Numerical samples (Validation recompute)

| Year | Raw Indigenous Total (kt) | Curated Mt | Expected Mt (÷1000, 6 dp) |
|------|---------------------------|------------|---------------------------|
| 1920 | 227.59450784 | 0.227595 | 0.227595 |
| 1999 | 137099.0 | 137.099 | 137.099 |
| 2024 | 30657.8 | 30.6578 | 30.6578 |
| 2025 | 31406.05 | 31.40605 | 31.40605 |

Peak year in pinned workbook = **1999** (137.099 Mt), matching Energy claim and DUKES Ch.3 “~137 Mt” narrative.

## Summary
- Pass: **8**
- Warn: **0**
- Fail: **0**
- Blockers: **none**
- Recommended fixes (owner): none
- **Notion:** Status Validation → **Ready** (2026-11-07); Evidence path updated to include this QA report
