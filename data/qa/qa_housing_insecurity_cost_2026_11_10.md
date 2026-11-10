# QA addendum — Domain 08 Cost of Insecurity + TA net change · 2026-11-10

**Owner:** Validation  
**Scope:** Multi-year RO4 England spend reload; Temporary Life net stock change honesty.  
**Verdict:** **PASS** on pin checks. Gross TA entries/exits remain a labelled gap.

## Spend (temporary-accommodation-spend)

| Claim | Curated value | Source check | Result |
|-------|---------------|--------------|--------|
| Homelessness net 2024-25 | 2,146,961 £ thousand | Revenue Outturn multi-year CSV England `E92000001`, year_ending 202503 | PASS |
| Homelessness gross 2024-25 | 3,721,973 £ thousand | Same row | PASS |
| Homelessness net 2025-26 | 2,344,200 £ thousand | Same file, year_ending 202603 | PASS (published multi-year cell) |
| Observation count | 120 | 6 years × 10 lines × net/gross | PASS |
| Geography | England only | Connector reads published England row; does not re-sum LAs | PASS |

Caveats unchanged: annual money flow; non-IAS19; do not divide by TA household stock; compare total homelessness across years, not every TA type.

## Temporary accommodation net stock change

- Derived in UI from consecutive England quarter-end stocks (`temporary-accommodation-households`).
- Net change = entries − exits. Separate gross entry and exit counts are **not** in MHCLG open live tables (`TA1`–`TA9` are stocks; annual flows ODS `F1`–`F3` are HRA duty cohorts).
- Labelled gap: Secure Access / IDS microdata only for enter/leave dates — out of Exchange open-data scope.

## Cost of Insecurity UI

- New Housing Insecurity view `cost` wired to RO4 series + March-end TA stock chart for context.
- Notes forbid cost-per-household maths.

## Files

- Connector: `src/housing/connectors/temporary_accommodation_spend.py`
- View: `web/src/brand/housing/canvas/insecurity/CostOfInsecurity.tsx`
- Temporary Life net panel: `web/src/brand/housing/canvas/insecurity/TemporaryLife.tsx`
