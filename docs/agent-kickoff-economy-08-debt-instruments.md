# Kickoff — Economy Domain 08 · Debt instruments G2 (Anatomy · Ownership · Repayment)

**Notion plan:** [08 · Public Debt & Government Finances](https://app.notion.com/p/414654717685811cb155f725cba481a3) §9  
**Domain UI (later G3 only):** extensions under `/economy?domain=debt` — What Britain owes  
**Owner:** Economy (ingest) → Validation → Orchestrator (Review → G3 UI)  
**Date opened:** 2026-11-14  
**Workflow:** G2 evidence → Review → G3 (preserve Economy visual contract)  
**Status:** Source matrix **done** 2026-11-14 — [economy-08-debt-instruments-source-matrix.md](economy-08-debt-instruments-source-matrix.md). **No pin yet** (Orchestrator review → then Economy pin).

## Why this kickoff

Borrowing Machine evidence (REC3) is **closed as CG cash/debt only**. The next product priority is three evidence-led experiences under **What Britain Owes**, not a numeric public-sector stock-flow machine.

| Experience | Question |
|------------|----------|
| **Debt Anatomy** | What instruments make up central government marketable / retail liabilities? |
| **Who Owns the Debt?** | Who holds gilts, by published sector? |
| **Repayment Calendar** | When do gilts mature, and what amounts are due? |

## Non-negotiable scope labels

These are **not** interchangeable totals. Every Notes / source line must say which:

| Concept | Typical source | Valuation | ≠ |
|---------|----------------|-----------|---|
| **Public-sector net debt (PSND)** | ONS PSF HF6W | National accounts stock | Not “gilts in issue” |
| **Central government debt instruments** | DMO gilts / T-bills + NS&I | Usually **nominal** (IL gilts often show uplifted nominal) | Not PSND; not ownership shares |
| **Gilt holdings by sector** | ONS / DMO Quarterly Review; BoE sector tables | Often **market value** | Not face value stock; not PSND |
| **Official / government holdings of gilts** | DMO D4L | Nominal held by government | Not “who owns Britain’s debt” for the public |

Do **not** add instrument rows to equal HF6W, or ownership shares to explain PSND.

## Candidate official sources (discover first — verify before ingest)

### Debt Anatomy

| Candidate | URL / code | What it gives | Checks before pin |
|-----------|------------|---------------|-------------------|
| Gilts in Issue | [DMO D1A](https://www.dmo.gov.uk/data/pdfdatareport?reportCode=D1A) (+ XML) | Conventional vs index-linked; ISIN; redemption dates; nominal / uplifted nominal in issue | Working-day only; licence; history vs snapshot |
| Treasury bills outstanding / stock | DMO D2.2E, D2.2G ([DMO data](https://dmo.gov.uk/data/)) | T-bill stock and issuance | Debt-financing vs cash-management bills (DMO remit distinguishes) |
| NS&I product stock / net financing | HMT/DMO [Debt Management Report](https://dmo.gov.uk/) + NS&I annual accounts | Retail savings liabilities contribution | Forecast vs outturn; GSB vs main target |
| Portfolio overview | DMO Quarterly Review / Annual Review | Composition narrative + tables | Cite primary tables, not press rewrite |

### Who Owns the Debt?

| Candidate | URL / code | What it gives | Checks before pin |
|-----------|------------|---------------|-------------------|
| Sector gilt holdings (market value) | ONS figures as published in **DMO Quarterly Review** | Overseas, insurers & pensions, BoE, banks, other financial, households | Market ≠ nominal; revision; sample quality |
| Holdings of British Government securities by sector | [BoE further details](https://www.bankofengland.co.uk/statistics/details/further-details-about-holdings-of-british-government-securities-by-sector-data) + BoE database (e.g. DPAD015–027 annual; DPQD* quarterly) | Sector amounts outstanding | BoE warns estimates are broad orders of magnitude; nominee accounts |
| Government holdings of gilts | [DMO D4L](https://www.dmo.gov.uk/data/gilt-market/government-holdings/) | Official holdings by gilt | **Separate** experience label — not sector ownership |

Prefer ONS/DMO/BoE primary files over secondary explainers.

### Repayment Calendar

| Candidate | URL / code | What it gives | Checks before pin |
|-----------|------------|---------------|-------------------|
| Future Redemptions | DMO **D8B** | Maturity dates and amounts for gilts still in issue | Net of government holdings? document |
| Index-linked estimated redemption payments | DMO D9C | IL cash-flow estimates | Inflation uplift treatment |
| Redemption profile | Debt Management Report annex charts | FY redemption totals (illustrative financing) | Not a sales forecast; IL uplift split vs CGNCR |

## G2 deliverables (Economy)

1. **Source matrix** — [economy-08-debt-instruments-source-matrix.md](economy-08-debt-instruments-source-matrix.md) (**done** 2026-11-14).
2. **Definition notes** — in matrix (**done**).
3. **Indicator IDs (locked):** `dmo-gilt-future-redemptions` · `dmo-gilts-in-issue` · `gilt-holdings-by-sector` · `dmo-debt-portfolio-composition` · `dmo-government-holdings` (not `…-gilt-holdings`). Registry Inbox — **todo**.
4. **Local pin + curated** — **done** 2026-11-14 (browser pins). D8B+D1A Validation **pass**; ownership/D4L/composition Validation in flight.
5. **Handover** G3 view requirements — draft in matrix; build after Validation + cloud.
6. Notion §9 checklist — update after ownership Validation.

### Discovery headlines

- Ownership = **ONS market-value** via DMO Quarterly Review PDF parse (4 quarters until more QRs / ONS CDIDs).
- **D8B** net of gov holdings; starts **FY 2027-28** (omits rest of 2026-27 — caveat added).
- QR T-bills = debt-management only. Helpers: `dmo_common.py` (xls) + `dmo_pins.py` (checksum) — reconcile later.

## Validation (after pins)

- Spot-check totals vs the published DMO/ONS/BoE table for the same date.
- Confirm valuation (nominal vs market) matches UI copy requirements.
- Reject any UI claim that anatomy + ownership “explains” PSND.

## G3 (Orchestrator — after Review)

- Preserve Economy visual contract (`docs/economy-visual-contract.md`, `docs/visual-identity.md`).
- Extend What Britain Owes / Debt dial family — do not invent a parallel shell.
- Claude may own visual elevation; data must already be cloud-Ready.

## Explicitly deferred

- **Numeric public-sector Borrowing Machine** — needs an official PS borrowing→debt bridge (not REC3). See [decision memo](economy-08-borrowing-machine-decision-memo.md).
- **CG cash/debt REC3 as a Machine UI** — optional separately named instrument later; not this kickoff.
- **Fiscal Balance** — Domains 06/07.
- **Effective interest rate** (NMFX ÷ HF6W) — forbidden scopes mix.

## Related Ready pins (context only)

| Role | Indicator | CDID |
|------|-----------|------|
| PSND stock | `public-sector-net-debt` | HF6W |
| PSNB flow | `public-sector-net-borrowing` | DZLS |
| CG interest | `public-sector-debt-interest` | NMFX |
| Official % GDP | `public-sector-net-debt-percent-gdp` | HF6X |
| CG cash↔ΔCG debt evidence | `cg-cash-debt-reconciliation` | REC3 set |

## Do not

- Build frontend in G2.
- Equate gilt market value with PSND or with gilts-in-issue nominal.
- Use unofficial “who owns UK debt” blogs as the pin.
- Rewrite Energy / Housing paths or fork PSF connectors for DMO tables.
