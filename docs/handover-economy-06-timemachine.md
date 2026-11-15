# Handover — Economy Domain 06 · The Tax Time Machine (history pin)

**Author:** Economy domain subagent · **Date:** 2026-11-15  
**Notion plan:** [06 · Taxation & Revenue](https://app.notion.com/p/414654717685816bb414e87ccbd501fc) §E  
**Kickoff:** [agent-kickoff-economy-06-timemachine.md](agent-kickoff-economy-06-timemachine.md)  
**Related Ready pin:** [handover-economy-06-tax-machine.md](handover-economy-06-tax-machine.md) (`tax-machine-income-tax-rules`)  
**Work plan:** `EC-G2-06E`  
**Scope:** multi-year rates/thresholds archive (+ optional NICs separate stage). **No frontend.** Fiscal drag **deferred**. Not Ready.

> **Status:** Economy self-QA **pass**. **Validation-ready, not Ready.**  
> Do not mark Registry Ready or ship Time Machine UI until independent Validation files a PASS under `data/qa/`.

**Question:** How have income-tax (and related) rates, allowances and thresholds changed over time — and can fiscal drag be shown with explicit assumptions?

**Flagship concept:** **The Tax Time Machine** — historical rule archive; educational, not tax advice.

---

## Indicator

| Field | Value |
|-------|--------|
| Indicator id | `tax-machine-income-tax-history` |
| Package folder | `data/economy/tax-machine-income-tax-history/` |
| Connector | `economy.connectors.tax_machine_income_tax_history` |
| Related Ready id | `tax-machine-income-tax-rules` (same connector family — Band helpers reused; do not fork rates) |
| Licence | Open Government Licence v3.0 |
| Retrieved | 2026-11-15 (raw folder `raw/2026-11-15/`) |
| Fiscal drag | **Deferred** — `curated/fiscal_drag_status.json` |

---

## Coverage pinned

| Field | This pass |
|-------|-----------|
| Tax | Income tax bands + Personal Allowance; **employee Class 1 NICs (category A) as a separate stage** |
| Year span | **2010–11 … 2026–27** (meets kickoff “at least through 2010–11”) |
| Jurisdictions | **E/W/NI** full history from HMRC Table A.2; **Scotland labelled** — mirrors E/W/NI 2010–11…2016–17; **explicit gap 2017–18…2022–23**; GOV.UK after-allowance bands **2023–24…2026–27** |
| NICs | HMRC Table A.4 weekly thresholds/rates; weekly×52 documented as educational annual equivalent only; **2022–23 / 2023–24** kept as `intra_year_change` (no invented single annual rate) |

### Exclusions (explicit)

savings starting-rate focus; dividend rates; marriage/blind/age allowances as modelled reliefs; employer Class 1; non-A category letters; Scotland 2017–22 bands; fiscal-drag calculator; CT / VAT / CGT / council tax.

### Safety copy (for future Notes)

Educational illustration of dated statutory income-tax and employee Class 1 NICs rules — not tax advice and not a substitute for HMRC guidance or a personal tax calculation. Hypothetical taxable employment income only; Scotland uses a labelled alternate band table. Statutory incidence (who the law charges) is not the same as economic incidence (who ultimately bears the cost). Modelled liabilities are not observed population tax paid.

---

## Fiscal drag

**Deferred this pass.** No worked counterfactual examples. Assumptions inventory not invented. Status file: `curated/fiscal_drag_status.json`.

---

## Artefact paths

| Artefact | Path |
|----------|------|
| Manifest | `data/economy/tax-machine-income-tax-history/manifest.yaml` |
| Raw snapshots + SHA256SUMS | `data/economy/tax-machine-income-tax-history/raw/2026-11-15/` |
| Income-tax bands | `…/curated/income_tax_bands.csv` |
| Allowances | `…/curated/allowances.csv` |
| Employee Class 1 NICs | `…/curated/employee_class1_nics.csv` |
| Coverage inventory | `…/curated/coverage_inventory.csv` |
| Fiscal-drag status | `…/curated/fiscal_drag_status.json` |
| Observations | `…/curated/observations.csv` |
| Self-QA JSON | `…/curated/self_qa.json` |
| Self-QA report | `…/validation_report.md` |
| README | `…/README.md` |
| Connector | `src/economy/connectors/tax_machine_income_tax_history.py` |
| This handover | `docs/handover-economy-06-timemachine.md` |
| Kickoff | `docs/agent-kickoff-economy-06-timemachine.md` |

Reproduce:

```bash
uv run python -m economy.connectors.tax_machine_income_tax_history
```

### Raw checksums (2026-11-15)

| File | sha256 |
|------|--------|
| `table_a2_rates.ods` | `31281efc152adf8c0e8ab56f73dcb80282f9542ec83b0289c93cd279dbb7eba2` |
| `table_a1_allowances.ods` | `5b91e2bb93f0bc69c36a8dacb5605497fe169b5632dc4bdef255502daed8bde4` |
| `table_a4_nics.ods` | `0928355419d32ea47fd79cc7e2774e59b3559f7cbcd0a954d4d7abc573ce744d` |
| `income_tax_rates.html` | `4bc1dcf24bf378b245ca068dab6e4598422a463af22e168fe15c1d97a09087ec` |
| `nics_rates.html` | `c930011e4ed5f660038e5fd8006c53f2604717012ab93861812d931cbd35a26d` |
| `rates_of_income_landing.html` | `1311f8903a6786ea7a9d9b408ce5bea82162e75705ebb5f7298e9f13b8412a17` |
| `allowances_landing.html` | `857c87b7a7d75de1f8e36634be11deda473a172cc6d9491a4947893d5944d826` |
| `nics_stats_landing.html` | `904b41a8f4691ac8e76a399245a097bd810576da63e73107ee0e462e0bfff6e5` |

---

## Self-QA summary (Economy)

Overall: **pass** (`validation_report.md` / `curated/self_qa.json`).

- Raw checksums match manifest  
- GOV.UK HTML anchors present  
- Year span 2010–11…2026–27  
- 2025–26 PA £12,570; E/W/NI basic upper £37,700  
- Scotland 2025–26 starter upper £2,827 / top 48% (matches Ready pin family)  
- Scotland gap years 2017–18…2022–23 explicit  
- Income-tax band table does not blend NICs  
- NICs 2022–23 / 2023–24 not collapsed to invented annual rates  
- Fiscal drag deferred  

Sample for Validation: **2025–26** E/W/NI PA **£12,570**; basic band upper after allowance **£37,700** @ 20%; Scotland starter upper **£2,827**; NICs PT weekly **£242**.

---

## Validation ask — `EC-VAL-06E`

**Task:** Independently recompute a sample of historical years from curated tables vs raw HMRC ODS / GOV.UK HTML; file pass/fail under `data/qa/`.

Suggested checks:

1. Manifest `raw_evidence` checksums ↔ files on disk.  
2. Spot-check E/W/NI bands for **2010–11**, **2015–16**, **2023–24**, **2025–26** from `table_a2_rates.ods` ↔ `income_tax_bands.csv` (after-allowance mapping: HMRC `1 to N` → `0…N`; `Over X` → lower `X+1`).  
3. Personal Allowance rows ↔ `table_a1_allowances.ods` for the same years.  
4. Scotland: confirm **no silent E/W/NI fill** for 2017–22 (gap rows); confirm 2023–27 match GOV.UK `income_tax_rates.html`; confirm 2010–16 labelled as pre-divergence mirror.  
5. NICs: weekly figures ↔ Table A.4; confirm intra-year cells for 2022–23 / 2023–24 are not single invented rates; confirm NICs stay a separate stage.  
6. Confirm fiscal drag deferred; no Ready claim; no Time Machine UI.  
7. Cross-check 2025–26 / 2026–27 Scotland + E/W/NI against Ready pin `tax-machine-income-tax-rules` for consistency of the overlapping years.

### Blockers for Validation

- None for Economy self-consistency.  
- Independent Validation must still run (`EC-VAL-06E`).  
- Scotland 2017–22 still gaps (documented).  
- UI / EmptyStage replacement is **out of scope** until after Validation PASS + Review Gate.

---

## Notion

- **Registry (Validation):** https://app.notion.com/p/4196547176858177bf79d15680c0c264  
- Domain 06 Phase 4 Time Machine notes updated (2026-11-15): history pin Validation-ready; fiscal drag deferred; UI still planned-not-ready.
