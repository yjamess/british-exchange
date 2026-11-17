# Kickoff — Validation · Economy Domain 04 Cost / Ledger (LCF)

**Owner:** Validation  
**Handover:** `docs/handover-economy-04-household-deepen.md` (Cost/Ledger section)  
**Skill:** `.cursor/skills/validation-agent/SKILL.md`

## Series

| Indicator | Source | Path |
|-----------|--------|------|
| `family-spending-by-category` | ONS Family Spending WB1 Table 4.1 | `data/economy/family-spending-by-category/` |
| `family-spending-by-income` | WB1 Tables 3.1E5 + 3.2E5 (two-adult OECD) | `data/economy/family-spending-by-income/` |

## Checks

1. Spot FYE 2025 all-household total £676.60; housing/fuel £118.40; food £73.70; transport £96.40 vs bulletin/workbook.
2. Quintile totals £407.30 / £1,083.60; food share 15.2% lowest; housing share 25.7% lowest — vs 3.1E5/3.2E5 left (two-adult) block.
3. Real £/week FYE 2025 prices on category history; equivalisation Notes present.
4. Manifest checksums; no invented essentials share; Ledger Notes forbid stitching with ETB/RHDI/DGD8.

## Output

`data/qa/qa_report_economy_04_lcf_2026-11-15.md` (+ optional script). Registry → Ready on pass only.

## Do not

Frontend; silent curated edits; Ready Buffer/Debt again; work-plan edits.
