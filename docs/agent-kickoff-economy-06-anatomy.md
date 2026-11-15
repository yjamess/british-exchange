# Kickoff — Economy Domain 06 · Anatomy of Revenue (reconcile discovery)

**Notion plan:** [06 · Taxation & Revenue](https://app.notion.com/p/414654717685816bb414e87ccbd501fc)  
**Parent handover:** [handover-economy-06-tax.md](handover-economy-06-tax.md)  
**Prior kickoff:** [agent-kickoff-economy-06-tax.md](agent-kickoff-economy-06-tax.md)  
**Work plan:** `EC-G2-06B`  
**Owner:** Economy · **Paths:** `src/economy/`, `data/economy/` only  
**Opened:** 2026-11-15 · Wave B deepen  
**Skill:** `.cursor/skills/economy-agent/SKILL.md`

**Question:** Can we show tax-type composition that honestly relates to a stated aggregate — without mixing HMRC cash into ONS AHHY accruals?

**Experience:** **Anatomy of Revenue** — currently EmptyStage on `/economy?domain=tax&view=anatomy`.

## Non-negotiables

- **No frontend.** Dataset discovery + matrix + handover only. Do not edit `web/src/brand/economy/**`.
- **Do not ingest** component series until a reconcile path is proven and Orchestrator opens a pin task.
- **Never** add HMRC cash heads to AHHY and claim they sum. Two allowed futures only:
  1. **ONS NAB / PSF** components documented as composing AHHY (or another named PS aggregate), **or**
  2. A **separate cash composition** instrument labelled HMRC cash (own registry rows; never stacked under AHHY total).
- No tax/GDP derivation. No residual Tax−Spend identities.
- Do not touch Energy/Housing trees except to read link IDs.

## Start from (already done Phase 0)

| Artefact | Path |
|----------|------|
| Flagship pin | `data/economy/tax-receipts/` (AHHY Ready) |
| Breakdown inventory | `docs/handover-economy-06-tax.md` §2.2 |
| Candidates noted | ONS KSS8 / NZGF / CPRN; PSA6D / PSA7D; HMRC cash CDIDs; Appendix D; ESA NTL |

## Deliverables (this task)

1. **Source matrix** — write `docs/economy-06-anatomy-source-matrix.md`:
   - For each candidate: publisher, URL/CDID, accounting basis (accruals vs cash), unit, frequency, geography, licence, whether it can appear under AHHY or must be a separate cash stack.
   - Explicit **reconcile verdict**: `path-found-ons-nab` | `path-found-hmrc-cash-only` | `no-clean-path` | `needs-table-pin`.
   - Spot-check at least one published PSF/HMRC table row against a live timeseries fetch where possible (document date + value).
2. **Recommendation** — one preferred first instrument for G3 (with indicator ID proposal if path found). If no clean path, say so and list blockers.
3. **Notion** — update Domain 06 Phase 1 Anatomy checkbox notes / status (inventory deepen complete; ingest still gated).
4. **Handover addendum** — short section appended to or file `docs/handover-economy-06-anatomy.md` with file list + Validation ask (if any pin recommended).

## Do not

- Create registry Ready claims or curated observations for components in this pass (Inbox draft IDs in the matrix only).
- Build Anatomy UI or replace EmptyStage.
- Mix frameworks in a proposed chart recipe.

## Done means

Orchestrator can decide: open ingest + Validation, or keep EmptyStage with an honest Notes line from your matrix.
