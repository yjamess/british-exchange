# QA report — Economy 03 LMS flagship set · 2026-11-14

## Scope

- Domain: [03 · Employment & Labour Market](https://app.notion.com/p/414654717685813fb55ad2fc81cd4e4f)
- Kickoff: `docs/agent-kickoff-validation-economy-03-lms.md`
- Handover: `docs/handover-economy-03-employment.md`
- Packages: `employment-rate` (LF24), `economic-inactivity-rate` (LF2S),
  `employment-level` (LF2G), `unemployment-level` (LF2I),
  `economic-inactivity-level` (LF2M), `unemployment-rate` (LF2Q)
- Vintage: LMS raw `2026-11-14` · ONS release **2026-10-19**
  ([Labour market overview, UK: October 2026](https://www.ons.gov.uk/employmentandlabourmarket/peopleinwork/employmentandemployeetypes/bulletins/uklabourmarket/october2026))
- Script: `validation.qa_economy_03_lms_2026_11_14`

## Independence

Checks recompute from disk raw + curated only. No curated rewrites.
Bulletin spots for LF24 / LF2S confirmed against the Oct 2026 overview
(employment 75.3%, inactivity 20.9% for aged 16–64, Jun–Aug 2026).
Bulletin headline unemployment **4.7%** is aged **16+** — distinct from
LF2Q **4.9%** (16–64); pin correctly keeps LF2Q.

## Checks

| ID | Check | Result | Notes |
|----|-------|--------|-------|
| C1 | employment-rate files | **pass** | raw=lf24_lms.json |
| C1 | employment-rate checksum | **pass** | disk=b68f87c2ed59… |
| C7 | employment-rate geo/age/SA/CDID | **pass** | series=LF24 |
| C8 | employment-rate LFS caveats | **pass** | keywords present |
| C6 | employment-rate provisional | **pass** | prov=1 final=665 latest=2026-07-01 |
| C1 | employment-rate raw==curated tail | **pass** | raw=75.3 curated=75.3 |
| C2 | employment-rate spot Jul | **pass** | got=75.3 expected=75.3 |
| C2 | employment-rate vs bulletin | **pass** | bulletin 16–64 Jun–Aug 2026 = 75.3% |
| C1 | economic-inactivity-rate files | **pass** | raw=lf2s_lms.json |
| C1 | economic-inactivity-rate checksum | **pass** | disk=dff86605f7fe… |
| C7 | economic-inactivity-rate geo/age/SA/CDID | **pass** | series=LF2S |
| C8 | economic-inactivity-rate LFS caveats | **pass** | keywords present |
| C6 | economic-inactivity-rate provisional | **pass** | prov=1 final=665 latest=2026-07-01 |
| C1 | economic-inactivity-rate raw==curated tail | **pass** | raw=20.9 curated=20.9 |
| C2 | economic-inactivity-rate spot Jul | **pass** | got=20.9 expected=20.9 |
| C2 | inactivity-rate vs bulletin | **pass** | bulletin 16–64 Jun–Aug 2026 = 20.9% |
| C1 | employment-level files | **pass** | raw=lf2g_lms.json |
| C1 | employment-level checksum | **pass** | disk=649acb03fd17… |
| C7 | employment-level geo/age/SA/CDID | **pass** | series=LF2G |
| C8 | employment-level LFS caveats | **pass** | keywords present |
| C6 | employment-level provisional | **pass** | prov=1 final=665 latest=2026-07-01 |
| C1 | employment-level raw==curated tail | **pass** | raw=32823.0 curated=32823.0 |
| C2 | employment-level spot Jul | **pass** | got=32823.0 expected=32823.0 |
| C1 | unemployment-level files | **pass** | raw=lf2i_lms.json |
| C1 | unemployment-level checksum | **pass** | disk=a6d06fc302d5… |
| C7 | unemployment-level geo/age/SA/CDID | **pass** | series=LF2I |
| C8 | unemployment-level LFS caveats | **pass** | keywords present |
| C6 | unemployment-level provisional | **pass** | prov=1 final=665 latest=2026-07-01 |
| C1 | unemployment-level raw==curated tail | **pass** | raw=1675.0 curated=1675.0 |
| C2 | unemployment-level spot Jul | **pass** | got=1675.0 expected=1675.0 |
| C1 | economic-inactivity-level files | **pass** | raw=lf2m_lms.json |
| C1 | economic-inactivity-level checksum | **pass** | disk=6f2dc956d67b… |
| C7 | economic-inactivity-level geo/age/SA/CDID | **pass** | series=LF2M |
| C8 | economic-inactivity-level LFS caveats | **pass** | keywords present |
| C6 | economic-inactivity-level provisional | **pass** | prov=1 final=665 latest=2026-07-01 |
| C1 | economic-inactivity-level raw==curated tail | **pass** | raw=9091.0 curated=9091.0 |
| C2 | economic-inactivity-level spot Jul | **pass** | got=9091.0 expected=9091.0 |
| C1 | unemployment-rate files | **pass** | raw=lf2q_lms.json |
| C1 | unemployment-rate checksum | **pass** | disk=371e47deb6d8… |
| C7 | unemployment-rate geo/age/SA/CDID | **pass** | series=LF2Q |
| C8 | unemployment-rate LFS caveats | **pass** | keywords present |
| C6 | unemployment-rate provisional | **pass** | prov=1 final=665 latest=2026-07-01 |
| C1 | unemployment-rate raw==curated tail | **pass** | raw=4.9 curated=4.9 |
| C2 | unemployment-rate spot Jul | **pass** | got=4.9 expected=4.9 |
| C5 | unemployment-rate denominator | **pass** | unit=% of economically active aged 16–64, SA |
| C5 | LF2Q ≠ bulletin 16+ headline | **pass** | bulletin quotes 4.7% aged 16+; pin is LF2Q 16–64 (4.9%) — correct |
| C3 | composition vs LF2O | **pass** | sum=43589.0 LF2O=43590.0 diff=1.0 |
| C4 | emp rate from counts | **pass** | counts=75.301 pin=75.3 |
| C4 | inact rate from counts | **pass** | counts=20.856 pin=20.9 |
| C4 | unemp rate from counts | **pass** | counts=4.855 pin=4.9 |

## Summary

- **Verdict: pass** (50 pass / 0 warn / 0 fail)
- Flagship composition from LF2G+LF2I+LF2M is trusted for G3 design
  (sum 43,589 vs LF2O 43,590; ±1 thousand published rounding).
- Recommend Orchestrator **Ready** flip on all six registry rows + cloud load.
- Follow-up: re-pin all six after **17 Nov 2026** LMS.
- Out of scope: INAC01 reasons, vacancies, hours, geography, frontend.

## Blockers

- None for Ready on this pin set.
