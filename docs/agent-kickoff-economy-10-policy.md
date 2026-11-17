# Kickoff — Economy Domain 10 Economic policy

**Opened:** 2026-11-15  
**Owners:** Orchestrator (schema, register seed, UI); Economy agent for later evidence passes  
**Template:** [agent-kickoff-economy-domain.md](agent-kickoff-economy-domain.md)  
**Sector:** [Economy & Public Finance](https://app.notion.com/p/40d65471768581419ceaefe6dec32ba2) · **Control:** [Economy Sector Control](https://app.notion.com/p/414654717685811caf11f9bfb7b3ef83)  
**Wave:** C · **Mode:** Gate 2 seed shipped — Domain 10 **not** complete  
**Peers:** Energy Domain 10 [agent-kickoff-industrial-policy.md](agent-kickoff-industrial-policy.md) · Housing Domain 10 [agent-kickoff-policy.md](agent-kickoff-policy.md)  
**Schema and source standards:** [economy-10-policy-source-standards.md](economy-10-policy-source-standards.md)

## Question (provisional until end of G2)

Which decisions shaped Britain's economy, why were they introduced, what changed, and what evidence exists about their consequences?

## Owner brief (2026-11-15)

- Ten policy areas: fiscal · monetary · economic institutions · trade · industrial · labour market · welfare and social security · housing and land (linked to Housing) · financial regulation · economic crises and responses.
- Every decision follows one evidence record: name, dates (announcement, enactment, commencement, expiry), institution, type, background, stated objectives, mechanism, measures, implementation, financial implications, measurable indicators, evaluation, sources, related policies. **Status is a core property** so an announcement is never read as an implemented policy.
- Five content sections: 01 Economic decision ledger · 02 Britain's economic institutions · 03 Economic eras and turning points · 04 Policy changes and reversals · 05 Policy and economic evidence.
- Defining feature is **traceability**: decision → measures → affected domains → related indicators → published evaluations. Three kinds of evidence (intentions, observed changes, evaluations) are never interchangeable.
- Sources: legislation and Hansard; HMT Budgets, statements, spending reviews and costings; Bank of England MPC decisions and reports; OBR forecasts and costings; HMRC and DWP publications; National Archives; NAO and committee evaluations. Each record needs an original URL, date, source type and version.
- Own the general register; do not duplicate Housing or Energy records — reference them.
- Build order: 1 schema and source standards · 2 credible initial catalogue · 3 link Housing and Energy records · 4 institutional histories and amendment relationships · 5 connect to indicators · 6 evaluations and deeper history. A well-sourced small collection beats hundreds of thin entries.

## Delivered (Gate 2 seed, 2026-11-15)

| Item | Location |
|------|----------|
| Schema extension (policy area, repeal date, dossier) | `src/britain_exchange/policy_event.py` · standards doc above |
| Register (19 checked records, all with evidence records; 7 evaluations; 5 eras; 11 relationships) | `data/economy/economic-policy/events.json` |
| Pledge register (4 listed, none scored) | `data/economy/economic-policy/pledges.json` |
| Gate 1 composition (Study C locked) | `data/economy/economic-policy/GATE1_COMPOSITION.md` |
| Source register, reuse map, README | same folder |
| Packs + Storage | `economy.policy-events` · `economy.policy-pledges` |
| Tests | `tests/test_economy_policy_events.py` |
| UI | `/economy?domain=policy` — Ledger · Institutions · Eras · Changes · Evidence · Promises |

## Seeded decisions

Bank of England Act 1946 · Bank of England Act 1998 (announced 6 May 1997) · National Minimum Wage Act 1998 · Financial Services and Markets Act 2000 · Pensions Act 2008 · Fiscal Responsibility Act 2010 (repealed 23 March 2011) · Budget Responsibility and National Audit Act 2011 · Office for Budget Responsibility (4 April 2011) · Welfare Reform Act 2012 · Financial Services Act 2012 · European Union (Future Relationship) Act 2020 · Coronavirus Job Retention Scheme (20 March 2020 → 30 September 2021) · Charter for Budget Responsibility, Autumn 2025 · Commissioners for Revenue and Customs Act 2005 · HM Revenue and Customs (18 April 2005) · Monetary Policy Committee (1 June 1998) · Financial Conduct Authority and Prudential Regulation Authority (1 April 2013) · Budget Responsibility Act 2024.

Every date was read from legislation.gov.uk, Hansard, GOV.UK, the OBR or the Bank of England on 15 November 2026. Facts a page did not show are recorded as not pinned.

## Still open (Gate 3)

- **Second pass done 2026-11-15:** every record now has an evidence record; commencement orders pinned for NMWA 1998 (1 Nov 1998 / 1 Apr 1999), FSMA 2000 (1 Dec 2001), Pensions Act 2008 (30 Jun 2012; staging from 1 Oct 2012), WRA 2012 (29 Apr 2013, four districts), FSA 2012 (1 Apr 2013), EU (Future Relationship) Act (IP completion day); Fiscal Responsibility Act duties quoted; CJRS total £70.0 billion; TCA signed 30 Dec 2020, provisional 1 Jan 2021, in force 1 May 2021 (European Commission). Seven evaluations attached: NAO (universal credit, auto-enrolment, Covid employment schemes), Low Pay Commission 20-year review, three OBR external reviews.
- **Third pass done 2026-11-15 (institutions):** HMRC and its 2005 Act, the Monetary Policy Committee, the FCA and PRA, and the Budget Responsibility Act 2024 added with sourced creation and amendment relationships.
- Still not pinned: the October 1992 inflation objective (the Bank's February 1993 Inflation Report PDF exceeds the fetch limit); the interim OBR's day in May 2010; the 1946 Act's appointed day; universal credit national roll-out orders; the Low Pay Commission's founding; HM Treasury as an institution record; the under-occupancy section of WRA 2012.
- Budgets and Finance Acts as measures with OBR costings.
- Cross-register references to Housing (`housing-act-1980`, `localism-act-2011`) and Energy (`climate-change-act-2008`, `modern-industrial-strategy-2025`) once a decision in this register touches them with a source.
- Scoring rule for symmetric targets (inflation) before any pledge is scored.
- Independent Validation of the register's dates against sources; browser pass at 390px is done for the ledger only.
- Notion plan page: the connector cannot reach the Economy pages (404), so the Notion update is pending.

## Forbidden

- Causal arrows from a decision to inflation, growth, jobs or borrowing.
- Copying Housing or Energy records into this register.
- Net debt standing in for PSNFL; net borrowing for the current budget.
- Claiming Domain 10 complete.
