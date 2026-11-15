# Handover — Economy Domain 03 · Employment & Labour Market

**Gate:** G2 Phase 0 evidence · **Wave:** B · **Owner:** Economy subagent · **Date:** 2026-11-14  
**Notion plan:** [03 · Employment & Labour Market](https://app.notion.com/p/414654717685813fb55ad2fc81cd4e4f)  
**Kickoff:** [agent-kickoff-economy-03-employment.md](agent-kickoff-economy-03-employment.md) · **Matrix:** [economy-overlap-matrix.md](economy-overlap-matrix.md)  
**Work plan:** EC-G2-03

> **No Ready claim. No frontend.** Packages prepared for Validation. Flagship composition is **proven** from matched official 16–64 SA counts (not invented from rates).

---

## Artefact 1 — Dataset foundation

### Re-pinned rates

| | `employment-rate` | `economic-inactivity-rate` |
|---|---|---|
| CDID / dataset | **LF24** / LMS | **LF2S** / LMS |
| Unit | % of population 16–64, SA | % of population 16–64, SA |
| Latest pin | retrieved **2026-11-14** | same |
| ONS release (JSON) | **2026-10-19** | same |
| Spot (2026-07 = Jun–Aug) | **75.3%** | **20.9%** |
| Rows | 666 · provisional = latest month only | same |
| Raw | `raw/2026-11-14/lf24_lms.json` | `raw/2026-11-14/lf2s_lms.json` |
| sha256 | `b68f87c2…ae04ed` | `dff86605…7efea6` |
| Checksum vs prior pin (2026-11-03) | **unchanged** (same LMS vintage) | unchanged |
| Connector | `economy.connectors.employment_rate` | `…economic_inactivity_rate` |
| Registry | [Employment rate](https://app.notion.com/40d65471768581aaae57f749d490be03) | [Economic inactivity rate](https://app.notion.com/40d654717685817f925bfa820d283c45) |
| Validation notes | `data/economy/employment-rate/validation_notes.md` | `…/economic-inactivity-rate/validation_notes.md` |

`observation_status` fix applied: was **all 666 provisional** on the prior pin; now **665 final + 1 provisional** (same pattern as CPI/AWE/PSF via `mark_latest_months_provisional`).

### New companion pins (flagship counts + 16–64 unemployment rate)

| Indicator | CDID | Spot 2026-07 | Registry | Path |
|-----------|------|--------------|----------|------|
| `employment-level` | **LF2G** | 32,823 thousand | [row](https://app.notion.com/p/41865471768581aebb16ea1522da303b) | `data/economy/employment-level/` |
| `unemployment-level` | **LF2I** | 1,675 thousand | [row](https://app.notion.com/p/41865471768581f0abb5ecbef00645f4) | `data/economy/unemployment-level/` |
| `economic-inactivity-level` | **LF2M** | 9,091 thousand | [row](https://app.notion.com/p/41865471768581d4be4cc8fb3c6fd80f) | `data/economy/economic-inactivity-level/` |
| `unemployment-rate` | **LF2Q** | 4.9% of econ. active 16–64 | [row](https://app.notion.com/p/418654717685813b8a61fc0b21d78f00) | `data/economy/unemployment-rate/` |

All four: UK · 16–64 · SA · monthly · LMS · release 2026-10-19 · 666 obs · provisional = latest month only. Specs in `src/economy/connectors/labour_prices_series.py`; modules under `src/economy/connectors/`. Registry status **Ingesting** → hand to Validation (**do not** flip Ready here).

Run (from repo root; see [uv docs](https://docs.astral.sh/uv/)):

```bash
uv run python -m economy.connectors.employment_rate
uv run python -m economy.connectors.economic_inactivity_rate
uv run python -m economy.connectors.employment_level
uv run python -m economy.connectors.unemployment_level
uv run python -m economy.connectors.economic_inactivity_level
uv run python -m economy.connectors.unemployment_rate
```

### Flagship count reconciliation — **proven**

ONS [Labour market overview, UK: October 2026](https://www.ons.gov.uk/employmentandlabourmarket/peopleinwork/employmentandemployeetypes/bulletins/uklabourmarket/october2026) A02 SA / summary tables publish matched **aged 16–64 SA** levels. Pin spots for Jun–Aug 2026 (LMS mid-month July):

| Component | CDID | Thousands |
|-----------|------|-----------|
| Employed | LF2G | 32,823 |
| Unemployed (ILO) | LF2I | 1,675 |
| Inactive | LF2M | 9,091 |
| **Sum** | | **43,589** |
| Bulletin population 16–64 (LF2O) | LF2O | 43,590 |

Difference of **1 thousand** = published rounding. Rates implied by counts:

| Rate | From counts | Official pin | Bulletin |
|------|-------------|--------------|----------|
| Employment (pop denom) | 75.30% | LF24 = 75.3 | 75.3 |
| Inactivity (pop denom) | 20.86% | LF2S = 20.9 | 20.9 |
| Unemployment (active denom) | 4.86% | LF2Q = 4.9 | 4.9 (16–64 table) |

**Verdict:** Flagship composition can be drawn from official matched counts on the same age / geography / SA / period basis. Do **not** invent composition from LF24 + LF2S + MGSX/LF2Q rates alone.

### Count/rate inventory (CDIDs)

All below are **UK**, **LMS**, typically **monthly** rolling three-month averages. Prefer **SA** for headline charts unless Notes say NSA.

#### Working-age (16–64) — flagship set (ingested ★)

| Concept | Level CDID | Rate CDID | Denominator | SA | Notes |
|---------|------------|-----------|-------------|----|-------|
| Employed | **LF2G** ★ | **LF24** ★ | Population 16–64 | SA | |
| Unemployed (ILO) | **LF2I** ★ | **LF2Q** ★ | Economically active 16–64 | SA | Not Claimant Count |
| Inactive | **LF2M** ★ | **LF2S** ★ | Population 16–64 | SA | |
| Economically active | **LF2K** | **LF22** (activity rate) | Population 16–64 | SA | Inventory only — not ingested |
| Population 16–64 | **LF2O** | — | — | (weighting pop) | Inventory; bulletin identity check |

#### Headline 16+ (do not mix into 16–64 composition without a break chip)

| Concept | Level | Rate | Notes |
|---------|-------|------|-------|
| Employed 16+ | MGRZ | MGSR | Headline employment **level** |
| Unemployed 16+ | MGSC | **MGSX** | Headline unemployment **rate** (active 16+) |
| Inactive 16+ | MGSI | YBTC | Inactivity rate 16+ less meaningful (includes retired) |

#### Sex splits (inventory)

Female employment rate 16–64: LF25 · Male: MGSV · Female inactivity rate: LF2T · Male: YBTM (and matching level CDIDs in A02 SA).

#### Tables / datasets

| Dataset | URL | Use |
|---------|-----|-----|
| A02 SA | [employment / unemployment / inactivity 16+ and 16–64 SA](https://www.ons.gov.uk/employmentandlabourmarket/peopleinwork/employmentandemployeetypes/datasets/employmentunemploymentandeconomicinactivityforpeopleaged16andoverandagedfrom16to64seasonallyadjusteda02sa/current) | Flagship reconciliation |
| A05 SA | [by age group SA](https://www.ons.gov.uk/employmentandlabourmarket/peopleinwork/employmentandemployeetypes/datasets/employmentunemploymentandeconomicinactivitybyagegroupseasonallyadjusteda05sa/current) | Age detail |
| LMS | [labour market statistics time series](https://www.ons.gov.uk/employmentandlabourmarket/peopleinwork/employmentandemployeetypes/datasets/labourmarketstatistics) | Bulk CDID download |
| INAC01 SA | [inactivity by reason SA](https://www.ons.gov.uk/employmentandlabourmarket/peoplenotinwork/economicinactivity/datasets/economicinactivitybyreasonseasonallyadjustedinac01sa) | Outside the Workforce |

Licence: Open Government Licence v3.0.

---

## Artefact 2 — Research scope

**Question:** Who is in work in Britain, who is inactive, and how has the labour market changed?

### What current pins can answer

- Levels and rates of employed / unemployed / inactive aged 16–64 UK SA since 1971 (monthly LMS).
- Working-age **composition** from official counts (LF2G + LF2I + LF2M), with history.
- Employment and inactivity rates of population; unemployment rate of the economically active (LF2Q).

### What they cannot answer (yet)

- Reasons for inactivity (students, long-term sick, caring, retired, other) — **scoped**, not ingested.
- Industry / occupation structure — **planned-not-ready**; manufacturing via Energy link only.
- Hours / part-time / underemployment — **planned-not-ready**.
- Vacancies — **planned-not-ready**.
- Regional / local labour markets — **planned-not-ready**; Regions ownership open.
- Person-level flows between statuses — **forbidden** (not observed from two aggregates).

### Boundaries (confirmed)

| Topic | Owner | Rule |
|-------|-------|------|
| National LFS employment / inactivity / unemployment | Economy 03 | Own |
| Earnings (AWE) | Economy 02 | GB geography — label break vs UK LFS |
| Whole-economy productivity / GDP | Economy 05 | Link |
| Manufacturing employment, BRES, mfg productivity | Energy Jobs | **Link only** — never fork under `data/economy/` |
| Subnational atlas | Regions? | Coordinate before ingest |

### LFS quality (every pin)

- Survey response and reweighting issues; treat small month-to-month moves as noisy.
- Rolling three-month average shown as mid-month in LMS.
- Claimant Count ≠ ILO unemployment.
- Never present rates with mismatched denominators as a single pie.

### Gap list — experiences 2–6

| Experience | Source | CDID / table (if known) | State |
|------------|--------|-------------------------|-------|
| **Outside the Workforce** | [INAC01 SA](https://www.ons.gov.uk/employmentandlabourmarket/peoplenotinwork/economicinactivity/datasets/economicinactivitybyreasonseasonallyadjustedinac01sa); LMS reason series e.g. student **LF6X** (%), long-term sick **LF75** (%), looking after family/home **LF65** (000s SA) | Reason pack | **Scoped** — sources found; not ingested in Phase 0 |
| **What Britain Does for Work** | Workforce Jobs / LFS by industry; SIC revisions | WFJ / EMP tables | **Planned-not-ready**; **link** Energy `manufacturing-employment`, BRES |
| **The Working Week** | LFS hours / FT-PT | EMP hours series (TBD) | **Planned-not-ready** |
| **The Demand for Labour** | Vacancy Survey VACS01–03 | Vacancy CDIDs in LMS/UNEM | **Planned-not-ready** (Oct 2026 LMS had a temporary vacancy processing note — re-check on next pin) |
| **The Geography of Employment** | APS / NOMIS / HI00 regional rates | e.g. registry already has “Employment rate by region” candidate | **Planned-not-ready**; **Regions ownership question** before any Economy ingest of local atlas |

---

## Artefact 3 — Notion plan status

Updated on [Domain 03](https://app.notion.com/p/414654717685813fb55ad2fc81cd4e4f) (2026-11-14):

- Phase 0 checkboxes: boundaries, count/rate inventory, register + ingest companions, LFS caveats, four artefacts — marked done / in progress as applicable.
- Flagship evidence: **count reconciliation proven** (LF2G/LF2I/LF2M); rates alone still insufficient for composition.
- Experiences: British Workforce → evidence validated for counts (awaiting Validation QA); Outside the Workforce → sources scoped; others remain planned-not-ready.
- Four new registry rows created (Ingesting); LF24/LF2S last-checked refreshed.

---

## Artefact 4 — Handover paths + recommended G3 views (requirements only)

### Paths

| Kind | Path |
|------|------|
| Specs | `src/economy/connectors/labour_prices_series.py` |
| Connectors | `src/economy/connectors/{employment_rate,employment_level,unemployment_rate,unemployment_level,economic_inactivity_rate,economic_inactivity_level}.py` |
| Packages | `data/economy/{employment-rate,employment-level,unemployment-rate,unemployment-level,economic-inactivity-rate,economic-inactivity-level}/` |
| This handover | `docs/handover-economy-03-employment.md` |
| Kickoff | `docs/agent-kickoff-economy-03-employment.md` |

### Blockers for Validation

1. Independent sample QA vs A02 SA / Oct 2026 bulletin for all six series (spot Jul 2026 values above).
2. Confirm LF2O population identity (optional pin) if Validation wants an explicit denominator series.
3. Cloud load: follow existing Economy ONS timeseries → Supabase pattern before UI Ready.
4. Do **not** mark registry Ready until QA evidence lands in `data/qa/`.
5. Next LMS release **17 Nov 2026** — re-pin all six after that bulletin.

### Recommended next Validation task

**VAL-EC-03-LMS:** Sample-check LF24, LF2S, LF2G, LF2I, LF2M, LF2Q against A02 SA / LMS bulletin Oct 2026; verify composition sum vs LF2O; file `data/qa/`; only then propose Ready.

### Recommended G3 views (requirements only — no React)

1. **The British Workforce (flagship)** — stacked / partitioned working-age composition from **LF2G + LF2I + LF2M** (counts), with history slider; companion rate chips LF24 / LF2Q / LF2S with **denominator labels**; Notes for LFS quality; accessible table. No fabricated flows.
2. **Rate strip** — LF24 and LF2S (population) beside LF2Q (active) with an explicit “not the same denominator” callout.
3. **Follow links** — Domain 02 AWE only with **GB vs UK** geography-break chip; Energy manufacturing employment / BRES by Follow, never fork.
4. **Defer** Outside the Workforce until INAC01 / reason CDIDs ingested; defer geography until Regions ownership decided.

### Do not (carried forward)

- Build `/economy?domain=employment` before Orchestrator G3 authorisation.
- Pair UK LFS with GB AWE without a geography-break chip.
- Treat Claimant Count as ILO unemployment.
- Re-ingest manufacturing employment under `data/economy/`.
