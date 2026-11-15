# Handover — Economy Domain 03 · labelled gaps (EC-G2-03c)

**Gate:** G2 evidence · **Owner:** Economy · **Date:** 2026-11-15  
**Notion plan:** [03 · Employment & Labour Market](https://app.notion.com/p/414654717685813fb55ad2fc81cd4e4f)  
**Prior handover:** [handover-economy-03-employment-complete.md](handover-economy-03-employment-complete.md)  
**Kickoff:** [agent-kickoff-economy-03-gaps.md](agent-kickoff-economy-03-gaps.md)

> **No Ready claim. No frontend.** Geography stays with Regions. Packages are for Validation.

---

## Summary for Orchestrator

The three Economy gaps are ingested from official ONS tables. Nothing in those three gaps is still Blocked.

| Gap | Indicator | State |
|-----|-----------|--------|
| Industry sections | `workforce-jobs-by-industry` | **Ingesting** — JOBS02 levels, not shares |
| Underemployment | `underemployment` | **Ingesting** — EMP16, NSA, people |
| Involuntary part-time | `involuntary-part-time` | **Ingesting** — YCCX, thousands, SA |
| Discouraged level | `inactivity-reason-discouraged` | **Ingesting** — LFL8, thousands, 16–64 SA |
| Discouraged percent | `inactivity-reason-discouraged-rate` | **Ingesting** — LF77, **not a level** |

**Recommended Validation tasks:** `EC-VAL-03-JOBS02` · `EC-VAL-03-UNDEREMP` · `EC-VAL-03-DISCOURAGED`.

---

## Validation-ready IDs and spots

| Indicator | Series | Spot | Rows | Release | Registry |
|-----------|--------|------|------|---------|----------|
| `workforce-jobs-by-industry` | JOBS02 WFJ SA | 2026 Q2 total **36,734**; section C **2,460**; A–T sum **36,733** | 4,053 | 2026-09-15 | [row](https://app.notion.com/p/419654717685811bb08ce13159830438) |
| `underemployment` | EMP16 | Apr–Jun 2026 level **2,768,796** people; employment **34,426,383**; rate **8.042657…%** | 294 | 2026-08-18 | [row](https://app.notion.com/p/419654717685811983cddc434dd85f7b) |
| `involuntary-part-time` | YCCX | Jul 2026 (Jun–Aug) **915** thousand | 412 | 2026-10-19 | [row](https://app.notion.com/p/4196547176858174bd68dabbaa9b11da) |
| `inactivity-reason-discouraged` | LFL8 | Jul 2026 **30** thousand | 400 | 2026-10-19 | [row](https://app.notion.com/p/4196547176858182bddbcee4b7cd75d7) |
| `inactivity-reason-discouraged-rate` | LF77 | Jul 2026 **0.3%** | 400 | 2026-10-19 | [row](https://app.notion.com/p/419654717685814bbe94f304fdbe1daf) |

Reproduce:

```bash
uv run python -m economy.connectors.workforce_jobs_by_industry
uv run python -m economy.connectors.underemployment
uv run python -m economy.connectors.involuntary_part_time
uv run python -m economy.connectors.inactivity_reason_discouraged
uv run python -m economy.connectors.inactivity_reason_discouraged_rate
```

### Industry

- Sheet used: **WFJ SA** only (workforce jobs, seasonally adjusted, thousands).
- `series=A` … `series=T` are sections. `series=total` is the published all-jobs column. The G–T services aggregate is skipped so it cannot be added on top of G…T.
- 2026 Q2 total **36,734** matches `workforce-jobs` (DYDC). Section C **2,460** matches Energy `manufacturing-employment` (JWR7). Same published number, not a copy of `data/energy/`.
- No share of DYDC is stored. The 1 thousand gap (36,733 vs 36,734) is rounding. Largest gap in the file is 3 thousand.
- Workbook typos, values unchanged: `Mar 193` → 2019 Q1 (total 35,439); `Mar 204` → 2020 Q1 (total 35,606). Original text is in `source_label`.

### Underemployment and involuntary part-time

- EMP16 banner says “Levels, thousands”. The cells are **people**: 2,768,796 / 34,426,383 × 100 = the published rate. The connector refuses to run if that identity breaks. Do not divide by 1,000.
- Aged **16 and over**, **not seasonally adjusted**, quarterly. ONS does not publish an SA underemployment series in EMP16.
- YCCX is a different measure: part-time because they could not find full-time work. Title says **UK: All**, thousands, SA. Not 16–64. Not a share of YCBH.
- `Jan-Mar 20191` (Levels) and `Jan-Mar 20194` (Rates) are 2019 Q1 with a footnote digit stuck to the year.

### Discouraged workers

INAC01 SA, People sheet, dataset-identifier row: the discouraged **level** column is **LFL8**. The percent column is **LF77**. **LF8B** is the wants-a-job subset (Jul 2026 LMS = **19**), not the all-persons level.

The LMS title for LFL8 is only “Discouraged workers level people: 000s”. Age, UK and seasonal adjustment come from the INAC01 SA column, which sits beside LF63, LF65, LF67, LF69, LF6B and LF6D.

| Jul 2026 | Thousands |
|----------|-----------|
| Six earlier reasons | 9,060 |
| LFL8 | 30 |
| **Sum** | **9,090** |
| LF2M | **9,091** |
| Residual | **1** |

INAC01’s unrounded cell for Jun–Aug 2026 is **30,484.7 people** (rounds to 30 thousand). LF77 on that row is about 0.335%, which LMS prints as **0.3**. Multiplying 0.3 × 9,091 gives about 27. That is **not** the published level. Do not do it.

---

## Not ingested (not Blocked)

These were left out on purpose. They are not missing sources.

| Item | Why it is not in this pin |
|------|---------------------------|
| Occupation (EMP04) | LFS **people** by SOC. Different concept from workforce **jobs**. [EMP04](https://www.ons.gov.uk/employmentandlabourmarket/peopleinwork/employmentandemployeetypes/datasets/employmentbyoccupationemp04) |
| JOBS02 employee jobs, self-employment, NSA | Same workbook, different measures. WFJ SA is the composition series. |
| EMP16 overemployment and hours sub-components | Headline underemployment level and rate are enough. |
| LF8B | Wants-a-job subset only (19 thousand in Jul 2026). |
| Energy manufacturing / BRES | Link only: `manufacturing-employment`, `bres-manufacturing-employee-jobs-by-region`. No Economy copy. |
| Geography | Regions owns it. |

## Blocked

None of the three assigned gaps. There is no seasonally adjusted underemployment series to ingest; the official table is NSA and that is what was pinned.

---

## Recommended Validation tasks

1. **EC-VAL-03-JOBS02** — Sample JOBS02 WFJ SA against the workbook. Confirm 2026 Q2 total 36,734 = DYDC and section C 2,460 = JWR7 without a forked manufacturing package. Confirm section sums stay within 5 thousand of the published total. Confirm `Mar 193` / `Mar 204` are 2019 Q1 and 2020 Q1. Confirm no share series. File `data/qa/`.
2. **EC-VAL-03-UNDEREMP** — Confirm EMP16 cells are people (rate identity) and NSA, aged 16+. Confirm YCCX = 915 on the LMS title (UK: All, thousands, SA). Do not accept a computed share of YCBH or DYDC.
3. **EC-VAL-03-DISCOURAGED** — Confirm INAC01 SA identifier LFL8 on the all-persons reason-level column. Spot 30 thousand. Sum of seven reasons 9,090 vs LF2M 9,091. Confirm LF77 stays a percent and is not multiplied by LF2M. Confirm LF8B was not used as the level.

---

## Paths

| Kind | Path |
|------|------|
| Industry connector | `src/economy/connectors/workforce_jobs_by_industry.py` |
| Underemployment connector | `src/economy/connectors/underemployment.py` |
| LMS specs | `src/economy/connectors/labour_prices_series.py` |
| Thin connectors | `inactivity_reason_discouraged.py`, `inactivity_reason_discouraged_rate.py`, `involuntary_part_time.py` |
| Download helper | `src/economy/connectors/ons_workbook.py` (User-Agent; shared fetch does not send one) |
| Packages | `data/economy/{workforce-jobs-by-industry,underemployment,involuntary-part-time,inactivity-reason-discouraged,inactivity-reason-discouraged-rate}/` |
| Reason reconciliation | `data/economy/inactivity-reason-pack/reconciliation_notes.md` |
