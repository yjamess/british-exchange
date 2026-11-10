"use client";

/**
 * Supply → Data.
 * Lists every supply series, then the England Live Table 118 ledger.
 * The ledger uses the same identity as the Supply Machine, including provisional years.
 */

import { useId } from "react";
import { EmptyStage, explorerClasses as t } from "../../..";
import { fmt, fmtFY, fmtT, toT } from "../../../data";
import type { HousingV1, Source, SupplyLedgerYear } from "../../load";
import gen from "../../../energy/generation.module.css";
import s from "./supply.module.css";

const ENGLAND = "E92000001";

/** Catalogue rows for this domain. Order is the reading order, not the file order. */
const SERIES: { id: string; what: string }[] = [
  {
    id: "net-additional-dwellings",
    what: "Financial-year change in the dwelling stock, with components. England and regions.",
  },
  {
    id: "net-additions-by-authority",
    what: "The same net change by local authority. Districts and metropolitan counties are both in the file; the Geography rank uses districts only.",
  },
  {
    id: "housing-starts",
    what: "Dwellings started in a quarter, by who built them.",
  },
  {
    id: "housing-completions",
    what: "Dwellings completed in a quarter, by who built them. Not a financial-year net addition.",
  },
  {
    id: "affordable-housing-supply",
    what: "Affordable products completed in a financial year. This is the product, not the builder.",
  },
  {
    id: "planning-decisions-granted",
    what: "Planning applications granted in a quarter. An application is not a dwelling.",
  },
];

/**
 * Published net minus the signed parts, minus the note 6 residual.
 * Census is not applicable in later years; a missing census counts as zero, matching the machine.
 * Returns null when a physical part was not published, so the gap is not invented.
 */
function unreconciled(row: SupplyLedgerYear): number | null {
  const { net, newBuild, conversions, changeOfUse, otherGains, demolitions, census, residual } = row;
  if (
    net == null ||
    newBuild == null ||
    conversions == null ||
    changeOfUse == null ||
    otherGains == null ||
    demolitions == null
  ) {
    return null;
  }
  const parts = newBuild + conversions + changeOfUse + otherGains - demolitions + (census ?? 0);
  return net - parts - (residual ?? 0);
}

/** Financial years stay "2024–25". Quarters stay "Q2 2026". A raw 1 April date is the year start, not the label. */
function latestLabel(src: Source): string {
  const t = toT(src.last);
  if (/financial/i.test(src.frequency)) return fmtFY(t);
  if (/quarter/i.test(src.frequency)) return fmtT(t, "quarterly");
  return src.last;
}

function count(v: number | null): string {
  return v == null ? "—" : fmt.count(v);
}

function gapLabel(v: number | null): string {
  if (v == null) return "—";
  if (Math.abs(v) < 0.5) return "0";
  const sign = v < 0 ? "−" : "+";
  return `${sign}${fmt.count(Math.abs(v))}`;
}

export function supplyDataFoot(): {
  definition: string;
  method: string[];
  source: string;
  dataHref: string;
} {
  return {
    definition:
      "Each row is a series on this domain. Planning applications, quarterly dwellings, affordable products and financial-year net additions are different counts.",
    method: [
      "Downloads stay on the data catalogue.",
      "The England ledger below uses the Live Table 118 identity, including provisional years.",
    ],
    source: "MHCLG · Live Tables 118, 122, 213, 1000 · England",
    dataHref: "/data#net-additional-dwellings",
  };
}

export function SupplyData({ data }: { data: HousingV1 }) {
  const rows = [...(data.supplyMachine.byPlace[ENGLAND] ?? [])].reverse();
  const titleId = useId();

  return (
    <div className={gen.stack}>
      <section className={gen.panel}>
        <h3 className={t.stageTitle} id={`${titleId}-series`}>
          Supply series on this page
        </h3>
        <div className={t.tableWrap}>
          <table className={`${t.table} ${s.series}`} aria-labelledby={`${titleId}-series`}>
            <thead>
              <tr>
                <th scope="col">Series</th>
                <th scope="col">What it counts</th>
                <th scope="col">Unit</th>
                <th scope="col">Latest</th>
                <th scope="col">Record</th>
              </tr>
            </thead>
            <tbody>
              {SERIES.map((series) => {
                const src = data.sources[series.id];
                return (
                  <tr key={series.id}>
                    <th scope="row">{src?.title ?? series.id}</th>
                    <td>{series.what}</td>
                    <td>{src ? `${src.unit} · ${src.frequency}` : "Not loaded"}</td>
                    <td>{src ? latestLabel(src) : "—"}</td>
                    <td>{src ? <a href={`/data#${series.id}`}>{series.id}</a> : "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className={gen.panel}>
        <h3 className={t.stageTitle} id={`${titleId}-ledger`}>
          The housing supply machine — how the dwelling stock changed
        </h3>
        {rows.length === 0 ? (
          <EmptyStage label="In preparation">
            The England ledger is not loaded. No estimated figures.
          </EmptyStage>
        ) : (
          <div className={t.tableWrap}>
            <table className={`${t.table} ${s.ledger}`} aria-labelledby={`${titleId}-ledger`}>
              <thead>
                <tr>
                  <th scope="col">Financial year</th>
                  <th scope="col">New build</th>
                  <th scope="col">Conversions</th>
                  <th scope="col">Change of use</th>
                  <th scope="col">Other gains</th>
                  <th scope="col">Demolitions</th>
                  <th scope="col">Census</th>
                  <th scope="col">Residual</th>
                  <th scope="col">Net additions</th>
                  <th scope="col">Unreconciled</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.fy}>
                    <th scope="row">
                      {row.fy}
                      {row.status === "provisional" ? " provisional" : ""}
                    </th>
                    <td>{count(row.newBuild)}</td>
                    <td>{count(row.conversions)}</td>
                    <td>{count(row.changeOfUse)}</td>
                    <td>{count(row.otherGains)}</td>
                    <td>{count(row.demolitions)}</td>
                    <td>{count(row.census)}</td>
                    <td>{count(row.residual)}</td>
                    <td>{count(row.net)}</td>
                    <td>{gapLabel(unreconciled(row))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
