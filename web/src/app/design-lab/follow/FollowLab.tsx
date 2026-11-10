"use client";

/**
 * Design lab — Follow chrome options.
 * Cap: one primary hop; at most one quiet aside. Navigate to the sibling instrument.
 */

import type { ReactNode } from "react";
import Link from "next/link";
import {
  ENERGY_CONNECTIONS,
  FollowList,
  resolveEnergyConnectionHref,
  type Connection,
} from "@/brand/connections";
import s from "./follow.module.css";

function byId(id: string): Connection {
  const conn = ENERGY_CONNECTIONS.find((c) => c.id === id);
  if (!conn) throw new Error(`Missing connection ${id}`);
  return conn;
}

const GAS = byId("gen.fuel.gas→fossil");
const STATION = byId("gen.station→gen.data");
const GAP = byId("imports.lifelines→fossil.gap");
const GEN = byId("imports.lifelines→generation");
const CONSUMPTION = byId("imports.lifelines→consumption");

const YEAR = 2024;
const gasHref = resolveEnergyConnectionHref(GAS, { fuel: "gas", year: YEAR });
const gapHref = resolveEnergyConnectionHref(GAP, { year: YEAR });
const genHref = resolveEnergyConnectionHref(GEN, { year: YEAR });
const stationHref = resolveEnergyConnectionHref(STATION, {
  fuel: "offshore-wind",
  year: YEAR,
});

const baselineItems = [GAP, GEN, CONSUMPTION].map((connection) => ({
  connection,
  href: resolveEnergyConnectionHref(connection, { year: YEAR }),
  note: `Same year · ${YEAR}`,
}));

const DEFERRED: Connection = {
  ...GAS,
  id: "lab.gas→fossil.deferred",
  readiness: "deferred",
  learn: "Fossil production pack not cloud-ready on this deploy — no live hop.",
};

function SampleStage({
  children,
  title = `UK electricity generation · gas · TWh`,
  from,
}: {
  children: ReactNode;
  title?: string;
  from?: ReactNode;
}) {
  return (
    <figure className={s.stage}>
      <figcaption className={s.bar}>
        <span>{title}</span>
        <span>{YEAR}</span>
      </figcaption>
      {from ? <div className={s.arrival}>{from}</div> : null}
      <div className={s.plot}>
        <p className={s.value}>96.4</p>
        <svg viewBox="0 0 320 72" aria-hidden="true">
          <path
            d="M8 50 C40 48 60 42 90 38 C120 34 140 40 170 28 C200 18 230 22 260 14 C280 10 300 16 312 12"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          />
        </svg>
      </div>
      <div className={s.body}>{children}</div>
    </figure>
  );
}

function PrimaryFollow({
  connection,
  href,
  destination,
  kicker = "Next reading",
}: {
  connection: Connection;
  href: string | null;
  destination: string;
  kicker?: string;
}) {
  const honesty = connection.honesty ?? connection.why;
  return (
    <div className={s.followBlock}>
      <p className={`bo-label ${s.followKicker}`}>{kicker}</p>
      {href ? (
        <a className={s.followTitle} href={href} title={`${connection.why} ${connection.learn}`}>
          {connection.label}
        </a>
      ) : (
        <p className={s.followTitleMuted} title={`${connection.why} ${connection.learn}`}>
          {connection.label}
        </p>
      )}
      <p className={s.followHonesty}>{honesty}</p>
      <p className={s.followMeta}>
        {href ? `Opens · ${destination} · ${YEAR}` : `Not linked yet · ${destination}`}
      </p>
    </div>
  );
}

function RailFollow({
  connection,
  href,
  destination,
}: {
  connection: Connection;
  href: string | null;
  destination: string;
}) {
  const honesty = connection.honesty ?? connection.why;
  return (
    <div className={s.rail} aria-label="Next reading">
      <p className="bo-label">Next reading</p>
      <div className={s.railRow}>
        <span className={s.railArrow} aria-hidden="true">
          →
        </span>
        <div className={s.railCopy}>
          {href ? (
            <a className={s.followTitle} href={href} title={`${connection.why} ${connection.learn}`}>
              {connection.label}
            </a>
          ) : (
            <p className={s.followTitleMuted}>{connection.label}</p>
          )}
          <p className={s.followHonesty}>{honesty}</p>
          <p className={s.railDest}>{destination}</p>
        </div>
        <p className={s.followMeta}>{YEAR}</p>
      </div>
    </div>
  );
}

