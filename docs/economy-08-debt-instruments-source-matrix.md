# Source matrix — Domain 08 Debt instruments (Anatomy · Ownership · Repayment)

**Date:** 2026-11-14  
**Owner:** Economy (G2 discovery) · Validation after pin · Orchestrator Review before G3  
**Kickoff:** [agent-kickoff-economy-08-debt-instruments.md](agent-kickoff-economy-08-debt-instruments.md)  
**Notion:** [08 · Public Debt](https://app.notion.com/p/414654717685811cb155f725cba481a3) §9  
**Status:** Discovery complete · **Orchestrator approved 2026-11-14** — Economy may pin (order below). No UI until Review after Validation.

## Locked distinction (read first)

| Label in product | What it is | Valuation | Official home |
|------------------|------------|-----------|---------------|
| **A. CG debt instruments** | Gilts, Treasury bills (debt-financing), NS&I retail stock | Usually **nominal / uplifted nominal** | DMO (+ NS&I / DMR) |
| **B. Who holds gilts** | Sectoral beneficial ownership of the **gilt** market | **Market value** (£mn) | **ONS**, republished in DMO Quarterly Review |
| **C. Official government gilt holdings** | CRND + DMO holdings by gilt | **Nominal** | DMO D4L |
| **D. Public-sector net debt** | National accounts stock ex public-sector banks | Face / national accounts | ONS PSF **HF6W** (already Ready) |

**A ≠ B ≠ C ≠ D.** Do not sum A to match HF6W. Do not treat B shares as explaining PSND. OBR notes face vs market value of gilts can diverge sharply ([OBR box](https://obr.uk/box/face-and-market-value-of-debt-securities-in-official-statistics/)).

---

## Licence & access

| Publisher | Licence | Notes |
|-----------|---------|-------|
| DMO | [Open Government Licence](https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/) via [DMO terms of use](https://www.dmo.gov.uk/terms-of-use/) (Crown copyright; logos excluded) | Export endpoints often sit behind **bot / Perfdrive** challenges — connectors may need a documented browser pin or session strategy |
| ONS | OGL v3.0 | Prefer timeseries / datasets over scraping DMO PDFs for ownership |
| BoE | Check each table; historical sector gilt holdings **discontinued** | Do not use discontinued BoE Table 15.3 as the live ownership pin |

---

## 1. Debt Anatomy — candidate sources

**Question:** What instruments make up central government marketable / retail liabilities?

### 1.1 Gilts in Issue (primary instrument table)

| Field | Value |
|-------|-------|
| Source | UK Debt Management Office |
| Report | **D1A** Gilts in Issue |
| Human URL | https://www.dmo.gov.uk/data/gilt-market/gilts-in-issue/ · https://www.dmo.gov.uk/data/pdfdatareport?reportCode=D1A |
| Machine URL | https://www.dmo.gov.uk/data/XmlDataReport?reportCode=D1A · ExportReport?reportCode=D1A |
| Format | HTML report + PDF/Excel/Word export + **XML** |
| Cadence | **UK working days** (non-working day → most recent working day) |
| History | Point-in-time snapshot of gilts currently in issue (not a long monthly archive in one file) |
| Valuation | **Nominal** amount in issue; index-linked also show **inflation-uplifted nominal** |
| Coverage | Conventional + index-linked gilts; ISIN, first issue, redemption/dividend dates |
| Exclusions | Not T-bills; not NS&I; not PSND |
| Licence | OGL (DMO terms) |
| Retrieval check | 2026-11-14 — page/docs confirmed; automated ExportReport returned Perfdrive **302** (pin method TBD) |

### 1.2 Debt portfolio composition (gilts + T-bills summary)

| Field | Value |
|-------|-------|
| Source | DMO **Quarterly Review** (portfolio overview tables) |
| Example | [Oct–Dec 2025 Quarterly Review](https://www.dmo.gov.uk/media/wysdetq0/oct-dec-2025.pdf) |
| Cadence | Quarterly (~6 weeks after quarter end); archive from 1998 |
| Valuation | **Uplifted nominal** (gross and **net**); separate **market value** tables |
| Coverage | Conventional gilts · index-linked gilts · Treasury bills **for debt management purposes** |
| Critical footnotes | **Net** = excludes gilts held by the DMO. T-bills for **cash management** excluded from QR stats from **June 2016**. Sukuk often excluded from portfolio totals (£500m issue noted). Green gilt amounts called out in footnotes. |
| Vs D1A | QR is the composition **summary**; D1A is the **line-by-line** gilt book |

### 1.3 Treasury bills outstanding / issuance

| Field | Value |
|-------|-------|
| Source | DMO data catalogue |
| Reports | **D2.2E** Treasury Bills Outstanding · **D2.2G** Issuance and Stock · related tender reports D2.2A/D2.2D |
| Hub | https://dmo.gov.uk/data/ |
| Cadence | Monthly (stock); tenders more frequent |
| Coverage honesty | Remit distinguishes **debt-financing** vs **cash-management** T-bills — product must label which stock is shown |
| Valuation | Usually face / outstanding stock (£) |

### 1.4 National Savings & Investments (retail)

| Field | Value |
|-------|-------|
| Source | HMT/DMO **Debt Management Report** + NS&I Annual Report & Accounts |
| Example | [Debt Management Report 2026-27](https://dmo.gov.uk/media/0uuiqi10/drmr2627.pdf) Annex C (product stock / net financing) |
| Cadence | Annual remit + in-year revisions; NS&I accounts summer |
| Coverage | Variable / fixed / index-linked product stock; Green Savings Bonds often **separate** from main net financing target |
| Honesty | DMR figures may be **forecast** until outturn; do not mix with D1A nominal gilts into one “total debt” |

### 1.5 Optional support (not primary Anatomy)

| Source | Use |
|--------|-----|
| DMO D9D Estimated Market Value of Gilts | Context for nominal vs market — not the Anatomy stock |
| DMO Annual Review | Narrative + financing arithmetic |

**Provisional package / indicators (Anatomy):**

| Provisional ID | Source | Notes |
|----------------|--------|-------|
| `dmo-gilts-in-issue` | D1A | Multi-row gilt book; series by ISIN / type |
| `dmo-debt-portfolio-composition` | Quarterly Review tables | Conventional / IL / T-bill uplifted nominal (gross & net) |
| `dmo-treasury-bills-outstanding` | D2.2E / D2.2G | Label debt-financing vs all |
| `nsi-product-stock` | DMR / NS&I accounts | Retail; forecast vs outturn flagged |

---

## 2. Who Owns the Debt? — candidate sources

**Question:** Who holds gilts, by published sector?

### 2.1 ONS sector gilt holdings via DMO Quarterly Review (**primary for G2**)

| Field | Value |
|-------|-------|
| Publisher of numbers | **Office for National Statistics** |
| Publication channel | DMO Quarterly Review — “Gilt and Treasury Bill Holdings” / Distribution of gilt holdings |
| Example table (Q3 2025, market values £mn) | Overseas 709,279 (33.4%) · Insurance & pension funds 449,107 (21.1%) · BoE APF 393,760 (18.5%) · Other financial + PNFC 356,371 (16.8%) · Monetary financial institutions 212,170 (10.0%) · Households & NPISH 2,950 (0.1%) · Local authorities & public corporations 995 (~0%) · **Total 2,124,632** — [Oct–Dec 2025 QR](https://www.dmo.gov.uk/media/wysdetq0/oct-dec-2025.pdf) |
| Valuation | **Market values** (explicit in QR) |
| Cadence | Quarterly (lags ONS; QR ~6 weeks after quarter) |
| Revisions | “These figures can be revised retrospectively” (ONS) |
| Sector labels | MFI excludes BoE; BoE shown as **Asset Purchase Facility**; category names have evolved (e.g. MFI replaced banks/building societies Jan 2011) |
| Hub page | https://www.dmo.gov.uk/data/gilt-market/ → Distribution of gilt holdings · https://dmo.gov.uk/publications/quarterly-reviews/ |

**G2 action before pin:** Locate the underlying **ONS time series / UKEA** CDIDs (BoE speeches cite UK Economic Accounts for market-value sector holdings) so the connector prefers ONS download over PDF scrape. Until CDIDs are locked, pin from QR tables is acceptable as an interim **with** ONS attribution.

### 2.2 BoE historical “holdings of British Government securities by sector”

| Field | Value |
|-------|-------|
| URL | https://www.bankofengland.co.uk/statistics/details/further-details-about-holdings-of-british-government-securities-by-sector-data |
| Status | **Discontinued March 2002** |
| Use | Historical context / methodology warnings only — **not** the live Who Owns instrument |
| Quality note (still relevant) | Estimates are “broad orders of magnitude”; nominee accounts impair household analysis |

### 2.3 DMO Government Holdings (D4L) — **separate label**

| Field | Value |
|-------|-------|
| Report | **D4L** |
| URL | https://www.dmo.gov.uk/data/gilt-market/government-holdings/ |
| Cadence | Month-end; published within ~10 working days of following month |
| Valuation | **Nominal** held by government |
| Coverage | Includes CRND and DMO; **excludes** local authorities, public corporations, and **Bank of England** |
| Product rule | Show as “Official / DMO & CRND holdings”, **not** as Who Owns the Debt |

### 2.4 Experimental / secondary (do not pin as Ready without Review)

| Source | Why caution |
|--------|-------------|
| ONS [G20 DGI II.7 securities tables](https://www.ons.gov.uk/economy/nationalaccounts/uksectoraccounts/datasets/g20datagapsinitiativedgirequirementii7securitiesdatatables) | Explicitly **experimental**; joint ONS/BoE; recent correction notices |
| Secondary web explainers | Out of scope as pins |

**Provisional indicators (Ownership):**

| Provisional ID | Source | Notes |
|----------------|--------|-------|
| `gilt-holdings-by-sector` | ONS via QR (then UKEA CDIDs) | Market value £mn by sector; quarterly |
| `dmo-government-holdings` | D4L | Official holdings only; separate stage/note (folder = id) |

---

## 3. Repayment Calendar — candidate sources

**Question:** When do gilts mature, and what amounts are due?

### 3.1 Future Redemptions (D8B) — **primary**

| Field | Value |
|-------|-------|
| Report | **D8B** Future Redemptions |
| URL | https://www.dmo.gov.uk/data/pdfdatareport?reportCode=D8B |
| Format | PDF / Excel / Word export |
| Grain | Financial year × conventional / index-linked / total (£ million) |
| Scope | Amount expected to redeem in **market hands** — DMO states figures are **net of government holdings** |
| Cadence | Living profile (updates as issuance changes) |
| Official footnotes (from DMO D8B notes) | (1) Profile changes with new / further issuance. (2) Will **not** tally with uplifted nominal in issue — only part of IL inflation uplift sits in redemptions; remainder in **CGNCR** in the redeeming year. (3) FY = 1 Apr–31 Mar |

### 3.2 Support

| Report | Role |
|--------|------|
| D1A redemption dates | Instrument-level maturity calendar (complements FY aggregates) |
| D1C Redemption Details of Redeemed Gilts | Retrospective since 1981 — history, not forward calendar |
| D9C Estimated IL redemption payments | Scenario calculator under inflation assumptions — **not** the official calendar |
| Debt Management Report redemption charts | Illustrative financing arithmetic — not a sales forecast |

**Provisional indicator:** `dmo-gilt-future-redemptions` (D8B).

---

## Accounting differences checklist (must appear in Notes)

1. **PSND (HF6W)** ≠ sum of DMO gilts + T-bills + NS&I.  
2. **Market-value ownership total** ≠ uplifted nominal gilt portfolio ≠ PSND.  
3. **D8B redemptions** ≠ gross uplifted nominal maturing (net of gov holdings; IL uplift split).  
4. **NMFX interest** is CG net interest payable — not “coupon × Anatomy stock”.  
5. **REC3** is CG cash ↔ Δ CG debt — unrelated to ownership shares.  
6. T-bill **cash-management** stock ≠ debt-financing T-bills in QR.

---

## Definition notes (visitor-facing intent)

### Debt Anatomy
Visitors see how **central government financing instruments** break down (conventional gilts, index-linked gilts, debt-management Treasury bills, NS&I). They must **not** infer that the chart equals “what Britain owes” on the Debt dial (PSND).

### Who Owns the Debt?
Visitors see **who holds gilts at market value**, by ONS sector. They must **not** infer face-value ownership of the whole public debt, or that overseas % is a share of HF6W.

### Repayment Calendar
Visitors see **scheduled gilt redemptions** (amounts the government must repay to the market by financial year). They must **not** treat the profile as fixed, or as a forecast of future gilt *sales*.

---

## Recommended G3 views (requirements only — no React in G2)

Under `/economy?domain=debt`, extend **What Britain Owes** (not a new shell):

| Stage / tab | Data | Chart intent |
|-------------|------|--------------|
| Anatomy | D1A aggregates + QR composition (+ T-bills, NS&I as separate panels) | Stacked or ranked composition; dual unit labels if showing nominal vs market |
| Ownership | `gilt-holdings-by-sector` | Rank / share over time; market-value badge |
| Repayment | D8B | FY bars conventional vs IL; note net of gov holdings |
| Dial (existing) | HF6W / HF6X | Unchanged — stock / %GDP |

Preserve Economy visual contract; Claude may elevate visuals after Ready cloud load.

---

## Connector risks (Economy)

1. DMO **ShieldSquare / Perfdrive** on ExportReport, XmlDataReport, and pdfdatareport — confirmed 2026-11-14 (captcha HTML). Plan: browser download + checksum, or parse from static `/media/*.pdf` where available.  
2. Ownership: prefer **ONS machine-readable** over PDF table scrape once CDIDs found.  
3. One **source → many indicators** where possible (e.g. QR PDF is a publication, not three connectors).  
4. Do not fork PSF HF6W connectors.

## Pin progress (2026-11-14)

| Item | Status |
|------|--------|
| Matrix review | **Approved** |
| `dmo-debt-portfolio-composition` raw QR PDF | **Pinned** |
| `dmo-gilts-in-issue` (D1A) | **Raw pinned** — browser Excel 14 Nov 2026 (as-of 13 Nov); SHA-256 in package |
| `dmo-gilt-future-redemptions` (D8B) | **Raw pinned** — browser Excel 14 Nov 2026 |
| `dmo-government-holdings` (D4L) | **Curated** — 777 obs (monthly Apr 2005–Oct 2026); Validation in flight |
| `gilt-holdings-by-sector` | **Curated** — 32 obs (Q4 2024–Q3 2025 market value); Validation in flight |
| `dmo-debt-portfolio-composition` | **Curated** — 48 obs from QR; Validation in flight |
| Curated observations / connectors | **Next** |
| ONS ownership CDIDs | Still open (QR tables available as interim) |
| UI | Forbidden until Review after Validation |

---

## Next gates

| Gate | Owner | Action |
|------|-------|--------|
| **Matrix review** | Orchestrator | **Approved 2026-11-14** — provisional IDs + pin order locked |
| **ONS CDID hunt** | Economy | Lock UKEA / sector holdings series for ownership |
| **Local pin** | Economy | After review — `data/economy/<id>/` |
| **Validation** | Validation | Spot vs QR / D1A / D8B same date |
| **G3** | Orchestrator | Only after cloud Ready |

**Pin order (proposed):** (1) D8B redemptions · (2) D1A gilts in issue · (3) QR portfolio composition · (4) ONS ownership · (5) T-bills · (6) NS&I · (7) D4L as satellite.
