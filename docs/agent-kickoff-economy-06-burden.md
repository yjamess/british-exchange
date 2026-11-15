# Kickoff — Economy Domain 06 · Who Bears the Tax Burden? (evidence pin)

**Notion plan:** [06 · Taxation & Revenue](https://app.notion.com/p/414654717685816bb414e87ccbd501fc) §D  
**UI (later):** `/economy?domain=tax&view=burden` — EmptyStage today  
**Work plan:** `EC-G2-06D`  
**Owner:** Economy · **Paths:** `src/economy/`, `data/economy/` only  
**Opened:** 2026-11-15  
**Skill:** `.cursor/skills/economy-agent/SKILL.md`

**Question:** How do estimated direct and indirect tax burdens differ across household income groups — and how does the picture change with the denominator?

## Non-negotiables

- **No frontend.** Dataset + handover only.
- Prefer ONS **Effects of taxes and benefits on household income** (latest FYE bulletin/tables).
- Distinguish **direct** vs **indirect** taxes; label **income** vs **expenditure** denominators only where the publisher supports each.
- Equivalisation, quintile/decile definitions, survey uncertainty in Notes/manifest.
- Legal liability ≠ economic incidence. No “fairness” claims. Group averages ≠ what a household pays.
- Reuse Domain 04 household series by link if already pinned — **no fork**.
- Do not invent shares or join incompatible tables into one “burden total”.

## Candidate sources (verify, then pin)

- ONS Effects of taxes and benefits bulletin + datasets (FYE 2024 or later if published)
- Related ONS redistribution / household income tables only if they share definitions

## Deliverables

1. Source matrix note or section in handover: tables, years, geography, units, direct/indirect, denominators, licence.
2. Package under `data/economy/` with locked indicator id(s) you justify (e.g. `effects-of-taxes-and-benefits` or split direct/indirect).
3. Connector + raw checksums + curated + manifest + self-QA.
4. `docs/handover-economy-06-burden.md` + Validation ask `EC-VAL-06D`.
5. Notion registry row(s) at **Validation** (not Ready). Update Domain 06 Phase 3 notes.

## Do not

- Ship Burden UI or replace EmptyStage.
- Mark Ready without Validation.
- Treat survey averages as individual liabilities.

## Done means

Validation can spot-check published table cells vs curated; Orchestrator can schedule Ready + G3 after PASS.
