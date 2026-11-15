# Handover — Economy Domain 03 · Employment completion (EC-G2-03b)

**Gate:** G2 evidence for remaining experiences · **Wave:** B · **Owner:** Economy · **Date:** 2026-11-14  
**Notion plan:** [03 · Employment & Labour Market](https://app.notion.com/p/414654717685813fb55ad2fc81cd4e4f)  
**Prior handover:** [handover-economy-03-employment.md](handover-economy-03-employment.md)  
**Kickoff:** [agent-kickoff-economy-03-employment-complete.md](agent-kickoff-economy-03-employment-complete.md)  
**Work plan:** EC-G2-03b

> **No Ready claim. No frontend.** Flagship Workforce + Rates + Data unchanged (LMS 2026-10-19). Packages prepared for Validation.

---

## Summary for Orchestrator

| Experience | State after this pass |
|------------|------------------------|
| **Outside the Workforce** | **Evidence shipped** — six reason **levels** ingested; sum≈LF2M; residual documented |
| **What Britain Does for Work** | **Partial** — national `workforce-jobs` (DYDC); industry sections **Blocked** (JOBS02 multi-series); **link** Energy manufacturing |
| **The Working Week** | **Partial** — hours (YBUV) + FT/PT 16+ (YCBE/YCBH); underemployment **Blocked** |
| **The Demand for Labour** | **Evidence shipped** — `uk-vacancies` (AP2Y); spot matches Oct 2026 bulletin |
| **The Geography of Employment** | **Planned-not-ready** — Regions ownership open; no LA atlas; no national regional-rate ingest this pass |

**Recommended Validation tasks:** `EC-VAL-03-INAC` (reason pack) · `EC-VAL-03-HOURS` · `EC-VAL-03-VAC` · `EC-VAL-03-JOBS` (workforce jobs + FT/PT).

---

## Artefact 1 — Dataset foundation

### Outside the Workforce — reason levels (must-ship)

All UK · 16–64 · SA · thousands · LMS · release **2026-10-19** · retrieved **2026-11-14** · provisional = latest month only.

| Indicator | CDID | Spot 2026-07 | Rows | Registry |
|-----------|------|--------------|------|----------|
| `inactivity-reason-students` | LF63 | 2,453 | 400 | [row](https://app.notion.com/p/41865471768581078443eb82c80e7ea9) |
| `inactivity-reason-family-home` | LF65 | 1,559 | 400 | [row](https://app.notion.com/p/4186547176858117929ad54d550d7709) |
| `inactivity-reason-temp-sick` | LF67 | 186 | 400 | [row](https://app.notion.com/p/41865471768581e2aec5c0318c86518d) |
| `inactivity-reason-long-term-sick` | LF69 | 2,738 | 400 | [row](https://app.notion.com/p/4186547176858143adc1e0621cfc23fc) |
| `inactivity-reason-retired` | LF6B | 1,080 | 400 | [row](https://app.notion.com/p/41865471768581e7a232f1f1ea7afc01) |
| `inactivity-reason-other` | LF6D | 1,044 | 400 | [row](https://app.notion.com/p/418654717685811c97bcde11b151f43e) |

**Reconciliation (Jul 2026):** sum reasons = **9,060** · LF2M = **9,091** · residual = **31**. Residual ≈ discouraged share (LF77 ≈ 0.3% ≈ 27) + rounding. See `data/economy/inactivity-reason-pack/reconciliation_notes.md`.

**Discouraged gap:** LF77 is **% only**; no all-persons 000s SA twin found. LF8B is wants-job subset only. **Do not** invent levels from % × LF2M.

Run:

```bash
uv run python -m economy.connectors.inactivity_reason_students
uv run python -m economy.connectors.inactivity_reason_family_home
uv run python -m economy.connectors.inactivity_reason_temp_sick
uv run python -m economy.connectors.inactivity_reason_long_term_sick
uv run python -m economy.connectors.inactivity_reason_retired
uv run python -m economy.connectors.inactivity_reason_other
```

### Working Week + Demand + national jobs

| Indicator | CDID | Spot | Unit / note | Registry |
|-----------|------|------|-------------|----------|
| `average-actual-weekly-hours` | YBUV | 2026-07 = **32.0** | Hours/week SA · main & 2nd job | [row](https://app.notion.com/p/418654717685812287abf07322e3768b) |
| `employment-full-time` | YCBE | 2026-07 = **25,865** | Thousands · **16+** SA | [row](https://app.notion.com/p/41865471768581eaaaf9edcb2290a45e) |
| `employment-part-time` | YCBH | 2026-07 = **8,713** | Thousands · **16+** SA | [row](https://app.notion.com/p/4186547176858154973ad2cf13766489) |
| `uk-vacancies` | AP2Y | 2026-08 = **691** | Thousands SA · Vacancy Survey | [row](https://app.notion.com/p/41865471768581c4b9dcc8143efc237b) |
| `workforce-jobs` | DYDC | 2026 Q2 = **36,734** | Thousands jobs SA · quarterly | [row](https://app.notion.com/p/41865471768581c38bcafcb0c97f907e) |

```bash
uv run python -m economy.connectors.average_actual_weekly_hours
uv run python -m economy.connectors.employment_full_time
uv run python -m economy.connectors.employment_part_time
uv run python -m economy.connectors.uk_vacancies
uv run python -m economy.connectors.workforce_jobs
```

Age-break chip required: YCBE/YCBH are **16+**; flagship LF2G is **16–64**.

---

## Artefact 2 — Blocked / planned-not-ready (with evidence)

| Item | State | Evidence |
|------|-------|----------|
| Discouraged workers **levels** | **Blocked** | LF77 = % only; no UK 16–64 All 000s SA twin; do not invent from rates |
| Industry / occupation section pack | **Blocked** | JOBS02 / EMP13 are multi-series tables, not a single CDID; DYDC = national total only |
| Manufacturing employment | **Link only** | Energy owns `manufacturing-employment` / BRES — never fork |
| Underemployment / involuntary PT | **Blocked** | Clear CDID not pinned this pass |
| Regional employment rates / LA atlas | **Planned-not-ready** | Regions ownership open; no Economy ingest of local atlas |

---

## Artefact 3 — Notion plan status

Updated Domain 03 experience table (2026-11-14): Outside the Workforce → evidence ingested (awaiting Validation); Working Week / Demand → evidence partial/shipped; What Britain Does → national jobs only; Geography → still planned-not-ready. Eleven new registry rows at **Ingesting**.

---

## Artefact 4 — Paths + Validation ask

| Kind | Path |
|------|------|
| Specs | `src/economy/connectors/labour_prices_series.py` |
| Connectors | `src/economy/connectors/inactivity_reason_*.py`, `average_actual_weekly_hours.py`, `employment_full_time.py`, `employment_part_time.py`, `uk_vacancies.py`, `workforce_jobs.py` |
| Packages | `data/economy/{inactivity-reason-*,average-actual-weekly-hours,employment-full-time,employment-part-time,uk-vacancies,workforce-jobs}/` |
| Reconciliation | `data/economy/inactivity-reason-pack/reconciliation_notes.md` |
| This handover | `docs/handover-economy-03-employment-complete.md` |

### Validation-ready IDs (Status Ingesting → hand Validation)

`inactivity-reason-students`, `inactivity-reason-family-home`, `inactivity-reason-temp-sick`, `inactivity-reason-long-term-sick`, `inactivity-reason-retired`, `inactivity-reason-other`, `average-actual-weekly-hours`, `employment-full-time`, `employment-part-time`, `uk-vacancies`, `workforce-jobs`

### Recommended Validation tasks

1. **EC-VAL-03-INAC** — Sample-check six reason levels vs INAC01 SA / LMS; prove sum≈LF2M; document residual / discouraged gap; file `data/qa/`.
2. **EC-VAL-03-HOURS** — YBUV + YCBE + YCBH vs HOUR01 / EMP01; confirm 16+ vs 16–64 labelling.
3. **EC-VAL-03-VAC** — AP2Y vs VACS01 / Oct 2026 vacancies bulletin (691k).
4. **EC-VAL-03-JOBS** — DYDC vs JOBS01; confirm jobs≠people; no industry claim from total alone.

### Do not (carried forward)

- Frontend / EmptyStage fill (Orchestrator G3 after Validation + cloud).
- Invent discouraged levels or person-flow arrows.
- Treat Claimant Count as ILO unemployment; vacancies as hires.
- Fork Energy manufacturing / BRES under `data/economy/`.
- Mix 16+ FT/PT into 16–64 Workforce composition without a break chip.
