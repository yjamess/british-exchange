# Kickoff — Economy Domain 06 · Tax Time Machine fiscal drag (queued)

**Status:** **done** (2026-11-15) — Economy self-QA pass; Validation ask `EC-VAL-06E-DRAG`  
**Notion:** [06 · Taxation & Revenue](https://app.notion.com/p/414654717685816bb414e87ccbd501fc) §E  
**Extend:** `tax-machine-income-tax-history` · `curated/fiscal_drag_status.json` → **`documented`** (ONS KAI7)  
**Work plan:** `EC-G2-06E-DRAG` · handover [handover-economy-06-fiscal-drag.md](handover-economy-06-fiscal-drag.md)  
**Owner:** Economy · **Paths:** `src/economy/`, `data/economy/tax-machine-income-tax-history/` only  
**Skill:** `.cursor/skills/economy-agent/SKILL.md`

**Question:** With frozen thresholds, how does a labelled earnings path change statutory liability — with assumptions written down?

## Non-negotiables

- **No frontend calculator** this pass — curated worked examples + assumptions only.
- Verified **earnings measure** required (e.g. named ONS/ASHE/AWE series id + vintage) — no invented wage path.
- Counterfactual assumptions explicit (base year, freeze years, real vs nominal, jurisdiction).
- Scotland and E/W/NI separate examples if both shown.
- Educational — not tax advice.

## Deliverables (when unblocked)

1. Flip `fiscal_drag_status.json` from deferred → documented package path.
2. `curated/fiscal_drag_examples.json` — ≤3 hypothetical profiles with step arithmetic.
3. Raw pin of earnings measure + checksums.
4. Handover `docs/handover-economy-06-fiscal-drag.md` + Validation ask `EC-VAL-06E-DRAG`.

## Do not

- Start while Scotland 2017–22 pin is still writing the same package.
- Invent earnings growth.
- Edit Time Machine React until Validation PASS + Review Gate.
