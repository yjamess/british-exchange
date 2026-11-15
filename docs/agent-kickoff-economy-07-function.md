# Kickoff — Economy Domain 07 · Where spending goes + DEL vs AME (source discovery)

**Notion plan:** [07 · Public Spending & Services](https://app.notion.com/p/41465471768581df9c9ad184839231b7)  
**Parent handover:** [handover-economy-07-spending.md](handover-economy-07-spending.md)  
**Prior kickoff:** [agent-kickoff-economy-07-spending.md](agent-kickoff-economy-07-spending.md)  
**Work plan:** `EC-G2-07B`  
**Owner:** Economy · **Paths:** `src/economy/`, `data/economy/` only  
**Opened:** 2026-11-15 · Wave B deepen (mirror Tax Anatomy discovery)  
**Skill:** `.cursor/skills/economy-agent/SKILL.md`

**Question:** Can we show (1) where managed expenditure goes by function / services framework, and (2) DEL vs AME control totals — each honestly labelled, without inventing shares that sum to monthly EBFT / TME?

**Experiences (currently EmptyStage):**

| View | Role |
|------|------|
| `/economy?domain=spending&view=function` | **Where spending goes** |
| `/economy?domain=spending&view=delame` | **DEL vs AME** |

## Non-negotiables

- **No frontend.** Dataset discovery + matrix + handover only. Do not edit `web/src/brand/economy/**`.
- **Do not ingest** function / DEL / AME / TES / COFOG series until a path is proven and Orchestrator opens a pin task.
- **Never** invent COFOG / OSCAR shares that sum to `total-managed-expenditure` (EBFT).
- **Never** chart Tax − Spend = Borrow as a closed identity (link Domains 06 / 08 only).
- **Never** equate TME with “services people receive” without a labelled gap (TES / COFOG ≠ EBFT).
- Real-terms only if an **official** deflator series (or documented Exchange method) is found — otherwise leave as a gap note in the matrix.
- Do not touch Energy/Housing trees except to read link IDs.

## Start from (already done Phase 0 + G3 flagship)

| Artefact | Path |
|----------|------|
| Flagship pin | `data/economy/total-managed-expenditure/` (EBFT Ready · cloud release 55) |
| Inventory | `docs/handover-economy-07-spending.md` §2.2–2.3 |
| Live UI | `/economy?domain=spending` — spends Ready; function + delame EmptyStage |
| QA | `data/qa/qa_report_economy_07_tme_2026-11-14.md` |

## Preferred source order (investigate in this order)

1. **PESA / Public Spending Statistics** — TES function tables (Ch.4–5); budgeting DEL/AME; Table 1.1 path to TME.  
   Collections: [PESA](https://www.gov.uk/government/collections/public-expenditure-statistical-analyses-pesa) · [PSS](https://www.gov.uk/government/collections/national-statistics-release)
2. **ONS ESA Table 11** — annual COFOG (calendar years). Official functions; not monthly EBFT.
3. **HMT OSCAR II** — departmental / Control Budget (DEL/AME) transparency. Document the published limit: **cannot exactly tie** OSCAR in-year aggregates to National Accounts / PSF. Never propose OSCAR org pies as TME composition.
4. Real-terms tables in PESA/PSS (HMT GDP deflator) — inventory only unless a clean pin path exists.

## Deliverables (this task)

1. **Source matrix** — write `docs/economy-07-spending-source-matrix.md`:
   - For each candidate: publisher, URL / table id, accounting framework (TES · COFOG · DEL/AME · OSCAR · National Accounts), unit, frequency, geography, licence, history depth.
   - Whether it may appear under **Where spending goes**, **DEL vs AME**, or must stay a separate labelled instrument.
   - Explicit **reconcile verdict** per experience:
     - Function: `path-found-tes-cofog` | `path-found-esa-table-11` | `oscar-only-not-tme` | `no-clean-path` | `needs-table-pin`
     - DEL/AME: `path-found-pss-table-1-1` | `path-found-pesa-budgeting` | `oscar-control-budget` | `no-clean-path` | `needs-table-pin`
   - Spot-check at least one published table row (document date + value + source URL). Prefer PESA 2026 / latest PSS.
2. **Recommendation** — preferred first instrument(s) for G3, with provisional indicator ID(s) if a path is found. If no clean path, say so and list blockers. Prefer **TES/COFOG labelled as TES** over forcing a false EBFT stack.
3. **Notion** — update Domain 07 experience states / deepen notes (inventory deepen complete; ingest still gated).
4. **Handover** — `docs/handover-economy-07-function.md` with file list + Validation ask (if any pin recommended).

## Do not

- Create registry Ready claims or curated observations for new series in this pass (Inbox draft IDs in the matrix only).
- Build Function / DEL·AME UI or replace EmptyStage.
- Mix TES slices into an EBFT total chart recipe.
- Invent residual identities with Tax or Debt.

## Done means

Orchestrator can decide: open ingest + Validation for one or both EmptyStages, or keep EmptyStage with an honest Notes line from your matrix.
