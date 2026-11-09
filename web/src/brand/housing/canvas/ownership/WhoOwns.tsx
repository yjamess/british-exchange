"use client";

/**
 * Domain 09 · A — Who owns Britain?
 *
 * A measured network sheet: entities are boxes, recorded relationships are lines. Every line is
 * one typed relationship backed by one kind of official record, joined on a registration number,
 * never on a name. Legal titleholding, legal charge, corporate control and registrable beneficial
 * ownership are drawn in four different strokes. Assumed economic benefit is never drawn.
 *
 * The records on this sheet are illustrative (Company A, Title 1, Lender 1). CCOD and OCOD need a
 * Land Registry account, and their public example rows are fictional, so no named company or title
 * is drawn until a dated release is pinned. RECORDS below is the shape a pinned release replaces.
 *
 * URL state (owned by HousingExplorer): cat=<Category>, rec=<RecordId>.
 */

import { createContext, useContext, useEffect, type KeyboardEvent, type ReactNode } from "react";
import type { InsideFoot } from "../quality/InsideHomes";
import s from "./anatomy.module.css";
import n from "./network.module.css";

/* ——— Model ——— */

export type Rel = "titleholding" | "charge" | "control" | "benefit";
export type Category = "all" | Rel;

type Source = { label: string; href: string };

const SRC = {
  ccod: { label: "HM Land Registry · UK companies that own property (CCOD)", href: "https://use-land-property-data.service.gov.uk/datasets/ccod" },
  ocod: { label: "HM Land Registry · Overseas companies that own property (OCOD)", href: "https://use-land-property-data.service.gov.uk/datasets/ocod" },
  inspire: { label: "HM Land Registry · INSPIRE Index Polygons", href: "https://use-land-property-data.service.gov.uk/datasets/inspire" },
  register: { label: "HM Land Registry · official copy of the register", href: "https://www.gov.uk/search-property-information-land-registry" },
  lrr4: { label: "Land Registration Rules 2003, r.4", href: "https://www.legislation.gov.uk/uksi/2003/1417/rule/4" },
  ch: { label: "Companies House · company search", href: "https://find-and-update.company-information.service.gov.uk/" },
  ca859: { label: "Companies Act 2006, s.859A (company charges)", href: "https://www.legislation.gov.uk/ukpga/2006/46/section/859A" },
  psc: { label: "Companies House · people with significant control", href: "https://www.gov.uk/guidance/people-with-significant-control-pscs" },
  ca21a: { label: "Companies Act 2006, Part 21A", href: "https://www.legislation.gov.uk/ukpga/2006/46/part/21A" },
  roe: { label: "Companies House · Register of Overseas Entities", href: "https://www.gov.uk/guidance/register-an-overseas-entity" },
  ecta: { label: "Economic Crime (Transparency and Enforcement) Act 2022", href: "https://www.legislation.gov.uk/ukpga/2022/10" },
} satisfies Record<string, Source>;

type NodeKind = "Company" | "Overseas entity" | "Registered title" | "Lender" | "Registrable person" | "Beneficial owner";

type NodeRec = {
  id: string;
  kind: NodeKind;
  name: string;
  sub: string;
  x: number;
  y: number;
  /** Dashed outline: the record exists, but nothing joins it to the network. */
  unlinked?: boolean;
  what: string;
  identifier: string;
  place: string;
  not: string;
  sources: Source[];
};

type EdgeRec = {
  id: string;
  n: string;
  rel: Rel;
  from: string;
  to: string;
  d: string;
  /** Where the line meets the node it points to. */
  end: [number, number];
  at: [number, number];
  what: string;
  evidence: string;
  join: string;
  not: string;
  sources: Source[];
};

