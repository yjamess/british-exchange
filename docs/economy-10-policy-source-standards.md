# Economy Domain 10 — policy-event schema and source standards

**Date:** 2026-11-15 · **Owner:** Orchestrator (schema lives in `src/britain_exchange/policy_event.py`)  
**Brief:** Notion · 10 Economic policy (user brief 2026-11-15). Build priority 1: define the common schema and source standards.

The Economy register reuses the shared policy-event shape that Housing and Energy already load. This note records what was added for the Economy brief and the standards every record must meet. Nothing here changes how the Housing or Energy files load.

## 1. One record shape, three kinds of evidence

| Brief field | Shared field | Notes |
|-------------|--------------|-------|
| Policy name | `title`, `aliases` | Official title first; common name as an alias |
| Date | `announcement_date` · `enactment_date` · `commencements[]` · `start_date` / `end_date` · `repealed_date` | Never collapsed. Mark date is Royal Assent (act), made date (instrument) or `start_date` (programme, institution) |
| Government / institution | `institution` | Responsible department, Parliament or independent body |
| Policy type | `type` (act · statutory_instrument · programme · institution) and `policy_area` | `policy_area` is one of the ten areas below |
| Background | `dossier.background` | What was happening; sourced |
| Stated objectives | `dossier.objectives` | Quoted from the Act, statement or document |
| Mechanism | `dossier.mechanism` | How it was meant to work |
| Measures introduced | `dossier.measures[]` | `label`, `value`, optional `source` |
| Implementation | `dossier.implementation` + `commencements[]` | What was commenced, amended, delayed or reversed |
| Financial implications | `dossier.financial[]` | Costings, forecasts, outturns, each sourced |
| Measurable indicators | `linked_indicators[]` | Exchange series by id; `relationship` is always `context` |
| Evaluation | `dossier.evaluations[]` | `label`, `url`, `publisher`, `date`, `finding` |
| Sources | `sources[]` | See §3 |
| Related policies | `relationships[]` (typed edges) and `dossier.related[]` (cross-register pointers) | |
| Policy status | `status` | announced · proposed · enacted_text_only · partially_in_force · in_force · amended · active · closed · expired · reversed · repealed · dissolved · succeeded |

The dossier is optional on a record. When present, its four prose fields are required and its lists may be empty. An empty list is a labelled gap, never a guess.

### Ten policy areas (`policy_area`)

| Value | Covers |
|-------|--------|
| `fiscal` | Budgets, fiscal rules, taxation and expenditure decisions |
| `monetary` | Bank Rate, asset purchases, monetary frameworks |
| `institutions` | Treasury, Bank of England, OBR, HMRC and changes to their responsibilities |
| `trade` | Tariffs, agreements, customs, EU exit |
| `industrial` | Strategies, incentives, subsidies — referenced from the Energy register where it already holds the record |
| `labour-market` | Minimum wage, employment law, hours, participation |
| `welfare` | Benefits, pensions, eligibility, uprating |
| `housing-land` | Planning, housing investment, property taxation — referenced from the Housing register |
| `financial-regulation` | Banking, stability, market oversight |
| `crisis-response` | Wars, recessions, financial crises, pandemics and the responses |

## 2. Dates

- `announcement_date`: a policy statement (press release, Commons statement). Example: 6 May 1997 on the Bank of England Act 1998.
- `enactment_date`: Royal Assent as printed on legislation.gov.uk, or the made date of an instrument.
- `commencements[]`: each appointment of provisions, with the instrument, citation, URL and scope. `date: null` with "Not pinned" when the order has not been read. A rule such as "two months after passing" is written out, not computed.
- `start_date` / `end_date` / `date_note` (programmes, institutions): the note says what the date is (launch, establishment order, publication).
- `repealed_date`: the day the repeal came into force, with `status` repealed, reversed or expired.

## 3. Source standards

1. **Primary first.** An Act or instrument needs a `primary` source on legislation.gov.uk or Parliament. A programme or institution needs at least one `primary` or `official` source (GOV.UK, the publishing body, Hansard).
2. **Read, not remembered.** Every date, quotation and extent in a record was read from the cited page in the retrieval pass. The register's `retrieved_at` is the check date. A fact the page does not show is written as "not shown" or "not pinned".
3. **Quote short, mark quotes.** Objectives and measures are verbatim where they can be, in quotation marks, with the section or paragraph named.
4. **Stable references.** Prefer legislation.gov.uk section URLs, Hansard column references (`HC Deb 20 May 1997 vol 294 col 508`), GOV.UK publication pages and OBR document pages. Record the document's own date when it differs from the page's.
5. **Versions.** When a document has editions (Charters, strategies), the record is one edition, titled with it. A new edition is a new record and a `replaced` relationship.
6. **Evaluations are separate.** `dossier.evaluations` holds published assessments only (NAO, committees, OBR, IFS, academic). An Exchange series moving after a decision is not an evaluation and is never written as one.
7. **No causal copy.** Summaries and notes describe what the decision did in law or administration. They do not say what it caused.
8. **Cross-sector.** Housing and Energy decisions stay in their registers. The Economy register points at them with `dossier.related` (`registry`, `id`, `note`).

## 4. Validation

```bash
uv run python -m pytest tests/test_economy_policy_events.py tests/test_policy_events.py tests/test_industrial_policy_events.py -q
```

The loader rejects: an unknown `policy_area`; a `repealed_date` on a programme, before the mark date, or without a repeal status; a dossier missing one of its four prose fields; an evaluation without an https URL; a related record pointing at an unknown registry.

## 5. Packs and cloud

`economy.policy-events` → `data/economy/economic-policy/events.json` · `economy.policy-pledges` → `data/economy/economic-policy/pledges.json`, registered in `britain_exchange.packs` and served by `GET /packs/{id}` from Supabase Storage. The web never imports the data folder.
