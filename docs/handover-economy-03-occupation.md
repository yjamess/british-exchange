# Handover — Economy Domain 03 · occupation + Working Week UI (EC-G2-03d)

**Gate:** G2 evidence → G3 UI · **Owner:** Economy → Validation → Orchestrator · **Date:** 2026-11-15  
**Notion plan:** [03 · Employment & Labour Market](https://app.notion.com/p/414654717685813fb55ad2fc81cd4e4f)  
**Prior handover:** [handover-economy-03-gaps.md](handover-economy-03-gaps.md)  
**Gate 4 audit:** [gate4-audit-employment.md](gate4-audit-employment.md) (E-5 · S13)

Closes the two items the Domain 03 review left open other than the 17 Nov re-pins: the underemployment / involuntary part-time UI and the EMP04 occupation gap.

---

## 1. Occupation — EMP04 is discontinued; Nomis APS is the source

ONS stopped publishing LFS table **EMP04 Employment by occupation** after the April–June 2018 edition (dataset page: "Discontinued", release 2018-09-10) and directs users to the Annual Population Survey on Nomis, report `aps210`. The Exchange ingests that successor rather than a seven-year-old workbook.

| Indicator | Source | Spot | Rows | Release | Registry |
|-----------|--------|------|------|---------|----------|
| `employment-by-occupation` | Nomis `NM_17_5` · UK · variables 1815–1823 (nine SOC 2020 major groups, all in employment) · measures share / numerator / denominator | Jul 2025–Jun 2026: Professional **27.2%** (9,100,200 people) · all in employment **33,470,000** | 361 (19 windows × 19) | Nomis LastUpdated **2026-10-20** | row to add by hand — Notion MCP cannot see this workspace |

- People, **not jobs**. Rolling twelve-month windows ending each quarter, NSA, aged 16+. SOC 2020 from Jan–Dec 2021.
- Connector stops if numerator ÷ denominator × 100 misses the published share by more than 0.06 points (worst observed 0.05).
- Nine groups sum to 99.4–99.8%; the remainder is unclassified occupation. No share is invented for it.
- Validation: [qa_report_economy_03_occupation_2026-11-15.md](../data/qa/qa_report_economy_03_occupation_2026-11-15.md) — **15/0/0 pass** · script `validation.qa_economy_03_occupation_2026_11_15`.
- Cloud: Postgres via `load_ready --only employment-by-occupation` (361 rows, served by `/indicators/employment-by-occupation/observations`); raw + curated pushed to `bx-data-archive`, local copies deleted.

Reproduce:

```bash
uv run python -m economy.connectors.employment_by_occupation
PYTHONPATH=src uv run python -m validation.qa_economy_03_occupation_2026_11_15
```

## 2. UI (Orchestrator, G3)

`/economy?domain=employment`

| View | Change |
|------|--------|
| The Working Week | Two new panels under hours and full/part-time: **People who want more hours** (EMP16 rate, quarterly, `TimeChart`) and **Part-time because no full-time job could be found** (YCCX, monthly, `TimeChart`). Figure strip now Average hours · Part-time · Want more hours. Notes rewritten: quarterly NSA caveat, "not a share of part-time work" caveat; the "not drawn yet" line is gone. |
| What Britain Does for Work | **Employment by occupation** `RankBars` panel (nine SOC 2020 groups, latest window share) shown when no industry is selected. Notes say people-not-jobs and the unclassified remainder. |
| Data | Three new series: underemployment rate (Quarter column), involuntary part-time, employment by occupation (Twelve months · Occupation · Value). |

Pack wiring: `types.ts` (`underemployment`, `involuntaryPartTime`, `employmentByOccupation`), `load.ts`, `citations.ts`, `sector-pages.ts`; helpers in `workforce-model.ts` (`underemploymentRatePoints`, `latestUnderemploymentRate`, `latestOccupationSlice`, `windowLabel`). `tsc` and `eslint` clean.

## 3. Still open

- Notion registry row for `employment-by-occupation` (MCP could not open the registry from this session).
- Re-pin LMS / HI00 / EMP16 / YCCX after **17 Nov 2026** (unchanged calendar item).
- SOC 2010 windows (2004–2020) are on Nomis under other variable codes; not bridged.
