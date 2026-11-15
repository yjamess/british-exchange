# Source matrix — Economy Domain 06 · Anatomy of Revenue (reconcile discovery)

**Date:** 2026-11-15  
**Owner:** Economy (discovery only — **no component ingest this pass**)  
**Work plan:** `EC-G2-06B`  
**Kickoff:** [agent-kickoff-economy-06-anatomy.md](agent-kickoff-economy-06-anatomy.md)  
**Parent handover:** [handover-economy-06-tax.md](handover-economy-06-tax.md) §2.2  
**Flagship aggregate:** `tax-receipts` = ONS **AHHY** (PS taxes + NICs, £m NSA, accruals-aligned PSF)

## Question

Can tax-type composition honestly relate to a stated aggregate **without** mixing HMRC cash into ONS AHHY accruals?

## Reconcile verdict

**`path-found-ons-nab`**

Official **ONS Public Sector Finances Appendix D** (*Public sector current receipts*) publishes a National Accounts / accrued breakdown whose row **“Total public sector taxes and social contributions”** is CDID **AHHY**, and whose major heads sum to that total. Component CDIDs are in the same PUSF family as the flagship pin. HMRC cash remains a **separate** instrument family (PSA7D / HMRC bulletin) — never stacked under AHHY.

Ingest of components remains **gated** until Orchestrator opens a pin task; this pass does not create curated series.

---

## Official publications

| Source | URL | Release used | Licence | Role for Anatomy |
|--------|-----|--------------|---------|------------------|
| **Appendix D** — Public sector current receipts | https://www.ons.gov.uk/economy/governmentpublicsectorandtaxes/publicsectorfinance/datasets/appendixdpublicsectorcurrentreceipts/current | **21 Oct 2026** (next **20 Nov 2026**) | OGL v3.0 | **Primary reconcile map** — Time Series + Table sheets; accrued; CDIDs; AHHY total |
| Appendix D file | `/file?uri=…/publicsectorcurrentreceiptsappendixdfinal.xlsx` | same | OGL v3.0 | Workbook snapshot (discovery download 2026-11-15; not pinned under `data/economy/`) |
| **Appendix A** — PSA6D_* (NAB CG tax receipts) | https://www.ons.gov.uk/economy/governmentpublicsectorandtaxes/publicsectorfinance/datasets/publicsectorfinancesappendixatables110/current | 21 Oct 2026 | OGL v3.0 | Same NAB family as Appendix D cover note; longer history for CG heads (e.g. NMBY, NZGF) |
| Appendix A — **PSA7D** | same workbook | same | OGL v3.0 | **Cash** counterpart — HMRC-aligned cash, not AHHY composition |
| PUSF timeseries (AHHY + components) | https://www.ons.gov.uk/economy/governmentpublicsectorandtaxes/publicsectorfinance/datasets/publicsectorfinances/current | 2026-10-20 vintage | OGL v3.0 | Monthly `/data` JSON per CDID |
| PSF QMI (accruals vs HMRC cash) | https://www.ons.gov.uk/economy/governmentpublicsectorandtaxes/publicsectorfinance/methodologies/publicsectorfinancesandgovernmentdeficitanddebtunderthemaastrichttreatyqmi | — | OGL v3.0 | PSA6D = NAB; PSA7D = cash; Appendix D = major-tax income breakdown |
| HMRC receipts quality report | https://www.gov.uk/government/statistics/hmrc-receipts-quality-reports/quality-report-hm-revenue-and-customs-receipts | updated Aug 2026 | OGL v3.0 | Cash bulletin vs PSA6D/PSA7D; cash CDID list |
| HMRC monthly cash bulletin | https://www.gov.uk/government/statistics/hmrc-tax-and-nics-receipts-for-the-uk/hmrc-tax-receipts-and-national-insurance-contributions-for-the-uk-new-monthly-bulletin | 21 Oct 2026 | OGL v3.0 | Separate cash stack only |
| ESA National Tax List | https://www.ons.gov.uk/economy/governmentpublicsectorandtaxes/publicspending/datasets/esaquestionnairedetailedtaxandsocialcontributions/current | 22 Sep 2026 | OGL v3.0 | Fine-grained annual GG list — not the monthly AHHY stack |