const REL: Record<Rel, { label: string; short: string; register: string }> = {
  titleholding: { label: "Legal titleholding", short: "Titleholding", register: "HM Land Registry · CCOD · OCOD" },
  charge: { label: "Legal charge", short: "Charges", register: "HM Land Registry · charges register" },
  control: { label: "Corporate control", short: "Control", register: "Companies House · PSC register" },
  benefit: { label: "Registrable beneficial owner", short: "Beneficial owner", register: "Companies House · Register of Overseas Entities" },
};

const W = 170;
const H = 64;

const NODES: NodeRec[] = [
  {
    id: "psc",
    kind: "Registrable person",
    name: "Person with significant control",
    sub: "NOT NAMED · INDIVIDUAL",
    x: 30,
    y: 90,
    what: "A record Company A files at Companies House about who controls it: more than 25 percent of shares or votes, the right to appoint most directors, or significant influence or control.",
    identifier: "The company number of Company A. The person is a record on that company, not an entity of their own here.",
    place: "None drawn. A service address is not a location of property.",
    not: "Not a proprietor of Title 1 or Title 2. Private individuals are not profiled on this sheet, so the person is not named.",
    sources: [SRC.psc, SRC.ca21a],
  },
  {
    id: "company",
    kind: "Company",
    name: "Company A Ltd",
    sub: "UK COMPANY · CCOD",
    x: 320,
    y: 90,
    what: "A UK-incorporated company entered as registered proprietor of titles in England and Wales. CCOD lists the proprietor name, company registration number and proprietorship category against each title.",
    identifier: "Company registration number, from the CCOD row and checked on Companies House. The number is the join key.",
    place: "Registered office from Companies House. That is an address of the company, not of its land.",
    not: "Not the people behind it. Holding titles is not the same as benefiting from them.",
    sources: [SRC.ccod, SRC.ch],
  },
  {
    id: "title1",
    kind: "Registered title",
    name: "Title 1",
    sub: "FREEHOLD",
    x: 600,
    y: 46,
    what: "One registered estate: a property register, a proprietorship register and, where necessary, a charges register. CCOD gives its title number, tenure and address.",
    identifier: "Title number.",
    place: "Local authority district from the CCOD row. The INSPIRE polygon for a freehold would place it more finely; it is not joined here.",
    not: "Not a count of homes or a measure of value. One title can cover many buildings; one building can sit on many titles.",
    sources: [SRC.ccod, SRC.register, SRC.inspire],
  },
  {
    id: "title2",
    kind: "Registered title",
    name: "Title 2",
    sub: "LEASEHOLD",
    x: 600,
    y: 150,
    what: "A leasehold title held by Company A. Its landlord holds a different title, which this sheet does not join unless the register records it.",
    identifier: "Title number.",
    place: "Local authority district from the CCOD row. INSPIRE polygons cover freehold titles, so this one is placed by district only.",
    not: "Not the freehold. A lease and the freehold it was granted out of are separate titles, often with separate proprietors.",
    sources: [SRC.ccod, SRC.register],
  },
  {
    id: "lender",
    kind: "Lender",
    name: "Lender 1",
    sub: "CHARGEE",
    x: 830,
    y: 98,
    what: "A bank or other lender entered as chargee in the charges register of the titles it lends against.",
    identifier: "The chargee name and, for a company, its company number, as entered on each title's register.",
    place: "None drawn. A lender's place is not the place of the security.",
    not: "Not an owner of Title 1 or Title 3. A charge is security for a debt.",
    sources: [SRC.register, SRC.lrr4],
  },
  {
    id: "bo",
    kind: "Beneficial owner",
    name: "Registrable beneficial owner",
    sub: "NOT NAMED · ROE",
    x: 30,
    y: 290,
    what: "An overseas entity that holds land in the UK must register at Companies House and declare its registrable beneficial owners, verified by a UK-regulated agent.",
    identifier: "The overseas entity ID of Entity B.",
    place: "None drawn.",
    not: "Not a proprietor on the register of title. Where the owner is an individual, they are not named or profiled here.",
    sources: [SRC.roe, SRC.ecta],
  },
  {
    id: "overseas",
    kind: "Overseas entity",
    name: "Entity B",
    sub: "OVERSEAS · OCOD",
    x: 320,
    y: 290,
    what: "A company incorporated outside the UK and entered as registered proprietor of a title in England and Wales. OCOD records its country of incorporation.",
    identifier: "Overseas entity ID from the Register of Overseas Entities. OCOD does not always carry it, so a missing ID leaves the beneficial-owner line undrawn.",
    place: "Country of incorporation from OCOD.",
    not: "Not its beneficial owners. Those come from a different register, joined on the entity ID.",
    sources: [SRC.ocod, SRC.roe],
  },
  {
    id: "title3",
    kind: "Registered title",
    name: "Title 3",
    sub: "FREEHOLD",
    x: 600,
    y: 270,
    what: "A freehold title held by an overseas entity, with a charge registered to Lender 1.",
    identifier: "Title number.",
    place: "Local authority district from the OCOD row. INSPIRE polygon not joined.",
    not: "Not evidence of where Entity B's owners live, or of who benefits from the rent.",
    sources: [SRC.ocod, SRC.register],
  },
  {
    id: "title4",
    kind: "Registered title",
    name: "Title 4",
    sub: "FREEHOLD · UNLINKED",
    x: 600,
    y: 392,
    unlinked: true,
    what: "A corporate title whose proprietor name reads “Company A Limited”, but whose CCOD row has no company registration number. Some older registrations lack one.",
    identifier: "Title number only. No company number.",
    place: "Local authority district from the CCOD row.",
    not: "Not joined to Company A. A matching name is not a record, so no line is drawn. The title stays on the sheet, unlinked.",
    sources: [SRC.ccod],
  },
];

