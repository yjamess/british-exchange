# QA report — ASHE industry earnings (SIC sections) — 2026-11-11

**Agent:** Economy (request for Validation)  
**Overall verdict:** **pass (pending Validation sign-off)**  
**Registry target:** Inbox → **Validation**

| Indicator | Verdict | Ready recommendation |
|-----------|---------|----------------------|
| `ashe-industry-earnings` | **pass (Economy)** | **Validation**; Ready after sample QA |

## Scope

- Pack: `data/economy/ashe-industry-earnings/`
- Connector: `economy.connectors.ashe_industry_earnings`
- Landing: https://www.ons.gov.uk/employmentandlabourmarket/peopleinwork/earningsandworkinghours/datasets/industry2digitsicashetable4
- Editions:
  - **2026 provisional** — `ashetable42026provisional.zip` sha256 `afa6848f20c5554ef16fbc7fc099aee05d12714a36b239b1892cb90c2a7c687c`
  - **2025 revised** — `ashetable42025revised.zip` sha256 `df87c313d1cb40bf499f1ec001076bcb9c9884c6443d76b186f09e84ff614bc3`
- Retrieval date: 2026-11-11 · ONS release: 22 Oct 2026
- Curated: **954** observations (SIC sections A–U × All/Full-Time × median/mean/percentiles × 2 editions)
- Cloud: release_id=**219** · Storage archive pushed

## Manufacturing boundary

- Energy owns **`ashe-manufacturing-earnings`** (Table 4 manufacturing section C + divisions 10–33) under `data/energy/`.
- This Economy pack loads **all SIC sections** including section C for Wages industry comparisons.
- Energy's pin stays **authoritative** for manufacturing Jobs Pay — link only; do not fork or replace.

## Checks

| ID | Check | Result | Notes |
|----|-------|--------|-------|
| A1 | Zip SHAs | **pass** | |
| A2 | Sections only | **pass** | Letter codes A–U; 2-digit divisions skipped |
| A3 | Spot | **pass** | Full-Time Manufacturing (C) 2026 **£808.6**; 2025 **£774.0** |
| A4 | Status | **pass** | provisional / final by edition |
| A5 | CV rule | **pass** | Omit `x` / `:` / `..` |
| A6 | Cloud | **pass** | release_id=219 |

## Validation request

Sample 3–5 SIC sections vs ONS Table 4.1a; confirm Energy manufacturing pin untouched.
