# Gate 3 tranche B — source discovery

**Date:** 2026-11-07  
**Scope:** Official source candidates for parked Energy Gate 3 work. Discovery only — no ingest, no UI, no Ready claims.  
**Register:** [`source_register.csv`](source_register.csv)

## Executive summary (9 topics)

| # | Topic | Recommended next | Status | Licence / geography honesty |
|---|-------|------------------|--------|-----------------------------|
| 1 | Prices — Ofgem default tariff / price cap | Pin per-period official **Energy price cap levels** PDFs + Annex/levelised XLSX models; curate a GB series from those pins (do not invent a continuous Ofgem CSV) | **ingested** → Validation (`ofgem-default-tariff-cap`, 4 periods) | **GB only** — not NI. Ofgem terms on published models/PDFs. |
| 2 | Prices — real-terms / deflators | **Do not fork.** Economy ingested **CPIH L522** (`cpih-index`); Energy links after Validation Ready | **ingested** → Validation (`cpih-index`) | UK (ONS). OGL v3.0. |
| 3 | Fossils — NSTA field/licence spatial | Ingest **UKCS offshore fields** + **licences** from NSTA open data (prefer WGS84 GeoJSON/FeatureServer) — licence pinned | **candidate** (licence cleared) | **UKCS offshore**; onshore England petroleum layers exist; NSTA does **not** publish onshore Scotland/Wales/NI. CRS: WGS84 / ED50 / ETRS89 / BNG. Attribution required. |
| 4 | Imports — partner / entry geography | Ingest **DUKES 3.7** (oil by country) + **DUKES 4.5/4.6** (gas trade + LNG by terminal) | `candidate` | UK statistical; partner countries + LNG terminals — not a full pipeline entry-point atlas. OGL. |
| 5 | Renewables — Field Guide | Extend Ready REPD connector for **non-operational stages**; ingest **DUKES 5.10** plant loads (nuclear LF); specimen plates = imagery skill, not a series | `candidate` | UK projects (REPD ≥150 kW threshold note); DUKES UK. OGL. |
| 6 | Networks — topology / queue / constraints | First ingest **NESO TEC Register** CSV; constraints costs secondary; **DNO national topology atlas remains Blocked** | `candidate` (TEC) / `blocked` (national DNO atlas) | **GB** NESO Open Data Licence; TO/DNO mixed licences. |
| 7 | Manufacturing — subsector IoP / GVA | Ingest IoP **DIOP** multi-series dataset for SIC Section C divisions; GVA share stays Ready reuse | `candidate` | UK. OGL. SIC breaks must be labelled. |
| 8 | Jobs — BRES regional manufacturing | Ingest ONS **BRES Table 4** (region × broad industry) open XLSX; NOMIS for finer geography | `candidate` | Table 4 UK regions; NOMIS open access **GB**. **Employee jobs ≠ Workforce Jobs** (JWR7). PAYE-only discontinuity pre-2015. |
| 9 | Policy — commencement SIs + investment spark | Link Ready `business-investment` (NPEL); commencement = legislation.gov.uk SI/notes per Act into `events.json` — **no causal claims** | `reuse` + `candidate` (SIs) | UK / GB extent per instrument. |

## Priority order — Gate 3 tranche B

1. **Imports partner / LNG entry (DUKES 3.7 + 4.5 + 4.6)** — clear Official Statistics XLSX; unlocks Lifelines Map depth without inventing geography.  
2. **Manufacturing IoP subsector catalogue (DIOP dataset)** + **BRES Table 4 regional manufacturing employee jobs** — unlock Production Anatomy / Employment Atlas with honest measure labels.  
3. **REPD non-operational pipeline + DUKES 5.10** — extends existing connectors; Field Guide plates stay imagery.  
4. **NESO TEC Register** — open CSV, twice-weekly; contracted queue only.  
5. **NSTA UKCS fields/licences spatial** — after licence confirmation; North Sea Time Machine.  
6. **Ofgem price-cap pin archive** — labour-heavy; honest GB cap history.  
7. **Economy CPIH Ready → Energy real-terms link** — Energy must not fork deflators.  
8. **Policy commencement SI pins + business-investment spark** — editorial/ledger only.

## Topic notes

### 1. Ofgem default tariff / price cap

There is **no single official continuous historic CSV** of default-tariff cap levels. Ofgem publishes, for each cap period:

