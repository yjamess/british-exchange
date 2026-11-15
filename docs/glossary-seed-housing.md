# Glossary seed — Housing & Land

Derived 2026-11-14 from the words that actually appear on the Housing pages (labels, menus, figure captions, stage meta and Notes feet). This is the first sector pass for the shared terms registry; see `docs/work-plan.md` › GLOSS-01..03. **Live copy:** `data/glossary/terms.yaml` is the pinned registry (edit there; this file is the derivation record).

**Pattern found.** The Notes feet already define most of these carefully ("Nominal means pounds of that month…", "A Category 1 hazard is…"). The labels, menus and captions above the plot do not: `AFF1 workplace median`, `UK HPI view`, `EHS modelled · not EPC register`, `PIPR`, `FCA · PRA · MLAR`, `2-year fixed, 75% LTV`. A stranger meets the acronym before the definition. The `Term` marker closes that gap; the copy pass expands the worst labels outright.

Each row: short form · full name · one-sentence plain definition for the popover · where it appears. Long method notes stay in the Notes foot and on the glossary page.

## Publishers and datasets

| Short | Full name | Plain definition | Seen on |
|---|---|---|---|
| MHCLG | Ministry of Housing, Communities and Local Government | The government department that publishes England's housing, planning and homelessness statistics. | Supply, Stock, Insecurity, Land |
| ONS | Office for National Statistics | The UK's national statistics body; source of prices, earnings, rents, Census and inflation series here. | All |
| EHS | English Housing Survey | A yearly survey of a sample of English homes and households, run for MHCLG; its figures are estimates, not a register. | Quality, Stock |
| EPC register | Energy Performance Certificate register | The administrative list of energy certificates lodged when a building is sold, let or built; it covers only those buildings, not all homes. | Quality |
| UK HPI | UK House Price Index | HM Land Registry's monthly measure of average house prices, built from completed sales. | Prices, Affordability |
| HM Land Registry | HM Land Registry | The body that records property ownership in England and Wales and publishes price-paid and ownership data. | Prices, Ownership |
| CCOD / OCOD | Commercial and Corporate Ownership Data / Overseas Companies Ownership Data | HM Land Registry lists of titles owned by UK companies and by overseas companies. | Ownership |
| FCA / PRA | Financial Conduct Authority / Prudential Regulation Authority | The two regulators that jointly collect mortgage lending returns from lenders. | Ownership |
| MLAR | Mortgage Lenders and Administrators Return | The quarterly lending return every regulated mortgage lender files; source of advances, balances and arrears here. | Ownership |
| MoJ | Ministry of Justice | Publishes court statistics, including landlord and mortgage possession actions. | Insecurity |
| HMRC | HM Revenue and Customs | The tax authority; source here of property in estates reported for inheritance tax. | Ownership |
| AFF1 | ONS housing affordability table 1 | The ONS table that compares median house prices with median earnings by area. | Affordability |
| PIPR | Price Index of Private Rents | The ONS monthly measure of private rents, with average rent levels by area. | Renting, Affordability |
| Wealth and Assets Survey | Wealth and Assets Survey | An ONS household survey that asks people what their property and debts are worth. | Ownership |
| Census TS044 | Census 2021 table TS044, accommodation type | Counts households by type of home on Census Day; a count of households, not of dwellings. | Stock |
| Live Table 213 / 1000 / 118 | MHCLG live tables | MHCLG's standing spreadsheets: 213 is quarterly starts and completions, 1000 is affordable supply, 118 is net additional dwellings. | Supply |
| Planning Data | planning.data.gov.uk | The government's open platform for planning datasets such as brownfield sites, Article 4 directions and tree preservation orders. | Land |
| D7BT | ONS CPI all-items index | The series code for the Consumer Prices Index used to turn nominal pounds into real terms. | Prices |

## Money and measurement

