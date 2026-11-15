# Handover — Economy Domain 06 · Taxation & Revenue (Wave B, Gate 2 Phase 0)

**Author:** Economy domain subagent · **Date:** 2026-11-14  
**Notion plan:** [06 · Taxation & Revenue](https://app.notion.com/p/414654717685816bb414e87ccbd501fc)  
**Kickoff:** [agent-kickoff-economy-06-tax.md](agent-kickoff-economy-06-tax.md)  
**Overlap matrix:** [economy-overlap-matrix.md](economy-overlap-matrix.md)  
**Work plan:** EC-G2-06  
**Scope:** datasets + Notion only. No frontend, no Tax Machine calculations, no invented rate tables.

> **Status:** AHHY re-pin + inventories complete. **Validation-ready, not Ready.**  
> Do not mark Registry Ready or ship UI until independent Validation files a PASS under `data/qa/`.

**Locked question (provisional):** How does Britain raise public money, who contributes, and how has the tax system changed?

**Flagship:** **What Britain Raises** — `tax-receipts` (ONS AHHY, public-sector taxes + NICs).

---

## Artefact 1 — Dataset foundation

### 1.1 Re-pin (2026-11-14)

| Field | Value |
|-------|--------|
| Indicator | `tax-receipts` |
| CDID / dataset | **AHHY** / **PUSF** |
| Connector | `economy.connectors.tax_receipts` (`fiscal_series.TAX_RECEIPTS`) |
| Retrieved | 2026-11-14T21:50:41Z |
| Official release | **2026-10-20** (JSON `releaseDate`; next PSF **20 Nov 2026**) |
| Raw path | `data/economy/tax-receipts/raw/2026-11-14/ahhy_pusf.json` |
| Raw sha256 | `ea9d05903b6d5287484b95bd8c7d7eb5985d2e4b897d30070be6be3f65748ed1` |
| Curated sha256 | `27c387e42e3e8df2dc8fcc55c5f3ed05e4592a6dbc4f390b970da8652acafa48` |
| Rows | **354** monthly · 1997-04-01 → 2026-09-01 · 0 missing · 0 dupes |
| Latest | **2026-09 = 88,127** (£m NSA) · status **provisional** |
| Prior month | 2026-08 = 88,626 · status **final** |
| Status fix | **353 final + 1 provisional** (was all-provisional on 2026-11-03 pin) |

Reproduce: `uv run python -m economy.connectors.tax_receipts`

Checksum matches the 2026-11-03 pin — October PSF vintage unchanged. Re-pin refreshed `retrieved_at`, raw folder date, curated statuses, README, and self-QA.

Spot values vs raw JSON: 1997-04 = 21,096; 2012-01 = 56,444; 2026-09 = 88,127.

### 1.2 Accounting note (non-negotiable)

| Topic | Statement |
|-------|-----------|
| **Concept** | Total **public-sector taxes and National Insurance contributions** (ONS receipts table title). |
| **Basis** | **National Accounts / accruals-aligned** Public Sector Finances. Liabilities timed to when the taxable event arises (with forecast/time-adjustment for recent months), not when cash hits HMRC. |
| **Not** | HMRC monthly **cash** receipts; not ANBT (total current receipts, which includes non-tax income). |
| **Units** | **£ million**, current prices, **NSA**. |
| **Geography** | United Kingdom `K02000001` (excl. Crown dependencies per manifest). |
| **Frequency** | Monthly period levels. Quarterly/annual aggregates exist in raw JSON but are **not** written to curated. |
| **FYTD** | Bulletins often quote financial-year-to-date sums. **This package stores calendar-month levels only.** Any FYTD or 12-month rolling sum is derived and must be labelled. |
| **Revisions** | PSF revises recent months each release (~20th of month). Latest valued month is `provisional`; older valued months `final`. Charts should drop provisional. |
| **Tax/GDP** | **Do not** divide AHHY by chain-volume (or any ad-hoc) GDP. Official ratio series only, or leave as a gap. |
| **Components** | **Do not** add HMRC cash tax heads to AHHY and claim they reconcile. |

Sources for the accruals vs cash distinction: ONS [PSF methodological guide](https://www.ons.gov.uk/economy/governmentpublicsectorandtaxes/publicsectorfinance/methodologies/monthlystatisticsonthepublicsectorfinancesamethodologicalguide); HMRC [receipts quality report](https://www.gov.uk/government/statistics/hmrc-receipts-quality-reports/quality-report-hm-revenue-and-customs-receipts) (cash bulletin vs PSF National Accounts Basis / PSA6D vs cash PSA7D).

### 1.3 Package paths

| Artefact | Path |
|----------|------|
| Manifest | `data/economy/tax-receipts/manifest.yaml` |
| Curated | `data/economy/tax-receipts/curated/observations.csv` |
| Self-QA | `data/economy/tax-receipts/validation_report.md` |
| README | `data/economy/tax-receipts/README.md` |
| Spec | `src/economy/connectors/fiscal_series.py` (`TAX_RECEIPTS`) |
| Connector | `src/economy/connectors/tax_receipts.py` |
| Registry | https://app.notion.com/40d654717685811090b0dba9cfd17526 |

Related (link only): `public-sector-net-borrowing`, `public-sector-net-debt`, `public-sector-debt-interest`, `total-managed-expenditure`.

### 1.4 New indicators this Phase 0

**None ingested.** Breakdown / HMRC cash / rates / distribution / tax-gap remain inventory only (see Artefact 2).

---

## Artefact 2 — Research scope

### 2.1 Questions answerable now (after Validation PASS)

1. How much did UK public-sector taxes + NICs raise in each month since Apr 1997 (£m NSA)?
2. How has the level moved through crises, recoveries and recent years (absolute £, not % of GDP)?
3. How does AHHY relate conceptually to Domain 07 TME and Domain 08 borrowing (related flows — **not** a closed identity in this package)?

### 2.2 Breakdown inventory (Phase 0 — **do not ingest** yet)

**Verdict:** No clean official path found that lets arbitrary tax-type series **sum to AHHY** without mixing frameworks. Prefer inventory + future registry rows over speculative ingest.

#### A. ONS PUSF / National Accounts (accruals family — same release family as AHHY)

| Candidate | CDID (if known) | URL | Notes / reconcile to AHHY? |
|-----------|-----------------|-----|------------------------------|
| Total PS taxes + NICs (flagship) | **AHHY** | [timeseries](https://www.ons.gov.uk/economy/governmentpublicsectorandtaxes/publicsectorfinance/timeseries/ahhy/pusf) | **Pinned.** Aggregate for flagship. |
| CG income tax + compulsory social contributions (NICs) | **KSS8** | [timeseries](https://www.ons.gov.uk/economy/governmentpublicsectorandtaxes/publicsectorfinance/timeseries/kss8/pusf) | Component-ish CG measure; **not** proven equal to a slice of AHHY without PSF table mapping. |
| CG VAT receivable | **NZGF** | [timeseries](https://www.ons.gov.uk/economy/governmentpublicsectorandtaxes/publicsectorfinance/timeseries/nzgf/pusf) | CG production-tax VAT; sector/boundary may differ from PS total. |
| CG corporation tax accrued (gross of tax credits) | **CPRN** | [timeseries](https://www.ons.gov.uk/economy/governmentpublicsectorandtaxes/publicsectorfinance/timeseries/cprn/pusf) | Accrued CT; do not sum with cash heads. |
| PSF Appendix A / PSA6D (NAB) & PSA7D (cash) | table codes | [PSF datasets](https://www.ons.gov.uk/economy/governmentpublicsectorandtaxes/publicsectorfinance/datasets/publicsectorfinances/current); Appendix A with bulletins | HMRC quality report: PSA6D = National Accounts Basis; PSA7D = cash. **Candidate reconcile map** — needs Validation to confirm which rows roll into AHHY. |
| Public sector current receipts Appendix D | release attachment | Linked from monthly PSF releases | Monthly / FYTD / FY breakdown of income — useful for Anatomy **if** tax heads align with AHHY definition. |
| ESA National Tax List (detailed tax & social contributions) | questionnaire | Linked from PSF releases | Fine-grained ESA list; annual/structural — not a monthly AHHY stack by default. |

#### B. HMRC cash receipts (separate framework)

| Candidate | ONS/HMRC code (cash) | Source | Notes / reconcile to AHHY? |
|-----------|----------------------|--------|----------------------------|
| HMRC tax + NICs monthly bulletin | — | [GOV.UK bulletin](https://www.gov.uk/government/statistics/hmrc-tax-and-nics-receipts-for-the-uk/hmrc-tax-receipts-and-national-insurance-contributions-for-the-uk-new-monthly-bulletin) | **Cash.** Headline FYTD figures are not AHHY. |
| Income Tax (cash) | RURC | HMRC [quality report](https://www.gov.uk/government/statistics/hmrc-receipts-quality-reports/quality-report-hm-revenue-and-customs-receipts) | Cash CDID list in quality report. |
| PAYE IT / SA IT | BKMR / LISB | same | |
| NICs (cash) | ABLP | same | |
| VAT (cash) | EYOO | same | |
| Corporation Tax (cash) | N445 | same | Includes bank surcharge / DPT in some PSF cash presentations — read footnotes. |
| Other heads (CGT, Bank Levy, DST, EPL, …) | MS62, KIH4, FSO5, JIS5, … | same | Useful for Anatomy **as a cash stack**, not as AHHY components. |

**Reconcile rule for later waves:** either (1) publish a **cash** composition instrument labelled HMRC cash, **or** (2) ingest ONS NAB components that the PSF tables document as composing AHHY. Never mix (1) into (2).

### 2.3 Gap list for experiences 2–6

| Experience | Status | Evidence / sources (inventory) | Gap |
|------------|--------|--------------------------------|-----|
| **What Britain Raises** | **Scoped → Validation-ready** (AHHY pin) | This package | Independent Validation PASS; optional official tax/GDP series (not derived) |
| **The Tax Machine** | **Statute pin Validation-ready (2026-11-15)** — UI still planned-not-ready | Package `tax-machine-income-tax-rules` · [handover-economy-06-tax-machine.md](handover-economy-06-tax-machine.md); GOV.UK Income Tax + NICs + Scottish rates | Independent Validation `EC-VAL-06C`; no React until PASS + Review Gate |
| **Anatomy of Revenue** | **Scoped (inventory only)** | PSA6D / Appendix D / ESA NTL; HMRC cash tables | No ingest until reconcile path + registry rows |
| **Who Bears the Tax Burden?** | **Validation-ready pin (2026-11-15)** — UI EmptyStage | Package `effects-of-taxes-and-benefits` · [handover-economy-06-burden.md](handover-economy-06-burden.md); ONS ETB Table 8 + Table 2a FYE 2024 | Independent Validation `EC-VAL-06D`; no invented direct×disposable/expenditure shares; Domain 04 link |
| **The Tax Time Machine** | **Planned-not-ready** | Same rates/allowances histories; Commons Library tax briefings; fiscal-drag explainers | Historical rule archive + explicit counterfactual assumptions; Scotland ≠ rUK |
| **The Tax Gap** | **Planned-not-ready** | HMRC [Measuring tax gaps tables](https://www.gov.uk/government/statistics/measuring-tax-gaps-tables); 2024–25 provisional gap ~6.4% / £59.2bn (HMRC news, Jun 2026) | Methodology breaks; do not equate gap with fraud |

### 2.4 Boundaries

- **Domain 07** (`total-managed-expenditure`, EBFT) and **Domain 08** (DZLS / HF6W / NMFX / HF6X): related fiscal story — link, do not merge axes or invent identities.
- **Domain 02 / 04:** earnings and household income for Tax Machine / burden — reuse, do not fork.
- **No frontend** until Wave B G3 after Validation.

---

## Artefact 3 — Notion plan status

Page: [06 · Taxation & Revenue](https://app.notion.com/p/414654717685816bb414e87ccbd501fc)

Updated this pass (2026-11-14):

- Status line → G2 Phase 0 **complete (Economy)**; awaiting Validation.
- Four handover artefact checkboxes → checked (pointing at this file).
- Phase 0 evidence-gate checkboxes → checked for verify AHHY, breakdown research (inventory), rates/thresholds source-of-truth definition, distributional/tax-gap inventory, pin/manifest/self-QA, four artefacts.
- Explicit note: **no Ready claim**; no new registry rows for components.

Deep brief (six experiences, Tax Machine as signature) remains product authority; G2 does not build UI.

---

## Artefact 4 — Handover paths + G3 view requirements (requirements only)

### 4.1 File list for Validation

1. `docs/handover-economy-06-tax.md` (this file)
2. `data/economy/tax-receipts/manifest.yaml`
3. `data/economy/tax-receipts/curated/observations.csv`
4. `data/economy/tax-receipts/raw/2026-11-14/ahhy_pusf.json` (local; `raw/` may be gitignored)
5. `data/economy/tax-receipts/validation_report.md`
6. `data/economy/tax-receipts/README.md`
7. `src/economy/connectors/tax_receipts.py`
8. `src/economy/connectors/fiscal_series.py` (`TAX_RECEIPTS`)
9. `docs/agent-kickoff-economy-06-tax.md`

### 4.2 Recommended G3 views (requirements only — **no code**)

1. **What Britain Raises (first)** — monthly AHHY line (or 12-month rolling sum labelled derived); Notes panel must state accruals vs HMRC cash, £m NSA, UK, period levels vs FYTD; drop provisional latest month on charts; empty state for tax/GDP until an official ratio series exists.
2. **Anatomy of Revenue** — EmptyStage until reconciled components; if HMRC cash is shown, label cash and never stack under AHHY total.
3. **The Tax Machine** — requirements only: verified rate/threshold pins per tax year and jurisdiction; accessible calculation trace; “not tax advice”; Scotland separate; no React in G2.
4. **Burden / Time Machine / Tax Gap** — EmptyStages with source inventory from §2.3.

### 4.3 Recommended next Validation task

**`EC-VAL-06` — Validate `tax-receipts` (AHHY)**  
Checks: raw checksum ↔ manifest; curated vs JSON months; status = latest provisional only; copy never says “HMRC cash”; confirm no tax/GDP derivation in package.

### 4.4 Blockers for Validation

- None for AHHY numerical self-consistency (Economy self-QA pass).
- Independent Validation must still run and file under `data/qa/`.
- Next PSF **20 Nov 2026** will revise recent months — Validation may want to wait or re-check after that release.
- Anatomy / Tax Machine / Burden / Gap are **out of scope** for this Validation task (inventory only).
