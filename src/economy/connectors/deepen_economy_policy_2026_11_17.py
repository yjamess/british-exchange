"""Deepen Economy Domain 10 policy register (Orchestrator 10, 2026-11-17).

Pins sourced gaps, adds Housing/Energy cross-register links, a small Budget set
with OBR costings, institutions, and evaluations. Does not invent dates.

Run:
  uv run python src/economy/connectors/deepen_economy_policy_2026_11_17.py
  uv run python -m pytest tests/test_economy_policy_events.py -q
"""

from __future__ import annotations

import json
from copy import deepcopy
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
EVENTS_PATH = ROOT / "data" / "economy" / "economic-policy" / "events.json"
RETRIEVED = "2026-11-17"


def _by_id(events: list[dict]) -> dict[str, dict]:
    return {e["id"]: e for e in events}


def _source(label: str, url: str, role: str = "primary") -> dict:
    return {"label": label, "url": url, "role": role}


def _related(registry: str, event_id: str, note: str) -> dict:
    return {"registry": registry, "id": event_id, "note": note}


def _measure(label: str, value: str, source: dict | None = None) -> dict:
    row: dict = {"label": label, "value": value}
    if source is not None:
        row["source"] = source
    return row


def _eval(label: str, url: str, publisher: str, date: str, finding: str) -> dict:
    return {
        "label": label,
        "url": url,
        "publisher": publisher,
        "date": date,
        "finding": finding,
    }


def _institution(
    *,
    event_id: str,
    title: str,
    citation: str,
    aliases: list[str],
    topics: list[str],
    policy_area: str,
    summary: str,
    institution: str,
    start_date: str,
    date_note: str,
    status: str,
    status_note: str,
    sources: list[dict],
    dossier: dict,
    announcement_date: str | None = None,
    end_date: str | None = None,
    linked_indicators: list[dict] | None = None,
) -> dict:
    return {
        "id": event_id,
        "title": title,
        "citation": citation,
        "aliases": aliases,
        "type": "institution",
        "topics": topics,
        "policy_area": policy_area,
        "summary": summary,
        "institution": institution,
        "jurisdiction": "United Kingdom",
        "nations": ["england", "wales", "scotland", "northern-ireland"],
        "extent": "A United Kingdom institution.",
        "announcement_date": announcement_date,
        "enactment_date": None,
        "start_date": start_date,
        "end_date": end_date,
        "date_note": date_note,
        "commencements": [],
        "status": status,
        "status_note": status_note,
        "sources": sources,
        "linked_indicators": linked_indicators or [],
        "repealed_date": None,
        "dossier": dossier,
    }


def _programme(
    *,
    event_id: str,
    title: str,
    citation: str,
    aliases: list[str],
    topics: list[str],
    policy_area: str,
    summary: str,
    institution: str,
    announcement_date: str | None,
    start_date: str,
    end_date: str | None,
    date_note: str,
    status: str,
    status_note: str,
    sources: list[dict],
    dossier: dict,
    linked_indicators: list[dict] | None = None,
) -> dict:
    return {
        "id": event_id,
        "title": title,
        "citation": citation,
        "aliases": aliases,
        "type": "programme",
        "topics": topics,
        "policy_area": policy_area,
        "summary": summary,
        "institution": institution,
        "jurisdiction": "United Kingdom",
        "nations": ["england", "wales", "scotland", "northern-ireland"],
        "extent": "United Kingdom fiscal or monetary framework unless a source says otherwise.",
        "announcement_date": announcement_date,
        "enactment_date": None,
        "start_date": start_date,
        "end_date": end_date,
        "date_note": date_note,
        "commencements": [],
        "status": status,
        "status_note": status_note,
        "sources": sources,
        "linked_indicators": linked_indicators or [],
        "repealed_date": None,
        "dossier": dossier,
    }


