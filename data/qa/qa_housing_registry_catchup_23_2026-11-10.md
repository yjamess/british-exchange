# QA — Housing registry catch-up (23 series) · 2026-11-10

**Owner:** Validation  
**Scope:** Live Housing Explorer series that were QA-passed (or Postgres-validated) but missing from Notion, or stuck in Sourcing / Ingesting / Validation after Gate 2.  
**Verdict:** **PASS** — mark all 23 **Ready** with Last checked 2026-11-10.

## Why this batch

Housing Gate 2 instruments already use these packages. Notion lagged: nine domain series had no registry row; nine rows were still pre-Ready despite filed QA; five further EHS State-of-Repair packages had package QA but no registry page.

## The 23

### A — Missing registry rows (create as Ready)

| # | Series ID | Pin / prior QA | Result |
|---|-----------|----------------|--------|
| 1 | `vacant-dwellings` | England all-vacants 2025-10-06 = **754,264** (`qa_housing_stock_2026_11_04.md`) | PASS |
| 2 | `dwelling-stock-by-region` | England all-dwellings 2025-03-31 = **25,826,351** (Live Table 109; stock QA) | PASS |
| 3 | `dwelling-type` | England all-households Census Day = **23,436,085** (TS044; stock QA) | PASS |
| 4 | `housing-purchase-affordability` | England median-household FY 2023–24 = **7.89** (ONS table 4) | PASS |
| 5 | `rent-to-earnings-ratio` | England 2025 derived 1410×12÷39298 = **0.4306** | PASS |
| 6 | `uk-hpi-measures` | Manifest + UK HPI package; Prices UI live | PASS (package integrity) |
| 7 | `mortgage-approvals` | `qa_report_mortgage-approvals_2026-11-10.md` — Sep 2026 house-purchase **53,443** | PASS |
| 8 | `residential-mortgage-book` | `qa_report_residential-mortgage-book_2026-11-10.md` | PASS |
| 9 | `household-net-property-wealth` | `qa_report_household-net-property-wealth_2026-11-10.md` | PASS |

### B — Status catch-up (Sourcing / Ingesting / Validation → Ready)

| # | Series ID | Prior status | Pin / prior QA | Result |
|---|-----------|--------------|----------------|--------|
| 10 | `brownfield-land` | Ingesting | England site-count **32,353** (`qa_housing_brownfield_2026_11_04.md`) | PASS |
| 11 | `net-additions-by-authority` | Validation | England FY 2024–25 = **208,600**; Σ LAD codes = 208,600 | PASS |
| 12 | `ehs-decent-homes` | Sourcing | England 2024 all-tenures non-decent **15.3%** (`qa_housing_ehs_inside_home_2026_11_04.md`) | PASS |
| 13 | `ehs-category-1-hazards` | Sourcing | Inside-home QA PASS | PASS |
| 14 | `ehs-damp-surveyor` | Sourcing | Inside-home QA PASS | PASS |
| 15 | `ehs-energy-efficiency-bands` | Sourcing | Inside-home QA PASS | PASS |
| 16 | `ehs-heating` | Ingesting | Wave2 QA PASS (`qa_housing_quality_wave2_2026_11_04.md`) | PASS |
| 17 | `ehs-insulation` | Ingesting | Wave2 QA PASS | PASS |
| 18 | `ehs-energy-improvement` | Ingesting | Wave2 / Energy Anatomy pins (improvable-to-C) | PASS |

### C — Extra EHS with package QA, no Notion row

| # | Series ID | Prior QA | Result |
|---|-----------|----------|--------|
| 19 | `ehs-overcrowding` | Inside-home QA PASS | PASS |
| 20 | `ehs-under-occupation` | Inside-home QA PASS | PASS |
| 21 | `ehs-damp-mould-reported` | Inside-home QA PASS | PASS |
| 22 | `ehs-disrepair` | Wave2 QA PASS | PASS |
| 23 | `ehs-thermal-comfort` | Wave2 QA PASS | PASS |

## Method notes

- No curated files were rewritten. Spot checks re-read curated CSV or cite filed Validation reports.
- `net-additions-by-authority`: do not sum E10/E11 county aggregates with LAD rows; LAD-only sum matches England.
- `dwelling-stock-by-region`: use `tenure=all-dwellings`; do not sum tenure parts with the all-dwellings row.
- `rent-to-earnings-ratio` is derived (PIPR Sep rent × 12 ÷ AFF1 England median) — labelled as such in notes.
- Postgres-only packages (`mortgage-approvals`, `residential-mortgage-book`, `household-net-property-wealth`, `uk-hpi-measures`) rely on 2026-11-10 Validation reports / manifests; local curated CSV may be empty by design.

## Notion action

- Create registry rows for set A + C → **Ready**, Last checked **2026-11-10**.
- Update set B pages → **Ready**, Last checked **2026-11-10**, Evidence → this report.

## Out of scope (not in the 23)

- `local-plan-status` — Validation sample of council plan pages still open (work-plan T17).
- `planning-appeals` — summary pack live; formal registry row deferred.
- Price Paid search — deferred (BX-BACK-001).
