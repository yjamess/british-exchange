# Validation kickoff — Economy 03 · LMS flagship set (VAL-EC-03-LMS)

**Owner:** Validation · **Date:** 2026-11-14  
**Domain:** [03 · Employment & Labour Market](https://app.notion.com/p/414654717685813fb55ad2fc81cd4e4f)  
**Handover:** [handover-economy-03-employment.md](handover-economy-03-employment.md)  
**Skill:** `.cursor/skills/validation-agent/SKILL.md`

## Scope

Independent numerical and methodological QA only — do **not** rewrite curated files or re-ingest as the primary path. File findings under `data/qa/`. Do not flip Notion Ready yourself unless Orchestrator explicitly assigns that step after a pass.

### Series under test (UK · 16–64 · SA · LMS · release 2026-10-19)

| Indicator | CDID | Path | Spot (2026-07 = Jun–Aug) |
|-----------|------|------|--------------------------|
| `employment-rate` | LF24 | `data/economy/employment-rate/` | 75.3% |
| `economic-inactivity-rate` | LF2S | `data/economy/economic-inactivity-rate/` | 20.9% |
| `employment-level` | LF2G | `data/economy/employment-level/` | 32,823 thousand |
| `unemployment-level` | LF2I | `data/economy/unemployment-level/` | 1,675 thousand |
| `economic-inactivity-level` | LF2M | `data/economy/economic-inactivity-level/` | 9,091 thousand |
| `unemployment-rate` | LF2Q | `data/economy/unemployment-rate/` | 4.9% of econ. active |

Official references:

- [Labour market overview, UK: October 2026](https://www.ons.gov.uk/employmentandlabourmarket/peopleinwork/employmentandemployeetypes/bulletins/uklabourmarket/october2026)
- [A02 SA](https://www.ons.gov.uk/employmentandlabourmarket/peopleinwork/employmentandemployeetypes/datasets/employmentunemploymentandeconomicinactivityforpeopleaged16andoverandagedfrom16to64seasonallyadjusteda02sa/current)

### Checks

| ID | Check | How |
|----|-------|-----|
| C1 | Input freeze | Manifest raw sha256 / paths exist for each of the six packages (`raw/2026-11-14/`) |
| C2 | Spot vs bulletin | Curated values for 2026-07 match A02 SA / Oct 2026 bulletin for all six CDIDs |
| C3 | Composition identity | LF2G + LF2I + LF2M ≈ LF2O (bulletin population 16–64); allow ±1 thousand published rounding |
| C4 | Rate from counts | Employment and inactivity rates implied by counts match LF24 / LF2S within 0.1 pp; unemployment rate from LF2I/(LF2G+LF2I) matches LF2Q within 0.1 pp |
| C5 | Denominator honesty | Confirm unemployment rate is **not** population-denominated; Notes/manifests distinguish pop vs active |
| C6 | Provisional | Exactly one provisional month (latest) per series; older months `final` |
| C7 | Geography / age | Manifests declare UK (K02000001), 16–64, SA — not mixed with 16+ MGSX/MGRZ |
| C8 | LFS caveats | Manifest / validation notes mention LFS revision / rolling three-month / survey quality |

### Out of scope

- Frontend / `/economy?domain=employment`
- Re-pin after **17 Nov 2026** LMS (calendar; note as follow-up)
- INAC01 inactivity reasons, vacancies, hours, geography
- Energy manufacturing / BRES (link-only — do not QA as Economy packages)
- Optional LF2O pin (inventory only unless you want it as a warn/recommendation)
- Cloud `load_ready` (Orchestrator after Ready)

### Independence rule

If a check fails, document it. Do **not** edit Economy curated data to silence a fail. Escalate to Economy.

## Done means

1. QA report `data/qa/qa_report_economy_03_lms_2026-11-14.md` (pass/warn/fail table)
2. Optional reproducible script under `src/validation/` if useful
3. Short status note under VAL-EC-03-LMS in `docs/work-plan.md`
4. If **pass:** recommend Orchestrator Ready flip on all six registry rows + cloud load; if **fail/warn:** list Economy fix tasks
