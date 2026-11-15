# Handover — Economy Domain 06 · Tax Time Machine fiscal drag

**Author:** Economy domain subagent · **Date:** 2026-11-15  
**Notion plan:** [06 · Taxation & Revenue](https://app.notion.com/p/414654717685816bb414e87ccbd501fc) §E  
**Kickoff:** [agent-kickoff-economy-06-fiscal-drag.md](agent-kickoff-economy-06-fiscal-drag.md)  
**Extends:** [handover-economy-06-timemachine.md](handover-economy-06-timemachine.md) (`tax-machine-income-tax-history`)  
**Work plan:** `EC-G2-06E-DRAG`  
**Scope:** Curated fiscal-drag worked examples + verified earnings path. **No frontend.** Do not rewrite Scotland 2017–22 band rows.

> **Status:** Economy self-QA **pass** (10/10). **Validation-ready, not a Ready flip.**  
> Same indicator id — do not fork. Await independent Validation under `data/qa/` (`EC-VAL-06E-DRAG`).

**Question:** With frozen thresholds, how does a labelled earnings path change statutory liability — with assumptions written down?

---

## Outcome

| Item | Result |
|------|--------|
| Earnings measure | **ONS AWE KAI7** — whole-economy regular pay, SA, cash £/week, Great Britain |
| Vintage | EMP release **2026-10-19** (JSON `description.releaseDate`); pin retrieved 2026-11-15 |
| Related Ready series | `nominal-earnings` (same CDID) |
| Window | Tax years **2021–22…2025–26** (PA / E/W/NI basic upper frozen in curated pin) |
| Profiles | **3** — `ewni_awe_scaled`, `ewni_near_higher`, `scotland_awe_scaled` |
| Status file | `curated/fiscal_drag_status.json` → **`documented`** (was `deferred`) |
| Scotland 2017–22 bands | **Unchanged** (28 rows; sha256 `c3ab0cbf…8f1a`) |

Illustrative self-QA signal (not population facts): E/W/NI AWE-scaled effective income-tax rate **11.19% → 12.94%** (+1.75 pp) over the window; near-HRT profile **+3.21 pp**; Scotland AWE-scaled **+1.86 pp** under actual Scottish bands.

---

## Indicator (unchanged id)

| Field | Value |
|-------|--------|
| Indicator id | `tax-machine-income-tax-history` |
| Package folder | `data/economy/tax-machine-income-tax-history/` |
| Fiscal-drag builder | `economy.connectors.tax_machine_fiscal_drag` |
| Licence | Open Government Licence v3.0 |

---

## Earnings measure (verified)

| Field | Value |
|-------|--------|
| Publisher | ONS |
| Series / CDID | **KAI7** |
| Dataset | EMP |
| Title | AWE: Whole Economy Level (£): Seasonally Adjusted Regular Pay Excluding Arrears |
| Geography | Great Britain (`K03000001`) — **excludes Northern Ireland** |
| Landing | https://www.ons.gov.uk/employmentandlabourmarket/peopleinwork/earningsandworkinghours/timeseries/kai7/emp |
| Raw pin | `raw/2026-11-15/kai7_emp.json` |
| SHA-256 | `c23b05e8873d568c7cab0dd7779b442e9370bb477b1705c544bf34d1634c7c98` |
| Tax-year table | `curated/awe_kai7_tax_year.csv` |
| Annualisation | Tax-year mean of monthly KAI7 (Apr–Mar, 12 months required) × **52** |

**Not this measure:** ASHE medians; AWE total pay (bonuses); NI earnings; household / take-home pay. Growth path is observed KAI7 only — starting levels are labelled hypothetical.

| Tax year | Mean weekly £ | Annualised ×52 £ |
|----------|---------------|------------------|
| 2021–22 | 548.75 | 28,535.00 |
| 2022–23 | 582.33 | 30,281.33 |
| 2023–24 | 622.25 | 32,357.00 |
| 2024–25 | 656.75 | 34,151.00 |
| 2025–26 | 684.83 | 35,611.33 |

---

## Assumptions (summary)

Full text in `curated/fiscal_drag_examples.json` → `assumptions`.

- **Educational — not tax advice.**
- **Nominal GBP** (not CPI-real).
- **Base / end:** 2021–22 → 2025–26.
- **E/W/NI freeze context:** PA £12,570 and basic upper after allowance £37,700 (HRT £50,270) held in curated pin.
- **Counterfactual (E/W/NI only):** PA + basic upper indexed from 2021–22 levels with KAI7; rates unchanged; additional-rate threshold follows actual statute (incl. 2023–24 cut).
- **Scotland:** actual pinned Scottish bands each year — **no** invented freeze and **no** E/W/NI copy.
- **Tax model:** NSND employment income; PA £100k taper; after-allowance bands from curated CSV.
- **Excluded:** NICs, student loan, pensions/gift aid, savings/dividends, marriage/blind/age allowances, Welsh-only rates, BIKs.

---

## Profiles (≤3)

| ID | Jurisdiction | Base gross (2021–22) | Path |
|----|--------------|----------------------|------|
| `ewni_awe_scaled` | E/W/NI | 1.0× annualised KAI7 (£28,535) | × KAI7 index |
| `ewni_near_higher` | E/W/NI | Hypothetical £45,000 | × KAI7 index |
| `scotland_awe_scaled` | Scotland | Same earnings as `ewni_awe_scaled` | × KAI7 index; Scottish bands |

Each year includes step arithmetic (`band_steps`) and effective rate. E/W/NI years also include `counterfactual_thresholds_indexed_to_awe` and `extra_tax_vs_counterfactual_gbp`.

---

## Artefacts

| Path | Role |
|------|------|
| `raw/2026-11-15/kai7_emp.json` | ONS KAI7 pin |
| `raw/2026-11-15/SHA256SUMS` | includes KAI7 digest |
| `curated/awe_kai7_tax_year.csv` | Tax-year AWE path |
| `curated/fiscal_drag_examples.json` | Examples + assumptions |
| `curated/fiscal_drag_status.json` | `documented` |
| `curated/fiscal_drag_self_qa.json` | Economy self-QA |
| `manifest.yaml` | KAI7 `raw_evidence` row + related `nominal-earnings` |
| `docs/handover-economy-06-fiscal-drag.md` | This file |

**Reproduce:**

```bash
uv run python -m economy.connectors.tax_machine_fiscal_drag
```

---

## Economy self-QA

Overall: **pass** (`curated/fiscal_drag_self_qa.json`).

| ID | Check |
|----|--------|
| R1–R2 | KAI7 raw present + checksum |
| R3 | ≤3 profiles |
| R4 | Scotland and E/W/NI both present, separate |
| R5–R6 | Assumptions + “not tax advice” |
| R7 | Spot liability 2021–22 recomputes |
| R8 | Scotland 2017–22 fingerprint unchanged |
| R9–R10 | E/W/NI effective rate rises; counterfactual extra tax > 0 by end year |

---

## Validation ask — `EC-VAL-06E-DRAG`

**Task:** Independently re-check fiscal-drag artefacts vs raw KAI7 and curated statute tables; file pass/fail under `data/qa/`.

Suggested checks:

1. `kai7_emp.json` SHA-256 ↔ manifest / `SHA256SUMS`; ONS title/CDID/releaseDate present.  
2. Recompute tax-year means for **2021–22** and **2025–26** from raw months (Apr–Mar) ×52 ↔ `awe_kai7_tax_year.csv`.  
3. Recompute one E/W/NI liability year (e.g. `ewni_awe_scaled` 2021–22 and 2025–26) from PA + bands ↔ JSON `band_steps`.  
4. Confirm E/W/NI counterfactual indexes PA/basic upper by KAI7 only (rates not invented).  
5. Confirm Scotland profile uses Scotland rows — not E/W/NI copy — for each year.  
6. Confirm Scotland **2017–18…2022–23** band CSV fingerprint unchanged vs prior SCOT PASS.  
7. Confirm status=`documented`, `ready=false`, no frontend / no Ready claim by Economy.  
8. Confirm exclusions (NICs etc.) documented; educational disclaimer present.

### Blockers for Validation

- None for Economy self-consistency.  
- Independent Validation must still run (`EC-VAL-06E-DRAG`).  
- Fiscal-drag **UI** remains out of scope until Validation PASS + Review Gate.  
- Do **not** mark Registry Ready for this artefact alone (Orchestrator).

---

## Notion

- **Registry (do not flip Ready):** https://app.notion.com/p/4196547176858177bf79d15680c0c264  
- Domain 06 §E note: fiscal drag documented (KAI7); ask `EC-VAL-06E-DRAG`.
