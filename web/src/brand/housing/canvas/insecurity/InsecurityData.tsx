"use client";

/**
 * Domain 08 — Data. Every indicator behind the domain in one readable table (measure type,
 * unit, span, geography, publisher, release, record), the brief's research figures checked
 * against the loaded releases, and the definitions that keep stocks, flows and jurisdictions
 * apart.
 */

import { useId } from "react";
import { fmt } from "../../../data";
import { explorerClasses as t } from "../../..";
import type { HousingV1, Source } from "../../load";
import s from "./insecurity.module.css";

type Props = { insecurity: HousingV1["insecurity"]; sources: HousingV1["sources"] };

/** Domain 08 indicators, in reading order. The catalogue opens each one with `?record=`. */
export const INSECURITY_RECORDS: { id: string; measure: string; area: string }[] = [
  { id: "statutory-homelessness-assessments", measure: "Flow · quarter", area: "Statutory homelessness" },
  { id: "homelessness-prevention-outcomes", measure: "Flow · quarter", area: "Prevention" },
  { id: "homelessness-relief-outcomes", measure: "Flow · quarter", area: "Prevention" },
  { id: "homelessness-main-duty", measure: "Flow · quarter", area: "Statutory homelessness" },
  { id: "homelessness-support-needs", measure: "Flow · quarter", area: "Households at risk" },
  { id: "homelessness-priority-need", measure: "Flow · quarter", area: "Households at risk" },
  { id: "temporary-accommodation-households", measure: "Stock · quarter end", area: "Temporary accommodation" },
  { id: "temporary-accommodation-children", measure: "Stock · quarter end", area: "Temporary accommodation" },
  { id: "temporary-accommodation-by-type", measure: "Stock · quarter end", area: "Temporary accommodation" },
  { id: "temporary-accommodation-duration", measure: "Stock · length so far", area: "Temporary accommodation" },
  { id: "temporary-accommodation-out-of-area", measure: "Stock · quarter end", area: "Displacement" },
  { id: "rough-sleeping-snapshot", measure: "Stock · one autumn night", area: "Rough sleeping" },
  { id: "rough-sleeping-framework", measure: "Management information · month", area: "Rough sleeping" },
  { id: "possession-claims", measure: "Flow · quarter", area: "Evictions and repossessions" },
  { id: "social-housing-waiting-list", measure: "Stock · 31 March", area: "Social housing registers" },
  { id: "social-housing-lettings", measure: "Flow · financial year", area: "Social housing lettings" },
  { id: "concealed-households", measure: "Stock · Census Day", area: "Hidden homelessness" },
  { id: "temporary-accommodation-spend", measure: "Flow · £ thousand, financial year", area: "Council spending" },
  { id: "homelessness-devolved-ta", measure: "Stock · jurisdiction-specific", area: "Devolved returns" },
];

/** Research figures quoted in the domain brief, checked against what is loaded. */
const BRIEF_FIGURES: {
  claim: string;
  expected: number;
  period: string;
  unit: string;
  actual: (d: HousingV1["insecurity"]) => number | null;
}[] = [
  {
    claim: "Households in temporary accommodation",
    expected: 135_580,
    period: "Stock · 31 Mar 2026",
    unit: "households",
    actual: (d) => d.headlines.taHouseholds,
  },
  {
    claim: "Children in those households",
    expected: 177_530,
    period: "Stock · 31 Mar 2026",
    unit: "children",
    actual: (d) => d.headlines.taChildren,
  },
  {
    claim: "Assessed as owed a prevention or relief duty",
    expected: 83_850,
    period: "Flow · Jan–Mar 2026",
    unit: "households",
    actual: (d) => d.headlines.assessmentsOwed,
  },
  {
    claim: "Estimated sleeping rough on one night",
    expected: 4_793,
    period: "Stock · autumn 2025",
    unit: "people",
    actual: (d) => d.headlines.roughSleeping,
  },
];

const GLOSSARY: { term: string; body: string }[] = [
  {
    term: "Stock",
    body: "A count on one date, such as households in temporary accommodation on 31 March. It cannot be added to a quarter's assessments.",
  },
  {
    term: "Flow",
    body: "A count of events during a period, such as duties owed or ended in a quarter, or lettings in a year.",
  },
  {
    term: "Homelessness is not rough sleeping",
    body: "Statutory homelessness is a legal and administrative route. Rough sleeping is a separate single-night estimate, and most homeless households never sleep rough.",
  },
  {
    term: "Process is not a cohort",
    body: "The Pathways diagram shows the legal sequence. Each count comes from its own table and cohort, so the figures are not the same households moving through.",
  },
  {
    term: "England is not the UK",
    body: "Scotland, Wales and Northern Ireland have different homelessness law. Their figures are shown separately and never added to England's.",
  },
  {
    term: "No invented waiting time",
    body: "Dividing housing-register totals by lettings does not give any household's predicted wait.",
  },
  {
    term: "Spend is not a unit cost",
    body: "RO4 is annual council spending in £ thousand. Dividing it by the TA stock does not give a cost per household.",
  },
  {
    term: "Snapshot is not the monthly framework",
    body: "The autumn snapshot is an official single-night estimate. The data framework is management information about people seen over a month.",
  },
  {
    term: "Hidden homelessness",
    body: "Sofa surfing and other insecure arrangements are mostly not in administrative records. Census concealed families are one partial strand of evidence.",
  },
];

