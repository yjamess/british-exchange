# QA report — Government / Infrastructure / Regions / History

Ingest date: 2026-11-03

| Sector | Indicator | Status | Notes |
|--------|-----------|--------|-------|
| government | `acts-of-parliament-passed` | Ready | rows=126; publisher=The National Archives (legislation.gov.uk); series=ukpga (Public General Acts, annual count) |
| government | `general-election-turnout` | Ready | rows=5; publisher=UK Parliament (electionresults.parliament.uk); series=general-elections.csv (non-notional UK totals) |
| government | `departmental-expenditure-limits` | Ready | rows=8; publisher=HM Treasury; series=PESA Table 1.9 Total Departmental Expenditure Limits (cash) |
| government | `arms-length-bodies-count` | Ready | rows=1; publisher=Cabinet Office; series=Public Bodies Directory — Number Of ALBs |
| infrastructure | `rail-punctuality` | Ready | rows=29; publisher=Office of Rail and Road; series=Table 3113a Public Performance Measure (PPM), Great Britain |
| infrastructure | `road-vehicle-miles` | Ready | rows=77; publisher=Department for Transport; series=TRA0101 Road traffic (vehicle miles) by vehicle type |
| infrastructure | `full-fibre-broadband-coverage` | Ready | rows=2; publisher=Ofcom; series=Connected Nations fixed coverage — Full Fibre % premises |
| infrastructure | `water-supply-interruptions` | Blocked | Ofwat Water Company Performance Report open-data endpoints returned HTTP 403 (Cloudflare/bot protection) at ingest time  |
| regions | `gva-by-uk-nation-and-region` | Ready | rows=400; publisher=ONS; series=Regional GVA(B) Table 1b — ITL1 & UK CVM £m (2019 money) |
| regions | `employment-rate-by-region` | Ready | rows=5343; publisher=ONS; series=HI00 regional LFS employment rate (aged 16-64) |
| regions | `population-by-uk-nation` | Ready | rows=275; publisher=ONS; series=ENPOP/WAPOP/SCPOP/NIPOP/UKPOP mid-year estimates |
| regions | `house-prices-by-region` | Ready | rows=8629; publisher=HM Land Registry / ONS (UK HPI); series=UK HPI Average price by Region_Name / Area_Code |
| history | `bank-of-england-millennium-gdp` | Ready | rows=317; publisher=Bank of England; series=A8 UK Real GDP(A) market prices CVM 2013 |
| history | `long-run-manufacturing-employment` | Ready | rows=94; publisher=Bank of England; series=A53 Employment by industry — Manufacturing |
| history | `uk-unemployment-rate-long-run` | Ready | rows=162; publisher=Bank of England; series=A50 Employment & unemployment — Unemployment rate |
| history | `historical-coal-production` | Ready | rows=44; publisher=DESNZ; series=Historical coal data — Coal Production Total Output |
