# Handover — Economy Domain 05 Productivity & Economic Growth

**Wave:** A · **Gate:** G2 (evidence + Notion only — no frontend) · **Owner:** Economy
**Date:** 2026-11-11
**Notion plan:** [05 · Productivity & Economic Growth](https://app.notion.com/p/414654717685811a9435e45ebfe64a3b)
**Kickoff:** [agent-kickoff-economy-05-growth.md](agent-kickoff-economy-05-growth.md) · **Overlap matrix:** [economy-overlap-matrix.md](economy-overlap-matrix.md)

> **Status: Validation-ready, not Ready.** Nothing in this handover sets a registry
> Ready. `real-gdp` has an earlier Validation pass-with-warns
> (`data/qa/qa_report_real_gdp_2026-11-03.md`) but it covers the **2026-08-12 PN2
> vintage**, which is now superseded (see §1.3). Re-validate after the re-pin.

**Central question (provisional):** How much does Britain produce, is output growing, and is productivity rising?

---

## Artefact 1 — Dataset foundation

### 1.1 Pins checked

All four ONS series were re-fetched live on **2026-11-11** (read-only, to `/tmp`; no
repo raw files were overwritten) and compared quarter-by-quarter with the curated CSVs.

| `indicator_id` | CDID / dataset | Curated rows | Range | Live PN2/PRDY vs curated | Pinned raw SHA-256 (prefix) |
|---|---|---|---|---|---|
| `real-gdp` | ABMI / PN2 | 286 | 1955 Q1 → 2026 Q2 | **0 diffs** (286/286) | `a1265250cf82` |
| `real-gdp-per-head` | IHXW / PN2 | 322 (314 non-missing) | 1946 Q1 (values from 1948 Q1) → 2026 Q2 | **0 diffs** (322/322) | `245f3fea0aeb` |
| `labour-productivity` | LZVB / PRDY | 221 | 1971 Q1 → 2026 Q1 | **0 diffs** (221/221) | `0203bfc8991c` |
| `business-investment` | NPEL / PN2 | 118 | 1997 Q1 → 2026 Q2 | **0 diffs** (118/118) | `41125202c10b` |

- Release dates in the live JSON: PN2 series **2026-08-12**; LZVB **2026-08-17** — identical to the manifests.
- Curated CSVs match the pinned vintage exactly. **The pins are internally correct but the PN2 vintage is no longer the latest ONS vintage** (§1.3).
- Raw JSON lives in Supabase Storage (`data/**/raw/**` is git-ignored); the local `raw/2026-11-03/` folders are not on this laptop. The checksums above come from the manifests. Validation should pull raw from `bx-data-archive`.
- Latest pinned values: ABMI 2026 Q2 = 712,545 £m · IHXW 2026 Q2 = £10,234 · LZVB 2026 Q1 = 100.1 (2023=100) · NPEL 2026 Q2 = 78,413 £m.

### 1.2 Units, geography, adjustment (explicit)

| Indicator | Geography | SA? | Nominal/real | Unit / base |
|---|---|---|---|---|
| `real-gdp` | UK `K02000001` | SA | real (CVM) | £ million, market prices; reference year **2023** at the pinned vintage |
| `real-gdp-per-head` | UK | SA | real (CVM) | £ per head, market prices; reference year **2023** (ONS series title) |
| `labour-productivity` | UK | SA | real | Index 2023=100, **output per hour**, whole economy (not per job — LNNN) |
| `business-investment` | UK | SA | real (CVM) | £ million, GFCF headline total |

### 1.3 Blue Book / CVM revision behaviour (documented, with evidence)

**Finding (new, 2026-11-11): the pinned PN2 vintage is on reference year 2023; the
ONS QNA vintage of 2026-09-29 is on reference year 2024.**

| Series | Latest quarter, pinned PN2 (2026-08-12) | Same quarter, QNA (2026-09-29) | Ratio | Growth since 2019 Q4 PN2 → QNA |
|---|---|---|---|---|
| ABMI 2026 Q2 | 712,545 | 744,453 | 1.045 | +6.26% → +6.21% |
| IHXW 2026 Q2 | 10,234 (ref. yr 2023) | 10,692 (ref. yr **2024**, per series title) | 1.045 | +1.77% → +1.72% |
| NPEL 2026 Q2 | 78,413 | 83,534 | 1.065 | +12.88% → +12.69% |

- ABMI QNA/PN2 ratio ranges **1.027 (1955 Q1) → 1.045 (2019 Q4+)** across all 286 quarters: every historical level moved, not just the tail.
- Growth shapes are stable (differences < 0.2 pp over 2019 Q4 → 2026 Q2). **Levels are not comparable across vintages; growth rates and fixed-quarter indices are.**
- ONS annual rebasing: Blue Book 2025 moved the CVM reference year 2022 → 2023 (ONS: [Blue Book 2025 advanced aggregate estimates](https://www.ons.gov.uk/economy/grossdomesticproductgdp/articles/bluebook2025advancedaggregateestimates/2025-08-19)). The QNA vintage is already on 2024.
- Revision triggers (all four series): (1) every GDP monthly/quarterly release; (2) PN2 first estimate → QNA; (3) Blue Book (supply-and-use balancing + rebasing); (4) population revisions (IHXW only); (5) labour-input revisions (LZVB only).
- **Corrections made this pass:** `real-gdp` manifest/connector claimed "BB2024 last base year 2022" — stale. Fixed in `src/economy/connectors/real_gdp.py` and `data/economy/real-gdp/manifest.yaml` (regenerated from the connector; raw evidence block unchanged).
- **Mixed-base risk right now:** IHXW/ABMI (2023, pinned) vs LZVB (2023, but PRDY next release **2026-11-17** may rebase) — never overlay *levels* from different vintages.
- ONS timeseries JSON `nextRelease` on the PN2 landing is stale (`30 September 2026`); the QNA landing shows **12 November 2026** (Q3 first estimate). The pinned PN2 data is not "wrong", it is just not the newest.

### 1.4 Registry hygiene done

| Item | Before | After |
|---|---|---|
| `real-gdp-per-head` `related_indicator_ids` | `real-gdp` listed twice (config prepended an id already in `Y1_RELATED`) | de-duplicated at source (`labour_prices_series.py`) |
| `real-gdp` `related_indicator_ids` | empty | `real-gdp-per-head`, `labour-productivity`, `business-investment` |
| `business-investment` README | "Ready (self-QA pass) … Registry → Ready" | "Validation-ready"; Economy does not set Ready; ownership note added |
| Revision notes | ABMI base-year wrong; IHXW/LZVB/NPEL generic | all four carry reference-year / vintage evidence |

Manifests were regenerated from connector config only (no re-fetch); checksums and
`raw_evidence` were asserted unchanged.

### 1.5 Validation-ready notes (no Ready claim)

- Items for Validation: (a) independent re-run after the re-pin (§Blockers #1); (b) confirm ABMI/IHXW reference year from the ONS release notes, not only the series title; (c) check `observation_status=provisional` is still the right flag once QNA vintage is used; (d) IHXW's 8 leading `missing` rows (1946–1947) are real gaps in ONS JSON.
- Repro: `uv run python -m economy.connectors.real_gdp` (and `real_gdp_per_head`, `labour_productivity`, `business_investment`). If a corporate proxy blocks ONS, unset proxy env vars.
- Existing checks to reuse: `src/validation/qa_real_gdp_2026_11_03.py`, `data/qa/qa_report_economy_y1_labour_prices_2026-11-03.md` (IHXW, LZVB: pass on the 2026-11-03 pin), `data/economy/business-investment/validation_report.md` (Economy self-QA only).

---

## Artefact 2 — Research scope

**Questions this domain answers**

1. How big is the UK economy in real terms, and how fast is it growing quarter to quarter?
2. Is output per head rising, and how does that compare with pre-pandemic (2019 Q4)?
3. Is output per hour worked rising (whole economy)?
4. How do revisions change the story? (Blue Book / CVM revision Notes — the distinctive honesty element.)

**Coverage:** UK only. ABMI from 1955 Q1; IHXW values from 1948 Q1; LZVB from 1971 Q1; NPEL from 1997 Q1. Quarterly SA. Longer annual context: `bank-of-england-millennium-gdp` (History, annual, real GDP CVM 2013 base — **link only**, different base year, never splice with ABMI).

**Limitations**

- Reference-year/vintage drift (§1.3): the headline chart must carry a vintage + reference-year stamp.
- Whole-economy only; no industry GVA, no regional GVA, no hours/jobs components.
- IHXW per head uses ONS population denominators that revise separately.
- LZVB is output per **hour** whole economy — do not compare its level with Energy's manufacturing per-hour index (different composition, separate base series).
- `observation_status=provisional` for every row (ONS revises).

---

## Artefact 3 — Notion plan

Matured at [05 · Productivity & Economic Growth](https://app.notion.com/p/414654717685811a9435e45ebfe64a3b): central question, pins, ownership (including the `business-investment` recommendation), manufacturing link list, revision Notes requirements, flagship **What Britain produces**, planned signature instrument, gap list, tech requirements, implementation checklist. Domain 09 page carries a one-line pointer to the same ownership recommendation.

### 3.1 `business-investment` ownership — recommendation

- **Primary home: Domain 09 (Trade, Investment & Business).** Domain 05 **Follows** it (link, never re-ingest, never list in 05's pins).
- Why: overlap matrix recommendation #2; Control Page board already lists `business-investment` only on 09; investment is the headline for 09's flagship (*Investment & trade*), whereas 05 answers output/productivity. One catalogue owner avoids a double claim.
- Pipeline unchanged: `src/economy/connectors/business_investment.py` → `data/economy/business-investment/` (Economy owns the pipeline either way; the question is only which domain page owns the story).
- **Needs Orchestrator lock at G1** — this handover recommends; it does not decide.
- 05 may show NPEL as a contextual overlay inside "What Britain produces" via Follow.

---

## Artefact 4 — Handover (files, links, gaps, views)

### 4.1 Files

| Path | What |
|---|---|
| `src/economy/connectors/real_gdp.py` | ABMI connector (own module; base-year text corrected, related ids added) |
| `src/economy/connectors/real_gdp_per_head.py`, `labour_productivity.py`, `business_investment.py` | thin wrappers over `OnsTimeseriesConnector` |
| `src/economy/connectors/labour_prices_series.py` | IHXW + LZVB specs (de-dup + revision notes) |
| `src/economy/connectors/fiscal_series.py` | NPEL spec (vintage note) |
| `data/economy/{real-gdp,real-gdp-per-head,labour-productivity,business-investment}/manifest.yaml` | regenerated manifests (evidence unchanged) |
| `data/economy/<id>/curated/observations.csv` | untouched (286 / 322 / 221 / 118 rows) |
| `data/economy/real-gdp/README.md`, `data/economy/business-investment/README.md` | READMEs (BI README status wording corrected) |
| `docs/handover-economy-05-growth.md` | this file |

### 4.2 Manufacturing link list (Energy-owned — **link only, never fork**)

| Canonical id | Series | Freq | Use in Domain 05 |
|---|---|---|---|
| `manufacturing-output-index` | K22A | monthly | Industrial output context beside whole-economy GDP |
| `manufacturing-output-per-hour` | DJK6 | quarterly (2023=100) | Compare with `labour-productivity` growth (rates, not levels) |
| `manufacturing-output-per-job` | DJ4P | quarterly (2023=100) | Per-job alternative |
| `manufacturing-productivity-hours` | DK3V | quarterly (2023=100) | Hours-based component |
| `manufacturing-share-of-gva` | L4NT | annual | "What share of output is manufacturing" |
| `manufacturing-employment` | JWR7 | quarterly | Domain 03's link; mention only |
| `bres-manufacturing-employee-jobs-by-region` / `bres-manufacturing-jobs-by-division-region` | BRES | annual | Regional industrial geography — Domain 03 / Regions; 05 does not use |

Paths: `data/energy/<id>/`. Energy surface: `/energy?domain=industrial-work`. Nothing under `data/economy/` duplicates these.

### 4.3 Gap list

| Gap | Severity | Plan |
|---|---|---|
| Regional GDP / GVA | Deferred | Prefer Regions sector; do not invent |
| Hours worked / jobs components (LZVB decomposition) | Medium | Optional ONS PRDY series (hours, jobs) if G3 needs a hours-vs-output bridge |
| GDP by industry (GVA by section) | Medium | Would be new Economy rows; not started |
| Annual ABMI aggregates | Low | Open question from `real-gdp` manifest |
| Expenditure components (consumption, investment, trade) | Medium | `business-investment` only; trade → Domain 09 |
| Vintage history (revision triangle) | High for "revision Notes" instrument | Not ingested; requires dated raw pins per release (storage already supports `raw/<date>/`) |
| Nominal GDP / GDP per capita current prices | Low | IHXT noted in caveats; not needed |

### 4.4 Recommended G3 views (requirements only — no UI built)

1. **What Britain produces (flagship)** — GDP level (rebased index to a chosen quarter) + per head + productivity, paired, with a vintage/reference-year stamp.
2. **Growth ledger** — quarter-on-quarter and since-2019-Q4 growth (derived from pinned levels; derivation labelled), per head vs total.
3. **Productivity** — LZVB index with manufacturing per-hour (Energy) as a *linked* overlay on growth rates, not levels.
4. **Revision Notes panel** — plain-language explanation of PN2 → QNA → Blue Book, and the two-vintage table from §1.3.
5. **Data tab** — the four series with source line (publisher, CDID, period, release date, indicator id) per `docs/visual-identity.md`.
6. Planned-not-ready: regional GVA map, revision triangle.

Copy the Explorer shell (Housing / Generation); no parallel layout. Wait for the Review Gate visual contract.

### 4.5 Blockers / decisions

1. **Re-pin decision (needed before any Ready):** pinned PN2 vintage (reference year 2023) is superseded by QNA 2026-09-29 (reference year 2024). Recommendation: **wait for the 2026-11-12 ONS GDP first estimate** (Q3), then re-run the three PN2 connectors and re-validate; **re-pin LZVB after the 2026-11-17 productivity release**. Decide: keep PN2 landing as the single source (recommended — it carries the newest quarter; record `source_version` + reference year per pin) or move to QNA. Do not change the connector's source dataset without Orchestrator sign-off — dependents (`related_indicator_ids`, Connections) read these ids.
2. **`business-investment` primary home** — needs Orchestrator confirmation (§3.1).
3. **Validation** not yet scheduled on the re-pinned data; existing QA is for the superseded vintage.
4. Raw JSON is not on the laptop (Supabase Storage) — Validation must fetch from `bx-data-archive`.
5. Unrelated in-flight edits seen in `data/economy/nominal-earnings/` and `real-earnings/` manifests (Domain 02) — not touched by this pass.
