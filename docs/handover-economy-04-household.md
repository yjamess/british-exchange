# Handover — Economy Domain 04 · Household Finances & Living Standards

**Wave:** C · **Gate:** G2 (evidence + Notion only — no frontend) · **Owner:** Economy  
**Date:** 2026-11-15  
**Scope:** Domain **04 only** — not a sector-wide Economy close.  
**Notion plan:** [04 · Household Finances & Living Standards](https://app.notion.com/p/4146547176858147ba12d76094388df9)  
**Kickoff:** [agent-kickoff-economy-04-household.md](agent-kickoff-economy-04-household.md) · **Overlap:** [economy-overlap-matrix.md](economy-overlap-matrix.md)  
**Validation kickoff:** [agent-kickoff-validation-economy-04-rhdi.md](agent-kickoff-validation-economy-04-rhdi.md)

> **Status: Validation-ready for Phase 1 living-standards pins, not Ready.**  
> Economy does not flip registry Ready. No React / `web/` in this handoff.

**Locked question:** How much financial freedom do British households actually have after the costs of everyday life?

**Flagship (concept):** The Household Ledger — **planned-not-ready**.  
**Initial data view:** **Are We Better Off?** (RHDI + per head; saving-ratio companion).

---

## Artefact 1 — Dataset foundation

### 1.1 Ingested this pass (UKEA timeseries JSON)

All three series fetched live **2026-11-15** from ONS website `/timeseries/<cdid>/ukea/data`. Grain is **quarterly** (annual rows in raw JSON omitted), matching Domain 05 GDP connectors. Latest quarter only is `provisional`.

| `indicator_id` | CDID / dataset | Curated rows | Range | Latest (2026 Q2) | Raw SHA-256 | Registry |
|---|---|---|---|---|---|---|
| `real-household-disposable-income` | DG2R / UKEA | 286 | 1955 Q1 → 2026 Q2 | **457,927** £m CVM SA | `cd6c516e9009a2e51f2c5e1fe3fe5d375bd88487ed69a467adee88f3f9f64be9` | [row](https://app.notion.com/p/4196547176858177ba88d10198b5cdee) |
| `real-household-disposable-income-per-head` | CRXX / UKEA | 286 | 1955 Q1 → 2026 Q2 | **£6,577** CVM SA | `172d03bff5669c51b75881fb2a718bf7d110e302277ea59d95f1324219fd24b5` | [row](https://app.notion.com/p/41965471768581998f42e024b57683fa) |
| `household-saving-ratio` | DGD8 / UKEA | 254 | 1963 Q1 → 2026 Q2 | **8.8%** SA | `aa05f3a111fc2d8117ae4006809b83fde19d460b57131d3296ed015a886cd6ee` | [row](https://app.notion.com/p/419654717685813cba9cd97e70409fb3) |

JSON `description.releaseDate` is `2026-09-29T23:00:00.000Z` (manifest `official_release_date` **2026-09-29**). ONS landing pages show **30 September 2026**. Next UKEA listed **22 December 2026**. CVM **reference year 2024** is in the DG2R and CRXX series titles.

Spot vs ONS HTML tables (same vintage): DG2R 1955 Q1 = 78,185 and 2026 Q2 = 457,927; CRXX 1955 Q1 = 1,536 and 2026 Q2 = 6,577; DGD8 1963 Q1 = 4.7 and 2026 Q2 = 8.8. All match curated.

### 1.2 Units, geography, adjustment (explicit)

| Indicator | Geography | Population | SA? | Nominal/real | Unit / base |
|---|---|---|---|---|---|
| DG2R | UK `K02000001` | ESA **S.14 households** (not S.14+S.15) | SA | real (CVM) | £ million; ref year **2024** |
| CRXX | UK | Per head (mean) | SA | real (CVM) | £ per head; ref year **2024** |
| DGD8 | UK | ESA **S.14** | SA | current prices | % of household total resources |

- **S.14 vs NPISH:** DG2R and DGD8 titles state Households (S.14). Do not substitute NRJR / NRJS (S.14+S.15). CRXX title says “Households” without ESA code; treated as the DG2R companion (open question for Validation).
- **Provisional:** latest quarter only (`mark_latest_months_provisional`, months=1). Older quarters `final` in curated CSV (UKEA still revises history).
- **National accounts “household” ≠ median household experience.**

### 1.3 Connectors / reproduce

```bash
uv run python -m economy.connectors.real_household_disposable_income
uv run python -m economy.connectors.real_household_disposable_income_per_head
uv run python -m economy.connectors.household_saving_ratio
```

| Piece | Path |
|---|---|
| Specs | `src/economy/connectors/household_series.py` |
| Shared parser | `src/economy/connectors/ons_timeseries.py` (same as IHXW) |
| Packages | `data/economy/real-household-disposable-income/` · `…-per-head/` · `household-saving-ratio/` |
| Raw | `raw/2026-11-15/*.json` (git-ignored; restore from Storage / re-fetch) |
| Curated | `curated/observations.csv` (committed) |

### 1.4 Link-only (do not re-ingest)

| `indicator_id` | Owner | Use in Domain 04 |
|---|---|---|
| `mortgage-rate-2yr-fixed` | Economy / Housing consumes | Credit-conditions **context** for Weight of Debt — not a burden measure |
| `effects-of-taxes-and-benefits` | Domain **06** | Redistribution / income-group tax context — **Tax owns** |
| `cpi-inflation` · `cpih-inflation` · `cpi-index` · `cpih-index` | Domain **01** | Price-change context; not spending shares |
| `nominal-earnings` · `real-earnings` | Domain **02** | Employee pay ≠ household disposable resources |
| `housing-purchase-affordability` · Housing Affordability / Ownership series | Housing | Housing burdens and property wealth |
| `domestic-electricity-bills` · `domestic-gas-bills` | Energy Prices | Domestic bills |
| `real-gdp` · `real-gdp-per-head` | Domain **05** | Growth vs living standards overlay (do not splice levels) |

### 1.5 Validation-ready notes (no Ready claim)

Hand to Validation (`docs/agent-kickoff-validation-economy-04-rhdi.md`):

1. Independent recompute of all quarterly JSON values vs curated CSV.
2. Confirm CVM reference year **2024** from series title / UKEA notes.
3. Confirm S.14 vs NPISH labelling; CRXX ESA code.
4. Provisional = latest period only.
5. Manifest checksums, OGL, connector entrypoints.
6. Saving-ratio is a **companion**, not Financial Buffer.

Economy self-spot: three latest values match the ONS timeseries pages. Economy does not write `data/qa/`.

---

## Artefact 2 — Research scope

### 2.1 Questions this domain can answer now

1. How have **aggregate** real household resources (S.14 RHDI) moved since 1955, in chained volumes?
2. How have **per-head** real resources moved (CRXX)? Is the post-2019 path different from aggregate?
3. How does the **national-accounts saving ratio** (DGD8) move — including the 2020 spike — without claiming typical-household buffers?
4. How does RHDI-per-head differ in concept from GDP per head (IHXW) and from real earnings (A2FC)?

### 2.2 Coverage

UK only. Quarterly SA. DG2R/CRXX from 1955 Q1; DGD8 from 1963 Q1. Through **2026 Q2** at this vintage.

### 2.3 Boundaries (Phase 0)

| Adjacent | Domain 04 does | Domain 04 does not |
|---|---|---|
| Inflation (01) | Link CPI/CPIH as price context | Copy the basket or COICOP inflation charts |
| Wages (02) | Contrast pay vs household resources | Re-ingest AWE / ASHE |
| Employment (03) | — | Labour-market stocks/rates |
| Housing Affordability / Ownership | Follow housing-cost and property-wealth IDs | Fork affordability ratios or Price Paid |
| Energy bills | Follow `domestic-*-bills` | Re-derive unit prices |
| Tax ETB (06) | Link `effects-of-taxes-and-benefits` | Fork ETB under a 04 id |
| People & Society | Park **HBAI / poverty / deprivation** here until People starts | Claim People ownership or ingest HBAI as Ready |

### 2.4 Ten investigative areas — source inventory

Universe: **H** = household survey, **P** = person, **A** = national-accounts aggregate, **L** = lender/regulatory.

| Area | Candidate source | Table / CDID | Geo | Units | Grain | Blocker / status |
|---|---|---|---|---|---|---|
| Household income (macro) | ONS UKEA | **DG2R**, **CRXX** | UK | CVM £m / £ per head, SA | A | **Ingested** — Validation next |
| Household income (distribution) | DWP HBAI; ONS ETB | HBAI BHC/AHC; ETB quintiles | UK/GB | £, equivalised | H | HBAI **parked** (future People). ETB **link Domain 06** |
| Household expenditure | ONS LCF / Family Spending | COICOP tables by income/tenure | UK | £ and shares | H | **Planned-not-ready** — Ledger / Cost of Living |
| Essential costs | LCF + Housing + Energy bills | LCF housing/food/fuel/transport shares; link bills | UK/Eng | share of **defined** denominator | H + A | Must not invent categories; Housing/Energy **link** |
| Savings and resilience | ONS WAS | Liquid financial assets, distributions | GB | £, bands | H | **Planned-not-ready** — Buffer. DGD8 is **not** this |
| Household debt (stocks) | BoE Bankstats / MLAR | Consumer credit, secured lending outstanding | UK | £, stocks | L | **Planned-not-ready** — Weight of Debt |
| Servicing debt | BoE quoted rates; FCA / MLAR arrears | `mortgage-rate-2yr-fixed` (IUMBV34); arrears % | UK | % rate; arrears counts | L | Rate **linked**; repayments/arrears not ingested |
| Financial hardship | FRS / HBAI material deprivation; FSA food insecurity | Survey items | UK/GB | % of households | H | Park with People / supplementary — not Phase 1 |
| Living standards (macro) | UKEA RHDI; optional real HH consumption | DG2R, CRXX; consumption CDID not ingested | UK | CVM | A | Phase 1 **done** for RHDI. Real HH consumption left as gap (ABJQ/ABJR-class; confirm S.14 vs NPISH before ingest) |
| Financial buffers vs total wealth | WAS financial vs property vs pensions | WAS waves | GB | £, net | H | **Planned-not-ready**; Ownership keeps property wealth |
| Household inequality | HBAI / ETB / LCF breakdowns | quintile, tenure, HRP age | UK | various | H | Filters only when **one** table supports the joint cut |

**Hard rule:** never stitch LCF expenditure + DGD8 + HBAI into one “household budget”.

### 2.5 Experiences — evidence readiness

| Experience | Role | Evidence state |
|---|---|---|
| **The Household Ledger** | Flagship accounts instrument | **Planned-not-ready** — needs compatible income **and** expenditure tables; reconcile vs adjacent, else honest adjacent views |
| **The Cost of Living** | Spending shares / essentials | **Planned-not-ready** — LCF / Family Spending; not a CPI basket copy |
| **Britain's Financial Buffer** | Savings / resilience **distributions** | **Planned-not-ready** — WAS. DGD8 must not stand in |
| **The Weight of Debt** | Stocks, repayments, arrears | **Planned-not-ready** — BoE + FCA. `mortgage-rate-2yr-fixed` is context only |
| **Are We Better Off?** | RHDI / living standards | **Phase 1 ingested** — Validation before any canvas |

---

## Artefact 3 — Notion plan

Matured on the Domain 04 page (Wave C **evidence in progress**, G2, **no React**):

- Central question locked to the kickoff wording.
- Candidate pins now include DG2R, CRXX, DGD8 plus link-only mortgage rate and ETB.
- Five experiences labelled with evidence states above.
- Phase 0 inventory + Phase 1 RHDI checkboxes marked done; Phases 2–4 and Final QA remain open.
- Registry rows created **Ingesting → Validation** (never Ready).

Recommended G3 views (requirements only — not code):

1. **Are We Better Off?** — dual series DG2R (index or growth) and CRXX; vintage + ref-year stamp; Notes that this is S.14 mean, not median.
2. Optional overlay: DGD8 on a separate axis, labelled national-accounts residual.
3. Follow chips: Inflation, Wages, Housing Affordability, Energy bills, Tax ETB — **link ids**, no fork.
4. Ledger / Cost of Living / Buffer / Debt stay **planned-not-ready** until those tables exist.

---

## Artefact 4 — Handover (files, IDs, gaps, views)

### 4.1 Files

```txt
src/economy/connectors/household_series.py
src/economy/connectors/real_household_disposable_income.py
src/economy/connectors/real_household_disposable_income_per_head.py
src/economy/connectors/household_saving_ratio.py
src/economy/connectors/ons_timeseries.py          # reused
src/economy/connectors/__init__.py                # Domain 04 comment
data/economy/real-household-disposable-income/{manifest.yaml,README.md,source_register.csv,curated/observations.csv,raw/2026-11-15/dg2r_ukea.json}
data/economy/real-household-disposable-income-per-head/{… crxx_ukea.json}
data/economy/household-saving-ratio/{… dgd8_ukea.json}
data/economy/mortgage-rate-2yr-fixed/             # link only
data/economy/effects-of-taxes-and-benefits/       # Domain 06 — link only
docs/handover-economy-04-household.md             # this file
```

### 4.2 Dimensions available

Single UK series each. Notes: `series=<CDID>; dataset=UKEA; quarter=Qn; quarterly`. No income-group / tenure / age dimensions on these national-accounts pins.

### 4.3 Blocked / deferred

| Item | Why |
|---|---|
| Household Ledger | No compatible reconciled income+expenditure pack |
| Cost of Living | LCF Family Spending not ingested |
| Financial Buffer | WAS not ingested; DGD8 is the wrong object |
| Weight of Debt | No stocks/repayments/arrears pack; mortgage rate ≠ burden |
| HBAI | Parked under 04 until People; not Phase 1 |
| Real household consumption | Optional; CDID/S.14 not pinned this pass |
| Ready / G3 canvas | Wait Validation + Orchestrator |

### 4.4 Validation-ready series list

1. `real-household-disposable-income` (DG2R)
2. `real-household-disposable-income-per-head` (CRXX)
3. `household-saving-ratio` (DGD8) — companion; Notes-honest

Do **not** put `mortgage-rate-2yr-fixed` or `effects-of-taxes-and-benefits` on this Validation ticket as Domain 04 living-standards pins.