const EDGES: EdgeRec[] = [
  {
    id: "e1",
    end: [600, 78],
    n: "1",
    rel: "titleholding",
    from: "company",
    to: "title1",
    d: "M490 112 H545 V78 H600",
    at: [545, 95],
    what: "Company A is entered as registered proprietor of Title 1.",
    evidence: "CCOD row for the title: title number, tenure, proprietor name, company registration number, date the proprietor was added.",
    join: "Company registration number on the title, matched to Companies House.",
    not: "Not beneficial ownership. The proprietor can hold the title on trust for someone else.",
    sources: [SRC.ccod, SRC.register],
  },
  {
    id: "e2",
    end: [600, 182],
    n: "2",
    rel: "titleholding",
    from: "company",
    to: "title2",
    d: "M490 132 H545 V182 H600",
    at: [545, 160],
    what: "Company A is entered as registered proprietor of the leasehold Title 2.",
    evidence: "CCOD row for the title.",
    join: "Company registration number on the title.",
    not: "Not ownership of the freehold the lease was granted out of.",
    sources: [SRC.ccod],
  },
  {
    id: "e3",
    end: [770, 70],
    n: "3",
    rel: "charge",
    from: "lender",
    to: "title1",
    d: "M830 118 H795 V70 H770",
    at: [795, 94],
    what: "Lender 1 is entered as chargee in the charges register of Title 1.",
    evidence: "Charges register of Title 1, from an official copy. CCOD and OCOD do not include charges. A company's charge is also registered at Companies House, which may describe the property but does not carry the title number.",
    join: "Title number on the official copy.",
    not: "Not ownership, and not a share of the title. It is security for a loan, and its amount is not on the register.",
    sources: [SRC.register, SRC.lrr4, SRC.ca859],
  },
  {
    id: "e4",
    end: [320, 122],
    n: "4",
    rel: "control",
    from: "psc",
    to: "company",
    d: "M200 122 H320",
    at: [260, 122],
    what: "A registrable person meets one or more control conditions over Company A.",
    evidence: "Company A's people-with-significant-control register at Companies House, with the conditions met and the date they were notified.",
    join: "Company number, the same number that is on the CCOD title row.",
    not: "Not ownership of the company's titles. Control of a company does not make its land theirs.",
    sources: [SRC.psc, SRC.ca21a],
  },
  {
    id: "e5",
    end: [600, 302],
    n: "5",
    rel: "titleholding",
    from: "overseas",
    to: "title3",
    d: "M490 322 H545 V302 H600",
    at: [545, 312],
    what: "Entity B is entered as registered proprietor of Title 3.",
    evidence: "OCOD row for the title: title number, tenure, proprietor name, country of incorporation.",
    join: "Title number, and the entity's name and country as entered. The entity ID, where present, joins it to Companies House.",
    not: "Not beneficial ownership.",
    sources: [SRC.ocod],
  },
  {
    id: "e6",
    end: [320, 322],
    n: "6",
    rel: "benefit",
    from: "bo",
    to: "overseas",
    d: "M200 322 H320",
    at: [260, 322],
    what: "A registrable beneficial owner of Entity B, as declared on the Register of Overseas Entities.",
    evidence: "The Register of Overseas Entities entry for Entity B, with its registrable beneficial owners and the date of the statement.",
    join: "Overseas entity ID. Never the entity's name.",
    not: "A beneficial owner of the entity, not a named owner of Title 3. Benefit from the property itself is not drawn.",
    sources: [SRC.roe, SRC.ecta],
  },
  {
    id: "e7",
    end: [770, 302],
    n: "7",
    rel: "charge",
    from: "lender",
    to: "title3",
    d: "M830 142 H810 V302 H770",
    at: [810, 222],
    what: "Lender 1 is entered as chargee in the charges register of Title 3.",
    evidence: "Charges register of Title 3, from an official copy.",
    join: "Title number on the official copy.",
    not: "Not ownership. One lender charging two titles does not link their proprietors.",
    sources: [SRC.register, SRC.lrr4],
  },
];