def deepen(raw: dict) -> dict:
    out = deepcopy(raw)
    out["retrieved_at"] = RETRIEVED
    out["note"] = (
        "Economy Domain 10 register of economic-policy decisions: Acts, programmes and "
        "institutions, each checked against legislation.gov.uk, Hansard, GOV.UK, the OBR, "
        "the Bank of England or other named official sources. Announcement, Royal Assent, "
        "commencement and repeal dates are separate fields. A dossier, where present, keeps "
        "three kinds of evidence apart: what policymakers said, what was done, and what "
        "others concluded. Linked indicators are context only. Housing and Energy decisions "
        "live in their own registers and are referenced by id, never copied. Empty lists mean "
        "nothing was read in this pass, not that nothing exists. Deepen pass "
        f"{RETRIEVED}: cross-register links, Budget/Finance measures with OBR costings, "
        "pinned gap dates, institutions and evaluations."
    )
    events = out["events"]
    by_id = _by_id(events)

    # --- Pin: Bank of England Act 1946 appointed day ---
    act_1946 = by_id["bank-of-england-act-1946"]
    act_1946["commencements"] = [
        {
            "date": "1946-03-01",
            "instrument": "Bank of England (Appointed Day) Order 1946 (SR&O 1946/237)",
            "citation": "SR&O 1946/237",
            "url": "https://www.bankofengland.co.uk/-/media/boe/files/annual-report/1947/boe-1947.pdf",
            "scope": (
                "Appointed day under section 5 for transfer of Bank stock and related "
                "provisions. The Order itself is not on legislation.gov.uk in this pass; "
                "the Bank's Report for the year ended 28 February 1947 states the Act "
                "\"came into force on 1st March, 1946\". The Debt Management Office press "
                "notice of 6 February 2015 also records the transfer date as 1 March 1946."
            ),
        }
    ]
    act_1946["sources"].extend(
        [
            _source(
                "Bank of England Annual Report 1947 (appointed day)",
                "https://www.bankofengland.co.uk/-/media/boe/files/annual-report/1947/boe-1947.pdf",
                "official",
            ),
            _source(
                "DMO — redemption of 3% Treasury Stock (transfer date note)",
                "https://www.dmo.gov.uk/media/a0olvmsx/pr060215.pdf",
                "official",
            ),
        ]
    )
    act_1946["dossier"]["implementation"] = (
        "Royal Assent 14 February 1946. Section 5 left the appointed day to a Treasury order. "
        "The Bank's Annual Report for the year ended 28 February 1947 records that the Act "
        "came into force on 1 March 1946; the DMO likewise treats 1 March 1946 as the "
        "transfer date for the stock exchange. Later amendments are noted on legislation.gov.uk."
    )
    act_1946["dossier"]["related"].append(
        _related(
            "economy",
            "hm-treasury",
            "The Act placed Bank stock with a Treasury nominee and reserved a power of direction to the Treasury (s. 4).",
        )
    )

    # --- Pin / amend: BoE 1998 background with 1992 objective ---
    act_1998 = by_id["bank-of-england-act-1998"]
    act_1998["dossier"]["background"] = (
        "On 8 October 1992 the Chancellor set an inflation range of 1%–4% for annual RPIX "
        "(Bank of England Quarterly Bulletin, Summer 2005). On 12 November 1992 he told the "
        "Commons: \"Underlying inflation will be kept within the range of 1 to 4 per cent, "
        "and our aim is to get it down to the lower half of that range by the end of this "
        "Parliament\" (HC Deb 12 November 1992 vol 213 col 993). The Bank's history page "
        "records that in October 1992 the Chancellor invited the Bank \"to provide a regular "
        "report on the progress being made towards the Government's inflation objective\". "
        "On 20 May 1997 the Chancellor told the House: \"On 6 May, I announced the means by "
        "which we would achieve that promise: by giving the Bank operational responsibility "
        "for setting interest rates.\" (HC Deb 20 May 1997 col 508)."
    )
    act_1998["dossier"]["related"].extend(
        [
            _related(
                "economy",
                "inflation-objective-1992",
                "The pre-independence inflation-targeting framework this Act put under operational Bank control.",
            ),
            _related(
                "economy",
                "monetary-policy-committee",
                "Section 13 creates the MPC.",
            ),
            _related(
                "economy",
                "hm-treasury",
                "The Government sets the inflation target; the Treasury retained fiscal policy.",
            ),
        ]
    )
    act_1998["sources"].extend(
        [
            _source(
                "HC Deb 12 November 1992 vol 213 cc993-1016 (Autumn Statement)",
                "https://api.parliament.uk/historic-hansard/commons/1992/nov/12/autumn-statement",
            ),
            _source(
                "Bank of England Quarterly Bulletin Summer 2005 — inflation targeting history",
                "https://www.bankofengland.co.uk/-/media/boe/files/quarterly-bulletin/2005/the-inflation-targeting-framework-from-an-historical-perspective.pdf",
                "official",
            ),
        ]
    )

    # --- WRA 2012: under-occupancy, UC national availability, cross-link, IFS ---
    wra = by_id["welfare-reform-act-2012"]
    wra["commencements"].extend(
        [
            {
                "date": "2012-11-27",
                "instrument": "SI 2012/2946 art. 2(1)(a)",
                "citation": "S.I. 2012/2946",
                "url": "https://www.legislation.gov.uk/uksi/2012/2946/made",
                "scope": (
                    "Section 69 (housing benefit: determination of appropriate maximum) in force "
                    "for regulation-making on 27 November 2012; for all other purposes on "
                    "1 January 2013 (art. 2(1))."
                ),
            },
            {
                "date": "2013-04-01",
                "instrument": "SI 2012/3040 regs 3(2)(a), 4(2)(a), 5 and 6",
                "citation": "S.I. 2012/3040",
                "url": "https://www.legislation.gov.uk/uksi/2012/3040/made",
                "scope": (
                    "Housing Benefit (Amendment) Regulations 2012: social-sector size criteria "
                    "(14%/25% reductions) in force 1 April 2013. Made under powers including "
                    "WRA 2012 s. 69. Instrument made 3 December 2012."
                ),
            },
        ]
    )
    wra["sources"].extend(
        [
            _source(
                "SI 2012/2946 (Commencement No. 5) Order",
                "https://www.legislation.gov.uk/uksi/2012/2946/made",
            ),
            _source(
                "SI 2012/3040 — Housing Benefit (Amendment) Regulations 2012",
                "https://www.legislation.gov.uk/uksi/2012/3040/made",
            ),
            _source(
                "GOV.UK — Universal Credit transition to full service",
                "https://www.gov.uk/government/publications/universal-credit-transition-to-full-service",
                "official",
            ),
        ]
    )
    wra["dossier"]["mechanism"] = (
        "Universal credit as a single payment under Part 1; a benefit cap by regulations under "
        "section 96(1); housing benefit maximum amended by section 69. Under-occupation in the "
        "social rented sector was given effect by the Housing Benefit (Amendment) Regulations "
        "2012 (SI 2012/3040), reducing eligible rent by 14% for one spare bedroom and 25% for "
        "two or more (reg. B13)."
    )
    wra["dossier"]["implementation"] = (
        "First universal credit commencement 29 April 2013 in four postcode districts "
        "(SI 2013/983). Section 69 commenced for regulations on 27 November 2012 and fully on "
        "1 January 2013 (SI 2012/2946); the social-sector size criteria applied from 1 April "
        "2013 (SI 2012/3040). DWP's Universal Credit transition page was updated on "
        "12 December 2018 to state that \"Universal Credit is now available everywhere in "
        "Great Britain\" (new claims / full service). Managed migration of remaining legacy "
        "claimants continued under later transitional regulations and is not collapsed into "
        "that date. The Act was amended in 2020 and 2024."
    )
    wra["dossier"]["measures"].extend(
        [
            _measure(
                "Social-sector under-occupation deduction",
                (
                    "From 1 April 2013, working-age housing benefit in the social rented sector "
                    "reduced by 14% (one spare bedroom) or 25% (two or more) under SI 2012/3040, "
                    "made by virtue of WRA 2012 s. 69."
                ),
                _source(
                    "SI 2012/3040 regulation B13",
                    "https://www.legislation.gov.uk/uksi/2012/3040/made",
                ),
            ),
            _measure(
                "Universal Credit full service — Great Britain coverage",
                (
                    "DWP update 12 December 2018: \"Universal Credit is now available everywhere "
                    "in Great Britain.\" This pins national new-claim / full-service availability, "
                    "not completion of managed migration."
                ),
                _source(
                    "GOV.UK — Universal Credit transition to full service",
                    "https://www.gov.uk/government/publications/universal-credit-transition-to-full-service",
                    "official",
                ),
            ),
        ]
    )
    wra["dossier"]["evaluations"].append(
        _eval(
            "Universal credit: incomes, incentives and the remaining roll-out",
            "https://ifs.org.uk/sites/default/files/2024-06/Universal-Credit-Income-incentives-and-remaining-rollouot-Institue-for-Fiscal-Studies-Report.pdf",
            "Institute for Fiscal Studies",
            "2024-06-01",
            (
                "\"Taken as a whole, UC represents a net giveaway of about £2½ billion compared "
                "with the legacy system.\""
            ),
        )
    )
    wra["dossier"]["related"].extend(
        [
            _related(
                "housing",
                "housing-act-1996",
                (
                    "Part IV of the Housing Act 1996 dealt with housing benefit administration; "
                    "WRA 2012 s. 69 and SI 2012/3040 changed the social-sector maximum housing "
                    "benefit. Housing decision stays in the Housing register."
                ),
            ),
            _related(
                "housing",
                "localism-act-2011",
                (
                    "Coalition-era housing and local-government reform running alongside the "
                    "welfare-reform programme. Referenced, not copied."
                ),
            ),
        ]
    )

    # --- NMWA: link LPC ---
    nmwa = by_id["national-minimum-wage-act-1998"]
    nmwa["dossier"]["related"].append(
        _related(
            "economy",
            "low-pay-commission",
            "The Act put the Low Pay Commission on a statutory footing (ss. 5–8 and Schedule 1).",
        )
    )

    # --- Permanent OBR: related to interim ---
    obr = by_id["office-for-budget-responsibility"]
    obr["dossier"]["background"] = (
        "An interim Office for Budget Responsibility was established on 17 May 2010 "
        "(HM Treasury press notice). The Budget Responsibility and National Audit Act 2011 "
        "then created the statutory OBR; SI 2011/892 brought section 3 into force on "
        "4 April 2011."
    )
    obr["dossier"]["related"].append(
        _related(
            "economy",
            "office-for-budget-responsibility-interim",
            "Interim body established 17 May 2010; this record is the statutory successor from 4 April 2011.",
        )
    )
    obr["dossier"]["related"].append(
        _related(
            "economy",
            "hm-treasury",
            "Sponsoring department; the Charter for Budget Responsibility is made by the Treasury.",
        )
    )

    # --- Charter: HMT related ---
    charter = by_id["charter-for-budget-responsibility-autumn-2025"]
    charter["dossier"]["related"].append(
        _related("economy", "hm-treasury", "The Charter is HM Treasury's fiscal framework document.")
    )

    # --- New records ---
    new_events = [
        _programme(
            event_id="inflation-objective-1992",
            title="Inflation objective, October–November 1992",
            citation="Chancellor’s monetary framework after ERM exit",
            aliases=["1992 inflation target", "RPIX 1–4% range"],
            topics=["monetary"],
            policy_area="monetary",
            summary=(
                "After sterling left the ERM, the Chancellor established an inflation "
                "objective of 1%–4% annual RPIX, aiming for the lower half of that range "
                "by the end of the Parliament."
            ),
            institution="HM Treasury",
            announcement_date="1992-10-08",
            start_date="1992-10-08",
            end_date=None,
            date_note=(
                "Announcement dated 8 October 1992 in the Bank of England Quarterly Bulletin "
                "(Summer 2005). Restated to the Commons on 12 November 1992 (Autumn Statement). "
                "Superseded in practice by later remits; not a closed programme with a single repeal day."
            ),
            status="succeeded",
            status_note=(
                "Succeeded as the operational framework when the Bank of England Act 1998 "
                "gave the Bank operational responsibility for meeting the Government's target."
            ),
            sources=[
                _source(
                    "Bank of England Quarterly Bulletin Summer 2005 — inflation targeting history",
                    "https://www.bankofengland.co.uk/-/media/boe/files/quarterly-bulletin/2005/the-inflation-targeting-framework-from-an-historical-perspective.pdf",
                    "official",
                ),
                _source(
                    "HC Deb 12 November 1992 vol 213 cc993-1016 (Autumn Statement)",
                    "https://api.parliament.uk/historic-hansard/commons/1992/nov/12/autumn-statement",
                ),
            ],
            linked_indicators=[
                {
                    "id": "cpi-inflation",
                    "title": "Consumer price inflation (CPI)",
                    "domain": "inflation",
                    "view": "rate",
                    "relationship": "context",
                    "note": "Modern CPI series is context only; the 1992 objective was RPIX.",
                }
            ],
            dossier={
                "background": (
                    "Sterling left the ERM on 16 September 1992. Three weeks later the Chancellor "
                    "set an explicit inflation objective to re-anchor monetary policy."
                ),
                "objectives": (
                    "Bank of England Quarterly Bulletin (Summer 2005): a range of 1%–4% for annual "
                    "RPIX inflation, with the government's objective \"for inflation to be in the "
                    "lower half of the 1%–4% range by the end of that Parliament\". Autumn Statement "
                    "12 November 1992: \"Underlying inflation will be kept within the range of "
                    "1 to 4 per cent, and our aim is to get it down to the lower half of that "
                    "range by the end of this Parliament.\""
                ),
                "mechanism": (
                    "Treasury-set inflation objective with greater openness, including inviting "
                    "the Bank to publish a regular Inflation Report (Bank history; Mansion House / "
                    "Autumn Statement period)."
                ),
                "implementation": (
                    "Announced 8 October 1992 (BoE Quarterly Bulletin dating); restated in the "
                    "Commons Autumn Statement on 12 November 1992. Later remits changed the "
                    "target measure and the point target; operational independence followed in 1998."
                ),
                "measures": [
                    _measure(
                        "RPIX inflation range",
                        "1%–4% annual RPIX; aim for the lower half by the end of the Parliament.",
                        _source(
                            "HC Deb 12 November 1992 vol 213 col 993",
                            "https://api.parliament.uk/historic-hansard/commons/1992/nov/12/autumn-statement",
                        ),
                    )
                ],
                "financial": [],
                "evaluations": [],
                "related": [
                    _related(
                        "economy",
                        "bank-of-england-act-1998",
                        "Put operational responsibility for meeting the Government's inflation target with the Bank.",
                    ),
                    _related(
                        "economy",
                        "hm-treasury",
                        "The Chancellor set the objective.",
                    ),
                ],
            },
        ),
        _institution(
            event_id="office-for-budget-responsibility-interim",
            title="Office for Budget Responsibility (interim)",
            citation="HM Treasury press notice 01/10, 17 May 2010",
            aliases=["Interim OBR"],
            topics=["institutions", "fiscal"],
            policy_area="institutions",
            summary=(
                "Non-statutory Office for Budget Responsibility established on 17 May 2010 "
                "under Sir Alan Budd, ahead of the statutory OBR created by the 2011 Act."
            ),
            institution="HM Treasury (sponsoring department)",
            announcement_date="2010-05-17",
            start_date="2010-05-17",
            end_date="2011-04-03",
            date_note=(
                "Start: HM Treasury press notice published 17 May 2010 — \"established on an "
                "interim basis today\". End: day before statutory OBR commencement (4 April 2011)."
            ),
            status="succeeded",
            status_note="Succeeded by the statutory Office for Budget Responsibility on 4 April 2011.",
            sources=[
                _source(
                    "Chancellor announces policies to enhance fiscal credibility",
                    "https://www.gov.uk/government/news/chancellor-announces-policies-to-enhance-fiscal-credibility",
                    "official",
                ),
                _source(
                    "NAO — Examination of interim OBR forecasts for the emergency Budget 2010",
                    "https://www.nao.org.uk/reports/examination-of-the-forecasts-prepared-by-the-interim-office-for-budget-responsibility-for-the-emergency-budget-2010/",
                    "official",
                ),
            ],
            dossier={
                "background": (
                    "The incoming coalition government created an interim fiscal watchdog before "
                    "putting the OBR on a statutory footing."
                ),
                "objectives": (
                    "GOV.UK press notice 17 May 2010: Sir Alan Budd \"will chair a new Office for "
                    "Budget Responsibility (OBR), established on an interim basis today, to assess "
                    "the state of the public finances\"."
                ),
                "mechanism": (
                    "Non-statutory Budget Responsibility Committee with a civil-service secretariat, "
                    "producing independent forecasts ahead of and at the June 2010 emergency Budget "
                    "(NAO examination; Treasury Committee report)."
                ),
                "implementation": (
                    "Established 17 May 2010. Produced a pre-Budget forecast (14 June 2010) and "
                    "Budget forecasts (22 June 2010). Statutory OBR commenced 4 April 2011."
                ),
                "measures": [],
                "financial": [],
                "evaluations": [
                    _eval(
                        "Examination of the forecasts prepared by the interim Office for Budget Responsibility for the emergency Budget 2010",
                        "https://www.nao.org.uk/reports/examination-of-the-forecasts-prepared-by-the-interim-office-for-budget-responsibility-for-the-emergency-budget-2010/",
                        "National Audit Office",
                        "2010-06-22",
                        (
                            "\"The Chancellor launched the interim Office for Budget Responsibility "
                            "on 17 May 2010.\""
                        ),
                    )
                ],
                "related": [
                    _related(
                        "economy",
                        "office-for-budget-responsibility",
                        "Statutory successor from 4 April 2011.",
                    ),
                    _related(
                        "economy",
                        "emergency-budget-june-2010",
                        "Interim OBR forecasts underpinned the June 2010 Budget.",
                    ),
                    _related(
                        "economy",
                        "hm-treasury",
                        "Sponsoring department for the interim body.",
                    ),
                ],
            },
        ),
        _institution(
            event_id="low-pay-commission",
            title="Low Pay Commission",
            citation="National Minimum Wage Act 1998, ss. 5–8 and Schedule 1",
            aliases=["LPC"],
            topics=["labour-market", "institutions"],
            policy_area="labour-market",
            summary=(
                "Independent body advising on the National Minimum Wage. Established on a "
                "non-statutory basis in July 1997 and given a statutory footing by the 1998 Act."
            ),
            institution="Low Pay Commission; sponsoring department as from time to time",
            start_date="1997-07-01",
            date_note=(
                "Month only: July 1997. National Archives administrative history and the Low Pay "
                "Commission's 20-year history both date non-statutory establishment to July 1997; "
                "the day within July is not pinned. Statutory footing followed in the 1998 Act."
            ),
            status="active",
            status_note="Active advisory non-departmental public body.",
            sources=[
                _source(
                    "National Archives — Low Pay Commission (organisation history)",
                    "https://discovery.nationalarchives.gov.uk/details/c/F268677",
                    "official",
                ),
                _source(
                    "Low Pay Commission — 20 years of the National Minimum Wage",
                    "https://assets.publishing.service.gov.uk/media/5c9e0e72e5274a527faae38a/20_years_of_the_National_Minimum_Wage_-_a_history_of_the_UK_minimum_wage_and_its_effects.pdf",
                    "official",
                ),
                _source(
                    "National Minimum Wage Act 1998 — Schedule 1",
                    "https://www.legislation.gov.uk/ukpga/1998/39/schedule/1",
                ),
            ],
            linked_indicators=[
                {
                    "id": "nominal-earnings",
                    "title": "Nominal average weekly earnings",
                    "domain": "wages",
                    "view": "vs-prices",
                    "relationship": "context",
                    "note": "Earnings context only; not an effect of the Commission.",
                }
            ],
            dossier={
                "background": (
                    "Set up after the 1997 election to recommend how a National Minimum Wage "
                    "should be introduced, before the 1998 Act."
                ),
                "objectives": (
                    "Advise the government on the National Minimum Wage (National Archives; "
                    "NMWA 1998 ss. 5–8)."
                ),
                "mechanism": (
                    "Independent commissioners drawn from employer, worker and independent "
                    "backgrounds; reports on rates and related matters referred by the Secretary of State."
                ),
                "implementation": (
                    "Non-statutory establishment July 1997. Statutory provisions in NMWA 1998; "
                    "section 8 commenced 1 November 1998 (SI 1998/2574)."
                ),
                "measures": [],
                "financial": [],
                "evaluations": [],
                "related": [
                    _related(
                        "economy",
                        "national-minimum-wage-act-1998",
                        "Establishing / confirming statute.",
                    )
                ],
            },
        ),
        _institution(
            event_id="hm-treasury",
            title="HM Treasury",
            citation="Ministerial department; Treasury Board from 1612",
            aliases=["Treasury", "HMT"],
            topics=["institutions", "fiscal"],
            policy_area="institutions",
            summary=(
                "The United Kingdom government's economic and finance ministry. The modern "
                "Treasury Board dates from 1612; the department remains active."
            ),
            institution="HM Treasury",
            start_date="1612-06-01",
            date_note=(
                "Month/year pin only. Permanent Secretary Sir Nicholas Macpherson (16 January 2013) "
                "dated the modern era from \"the post of Lord High Treasurer first went into "
                "Commission, four hundred years ago last June\" (June 1612). Chancellor Osborne "
                "(22 October 2012) likewise dates the Treasury Board to 1612. Day within June "
                "is not pinned; earlier medieval Treasury history is not collapsed into this date."
            ),
            status="active",
            status_note="Active ministerial department.",
            sources=[
                _source(
                    "Speech by the Permanent Secretary — The origins of Treasury control",
                    "https://www.gov.uk/government/speeches/speech-by-the-permanent-secretary-to-the-treasury-sir-nicholas-macpherson-the-origins-of-treasury-control",
                    "official",
                ),
                _source(
                    "Chancellor Osborne — Speaker's House speech (Treasury Board 1612)",
                    "https://www.gov.uk/government/speeches/speech-by-the-chancellor-of-the-exchequer-rt-hon-george-osborne-mp-at-speakers-house",
                    "official",
                ),
                _source(
                    "GOV.UK — HM Treasury about",
                    "https://www.gov.uk/government/organisations/hm-treasury/about",
                    "official",
                ),
            ],
            linked_indicators=[
                {
                    "id": "public-sector-net-borrowing",
                    "title": "Public sector net borrowing",
                    "domain": "debt",
                    "view": "borrowing",
                    "relationship": "context",
                    "note": "Fiscal context only.",
                }
            ],
            dossier={
                "background": (
                    "Crown finance institution that evolved into the modern economic and finance "
                    "ministry. This record pins the 1612 Treasury Board from official speeches; "
                    "it does not invent a Domesday founding day."
                ),
                "objectives": (
                    "GOV.UK: \"maintaining control over public spending, setting the direction of "
                    "the UK's economic policy and working to achieve strong and sustainable "
                    "economic growth.\""
                ),
                "mechanism": (
                    "Ministerial department under the Chancellor of the Exchequer; fiscal framework "
                    "documents (Charter), Budgets and sponsoring relationships with fiscal and "
                    "revenue bodies."
                ),
                "implementation": (
                    "Continuous. Operational monetary-policy responsibility moved to the Bank in "
                    "1998; the OBR became the independent forecaster from 2010/2011."
                ),
                "measures": [],
                "financial": [],
                "evaluations": [],
                "related": [
                    _related(
                        "economy",
                        "bank-of-england-act-1946",
                        "Nationalisation placed Bank stock with a Treasury nominee.",
                    ),
                    _related(
                        "economy",
                        "bank-of-england-act-1998",
                        "Treasury retained the inflation target while the Bank gained operational independence.",
                    ),
                    _related(
                        "economy",
                        "office-for-budget-responsibility",
                        "Independent forecaster sponsored alongside Treasury fiscal policy.",
                    ),
                    _related(
                        "economy",
                        "hm-revenue-and-customs",
                        "Revenue department under Treasury ministerial oversight.",
                    ),
                ],
            },
        ),
        _programme(
            event_id="emergency-budget-june-2010",
            title="Emergency Budget, June 2010",
            citation="HM Treasury Budget, 22 June 2010",
            aliases=["June 2010 Budget"],
            topics=["fiscal"],
            policy_area="fiscal",
            summary=(
                "Coalition emergency Budget of 22 June 2010, the first fiscal event to use "
                "forecasts from the interim Office for Budget Responsibility."
            ),
            institution="HM Treasury",
            announcement_date="2010-06-22",
            start_date="2010-06-22",
            end_date=None,
            date_note="Budget day 22 June 2010 (NAO examination of interim OBR forecasts).",
            status="closed",
            status_note="Historical fiscal event; later Budgets replaced its measures.",
            sources=[
                _source(
                    "NAO — Examination of interim OBR forecasts for the emergency Budget 2010",
                    "https://www.nao.org.uk/reports/examination-of-the-forecasts-prepared-by-the-interim-office-for-budget-responsibility-for-the-emergency-budget-2010/",
                    "official",
                ),
                _source(
                    "Chancellor announces policies to enhance fiscal credibility (interim OBR)",
                    "https://www.gov.uk/government/news/chancellor-announces-policies-to-enhance-fiscal-credibility",
                    "official",
                ),
            ],
            linked_indicators=[
                {
                    "id": "public-sector-net-borrowing",
                    "title": "Public sector net borrowing",
                    "domain": "debt",
                    "view": "borrowing",
                    "relationship": "context",
                    "note": "Borrowing context for the 2010 fiscal consolidation era. Not an effect.",
                }
            ],
            dossier={
                "background": (
                    "First Budget of the 2010 coalition, prepared with interim OBR forecasts after "
                    "the 17 May 2010 announcement."
                ),
                "objectives": (
                    "Use independent forecasts for the public finances at the emergency Budget "
                    "(interim OBR remit as described by the NAO)."
                ),
                "mechanism": (
                    "Budget measures scored against interim OBR economic and fiscal forecasts "
                    "published with the Budget documents on 22 June 2010."
                ),
                "implementation": (
                    "Budget day 22 June 2010. Individual tax and spending measures are not all "
                    "listed here; this record anchors the fiscal event and its OBR process."
                ),
                "measures": [],
                "financial": [],
                "evaluations": [],
                "related": [
                    _related(
                        "economy",
                        "office-for-budget-responsibility-interim",
                        "Produced the forecasts used at this Budget.",
                    ),
                    _related(
                        "economy",
                        "hm-treasury",
                        "Budget presented by the Chancellor.",
                    ),
                ],
            },
        ),
        _programme(
            event_id="autumn-budget-2024",
            title="Autumn Budget 2024",
            citation="HM Treasury Budget, 30 October 2024",
            aliases=["Budget 2024", "October 2024 Budget"],
            topics=["fiscal"],
            policy_area="fiscal",
            summary=(
                "Autumn Budget of 30 October 2024. OBR Economic and fiscal outlook records "
                "certified policy costings, including the employer National Insurance rise."
            ),
            institution="HM Treasury",
            announcement_date="2024-10-30",
            start_date="2024-10-30",
            end_date=None,
            date_note="Budget and OBR EFO published 30 October 2024.",
            status="amended",
            status_note="Later fiscal events amended or replaced individual measures; the Budget day stands.",
            sources=[
                _source(
                    "OBR — Economic and fiscal outlook October 2024",
                    "https://obr.uk/efo/economic-and-fiscal-outlook-october-2024/",
                    "official",
                ),
            ],
            linked_indicators=[
                {
                    "id": "tax-receipts",
                    "title": "Public sector current receipts",
                    "domain": "tax",
                    "view": "raises",
                    "relationship": "context",
                    "note": "Receipts context only.",
                },
                {
                    "id": "public-sector-net-borrowing",
                    "title": "Public sector net borrowing",
                    "domain": "debt",
                    "view": "borrowing",
                    "relationship": "context",
                    "note": "Borrowing context only.",
                },
            ],
            dossier={
                "background": (
                    "First Budget of the Starmer government. The OBR published its October 2024 "
                    "Economic and fiscal outlook alongside the Budget."
                ),
                "objectives": (
                    "Budget tax and spending package as scored by the OBR; this record quotes "
                    "OBR costings, not causal claims about growth or inflation."
                ),
                "mechanism": (
                    "Scorecard measures scrutinised and certified by the OBR as reasonable and "
                    "central estimates and incorporated in the EFO forecast."
                ),
                "implementation": (
                    "Announced 30 October 2024. Finance Act and secondary legislation give effect "
                    "to individual measures on their own commencement dates (not all pinned here)."
                ),
                "measures": [
                    _measure(
                        "Employer National Insurance contributions",
                        (
                            "OBR EFO October 2024 (executive summary): an increase in employer NICs, "
                            "via a higher rate and lower threshold, raising £25.7 billion by 2029-30 "
                            "before allowing for its indirect effects on the economy."
                        ),
                        _source(
                            "OBR — Economic and fiscal outlook October 2024",
                            "https://obr.uk/efo/economic-and-fiscal-outlook-october-2024/",
                            "official",
                        ),
                    ),
                    _measure(
                        "Energy profits levy — rate and extension",
                        (
                            "OBR EFO October 2024 lists increasing the rate of the energy profits "
                            "levy and extending it to 2029-30 among other net tax changes."
                        ),
                        _source(
                            "OBR — Economic and fiscal outlook October 2024",
                            "https://obr.uk/efo/economic-and-fiscal-outlook-october-2024/",
                            "official",
                        ),
                    ),
                ],
                "financial": [
                    _measure(
                        "Employer NICs yield by 2029-30 (direct)",
                        "£25.7 billion (OBR EFO October 2024 executive summary).",
                        _source(
                            "OBR — Economic and fiscal outlook October 2024",
                            "https://obr.uk/efo/economic-and-fiscal-outlook-october-2024/",
                            "official",
                        ),
                    ),
                    _measure(
                        "Net effect of Budget policies on borrowing",
                        (
                            "Increase borrowing by £19.6 billion in 2024-25 and by an average of "
                            "£32.3 billion over the next five years (OBR EFO October 2024)."
                        ),
                        _source(
                            "OBR — Economic and fiscal outlook October 2024",
                            "https://obr.uk/efo/economic-and-fiscal-outlook-october-2024/",
                            "official",
                        ),
                    ),
                ],
                "evaluations": [],
                "related": [
                    _related(
                        "economy",
                        "hm-treasury",
                        "Budget presented by the Chancellor.",
                    ),
                    _related(
                        "economy",
                        "office-for-budget-responsibility",
                        "Certified costings and published the accompanying EFO.",
                    ),
                    _related(
                        "energy",
                        "energy-act-2023",
                        (
                            "Budget measure extends the energy profits levy affecting the oil and "
                            "gas sector alongside the wider energy statute book. Energy record "
                            "stays in the Energy register."
                        ),
                    ),
                    _related(
                        "energy",
                        "climate-change-act-2008",
                        (
                            "Climate and energy fiscal measures at Budget sit in the same "
                            "decarbonisation era as the Climate Change Act. Referenced, not copied."
                        ),
                    ),
                ],
            },
        ),
        _programme(
            event_id="autumn-budget-2025",
            title="Autumn Budget 2025",
            citation="HM Treasury Budget, 26 November 2025",
            aliases=["November 2025 Budget"],
            topics=["fiscal", "welfare"],
            policy_area="fiscal",
            summary=(
                "Autumn Budget of 26 November 2025. OBR EFO records spending and tax measures "
                "including welfare changes, personal tax threshold freezes and temporary "
                "renewables-obligation support."
            ),
            institution="HM Treasury",
            announcement_date="2025-11-26",
            start_date="2025-11-26",
            end_date=None,
            date_note="Budget and OBR EFO published 26 November 2025.",
            status="active",
            status_note="Current fiscal event relative to the register retrieval date.",
            sources=[
                _source(
                    "OBR — Economic and fiscal outlook November 2025",
                    "https://obr.uk/efo/economic-and-fiscal-outlook-november-2025/",
                    "official",
                ),
            ],
            linked_indicators=[
                {
                    "id": "public-sector-net-borrowing",
                    "title": "Public sector net borrowing",
                    "domain": "debt",
                    "view": "borrowing",
                    "relationship": "context",
                    "note": "Borrowing context only.",
                },
                {
                    "id": "tes-by-function",
                    "title": "Total managed expenditure by function",
                    "domain": "spending",
                    "view": "function",
                    "relationship": "context",
                    "note": "Spending context only.",
                },
            ],
            dossier={
                "background": (
                    "Fiscal event scored in the OBR November 2025 Economic and fiscal outlook."
                ),
                "objectives": (
                    "Package of spending and tax decisions as published by the Treasury and "
                    "costed by the OBR; no causal claim is made here about growth or inflation."
                ),
                "mechanism": (
                    "OBR-certified scorecard costings incorporated into the November 2025 EFO."
                ),
                "implementation": (
                    "Announced 26 November 2025. Individual commencements follow Finance Act and "
                    "secondary legislation (not all pinned here)."
                ),
                "measures": [
                    _measure(
                        "Personal tax threshold freezes from 2028-29",
                        (
                            "OBR EFO November 2025: freezing tax thresholds from 2028-29 onwards "
                            "raises £8.0 billion in 2029-30."
                        ),
                        _source(
                            "OBR — Economic and fiscal outlook November 2025",
                            "https://obr.uk/efo/economic-and-fiscal-outlook-november-2025/",
                            "official",
                        ),
                    ),
                    _measure(
                        "Removal of the two-child limit within universal credit",
                        (
                            "OBR EFO November 2025: removal of the two-child limit within universal "
                            "credit costing £3 billion by 2029-30."
                        ),
                        _source(
                            "OBR — Economic and fiscal outlook November 2025",
                            "https://obr.uk/efo/economic-and-fiscal-outlook-november-2025/",
                            "official",
                        ),
                    ),
                    _measure(
                        "Temporary part-funding of the renewables obligation",
                        (
                            "OBR EFO November 2025: temporarily part-funding the renewables "
                            "obligation, costing £3 billion next year and an average of £2 billion "
                            "in 2027-28 and 2028-29, before the subsidy is removed in 2029-30."
                        ),
                        _source(
                            "OBR — Economic and fiscal outlook November 2025",
                            "https://obr.uk/efo/economic-and-fiscal-outlook-november-2025/",
                            "official",
                        ),
                    ),
                ],
                "financial": [
                    _measure(
                        "Tax increases by 2029-30",
                        "£26 billion in 2029-30 (OBR EFO November 2025).",
                        _source(
                            "OBR — Economic and fiscal outlook November 2025",
                            "https://obr.uk/efo/economic-and-fiscal-outlook-november-2025/",
                            "official",
                        ),
                    ),
                    _measure(
                        "Welfare measures cost in 2029-30",
                        "Combined cost of £9 billion in 2029-30 (OBR EFO November 2025).",
                        _source(
                            "OBR — Economic and fiscal outlook November 2025",
                            "https://obr.uk/efo/economic-and-fiscal-outlook-november-2025/",
                            "official",
                        ),
                    ),
                ],
                "evaluations": [],
                "related": [
                    _related(
                        "economy",
                        "welfare-reform-act-2012",
                        "Universal credit framework amended by the two-child-limit Budget measure.",
                    ),
                    _related(
                        "economy",
                        "hm-treasury",
                        "Budget presented by the Chancellor.",
                    ),
                    _related(
                        "economy",
                        "office-for-budget-responsibility",
                        "Certified costings and published the accompanying EFO.",
                    ),
                    _related(
                        "economy",
                        "charter-for-budget-responsibility-autumn-2025",
                        "Fiscal mandate against which the OBR assesses the Budget.",
                    ),
                    _related(
                        "energy",
                        "climate-change-act-2008",
                        (
                            "Temporary renewables-obligation funding is an energy/climate fiscal "
                            "measure. Climate Change Act stays in the Energy register."
                        ),
                    ),
                    _related(
                        "energy",
                        "modern-industrial-strategy-2025",
                        (
                            "Same parliamentary year as the Modern Industrial Strategy. Referenced "
                            "for the industrial/energy policy era; not a copy of that record."
                        ),
                    ),
                    _related(
                        "housing",
                        "localism-act-2011",
                        (
                            "Local taxation and local-government finance remain in the Housing / "
                            "localism statute book where relevant. Budget housing-tax measures are "
                            "not duplicated here as Housing events."
                        ),
                    ),
                ],
            },
        ),
    ]

    # Insert new events before relationships are rebuilt
    existing_ids = {e["id"] for e in events}
    for event in new_events:
        if event["id"] in existing_ids:
            raise SystemExit(f"duplicate id {event['id']}")
        events.append(event)

    # Relationships
    rels: list[dict] = list(out["relationships"])
    extra_rels = [
        {
            "from": "office-for-budget-responsibility",
            "to": "office-for-budget-responsibility-interim",
            "kind": "succeeded",
            "date": "2011-04-04",
            "note": "Statutory OBR succeeded the interim body when section 3 came into force.",
            "source": _source(
                "SI 2011/892 (Commencement No. 1) Order",
                "https://www.legislation.gov.uk/uksi/2011/892/made",
            ),
        },
        {
            "from": "bank-of-england-act-1998",
            "to": "inflation-objective-1992",
            "kind": "succeeded",
            "date": "1998-06-01",
            "note": "Operational independence succeeded the 1992 Treasury-operated inflation framework.",
            "source": _source(
                "SI 1998/1120 (Commencement) Order",
                "https://www.legislation.gov.uk/uksi/1998/1120/made",
            ),
        },
        {
            "from": "national-minimum-wage-act-1998",
            "to": "low-pay-commission",
            "kind": "created",
            "date": "1998-11-01",
            "note": "Section 8 (Low Pay Commission) commenced 1 November 1998 (SI 1998/2574).",
            "source": _source(
                "SI 1998/2574 (Commencement No. 2) Order",
                "https://www.legislation.gov.uk/uksi/1998/2574/made",
            ),
        },
        {
            "from": "hm-treasury",
            "to": "office-for-budget-responsibility-interim",
            "kind": "created",
            "date": "2010-05-17",
            "note": "Chancellor announced the interim OBR on 17 May 2010.",
            "source": _source(
                "Chancellor announces policies to enhance fiscal credibility",
                "https://www.gov.uk/government/news/chancellor-announces-policies-to-enhance-fiscal-credibility",
                "official",
            ),
        },
    ]
    rels.extend(extra_rels)
    out["relationships"] = rels
    return out


def main() -> None:
    raw = json.loads(EVENTS_PATH.read_text(encoding="utf-8"))
    updated = deepen(raw)
    EVENTS_PATH.write_text(json.dumps(updated, indent=1, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"Wrote {EVENTS_PATH.relative_to(ROOT)} with {len(updated['events'])} events.")


if __name__ == "__main__":
    main()
