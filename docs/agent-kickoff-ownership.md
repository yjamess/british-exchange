# Kickoff — Housing Domain 09 Ownership & Property Economics

Brief: [Ownership & Property Economics](https://app.notion.com/p/40e6547176858199b8e5c169cbbdee84)

**Question (locked):** Who owns Britain's property, how is that ownership structured, and how does housing generate, concentrate and transfer wealth?

**Views:** Who owns · Mortgages · Wealth · Data. Property Rights is not a tab.

**Status (10 Nov 2026): complete.** Phase 4 (company and title lookup, relationship network) was dropped by the owner. Who owns shows aggregate counts only.

**Scope:** the legal, institutional and financial layer behind homes. The resident, registered owner, lender and ultimate economic beneficiary can be different people or entities. Housing stock and tenure counts occupancy; this domain covers legal and financial ownership structures. It is not a second tenure dashboard.

## Graphic experiences (brief, 5 Nov 2026)

| | Experience | View | Status |
| --- | --- | --- | --- |
| A | **Who Owns Britain?** Titles held by UK and overseas companies, by local authority, owner type, tenure and country of registration | Who owns | Live from HM Land Registry CCOD/OCOD (`corporate-owned-titles`, monthly). Counts only. The illustrative network and any named-company view were dropped |
| B | **The Anatomy of Property Ownership.** Freehold, lease, charge and the register | — | Removed with the network. Definitions live in Notes |
| C | **The Mortgage Machine.** New lending, the outstanding debt, conditions and rates. Stocks and flows stay apart. Affordability's repayment scenarios are illustrative, not observed lending | Mortgages | Live. Stock ≠ flow sheet, history charts, purpose shares over time (lines, they overlap) and loan-to-value composition (stack, sums to 100) |
| D | **The Distribution of Property Wealth.** Distributions and inequality, not the average. Survey uncertainty and valuation definitions stay on the chart | Wealth | Live. Table 3.19 age bands; percentiles drawn separately for July–June waves and April–March rounds (they overlap 2014–16). Confidence intervals are not published in the ONS workbook |
| E | **The Transfer of Property Wealth.** Inheritance, gifts and transmission, from aggregate evidence only | Wealth | Live from HMRC Inheritance Tax Table 12.3 (`estates-residential-property`): residential property in estates by tax year of death, two lines either side of the 1 Jan 2022 reporting change. Aggregate only |

**Non-negotiable:** every line between two entities is a verified, typed relationship backed by a source record. Legal titleholding, beneficial ownership, corporate control, charges and assumed economic benefit are labelled separately, and assumed benefit is never drawn.

## Phases (no dates)

1. Anatomy of Property Ownership — the distinctions are on Who owns. The separate tab and the sectional drawing were removed.
2. Done. Mortgage Machine composition (stocks, flows, history, purpose and LTV over time).
3. Done. CCOD and OCOD fetched monthly through the Use land and property data API (`HMLR_API_KEY`), counted, QA passed. Raw zips are not retained (CCOD is 1.59 GB); checksums are in the manifest.
4. **Dropped** (owner decision, 10 Nov 2026). No named companies, titles or Companies House joins.
5. Done. Wealth waves/rounds split; HMRC estates series added. Confidence intervals are not published in the ONS property-wealth workbook.
6. Done. `tests/test_corporate_ownership.py` (trailer completeness, no names/addresses/titles in output, unknown district stops the run, month history, labels). Reduced-motion screenshots. Phone-width overflow is a Housing-shell issue shared with every domain, not Ownership-specific.

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
| HM Land Registry CCOD / OCOD | Corporate registered titles | Ingested `corporate-owned-titles` (aggregate counts, monthly) |
| Companies House PSC / Register of Overseas Entities | Company control; registrable beneficial owners of overseas entities. Not title | Dropped with phase 4 |
| ONS Wealth and Assets Survey | Net property wealth distribution | Ingested `household-net-property-wealth`. Tables 3.8, 3.9 and 3.19. Accreditation suspended from April 2020–March 2022; the caveat stays on the chart |
| HMRC inheritance and transfers | Aggregate tax and transmission | Ingested `estates-residential-property` (Table 12.3, 2012-13 to 2023-24). Aggregate only |
| UK Finance buy-to-let | Landlord mortgage activity beyond MLAR's advance share | Not loaded. MLAR already records the buy-to-let share of gross advances |

## Headlines to keep separate

- FCA Q2 2026 outstanding residential loans: £1,760.6 billion (stock).
- FCA Q2 2026 gross advances: £77.4 billion (flow).
- Bank of England September 2026 net house-purchase approvals: 53,443, published as 53,400 (flow).

## QA (data/qa/)

`corporate-owned-titles`, `mortgage-approvals`, `residential-mortgage-book` and `household-net-property-wealth` passed on 10 Nov 2026. Fixed from QA: the buy-to-let share is buy-to-let house purchase only (inside house purchase, labelled "Of which buy to let"); WAS waves and rounds are never joined. `estates-residential-property` passed (11/11, HMRC 1 Jan 2022 reporting change confirmed from HMRC commentary).

## Refresh

**Monthly CCOD/OCOD runbook** (no in-repo cron): see [`data/housing/corporate-owned-titles/README.md`](../data/housing/corporate-owned-titles/README.md).

```bash
uv run python -m britain_exchange.archive_data pull data/housing/corporate-owned-titles
uv run python -m housing.connectors.corporate_ownership
uv run python -m britain_exchange.load_ready --only corporate-owned-titles
uv run python -m britain_exchange.archive_data push data/housing/corporate-owned-titles
```

HMRC Table 12.3 each July.