| Short | Full name | Plain definition | Seen on |
|---|---|---|---|
| Nominal | Nominal pounds | Pounds of the month or year shown, with no adjustment for inflation. | Prices, Ownership |
| Real terms | CPI-adjusted pounds | Pounds restated in the money of a chosen month so that inflation is removed; here an Exchange calculation using CPI. | Prices |
| CPI | Consumer Prices Index | The ONS's main measure of inflation, tracking the prices of a basket of goods and services. | Prices |
| Median | Median | The middle value: half are above it and half below. | Affordability, Prices |
| Mean | Mean (average) | All values added together and divided by how many there are. | Affordability, Quality |
| Provisional | Provisional figure | A first estimate the publisher expects to revise; drawn dotted on the Exchange. | Supply, Renting |
| Affordability ratio | House price to earnings ratio | Median house price divided by median annual earnings; "8×" means a home costs eight years of pay. | Affordability |
| Workplace-based earnings | Workplace-based median earnings | Pay measured where people work rather than where they live. | Affordability |
| Rent-to-earnings | Rent as a share of earnings | Annual rent divided by annual median earnings; an Exchange calculation, not a published statistic. | Affordability |
| LTV | Loan-to-value | The mortgage as a share of the property's price; 75% LTV means a 25% deposit. | Ownership |
| Quoted rate | Quoted mortgage rate | The interest rate lenders advertise for a given product, as collected by the Bank of England. | Affordability, Ownership |
| Gross advances | Gross mortgage advances | The value of new mortgages lent in the period, before any repayments. | Ownership |
| Arrears | Mortgage arrears | Loan balances where the borrower has fallen behind on payments. | Ownership |
| Buy-to-let | Buy-to-let mortgage | A mortgage on a property bought to rent out rather than live in. | Ownership |
| Remortgage | Remortgage | Taking a new mortgage on a home you already own, usually to replace the old one. | Ownership |
| First-time buyer | First-time buyer | A purchaser who has not owned a home before. | Prices, Ownership |
| Net property wealth | Net property wealth | What a household says its property is worth, minus the mortgage still owed. | Ownership |

## Homes, tenure and ownership

| Short | Full name | Plain definition | Seen on |
|---|---|---|---|
| Dwelling | Dwelling | A self-contained home; the unit MHCLG counts in the housing stock. | Stock, Supply |
| Household | Household | One person or a group living together at the same address; several households can share one dwelling. | Stock, Insecurity |
| Tenure | Tenure | The terms on which a home is held: owned outright, owned with a mortgage, rented privately or rented from a social landlord. | Stock, Renting |
| Owner-occupied | Owner-occupied | Lived in by its owner, with or without a mortgage. | Stock |
| Private rented | Private rented sector | Homes rented from a private landlord. | Stock, Renting |
| Social rented | Social rented sector | Homes rented from a council or housing association at below-market rents. | Stock, Renting |
| Freehold | Freehold | Outright ownership of the property and the land it stands on. | Ownership |
| Leasehold | Leasehold | Ownership of a property for a fixed term under a lease, with the land owned by someone else. | Ownership |
| Registered provider | Registered provider of social housing | A housing association or other landlord registered with the Regulator of Social Housing. | Supply, Renting |
| Social rent | Social rent | The lowest social-housing rent, set by a national formula. | Renting, Supply |
| Affordable rent | Affordable rent | Social-housing rent set at up to 80% of the local market rent. | Renting, Supply |
| Intermediate rent | Intermediate rent | Rent between social and market levels, including shared-ownership and rent-to-buy homes. | Renting |
| Vacant / long-term vacant | Vacant dwelling | A home with no one living in it; long-term means empty for more than six months. | Stock |
| Concealed household | Concealed household | A family or couple living within another household because they do not have a home of their own. | Insecurity |
| Adjustment to Census | Adjustment to Census | A statistical correction MHCLG spreads across the years between censuses so the stock matches the Census count. | Stock |

## Building and planning