const NODE = Object.fromEntries(NODES.map((x) => [x.id, x])) as Record<string, NodeRec>;
const EDGE = Object.fromEntries(EDGES.map((x) => [x.id, x])) as Record<string, EdgeRec>;

export type RecordId = string;

const CATEGORIES: { id: Category; label: string }[] = [
  { id: "all", label: "All records" },
  { id: "titleholding", label: REL.titleholding.short },
  { id: "charge", label: REL.charge.short },
  { id: "control", label: REL.control.short },
  { id: "benefit", label: REL.benefit.short },
];

export const isCategory = (v: string | null): v is Category => v != null && CATEGORIES.some((c) => c.id === v);
export const isRecordId = (v: string | null): v is RecordId => v != null && (v in NODE || v in EDGE);

/* ——— Sheet parts ——— */

const SheetCtx = createContext<{ active: RecordId | null; lit: (id: RecordId) => boolean; pick: (id: RecordId) => void }>({
  active: null,
  lit: () => true,
  pick: () => {},
});

function Part({ id, label, children }: { id: RecordId; label: string; children: ReactNode }) {
  const { active, lit, pick } = useContext(SheetCtx);
  const on = active === id;
  return (
    <g
      role="button"
      tabIndex={0}
      aria-pressed={on}
      aria-label={label}
      className={`${s.part} ${n.part}`}
      data-on={on || undefined}
      data-dim={(!on && ((active != null && active !== id) || !lit(id))) || undefined}
      data-off={!lit(id) || undefined}
      onClick={() => pick(id)}
      onKeyDown={(e: KeyboardEvent) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          pick(id);
        }
      }}
    >
      {children}
    </g>
  );
}