const span = (src: Source) => {
  const a = src.first.slice(0, 7);
  const b = src.last.slice(0, 7);
  return a === b ? a : `${a} → ${b}`;
};

export function InsecurityData({ insecurity, sources }: Props) {
  const h = insecurity.headlines;
  const devolved = insecurity.devolvedTa ?? [];
  const rows = INSECURITY_RECORDS.map((i) => ({ ...i, src: sources[i.id] })).filter((r) => r.src);
  const missing = INSECURITY_RECORDS.filter((i) => !sources[i.id]);
  const spendBn = h.homelessnessSpendNet != null ? (h.homelessnessSpendNet / 1_000_000).toFixed(2) : null;
  const titleId = useId();

  return (
    <div className={s.root}>
      <p className={s.lede}>
        Every indicator behind Housing insecurity, with its measure type, period, geography and
        source release. Open any record for the full observations and source trail.
      </p>

      <div className={t.tableGroup}>
        <p className={t.stageTitle} id={`${titleId}-records`}>
          Housing insecurity data
        </p>
        <div className={s.tableWrap}>
        <table className={s.table} aria-labelledby={`${titleId}-records`}>
          <thead>
            <tr>
              <th scope="col">Indicator</th>
              <th scope="col">Research area</th>
              <th scope="col">Measure</th>
              <th scope="col">Unit</th>
              <th scope="col">Span</th>
              <th scope="col">Geography</th>
              <th scope="col">Publisher · release</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ id, measure, area, src }) => (
              <tr key={id}>
                <th scope="row">
                  <a href={`/data?record=${id}`}>{src!.title}</a>
                </th>
                <td>{area}</td>
                <td>{measure}</td>
                <td>{src!.unit}</td>
                <td>{span(src!)}</td>
                <td>{src!.geography}</td>
                <td>
                  {src!.publisher}
                  {src!.release ? ` · ${src!.release}` : ""}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>
      {missing.length > 0 && (
        <p className={s.note}>
          Not loaded in this build: {missing.map((m) => m.id).join(", ")}. These are not estimated.
        </p>
      )}

      <div className={t.tableGroup}>
        <p className={t.stageTitle} id={`${titleId}-brief`}>
          Research figures checked against the loaded release
        </p>
        <div className={s.tableWrap}>
        <table className={s.table} aria-labelledby={`${titleId}-brief`}>
          <thead>
            <tr>
              <th scope="col">Figure</th>
              <th scope="col">Period</th>
              <th scope="col" className={s.num}>
                Brief
              </th>
              <th scope="col" className={s.num}>
                Loaded
              </th>
              <th scope="col">Check</th>
            </tr>
          </thead>
          <tbody>
            {BRIEF_FIGURES.map((f) => {
              const v = f.actual(insecurity);
              const status = v == null ? "Not loaded" : Math.round(v) === f.expected ? "Matches" : "Differs, check revision";
              return (
                <tr key={f.claim}>
                  <th scope="row">{f.claim}</th>
                  <td>{f.period}</td>
                  <td className={s.num}>{fmt.count(f.expected)}</td>
                  <td className={s.num}>{v == null ? "—" : fmt.count(v)}</td>
                  <td>{status}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        </div>
      </div>

      <section className={s.section} aria-label="Definitions">
        <p className="bo-label">Definitions</p>
        <dl className={s.facts}>
          {GLOSSARY.map((g) => (
            <div key={g.term}>
              <dt className="bo-label">{g.term}</dt>
              <dd>{g.body}</dd>
            </div>
          ))}
        </dl>
      </section>

      <div className={s.split}>
        <section className={s.section} aria-label="Devolved temporary accommodation">
          <p className="bo-label">Devolved returns · separate legal definitions</p>
          {devolved.length > 0 ? (
            <ul className={s.rows}>
              {devolved.map((d) => (
                <li key={`${d.id}-${d.period}`} className={s.row}>
                  <span className={s.rowName}>{d.label}</span>
                  <span className={s.rowValue}>{fmt.count(d.v)}</span>
                  <span className={s.rowMeta}>households in TA · {d.period}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className={s.note}>Devolved returns are not loaded yet.</p>
          )}
          <p className={s.note}>Each nation counts temporary accommodation under its own law. These are not a UK total.</p>
        </section>
        <section className={s.section} aria-label="Cost and monthly rough sleeping">
          <p className="bo-label">Context for future views</p>
          <p className={s.body}>
            The Cost of Insecurity is not built. A spending total does not stand in for it.
            England homelessness net current expenditure in 2024–25 was{" "}
            <strong>{spendBn != null ? `£${spendBn} billion` : "—"}</strong> (RO4, £ thousand ÷
            1,000,000). That is council spending for the year. It is not a cost per household, and
            it is not linked to outcomes.
          </p>
          <p className={s.body}>
            People seen sleeping rough over June 2026:{" "}
            <strong>{h.roughSleepingMonth != null ? fmt.count(h.roughSleepingMonth) : "—"}</strong>{" "}
            (data framework management information, not the autumn snapshot).
          </p>
        </section>
      </div>
    </div>
  );
}
