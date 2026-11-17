# Validation kickoff — Economy 07 · long-run + ESA (EC-VAL-07D / EC-VAL-07E)

**Owner:** Validation · **Date:** 2026-11-15  
**Domain:** [07 · Public Spending & Services](https://app.notion.com/p/41465471768581df9c9ad184839231b7)  
**Handover:** [handover-economy-07-longrun-esa.md](handover-economy-07-longrun-esa.md)  
**Economy kickoff:** [agent-kickoff-economy-07-longrun-esa.md](agent-kickoff-economy-07-longrun-esa.md)  
**OSCAR memo (context only):** [economy-07-oscar-decision-memo.md](economy-07-oscar-decision-memo.md)  
**Registry:** [long-run TES](https://app.notion.com/p/4196547176858108be4bd40a2251cd7b) · [ESA GG](https://app.notion.com/p/41965471768581f88f08d3b6a730dc52) (Validation)

## Scope

Independent QA — do **not** rewrite curated files. One report may cover both packages.

| ID | Indicator | Package |
|----|-----------|---------|
| EC-VAL-07D | `tes-by-function-long-run` | `data/economy/tes-by-function-long-run/` |
| EC-VAL-07E | `esa-gg-expenditure-by-function` | `data/economy/esa-gg-expenditure-by-function/` |

### EC-VAL-07D — Table 4.2

| ID | Check |
|----|-------|
| L1 | Health 2024-25 = **242.4** £bn vs workbook; Social protection **386.3**; TES **1,166.5**; TME **1,290.0** |
| L2 | Unit £ billion · FY 2003-04→2025-26 · 2025-26 estimated · no mix into £m `tes-by-function` |
| L3 | No residual function; leaf/bridge gaps ≤~£0.2bn documented; of-which skipped |
| L4 | Raw sha256 ↔ manifest; no OSCAR; not monthly EBFT |

### EC-VAL-07E — ESA Table 11

| ID | Check |
|----|-------|
| E1 | Calendar 2024 OTE: Total **1,330,532** · Health **253,191** · Education **141,118** · Social protection **458,500** |
| E2 | Manifest: calendar year · **general government** · £ million · not TES / not EBFT |
| E3 | Coversheet “local government only” contradicted by year-sheet + sibling CG/LG totals — documented |
| E4 | Level-1 sum vs published total (expect exact); sub-functions not curated |
| E5 | Raw sha256 ↔ manifest; Health ESA ≠ TES Health without claiming equality |

### OSCAR

Confirm memo exists and **no** curated OSCAR package under `data/economy/`. Not a fail of D/E pins.

## Out of scope

Frontend; Ready flip; OSCAR ingest; Gate 4.

## Done means

`data/qa/qa_report_economy_07_longrun_esa_2026-11-15.md` (+ optional script). Recommend Ready on pass for both rows.
