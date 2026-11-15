# QA report — Regions employment geography (HI00) · 2026-11-15

## Scope

- Task: VAL-RG-EMP-GEO
- Handover: `docs/handover-regions-employment-geography.md`
- Script: `validation.qa_regions_employment_geography_2026_11_15`
- Indicators: `employment-rate-by-region` · `unemployment-rate-by-region` · `economic-inactivity-rate-by-region`
- Vintage: HI00 `regionaltable1s.xlsx` release **2026-10-20** (sha `ff374cf9…`)

## Independence

Disk raw + curated only. Confirms 16–64 employment/inactivity columns (not 16+ mis-parse),
ILO unemployment 16+, bulletin Table 1 Jun–Aug 2026 spots, no invented UK/GB totals.

## Checks

| ID | Check | Result | Notes |
|----|-------|--------|-------|
| C1 | employment-rate-by-region files | **pass** | regionaltable1s.xlsx |
| C1 | employment-rate-by-region checksum | **pass** | ff374cf96c5fa18a |
| C2 | employment-rate-by-region age label | **pass** | % of population aged 16-64, SA |
| C3 | employment-rate-by-region row count | **pass** | 5343 |
| C3 | employment-rate-by-region provisional count | **pass** | 13 |
| C4 | employment-rate-by-region no UK/GB invent | **pass** | geos=13 |
| C5 | employment-rate-by-region E12000001 | **pass** | got=70.5 expected=70.5 |
| C5 | employment-rate-by-region E12000002 | **pass** | got=74.9 expected=74.9 |
| C5 | employment-rate-by-region E12000003 | **pass** | got=72.9 expected=72.9 |
| C5 | employment-rate-by-region E12000004 | **pass** | got=76.3 expected=76.3 |
| C5 | employment-rate-by-region E12000005 | **pass** | got=72.5 expected=72.5 |
| C5 | employment-rate-by-region E12000006 | **pass** | got=77.7 expected=77.7 |
| C5 | employment-rate-by-region E12000007 | **pass** | got=74.5 expected=74.5 |
| C5 | employment-rate-by-region E12000008 | **pass** | got=78.6 expected=78.6 |
| C5 | employment-rate-by-region E12000009 | **pass** | got=79.2 expected=79.2 |
| C5 | employment-rate-by-region E92000001 | **pass** | got=75.6 expected=75.6 |
| C5 | employment-rate-by-region W92000004 | **pass** | got=73.3 expected=73.3 |
| C5 | employment-rate-by-region S92000003 | **pass** | got=74.0 expected=74.0 |
| C5 | employment-rate-by-region N92000002 | **pass** | got=72.5 expected=72.5 |
| C6 | NE not 16+ misparse | **pass** | 70.53053316771275 |
| C1 | unemployment-rate-by-region files | **pass** | regionaltable1s.xlsx |
| C1 | unemployment-rate-by-region checksum | **pass** | ff374cf96c5fa18a |
| C2 | unemployment-rate-by-region age label | **pass** | % of economically active aged 16 and over, SA |
| C3 | unemployment-rate-by-region row count | **pass** | 5343 |
| C3 | unemployment-rate-by-region provisional count | **pass** | 13 |
| C4 | unemployment-rate-by-region no UK/GB invent | **pass** | geos=13 |
| C5 | unemployment-rate-by-region E12000001 | **pass** | got=4.7 expected=4.7 |
| C5 | unemployment-rate-by-region E12000002 | **pass** | got=4.6 expected=4.6 |
| C5 | unemployment-rate-by-region E12000003 | **pass** | got=5.2 expected=5.2 |
| C5 | unemployment-rate-by-region E12000004 | **pass** | got=4.7 expected=4.7 |
| C5 | unemployment-rate-by-region E12000005 | **pass** | got=5.7 expected=5.7 |
| C5 | unemployment-rate-by-region E12000006 | **pass** | got=3.9 expected=3.9 |
| C5 | unemployment-rate-by-region E12000007 | **pass** | got=6.6 expected=6.6 |
| C5 | unemployment-rate-by-region E12000008 | **pass** | got=4.2 expected=4.2 |
| C5 | unemployment-rate-by-region E12000009 | **pass** | got=3.8 expected=3.8 |
| C5 | unemployment-rate-by-region E92000001 | **pass** | got=4.9 expected=4.9 |
| C5 | unemployment-rate-by-region W92000004 | **pass** | got=3.4 expected=3.4 |
| C5 | unemployment-rate-by-region S92000003 | **pass** | got=4.3 expected=4.3 |
| C5 | unemployment-rate-by-region N92000002 | **pass** | got=2.1 expected=2.1 |
| C1 | economic-inactivity-rate-by-region files | **pass** | regionaltable1s.xlsx |
| C1 | economic-inactivity-rate-by-region checksum | **pass** | ff374cf96c5fa18a |
| C2 | economic-inactivity-rate-by-region age label | **pass** | % of population aged 16-64, SA |
| C3 | economic-inactivity-rate-by-region row count | **pass** | 5343 |
| C3 | economic-inactivity-rate-by-region provisional count | **pass** | 13 |
| C4 | economic-inactivity-rate-by-region no UK/GB invent | **pass** | geos=13 |
| C5 | economic-inactivity-rate-by-region E12000001 | **pass** | got=25.5 expected=25.5 |
| C5 | economic-inactivity-rate-by-region E12000002 | **pass** | got=21.6 expected=21.6 |
| C5 | economic-inactivity-rate-by-region E12000003 | **pass** | got=23.0 expected=23.0 |
| C5 | economic-inactivity-rate-by-region E12000004 | **pass** | got=20.0 expected=20.0 |
| C5 | economic-inactivity-rate-by-region E12000005 | **pass** | got=22.8 expected=22.8 |
| C5 | economic-inactivity-rate-by-region E12000006 | **pass** | got=19.0 expected=19.0 |
| C5 | economic-inactivity-rate-by-region E12000007 | **pass** | got=20.1 expected=20.1 |
| C5 | economic-inactivity-rate-by-region E12000008 | **pass** | got=17.9 expected=17.9 |
| C5 | economic-inactivity-rate-by-region E12000009 | **pass** | got=17.5 expected=17.5 |
| C5 | economic-inactivity-rate-by-region E92000001 | **pass** | got=20.4 expected=20.4 |
| C5 | economic-inactivity-rate-by-region W92000004 | **pass** | got=24.0 expected=24.0 |
| C5 | economic-inactivity-rate-by-region S92000003 | **pass** | got=22.6 expected=22.6 |
| C5 | economic-inactivity-rate-by-region N92000002 | **pass** | got=25.9 expected=25.9 |
| C7 | ILO not Claimant | **pass** | manifest distinguishes measure |

## Summary

- **Verdict: pass** (59 pass / 0 warn / 0 fail)
- Recommend Orchestrator **Ready** flip + cloud load for all three.
- Economy Geography tab: wire after Ready; Follow Regions — do not fork under `data/economy/`.
- Re-pin after **17 Nov 2026** HI00 / regional LMS.

## Blockers

- None for Ready on the three HI00 series.
