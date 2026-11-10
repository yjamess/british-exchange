"use client";

/**
 * Design lab — what sits under an Explorer stage.
 * Uses the real stage frame classes, the real FigureRecord and the real FollowStep,
 * so "Now" matches the live Imports page. Only the order, edge and Next reading weight change.
 */

import Link from "next/link";
import { FigureRecord } from "@/brand/template";
import {
  ENERGY_CONNECTIONS,
  FollowStep,
  resolveEnergyConnectionHref,
  type Connection,
} from "@/brand/connections";
import x from "@/brand/template/explorer.module.css";
import s from "./underStage.module.css";

const YEAR = 2025;
const GAP = ENERGY_CONNECTIONS.find((c) => c.id === "imports.lifelines→fossil.gap") as Connection;
const gapHref = resolveEnergyConnectionHref(GAP, { year: YEAR });
const DESTINATION = "Oil, gas and fossil fuels · Production gap";

const foot = (
  <FigureRecord
    source="DESNZ · Digest of UK Energy Statistics · table 3.7 · oil by country"
    definition="Crude oil and petroleum products entering the UK, by country of origin."
    method="Thousand tonnes, calendar years. Gaps are years with no published figure for this country."
  />
);

/** The live stage frame, without the Explorer context (no Expand here). */
function Frame() {
  return (
    <figure className={x.stage}>
      <figcaption className={x.stageBar}>
        <span className={x.stageTitle}>Oil entering the UK by country · {YEAR}</span>
      </figcaption>
      <div className={x.stageBody}>
        <h3 className={x.stageTitle}>Cameroon over time · thousand tonnes · 2012–2025</h3>
        <svg className={s.plot} viewBox="0 0 640 200" aria-hidden="true">
          {[0, 1, 2, 3, 4].map((i) => (
            <line key={i} x1="40" x2="600" y1={20 + i * 40} y2={20 + i * 40} className={s.grid} />
          ))}
          <polyline
            points="40,150 83,146 126,173 169,24 384,172 470,152 513,93 556,152 600,154"
            className={s.line}
          />
        </svg>
      </div>
    </figure>
  );
}

/** Proposed Next reading: one quiet line under a hairline. Honesty moves to the hover title. */
function NextLine({ connection, href }: { connection: Connection; href: string | null }) {
  const honesty = connection.honesty ?? connection.why;
  return (
    <div className={s.next}>
      <p className={`bo-label ${s.nextKicker}`}>Next reading</p>
      {href ? (
        <a className={s.nextLink} href={href} title={honesty}>
          {connection.label} <span aria-hidden="true">→</span>
        </a>
      ) : (
        <p className={s.nextMuted} title={honesty}>
          {connection.label}
        </p>
      )}
      <p className={s.nextDest}>
        {href ? DESTINATION : `Not linked yet · ${DESTINATION}`} · {YEAR}
      </p>
    </div>
  );
}

const OPTIONS = [
  {
    id: "A",
    name: "Now",
    mark: "Retired",
    why: "Was live. Stage, then Next reading, then Notes. Notes is cut off from its chart, and both sit a few pixels in from the frame.",
    body: (
      <div className={x.stageGroup}>
        <Frame />
        <div className={x.stageFollow}>
          <FollowStep connection={GAP} href={gapHref} destination={DESTINATION} year={YEAR} />
        </div>
        <div className={x.stageFoot}>{foot}</div>
      </div>
    ),
  },
  {
    id: "B",
    name: "Notes first, same Next reading",
    mark: "Live · shared Stage",
    why: "Notes moves up to sit under its chart. Everything starts level with the frame. Next reading keeps its current look, below a hairline that draws from the frame edge on first view.",
    body: (
      <div className={x.stageGroup}>
        <Frame />
        <div className={s.edge}>{foot}</div>
        <div className={`${s.edge} ${s.ruled}`}>
          <FollowStep connection={GAP} href={gapHref} destination={DESTINATION} year={YEAR} />
        </div>
      </div>
    ),
  },
  {
    id: "C",
    name: "Notes first, one-line Next reading",
    mark: "Candidate",
    why: "As B, but Next reading becomes one line: label, link, destination. The explanatory sentence moves to hover. Two rows, two weights.",
    body: (
      <div className={x.stageGroup}>
        <Frame />
        <div className={s.edge}>{foot}</div>
        <div className={s.edge}>
          <NextLine connection={GAP} href={gapHref} />
        </div>
      </div>
    ),
  },
] as const;

export function UnderStageLab() {
  return (
    <main className={s.page}>
      <nav className={s.nav}>
        <Link href="/design-lab">Design lab</Link>
        <Link href="/design-lab/follow">Follow treatments</Link>
      </nav>
      <header className={s.header}>
        <p className="bo-label">Design lab · under the stage</p>
        <h1>What sits under the frame.</h1>
        <p>Same stage, same Notes, same link. Only the order, the left edge and the weight of Next reading change.</p>
      </header>
      {OPTIONS.map((o) => (
        <section key={o.id} className={s.option} aria-labelledby={`opt-${o.id}`}>
          <div className={s.caption}>
            <p className="bo-label">
              {o.id} · {o.mark}
            </p>
            <h2 id={`opt-${o.id}`}>{o.name}</h2>
            <p>{o.why}</p>
          </div>
          {o.body}
        </section>
      ))}
    </main>
  );
}
