# QA report — ASHE region × industry earnings — 2026-11-11

**Agent:** Economy (request for Validation)  
**Overall verdict:** **pass (pending Validation sign-off)**  
**Registry target:** Inbox → **Validation**

| Indicator | Verdict | Ready recommendation |
|-----------|---------|----------------------|
| `ashe-region-industry-earnings` | **pass (Economy)** | **Validation**; Ready after sample QA |

## Scope

- Pack: `data/economy/ashe-region-industry-earnings/`
- Connector: `economy.connectors.ashe_region_industry_earnings`
- Landing: https://www.ons.gov.uk/employmentandlabourmarket/peopleinwork/earningsandworkinghours/datasets/regionbyindustry2digitsicashetable5
- Edition: **2026 provisional** — `ashetable52026provisional.zip` sha256 `164220a6bfecee98e15e853db66d998dabdc7acd76998754f19ca29fee833bff`
- Retrieval date: 2026-11-11 · ONS release: 22 Oct 2026
- Curated: **402** observations (English regions + Wales + Scotland × SIC sections × All/Full-Time · median)
- Cloud: release_id=**221** · Storage archive pushed

## Coverage note

Table 5.1a publishes `REGION, INDUSTRY` section cross-tabs for **E12\* English regions + Wales + Scotland**. England and Northern Ireland appear as all-industry region totals only (no section cross-tab in this workbook). UK × industry sections are on `ashe-industry-earnings` (Table 4).

## Checks

| ID | Check | Result | Notes |
|----|-------|--------|-------|
| A1 | Zip SHA | **pass** | |
| A2 | Workplace basis | **pass** | `basis=workplace` |
| A3 | Spot | **pass** | London Full-Time Manufacturing (C) **£947.2** |
| A4 | Sections only | **pass** | SIC A–U; suppressions omitted |
| A5 | Cloud | **pass** | release_id=221 |

## Validation request

Sample London + North East × 2 sections vs ONS Table 5.1a; confirm England/NI gap documented.
