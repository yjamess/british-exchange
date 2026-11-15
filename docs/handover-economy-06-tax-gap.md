# Handover — Economy Domain 06 · The Tax Gap (HMRC Measuring tax gaps)

**Author:** Economy domain subagent · **Date:** 2026-11-15  
**Notion plan:** [06 · Taxation & Revenue](https://app.notion.com/p/414654717685816bb414e87ccbd501fc) §F  
**Kickoff:** [agent-kickoff-economy-06-tax-gap.md](agent-kickoff-economy-06-tax-gap.md)  
**Parent handover:** [handover-economy-06-tax.md](handover-economy-06-tax.md)  
**Work plan:** `EC-G2-06F`  
**Scope:** HMRC Measuring tax gaps evidence pin only. **No frontend.** Not Ready.

> **Status:** Economy self-QA **pass** (14/14). **Validation-ready, not Ready.**  
> Do not mark Registry Ready or replace EmptyStage until independent Validation files a PASS under `data/qa/`.

**Question:** What does HMRC estimate as the gap between theoretical tax liabilities and tax collected — by tax type and published reason category?

**Experience:** **The Tax Gap** — `/economy?domain=tax&view=gap` (EmptyStage until PASS + Review Gate).

---

## Indicator

| Field | Value |
|-------|--------|
| Indicator id | `hmrc-tax-gap` |
| Package folder | `data/economy/hmrc-tax-gap/` |
| Connector | `economy.connectors.hmrc_tax_gap` |
| Publisher | HMRC |
| Vintage / edition | **Measuring tax gaps 2026 edition** (estimates for tax year **2024 to 2025**) |
| Official release | **2026-06-23** |
| Retrieved | 2026-11-15 (`raw/2026-11-15/`) |
| Licence | Open Government Licence v3.0 |
| Geography | United Kingdom (`K02000001`) |
| Time base | **UK tax year** (6 Apr–5 Apr), not financial year |
| Source version | `MTG-2026` |

Reproduce:

```bash
uv run python -m economy.connectors.hmrc_tax_gap
```

---

## Headline (tax year 2024–25 — provisional / projected)

| Measure | Value | Status |
|---------|-------|--------|
| Tax gap | **£59.2 billion** | provisional (HMRC projection) |
| Tax gap as % of theoretical liabilities | **6.4%** | provisional |
| Total theoretical tax liabilities | **£924.4 billion** | provisional |

HMRC collected an implied **93.6%** of theoretical liabilities in this estimate (bulletin wording).

---

## Tax types / categories covered

### By tax type (Tables 1.1 % · 1.2 £bn) — 2005–06 → 2024–25

| Tax (HMRC label) | Components curated (examples) |
|------------------|-------------------------------|
| VAT | Total VAT |
| Excise duty | Cigarette; HRT; total tobacco; beer; spirits; hydrocarbon oils; other excise; **total excise** |
| Income Tax, NICs, Capital Gains Tax | SA (business / large partnerships / non-business); PAYE (small / mid / large); avoidance; hidden economy (ghosts / moonlighters); **total IT/NICs/CGT** |
| Corporation Tax | Small / mid / large businesses; **total CT** |
| Other taxes | SDLT; SDRT; stamp taxes total; Inheritance Tax; Landfill Tax; other levies/duties; **total other** |
| Total tax gap | Aggregate + (Table 1.2) total theoretical liability |

### By customer group (Table 1.3)

Small businesses; Criminals; Mid-sized businesses; Large businesses; Individuals; Wealthy — £bn and % of gap.

### By illustrative behaviour / reason (Table 7.1) — **2019–20 → 2024–25 only**

HMRC published labels (do not invent):

| Behaviour | 2024–25 share of gap |
|-----------|----------------------|
| Failure to take reasonable care | **35%** |
| Error | 16% |
| Evasion | **12%** |
| Legal interpretation | 12% |
| Non-payment | 10% |
| Criminal attacks | 8% |
| Hidden economy | 6% |
| Avoidance | 1% |

**Safety (non-negotiable):** the tax gap is **not** the same as deliberate fraud. Evasion is one category; the largest share is failure to take reasonable care. Estimates are modelled/administrative — not observed incidents.

---

## Methodology breaks (labelled — do not silent-splice)

| Break | Note |
|-------|------|
| CT step ~2019–20 | Data-collection improvements; small-business CT may be understated pre-2019–20 (Summary). |
| Behaviour series start | Table 7.1 from **2019–20**; MTG 2023 behaviour method updates do not extend to 2005–06. |
| Projection years | **2023–24** and **2024–25** projected (data lags) → curated `observation_status=provisional`. |
| Edition revisions | Each MTG edition revises prior years (workbook note 1). Pin is **MTG-2026** only. |
| Component non-comparability | Workbook notes 30 / 54 / 55 / 57 (and related) — see `curated/workbook_notes.csv`. |

Full list: `curated/methodology_breaks.json`.

---

## Artefact paths

| Artefact | Path |
|----------|------|
| Manifest | `data/economy/hmrc-tax-gap/manifest.yaml` |
| Source matrix | `data/economy/hmrc-tax-gap/source_register.csv` |
| Raw + SHA256SUMS | `data/economy/hmrc-tax-gap/raw/2026-11-15/` |
| Curated observations | `data/economy/hmrc-tax-gap/curated/observations.csv` (1682 rows) |
| Headline JSON | `data/economy/hmrc-tax-gap/curated/headline_2024_25.json` |
| Methodology breaks | `data/economy/hmrc-tax-gap/curated/methodology_breaks.json` |
| Workbook notes | `data/economy/hmrc-tax-gap/curated/workbook_notes.csv` |
| Self-QA JSON | `data/economy/hmrc-tax-gap/curated/self_qa.json` |
| Self-QA report | `data/economy/hmrc-tax-gap/validation_report.md` |
| README | `data/economy/hmrc-tax-gap/README.md` |
| Connector | `src/economy/connectors/hmrc_tax_gap.py` |
| This handover | `docs/handover-economy-06-tax-gap.md` |
| Kickoff | `docs/agent-kickoff-economy-06-tax-gap.md` |

### Raw checksums (2026-11-15)

| File | sha256 |
|------|--------|
| `Measuring_tax_gap_online_tables_2026.xlsx` | `8af0e2c7722eee3dd4330ae552b0b0f35f0b6601c608558069d96d664ed19dda` |
| `summary.html` | `2b68427439f526ab8f0d2c32f43d91ec5d668823e3d26ebb1cdf91f1cdbbca57` |
| `behaviour.html` | `ef14565822c187bec8baad93273e78c53b2c8444149e984b630cdbf40a51f81d` |
| `methodological_annex.html` | `5d768e1a6d8bef71b5910d923cbd3ff6229c1c97c37562179ce44660ddb480aa` |
| `quality_report.html` | `b46021daa51bcf1ccfac0b919a1411ebe181a6c4620f8d3f76c8b3ed9b5a1c1e` |
| `tables_landing.html` | `35d8319475130fe5df4731a9279bc59c4c34b6219686e0982ad68598a0a1ca84` |
| `main_statistics.html` | `91552596575a6e99dfb48d5b1c1e539abf5f56a339134ed0a8a3a6e3a7a55100` |

**Parser note:** the GOV.UK xlsx has broken drawing relationships; the connector reads cells via `zipfile` + XML (not openpyxl normal load).

---

## Self-QA summary (Economy)

Overall: **pass** (`validation_report.md` · `curated/self_qa.json`).

- Xlsx checksum matches manifest  
- Headline £59.2bn / 6.4% / theoretical £924.4bn  
- Breakdowns: VAT £12.1bn & 6.6%; CT 18.1%  
- Behaviour: failure to take reasonable care 35%; evasion 12% (evasion < failure → gap ≠ fraud check)  
- Customer: small businesses 62% of gap  
- No pre-2019–20 behaviour rows invented  
- 2024–25 rows marked provisional  
- Summary HTML contains published headline strings  

---

## Validation ask — `EC-VAL-06F`

**Task:** Independently match curated headline and ≥2 breakdown cells to the published HMRC MTG 2026 tables; file pass/fail under `data/qa/`.

Suggested checks:

1. Recompute sha256 of `raw/2026-11-15/Measuring_tax_gap_online_tables_2026.xlsx` vs manifest.  
2. Table 1.2 total tax gap **2024–25 = 59.2** (£bn); Table 1.1 total **= 6.4%**.  
3. At least two of: VAT total £bn **12.1**; CT total % **18.1**; behaviour “failure to take reasonable care” share **35%**.  
4. Confirm Notes / README never equate the whole gap with fraud.  
5. Confirm Table 7.1 has no curated years before 2019–20.  
6. Confirm 2023–24 / 2024–25 are `provisional`.

**Do not** mark Registry Ready or ship Tax Gap UI on Economy self-QA alone.

---

## Blockers

| Item | Status |
|------|--------|
| Independent Validation `EC-VAL-06F` | **Open** — required before Ready |
| Frontend / EmptyStage | **Blocked** by design until PASS + Orchestrator Review Gate |
| Cloud load (Supabase) | Not in this task |
| Detailed chapter tables (2.x VAT, 5.x CT, …) | Optional later wave — not required for §F pin |

No Economy ingest blockers for the pinned vintage.

---

## Notion

- Domain 06 plan: https://app.notion.com/p/414654717685816bb414e87ccbd501fc  
- Registry row (**Validation**): https://app.notion.com/p/41965471768581969367c87a93f92f58