- **Energy price cap levels** PDF (typical £/year and unit/standing rates by region/payment), and  
- Spreadsheet **models** (pre-levelised rates / Annex 9 levelised, plus cost annexes).

Landing: [Energy price cap (default tariff) levels](https://www.ofgem.gov.uk/energy-regulation/domestic-and-non-domestic/energy-pricing-rules/energy-price-cap/energy-price-cap-default-tariff-levels).  
Companion inputs: [Default Tariff Cap table of public information](https://www.ofgem.gov.uk/guidance/energy-price-cap-table-public-information-guidance-industry) (industry inputs, not a tidy consumer time series).

**Honest Gate 3 approach:** treat each period’s official PDF (+ primary level model XLSX) as a pinned raw asset; curate one GB series with period bounds, fuel, payment method, and typical consumption assumptions disclosed. Do **not** scrape third-party aggregators. Cap applies to **Great Britain**, not Northern Ireland.

### 2. Real-terms / deflators

Economy already Ready: `cpi-index` (D7BT CPI) and `business-investment` (NPEL). Manifests explicitly say CPI is **not CPIH**.  
Preferred household-cost deflator: ONS **CPIH INDEX 00 ALL ITEMS** [L522 / MM23](https://www.ons.gov.uk/economy/inflationandpriceindices/timeseries/l522/mm23) (+ `/data` JSON). RPI is secondary/legacy.  
Energy should **link** Economy’s Ready deflator ID once CPIH ships; until then either Blocked for “real bills” or temporary CPI with a loud caveat — never a parallel Energy CPIH pipeline.

### 3. NSTA field / licence spatial

Open data hub: [NSTA how to access](https://www.nstauthority.co.uk/data-and-insights/about-nsta-data/how-to-access-our-data/) · search [open-data-ukcs-transition.hub.arcgis.com](https://open-data-ukcs-transition.hub.arcgis.com/search).  
Catalogue examples: [UKCS offshore hydrocarbon fields (ED50)](https://www.data.gov.uk/dataset/ba533146-91dd-45ef-a81e-95906f981890/ukcs-offshore-hydrocarbon-fields-ed50) (GeoJSON/shapefile/GPKG; also WGS84 siblings) · [UKCS offshore petroleum licences (ED50)](https://www.data.gov.uk/dataset/a4fabc09-b176-4a46-bff5-cd08873ef354/ukcs-offshore-petroleum-licences-ed50) · [Licensed and Unlicensed Blocks (WGS84)](https://www.data.gov.uk/dataset/a9f5bc3d-c072-4f2e-84c1-ecd0335c3d2a/nsta-licensed-and-unlicensed-blocks-wgs842).  
REST folders (industry CRS): `Public_WGS84`, `Public_ED50`, `Public_ETRS89` under `data.nstauthority.co.uk/arcgis/rest/services/`.  
Downloads: CSV, KML, shapefile, GeoJSON, GPKG. **Licence field often blank on data.gov.uk** → confirm NSTA open-data terms before ingest (`needs-licence-check`). Do not fabricate national totals from incomplete field coverage.

### 4. Imports partner / entry geography

| Asset | Role | URL |
|-------|------|-----|
| DUKES 3.7 | Crude & products imports **by country of origin** | [landing](https://www.gov.uk/government/statistics/petroleum-chapter-3-digest-of-united-kingdom-energy-statistics-dukes) · [XLSX](https://assets.publishing.service.gov.uk/media/6a69f0a74dda8076771a433f/DUKES_3.7.xlsx) |
| DUKES 4.5 | Gas imports/exports & facilities | [landing](https://www.gov.uk/government/statistics/natural-gas-chapter-4-digest-of-united-kingdom-energy-statistics-dukes) · [XLSX](https://assets.publishing.service.gov.uk/media/6aba96a9734e2435f202f1d6/DUKES_4.5.xlsx) |
| DUKES 4.6 | **LNG imports by terminal** (entry-point honesty) | [XLSX](https://assets.publishing.service.gov.uk/media/6a69f46eb5fc953081705fea/DUKES_4.6.xlsx) |
| DUKES G.1 | Aggregate fuel trade volumes | [landing](https://www.gov.uk/government/statistics/dukes-foreign-trade-statistics) · [XLSX](https://assets.publishing.service.gov.uk/media/6a69e9780825cc51a6c37cee/DUKES_G.1.xlsx) |

Lifelines Map should plot **official partner countries** and **LNG terminals**, not invented pipeline landfalls. Electricity corridors already Ready via `electricity-interconnector-flows` (ET 5.6).

### 5. Renewables — Energy Field Guide

- **REPD** full extract (all planning stages): [publication](https://www.gov.uk/government/publications/renewable-energy-planning-database-quarterly-extract) · [CSV Q2 2026](https://assets.publishing.service.gov.uk/media/6a6cbdc00c36759b5ccaa305/REPD_Publication_Q2_2026.csv) · [XLSX](https://assets.publishing.service.gov.uk/media/6a6cbdd2862aaf18d9c62b02/REPD_Publication_Q2_2026.xlsx). Extend `renewable-energy-planning-operational`; do not fork a second REPD pipeline.  
- **Nuclear / plant load factors:** [DUKES 5.10](https://assets.publishing.service.gov.uk/media/6a6a364b0ddb7e4831c629f2/DUKES_5.10.xlsx) (Plant loads, demand and efficiency). Distinct from Ready renewable LF (`DUKES 6.3`).  
- Specimen plates: brand imagery (observatory-imprint / Plate), not a registry time series.

### 6. Networks

| Source | Status | Notes |
|--------|--------|-------|
| [NESO TEC Register](https://www.neso.energy/data-portal/transmission-entry-capacity-tec-register) | Ingest candidate | Contracted MW + dates; Gate 1/2 column; **not** speculative ETAs. NESO Open Data Licence. |
| [Thermal constraint costs](https://www.neso.energy/data-portal/thermal-constraint-costs) | Candidate | Outturn £ by FY CSV; needs boundary→geography mapping; not local node costs. |
| DNO LTDS / GIS | **Blocked** as national series | See `data/energy/power-networks/DNO_TOPOLOGY_BLOCKED.md` — needs partner GIS or single-DNO pilot. |
| Local spare capacity | **Blocked** | No official national series. |

### 7. Manufacturing subsector IoP / GVA

- IoP multi-series: [Index of Production time series (current)](https://www.ons.gov.uk/economy/economicoutputandproductivity/output/datasets/indexofproduction/current) (CSV/XLSX). Headline Section C remains Ready `manufacturing-output-index` (K22A) — extract **divisions/subsections under C** only.  
- GVA share Ready reuse `manufacturing-share-of-gva` (L4NT). Regional industry GVA = later / Regions coordination.

### 8. Jobs — BRES (+ optional ASHE)

- [BRES Table 4 — Region by broad industry](https://www.ons.gov.uk/employmentandlabourmarket/peopleinwork/employmentandemployeetypes/datasets/regionbybroadindustrygroupsicbusinessregisterandemploymentsurveybrestable4) — open XLSX; Manufacturing broad group × UK region.  
- Finer SIC × place: [NOMIS BRES open access](https://www.nomisweb.co.uk/datasets/newbres6pub) (GB).  
- Measure: **employee jobs** at workplace ≠ Ready **Workforce Jobs** JWR7.  
- Optional ASHE: [Table 4 industry 2-digit SIC](https://www.ons.gov.uk/employmentandlabourmarket/peopleinwork/earningsandworkinghours/datasets/industry2digitsicashetable4); real earnings need Economy deflator.

### 9. Policy

- Acts already listed in `data/energy/industrial-policy/source_register.csv`. Gate 3: pin **commencement SIs / notes** from [legislation.gov.uk](https://www.legislation.gov.uk/) per instrument (e.g. Energy Act 2023) into `events.json` dates — never invent outcome links.  
- Spark line: Ready Economy [`business-investment`](https://www.ons.gov.uk/economy/grossdomesticproductgdp/timeseries/npel/pn2) — link only.

## What was patched elsewhere

Concrete URL/asset upgrades only (historical rows kept):

- `data/energy/energy-prices/source_register.csv` — Ofgem notes + public-info landing  
- `data/energy/oil-gas-fossil-fuels/source_register.csv` — NSTA fields/licences assets  
- `data/energy/energy-imports-security/gap-inventory.md` — DUKES 3.7/4.5/4.6 pins  
- `data/energy/renewables-nuclear/source_register.csv` — REPD Q2 2026 + DUKES 5.10 assets  
- `data/energy/power-networks/source_register.csv` — TEC Register URL  
- `data/energy/manufacturing/source_register.csv` — IoP current dataset asset  
- `data/energy/jobs-productivity/source_register.csv` — BRES Table 4 + ASHE Table 4  
- `data/energy/industrial-policy/source_register.csv` — business-investment Ready note
