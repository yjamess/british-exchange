# QA report — ASHE national earnings (multi-edition) — 2026-11-11

**Agent:** Economy (request for Validation)  
**Overall verdict:** **pass (pending Validation sign-off)**  
**Registry target:** Validation → Ready after independent check

| Indicator | Verdict | Ready recommendation |
|-----------|---------|----------------------|
| `ashe-national-earnings` | **pass (Economy)** | Move to **Validation**; Ready after sample QA |

## Scope

- Pack: `data/economy/ashe-national-earnings/`
- Connector: `economy.connectors.ashe_national_earnings`
- Landing: https://www.ons.gov.uk/employmentandlabourmarket/peopleinwork/earningsandworkinghours/datasets/allemployeesashetable1
- Editions:
  - **2026 provisional** — `raw/2026-11-11/ashetable12026provisional.zip` sha256 `b0143def67e3863a34421608608f63b77b7eebd8fbbd5f2109d6811eb184351d`
  - **2025 revised** — `raw/2026-11-11/ashetable12025revised.zip` sha256 `688dcfe4c07dd7e6235c5dad8683107b2e83fcc1ae959d3ed1703317d19867ae`
- Retrieval date: 2026-11-11 · ONS release: 22 Oct 2026
- Curated: **72** observations (2 editions × All / Full-Time / Part-Time × median/mean/p10–p90)
- Cloud: release_id=**220** · Storage archive pushed (`--keep-local`)

## Checks

| ID | Check | Result | Notes |
|----|-------|--------|-------|
| A1 | Zip SHAs match pins | **pass** | See Freeze |
| A2 | Table 1.1a Weekly pay — Gross | **pass** | All + Full-Time + Part-Time |
| A3 | Spot vs workbook | **pass** | 2026 All median **£673.1**; 2025 All median **£641.7**; 2026 Part-Time median **£288.1** |
| A4 | Status honesty | **pass** | 2026 → `provisional`; 2025 revised → `final` |
| A5 | CV / suppressions | **pass** | Omit `x` / `:` / `..`; colour CV bands not ingested |
| A6 | period_start distinguishes editions | **pass** | 2026-04-01 vs 2025-04-01 |
| A7 | Cloud load | **pass** | release_id=220 |

## Validation request

Independent sample vs ONS Table 1.1a for both editions; confirm Part-Time sheet; confirm no regression vs prior 24-obs single-edition pin.
