# Handover — Economy Domain 06 · Who Bears the Tax Burden? (Gate 2 pin)

**Author:** Economy domain subagent · **Date:** 2026-11-15  
**Notion plan:** [06 · Taxation & Revenue](https://app.notion.com/p/414654717685816bb414e87ccbd501fc) §D  
**Kickoff:** [agent-kickoff-economy-06-burden.md](agent-kickoff-economy-06-burden.md)  
**Parent handover:** [handover-economy-06-tax.md](handover-economy-06-tax.md) §2.3  
**Work plan:** `EC-G2-06D`  
**Scope:** ONS ETB pin + handover only. **No frontend.** Not Ready.

> **Status:** Economy self-QA **14/14 pass**. **Validation-ready, not Ready.**  
> Do not mark Registry Ready or replace EmptyStage until independent Validation files a PASS under `data/qa/`.

**Question:** How do estimated direct and indirect tax burdens differ across household income groups — and how does the picture change with the denominator?

---

## Indicator

| Field | Value |
|-------|--------|
| Indicator id | `effects-of-taxes-and-benefits` |
| Package folder | `data/economy/effects-of-taxes-and-benefits/` |
| Connector | `economy.connectors.effects_of_taxes_and_benefits` |
| Publisher | ONS |
| Series | ETB reference tables · **Table 8** + **Table 2a** totals · FYE 2024 |
| Licence | Open Government Licence v3.0 |
| Retrieved | 2026-11-15 |
| Official release | **2025-09-25** |
| Years covered | **FYE 2024** only (2023-04-01 → 2024-03-31) — earlier editions inventory-only |
| Geography | United Kingdom `K02000001` (private households, HFS/LCF) |
| Rows curated | **42** (30 Table 8 + 12 Table 2a) |

Reproduce:

```bash
uv run python -m economy.connectors.effects_of_taxes_and_benefits
```

---

## Source matrix

| Artefact | Years | Geography | Units | Direct / indirect | Denominators | Licence |
|----------|-------|-----------|-------|-------------------|--------------|---------|
| **Table 8** (pinned) | FYE 2024 | UK | % of denominator | Direct, indirect, all (gross); **indirect only** for disposable & expenditure | **gross_income** (direct/indirect/all); **disposable_income** (indirect); **expenditure** (indirect) | OGL v3.0 |
| **Table 2a** totals (pinned) | FYE 2024 | UK | £/year household average | Total direct; total indirect | Levels (not shares) | OGL v3.0 |
| Table 1 (raw only) | FYE 2024 | UK | Equivalised £/year | Direct / indirect as income stages | n/a | OGL v3.0 |
| Table 9 (inventory) | FYE 2024 | UK non-retired | % | Same pattern as Table 8 | Same as Table 8 | OGL v3.0 |
| Historical workbooks (inventory) | FYE 2014–2023 | UK | varies | varies | varies | OGL v3.0 |

**Landing:** [ETB dataset](https://www.ons.gov.uk/peoplepopulationandcommunity/personalandhouseholdfinances/incomeandwealth/datasets/theeffectsoftaxesandbenefitsonhouseholdincomefinancialyearending2014)  
**Bulletin:** [FYE 2024](https://www.ons.gov.uk/peoplepopulationandcommunity/personalandhouseholdfinances/incomeandwealth/bulletins/theeffectsoftaxesandbenefitsonhouseholdincome/2024)  
**File URI used:** `…/financialyearending2024/etbreferencetablesfye202324final.xlsx` (the `/current/` file path **404**’d on pin day — edition path is locked in the connector).

Full inventory CSV: `data/economy/effects-of-taxes-and-benefits/source_register.csv`.

---

## Direct / indirect / denominator notes

| Topic | Statement |
|-------|-----------|
| **Direct taxes** | Income Tax, NICs, student loan repayments, Council Tax/NI rates (net of rebates) — ONS Table 2a / 8 definition. |
| **Indirect taxes** | Taxes on goods and services (VAT, duties, stamp duty on house purchase, intermediate taxes, etc.) — ONS Table 2a / 8. |
| **Gross income denominator** | Table 8 publishes **direct**, **indirect**, and **all taxes** as % of gross income by quintile. |
| **Disposable income denominator** | Table 8 publishes **indirect taxes only** as % of disposable income. **Do not invent** direct % of disposable. |
| **Expenditure denominator** | Table 8 publishes **indirect taxes only** as % of expenditure (consistent with disposable income; note 13 — from 1995/96). **Do not invent** direct % of expenditure. |
| **Ranking** | Individuals ranked by **equivalised** household disposable income (modified OECD). Quintile labels: Bottom, 2nd, 3rd, 4th, Top, All individuals. |
| **Table 2a £** | Unequivalised household **means**; ranking still uses equivalised disposable income. |
| **Honesty** | Group averages ≠ what a household pays. Legal liability ≠ economic incidence. **No fairness claims.** |
| **Not AHHY** | Distributional survey estimates — not public-sector tax receipts (`tax-receipts`). |
| **Domain 04** | Household income / HBAI ownership stays Domain 04 — **link, do not fork**. No Domain 04 ETB series existed to reuse. |

### Illustrative published cells (FYE 2024, all individuals)

| Band | Direct % gross | Indirect % gross | All % gross | Indirect % disposable | Indirect % expenditure | Direct £ | Indirect £ |
|------|----------------|------------------|-------------|----------------------|------------------------|----------|------------|
| Bottom | 15.7 | 21.0 | 36.7 | 24.9 | 16.5 | 3,696 | 4,929 |
| Top | 28.8 | 7.5 | 36.2 | (see curated) | (see curated) | (see curated) | (see curated) |
| All | 22.9 | 10.7 | 33.6 | 13.9 | 16.4 | 15,743 | 7,363 |

---

## Artefact paths

| Artefact | Path |
|----------|------|
| Manifest | `data/economy/effects-of-taxes-and-benefits/manifest.yaml` |
| Curated | `data/economy/effects-of-taxes-and-benefits/curated/observations.csv` |
| Self-QA JSON | `data/economy/effects-of-taxes-and-benefits/curated/self_qa.json` |
| Self-QA report | `data/economy/effects-of-taxes-and-benefits/validation_report.md` |
| Source matrix | `data/economy/effects-of-taxes-and-benefits/source_register.csv` |
| README | `data/economy/effects-of-taxes-and-benefits/README.md` |
| Raw workbook | `data/economy/effects-of-taxes-and-benefits/raw/2026-11-15/etbreferencetablesfye202324final.xlsx` |
| Raw SHA256SUMS | `data/economy/effects-of-taxes-and-benefits/raw/2026-11-15/SHA256SUMS` |
| Connector | `src/economy/connectors/effects_of_taxes_and_benefits.py` |
| This handover | `docs/handover-economy-06-burden.md` |
| Kickoff | `docs/agent-kickoff-economy-06-burden.md` |

### Raw checksum (2026-11-15)

| File | sha256 |
|------|--------|
| `etbreferencetablesfye202324final.xlsx` | `2e38c1694d922427509879b9553a4c3473b8ba1174898c2dd414668ecbb2bf73` |

### Curated notes dimensions

`table=` · `measure=` (`tax_share` \| `average_gbp`) · `tax=` (`direct` \| `indirect` \| `all`) · `denominator=` (Table 8 only) · `band=` · `ranking=` · `population=all_individuals` · equivalisation flags.

---

## Self-QA summary

**14/14 pass** — spot cells vs Table 8 / Table 2a; direct+indirect=all on gross (Bottom); no invented direct×disposable/expenditure rows; row counts 30+12=42.

---

## Validation ask — `EC-VAL-06D`

**Owner:** Validation  
**Package:** `data/economy/effects-of-taxes-and-benefits/`  
**File findings under:** `data/qa/` (do not silently rewrite curated).

### Checks

1. **V1 — Integrity:** raw sha256 matches manifest + SHA256SUMS; curated row count = 42; `indicator_id` = `effects-of-taxes-and-benefits`.
2. **V2 — Table 8 spots:** Bottom direct % gross = **15.7**; Bottom indirect % expenditure = **16.5**; Top direct % gross = **28.8**; Bottom direct+indirect = all on gross (**36.7**).
3. **V3 — Table 2a spots:** Bottom total direct = **3696**; Bottom total indirect = **4929**; All individuals totals **15743** / **7363**.
4. **V4 — Denominator discipline:** no curated rows with `tax=direct` and `denominator=disposable_income` or `denominator=expenditure`.
5. **V5 — Copy:** README / manifest / Notes never claim fairness, individual liabilities, or equality with AHHY; legal ≠ economic incidence stated.
6. **V6 — Period / geography:** FYE 2024 bounds; UK private-household survey base.

**PASS criteria:** V1–V6 clean (or documented publisher quirk). Ready only after Orchestrator review + cloud load path.

---

## Blockers

| Item | Severity | Notes |
|------|----------|-------|
| Independent Validation not yet run | **Blocking Ready** | Schedule `EC-VAL-06D` |
| Multi-year burden history not pinned | Non-blocking | Editions FYE 2014–2023 on landing; person-level break FYE 2018 |
| `/current/` download URI 404 | Non-blocking | Edition path locked; re-check on next ETB release |
| Domain 04 household income not Ready | Non-blocking | Burden does not require HBAI for this pin |
| Frontend EmptyStage | Intentional | No UI until Validation PASS + Review Gate |

---

## Notion

- Registry: [Effects of taxes and benefits (tax burden)](https://app.notion.com/p/41965471768581f5a6d8f652ce533d8c) — Status **Validation**
- Domain 06 Phase 3: Economy pin complete; UI still gated on Validation PASS + Review Gate.
