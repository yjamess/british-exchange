# Handover — EC-02-ASHE-B · Wages ASHE data completion

**Date:** 2026-11-11 · **Owner:** Economy · **Paths:** `src/economy/`, `data/economy/` only  
**Task:** Multi-edition Table 1 + 7; new Table 4 (all sections) + Table 5 (region × section)  
**No frontend edits.**

---

## Deliverables

| Indicator | Editions | Sheets | Obs | Cloud release | Entrypoint |
|-----------|----------|--------|-----|---------------|------------|
| `ashe-national-earnings` | 2026 provisional + 2025 revised | All, Full-Time, Part-Time | 72 | **220** | `economy.connectors.ashe_national_earnings` |
| `ashe-regional-earnings` | 2026 provisional + 2025 revised | All, Full-Time | 1576 | **222** | `economy.connectors.ashe_regional_earnings` |
| `ashe-industry-earnings` | 2026 provisional + 2025 revised | All, Full-Time | 954 | **219** | `economy.connectors.ashe_industry_earnings` |
| `ashe-region-industry-earnings` | 2026 provisional | All, Full-Time | 402 | **221** | `economy.connectors.ashe_region_industry_earnings` |

Shared helpers: `economy.connectors.ashe_common`.

### Pins (all under `raw/2026-11-11/`, retrieval 2026-11-11, ONS release 22 Oct 2026)

| Zip | sha256 |
|-----|--------|
| `ashetable12026provisional.zip` | `b0143def67e3863a34421608608f63b77b7eebd8fbbd5f2109d6811eb184351d` |
| `ashetable12025revised.zip` | `688dcfe4c07dd7e6235c5dad8683107b2e83fcc1ae959d3ed1703317d19867ae` |
| `ashetable72026provisional.zip` | `f468a8056faa9ea83ed712eeacd067e19ed49fe72d53516f6fea8b496b7e4f87` |
| `ashetable72025revised.zip` | `250fb6a5184743cb01818fb4b87c4627ab0c9058011110b057ca121ce679a599` |
| `ashetable42026provisional.zip` | `afa6848f20c5554ef16fbc7fc099aee05d12714a36b239b1892cb90c2a7c687c` |
| `ashetable42025revised.zip` | `df87c313d1cb40bf499f1ec001076bcb9c9884c6443d76b186f09e84ff614bc3` |
| `ashetable52026provisional.zip` | `164220a6bfecee98e15e853db66d998dabdc7acd76998754f19ca29fee833bff` |

### Source URLs

- Table 1: https://www.ons.gov.uk/employmentandlabourmarket/peopleinwork/earningsandworkinghours/datasets/allemployeesashetable1
- Table 7: https://www.ons.gov.uk/employmentandlabourmarket/peopleinwork/earningsandworkinghours/datasets/placeofworkbylocalauthorityashetable7
- Table 4: https://www.ons.gov.uk/employmentandlabourmarket/peopleinwork/earningsandworkinghours/datasets/industry2digitsicashetable4
- Table 5: https://www.ons.gov.uk/employmentandlabourmarket/peopleinwork/earningsandworkinghours/datasets/regionbyindustry2digitsicashetable5

### Run

```bash
uv run python -m economy.connectors.ashe_national_earnings
uv run python -m economy.connectors.ashe_regional_earnings
uv run python -m economy.connectors.ashe_industry_earnings
uv run python -m economy.connectors.ashe_region_industry_earnings
uv run python -m britain_exchange.load_ready --via-rest \
  --only ashe-national-earnings --only ashe-regional-earnings \
  --only ashe-industry-earnings --only ashe-region-industry-earnings
```

### CV rule

Omit cells published as `x`, `:`, or `..`. Never write zero for a suppression. Workbook colour CV bands are not ingested.

### Observation status

- 2026 provisional → `observation_status=provisional`
- 2025 revised → `observation_status=final`
- `period_start` = 1 April of the reference year

---

## Manufacturing boundary (handover note)

**Energy `ashe-manufacturing-earnings` stays authoritative** for manufacturing Jobs Pay (ASHE Table 4 section C + SIC divisions 10–33 under `data/energy/`). Economy did **not** touch Energy paths.

Economy `ashe-industry-earnings` loads **all SIC 2007 sections A–U** (including section C) for Wages industry comparisons. Treat section C here as a whole-economy manufacturing section median among peers — **link** to Energy for the manufacturing-only division cut; do not fork or replace the Energy pin.

---

## Gaps / deferred

- Table 8 residence — not done (optional).
- Table 5: no England / NI × section cross-tabs in 5.1a (E12* + Wales + Scotland only).
- Table 5 2025 revised — not pinned (task asked 2026 provisional only).
- Registry → **Validation** (QA files filed under `data/qa/`).

---

## Spot checks (Economy)

| Series | Spot |
|--------|------|
| National All median | 2026 **£673.1** · 2025 **£641.7** |
| National Part-Time median | 2026 **£288.1** |
| Regional FT London | 2026 **£1038.1** · 2025 **£959.5** |
| Industry FT Manufacturing (C) | 2026 **£808.6** · 2025 **£774.0** |
| Region×industry London FT Manufacturing (C) | 2026 **£947.2** |
