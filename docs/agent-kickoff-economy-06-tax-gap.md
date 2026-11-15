# Kickoff — Economy Domain 06 · The Tax Gap (evidence pin)

**Notion plan:** [06 · Taxation & Revenue](https://app.notion.com/p/414654717685816bb414e87ccbd501fc) §F  
**UI (later):** `/economy?domain=tax&view=gap` — EmptyStage today  
**Work plan:** `EC-G2-06F`  
**Owner:** Economy · **Paths:** `src/economy/`, `data/economy/` only  
**Opened:** 2026-11-15  
**Skill:** `.cursor/skills/economy-agent/SKILL.md`

**Question:** What does HMRC estimate as the gap between theoretical tax liabilities and tax collected — by tax type and published reason category?

## Non-negotiables

- **No frontend.**
- Use **HMRC Measuring tax gaps** published tables/methodology only.
- Do **not** equate the whole gap with deliberate evasion/fraud.
- Do **not** treat estimates as observed incidents.
- Label methodological breaks / vintage changes; do not splice incompatible years without Notes.
- Units, tax year vs financial year, and geography explicit.
- Headline percentages/£bn only with the same definitions HMRC publishes for that vintage.

## Candidate sources

- https://www.gov.uk/government/statistics/measuring-tax-gaps-tables (and latest bulletin/methodology)
- HMRC Measuring tax gaps main statistics page / PDF annexes as needed

## Deliverables

1. Source matrix: which tables, years, tax types, reason categories, uncertainty notes, licence.
2. Package `data/economy/hmrc-tax-gap/` (or justified id `measuring-tax-gaps`) — raw snapshots + checksums, curated observations/tables, manifest, self-QA.
3. Connector under `src/economy/connectors/`.
4. `docs/handover-economy-06-tax-gap.md` + Validation ask `EC-VAL-06F`.
5. Notion registry at **Validation**; Domain 06 Phase 4 notes.

## Do not

- Invent gap components or attribute “evasion” beyond HMRC’s own category labels.
- Mark Ready without Validation.
- Replace EmptyStage.

## Done means

Validation can match curated headline and ≥2 breakdown cells to the published HMRC table for the pinned vintage.
