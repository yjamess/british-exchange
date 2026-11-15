# Handover — Economy Domain 07 · Public Spending & Services (Wave B, Gate 2 Phase 0)

**Author:** Economy domain subagent · **Date:** 2026-11-14  
**Notion plan:** [07 · Public Spending & Services](https://app.notion.com/p/41465471768581df9c9ad184839231b7)  
**Kickoff:** [agent-kickoff-economy-07-spending.md](agent-kickoff-economy-07-spending.md)  
**Overlap matrix:** [economy-overlap-matrix.md](economy-overlap-matrix.md)  
**Work plan:** EC-G2-07  
**Scope:** datasets + Notion only. No frontend, no invented COFOG shares, no residual Tax−Spend=Borrow charts.

> **Status:** EBFT re-pin + inventories complete. **Validation-ready, not Ready.**  
> Do not mark Registry Ready or ship UI until independent Validation files a PASS under `data/qa/`.

**Locked question (provisional):** What does the state spend, and where does managed expenditure go?

**Flagship:** **What the state spends** — `total-managed-expenditure` (ONS EBFT / TME).

---

## Artefact 1 — Dataset foundation

### 1.1 Re-pin (2026-11-14)

| Field | Value |
|-------|--------|
| Indicator | `total-managed-expenditure` |
| CDID / dataset | **EBFT** / **PUSF** |
| Connector | `economy.connectors.total_managed_expenditure` (`fiscal_series.TOTAL_MANAGED_EXPENDITURE`) |
| Retrieved | 2026-11-14T22:39:57Z |
| Official release | **2026-10-20** (JSON `releaseDate`; ONS timeseries page also cites 21 Oct 2026 correction window; next PSF **20 Nov 2026**) |
| Raw path | `data/economy/total-managed-expenditure/raw/2026-11-14/ebft_pusf.json` |
| Raw sha256 | `2669443f7b262618fe67a0346c5b0c58fba700f1091fd234dfb9977a5268cfbc` |
| Curated sha256 | `7eea65f50b019359cd8054a03b489fc7fbaaee170619f4c6d86df8fcbb1b13e9` |
| Rows | **354** monthly · 1997-04-01 → 2026-09-01 · 0 missing · 0 dupes |
| Latest | **2026-09 = 123,791** (£m NSA) · status **provisional** |
| Prior month | 2026-08 = 116,488 · status **final** |
| Status fix | **353 final + 1 provisional** (was all-provisional on 2026-11-03 pin) |

Reproduce: `uv run python -m economy.connectors.total_managed_expenditure`

Checksum matches the 2026-11-03 pin — October PSF vintage unchanged. Re-pin refreshed `retrieved_at`, raw folder date, curated statuses, definition/caveats, README, and self-QA.

Spot values vs raw JSON: 1997-04 = 26,918; 2012-01 = 66,277; 2026-08 = 116,488; 2026-09 = 123,791.

### 1.2 Accounting note (non-negotiable)

| Topic | Statement |
|-------|-----------|
| **Concept** | **Total Managed Expenditure (TME)** — National Accounts aggregate of public-sector current expenditure plus public-sector gross investment (ONS title: *PS: Total managed expenditure: £m CPNSA*). |
| **Basis** | ONS Public Sector Finances (joint with HMT). Accruals / National Accounts framework — not cash departmental outturn and not OSCAR organisation lines. |
| **DEL / AME** | HMT budgeting presents **TME as DEL + AME** (plus accounting adjustments in PESA / Public Spending Statistics tables). DEL = multi-year departmental control totals; AME = demand-led / hard-to-limit spending (e.g. welfare, debt interest outside firm DEL). **This package stores the ONS monthly TME level only** — it does **not** ingest separate DEL or AME series. Sources: [How to understand public sector spending](https://www.gov.uk/government/publications/how-to-understand-public-sector-spending/how-to-understand-public-sector-spending); [PSS guidance (July 2026)](https://www.gov.uk/government/statistics/public-spending-statistics-release-july-2026/public-spending-statistics-guidance); [Consolidated budgeting guidance 2025-26](https://www.gov.uk/government/publications/consolidated-budgeting-guidance-2025-to-2026/consolidated-budgeting-guidance-2025-26). |
| **Units** | **£ million**, current prices, **NSA**. |
| **Geography** | United Kingdom `K02000001` (excl. Crown dependencies per manifest). |
| **Frequency** | Monthly period levels. Quarterly/annual aggregates exist in raw JSON but are **not** written to curated. |
| **FYTD** | Bulletins often quote financial-year-to-date sums. **This package stores calendar-month levels only.** Any FYTD or 12-month rolling sum is derived and must be labelled. |
| **Revisions** | PSF revises recent months each release (~20th of month). Latest valued month is `provisional`; older valued months `final`. Charts should drop provisional. |
| **≠ services** | **Do not** equate TME with “services people receive.” HMT’s **Total Expenditure on Services (TES)** / PESA function tables and ONS ESA Table 11 COFOG are the service / function frameworks — different from this EBFT pin. Label the gap. |
| **≠ residual identity** | Link Domain 06 (`tax-receipts` AHHY) and Domain 08 (DZLS / HF6W / NMFX) — **do not** chart tax − spending = borrowing as a closed identity. |

Sources: ONS [PSF methodological guide](https://www.ons.gov.uk/economy/governmentpublicsectorandtaxes/publicsectorfinance/methodologies/monthlystatisticsonthepublicsectorfinancesamethodologicalguide); ONS [EBFT timeseries](https://www.ons.gov.uk/economy/governmentpublicsectorandtaxes/publicsectorfinance/timeseries/ebft/pusf).

### 1.3 Package paths

| Artefact | Path |
|----------|------|
| Manifest | `data/economy/total-managed-expenditure/manifest.yaml` |
| Curated | `data/economy/total-managed-expenditure/curated/observations.csv` |
| Self-QA | `data/economy/total-managed-expenditure/validation_report.md` |
| README | `data/economy/total-managed-expenditure/README.md` |
| Spec | `src/economy/connectors/fiscal_series.py` (`TOTAL_MANAGED_EXPENDITURE`) |
| Connector | `src/economy/connectors/total_managed_expenditure.py` |
| Registry | https://app.notion.com/40d65471768581fdbd63d0fe45d94e87 |

Related (link only): `tax-receipts`, `public-sector-net-borrowing`, `public-sector-net-debt`, `public-sector-debt-interest`.

### 1.4 New indicators this Phase 0

**None ingested.** OSCAR / COFOG / DEL / AME / real-terms remain inventory only (see Artefact 2).

---

## Artefact 2 — Research scope

### 2.1 Questions answerable now (after Validation PASS)

1. How much did UK public-sector TME spend in each month since Apr 1997 (£m NSA)?
2. How has the level moved through crises, recoveries and recent years (absolute £, not real terms / % of GDP)?
3. How does EBFT relate conceptually to Domain 06 receipts and Domain 08 borrowing (related fiscal story — **not** a closed identity in this package)?

### 2.2 OSCAR / COFOG / function inventory (Phase 0 — **do not ingest** yet)

**Verdict:** Rich official sources exist for function-of-government and departmental drill-down, but none is a drop-in monthly stack that **sums to EBFT** without a documented method. Prefer inventory + future registry rows over speculative ingest or pie charts.

#### A. HMT OSCAR II (transparency / departmental MI)

| Candidate | Coverage | URL | Notes / reconcile to EBFT? |
|-----------|----------|-----|------------------------------|
| OSCAR II publishing collection | Quarterly in-year + annual outturn releases | [HMT OSCAR II collection](https://www.gov.uk/government/collections/hmt-oscar-publishing-from-the-database) | Last updated **22 Sep 2026**. Cross-gov reporting system replacing COINS. |
| OSCAR II in-year dataset (e.g. Sep 2026) | Monthly outturn by organisation; Control Budget = DEL / AME / Non-budget | Linked from collection (e.g. [Mar 2026 pub](https://www.gov.uk/government/publications/oscar-ii-publishing-data-from-the-database-march-2026)) | HMT guidance: **cannot exactly tie** OSCAR in-year aggregates to National Accounts / PSF central-government spending. Provisional; Security/Intelligence removed. Values in **£k**. |
| OSCAR annual release (e.g. Nov 2024) | FY outturn + in-year raw CSVs | [Nov 2024 annual](https://www.gov.uk/government/publications/oscar-annual-release-november-2024); [Understanding OSCAR 2024 PDF](https://assets.publishing.service.gov.uk/media/6745b085e7cf64050b8098b9/Understanding_OSCAR_Data_Release_2024.pdf) | Documents TME = DEL + AME conceptually; raw files need careful aggregation rules. Not backwards-compatible with COINS. |
| In-year guidance PDF | Method | [OSCAR in-year guidance](https://assets.publishing.service.gov.uk/media/694536ea2f0261139350893d/OSCAR_in-year_dataset_guidance.pdf) | Explicit: OSCAR feeds PSF/National Accounts **with additional sources** — exact reconcile impossible from OSCAR alone. |

#### B. HMT PESA / Public Spending Statistics (TES / function / COFOG-aligned)

| Candidate | Coverage | URL | Notes / reconcile to EBFT? |
|-----------|----------|-----|------------------------------|
| PESA collection | Annual Command Paper; FY series | [PESA collection](https://www.gov.uk/government/collections/public-expenditure-statistical-analyses-pesa) (PESA 2026 published **16 Jul 2026**) | Two frameworks: **budgeting** (DEL/AME) and **expenditure on services (TES)**. Function tables use UN COFOG level 1 (+ HMT “of which”). |
| PESA Ch.4–5 function tables | e.g. Table 4.2 public sector expenditure on services by function; Table 5.2 sub-function | Inside PESA PDFs / tables | **TES**, not monthly EBFT. Best candidate for “where spending goes” **if** labelled TES/COFOG and not sold as TME slices. |
| Public Spending Statistics (PSS) | Quarterly; department / function / economic category | [PSS collection](https://www.gov.uk/government/collections/national-statistics-release); [July 2026 guidance](https://www.gov.uk/government/statistics/public-spending-statistics-release-july-2026/public-spending-statistics-guidance) | Table 1.1 reconciles budgeting framework to TME. Real-terms tables use HMT GDP deflator — do not invent. |
| Introduction to TES | Method | [CRA 2025 — TES intro](https://www.gov.uk/government/publications/country-and-regional-analysis-2025-guidance/introduction-to-total-expenditure-on-services) | TES ≈ TME conceptually but built from budgets + LG/PC adjustments — **label gap** vs EBFT monthly. |

#### C. ONS ESA Table 11 (annual COFOG)

| Candidate | Coverage | URL | Notes / reconcile to EBFT? |
|-----------|----------|-----|------------------------------|
| General / central / local government annual expenditure (ESA Table 11) | Calendar years from 1995; latest cited **2023** (May 2025 vintage per ONS FOI) | ONS FOI summary: [Annual UK government spending](https://www.ons.gov.uk/aboutus/transparencyandgovernance/freedomofinformationfoi/annualukgovernmentspending); datasets named *ESA Table 11* on ONS | Official COFOG (10 functions). Annual calendar year — not monthly EBFT. Good for “function of government” experience **after** registry rows + method. |
| UN COFOG definitions | Classification | [UNSD COFOG](https://unstats.un.org/unsd/classifications/Econ) | Reference only. |

**Reconcile rule for later waves:** either (1) publish a **TES / COFOG** instrument labelled as such (PESA or ESA Table 11), **or** (2) document an official Table 1.1-style path from DEL+AME to TME. Never invent shares that sum to EBFT. Never present OSCAR organisation pies as TME composition.

### 2.3 Gap list for experiences

| Experience | Status | Evidence / sources (inventory) | Gap |
|------------|--------|--------------------------------|-----|
| **What the state spends** | **Scoped → Validation-ready** (EBFT pin) | This package | Independent Validation PASS; optional FYTD / 12m rolling labelled derived |
| **Where spending goes** | **Planned-not-ready** | PESA Ch.4–5 TES/COFOG; ONS ESA Table 11; OSCAR II (not as TME pie) | No ingest; need registry rows + method that does not fake EBFT shares |
| **DEL vs AME** | **Planned-not-ready** | PSS/PESA Table 1.1; OSCAR Control Budget codes; Consolidated budgeting guidance | No official monthly DEL/AME CDIDs pinned here; annual/quarterly HMT tables only for now |
| **Real terms** | **Planned-not-ready** | PESA/PSS real-terms tables (HMT GDP deflator); Exchange CPIH link only if method documented | Do not invent deflator; prefer official real series or leave empty |
| **Services narrative** | **Planned-not-ready** | TES intro + PESA function | Explicit labelled gap: TME ≠ services delivered |

### 2.4 Boundaries

- **Domain 06** (`tax-receipts` AHHY) and **Domain 08** (DZLS / HF6W / NMFX / HF6X): related fiscal story — link, do not invent residual identities.
- **Domain 08 interest (NMFX):** CG debt interest is an AME-family concept — link for narrative, do not merge into EBFT.
- **No frontend** until Wave B G3 after Validation.

---

## Artefact 3 — Notion plan status

Page: [07 · Public Spending & Services](https://app.notion.com/p/41465471768581df9c9ad184839231b7)

Updated this pass (2026-11-14):

- Status line → G2 Phase 0 **complete (Economy)**; awaiting Validation.
- Four handover artefact checkboxes → checked (pointing at this file).
- Phase 0 evidence-gate checkboxes → checked for EBFT re-pin, TME accounting note, OSCAR/COFOG inventory, gap list, four artefacts.
- Experience states matured (flagship Validation-ready; others planned-not-ready).
- Explicit note: **no Ready claim**; **no new registry rows** for OSCAR/COFOG/DEL/AME.

Kickoff + this handover are product authority for G2; G2 does not build UI.

---

## Artefact 4 — Handover paths + G3 view requirements (requirements only)

### 4.1 File list for Validation

1. `docs/handover-economy-07-spending.md` (this file)
2. `data/economy/total-managed-expenditure/manifest.yaml`
3. `data/economy/total-managed-expenditure/curated/observations.csv`
4. `data/economy/total-managed-expenditure/raw/2026-11-14/ebft_pusf.json` (local; `raw/` may be gitignored)
5. `data/economy/total-managed-expenditure/validation_report.md`
6. `data/economy/total-managed-expenditure/README.md`
7. `src/economy/connectors/total_managed_expenditure.py`
8. `src/economy/connectors/fiscal_series.py` (`TOTAL_MANAGED_EXPENDITURE`)
9. `docs/agent-kickoff-economy-07-spending.md`

### 4.2 Recommended G3 views (requirements only — **no code**)

1. **What the state spends (first)** — monthly EBFT line (or 12-month rolling sum labelled derived); Notes panel must state TME National Accounts concept, £m NSA, UK, period levels vs FYTD, DEL+AME as budgeting presentation not ingested here; drop provisional latest month on charts; empty state for function pie / real terms until official series registered.
2. **Where spending goes** — EmptyStage until TES/COFOG or documented method; if PESA function shown later, label **TES/COFOG**, never “TME by department” without footnotes.
3. **DEL vs AME** — EmptyStage / inventory until official control-total series pinned; do not invent residual from EBFT.
4. **Real terms / services narrative** — EmptyStages with source inventory from §2.3; services gap labelled.

### 4.3 Recommended next Validation task

**`EC-VAL-07` — Validate `total-managed-expenditure` (EBFT)**  
Checks: raw checksum ↔ manifest; curated vs JSON months; status = latest provisional only; copy never equates TME with departmental outturn or services without a labelled gap; confirm no invented COFOG shares or Tax−Spend=Borrow identity in package.

### 4.4 Blockers for Validation

- None for EBFT numerical self-consistency (Economy self-QA pass).
- Independent Validation must still run and file under `data/qa/`.
- Next PSF **20 Nov 2026** will revise recent months — Validation may want to wait or re-check after that release.
- OSCAR / COFOG / DEL / AME / real-terms are **out of scope** for this Validation task (inventory only).
