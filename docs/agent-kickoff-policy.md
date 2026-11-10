# Kickoff — Housing Domain 10 Policy & History

Brief: [Housing Policy & History](https://app.notion.com/p/40f6547176858196aeacd8c3155fee87)

**Question (locked):** How did Britain build the housing system it has today, and which decisions shaped the way we live?

**Views (locked):** Time Machine · Housing Eras · Policy Observatory · Promise vs Delivery · Archive

The Time Machine opens first. The canvas heading is “How Britain came to live this way.”

## Do not collapse these dates

- A policy announcement, Royal Assent, commencement, an observation period and a publication date are different.
- The mark on the Time Machine is Royal Assent.
- A commencement row names the instrument and the provisions it appoints. It is not the whole Act.
- England, Wales, Scotland and Northern Ireland do not share one housing statute.
- A linked indicator is context. Overlap is not an effect.
- Eras are browsing ranges. An empty range is an empty range.

## Anchor set (checked 10 November 2026)

| Act | Royal Assent | Commencement in the register |
| --- | --- | --- |
| Housing, Town Planning, &c. Act 1919 | 31 July 1919 | **31 July 1919** whole Act — 1793 default; s.52 is short title only |
| Town and Country Planning Act 1947 | 6 August 1947 | Passing-day list under s.120(2) on **6 August 1947**; appointed day **1 July 1948** (SI 1948/213) |
| Housing Act 1980 | 8 August 1980 | Chapter I (right to buy) **3 October 1980** by s.153(1) — eight weeks from assent; not by SI. Chapter II same day by s.153(2) default. SI 1980/1406 does not appoint Part I. |
| Renters' Rights Act 2025 | 27 October 2025 | 1 May 2026, Chapter 1 of Part 1 except section 25(3), for assured tenancies that are not social housing assured tenancies (SI 2026/421, England) |

Shared shape: `src/britain_exchange/policy_event.py`. Housing file: `data/housing/policy-events/events.json`. These are not statistical observations.

## Not in this slice

- Building the Welfare State as a long essay, or any archival image (rights not checked).
- The institutional diagram.
- Council-house sales as a causal claim. `right-to-buy-sales-and-replacements` and dwelling stock by tenure stay context only.

## Next

1. ~~Pin Housing Act 1980 Chapter I commencement.~~ Done 2026-11-10 — s.153(1) enacted; day = 3 October 1980.
2. ~~Pin 1919 and 1947 commencement.~~ Done 2026-11-10 — 1919 by 1793 default; 1947 by s.120(2) + SI 1948/213.
3. Add an Act only after its assent, extent and commencement have each been read.
4. Score a target only when the pledge and the series share geography, period and unit. Right to Buy one-for-one (2012) is scored against `right-to-buy-one-for-one` (2026-11-10).
