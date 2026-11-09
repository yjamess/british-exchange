"use client";

/**
 * Design lab only — Decision Ledger colour-break studies.
 * Shell locked: A · Slab invert (electric closed → paper open).
 * This pass compares how the open dossier is organised.
 * Does not change live `/energy?domain=policy`.
 */

import Link from "next/link";
import { useId, useState, type ReactNode } from "react";
import s from "./policy-ledger.module.css";

type Sample = {
  id: string;
  year: string;
  title: string;
  type: string;
  citation: string;
  status: string;
  mark: string;
  markKind: string;
  applies: string;
  summary: string;
  extent: string;
  commencement: string;
  sources: { label: string; href: string }[];
  follow: { label: string; note: string; href: string }[];
};

/** Lab fixtures — shortened from the live seed for reading length. */
const SAMPLES: Sample[] = [
  {
    id: "electricity-act-1947",
    year: "1947",
    title: "Electricity Act 1947",
    type: "Act",
    citation: "10 & 11 Geo. 6 c. 54",
    status: "Repealed",
    mark: "13 August 1947",
    markKind: "Royal Assent",
    applies: "England · Wales · Scotland",
    summary:
      "Established the British Electricity Authority and Area Boards, transferring electricity undertakers into public ownership.",
    extent:
      "Creates the British Electricity Authority and Area Boards for the supply of electricity in Great Britain.",
    commencement: "Wholly in force at Royal Assent (legislation.gov.uk).",
    sources: [
      {
        label: "Introductory Text",
        href: "https://www.legislation.gov.uk/ukpga/1947/54/introduction",
      },
    ],
    follow: [
      {
        label: "Electricity generation by source",
        note: "National fuel mix is context for the public-ownership era — not an effect of the Act alone.",
        href: "/energy?domain=generation&view=history",
      },
    ],
  },
  {
    id: "electricity-act-1989",
    year: "1989",
    title: "Electricity Act 1989",
    type: "Act",
    citation: "1989 c. 29",
    status: "In force",
    mark: "27 July 1989",
    markKind: "Royal Assent",
    applies: "England · Wales · Scotland",
    summary:
      "Replaced the nationalised boards with a licensing framework for generation, transmission and supply.",
    extent:
      "Core licensing and vesting provisions apply to England, Wales and Scotland.",
    commencement: "Not exhaustively pinned in this seed — open the primary text for appointment orders.",
    sources: [
      {
        label: "Introductory Text",
        href: "https://www.legislation.gov.uk/ukpga/1989/29/introduction",
      },
      {
        label: "Contents",
        href: "https://www.legislation.gov.uk/ukpga/1989/29/contents",
      },
    ],
    follow: [
      {
        label: "Electricity generation by source",
        note: "Generation mix after privatisation is context — not proof the Act caused fuel substitution.",
        href: "/energy?domain=generation&view=history",
      },
    ],
  },
  {
    id: "climate-change-act-2008",
    year: "2008",
    title: "Climate Change Act 2008",
    type: "Act",
    citation: "2008 c. 27",
    status: "In force",
    mark: "26 November 2008",
    markKind: "Royal Assent",
    applies: "United Kingdom",
    summary:
      "Set a 2050 greenhouse-gas reduction target, created carbon budgets and established the Committee on Climate Change.",
    extent: "United Kingdom. National authorities are defined in section 95.",
    commencement: "Not exhaustively pinned in this seed.",
    sources: [
      {
        label: "Introductory Text",
        href: "https://www.legislation.gov.uk/ukpga/2008/27/introduction",
      },
    ],
    follow: [
      {
        label: "Electricity generation by source",
        note: "Low-carbon share of generation is context for the Act's era — not a carbon-budget score.",
        href: "/energy?domain=generation&view=history",
      },
    ],
  },
];

type Interior = (event: Sample) => ReactNode;

/** 1. Reading column — story first, thin facts underneath. */
function InteriorReading(event: Sample) {
  return (
    <div className={s.dossier}>
      <p className={s.lead}>{event.summary}</p>
      <p className={s.quietLine}>
        {event.type} · {event.citation} · {event.status}
        <span aria-hidden="true"> · </span>
        {event.markKind} {event.mark}
        <span aria-hidden="true"> · </span>
        {event.applies}
      </p>
      <p className={s.body}>{event.extent}</p>
      <p className={s.body}>
        <span className={s.inlineLabel}>Commencement</span>
        {event.commencement}
      </p>
      <ul className={s.linkRow}>
        {event.sources.map((src) => (
          <li key={src.href}>
            <a href={src.href} target="_blank" rel="noreferrer">
              {src.label}
            </a>
          </li>
        ))}
        {event.follow.map((f) => (
          <li key={f.href}>
            <a href={f.href}>{f.label}</a>
          </li>
        ))}
      </ul>
      <p className={s.caveat}>Context links are not causal claims.</p>
    </div>
  );
}

