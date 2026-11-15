# Handover — Regions · Geography of Employment

**Task:** RG-EMP-GEO · **Owner:** Regions · **Date:** 2026-11-15  
**Kickoff:** [agent-kickoff-regions-employment-geography.md](agent-kickoff-regions-employment-geography.md)  
**Economy plan:** [03 · Employment & Labour Market](https://app.notion.com/p/414654717685813fb55ad2fc81cd4e4f)

> **Validation-ready. Not Ready.** No Economy canvas edits. The Geography tab stays EmptyStage until Orchestrator wires a Follow after Validation and cloud load.

One ONS workbook, three indicators. The workbook is HI00, the headline Labour Force Survey for UK countries and English regions. Persons, seasonally adjusted, rolling three-month periods published every month.

---

## What was wrong with the seed

`employment-rate-by-region` was already in the registry as **Ready**, and the manifest pointed at a 3 November pin. The raw workbook was not on disk (raw and regions curated files are gitignored). The checksum of the file ONS still publishes matches that pin, so the vintage was fine. The parser was not.

Each persons sheet has two columns named “Employment rate (%)”. The first is everyone aged 16 and over. The regional bulletin uses the later column, people aged 16 to 64. The old code took the first match. For the North East in June–August 2026 that is about **55.3%**, while the bulletin’s 16-to-64 rate is **70.5%**.

The new parser finds the age-group headings and reads only the rate inside the right block. The employment registry row is back on **Validation**.

---

## Packages

| Indicator | What it measures | Age | Denominator | Registry |
| --- | --- | --- | --- | --- |
| `employment-rate-by-region` | In work | 16 to 64 | Population 16–64 | [row](https://app.notion.com/p/40d654717685815691ebe6f62ca7a4e2) — was Ready, now **Validation** |
| `unemployment-rate-by-region` | ILO unemployed | 16 and over | Economically active 16 and over | [row](https://app.notion.com/p/41965471768581128c18ee73f2921996) — **Validation** |
| `economic-inactivity-rate-by-region` | Not in work and not ILO unemployed | 16 to 64 | Population 16–64 | [row](https://app.notion.com/p/4196547176858186bbd1da3479a67ed8) — **Validation** |

Shared facts:

| | |
| --- | --- |
| Publisher / licence | ONS · Open Government Licence v3.0 |
| Dataset | [HI00](https://www.ons.gov.uk/employmentandlabourmarket/peopleinwork/employmentandemployeetypes/datasets/headlinelabourforcesurveyindicatorsforallregionshi00) |
| Bulletin used for spots | [Labour market in the regions of the UK: October 2026](https://www.ons.gov.uk/employmentandlabourmarket/peopleinwork/employmentandemployeetypes/bulletins/regionallabourmarket/october2026) Table 1 |
| Release on the file | **20 October 2026** |
| Next release | **17 November 2026** |
| Workbook | `regionaltable1s.xlsx` |
| sha256 | `ff374cf96c5fa18a60f4540318b03a24fc06e9b0cd6af502c9dd205dcdc4967d` |
| Rows each | **5343** = 13 geographies × 411 periods (Mar–May 1992 through Jun–Aug 2026) |
| Provisional | **13** (the latest rolling quarter only). 5330 final |
| Sex | Persons. Men and women sheets are in the file and are not read |
| Connector | `regions.connectors.hi00_labour` |

Paths:

| Kind | Path |
| --- | --- |
| Parser | `src/regions/connectors/hi00_labour.py` |
| Entry points | `src/regions/connectors/employment_rate_by_region.py`, `unemployment_rate_by_region.py`, `economic_inactivity_rate_by_region.py` |
| Packages | `data/regions/employment-rate-by-region/`, `unemployment-rate-by-region/`, `economic-inactivity-rate-by-region/` |
| Raw (gitignored) | `raw/2026-11-15/regionaltable1s.xlsx` in each package. Same bytes. The employment package is the download; the other two are copies so each package can be re-run alone |

Run from the repo root ([uv](https://docs.astral.sh/uv/)):

```bash
uv run python -m regions.connectors.hi00_labour --download
uv run python -m regions.connectors.hi00_labour
```

`--download` saves the current ONS file only when the employment pin is missing. It will not overwrite a file that is already there. A new vintage means changing the pin path, the expected checksum, and the bulletin spots together. The connector refuses a different checksum.

Curated values keep the workbook’s full precision. The bulletin prints one decimal place, half up. Python’s built-in `round` uses ties-to-even, so the connector uses `Decimal` for that check ([decimal docs](https://docs.python.org/3/library/decimal.html#decimal.ROUND_HALF_UP)).

### June–August 2026 spots (bulletin Table 1)

Period on the row: `period_start=2026-06-01`, `period_end=2026-08-31`, label `Jun-Aug 2026`. These are the provisional rows.

| Geography | Code | Employment 16–64 | Unemployment 16+ | Inactivity 16–64 |
| --- | --- | --- | --- | --- |
| North East | E12000001 | 70.5 | 4.7 | 25.5 |
| North West | E12000002 | 74.9 | 4.6 | 21.6 |
| Yorkshire and The Humber | E12000003 | 72.9 | 5.2 | 23.0 |
| East Midlands | E12000004 | 76.3 | 4.7 | 20.0 |
| West Midlands | E12000005 | 72.5 | 5.7 | 22.8 |
| East of England | E12000006 | 77.7 | 3.9 | 19.0 |
| London | E12000007 | 74.5 | 6.6 | 20.1 |
| South East | E12000008 | 78.6 | 4.2 | 17.9 |
| South West | E12000009 | 79.2 | 3.8 | 17.5 |
| England | E92000001 | 75.6 | 4.9 | 20.4 |
| Wales | W92000004 | 73.3 | 3.4 | 24.0 |
| Scotland | S92000003 | 74.0 | 4.3 | 22.6 |
| Northern Ireland | N92000002 | 72.5 | 2.1 | 25.9 |

The bulletin shortens East of England to “East”. The workbook Index name is **East of England**. Use the code `E12000006` when joining.

The connector raises if any of these 39 spots disagree. That is a guard for this release, not a substitute for Validation.

### CDIDs stored in `notes` (England cells are blank in the sheet)

| Code | Employment 16–64 | Unemployment 16+ | Inactivity 16–64 |
| --- | --- | --- | --- |
| E12000001 | LF3P | YCNC | LF59 |
| E12000002 | LF3Q | YCND | LF5A |
| E12000003 | LF3R | YCNE | LF5B |
| E12000004 | LF3S | YCNF | LF5C |
| E12000005 | LF3T | YCNG | LF5D |
| E12000006 | LF3U | YCNH | LFP6 |
| E12000007 | LF3V | YCNI | LF5F |
| E12000008 | LF3W | YCNJ | LF5G |
| E12000009 | LF3X | YCNK | LF5H |
| E92000001 | — | — | — |
| W92000004 | LF3Z | YCNM | LF5J |
| S92000003 | LF42 | YCNN | LF5K |
| N92000002 | LF5Z | ZSFB | LF99 |

Notes also carry `series=HI00`, `sheet=`, `sex=persons`, `age=`, `adjustment=SA`, `denominator=`, `measure=`, and `period_label=`.

---

## Breaks versus Economy UK national LFS

Economy’s flagship labour rates are UK, persons, SA. Two of the regional rates match that age. Unemployment does not.

| | Economy (UK) | This handover (nation or English region) |
| --- | --- | --- |
| Employment | LF24, aged 16–64, % of population. Jun–Aug 2026 = **75.3%** | Same age and denominator. No UK row in HI00 |
| Inactivity | LF2S, aged 16–64, % of population. Jun–Aug 2026 = **20.9%** | Same age and denominator. No UK row in HI00 |
| Unemployment | LF2Q, aged **16–64**, % of economically active 16–64. Jun–Aug 2026 = **4.9%** | Headline regional rate is aged **16 and over**. The UK print in the same bulletin column is **4.7%**, not 4.9% |

England’s regional unemployment spot is **4.9%**. That matches the LF2Q digits and is still the wrong comparison: England, aged 16 and over, versus the UK, aged 16 to 64.

HI00 also contains a 16-to-64 unemployment rate (the sheet’s column 17 on this vintage). It is closer to LF2Q on age. It is **not** the rate the regional bulletin headlines, so it is not ingested. North East on that column is about 5.3% for June–August 2026, against 4.7% on the ingested 16-and-over rate.

Do not add the three regional rates into one composition. Employment and inactivity share a denominator. Unemployment uses a different age and the economically active as the denominator.

Claimant Count is a different table in the regional release. It is not in this workbook and it is not ILO unemployment.

These series are resident people from the Labour Force Survey. They are not BRES employee jobs. Energy already owns manufacturing employee jobs by region. Do not copy that into Regions.

---

## Left out on purpose

- **UK and Great Britain.** Both are in the bulletin table (GB employment 75.4, unemployment 4.8, inactivity 20.7). HI00 has no sheet for them. Do not invent them by adding regions.
- **Levels.** The cells that sit beside the rates are people (they reproduce the percentages). A corner label says “thousands”. Levels stay out until that label is reconciled.
- **Men and women sheets.**
- **Small-sample shading.** The workbook’s footnotes say some estimates are shaded because the sample is small. That flag is not copied onto rows.
- **Local authorities.** Annual Population Survey / NOMIS small areas are a later atlas, not this pin.

---

## Recommended Validation task

**VAL-RG-EMP-GEO.** Sample-check all three series against Table 1 of the October 2026 regional bulletin (the 39 spots above). Confirm the North East employment value is about 70.5, not about 55.3. Confirm unemployment notes say `age=16-and-over`. File the report under `data/qa/`. Do not mark Ready in that pass unless the sample matches.

Suggested checks:

1. sha256 of each package’s xlsx equals `ff374cf9…`.
2. 5343 rows, 13 provisional, latest period June–August 2026.
3. The 39 bulletin spots, rounded half-up to 1 decimal place.
4. Geography labels come from the Index sheet, including “East of England” and “Yorkshire and The Humber”.
5. No Claimant Count values and no UK code `K02000001`.

---

## Recommended Economy Follow (requirements only)

Orchestrator wires this. Do not build it on the Economy canvas in the Regions task.

The Geography view can plot these three series for the 13 geographies. Keep Economy’s UK series as reference lines, with chips, not as extra HI00 rows.

Every chart needs these chips, in words a reader can see:

1. **Geography** — nation or English region, not the UK. A UK reference line must say it comes from Economy (LF24 or LF2S), not from HI00.
2. **Age** — employment and inactivity are 16 to 64. Unemployment is 16 and over.
3. **Seasonal adjustment** — seasonally adjusted rolling three months.
4. **Who** — persons (not men, not women).

Unemployment rules:

- Do not draw Economy LF2Q (4.9%, UK, 16–64) on the same axis as this regional unemployment series.
- The matching UK number in the October 2026 bulletin is **4.7%**, aged 16 and over. Economy’s flagship pin is LF2Q, not that 16-and-over series. If a UK reference line is needed, label it as the bulletin’s 16-and-over rate, or ask Economy for a separate UK 16-and-over pin. Do not reuse LF2Q.
- Do not plot Claimant Count as unemployment.

Other rules:

- Do not sum the 13 geographies into a UK or GB total.
- Do not stack employment, unemployment, and inactivity as shares of one whole.
- Do not drop Energy’s manufacturing BRES jobs onto this map. Different concept (employee jobs, not LFS residents).
- Latest point (June–August 2026) is provisional. Say so.
- Regional LFS moves are noisy. Prefer the long view over one quarter’s change.
- No local-authority polygons in this Follow.
- Cloud load is a separate Orchestrator step after Validation. Production must not depend on the laptop copies. Raw and curated files under `data/regions/` are gitignored.

EmptyStage stays until that Follow is actually wired.
