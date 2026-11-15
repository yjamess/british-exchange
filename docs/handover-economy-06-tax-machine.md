# Handover — Economy Domain 06 · The Tax Machine (statute pin)

**Author:** Economy domain subagent · **Date:** 2026-11-15  
**Notion plan:** [06 · Taxation & Revenue](https://app.notion.com/p/414654717685816bb414e87ccbd501fc)  
**Kickoff:** [agent-kickoff-economy-06-tax-machine.md](agent-kickoff-economy-06-tax-machine.md)  
**Parent handover:** [handover-economy-06-tax.md](handover-economy-06-tax.md)  
**Work plan:** `EC-G2-06C`  
**Scope:** statute rule tables + worked examples only. **No frontend.** Not Ready.

> **Status:** Economy self-QA **pass**. **Validation-ready, not Ready.**  
> Do not mark Registry Ready or ship Tax Machine UI until independent Validation files a PASS under `data/qa/`.

**Question:** Through what verified rules does a taxable activity lead to a calculated statutory liability — for one scoped scenario?

**Flagship concept:** **The Tax Machine** — educational illustration, not tax advice.

---

## Indicator

| Field | Value |
|-------|--------|
| Indicator id | `tax-machine-income-tax-rules` |
| Package folder | `data/economy/tax-machine-rules/` |
| Connector | `economy.connectors.tax_machine_rules` |
| Licence | Open Government Licence v3.0 |
| Retrieved | 2026-11-15 (raw folder `raw/2026-11-15/`) |

---

## Coverage pinned

| Field | This pass |
|-------|-----------|
| Tax | Income tax (PAYE-style bands after Personal Allowance) + **employee Class 1 NICs (category A) as a separate stage** |
| Tax years | **2025–26** and **2026–27** (current + one prior on retrieval date 2026-11-15; both published on GOV.UK). Kickoff soft-preference 2024–25 not used as “prior” because current tax year is already 2026–27. |
| Jurisdictions | England/Wales/NI full tables; Scotland labelled alternate income-tax bands (same years) |
| Scenario type | Hypothetical taxable employment income only |

### Exclusions (explicit)

benefits in kind; pension contributions / relief; marriage allowance; blind person's allowance; student loan repayments; savings/dividend income; PA taper above £100,000 (examples ≤ £100k); employer Class 1 NICs; non-A NICs category letters; CT / VAT / CGT / council tax.

### Safety copy (for future Notes)

Educational illustration of dated statutory income-tax and employee Class 1 NICs rules — not tax advice and not a substitute for HMRC guidance or a personal tax calculation. Hypothetical taxable employment income only; Scotland uses a labelled alternate band table. Statutory incidence (who the law charges) is not the same as economic incidence (who ultimately bears the cost). Modelled liabilities are not observed population tax paid.

---

## Worked examples (n=4)

Tax year for examples: **2025–26** (E/W/NI rates for these incomes match 2026–27 in this pin).

| ID | Jurisdiction | Gross | Income tax | Employee Class 1 NICs |
|----|--------------|-------|------------|------------------------|
| `ewni_low` | E/W/NI | £30,000 | £3,486.00 | £1,394.40 |
| `ewni_basic_top` | E/W/NI | £50,270 | £7,540.00 | £3,016.00 |
| `ewni_higher` | E/W/NI | £80,000 | **£19,432.00** | £3,610.60 |
| `scotland_contrast_basic_top` | Scotland | £50,270 | £9,127.20 | £3,016.00 |

Sample for Validation spot-check: **`ewni_higher`** — gross £80,000 E/W/NI → income tax **£19,432.00**; NICs **£3,610.60** (separate stages; combined sum £23,042.60 is not a blended rate).

Scotland contrast at £50,270: IT £9,127.20 vs E/W/NI £7,540.00 (same NICs).

---

## Artefact paths

| Artefact | Path |
|----------|------|
| Manifest | `data/economy/tax-machine-rules/manifest.yaml` |
| Raw snapshots + SHA256SUMS | `data/economy/tax-machine-rules/raw/2026-11-15/` |
| Income-tax bands | `data/economy/tax-machine-rules/curated/income_tax_bands.csv` |
| Allowances | `data/economy/tax-machine-rules/curated/allowances.csv` |
| Employee Class 1 NICs | `data/economy/tax-machine-rules/curated/employee_class1_nics.csv` |
| Worked examples | `data/economy/tax-machine-rules/curated/worked_examples.json` (+ `.md`) |
| Observations (contract CSV) | `data/economy/tax-machine-rules/curated/observations.csv` |
| Self-QA JSON | `data/economy/tax-machine-rules/curated/self_qa.json` |
| Self-QA report | `data/economy/tax-machine-rules/validation_report.md` |
| README | `data/economy/tax-machine-rules/README.md` |
| Connector | `src/economy/connectors/tax_machine_rules.py` |
| This handover | `docs/handover-economy-06-tax-machine.md` |
| Kickoff | `docs/agent-kickoff-economy-06-tax-machine.md` |

Reproduce:

```bash
uv run python -m economy.connectors.tax_machine_rules
```

### Raw checksums (2026-11-15)

| File | sha256 |
|------|--------|
| `income_tax_rates.html` | `c554bb32dd37880f4f83a3bdc98e8e8241133a90ff2746c3089388443883b279` |
| `nics_rates.html` | `d8d15066bccdbbd66223d9ee019947f47527db95b491ec8b133f5f86bc3d965d` |
| `employers_2025_26.html` | `c2984177ca616a9059630d6bcef5ecd6b9b4f373140f300d415f8a82e59a204a` |
| `employers_2026_27.html` | `2161c1e6baceb9c23a455458b9c2b1d014a2f3751d2f69555df3ddb830814def` |
| `scottish_2025_26.html` | `22d6bbbed7f6b408f5bb132c31ab425eec523220b710e0ef24d38efaa241764b` |

---

## Self-QA summary (Economy)

Overall: **pass** (`validation_report.md`).

- Raw checksums match manifest  
- Published anchor strings present in HTML  
- Scotland IT > E/W/NI at £50,270  
- Four worked examples match expected arithmetic  
- Income-tax band table does not blend NICs  

---

## Validation ask — `EC-VAL-06C`

**Task:** Independently recompute the four worked examples from curated tables alone; file pass/fail under `data/qa/`.

Suggested checks:

1. Manifest `raw_evidence` checksums ↔ files on disk.  
2. Curated E/W/NI and Scotland band/allowance rows ↔ GOV.UK raw HTML (or employers rates pages) for 2025–26 and 2026–27.  
3. Recompute `worked_examples.json` liabilities from `income_tax_bands.csv` + `allowances.csv` + `employee_class1_nics.csv` without reading connector source constants.  
4. Confirm income tax and employee NICs remain separate stages (no blended “worker tax” rate).  
5. Confirm exclusions / safety copy present; no Ready claim; no CT/VAT/CGT tables.  
6. Confirm Scotland contrast uses Scotland bands, not silent E/W/NI application.

### Blockers for Validation

- None for Economy self-consistency.  
- Independent Validation must still run (`EC-VAL-06C`).  
- Registry row for `tax-machine-income-tax-rules` not yet created (open question on Notion).  
- UI / EmptyStage replacement is **out of scope** until after Validation PASS + Review Gate.

---

## Notion

Phase 2 Tax Machine statute-pin notes updated on the Domain 06 page (2026-11-15): narrow scope complete / Validation-ready; UI still planned-not-ready.
