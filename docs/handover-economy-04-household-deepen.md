# Handover — Economy Domain 04 deepen · Cost · Ledger · Buffer · Debt

**Wave:** C deepen · **Gate:** G2 (evidence + Notion only — no frontend) · **Owner:** Economy  
**Date:** 2026-11-15  
**Parent:** [handover-economy-04-household.md](handover-economy-04-household.md)  
**Kickoff:** [agent-kickoff-economy-04-deepen.md](agent-kickoff-economy-04-deepen.md)

> **Status: Validation-ready for LCF Cost/Ledger, WAS Buffer, and BoE Weight of Debt pins — not Ready.**  
> Packages stay separate. LCF ≠ WAS ≠ BoE stocks ≠ ETB.

---

## Buffer — Britain's Financial Buffer (WAS)

### Package

| Field | Value |
|-------|--------|
| `indicator_id` | `household-financial-wealth` |
| Registry | [Household financial wealth](https://app.notion.com/p/41965471768581cd858ccf56a04a719e) — **Validation** |
| Connector | `uv run python -m economy.connectors.household_financial_wealth` |
| Paths | `src/economy/connectors/household_financial_wealth.py` · `data/economy/household-financial-wealth/` |
| Publisher | ONS Wealth and Assets Survey |
| Edition | July 2006–June 2016 and April 2014–March 2022, released **24 January 2025** |
| Raw | `raw/2026-11-15/financialwealthtables.xlsx` |
| SHA-256 | `7afee4fac3e3b3b0d1c970678bc10cd7e2711a774a13e4d2665c1b513c85013c` |
| Geography | Great Britain `K03000001` — **not UK** |
| Grain | Survey rounds (ad hoc). Do not splice the July and April round systems. |
| Curated rows | **447** (5.1: 27 · 5.10: 72 · 5.11: 90 · 5.12: 27 · 5.13: 231) |

Tables curated (published cells only):

| Table | Content |
|-------|---------|
| 5.1 | % of households with formal financial assets (any formal incl. current in credit; savings accounts; ISAs) |
| 5.10 | Net financial wealth p25 / median / p75 and coverage, all households and households with assets or liabilities |
| 5.11 | Share of households in published net-wealth bands |
| 5.12 | Aggregate gross / liabilities / net £ billion (companion stock, not the Buffer) |
| 5.13 | Net financial wealth p25 / median / p75 by equivalised income decile |

### Round 8 spots (Apr 2020–Mar 2022 vs workbook)

| Measure | Value |
|---------|-------|
| Median net financial wealth, all households | **£10,400** |
| p25 / p75, all households | £300 / £58,000 |
| Any formal financial asset (incl. current accounts in credit) | **98%** |
| Share with net financial wealth £100,000 or more | **17%** |
| Aggregate net financial wealth | **£1,915 billion** |

Round 8 rows carry `accreditation=suspended`.

### Mandatory Notes

- WAS accreditation **suspended from Round 8** (ONS notice, 13 June 2025).
- GB, not UK. Nominal £ — not CPIH-deflated bulletin figures.
- **DGD8** `household-saving-ratio` is a national-accounts residual, **not** this measure.
- Link Housing `household-net-property-wealth` — never re-ingest property under `economy/`.
- Round 8 weights were recalibrated for tenure during COVID telephone fieldwork.

### Validation checks (no Ready)

1. Recompute curated cells vs pinned `financialwealthtables.xlsx` (Tables 5.1, 5.10–5.13).
2. Confirm Round 8 median £10,400 and 98% any-formal coverage.
3. Confirm GB geography and accreditation caveat on Round 8 notes.
4. Confirm DGD8 is not used as a Buffer proxy.
5. Manifest checksum `7afee4…5013c`.

---

## Debt — Weight of Debt (BoE stocks)

### Package

| Field | Value |
|-------|--------|
| `indicator_id` | `consumer-credit-outstanding` |
| Registry | [Consumer credit outstanding](https://app.notion.com/p/41965471768581ac9b18dd18aa199030) — **Validation** |
| Connector | `uv run python -m economy.connectors.consumer_credit_outstanding` |
| Paths | `src/economy/connectors/consumer_credit_outstanding.py` · `data/economy/consumer-credit-outstanding/` |
| Publisher | Bank of England Money and Credit / Bankstats A5.6 |
| CDIDs | **LPMBI2O** total (required); **LPMVZRJ** credit cards; **LPMB4TS** other |
| Raw | `raw/2026-11-15/lpmbi2o_lpmvzrj_lpmb4ts.csv` |
| SHA-256 | `ab8c026ad4caca0c158655d82a0b49a25425643dccc3d5784702df85d78545da` |
| Vintage | **29 October 2026** (September 2026 data) |
| Geography | United Kingdom `K02000001` |
| Grain | Monthly SA £ million; latest month `provisional` |
| Curated rows | **1,208** (total 402 from Apr 1993; cards/other 403 from Mar 1993) |

IADB pattern matches `mortgage_rate_2yr_fixed.py` (`CSVF=TN`, `UsingCodes=Y`).

### September 2026 spots (self-QA; cards + other = total)

| Series | CDID | £ million SA |
|--------|------|----------------|
| Total excl. SLC | LPMBI2O | **261,200** |
| Credit cards | LPMVZRJ | 83,708 |
| Other | LPMB4TS | 177,492 |

### Link only — do not re-ingest

| `indicator_id` | Owner | Role |
|----------------|-------|------|
| `mortgage-rate-2yr-fixed` | Economy (existing) | Quoted 2-year fixed 75% LTV rate — **not** a burden |
| `residential-mortgage-book` | Housing | MLAR outstanding stock, purpose/LTV, **arrears** |
| `household-net-property-wealth` | Housing | Property wealth — Buffer companion, not debt |

### What reconciles vs adjacent

- LPMBI2O = LPMVZRJ + LPMB4TS on this vintage (checked Sep 2026).
- BoE consumer credit **does not** add to Housing MLAR. Different reporters, SA vs NSA, unsecured vs residential mortgages.
- WAS Table 5.7 (survey non-mortgage borrowing) is **not** the same object as LPMBI2O.

### Validation checks (no Ready)

1. Independent IADB re-fetch of LPMBI2O / LPMVZRJ / LPMB4TS vs curated CSV.
2. Confirm Sep 2026 total 261,200 and identity cards+other=total.
3. Confirm excl. SLC in series title; SA; latest month provisional.
4. Confirm Housing MLAR and IUMBV34 are link-only.

---

## Gap list (Blocked / deferred this pass)

| Item | Why |
|------|-----|
| BoE secured-on-dwellings outstanding **LPMVTXK** (A5.2 SA) | Clean CDID exists. **Not ingested** so Economy does not fork Housing `residential-mortgage-book`. Documented in source register. |
| FCA / MLAR arrears as an Economy id | Housing MLAR already includes arrears. Separate FCA open table not pinned this pass — **Blocked**; **link** `residential-mortgage-book`. |
| WAS Table 5.7 / 5.8 survey borrowing and arrears | Survey ≠ lender stocks. Left uningested to avoid a fake reconciled debt ledger. |
| LCF “essentials” share | Not derived. Use published Table 3.2E5 shares only; no custom basket. |
| Reconciled Household Ledger | **Blocked** — LCF expenditure and ETB income/tax are adjacent views only. |
| Ready / G3 canvas | Wait Validation + Orchestrator. No `web/`. |

---

## Validation-ready ids (this pass)

1. `family-spending-by-category`
2. `family-spending-by-income`
3. `household-financial-wealth`
4. `consumer-credit-outstanding`

Do **not** put `household-net-property-wealth`, `residential-mortgage-book`, `mortgage-rate-2yr-fixed`, or `effects-of-taxes-and-benefits` on this Domain 04 deepen Validation ticket as new Economy pins.

---

## Cost of Living / Household Ledger (LCF Family Spending FYE 2025)

**Released 11 June 2026.** Pin date 2026-11-15. Economy does not flip Ready.

### Equivalisation (document for UI + Validation)

From FYE 2025, ONS ranks households with the **modified OECD** scale on a **two-adult reference** household. That replaces the previous one-adult reference. Tables 3.1E5 / 3.2E5 publish both methods side by side; this pin uses the **left-hand 2-adult** block only.

Workbook 2 (named “expenditure by income”) has **no** all-households equivalised quintile table. Those cells are Workbook 1 Tables **3.1E5** (weekly £) and **3.2E5** (percent of total). Workbook 2 is still pinned on the income package (landing + inventory). WB2 3.3E / 3.7E are 1-adult / 2-adult **non-retired** subsets — not this series.

Housing (net), fuel and power **excludes** mortgage interest, Council Tax and Northern Ireland rates (those sit in “other expenditure items”).

### Packages

| Field | `family-spending-by-category` | `family-spending-by-income` |
|-------|-------------------------------|-----------------------------|
| Registry | [Family spending by category](https://app.notion.com/p/41965471768581afbe16d4cdb396d7de) — **Validation** | [Family spending by income](https://app.notion.com/p/41965471768581c39c5cf435f88e080a) — **Validation** |
| Connector | `uv run python -m economy.connectors.family_spending_by_category` | `uv run python -m economy.connectors.family_spending_by_income` |
| Paths | `src/economy/connectors/family_spending_by_category.py` · `data/economy/family-spending-by-category/` | `src/economy/connectors/family_spending_by_income.py` · `data/economy/family-spending-by-income/` |
| Shared helpers | `family_spending_common.py` | same |
| Table used | Workbook 1 **Table 4.1** (real £/week, FYE 2025 prices) | Workbook 1 **3.1E5** + **3.2E5** (2-adult OECD, left block) |
| Curated rows | **390** (15 headline series × 26 year columns) | **180** (90 weekly £ + 90 published shares) |
| Geography | UK `K02000001` · LCF private households | same |
| Grain | Annual; financial years except calendar 2006–2014 (two 2006 weighting versions) | FYE 2025 only (2024-04-01 → 2025-03-31) |

Raw pins:

| File | SHA-256 |
|------|---------|
| `workbook1detailedexpenditureandtrends.xlsx` | `af8d4a4464c0cc0a49195495a6e665667234379ac08293037a69e065d8931076` |
| `workbook2expenditurebyincome.xlsx` (income package only) | `2c5d57c9b1afb97533105a83fbc0b92627154ccf62a8ef15fb483e1cb8aa2978` |

### Spots vs ONS bulletin (FYE 2025, all households)

| Measure | Value |
|---------|-------|
| Total weekly expenditure | **£676.60** (Table 4.1 stores 676.6) |
| Housing (net), fuel & power | **£118.40** (18% of total in bulletin / 17.5% in 3.2E5 all) |
| Transport | **£96.40** |
| Food & non-alcoholic drinks | **£73.70** (10.9% of total) |
| Lowest equivalised quintile total | **£407.30** |
| Highest equivalised quintile total | **£1,083.60** (2.7× lowest) |
| Lowest quintile food share | **15.2%** of that group’s total |
| Lowest quintile housing (net) share | **25.7%** |

Self-QA: category 9/0; income 13/0.

### Ledger Notes — adjacent, never reconciled

UI may show LCF expenditure composition **adjacent** to Domain 06 `effects-of-taxes-and-benefits`:

| Object | What it is | What it is not |
|--------|------------|----------------|
| `family-spending-by-category` | All-household LCF weekly £ by headline group (real history) | CPI basket; Energy bills; Housing affordability |
| `family-spending-by-income` | Same groups × equivalised quintile (FYE 2025 £ and published %) | A household budget; ETB quintile incomes/taxes |
| `effects-of-taxes-and-benefits` | Domain **06** — tax as % of published denominators, FYE **2024** | LCF spending; do not fork under a 04 id |
| DG2R / CRXX / DGD8 | National-accounts S.14 resources / saving residual | Survey expenditure |

Do **not** add LCF £/week to ETB £/year, or to UKEA RHDI / DGD8, as one ledger. Different surveys, financial years (LCF FYE 2025 vs ETB FYE 2024), and income concepts. Follow chips only.

### Validation checks (no Ready)

1. Recompute Table 4.1 headline 2024-25 and 2001-02 cells vs curated CSV.
2. Recompute Table 3.1E5 / 3.2E5 left-block quintile cells (total 407.30 / 1,083.60 / 676.60).
3. Confirm 2-adult OECD only — no 1-adult-reference right block in curated rows.
4. Confirm housing (net) footnote (mortgage interest / Council Tax not in group 4).
5. Manifest checksums above. OGL v3.0.

Economy does not write `data/qa/`.
