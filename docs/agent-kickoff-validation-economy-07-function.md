# Validation kickoff — Economy 07 · tes-by-function + tme-del-ame (EC-VAL-07B)

**Owner:** Validation · **Date:** 2026-11-15  
**Domain:** [07 · Public Spending & Services](https://app.notion.com/p/41465471768581df9c9ad184839231b7)  
**Handover:** [handover-economy-07-function-pin.md](handover-economy-07-function-pin.md)  
**Economy kickoff:** [agent-kickoff-economy-07-function-pin.md](agent-kickoff-economy-07-function-pin.md)  
**Discovery matrix:** [economy-07-spending-source-matrix.md](economy-07-spending-source-matrix.md)  
**Registry:** [TES / COFOG](https://app.notion.com/p/41965471768581c5a15bea3cca34d474) · [DEL / AME](https://app.notion.com/p/419654717685815dbb3de6db75d6a00d) (Validation)

## Scope

Independent QA only — do **not** rewrite curated files. File under `data/qa/`.

| Indicator | Package |
|-----------|---------|
| `tes-by-function` | `data/economy/tes-by-function/` |
| `tme-del-ame` | `data/economy/tme-del-ame/` |

Read-only cross-check Ready `total-managed-expenditure` (EBFT) for the documented FY vs monthly gap — **do not** require equality.

### Checks (V1–V7)

| ID | Check |
|----|-------|
| V1 | Table 5.4: current TES + capital TES = total TES (document 2023-24 £1m rounding); total TES + accounting adjustments = table TME every year |
| V2 | Health 2024-25 current 228,613 + capital 13,816 = **242,429** vs curated + raw XLSX |
| V3 | Level-1 + EU vs published TES gap £0–2m documented; **no** invented residual function in curated |
| V4 | Table 1.1: Total DEL + Departmental AME + Other AME = table TME every year (2024-25 = **1,290,012**); Other AME present |
| V5 | Manifests say HMT financial-year TES / table TME, **not** monthly EBFT; copy does not equate TME with services; no Tax−Spend=Borrow; no OSCAR rows |
| V6 | 2025-26 marked `estimated` (or equivalent); no PESA plan years |
| V7 | ESA / OSCAR / Table 4.2 absent from packages (correct) |
| C-extra | Raw sha256 ↔ manifests; both packages share identical table TME for all five years; Total DEL ≠ resource+capital DEL rebuild |

## Out of scope

Frontend / EmptyStage UI; Ready flip (Orchestrator after PASS); EBFT re-pin; OSCAR/ESA ingest.

## Done means

`data/qa/qa_report_economy_07_function_delame_2026-11-15.md` (+ optional `src/validation/` script). Recommend Ready on pass for both registry rows.