Appendix D cover sheet (Oct 2026 file): data are **accrued**, consistent with PSA6A–PSA6K; **not** actual cash receipts. Cash for some taxes appears in **PSA7D**.

---

## Published identity (ONS NAB → AHHY)

From Appendix D **Table** sheet (September 2026 column), and the same values in **Time Series** for `2026 Sep`:

| CDID | Label (Appendix D) | Sep 2026 (£m) | Accounting | Under AHHY? |
|------|--------------------|---------------|------------|-------------|
| **MF6P** | Total central government taxes | 66,282 | Accruals / NAB | Yes — CG tax subtotal |
| **AIIH** | Social contributions (mainly NICs) | 17,414 | Accruals / NAB | Yes |
| **NMHM** | Council tax | 4,494 | Accruals / NAB | Yes — LG |
| **AHGR** | Other local government taxes | −63 | Accruals / NAB | Yes — LG residual |
| **AHHY** | Total public sector taxes and social contributions | **88,127** | Accruals / NAB | **Aggregate** |

**Identity (exact on Sep 2026 workbook):**

`MF6P + AIIH + NMHM + AHGR = AHHY`  
→ `66282 + 17414 + 4494 + (−63) = 88127`

**Not AHHY:** Appendix D row **JW2O** (*Public sector current receipts*) = 99,271 for Sep 2026 — includes interest/dividends (AHHZ), gross operating surplus (JW2K), other receipts (AHIO). Do not use JW2O as the Anatomy total when the flagship is AHHY.

### Useful CG subtotals (also on Appendix D / PUSF)

| CDID | Label | Sep 2026 (£m) | Notes |
|------|-------|---------------|-------|
| **NMBY** | Total CG taxes on production | 31,454 | Includes VAT, duties, business rates, etc. |
| **NMCU** | Total CG taxes on income and wealth | 32,087 | Includes income tax, CT, etc. |
| **LIQR** | Other CG taxes | 2,741 | Bank levy, IHT, TV licence, etc. |
| Check | NMBY + NMCU + LIQR | 66,282 | Equals **MF6P** |

---

## Candidate register (discovery — Inbox draft IDs only)

### A. Accruals / NAB — may appear under AHHY

