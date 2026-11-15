# Validation kickoff — Economy 07 · real-terms pins (EC-VAL-07C)

**Owner:** Validation · **Date:** 2026-11-15  
**Domain:** [07 · Public Spending & Services](https://app.notion.com/p/41465471768581df9c9ad184839231b7)  
**Handover:** [handover-economy-07-real-pin.md](handover-economy-07-real-pin.md)  
**Economy kickoff:** [agent-kickoff-economy-07-real-pin.md](agent-kickoff-economy-07-real-pin.md)  
**Registry:** [Real DEL / AME](https://app.notion.com/p/419654717685815ba4c7d9d669dd661b) · [Real TES / COFOG](https://app.notion.com/p/4196547176858116bd53d358fb541942) (Validation)

## Scope

Independent QA only — do **not** rewrite curated files. File under `data/qa/`.

| Indicator | Package | Unit |
|-----------|---------|------|
| `tme-del-ame-real` | `data/economy/tme-del-ame-real/` | £ million, 2025-26 prices |
| `tes-by-function-real` | `data/economy/tes-by-function-real/` | £ billion, 2025-26 prices |

Read-only cross-check vs nominal Ready siblings `tme-del-ame` / Table 4.2 spots — do **not** require equality except where price base says so (2025-26).

### Checks

| ID | Check |
|----|-------|
| R1 | Table 1.2: Total DEL + Departmental AME + Other AME = table TME for pinned years; Other AME present (incl. negative 2021-22) |
| R2 | Resource DEL 2025-26 = **496,670** (price-base = nominal); Total DEL is published row, not resource+capital rebuild |
| R3 | Table 4.3 Health 2024-25 = **250.8** £bn vs workbook; vs nominal Table 4.2 Health **242.4** as context only |
| R4 | 2025-26 real = nominal for curated Table 4.3 series that have a Table 4.2 twin (price-base year) |
| R5 | Manifests: 2025-26 prices · ONS GDP deflator note · **not** monthly EBFT · no Exchange-derived deflator of EBFT |
| R6 | 2025-26 `estimated`; no plan years; £m and £bn packages not mixed |
| R7 | Raw sha256 ↔ manifests; no OSCAR; no residual function invented for leaf gaps |
| C-extra | Row counts ~20 and ~322; of-which skipped documented |

## Out of scope

Frontend; Ready flip (Orchestrator after PASS); monthly EBFT real series; ESA/OSCAR.

## Done means

`data/qa/qa_report_economy_07_real_2026-11-15.md` (+ optional `src/validation/` script). Recommend Ready on pass for both rows.
