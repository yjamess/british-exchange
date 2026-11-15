# QA report — Economy 05 GDP re-pin — 2026-11-14

## Scope

- Economy: `real-gdp` (ABMI/PN2), `real-gdp-per-head` (IHXW/PN2), `business-investment` (NPEL/PN2)
- Trigger: BX-BACK-005 after ONS GDP first quarterly estimate, UK: July to September 2026 ([bulletin](https://www.ons.gov.uk/economy/grossdomesticproductgdp/bulletins/gdpfirstquarterlyestimateuk/julytoseptember2026), released 12 November 2026)
- Not in this pass: `labour-productivity` / `labour-productivity-hours` (PRDY next release **17 November 2026**)

## Source policy note

Orchestrator 2026-11-14: live GDP pins switched **QNA → PN2**. Evidence: QNA `/data` still reported `releaseDate` 2026-09-29 (through 2026 Q2); PN2 advanced on 2026-11-12 with 2026 Q3. Prefer QNA again only when its `releaseDate` is strictly newer.

## Checks

| ID | Check | Result | Notes |
|----|-------|--------|-------|
| C1 | Raw pin present | pass | `raw/2026-11-14/abmi_pn2.json` SHA-256 `e6644cfbad11…`; IHXW `fda097e8d1fc…`; NPEL `c45653e4a153…` |
| C2 | Official release date | pass | All three manifests `official_release_date: 2026-11-12` |
| C3 | New quarter present | pass | Latest period `2026-07-01` (2026 Q3); ABMI 287 q · IHXW 323 · NPEL 119 |
| C4 | Bulletin QoQ Real GDP | pass | Pin 744453 → 749999 = **+0.74%** vs bulletin **+0.7%** (level rounding) |
| C5 | Bulletin YoY Real GDP | pass | vs 2025 Q3 735710 = **+1.94%** vs bulletin **+1.9%** |
| C6 | Bulletin GDP per head QoQ/YoY | pass | QoQ **+0.66%** / YoY **+1.7%** vs bulletin **+0.7%** / **+1.7%** |
| C7 | Q2 levels unchanged vs prior QNA pin | pass | ABMI/IHXW/NPEL 2026 Q2 match previous QNA pin (bulletin: no revisions to previously published quarterly data) |
| C8 | Latest quarter provisional only | pass | `observation_status=provisional` on 2026 Q3 only |
| C9 | Cloud load | pass | `load_ready --via-rest` → release_id **225** (real-gdp), **226** (per-head), **224** (business-investment) |
| C10 | Revisions pack | warn | `economy.gdp-vintage-band` still PN2-Aug vs QNA-Sep rebase slice (intentional). Produce uses live PN2 Nov. Full archive = BX-BACK-008 |

## Summary

- **Verdict:** **Pass** for GDP half of BX-BACK-005
- **Blockers:** none for Produce / Ledger / Data on GDP & per head
- **Remaining:** re-pin LZVB + LZVA after **17 Nov**; optional Engine output index (BX-BACK-009); Anatomy GVA (007); full Revision Archive (008)
- **Recommended next (Orchestrator):** keep registry Ready; schedule Validation re-check after productivity release; do not claim BX-BACK-005 closed until PRDY re-pin
