# Handover — Economy Domain 02 · Wages, Earnings & Income

**Gate:** G2 evidence only · **Wave:** A · **Owner:** Economy subagent · **Date:** 2026-11-11  
**Notion plan:** [02 · Wages, Earnings & Income](https://app.notion.com/p/41465471768581018788fcb363cb4734)  
**Kickoff:** [agent-kickoff-economy-02-wages.md](agent-kickoff-economy-02-wages.md) · **Matrix:** [economy-overlap-matrix.md](economy-overlap-matrix.md)

> **No Ready claim.** Both registry rows already say Ready from the earlier full-catalogue wave. This handover adds evidence and notes only. Validation (independent) must sign off before the Orchestrator treats the domain as trusted. No frontend was touched.

---

## Artefact 1 — Dataset foundation

| | `nominal-earnings` | `real-earnings` |
|---|---|---|
| Series (ONS) | **KAI7** · dataset EMP | **A2FC** · dataset EMP |
| ONS title | AWE: Whole Economy Level (£): SA Regular Pay Excluding Arrears | AWE: Whole Economy Real Terms Level (£): SA Regular Pay |
| Unit | £ per week, SA, cash terms | £ per week, SA, real terms (2015 prices; CPIH-based, see below) |
| Frequency / span | monthly, 2000-01 → 2026-08 (320 obs) | same |
| Latest value | £707 (Aug 2026) | £494 (Aug 2026) |
| ONS release / next | 2026-10-19 / 17 Nov 2026 | same |
| Connector | `economy.connectors.nominal_earnings` | `economy.connectors.real_earnings` |
| Spec | `src/economy/connectors/labour_prices_series.py` (`NOMINAL_EARNINGS`) | same (`REAL_EARNINGS`) |
| Manifest | `data/economy/nominal-earnings/manifest.yaml` | `data/economy/real-earnings/manifest.yaml` |
| Curated | `data/economy/nominal-earnings/curated/observations.csv` | `data/economy/real-earnings/curated/observations.csv` |
| Raw pin | `raw/2026-11-07/kai7_emp.json` | `raw/2026-11-03/a2fc_emp.json` |
| sha256 | `c23b05e8873d568c7cab0dd7779b442e9370bb477b1705c544bf34d1634c7c98` | `27a063a1b31cdcd3660407617943255f8954cb09e0724782ca06eac913a2dd4e` |
| Validation notes | `data/economy/nominal-earnings/validation_notes.md` | `data/economy/real-earnings/validation_notes.md` |
| Registry | [row](https://app.notion.com/p/4146547176858139b68ae2c75df07043) | [row](https://app.notion.com/p/40d654717685814a998ad66b45808f8c) |
| Licence | OGL v3.0 | OGL v3.0 |

Run (from repo root): `uv run python -m economy.connectors.nominal_earnings` / `…real_earnings` (see [uv docs](https://docs.astral.sh/uv/)). Re-running creates a new dated raw folder and rewrites manifest + curated.

### Re-validation vs the live ONS release (2026-11-11)

- Downloaded both `/data` JSON files fresh. Month arrays are **identical** to the pins: 0 value differences over 320 months.
- Fresh bytes hash to the manifest checksums for both series. The ONS vintage is unchanged since the 2026-10-19 release (next one is 17 Nov 2026 — **re-pin then**).
- Curated row counts (320) equal the ONS month counts.
- Not done here: independent sample check against the ONS statistical bulletin tables (Validation's job).

### Fixes made inside Economy paths (small; no data values changed)

1. **`real-earnings` raw evidence was missing on disk** (manifest pointed at `raw/2026-11-03/a2fc_emp.json` but no `raw/` folder existed). Restored from a fresh download; checksum matches the recorded one exactly. (`raw/` is gitignored; the Storage archive is the long-term home.)
2. **Related-indicator links.** `REAL_EARNINGS` listed `cpi-inflation` twice and no link to `nominal-earnings`; `NOMINAL_EARNINGS` only linked CPIH. Fixed at the source (the spec in `labour_prices_series.py`) and mirrored into both manifests. Now: real → nominal, CPI rate, CPI index, CPIH index, plus the existing growth/labour links; nominal → real, CPIH, CPI index, CPI rate.

### Geography — GB vs UK (confirmed, defect open)

- ONS AWE (Monthly Wages and Salaries Survey) covers **Great Britain**; it excludes Northern Ireland, the self-employed and HM Forces ([AWE QMI](https://www.ons.gov.uk/employmentandlabourmarket/peopleinwork/earningsandworkinghours/methodologies/averageweeklyearningsqmi)). The ONS publication is titled "Average weekly earnings in Great Britain".
- Our curated rows carry `K02000001` / "United Kingdom" because `ons_timeseries.py` hard-codes a UK label for every ONS series. The manifest text says "Great Britain / UK" but the row-level label is wrong for AWE.
- **Not fixed here** — changing the code changes observation identity hashes in Postgres and a downstream consumer (Energy prices model reads `nominal-earnings` and `real-earnings`). Recommended fix, for Orchestrator approval: add a per-spec GB override (`K03000001`, "Great Britain") on `NOMINAL_EARNINGS` / `REAL_EARNINGS`, re-ingest, reload cloud, then check Energy's use.
- Until then: any view pairing AWE with UK labour-market rates (`employment-rate` LF24, `economic-inactivity-rate` LF2S, both UK 16–64) **must label the geography break**.

### Real-terms deflator family

| Item | Finding |
|------|---------|
| What A2FC is | ONS-published real AWE, regular pay, SA, whole economy, 2015 prices |
| Deflator | **CPIH-based.** Test on all 320 months: `KAI7 ÷ (L522/100)` vs A2FC mean abs error £1.36 (max £3.69). Using CPI `D7BT` instead is clearly worse (mean £3.85, max £11.01). ONS does not name the deflator in the series JSON, so this is an inference; confirm against the bulletin's real-terms note when Validation runs. |
| Reproducibility | A2FC is **not exactly reproducible** from pinned L522 (vintage/rounding). Use A2FC as published. Any self-deflated line (e.g. KAI7 ÷ CPI) must be a labelled derived series in Notes, not called `real-earnings`. |
| Linked indicators | `cpih-index` (L522, Domain 01 owns; preferred household-cost deflator), `cpi-index` (D7BT, Domain 01), `cpi-inflation` (D7G7, annual rate; Sep 2026 = 3.5%). All UK, 2015=100. |
| Timing mismatch | AWE runs to Aug 2026; CPI/CPIH to Sep 2026 (release 2026-10-20). Pair on the latest common month. |
| Do not | Present CPI as CPIH or the reverse; mix annual-rate (`D7G7`) with levels without saying so; call `real-earnings` "inflation-adjusted pay per household". |

### Boundary and links (no forks)

- **Energy `ashe-manufacturing-earnings`** — link only (`data/energy/ashe-manufacturing-earnings/`, UK, annual, manufacturing medians, ASHE Table 4, 2025 revised pin). Not copied or touched.
- **Housing** affordability series (price-to-earnings, rent-to-earnings) are Housing-owned derived series; Follow, do not re-derive.
- **Energy Prices Affordability** consumes `nominal-earnings`/`real-earnings`; `indicator_id`s stay stable.

---

## Artefact 2 — Research scope

**Locked-for-G2 question:** Are earnings keeping up with prices, and how does pay differ across the country and workforce?

**What the current pins can answer (descriptive facts from the pin, not editorial):**

- Level and trend of average regular pay per employee in GB, cash and real, monthly since 2000.
- Whether pay is outrunning prices on the CPIH basis: Aug 2026 vs Aug 2025, nominal £682 → £707 (+3.7%), real £493 → £494 (+0.2%).
- Real regular pay peaked at £497 (Jun 2026) in the pin; the 2022 trough was £472 (Oct 2022). Real-terms framing needs the revision caveat below.

**What they cannot answer:**

- Distribution (median, percentiles, ladder), low pay, gender/age/occupation: needs ASHE national tables.
- Regional or local pay: needs ASHE Table 7/8 (place of work / residence) → likely Regions.
- Household income, savings, benefits, poverty: HBAI / ONS household finances → see ownership note.
- Rates of pay or like-for-like growth: AWE is a ratio of total pay to employees, so composition changes move it (ONS QMI).
- Total pay including bonuses (different CDIDs; not ingested).

**Known limitations / breaks**

| Limit | Detail |
|-------|--------|
| GB not UK | See Geography above. |
| Regular pay only | Excludes bonuses and arrears; not total pay. |
| Revisions | AWE revises with later returns; curated rows are `provisional`. Re-pin monthly; Notes must carry release date. |
| Composition | Average, not median; affected by who is employed. |
| Rounding | ONS publishes whole £; real/nominal ratios carry ±£0.5 rounding noise. |
| Series span | 2000-01 start in the pin; ONS earlier history exists for some AWE series but is not pinned. |

**Gap list**

| Gap | Severity | Proposed route |
|-----|----------|----------------|
| National ASHE (all employees): median, deciles, by sex/FT-PT/age/occupation | Medium–High (blocks wage ladder) | New Economy indicator(s) with own registry rows; ASHE Table 1 (all employees; median and percentiles) first; other tables only after scoping. Do **not** extend or fork Energy `ashe-manufacturing-earnings`. |
| Regional earnings | Medium | ASHE Table 7/8 (+ Table 5 region × industry). Prefer **Regions** sector per overlap matrix; Economy may link. |
| Total pay incl. bonuses / sector splits (public vs private, industry) | Low–Medium | Other AWE CDIDs in the same EMP dataset (same connector family). |
| Household income / HBAI | High, out of scope here | See ownership note. |
| Real-terms with own deflator choice | Low | Derived series only, documented formula. |

**Note on ASHE freshness:** ONS dataset pages for ASHE Tables 1, 5 and 7 show a release dated 22 Oct 2026. Energy's pinned Table 4 is the **2025 revised** edition (release 2025-10-22). Energy / Orchestrator may want to check whether a newer edition exists; this is an Energy-path observation, not an Economy action.

**Household income ownership (do not silently expand):** HBAI (DWP, Households Below Average Income) and ONS household income/savings belong with **Domain 04 Household Finances** for now, with a likely later move to **People & Society**, per the overlap matrix. Domain 02 only *Follows* them and stays on earnings from employment. No HBAI source was ingested or scoped under this domain.

---

## Artefact 3 — Notion plan (summary)

Plan page: [02 · Wages, Earnings & Income](https://app.notion.com/p/41465471768581018788fcb363cb4734). Matured on 2026-11-11 with:

- Status Scoping → evidence complete for G2 (no Ready claim); inventory table with verified pins and checksums.
- Research areas, answerable/unanswerable list, geography and deflator notes.
- Flagship **Pay cheque vs prices**; planned-not-ready **wage ladder**, **regional pay map** and **household income** (cross-domain).
- Tech requirements and an implementation checklist tied to the gaps above.
- Four artefact checklist, with this file as the Handover link.

---

## Artefact 4 — Handover

### Files and IDs

| Item | Path / ID |
|------|-----------|
| Indicator IDs | `nominal-earnings` (KAI7), `real-earnings` (A2FC) |
| Link-only IDs | `cpih-index` (L522), `cpi-index` (D7BT), `cpi-inflation` (D7G7); `ashe-manufacturing-earnings` (Energy) |
| Dimensions available | None beyond time. Single series each; geography is a single national code; no sex/age/sector/region. |
| Curated columns | Standard Observation header; `notes` = `series=KAI7; dataset=EMP; month=MM; monthly` |
| Connectors | `src/economy/connectors/nominal_earnings.py`, `real_earnings.py`; specs in `labour_prices_series.py`; shared `ons_timeseries.py` |
| Validation notes | `data/economy/{nominal,real}-earnings/validation_notes.md` |
| Consumers today | Energy Prices (`web/src/brand/energy/prices-model.ts`); Housing affordability paths link by ID |

### Dependencies

- Domain 01 (Inflation & Prices) must keep `cpih-index` / `cpi-index` / `cpi-inflation` ID-stable and current for the flagship.
- Cloud: Notion registry reports both series loaded to Postgres (nominal row says cloud delivery verified). I did not re-test the API in this pass.

### Blocked / open items

1. **GB vs UK geography label** on both series (needs Orchestrator approval; touches Postgres identity + Energy).
2. **No national ASHE** — wage ladder and any distribution story blocked until sourced and registered.
3. **No regional earnings** — Regions ownership decision needed.
4. **No household income** — Domain 04 / People ownership; not started.
5. **Deflator is inferred**, not stated by ONS in the series metadata — Validation to confirm from the bulletin note.
6. **Registry rows are "Ready"** with no Validation report specific to this domain; the real-earnings row also has an unticked checklist and empty Evidence/output. Orchestrator to decide whether to move both back to Validation.
7. **Next ONS release 17 Nov 2026** — pins will be one release stale after that.

### Recommended G3 views — requirements only (no code)

Use the Explorer shell per `docs/visual-identity.md`; no parallel layout. These are for the Review Gate to consider.

1. **Pay cheque vs prices (flagship).** Indexed paired lines (nominal AWE, CPIH, real AWE) rebased to a user-selected start month; or ChangeRows for 12-month changes. No dual axes. Notes must state: deflator = CPIH-based (A2FC as published), AWE = GB regular pay, prices = UK, latest common month, release dates.
2. **Real pay level.** Single series, A2FC £/week 2015 prices, with a marked previous peak and current level; one signature instrument candidate: a "distance to previous peak" readout that is data-derived and sourced.
3. **Nominal vs real gap.** Show the cash £ and real £ for the same month side by side (reading aid for "why £707 is not £707 of 2015 money").
4. **Geography note chip** wherever AWE is paired with UK rates (employment, inactivity).
5. **Planned-not-ready (label as such):** wage ladder / percentile instrument (needs national ASHE); regional pay map (needs ASHE regional / Regions); household income panel (needs Domain 04).

Every figure needs the source line (ONS, series ID, period, release date, indicator id).

### Validation request

Please schedule Validation for `nominal-earnings` and `real-earnings` covering: (a) sample check vs ONS AWE bulletin tables, (b) deflator confirmation, (c) GB geography decision and impact, (d) revision behaviour on the 17 Nov release, (e) Postgres/API parity.