function EdgeMark({ e }: { e: EdgeRec }) {
  const [ex, ey] = e.end;
  const from = NODE[e.from]!;
  const to = NODE[e.to]!;
  return (
    <Part id={e.id} label={`Edge ${e.n}, ${REL[e.rel].label}: ${from.name} to ${to.name}`}>
      <path d={e.d} className={n.hit} />
      {e.rel === "benefit" ? (
        <>
          <path d={e.d} className={n.benefitOuter} />
          <path d={e.d} className={n.benefitInner} />
        </>
      ) : (
        <path d={e.d} className={n[e.rel]} />
      )}
      {e.rel === "charge" && <rect x={ex - 6} y={ey - 6} width={12} height={12} className={s.chargeMark} transform={`rotate(45 ${ex} ${ey})`} />}
      {e.rel === "control" && <circle cx={ex - 4} cy={ey} r={3.5} className={n.ring} />}
      {(e.rel === "titleholding" || e.rel === "benefit") && <path d={`M${ex - 7} ${ey - 4} L${ex} ${ey} L${ex - 7} ${ey + 4} Z`} className={n.head} />}
      <g className={s.callout} aria-hidden="true">
        <circle cx={e.at[0]} cy={e.at[1]} r={9} />
        <text x={e.at[0]} y={e.at[1] + 3.5} textAnchor="middle">
          {e.n}
        </text>
      </g>
    </Part>
  );
}

function NodeMark({ node }: { node: NodeRec }) {
  const title = node.kind === "Registered title";
  const person = node.kind === "Registrable person" || node.kind === "Beneficial owner";
  return (
    <Part id={node.id} label={`${node.kind}: ${node.name}${node.unlinked ? ", not joined to any entity" : ""}`}>
      <rect x={node.x} y={node.y} width={W} height={H} className={node.unlinked ? s.cardDashed : person ? n.personBox : s.card} />
      {title ? (
        <>
          <rect x={node.x} y={node.y} width={W} height={20} className={node.unlinked ? n.headHollow : s.cardHead} />
          <text x={node.x + 8} y={node.y + 14} className={node.unlinked ? s.cardHeadPlain : s.cardHeadText}>
            {`${node.name.toUpperCase()} · ${node.sub}`}
          </text>
          <text x={node.x + 8} y={node.y + 38} className={s.micro}>
            PROPRIETORSHIP REGISTER
          </text>
          <text x={node.x + 8} y={node.y + 53} className={s.cardVal}>
            {node.unlinked ? "“Company A Limited” · no number" : node.id === "title3" ? "Entity B" : "Company A Ltd"}
          </text>
        </>
      ) : (
        <>
          <text x={node.x + 10} y={node.y + 28} className={n.name}>
            {node.name}
          </text>
          <text x={node.x + 10} y={node.y + 48} className={s.micro}>
            {node.sub}
          </text>
        </>
      )}
    </Part>
  );
}

/* ——— Component ——— */

