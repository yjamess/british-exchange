# Housing policy events

Register for Housing Domain 10 (Policy & History). It holds Acts, statutory instruments, programmes and institutions. None of them is a statistical observation, so there is no `observations.csv`.

The shared shape lives in `britain_exchange.policy_event`. Housing owns this file. Other sectors can add their own event files later without copying the schema.

Checked against legislation.gov.uk, GOV.UK and Hansard on 5 November 2026.

## Where the mark goes

| `type` | Mark (`mark_date`) | Other dates |
| --- | --- | --- |
| `act` | `enactment_date` = Royal Assent printed on the Act (for Acts of the Scottish Parliament and Senedd, the Royal Assent date in the text) | `commencements` |
| `statutory_instrument` | `enactment_date` = the made date | coming into force goes in `commencements` |
| `programme` | `start_date`, with `date_note` saying what that date is (prospectus published, launch stated in official statistics, guidance first published) | `end_date` or null |
| `institution` | `start_date`, with `date_note` saying what that date is (establishing section commenced, machinery-of-government order in force, launch notice) | `end_date` or null |

A programme or institution always has `enactment_date: null`. An Act or instrument never has `start_date`.

## What a date means

| Field | Meaning |
| --- | --- |
| `announcement_date` | A policy statement. Blank in every record so far. |
| `enactment_date` | Royal Assent (Act) or made date (instrument). |
| `commencements` | A provision of the Act itself or a later instrument that brings provisions into force, with its scope. A `date: null` row with "Not pinned" means the commencement instrument has not been read. A rule such as "one month after passing" is recorded as text, and the calendar day is not computed. |
| `start_date` / `end_date` / `date_note` | For programmes and institutions only. |

Royal Assent is not the day a duty starts. An indicator that overlaps an event is linked as context. It is not an effect.

## Nations

`jurisdiction` is free text. `nations` lists the modern nations where the main provisions apply, read from the extent section and, for recent Acts, the explanatory notes on application. When extent and application differ, `extent` says so. Examples: the Renters' Rights Act 2025 extends to England and Wales but applies mostly in England, so `nations` is `england`. The Building Safety Act 2022 lists all four nations because different Parts apply in different places. `extent` says which.

Before 1922, provisions that applied to Ireland are described in `extent` and are not mapped to `northern-ireland`. Before 1967, "England" in statutes included Wales, so those Acts are listed as `england` and `wales`.

## Relationships

Each edge reads as a sentence: `from` *kind* `to`. For example, `housing-act-1964` created `housing-corporation`, and `homes-england` succeeded `homes-and-communities-agency`. Every edge cites a legislation.gov.uk section or order, or a GOV.UK or Hansard page. `date` is the day the source gives for the change, or null if it gives none.

## Coverage (61 events, 22 relationships)

| Type | Count |
| --- | --- |
| act | 41 |
| statutory_instrument | 4 |
| programme | 5 |
| institution | 11 |

| Era | Range | Events |
| --- | --- | --- |
| `before-1900` | up to 1899 | 3 |
| `1900-1939` | 1900–1939 | 7 |
| `1940-1960` | 1940–1959 | 5 |
| `1960-1979` | 1960–1979 | 11 |
| `1980-1999` | 1980–1999 | 6 |
| `2000-2019` | 2000–2019 | 21 |
| `2020-present` | from 2020 | 8 |

The `1940-1960` era ends in 1959 so that eras do not overlap. The id is unchanged.

| Nation in `nations` | Events |
| --- | --- |
| england | 52 |
| wales | 36 |
| scotland | 15 |
| northern-ireland | 3 |

Northern Ireland is thin: only the Housing (Northern Ireland) Order 1981, the Housing Executive and the Building Safety Act 2022.

## Anchors (unchanged in substance)

| id | Royal Assent | Commencement in this file |
| --- | --- | --- |
| `housing-town-planning-act-1919` | 31 July 1919 | **31 July 1919** — whole Act. No separate commencement section in the enacted text (s.52 is short title only); default under the Acts of Parliament (Commencement) Act 1793. |
| `town-country-planning-act-1947` | 6 August 1947 | Passing-day provisions under s.120(2) on **6 August 1947**; appointed day **1 July 1948** (SI 1948/213) for the rest of the Act. |
| `housing-act-1980` | 8 August 1980 | Chapter I (right to buy) **3 October 1980** by enacted s.153(1) — eight weeks beginning with Royal Assent. Not by SI. Commencement No. 1 does not appoint Part I. |
| `renters-rights-act-2025` | 27 October 2025 | 1 May 2026 for Chapter 1 of Part 1, except section 25(3), for assured tenancies that are not social housing assured tenancies (SI 2026/421). |

For the 1919 and 1947 anchors, `extent` gives the extent sections read from the enacted text: section 51 (1919) and section 120(3)–(4) (1947).

## Deliberately not included

- **Not verifiable from legislation.gov.uk, GOV.UK or Parliament:** the Increase of Rent and Mortgage Interest (War Restrictions) Act 1915 (not on legislation.gov.uk), the Harlow New Town (Designation) Order 1947 and the Harlow Development Corporation (no primary text found), and the Office of the Deputy Prime Minister (the 2002 transfer order did not clearly cover housing).
- **The 2024 return to the name Ministry of Housing, Communities and Local Government.** GOV.UK gives the month (July 2024) but not the day. It is described on the DLUHC record, whose `end_date` is blank.
- **Commencement orders that have not been read.** These include the Renters' Rights Act appointment for social housing, and most orders for the 2002–2024 Acts. (Housing Act 1980 Chapter I is pinned from the Act itself, not from a missing SI.)
- **Pledges, archive records and long-run housebuilding series.** Those are kept in separate files.
- **Any causal claim.** A linked indicator is context only.

Load check: `uv run pytest tests/test_policy_events.py`
