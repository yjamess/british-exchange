"use client";

import Link from "next/link";
import { ICON_PLATES, Plate } from "@/brand/Plate";
import s from "./economyElevation.module.css";

/**
 * Orchestrator-owned Economy elevation studies.
 * Lab only — winners fold into the Review Gate visual contract.
 * Do not promote these treatments into production /economy until that gate.
 */

const GROUNDS = [
  {
    id: "paper",
    title: "Paper",
    className: s.paper,
    token: "--bo-paper",
    note: "Default Quiet reading surface. Most of the Explorer stays here.",
  },
  {
    id: "sage",
    title: "Sage ground",
    className: "bo-on-sage",
    token: "--bo-sage",
    note: "Section or panel break between Quiet blocks. Type stays Union; rules stay Electric.",
  },
  {
    id: "straw",
    title: "Straw ground",
    className: "bo-on-straw",
    token: "--bo-straw",
    note: "Alternate muted ground. Use for fiscal / household context strips — not chart fills.",
  },
  {
    id: "electric",
    title: "Flat electric",
    className: s.electric,
    token: "--bo-electric",
    note: "Monumental break or solid mast strip. Paper type only. One loud surface per page.",
  },
  {
    id: "union",
    title: "Union depth",
    className: s.union,
    token: "--bo-union",
    note: "Index / night sections. Lavender muted type on Union is allowed; not for long Notes.",
  },
] as const;

const TREATMENTS = [
  { treatment: "print" as const, label: "print", use: "Default hero and rail plates" },
  { treatment: "night" as const, label: "night", use: "Imagery-only dark band; copy on solid panel" },
  { treatment: "negative" as const, label: "negative", use: "Section break / selected rail tile" },
];

const ICON_CANDIDATES = [
  { key: "balance" as const, domain: "01 Prices / 02 Wages" },
  { key: "deed" as const, domain: "04 Household / 08 Debt" },
  { key: "scroll" as const, domain: "10 Policy" },
  { key: "gauge" as const, domain: "05 Growth dial" },
  { key: "plot" as const, domain: "Survey / measure mark" },
] as const;

const INSTRUMENTS = [
  {
    domain: "01 Inflation & Prices",
    name: "Changing Price of Britain",
    form: "TimeChart + measure switch (CPI / CPIH)",
    bespoke: "Category contribution RankBars when COICOP Ready — else planned-not-ready",
  },
  {
    domain: "02 Wages, Earnings & Income",
    name: "Pay cheque vs prices",
    form: "Indexed dual lines or ChangeRows (no dual-axis)",
    bespoke: "Wage ladder / percentile instrument — needs national ASHE",
  },
  {
    domain: "05 Productivity & Economic Growth",
    name: "What Britain produces",
    form: "GDP + per head + labour productivity panels",
    bespoke: "Follow to Energy manufacturing productivity — link only",
  },
  {
    domain: "08 Public Debt & Government Finances",
    name: "Debt dial",
    form: "Three separate measures: debt · borrowing · interest",
    bespoke: "Debt % of GDP only with documented derivation or official series",
  },
] as const;

export function EconomyElevationLab() {
  return (
    <div className={s.page}>
      <nav className={s.nav}>
        <Link href="/design-lab">Design lab</Link>
        <Link href="/design-lab/emoji">Emoji / grounds</Link>
        <Link href="/economy?domain=inflation">Economy · Inflation (G3)</Link>
        <span className="bo-label">Lab · contract locked 2026-11-11</span>
      </nav>

      <header className={s.header}>
        <p className={s.eyebrow}>Design lab · Economy elevation</p>
        <h1>Same Explorer shell. Less sameness.</h1>
        <p>
          Studies for Economy Gate 1–2. Winners are locked in{" "}
          <code>docs/economy-visual-contract.md</code>. Variation uses brand levers already allowed in{" "}
          <code>docs/visual-identity.md</code> — sage/straw grounds, plate treatments, penship icons,
          one signature stage instrument. No parallel palette. Wave A G3 production starts at{" "}
          <code>/economy?domain=inflation</code>.
        </p>
      </header>

      <section className={s.section} aria-labelledby="grounds-h">
        <h2 id="grounds-h">Muted grounds</h2>
        <p>
          Underused on Housing/Energy explorers. Candidate use: Quiet section breaks under the stage
          or between multi-chart panels — never inside a plot, never faded type.
        </p>
        <div className={s.grid}>
          {GROUNDS.map((g) => (
            <article key={g.id} className={`${s.swatch} ${g.className}`}>
              <div>
                <h3>{g.title}</h3>
                <p>{g.note}</p>
              </div>
              <code>{g.token}</code>
            </article>
          ))}
        </div>
      </section>

      <section className={s.section} aria-labelledby="plates-h">
        <h2 id="plates-h">Hero plate treatments</h2>
        <p>
          Economy hero today: <code>containerPort</code>. Compare print / night / negative. Copy always
          sits on a solid panel — treatments are imagery, not reading themes.
        </p>
        <div className={s.plates}>
          {TREATMENTS.map((t) => (
            <figure key={t.treatment} className={s.plateCard}>
              <div className={s.plateFrame}>
                <Plate name="containerPort" treatment={t.treatment} position="50% 16%" />
              </div>
              <figcaption>
                <strong>{t.label}</strong>
                {t.use}
              </figcaption>
            </figure>
          ))}
        </div>
      </section>

      <section className={s.section} aria-labelledby="icons-h">
        <h2 id="icons-h">Icon candidates (penship)</h2>
        <p>
          Live rails use <code>REF_ICON_PLATES</code> (photo-ref). Penship <code>ICON_PLATES</code> are
          underused — candidates for condensed nav or figure chips until Economy photo-refs are drawn.
          New Economy <code>REF_ICON</code> set still required before G3 rail polish.
        </p>
        <div className={s.icons}>
          {ICON_CANDIDATES.map((c) => {
            const plate = ICON_PLATES[c.key];
            return (
              <div key={c.key} className={s.iconCard}>
                <div
                  className={s.iconMask}
                  style={{
                    WebkitMaskImage: `url(${plate.src})`,
                    maskImage: `url(${plate.src})`,
                  }}
                  role="img"
                  aria-label={plate.alt}
                />
                <span>{c.key}</span>
                <p className="bo-label" style={{ margin: 0, textTransform: "none", letterSpacing: 0 }}>
                  {c.domain}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      <section className={s.section} aria-labelledby="instruments-h">
        <h2 id="instruments-h">Wave A signature instruments (requirements only)</h2>
        <p>
          Documented for the Review Gate — not implemented here. Shared charts stay{" "}
          <code>TimeChart</code> / <code>RankBars</code> / <code>ChangeRows</code>. At most one bespoke
          instrument per flagship domain inside the stage.
        </p>
        <div className={s.tableWrap}>
          <table className={s.table}>
            <thead>
              <tr>
                <th>Domain</th>
                <th>Flagship</th>
                <th>Shared form</th>
                <th>Bespoke / planned-not-ready</th>
              </tr>
            </thead>
            <tbody>
              {INSTRUMENTS.map((row) => (
                <tr key={row.domain}>
                  <td>{row.domain}</td>
                  <td>{row.name}</td>
                  <td>{row.form}</td>
                  <td>{row.bespoke}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className={s.callout}>
          <p>
            Review Gate checklist: pick ground recipe (sage vs straw frequency), hero treatment default,
            rail icon system (photo-ref vs penship interim), and which one Wave A bespoke instrument
            ships first. Then unlock G3 — domain agents integrate data into the shared shell only.
          </p>
        </div>
      </section>
    </div>
  );
}
