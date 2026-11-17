# Kickoff — Economy Domain 04 · Household Finances & Living Standards

**Template:** [agent-kickoff-economy-domain.md](agent-kickoff-economy-domain.md)  
**Notion plan:** [04 · Household Finances & Living Standards](https://app.notion.com/p/4146547176858147ba12d76094388df9)  
**Control:** [Economy Sector Control](https://app.notion.com/p/414654717685811caf11f9bfb7b3ef83)  
**Overlap:** [economy-overlap-matrix.md](economy-overlap-matrix.md)  
**Wave:** C · **Owner:** Economy · **Paths:** `src/economy/`, `data/economy/`  
**Opened:** 2026-11-15 (expanded brief already on Notion; Wave C G2 opened by Orchestrator)  
**Scope note:** Domain **04 only** — not a sector-wide Economy conclusion.

**Question (locked for G2):** How much financial freedom do British households actually have after the costs of everyday life?

**Flagship (Notion-locked):** **The Household Ledger** — interactive household accounts instrument (income / spending / commitments / buffers). Signature initial data view: **Are We Better Off?** (real household disposable income + living standards). Supporting planned: Cost of Living · Financial Buffer · Weight of Debt.

## Non-negotiables

Follow the shared template. Extra for 04:

- **No frontend in this kickoff.** Dataset + Notion + handover only. Canvas `/economy?domain=household` waits on Validation Ready + Orchestrator G3 authorisation.
- **Link, do not fork:**
  - Housing Affordability / Ownership — housing burdens and property wealth
  - Domain 01 Inflation — CPI/CPIH / basket (context only)
  - Domain 02 Wages — employee pay ≠ household disposable resources
  - Domain 06 ETB `effects-of-taxes-and-benefits` — redistribution / tax burden (Tax owns); Domain 04 may **link** for income-group context
  - Energy Prices — domestic bills
  - Existing `mortgage-rate-2yr-fixed` — credit-conditions context only; **not** a debt-burden measure
- **Never** fabricate a complete household budget by joining incompatible surveys (LCF expenditure + national accounts savings ratio + HBAI income as if one household record).
- Declare aggregate vs per-head, households vs households+NPISH, BHC/AHC, equivalisation, UK vs GB, survey year vs calendar year.
- Park HBAI / living-standards ownership under 04 until People & Society starts (overlap matrix).

## Candidate inventory (existing pins)

| Indicator | Series | Path | Notes |
|-----------|--------|------|-------|
| `mortgage-rate-2yr-fixed` | IUMBV34 / BoE | `data/economy/mortgage-rate-2yr-fixed/` | Context for Weight of Debt only |
| `effects-of-taxes-and-benefits` | ONS ETB | `data/economy/effects-of-taxes-and-benefits/` | **Domain 06 owns** — link only |

## Five experiences (Notion — evidence readiness)

| Experience | Role | G2 / Phase expectation |
|------------|------|------------------------|
| **The Household Ledger** | Flagship accounts instrument | Phase 2 — need compatible income/expenditure tables; reconcile vs adjacent |
| **The Cost of Living** | Spending shares / essentials | Phase 3 — LCF / Family Spending; not CPI basket copy |
| **Britain's Financial Buffer** | Savings / resilience distributions | Phase 3 — WAS / survey; not national saving ratio alone |
| **The Weight of Debt** | Stocks, repayments, arrears | Phase 4 — BoE + FCA; mortgage rate ≠ burden |
| **Are We Better Off?** | RHDI / consumption / living standards | **Phase 1 — do first** |

## Phase 0 — G2 research contract (required)

1. Confirm boundaries vs Inflation, Wages, Housing Affordability/Ownership, Tax ETB, Energy Prices, future People.
2. Full source/indicator inventory for the ten investigative areas (Notion §1) with publisher, table/CDID, geography, units, household vs person vs aggregate, blockers.
3. Registry rows for every new indicator before ingest. Status → Ingesting → Validation (do not flip Ready).
4. Four handover artefacts → `docs/handover-economy-04-household.md`.
5. Mature Notion plan checkboxes / experience states (Wave C Inbox → evidence in progress).

## Phase 1 — Historical living standards (ingest now)

Source and package for Validation (prefer ONS timeseries JSON like Growth ABMI/IHXW):

| Proposed `indicator_id` | Candidate CDID / dataset | Role |
|-------------------------|--------------------------|------|
| `real-household-disposable-income` | **DG2R** / UKEA — RHDI £m CVM SA (households S.14) | Aggregate real resources |
| `real-household-disposable-income-per-head` | **CRXX** / UKEA — RHDI per head £ CVM SA | Per-person living standards |
| Companion if official + clean | Household final consumption (real) and/or household saving ratio — only if definitions are clear and Notes-honest | Are We Better Off? depth |

Checks:

- Reference year for CVM; SA vs NSA; S.14 vs S.14+S.15 (NPISH).
- Spot-check latest bulletin / UKEA release vs curated values.
- Provisional = latest period only (`mark_latest_months_provisional` / quarterly equivalent).
- Explicit Notes: national accounts “household” ≠ median household experience.

Optional Phase 1 stretch (if time; else gap-list): HBAI headline distribution pointer or ETB disposable-income link plan — **no fork** of Domain 06 ETB.

## Do not

- Build React / edit `web/src/brand/economy/**` canvases or invent Ledger UI.
- Re-ingest Housing affordability, Energy bills, Domain 01 CPI, Domain 02 AWE, or Domain 06 ETB under new Economy 04 IDs.
- Infer individual budgets from national averages.
- Mark Ready without Validation.
- Claim mortgage rate measures household debt burdens.
- Open Cost of Living / Buffer / Debt ingest as “done” without validated tables — inventory + planned-not-ready is enough for those in Phase 0.
