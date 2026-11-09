# QA — Housing Domain 08 Housing Insecurity · 2026-11-04

**Owner:** Validation (spot checks)  
**Scope:** England H-CLIC/TA headlines, rough sleeping, MoJ, Table 600/CORE, Census concealed, devolved TA stubs.  
**Verdict:** **PASS** on research headlines and stocks-vs-flows labelling. Devolved rows are bulletin transcriptions (not ODS SPARQL) — Ready with caveats.

## Research headlines (must match MHCLG / MoJ / ONS)

| Claim | Curated value | Source check | Result |
|-------|---------------|--------------|--------|
| TA households 31 Mar 2026 | 135,580 | England TA1 time series 202603 | PASS |
| Children in TA 31 Mar 2026 | 177,530 | Same | PASS |
| Owed prevention/relief Jan–Mar 2026 | 83,850 | A1 `owed-prevention-or-relief` | PASS |
| Rough sleeping autumn 2025 | 4,793 | Snapshot Table 1 England | PASS |
| Concealed families England Census 2021 | 352,979 | CT21_0451 (concealed types only) | PASS (type sum) |
| Homelessness net spend 2024-25 | 2,146,961 £ thousand | RO4 England row E92000001, TOTAL HOMELESSNESS C7 | PASS |
| Homelessness gross spend 2024-25 | 3,721,973 £ thousand | Same row, C3 | PASS |
| Rough sleeping framework June 2026 | 8,748 people over the month | Table 1 England (management information) | PASS |

## Stocks vs flows

- Assessments / A3 / P1 / R1 / MD1 / MD3 / MoJ / CORE → `measure=flow` in notes.
- TA stocks / duration / out-of-area / rough sleeping / Table 600 / concealed / devolved TA → `measure=stock`.
- Pathways UI labels measure type on each node.

## Geography / jurisdiction

- England H-CLIC labelled `E92000001`.
- MoJ possession is England & Wales (`K04000001`) — not England-only.
- Devolved TA (`homelessness-devolved-ta`) separate codes; must not be summed with England.

## Open / deferred

- Scotland SPARQL endpoint returned HTML; devolved figures transcribed from bulletins.
- Notion registry rows created in the same pass as this addendum (see work plan).

## Addendum — spend and framework

- `temporary-accommodation-spend`: published England row only (not a re-sum of authorities). Annual flow, £ thousand, non-IAS19. Do not divide by the TA household stock.
- `rough-sleeping-framework`: Table 1 (people over the month) and Table 3 (single-night management information), England, regions and local authorities. Status provisional. Not the autumn snapshot (4,793).

## Files

- Kickoff: `docs/agent-kickoff-insecurity.md`
- Connectors: `housing_insecurity.py`, `possession_claims.py`, `social_housing_lettings.py`, `concealed_households.py`, `devolved_homelessness.py`, `temporary_accommodation_spend.py`, `rough_sleeping_framework.py`