| Draft indicator ID | CDID | Publisher | URL | Basis | Unit | Freq | Geo | Licence | Under AHHY? |
|--------------------|------|-----------|-----|-------|------|------|-----|---------|-------------|
| `tax-receipts` (existing) | AHHY | ONS | [timeseries](https://www.ons.gov.uk/economy/governmentpublicsectorandtaxes/publicsectorfinance/timeseries/ahhy/pusf) | Accruals / NAB | £m NSA | monthly | UK | OGL v3.0 | **Total** |
| `tax-receipts-cg-taxes` | MF6P | ONS | [timeseries](https://www.ons.gov.uk/economy/governmentpublicsectorandtaxes/publicsectorfinance/timeseries/mf6p/pusf) | Accruals / NAB | £m NSA | monthly | UK | OGL v3.0 | Yes — subtotal |
| `tax-receipts-social-contributions` | AIIH | ONS | [timeseries](https://www.ons.gov.uk/economy/governmentpublicsectorandtaxes/publicsectorfinance/timeseries/aiih/pusf) | Accruals / NAB | £m NSA | monthly | UK | OGL v3.0 | Yes |
| `tax-receipts-council-tax` | NMHM | ONS | [timeseries](https://www.ons.gov.uk/economy/governmentpublicsectorandtaxes/publicsectorfinance/timeseries/nmhm/pusf) | Accruals / NAB | £m NSA | monthly | UK | OGL v3.0 | Yes |
| `tax-receipts-other-lg-taxes` | AHGR | ONS | Appendix D Time Series (no live `/pusf/data` JSON — **404** on 2026-11-15) | Accruals / NAB | £m NSA | monthly | UK | OGL v3.0 | Yes — small; pin from workbook or residual |
| `tax-receipts-income-tax` | LIBR | ONS | [timeseries](https://www.ons.gov.uk/economy/governmentpublicsectorandtaxes/publicsectorfinance/timeseries/libr/pusf) | Accruals / NAB | £m NSA | monthly | UK | OGL v3.0 | Yes — under NMCU; ONS title includes CGT |
| `tax-receipts-vat` | NZGF | ONS | [timeseries](https://www.ons.gov.uk/economy/governmentpublicsectorandtaxes/publicsectorfinance/timeseries/nzgf/pusf) | Accruals / NAB | £m NSA | monthly | UK | OGL v3.0 | Yes — under NMBY |
| `tax-receipts-corporation-tax` | CPRN | ONS | [timeseries](https://www.ons.gov.uk/economy/governmentpublicsectorandtaxes/publicsectorfinance/timeseries/cprn/pusf) | Accruals / NAB | £m NSA | monthly | UK | OGL v3.0 | Yes — accrued CT gross of tax credits |
| `tax-receipts-cg-production-taxes` | NMBY | ONS | [timeseries](https://www.ons.gov.uk/economy/governmentpublicsectorandtaxes/publicsectorfinance/timeseries/nmby/pusf) | Accruals / NAB | £m NSA | monthly | UK | OGL v3.0 | Yes — CG production-tax subtotal |
| `tax-receipts-cg-income-wealth-taxes` | NMCU | ONS | [timeseries](https://www.ons.gov.uk/economy/governmentpublicsectorandtaxes/publicsectorfinance/timeseries/nmcu/pusf) | Accruals / NAB | £m NSA | monthly | UK | OGL v3.0 | Yes |
| `tax-receipts-other-cg-taxes` | LIQR | ONS | [timeseries](https://www.ons.gov.uk/economy/governmentpublicsectorandtaxes/publicsectorfinance/timeseries/liqr/pusf) | Accruals / NAB | £m NSA | monthly | UK | OGL v3.0 | Yes |

**Do not use as AHHY slices without mapping:**

| CDID | Why not |
|------|---------|
| **KSS8** | CG *income tax + NICs combined* — overlaps LIBR+AIIH; not an Appendix D Anatomy leaf |
| **JW2O** / ANBT-style totals | Broader current receipts (includes non-tax) |

### B. Cash — separate stack only (never under AHHY)

| Draft indicator ID | Code | Publisher | Source | Basis | Under AHHY? |
|--------------------|------|-----------|--------|-------|-------------|
| `hmrc-cash-receipts-total` | — | HMRC | [monthly bulletin](https://www.gov.uk/government/statistics/hmrc-tax-and-nics-receipts-for-the-uk/hmrc-tax-receipts-and-national-insurance-contributions-for-the-uk-new-monthly-bulletin) | **Cash** | **No** — own total |
| `hmrc-cash-income-tax` | RURC / BKMR / LISB | HMRC / PSF PSA7D | Quality report CDID list | Cash | No |
| `hmrc-cash-nics` | ABLP | HMRC | same | Cash | No |
| `hmrc-cash-vat` | EYOO | HMRC | same | Cash | No |
| `hmrc-cash-corporation-tax` | N445 | HMRC / PSA7D | same; PSA7D CT may include bank surcharge / DPT | Cash | No |

---

## Spot-checks (2026-11-15)

Fetched with User-Agent `BritishExchange-Economy/1.0`; ONS releaseDate on JSON = **2026-10-20**. Appendix D workbook published **21 Oct 2026**.

### 1. Flagship AHHY vs curated pin vs Appendix D

| Period | Live `/data` AHHY | Curated `tax-receipts` | Appendix D Time Series / Table |
|--------|-------------------|------------------------|--------------------------------|
| 2026-09 | 88,127 | 88,127 | 88,127 |
| 2026-08 | 88,626 | 88,626 | (Table YoY cols; TS present) |
| 2012-01 | 56,444 | 56,444 | — |
| 1997-04 | 21,096 | 21,096 | — |

### 2. Component timeseries vs Appendix D (2026-09)

| CDID | Live `/data` | Appendix D TS / Table | Match |
|------|--------------|----------------------|-------|
| NZGF (VAT) | 18,286 | 18,286 | Yes |
| CPRN (CT) | 8,865 | 8,865 | Yes |
| LIBR (IT+CGT) | 23,175 | 23,175 | Yes |
| AIIH (social contrib.) | 17,414 | 17,414 | Yes |
| MF6P (CG taxes) | 66,282 | 66,282 | Yes |
| NMHM (council tax) | 4,494 | 4,494 | Yes |
| NMBY / NMCU / LIQR | 31,454 / 32,087 / 2,741 | same | Yes |

### 3. Naive three-series sum does **not** equal AHHY

| Period | AHHY | KSS8+NZGF+CPRN | Residual | Share |
|--------|------|----------------|----------|-------|
| 2026-09 | 88,127 | 67,740 | 20,387 | 76.9% |
| 2026-08 | 88,626 | 68,662 | 19,964 | 77.5% |

**Lesson:** do not invent a residual from an incomplete CDID set. Use Appendix D’s published heads (or MF6P+AIIH+NMHM+AHGR).

### 4. HMRC cash (framework contrast only)

HMRC bulletin (21 Oct 2026): FYTD Apr–Sep 2026 cash tax+NICs = **£467.3bn**. That is a **cash FYTD** headline — not comparable to monthly AHHY period levels without labelling a separate cash instrument.

---

## Preferred first instrument (G3 recommendation)

**Keep EmptyStage until Orchestrator opens a pin task.** When opened, prefer:

1. **Package (recommended):** `tax-receipts-composition` (multi-series, `series=<CDID>` notes) sourced from **Appendix D Time Series** + matching PUSF `/data` JSON, with documented identity  
   `MF6P + AIIH + NMHM + AHGR = AHHY`  
   and optional drill-down leaves **LIBR · AIIH · NZGF · CPRN · NMHM · other (documented)**.
2. **Chart total:** always **AHHY** (already Ready) — never JW2O, never HMRC cash FYTD.
3. **Notes:** accruals / time-adjusted cash; AHGR may require workbook column until a public timeseries URL exists; drop provisional latest month.
4. **Do not** ship HMRC cash composition as the first Anatomy instrument if the stated aggregate is AHHY.

Alternative (if product wants cash storytelling): separate experience / Notes-labelled **HMRC cash stack** with own registry rows — **not** under AHHY.

---

## Blockers / follow-ups

| Item | Status |
|------|--------|
| Clean ONS NAB path to AHHY | **Found** (Appendix D) |
| Component ingest | **Gated** — Orchestrator pin task required |
| AHGR public timeseries JSON | **Missing** (404) — use Appendix D column or residual −(MF6P+AIIH+NMHM−AHHY) only if labelled from workbook |
| Registry Inbox rows for components | Not created this pass (kickoff) |
| Next PSF | **20 Nov 2026** — re-check identity after release |
| Mix HMRC cash into AHHY | **Forbidden** |

---

## Files referenced (discovery)

- This matrix: `docs/economy-06-anatomy-source-matrix.md`
- Handover addendum: `docs/handover-economy-06-anatomy.md`
- Existing pin: `data/economy/tax-receipts/` (AHHY only)
- Discovery downloads (ephemeral, `/tmp`, not committed): Appendix D + Appendix A xlsx; AHHY/KSS8/NZGF/CPRN JSON
