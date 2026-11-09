# Kickoff — Energy Domain 02 · Energy Consumption

**Notion brief:** [Energy Consumption](https://app.notion.com/p/410654717685812499c8ca3a99f1b9c2)  
**Sector:** [Energy & Industry](https://app.notion.com/p/40d6547176858194bc18cec7be0a812d)  
**Opened:** 2026-11-06  
**Orchestrator:** Domain 01 Generation complete → this domain next.

## Locked question

Who uses Britain's energy, for what purposes, where does it go, and how has this changed over time?

## Expressive language (brief)

Flows, networks, section cuts, accumulation and decomposition — **not** Generation’s fuel-mix stream and **not** Housing’s map-first composition. Same Housing explorer chrome (controls, Notes, stageTitle).

## Flagship

**The Energy Metabolism** — statistical energy balances (primary → conversion → final sectors → end uses → useful/rejected where published). Ribbons are balances, not physical pipes. ECUK useful/rejected is **statistics in development** — label as modelled.

## Secondary views (Gate 3+)

| View | Job |
|------|-----|
| Inside Britain's Energy Use | Cutaway → end-use charts (only where data exists) |
| The Changing Appetite | Long-run demand 1970– · absolute / share / index |
| The Energy Geography | Subnational final consumption 2005–2024 |
| The Useful Energy Experiment | Useful/rejected with explicit assumptions |

## Gate 1 — Evidence and visual language — **done** (2026-11-06)

Owner: **Energy** (+ Orchestrator for taxonomy / kickoff)

- [x] Pin ECUK 2026 Consumption · End use · Primary · Intensity · Whole energy flow + methodology PDF → `data/energy/energy-consumption-ecuk/raw/2026-11-06/`
- [x] Taxonomy + coverage breaks → `GATE1_TAXONOMY.md` (C1 sectors; U* short vs long; W1 from 1998; W2 modelled from 2017)
- [x] Three Metabolism expressions; **chosen for Gate 2:** linked stacked composition + restrained W1 strip (`GATE1_METABOLISM.md`)
- [x] Reuse `industrial-energy-consumption` (C1 Industry; same Consumption XLSX checksum)

## Gate 2 — First connected experience — **done** (2026-11-06)

Owner: **Energy** (ingest) → **Validation** → Orchestrator (explorer)

- [x] `final-energy-consumption-by-sector` (C1 all sectors) — Notion Ready
- [x] `primary-energy-flow-allocation` (W1; stats in development) — Notion Ready
- [x] Flagship UI: stacked sectors · fuels · W1 strip ≥1998 · URL state (`/energy?domain=consumption`)
- [x] Validation QA: `data/qa/qa_report_energy_consumption_c1_w1_2026-11-06.md` (15 pass / 1 warn)

## Gate 3 — Distinctive exploration — **in progress** (must finish before Domain 03)

Owner: **Orchestrator** (UI) + **Energy** (new pins)  
**Rule:** Close every Notion §3 gap before Prices or any later domain.

- [x] Useful/rejected modelled toggle on Metabolism (≥2017 W1 columns)
- [x] Follow domestic electricity → Generation (Journey 3 start)
- [x] Inside Britain's Energy Use — U3 charts (`view=end-use`) — cutaway illustration still open
- [x] Energy Geography — region ranks (`view=geography`) — LA / intensity still open
- [x] **The Changing Appetite** — Absolute / Share / Index + Then/Now (`view=appetite`)
- [x] **The Useful Energy Experiment** — own tab + Assumed Efficiencies drawer (`view=useful`; user scenarios deferred)
- [x] Geography depth — English-region choropleth + LA menu/top-20 (per-resident intensity still open)
- [x] End-use cutaway chips + terrace plate + U1 cross-sector (`end_scope=cross`) — purpose-drawn section plate still open
- [x] Follow journeys 1–4 with compatibility labels
- [x] Gate 4 gap audit — `data/qa/qa_energy_domain02_gate4_2026-11-06.md` (**Domain 03 blocked** until intensity + dedicated cutaway plate)

## Do not

- Assign generation fuel mix to a customer’s electricity use without a formal allocation method
- Treat useful/rejected as measured household/factory losses
- Stitch primary / final / useful from mismatched tables without reconciliation notes
- Touch `src/economy/` or rewrite Housing datasets
- Mark Ready without Validation

## Candidate sources (brief §6)

- [ECUK 2026](https://www.gov.uk/government/statistics/energy-consumption-in-the-uk-2026/energy-consumption-in-the-uk-ecuk-2026)
- [ECUK data catalogue](https://www.data.gov.uk/dataset/26afb14b-be9a-4722-916e-10655d0edc38/energy-consumption-in-the-uk)
- [Subnational final consumption 2005–2024](https://www.gov.uk/government/statistics/total-final-energy-consumption-at-regional-and-local-authority-level-2005-to-2024)
- DUKES 2026 for balances / primary–final definitions
