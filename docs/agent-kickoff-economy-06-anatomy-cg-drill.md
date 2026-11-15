# Kickoff — Economy Domain 06 · Anatomy CG drill under MF6P

**Notion plan:** [06 · Taxation & Revenue](https://app.notion.com/p/414654717685816bb414e87ccbd501fc) §C  
**Parent Ready:** `tax-receipts-composition` (AHHY four heads) · [handover-economy-06-anatomy-pin.md](handover-economy-06-anatomy-pin.md)  
**Matrix:** [economy-06-anatomy-source-matrix.md](economy-06-anatomy-source-matrix.md)  
**Work plan:** `EC-G2-06B-DRILL`  
**Owner:** Economy · **Paths:** `src/economy/`, `data/economy/` only  
**Opened:** 2026-11-15  
**Skill:** `.cursor/skills/economy-agent/SKILL.md`

**Question:** Can we drill **MF6P** (central government taxes) into published Appendix D / PUSF leaves that still reconcile — without HMRC cash under AHHY?

## Non-negotiables

- **No frontend.** Pin + identity checks only.
- **Never** stack HMRC cash under AHHY / MF6P.
- Prefer one **sibling** indicator (proposed id e.g. `tax-receipts-cg-composition`) that drills MF6P — do **not** rewrite the Ready four-head AHHY identity package unless Orchestrator asks.
- Leaves must be ONS NAB / Appendix D / PUSF family only.
- Document residuals only if the publisher’s accounting supports them.

## Preferred first drill (from matrix)

Under MF6P, pin the published CG subtotals that check:

`NMBY + NMCU + LIQR = MF6P`

Optional second depth (only if first identity holds and sources are clean): leaves under NMCU / NMBY such as **LIBR** (IT+CGT), **NZGF** (VAT), **CPRN**, etc. — stop before inventing a residual from an incomplete CDID set.

## Deliverables

1. Source confirmation + raw pins (PUSF JSON and/or Appendix D workbook columns) + checksums.
2. Package under `data/economy/<indicator-id>/` with curated observations, identity check JSON (≥3 months exact vs MF6P), README, self-QA.
3. Connector under `src/economy/connectors/`.
4. `docs/handover-economy-06-anatomy-cg-drill.md` + Validation ask `EC-VAL-06B-DRILL`.
5. Notion registry row at **Validation**.

## Do not

- Edit Anatomy / Tax React UI.
- Mix HMRC cash CDIDs into the drill.
- Replace `tax-receipts-composition` four-head identity.
- Mark Ready.

## Done means

Validation can recompute `sum(leaves) = MF6P` on sample months from curated vs raw.
