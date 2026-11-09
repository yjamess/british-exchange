# Gate 1 — Oil, Gas & Fossil Fuels taxonomy

**Domain:** 04 · Wave A2 · ingest-only  
**Pin date:** 2026-11-07  
**Do not invent continuous spatial coverage or sum incomplete field maps into national totals.**

## Canonical measures (national)

| Exchange concept | Preferred series | Native unit | Common-unit companion |
|------------------|------------------|-------------|------------------------|
| Indigenous crude oil | `crude-oil-production` (new) | million tonnes | `primary-energy-production` fuel=Oil (Mtoe) |
| Indigenous natural gas | `domestic-gas-production` (Ready) | GWh | `primary-energy-production` fuel=Natural gas (Mtoe) |
| Coal extraction | `historical-coal-production` (Ready, History) | million tonnes | `primary-energy-production` fuel=Coal (Mtoe) |

## Publisher tables vs Notion §5

| Notion §5 candidate | Exact table / product | Gate |
|---------------------|-----------------------|------|
| DESNZ DUKES 2026 | Ch. 2 solid fuels; Ch. 3 petroleum; Annex F oil/gas resources | Gate 1 inventory + Gate 2 national |
| Historical crude oil & petroleum 1890–2025 | GOV.UK statistical data set → `Oil_Production___Trade_since_1890.xls` | **Gate 2 (ingested)** |
| Historical coal | Already Ready under History | Reuse |
| NSTA Data Centre / Open Data Hub | Production theme + ArcGIS fields/licences | Gate 3+ spatial |
| BGS | Coalfield / geology layers | Gate 3+ after licence check |

## Coverage breaks (document in UI later)

| Series | Break / caveat |
|--------|----------------|
| Crude indigenous Total | Blank before ~1920; 1890–1919 product trade may exist without production |
| Indigenous oil through 1962 | Sources sheet: includes shale oil until 1962 |
| Landward crude | Present as a column in the long-run workbook — not ingested in Wave A2 |
| NSTA fields | Incomplete historical archive; national totals stay DESNZ/DUKES |
| Reserves vs production | Distinct concepts — Gate 3 glossary |

## Gate 2 vs Gate 3

- **Gate 2:** national annual/monthly totals with checksummed raw + connector.
- **Gate 3+:** NSTA field atlas, DUKES F.1 NGL detail, BGS coalfield geography, reserves figures.

## Spot-check targets for Validation (`crude-oil-production`)

| Year | Workbook Indigenous production Total (thousand tonnes) | Expected curated (Mt = ÷1000) | Narrative check |
|------|--------------------------------------------------------|------------------------------|-----------------|
| 1999 | 137099 | 137.099 | DUKES Ch.3 peak ~137 Mt |
| 2024 | 30657.8 | 30.6578 | |
| 2025 | 31406.05 | 31.40605 | DUKES Ch.3 “just over 31 million tonnes”; +2.4% on 2024 |
