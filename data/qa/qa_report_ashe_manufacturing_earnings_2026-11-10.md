# QA report — ASHE manufacturing median earnings — 2026-11-10

**Agent:** Validation  
**Overall verdict:** **pass** (Ready)

## Scope

- Indicator: `ashe-manufacturing-earnings`
- Source: ONS ASHE Table 4 (industry by two-digit SIC), **2025 revised** zip
- Raw: `data/energy/ashe-manufacturing-earnings/raw/2026-11-10/ashetable42025revised.zip`
- SHA-256: `df87c313d1cb40bf499f1ec001076bcb9c9884c6443d76b186f09e84ff614bc3`
- Curated: 96 observations (section C + divisions with published medians)
- Connector: `src/energy/connectors/ashe_manufacturing_earnings.py`
- Landing: https://www.ons.gov.uk/employmentandlabourmarket/peopleinwork/earningsandworkinghours/datasets/industry2digitsicashetable4

## Checks

| ID | Check | Result | Notes |
|----|-------|--------|-------|
| C1 | Pin SHA | **pass** | Matches Downloads zip hand-off |
| C2 | Coverage | **pass** | Measures weekly_gross + hourly_ex_ot × sheets All + Full-Time; SIC C + divisions 10–33 where published |
| C3 | Suppressions | **pass** | Tobacco (`12`) and other `:` / `x` cells omitted |
| C4 | Spot vs workbook | **pass** | Full-Time weekly Manufacturing C median **£774.0**; Full-Time hourly ex-OT C **£18.96**; food (`10`) weekly FT **£662.6** |
| C5 | No aggregate duplicate | **pass** | Coded `'C` row only — "All Manufacturing" blank-code row skipped |
| C6 | Method honesty | **pass** | Median only; cash £; job counts in notes as indicative; not Workforce Jobs / BRES |

## Close

Ready for Domain 09 Pay tab. Postgres loaded 2026-11-10 (release_id=145). Multi-year spine and real £ (CPIH) remain optional later.