/** 2. Instrument strip — key facts as a figure row, then prose + destinations. */
function InteriorStrip(event: Sample) {
  return (
    <div className={s.dossier}>
      <dl className={s.strip}>
        <div>
          <dt>Record</dt>
          <dd>
            {event.type}
            <span className={s.stripSub}>{event.citation}</span>
          </dd>
        </div>
        <div>
          <dt>{event.markKind}</dt>
          <dd>{event.mark}</dd>
        </div>
        <div>
          <dt>Status</dt>
          <dd>{event.status}</dd>
        </div>
        <div>
          <dt>Applies</dt>
          <dd>{event.applies}</dd>
        </div>
      </dl>
      <p className={s.lead}>{event.summary}</p>
      <div className={s.split}>
        <div>
          <h4 className={s.sec}>What it covers</h4>
          <p className={s.body}>{event.extent}</p>
          <p className={s.body}>
            <span className={s.inlineLabel}>Commencement</span>
            {event.commencement}
          </p>
        </div>
        <div>
          <h4 className={s.sec}>Go further</h4>
          <ul className={s.destList}>
            {event.sources.map((src) => (
              <li key={src.href}>
                <a href={src.href} target="_blank" rel="noreferrer">
                  {src.label}
                </a>
                <span className={s.destNote}>Primary text</span>
              </li>
            ))}
            {event.follow.map((f) => (
              <li key={f.href}>
                <a href={f.href}>{f.label}</a>
                <span className={s.destNote}>{f.note}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <p className={s.caveat}>Context links are not causal claims.</p>
    </div>
  );
}

/** 3. Catalogue card — left story, right label/value register. */
function InteriorCatalogue(event: Sample) {
  return (
    <div className={`${s.dossier} ${s.catalogue}`}>
      <div className={s.catalogueStory}>
        <p className={s.lead}>{event.summary}</p>
        <h4 className={s.sec}>Extent</h4>
        <p className={s.body}>{event.extent}</p>
        <h4 className={s.sec}>Measured context</h4>
        <ul className={s.destList}>
          {event.follow.map((f) => (
            <li key={f.href}>
              <a href={f.href}>{f.label}</a>
              <span className={s.destNote}>{f.note}</span>
            </li>
          ))}
        </ul>
      </div>
      <dl className={s.register}>
        <div>
          <dt>Type</dt>
          <dd>{event.type}</dd>
        </div>
        <div>
          <dt>Citation</dt>
          <dd>{event.citation}</dd>
        </div>
        <div>
          <dt>{event.markKind}</dt>
          <dd>{event.mark}</dd>
        </div>
        <div>
          <dt>Status</dt>
          <dd>{event.status}</dd>
        </div>
        <div>
          <dt>Applies</dt>
          <dd>{event.applies}</dd>
        </div>
        <div>
          <dt>Commencement</dt>
          <dd>{event.commencement}</dd>
        </div>
        <div>
          <dt>Sources</dt>
          <dd>
            {event.sources.map((src) => (
              <a key={src.href} href={src.href} target="_blank" rel="noreferrer">
                {src.label}
              </a>
            ))}
          </dd>
        </div>
      </dl>
      <p className={s.caveat}>Context links are not causal claims.</p>
    </div>
  );
}

/** 4. Chapters — numbered sections with hairline rules. */
function InteriorChapters(event: Sample) {
  const chapters = [
    { n: "01", title: "What it did", body: <p className={s.body}>{event.summary}</p> },
    {
      n: "02",
      title: "Dates",
      body: (
        <p className={s.body}>
          {event.markKind}: {event.mark}. Commencement: {event.commencement}
        </p>
      ),
    },
    {
      n: "03",
      title: "Where it applies",
      body: (
        <>
          <p className={s.body}>{event.applies}</p>
          <p className={s.body}>{event.extent}</p>
        </>
      ),
    },
    {
      n: "04",
      title: "Sources",
      body: (
        <ul className={s.linkRow}>
          {event.sources.map((src) => (
            <li key={src.href}>
              <a href={src.href} target="_blank" rel="noreferrer">
                {src.label}
              </a>
            </li>
          ))}
        </ul>
      ),
    },
    {
      n: "05",
      title: "Measured context",
      body: (
        <ul className={s.destList}>
          {event.follow.map((f) => (
            <li key={f.href}>
              <a href={f.href}>{f.label}</a>
              <span className={s.destNote}>{f.note}</span>
            </li>
          ))}
        </ul>
      ),
    },
  ];

  return (
    <div className={s.dossier}>
      <p className={s.quietLine}>
        {event.type} · {event.citation} · {event.status}
      </p>
      {chapters.map((ch) => (
        <section key={ch.n} className={s.chapter}>
          <header className={s.chapterHead}>
            <span className={s.chapterN}>{ch.n}</span>
            <h4 className={s.chapterTitle}>{ch.title}</h4>
          </header>
          {ch.body}
        </section>
      ))}
      <p className={s.caveat}>Context links are not causal claims.</p>
    </div>
  );
}

/** Shared slab shell — electric closed, paper open. */
function SlabShell({
  baseId,
  Interior,
  initiallyOpen = SAMPLES[1]!.id,
}: {
  baseId: string;
  Interior: Interior;
  initiallyOpen?: string | null;
}) {
  const [openId, setOpenId] = useState<string | null>(initiallyOpen);

  return (
    <ul className={s.stack}>
      {SAMPLES.map((event) => {
        const open = openId === event.id;
        const panelId = `${baseId}-${event.id}`;
        return (
          <li key={event.id} className={open ? s.slabOpen : s.slabClosed}>
            <button
              type="button"
              className={s.slabToggle}
              aria-expanded={open}
              aria-controls={panelId}
              onClick={() => setOpenId(open ? null : event.id)}
            >
              <span className={s.year}>{event.year}</span>
              <span className={s.title}>{event.title}</span>
              <span className={s.meta}>
                {event.type}
                <span aria-hidden="true">{open ? "−" : "+"}</span>
              </span>
            </button>
            <div id={panelId} hidden={!open}>
              {open ? Interior(event) : null}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

const SPECIMENS = [
  {
    id: "1",
    name: "Reading column",
    mark: "Story first",
    why: "One calm column. Summary leads, a single quiet line carries type / citation / status / date / place, then short paragraphs. Links sit in one row at the end. Least form-like.",
    Interior: InteriorReading,
  },
  {
    id: "2",
    name: "Instrument strip",
    mark: "Facts on top",
    why: "Four key facts as a figure strip (Record, Assent, Status, Applies), then the summary, then a split: what it covers · where to go. Matches the Explorer’s strip language.",
    Interior: InteriorStrip,
  },
  {
    id: "3",
    name: "Catalogue card",
    mark: "Story + register",
    why: "Left: what it did, extent, measured context. Right: a strict label / value register. Feels like a catalogue card beside the prose.",
    Interior: InteriorCatalogue,
  },
  {
    id: "4",
    name: "Chapters",
    mark: "Numbered file",
    why: "Archival chapters — 01 What it did through 05 Measured context — each under a hairline. Easy to scan; more height.",
    Interior: InteriorChapters,
  },
] as const;

export function PolicyLedgerLab() {
  const baseId = useId();

  return (
    <main className={s.page}>
      <nav>
        <Link href="/design-lab">Design lab</Link>
        <Link href="/energy?domain=policy">Live Decision Ledger</Link>
      </nav>

      <header className={s.header}>
        <p className="bo-label">Design lab · policy ledger</p>
        <h1>Slab locked — how should the file read?</h1>
        <p>
          Shell is <strong>A · Slab invert</strong>. Interior <strong>3 · Catalogue
          card</strong> ships as brand <code>DecisionLedger</code> +{" "}
          <code>CatalogueDossier</code> in <code>web/src/brand/policy/</code>. Housing
          and Energy import it. Specimens 1, 2 and 4 below are lab only.
        </p>
      </header>

      <section className={s.note} aria-labelledby="shell-note">
        <h2 id="shell-note">Shipped</h2>
        <p>
          Live domains import from <code>@/brand</code>. Do not fork slab CSS in a
          sector tree.
        </p>
      </section>

      {SPECIMENS.map(({ id, name, mark, why, Interior }) => (
        <section key={id} className={s.specimen} aria-labelledby={`specimen-${id}`}>
          <div className={s.caption}>
            <p className="bo-label">
              Interior {id} · {mark}
            </p>
            <h2 id={`specimen-${id}`}>{name}</h2>
            <p>{why}</p>
          </div>
          <SlabShell baseId={`${baseId}-${id}`} Interior={Interior} />
        </section>
      ))}
    </main>
  );
}