export function WhoOwns({
  category,
  record,
  onChange,
  onFoot,
}: {
  category: Category;
  record: RecordId | null;
  onChange: (next: { category?: Category; record?: RecordId | null }) => void;
  onFoot?: (foot: InsideFoot) => void;
}) {
  const inCat = (e: EdgeRec) => category === "all" || e.rel === category;
  const lit = (id: RecordId) => {
    if (category === "all") return true;
    const e = EDGE[id];
    if (e) return inCat(e);
    return EDGES.some((x) => inCat(x) && (x.from === id || x.to === id));
  };
  const active = record && lit(record) ? record : null;
  const pick = (id: RecordId) => onChange({ record: active === id ? null : id });

  const edge = active ? EDGE[active] : undefined;
  const node = active ? NODE[active] : undefined;
  const shown = edge ?? node ?? null;
  const touching = node ? EDGES.filter((e) => e.from === node.id || e.to === node.id) : [];
  const sources = shown?.sources ?? [SRC.ccod, SRC.ocod, SRC.psc, SRC.roe];

  const footSource = edge ? REL[edge.rel].register : node ? node.sources.map((x) => x.label.split(" · ")[0]).filter((v, i, a) => a.indexOf(v) === i).join(" · ") : "HM Land Registry · Companies House";

  useEffect(() => {
    onFoot?.({
      source: footSource,
      coverage:
        "Illustrative records, not real entities. England and Wales titles held by companies and overseas entities, once a CCOD or OCOD release is pinned. Not individuals, not Scotland, not Northern Ireland.",
      definition: edge
        ? [edge.what, `Evidence. ${edge.evidence}`, `Joined on. ${edge.join}`, edge.not]
        : node
          ? [node.what, `Identifier. ${node.identifier}`, `Place. ${node.place}`, node.not]
          : [
              "Each line is one recorded relationship, typed by the register that records it. A line is drawn only where a registration number joins two records.",
            ],
      caveats: [
        "No named company or title is drawn until a dated CCOD or OCOD release is pinned and its licence checked. The public example rows on the dataset pages are fictional and are not used.",
        "Assumed economic benefit is never drawn. Shared names, addresses and officers are not joins.",
      ],
    });
  }, [onFoot, footSource, edge, node]);

  return (
    <SheetCtx.Provider value={{ active, lit, pick }}>
      <div className={s.root}>
        <div className={s.head}>
          <div className={s.schemes} role="radiogroup" aria-label="Relationship category">
            {CATEGORIES.map((c) => (
              <button
                key={c.id}
                type="button"
                role="radio"
                aria-checked={category === c.id}
                className={s.scheme}
                onClick={() => onChange({ category: c.id })}
              >
                {c.label}
              </button>
            ))}
          </div>
          <p className={s.lede}>
            Companies, titles and lenders, joined only where an official register records the relationship. Each kind of line is a different record. Holding
            a title is not owning the benefit of it. England and Wales.
          </p>
        </div>

        <div className={s.sheet}>
          <div className={s.drawingWrap}>
            <svg className={s.svg} viewBox="0 0 1010 540" role="group" aria-label="Illustrative ownership network">
              <text x={30} y={22} className={s.micro} aria-hidden="true">
                COMPANIES HOUSE · CONTROL AND BENEFIT
              </text>
              <text x={320} y={22} className={s.micro} aria-hidden="true">
                PROPRIETOR
              </text>
              <text x={600} y={22} className={s.micro} aria-hidden="true">
                HM LAND REGISTRY · TITLE
              </text>
              <text x={830} y={22} className={s.micro} aria-hidden="true">
                CHARGEE
              </text>
              <line x1={30} x2={1000} y1={30} y2={30} className={s.hair} aria-hidden="true" />

              {EDGES.map((e) => (
                <EdgeMark key={e.id} e={e} />
              ))}
              {NODES.map((x) => (
                <NodeMark key={x.id} node={x} />
              ))}

              {/* The absent join: a name match with no number draws no line */}
              <g aria-hidden="true">
                <text x={320} y={418} className={s.microInk}>
                  NO LINE
                </text>
                <text x={320} y={432} className={s.micro}>
                  SAME NAME AS COMPANY A,
                </text>
                <text x={320} y={446} className={s.micro}>
                  NO COMPANY NUMBER ON THE TITLE
                </text>
              </g>

              {/* Key */}
              <line x1={30} x2={1000} y1={482} y2={482} className={s.hair} aria-hidden="true" />
              <g aria-hidden="true">
                <path d="M30 506 H70" className={n.titleholding} />
                <path d="M63 502 L70 506 L63 510 Z" className={n.head} />
                <text x={78} y={509} className={s.micro}>
                  LEGAL TITLEHOLDING
                </text>
                <path d="M230 506 H270" className={n.charge} />
                <rect x={264} y={500} width={12} height={12} className={s.chargeMark} transform="rotate(45 270 506)" />
                <text x={284} y={509} className={s.micro}>
                  LEGAL CHARGE
                </text>
                <path d="M400 506 H440" className={n.control} />
                <circle cx={436} cy={506} r={3.5} className={n.ring} />
                <text x={448} y={509} className={s.micro}>
                  CORPORATE CONTROL
                </text>
                <path d="M590 506 H630" className={n.benefitOuter} />
                <path d="M590 506 H630" className={n.benefitInner} />
                <text x={638} y={509} className={s.micro}>
                  REGISTRABLE BENEFICIAL OWNER
                </text>
                <text x={30} y={532} className={s.micro}>
                  ILLUSTRATIVE RECORDS · NOT REAL ENTITIES · ASSUMED ECONOMIC BENEFIT IS NEVER DRAWN
                </text>
              </g>
            </svg>
          </div>

          <aside className={s.inspector} aria-live="polite">
            {edge ? (
              <>
                <p className={s.kind}>
                  Edge {edge.n} · {REL[edge.rel].label}
                </p>
                <h3 className={s.title}>
                  {NODE[edge.from]!.name} → {NODE[edge.to]!.name}
                </h3>
                <p className={s.what}>{edge.what}</p>
                <dl className={s.facts}>
                  <dt>Evidence</dt>
                  <dd>{edge.evidence}</dd>
                  <dt>Joined on</dt>
                  <dd>{edge.join}</dd>
                  <dt>Does not show</dt>
                  <dd>{edge.not}</dd>
                </dl>
              </>
            ) : node ? (
              <>
                <p className={s.kind}>{node.kind}</p>
                <h3 className={s.title}>{node.name}</h3>
                <p className={s.what}>{node.what}</p>
                <dl className={s.facts}>
                  <dt>Identifier</dt>
                  <dd>{node.identifier}</dd>
                  <dt>Place</dt>
                  <dd>{node.place}</dd>
                  <dt>Does not show</dt>
                  <dd>{node.not}</dd>
                  <dt>Recorded lines</dt>
                  <dd>
                    {touching.length
                      ? touching.map((e) => `${e.n} · ${REL[e.rel].label}`).join("; ")
                      : "None. No register joins this record to another."}
                  </dd>
                </dl>
              </>
            ) : (
              <>
                <p className={s.kind}>{category === "all" ? "Network" : REL[category].label}</p>
                <h3 className={s.title}>{category === "all" ? "Recorded relationships" : REL[category].register}</h3>
                <p className={s.what}>
                  Select a box or a numbered line. A box is an entity or a title. A line is one record that joins two of them, with the register that holds
                  it.
                </p>
              </>
            )}
            <p className={s.kind}>Status · illustrative, not loaded</p>
            <ul className={s.authority}>
              {sources.map((a) => (
                <li key={a.href}>
                  <a href={a.href} target="_blank" rel="noreferrer">
                    {a.label}
                  </a>
                </li>
              ))}
            </ul>
        </aside>
      </div>

        {/* Schedule: every record on the sheet, as a list (keyboard and screen-reader path) */}
        <div className={s.schedule}>
          <p className={s.scheduleHead}>Schedule of recorded relationships</p>
          <ol className={s.scheduleList}>
            {EDGES.filter(inCat).map((e) => (
              <li key={e.id}>
                <button type="button" className={s.scheduleItem} aria-pressed={active === e.id} onClick={() => pick(e.id)}>
                  <span className={s.scheduleN}>{e.n.padStart(2, "0")}</span>
                  <span className={s.scheduleTitle}>
                    {NODE[e.from]!.name} → {NODE[e.to]!.name}
                  </span>
                  <span className={s.scheduleKind}>{REL[e.rel].label}</span>
                </button>
              </li>
            ))}
          </ol>
          <p className={s.scheduleHead}>Entities and titles</p>
          <ol className={s.scheduleList}>
            {NODES.filter((x) => lit(x.id)).map((x) => (
              <li key={x.id}>
                <button type="button" className={s.scheduleItem} aria-pressed={active === x.id} onClick={() => pick(x.id)}>
                  <span className={s.scheduleN}>{x.unlinked ? "—" : ""}</span>
                  <span className={s.scheduleTitle}>{x.name}</span>
                  <span className={s.scheduleKind}>{x.kind}</span>
                </button>
            </li>
          ))}
        </ol>
        </div>
    </div>
    </SheetCtx.Provider>
  );
}
