# Gate 1 — The Energy Metabolism · three expressions

Brief: [Energy Consumption](https://app.notion.com/p/410654717685812499c8ca3a99f1b9c2). Same explorer chrome as Housing / Generation; **different** visual language (flows / decomposition).

## A — Classic Sankey (W1 → C1 → optional W2)

```text
Primary (W1)
   → Transformation / Energy industry / Losses / Non-energy
   → Final consumption
        → Industry | Transport | Domestic | Services   (C1 totals)
             → fuels (C1) or end uses (U*, where years allow)
                  → Useful | Rejected (W2, ≥2017 only)
```

**Pros:** Matches “Metabolism” metaphor; W1 already is a destination allocation.  
**Cons:** Easy to imply physical pipes; hard on keyboard / reduced motion; years before 1998 have no W1 spine.

## B — Cutaway systems plate (illustration → charts)

Engraved home / factory / vehicle: click a labelled function → RankBars / TimeChart for that end use (U3 domestic first).

**Pros:** Distinctive; maps cleanly to “Inside Britain’s Energy Use”.  
**Cons:** Weak as the *national* flagship totals view; illustration must never claim a representative dwelling.

## C — Linked stacked composition (clearest numbers)

Year scrubber + stacked sector totals (C1) with Absolute / Share; optional second stack for fuels within the selected sector; small W1 summary strip when year ≥ 1998; W2 useful/rejected as a separate toggle panel (≥2017) with Assumed Efficiencies in Notes.

**Pros:** Honest coverage switches; table-accessible twin; same control grammar as Generation Changing Current; easiest QA vs sourced totals.  
**Cons:** Less “diagrammatic wow” than a full Sankey.

---

## Choice for Gate 2 (recommended)

**Primary flagship: C (linked stacked composition)**, with a **restrained W1 ribbon strip** (not a full crossing Sankey) when the year is in W1 coverage.

- Default view: **All final users** sector stack (C1) for 1970–2025.  
- Select sector → fuel composition (C1).  
- Year ≥ 1998 → show W1 stage strip (primary → destinations).  
- Year ≥ 2017 + explicit “Useful / rejected (modelled)” toggle → W2 bands + assumptions citation.  
- Static stacked comparison always available beside any motion.  
- Full graphic Sankey (A) deferred to Gate 3 polish once C1+W1 ingest and reconciliation notes exist.  
- Cutaway (B) becomes secondary view “Inside Britain’s Energy Use”, starting with **U3 domestic**.

**Why:** Gate 2 definition of done is a trustworthy national flow with synced filters and source pane — C fails less often on coverage and a11y than a dense Sankey.
