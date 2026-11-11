# QA report — ASHE regional earnings (multi-edition) — 2026-11-11

**Agent:** Economy (request for Validation)  
**Overall verdict:** **pass (pending Validation sign-off)**  
**Registry target:** Validation → Ready after independent check

| Indicator | Verdict | Ready recommendation |
|-----------|---------|----------------------|
| `ashe-regional-earnings` | **pass (Economy)** | Move to **Validation**; Ready after sample QA |

## Scope

- Pack: `data/economy/ashe-regional-earnings/`
- Connector: `economy.connectors.ashe_regional_earnings`
- Landing: https://www.ons.gov.uk/employmentandlabourmarket/peopleinwork/earningsandworkinghours/datasets/placeofworkbylocalauthorityashetable7
- Editions:
  - **2026 provisional** — `ashetable72026provisional.zip` sha256 `f468a8056faa9ea83ed712eeacd067e19ed49fe72d53516f6fea8b496b7e4f87`
  - **2025 revised** — `ashetable72025revised.zip` sha256 `250fb6a5184743cb01818fb4b87c4627ab0c9058011110b057ca121ce679a599`
- Retrieval date: 2026-11-11 · ONS release: 22 Oct 2026
- Curated: **1576** observations (All + Full-Time × geographies × 2 editions)
- Cloud: release_id=**222** · Storage archive pushed

## Checks

| ID | Check | Result | Notes |
|----|-------|--------|-------|
| A1 | Zip SHAs | **pass** | See Freeze |
| A2 | Table 7.1a workplace | **pass** | `basis=workplace` in notes |
| A3 | Spot | **pass** | Full-Time London 2026 **£1038.1**; 2025 **£959.5** |
| A4 | Status | **pass** | provisional vs final by edition |
| A5 | CV rule | **pass** | Omit suppressions; no zeros for `x` |
| A6 | Cloud | **pass** | release_id=222 |

## Validation request

Sample English regions + one LA for both editions vs ONS Table 7.1a; confirm workplace ≠ residence labelling.