const SPECIMENS = [
  {
    id: "0",
    name: "Baseline strip",
    mark: "Shipped · avoid scaling",
    why: "Three equal Caslon links. Reads like a sitemap. Year captions hide the honesty. This is what gets long if we treat Follow as “related”.",
    Stage: function Baseline() {
      return (
        <SampleStage title="Oil, gas and LNG entry · partner volumes">
          <p className={s.note}>Partner volumes for the selected year.</p>
          <FollowList items={baselineItems} className={s.baseline} />
        </SampleStage>
      );
    },
  },
  {
    id: "1",
    name: "Primary step",
    mark: "Locked · brand FollowStep",
    why: "One hop. Quiet kicker, Caslon destination, honesty line, mono “Opens · …”. The reading stays above the rule; Follow is clearly a next step, not a menu.",
    Stage: function Primary() {
      return (
        <SampleStage>
          <p className={s.note}>
            Gas-fired plant still fills the troughs when wind is quiet. Choose All fuels above to
            return to the whole mix.
          </p>
          <PrimaryFollow
            connection={GAS}
            href={gasHref}
            destination="Oil, gas and fossil fuels"
          />
        </SampleStage>
      );
    },
  },
  {
    id: "2",
    name: "Primary + one aside",
    mark: "When the question branches",
    why: "Still one hero hop. A second destination stays body-size and quiet — never a second Caslon headline. Hard cap: one aside.",
    Stage: function PrimaryAside() {
      return (
        <SampleStage title="Oil, gas and LNG entry · partner volumes">
          <p className={s.note}>Imported fuels sit beside domestic production for the same year.</p>
          <PrimaryFollow
            connection={GAP}
            href={gapHref}
            destination="Oil, gas and fossil fuels · Production gap"
          />
          <ul className={s.aside} aria-label="Also related">
            <li>
              Also{" "}
              {genHref ? <a href={genHref}>electricity generation</a> : "electricity generation"}
              {" · "}
              same year, different measure
            </li>
          </ul>
        </SampleStage>
      );
    },
  },
  {
    id: "3",
    name: "Next-step rail",
    mark: "Candidate",
    why: "Same content as Primary, framed as a small instrument under the stage. Arrow marks the hop. Slightly more chrome — use if Primary feels too plain.",
    Stage: function Rail() {
      return (
        <SampleStage>
          <p className={s.note}>
            Gas-fired plant still fills the troughs when wind is quiet.
          </p>
          <RailFollow
            connection={GAS}
            href={gasHref}
            destination="Oil, gas and fossil fuels"
          />
        </SampleStage>
      );
    },
  },
  {
    id: "4",
    name: "Arrival chip",
    mark: "Locked · brand ArrivalFrom",
    why: "On the destination stage: show where the reader came from. Back already works; this makes the hop feel intentional. Not a Follow list — arrival only.",
    Stage: function Arrival() {
      return (
        <SampleStage
          title="UK primary production beside imports · Production gap"
          from={
            <p className={s.fromChip}>
              From <strong>Generation · gas</strong>
              <span>· {YEAR}</span>
              <a href="/energy?domain=generation&view=current&fuel=gas&year=2024">Return</a>
            </p>
          }
        >
          <p className={s.note}>
            Domestic production and imports aligned by year — not a single official “gap” table.
          </p>
        </SampleStage>
      );
    },
  },
  {
    id: "5",
    name: "Deferred primary",
    mark: "Honesty when not Ready",
    why: "Same chrome as Primary. No link. Learner still sees the intended sibling without a fake hop.",
    Stage: function Deferred() {
      return (
        <SampleStage>
          <p className={s.note}>Gas-fired plant still fills the troughs when wind is quiet.</p>
          <PrimaryFollow
            connection={DEFERRED}
            href={null}
            destination="Oil, gas and fossil fuels"
          />
        </SampleStage>
      );
    },
  },
  {
    id: "6",
    name: "Station panel",
    mark: "Same grammar · Atlas",
    why: "Evidence panel uses the Primary step pattern: capacity first, then one contextual national series with honesty.",
    Stage: function Station() {
      return (
        <aside className={s.stationPanel} aria-label="Station evidence (mock)">
          <p className="bo-label">Selected station</p>
          <h3 className={s.stationName}>Dogger Bank A</h3>
          <dl className={s.stationMeta}>
            <div>
              <dt className="bo-label">Capacity</dt>
              <dd className="bo-fig">1,200 MW</dd>
            </div>
            <div>
              <dt className="bo-label">Technology</dt>
              <dd>Wind offshore</dd>
            </div>
          </dl>
          <div className={s.stationContext}>
            <p className="bo-label">National offshore wind · {YEAR}</p>
            <p className={s.stationFig}>
              <span className="bo-fig">40.0</span> <span className="bo-label">TWh</span>
            </p>
            <PrimaryFollow
              connection={STATION}
              href={stationHref}
              destination="Generation · Data"
              kicker="Contextual series"
            />
          </div>
        </aside>
      );
    },
  },
] as const;

export function FollowLab() {
  return (
    <main className={s.page}>
      <nav>
        <Link href="/design-lab">Design lab</Link>
        <Link href="/energy?domain=generation">Generation</Link>
      </nav>

      <header className={s.header}>
        <p className="bo-label">Design lab · follow</p>
        <h1>Better Follow chrome.</h1>
        <p>
          <strong>Locked:</strong> options <strong>1</strong> (Primary step) and <strong>4</strong>{" "}
          (Arrival chip) ship as brand <code>FollowStep</code> + <code>ArrivalFrom</code>. The other
          specimens stay here for reference.
        </p>
      </header>

      <section className={s.brief} aria-labelledby="rules">
        <h2 id="rules">Locked chrome</h2>
        <ul>
          <li>One primary Follow per reading (registry <code>primary: true</code>).</li>
          <li>Honesty visible on the step; mono “Opens · …” names the destination.</li>
          <li>Arrival chip on the far side via <code>via</code> + <code>via_return</code> query keys.</li>
          <li>Navigate to the sibling instrument — not an in-place overlay.</li>
        </ul>
      </section>

      {SPECIMENS.map(({ id, name, mark, why, Stage }) => (
        <section key={id} className={s.specimen} aria-labelledby={`specimen-${id}`}>
          <div className={s.caption}>
            <p className="bo-label">
              {id} · {mark}
            </p>
            <h2 id={`specimen-${id}`}>{name}</h2>
            <p>{why}</p>
          </div>
          <Stage />
        </section>
      ))}
    </main>
  );
}
