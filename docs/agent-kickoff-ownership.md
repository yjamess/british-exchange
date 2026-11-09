# Kickoff — Housing Domain 09 Ownership & Property Economics

Brief: [Ownership & Property Economics](https://app.notion.com/p/40e6547176858199b8e5c169cbbdee84)

**Question (locked):** Who owns Britain's property, how is that ownership structured, and how does housing generate, concentrate and transfer wealth?

**Views:** Ownership · Mortgages · Wealth · Data. Property Rights is not a tab. Freehold, lease, charge and the register are read on Who owns.

**Scope:** the legal, institutional and financial layer behind homes. The resident, registered owner, lender and ultimate economic beneficiary can be different people or entities. Housing stock and tenure counts occupancy; this domain covers legal and financial ownership structures. It is not a second tenure dashboard.

## Graphic experiences (brief, 5 Nov 2026)

| | Experience | View | Status |
| --- | --- | --- | --- |
| A | **Who Owns Britain?** Flagship. A verified network of corporate proprietors, registered titles, charges and control records. Filter by category, inspect each edge, follow it to the source, see coverage limits | Ownership | Relationship types, edge register and readiness checklist only. No named record until phase 3 |
| B | **The Anatomy of Property Ownership.** Freehold, lease, charge and the register, read on the relationship sheet | Ownership | The separate Property Rights tab was removed. The drawing is not a destination. |
| C | **The Mortgage Machine.** New lending, the outstanding debt, conditions and rates. Stocks and flows stay apart. Affordability's repayment scenarios are illustrative, not observed lending | Mortgages | Separate time charts. Instrument composition is phase 2 |
| D | **The Distribution of Property Wealth.** Distributions and inequality, not the average. Survey uncertainty and valuation definitions stay on the chart | Wealth | WAS Table 3.19 age bands and percentile lines. Confidence intervals not loaded |
| E | **The Transfer of Property Wealth.** Inheritance, gifts and transmission, from aggregate evidence only | Wealth (later) | Not drawn. No property-by-property chain |

**Non-negotiable:** every line between two entities is a verified, typed relationship backed by a source record. Legal titleholding, beneficial ownership, corporate control, charges and assumed economic benefit are labelled separately, and assumed benefit is never drawn.

## Phases (no dates)

1. Anatomy of Property Ownership — the distinctions are on Who owns. The separate tab and the sectional drawing were removed.
2. Official mortgage series and the Mortgage Machine composition (stocks, flows, history).
3. Assess CCOD and OCOD: coverage, licence, update frequency, title-to-entity matching. The CCOD and OCOD dataset pages returned 403 to automated fetches on 5 Nov 2026, so the licence and update frequency are **unverified** and must be checked in a browser.
4. Company and title search, verified link inspector, geographic context, incompleteness markers.
5. Property-wealth distribution extensions, then generational transfer evidence once validated.
6. Test traceability, relationship types, privacy, accessibility, reduced motion, mobile and shareable state.

## Network model (phase 3+)

Relational PostgreSQL with indexed edge tables. A graph database is not needed just to draw a network. Every network ships with an accessible list of entities and edges.

- **Entity:** registered title, company, public institution, lender or other supported record. Person-level and company-level records are kept apart; private individuals are not profiled.
- **Relationship:** explicitly typed (legal titleholding, corporate control, registrable beneficial owner, charge).
- **Evidence:** the source record and reference that proves that relationship.
- **Validity:** observed or effective dates, record version and known gaps.
- **Spatial reference:** licensed, correctly matched title geometry, or a safely coarser location.

## Do not collapse these ideas

- Occupancy (Housing stock & tenure) is not legal title.
- Registered title is not beneficial ownership and not a person with significant control.
- A mortgage charge is security for a debt, not ownership.
- Outstanding loan balances are a stock. Approvals, advances and commitments are flows. Do not add them.
- A line on the ownership network is drawn only for a published relationship. Do not infer an ultimate owner from a similar name.
- CCOD and OCOD are corporate titles in England and Wales, within their coverage. They are not all owners in Britain.
- Wealth and Assets Survey net property wealth is a household survey. It is not the FCA loan book.

## Catalogue

| Source | What it is | Status |
| --- | --- | --- |
| Bank of England LPMVTVX, LPMB4B3, LPMVTVJ, LPMVTVC | Monthly approvals and secured lending flows | Ingested `mortgage-approvals` |
| Economy IUMBV34 | Quoted 2-year fixed rate, 75% LTV | Reused. Not copied |
| FCA / PRA MLAR summary | Outstanding balances, advances, commitments, purpose, LTV, arrears | Ingested `residential-mortgage-book` |
| HM Land Registry CCOD / OCOD | Corporate registered titles | Not loaded. Assess licence and matching before any network |
| Companies House PSC / Register of Overseas Entities | Company control; registrable beneficial owners of overseas entities. Not title | Not loaded. Join on company or entity number, never on name |
| ONS Wealth and Assets Survey | Net property wealth distribution | Ingested `household-net-property-wealth`. Tables 3.8, 3.9 and 3.19. Accreditation suspended from April 2020–March 2022; the caveat stays on the chart |
| HMRC inheritance and transfers | Aggregate tax and transmission | Not loaded. Must not become a property-by-property chain |
| UK Finance buy-to-let | Landlord mortgage activity beyond MLAR's advance share | Not loaded. MLAR already records the buy-to-let share of gross advances |

## Headlines to keep separate

- FCA Q2 2026 outstanding residential loans: £1,760.6 billion (stock).
- FCA Q2 2026 gross advances: £77.4 billion (flow).
- Bank of England September 2026 net house-purchase approvals: 53,443, published as 53,400 (flow).

## Next

1. Pin a real CCOD or OCOD download before any named company or title is drawn. Do not use the fictional example rows.
2. Load `household-net-property-wealth` into Postgres without re-running migrations, then spot-check the median (£106,000 all households; £226,000 owners) and the April 2020–March 2022 age bands.
3. Inheritance stays aggregate. No property-by-property chain.
