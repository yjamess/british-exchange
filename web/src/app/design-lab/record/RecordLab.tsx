"use client";

import Link from "next/link";
import s from "./record.module.css";

/**
 * Design lab only. The same sample figure, three ways to put definition,
 * method and the data-page link in one place.
 *
 * Proposed component, once a direction is chosen:
 *
 *   <FigureRecord
 *     source="UK House Price Index · MHCLG"
 *     definition="What the number is, in one or two sentences."
 *     method="How it was counted, and what not to infer."
 *     dataHref="/data"
 *   />
 *
 * The source is one short line, always visible. Period sits in the
 * figure bar. Release, indicator id and the file live on /data.
 */

const DEFINITION =
  "The UK House Price Index average for that month. It is mix-adjusted, so the series can be compared with itself. It is an area average, not the price of one house.";

const METHOD =
  "Pounds of that month, with no adjustment for inflation. A higher price than an earlier year is not, by itself, a higher cost in today’s money.";

const SOURCE = "UK House Price Index · MHCLG";
const DATA_HREF = "/data";

function SampleStage() {
  return (
    <figure className={s.stage}>
      <figcaption className={s.bar}>
        <span>Average house price, nominal · United Kingdom</span>
        <span className={s.when}>Aug 2026</span>
      </figcaption>
      <div className={s.plot}>
        <p className={s.value}>£273,037</p>
        <svg viewBox="0 0 320 72" aria-hidden="true">
          <path
            d="M8 58 C40 56 52 50 78 48 C110 44 120 40 150 36 C180 30 200 28 230 18 C260 12 280 14 312 8"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          />
        </svg>
      </div>
    </figure>
  );
}

function DataLink() {
  return (
    <Link href={DATA_HREF} className={s.dataLink}>
      Data <span aria-hidden="true">→</span>
    </Link>
  );
}

/** Always on the foot. Not a link — Data is the only way out. */
function SourceName() {
  return <p className={s.source}>{SOURCE}</p>;
}

/** A. Notes close. The source stays on the row, so a closed chart is still named. */
function Ledger() {
  return (
    <div className={s.foot}>
      <details className={s.details}>
        <summary className={s.summary}>
          <span className={s.mark} aria-hidden="true" />
          Notes
        </summary>
        <div className={s.panel}>
          <p>
            <span className="bo-label">Definition</span>
            {DEFINITION}
          </p>
          <p>
            <span className="bo-label">Method</span>
            {METHOD}
          </p>
        </div>
      </details>
      <SourceName />
      <DataLink />
    </div>
  );
}

/** B. Nothing to open. Definition, then method, then the data link. */
function TitleBlock() {
  return (
    <div className={s.block}>
      <div>
        <p className="bo-label">Definition</p>
        <p>{DEFINITION}</p>
      </div>
      <div>
        <p className="bo-label">Method</p>
        <p>{METHOD}</p>
      </div>
      <SourceName />
      <DataLink />
    </div>
  );
}

/** C. One reading note. The order of the sentences is the contract. */
function Endnote() {
  return (
    <div className={s.foot}>
      <details className={s.details}>
        <summary className={s.summary}>
          <span className={s.mark} aria-hidden="true" />
          How to read this
        </summary>
        <div className={s.panel}>
          <p>{DEFINITION}</p>
          <p>{METHOD}</p>
        </div>
      </details>
      <SourceName />
      <DataLink />
    </div>
  );
}

const SPECIMENS = [
  {
    id: "A",
    name: "Ledger",
    mark: "Recommended",
    why: "Same row under every stage. Notes close. The source stays visible, so the chart is still named. Definition, then method, only when someone asks.",
    Foot: Ledger,
  },
  {
    id: "B",
    name: "Title block",
    mark: "If the note must be seen",
    why: "Nothing is hidden, so a short page and a long page still share one shape. It costs height on every tab.",
    Foot: TitleBlock,
  },
  {
    id: "C",
    name: "Endnote",
    mark: "If two labels feel like a form",
    why: "One note, two sentences in a fixed order. Fewer words in the chrome. Harder to scan for “what is this?”.",
    Foot: Endnote,
  },
] as const;

export function RecordLab() {
  return (
    <main className={s.page}>
      <nav>
        <Link href="/design-lab">Design lab</Link>
        <Link href="/housing?domain=prices">Housing</Link>
      </nav>

      <header className={s.header}>
        <p className="bo-label">Design lab · figure record</p>
        <h1>One place for notes and data.</h1>
        <p>
          Definition and method sit in Notes. The source stays on the same row, short enough to read with the chart: the series, then who publishes it. Period is already in the figure bar. The release, the indicator id and the file stay on the data page. This lab does not change Housing.
        </p>
      </header>

      <section className={s.advice} aria-labelledby="download-advice">
        <h2 id="download-advice">Leave downloads off the domain tabs</h2>
        <p>
          A chart is a reading of a file. The file is downloaded once, from the data page, as the publisher released it. A second download of “this stat, this period” drifts as soon as a filter or a derived measure is involved, and it gives every tab a different button. The domain Data tab already shows the numbers. People who want the file follow Data.
        </p>
      </section>

      <section className={s.today} aria-labelledby="today-label">
        <h2 id="today-label">What the pages do now</h2>
        <p>The same ideas, under different names, and not always there.</p>
        <ul>
          <li>Exact values</li>
          <li>Definitions</li>
          <li>How this is calculated</li>
          <li>All features as a table</li>
          <li>Sources &amp; notes · MHCLG</li>
          <li>View data</li>
        </ul>
      </section>

      {SPECIMENS.map(({ id, name, mark, why, Foot }) => (
        <section key={id} className={s.specimen} aria-labelledby={`specimen-${id}`}>
          <div className={s.caption}>
            <p className="bo-label">
              {id} · {mark}
            </p>
            <h2 id={`specimen-${id}`}>{name}</h2>
            <p>{why}</p>
          </div>
          <SampleStage />
          <Foot />
        </section>
      ))}
    </main>
  );
}