| Short | Full name | Plain definition | Seen on |
|---|---|---|---|
| Starts | Dwelling starts | New homes whose foundations have been laid in the period. | Supply |
| Completions | Dwelling completions | New homes finished and ready to live in during the period. | Supply |
| Net additional dwellings | Net additional dwellings | The yearly change in the number of homes, counting new builds, conversions and changes of use, minus demolitions. | Supply |
| Builder tenure | Tenure of builder | Who built the home: a private firm, a housing association or a council. It is not who lives there afterwards. | Supply |
| LPA | Local planning authority | The council that decides planning applications for an area. | Land |
| Planning permission | Planning permission | A council's formal consent for development; a permission is not a built home. | Land, Supply |
| Allow rate | Appeal allow rate | The share of planning appeals the Planning Inspectorate decided in the appellant's favour. | Land |
| Brownfield | Brownfield land | Land that has been built on before and is listed by a council as potentially suitable for housing. | Land |
| Green Belt | Green Belt | Land around a town or city where planning policy strongly restricts building. | Land |
| Article 4 | Article 4 direction | A council order removing automatic planning rights in an area, so changes need an application. | Land |
| TPO | Tree preservation order | A council order protecting a tree or woodland from felling or damage. | Land |
| Local plan | Local plan | The council's adopted document setting out where and how much development is expected. | Land |

## Quality and condition

| Short | Full name | Plain definition | Seen on |
|---|---|---|---|
| Decent Homes Standard | Decent Homes Standard | The government's minimum standard a home must meet on safety, repair, facilities and warmth. | Quality |
| Non-decent | Non-decent home | A home that fails at least one part of the Decent Homes Standard. | Quality |
| HHSRS | Housing Health and Safety Rating System | The method councils use to score hazards in a home, such as cold, damp or falls. | Quality |
| Category 1 hazard | Category 1 hazard | The most serious hazard rating under HHSRS; a home with one fails the statutory minimum. | Quality |
| EPC band | Energy Performance Certificate band | A home's energy-efficiency rating from A (best) to G (worst). | Quality |
| Band C | EPC band C | The energy rating the government uses as its target for most homes. | Quality |
| SAP | Standard Assessment Procedure | The government's method for calculating a home's energy rating; the method changed in 2012. | Quality |

## Homelessness and insecurity

| Short | Full name | Plain definition | Seen on |
|---|---|---|---|
| Prevention duty | Prevention duty | A council's legal duty to help a household at risk of losing its home within 56 days. | Insecurity |
| Relief duty | Relief duty | A council's legal duty to help a household that is already homeless find a home. | Insecurity |
| Main duty | Main housing duty | The council's duty to secure accommodation for a household that is eligible, homeless, in priority need and not intentionally homeless. | Insecurity |
| Priority need | Priority need | Groups the law says a council must house, such as families with children or people who are vulnerable. | Insecurity |
| Intentionally homeless | Intentionally homeless | Found to have lost a home through a deliberate act or omission; owed less help. | Insecurity |
| Temporary accommodation | Temporary accommodation | Housing a council arranges while it decides or discharges a homelessness duty. | Insecurity |
| Possession claim / order / warrant | Possession action | The three court steps a landlord or lender takes to repossess a home: claim, then order, then warrant for bailiffs. | Insecurity |
| Section 21 | Section 21 notice | The "no-fault" notice a private landlord in England could use to end a tenancy. | Insecurity, Policy |

## Labels that the copy pass should expand outright

Bare acronyms in menus, captions and meta, where a marker alone is not enough:

- `AFF1 workplace median` → "Price to earnings, workplace median"
- `UK HPI view` / `UK HPI sales volume` → "Average price (UK House Price Index)" / "Sales (UK House Price Index)"
- `EHS modelled · not EPC register` → "Survey estimate, not the certificate register"
- `FCA · PRA · MLAR · residential mortgages` → keep as source line, add marker on MLAR
- `2-year fixed, 75% LTV` → "2-year fixed, 75% loan-to-value"
- `Category 1 hazard` → keep, marker on first use
- `Non-decent` → keep, marker on first use
- `PIPR` anywhere outside a source line → "private rents"
