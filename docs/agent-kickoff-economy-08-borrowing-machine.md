# Kickoff — Economy Domain 08 · The Borrowing Machine

**Notion plan:** [08 · Public Debt & Government Finances](https://app.notion.com/p/414654717685811cb155f725cba481a3) §7B  
**Domain UI:** `/economy?domain=debt&view=machine`  
**Owner:** Orchestrator (UI frame) → Validation (numeric bridge) → Economy (any extra series)  
**Date opened:** 2026-11-14

## Question

How does Britain's measured debt stock change between two dates, and what role does public-sector net borrowing play?

## Status (closed 2026-11-14)

| Layer | Outcome |
|-------|---------|
| **UI** | Conceptual EmptyStage labelled **Deferred** — honest Notes; no numbers |
| **PSNB → PSND** | Validation **fail** — residual material; no invented balancer |
| **REC3 CG cash → ΔCG debt** | Validation **pass** — evidence package Ready; **not** shown as this Machine |
| **Numeric public-sector Machine** | **Deferred research** — needs an official PS borrowing→debt bridge |

Next product priority is **not** Machine numbers: see [debt-instruments G2](agent-kickoff-economy-08-debt-instruments.md) (Debt Anatomy · Who Owns the Debt? · Repayment Calendar).

## What ships now (conceptual)

An Explorer tab labelled **Borrowing machine** with an honest EmptyStage: the relationship is explained in Notes, but **no quantified public-sector stock-flow bridge**.

## What must be true before numbers (deferred)

Visitors must see four separately labelled quantities (never one unmarked axis):

1. Opening public-sector net debt stock (date + £bn) — from `public-sector-net-debt` (HF6W).
2. Total net borrowing over a compatible interval — from `public-sector-net-borrowing` (DZLS), summed or selected with timing documented.
3. Other stock-flow adjustments / reconciliation — **only if** explicitly derived from compatible official definitions and labelled Exchange-derived or official.
4. Closing public-sector net debt stock (date + £bn) — HF6W again.

### Honesty rules (locked)

- Monthly borrowing alone does **not** equal change in debt. Financial transactions, classification and accounting adjustments affect the bridge.
- Do not display invented reconciliations as official series.
- Do not treat `closing − opening − borrowing` as a meaningful isolated driver without documenting calculation, timing and coverage.
- Keep debt (stock), borrowing (flow) and interest (CG flow) visually distinct — same rule as the Debt dial.
- Charts / tables use **final** months only; latest PSF month is provisional.
- Do not label REC3 as a public-sector Borrowing Machine.

## Validation checklist (closed)

- [x] Pick supported open/close dates that exist as valued final HF6W months. (2026-11-14)
- [x] Document how DZLS months map onto that interval (flows = months after open through close inclusive). (2026-11-14)
- [x] Reconcile HF6W change vs sum(DZLS) on sample windows; file residual in `data/qa/` with method. → **fail** — [qa_report_economy_08_borrowing_machine_2026-11-14.md](../data/qa/qa_report_economy_08_borrowing_machine_2026-11-14.md); script `validation.qa_economy_08_borrowing_machine_2026_11_14`
- [x] Residual is material on every sample window (£6bn–£106bn). **Do not** invent a balancing item. ONS FOI-2026-3439: no PSNB↔PSND reconciliation; REC3 is CG cash requirement ↔ CG debt change.
- [x] REC3 evidence pinned 2026-11-14: `cg-cash-debt-reconciliation` + [source matrix](economy-08-borrowing-machine-source-matrix.md) + [decision memo](economy-08-borrowing-machine-decision-memo.md). Gate = **CG cash/debt only**.
- [x] Independent Validation → **pass** 2026-11-14 (`data/qa/qa_report_economy_08_cg_cash_debt_rec3_2026-11-14.md`).
- [ ] Registry row + optional cloud load for REC3 (Orchestrator, separate from Machine UI).
- [ ] Numeric **public-sector** Machine — **deferred** until an official PS bridge exists.

## Do not

- Build a custom flow diagram that implies borrowing explains the whole debt change.
- Derive debt % of GDP from `real-gdp` (ABMI).
- Merge Domains 06/07 into this instrument (Fiscal Balance is a later experience).

## Related pins (already Ready)

| Role | Indicator | CDID |
|------|-----------|------|
| Debt stock | `public-sector-net-debt` | HF6W |
| Borrowing flow | `public-sector-net-borrowing` | DZLS |
| Interest (Cost of debt — separate tab) | `public-sector-debt-interest` | NMFX |
| Official % GDP | `public-sector-net-debt-percent-gdp` | HF6X |
