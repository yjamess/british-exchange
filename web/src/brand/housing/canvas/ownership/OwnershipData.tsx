"use client";

/**
 * Ownership → Data. Observation tables for series already used on this domain.
 * Glossary terms sit in Notes, not as a catalogue dump.
 */

import { EmptyStage, explorerClasses as t } from "../../..";
import { fmt, fmtT, type Pt } from "../../../data";
import type { HousingV1 } from "../../load";
import gen from "../../../energy/generation.module.css";

type Own = HousingV1["ownership"];

function yearRows(points: Pt[]): { t: number; v: number }[] {
  return [...points].sort((a, b) => b.t - a.t);
}

export function ownershipDataFoot(): {
  definition: string;
  method: string[];
  source: string;
  dataHref: string;
} {
  return {
    definition:
      "Each table is a series already used on Who owns, Mortgages or Wealth. Stocks and flows are not the same measure.",
    method: [
      "Stock. Outstanding mortgage balances and arrears balances, measured at quarter end.",
      "Flow. Approvals, advances and commitments during a month or a quarter. A flow is not added to the stock.",
      "Title. A registered piece of land or property and its legal owner. Not a home, not who lives there, and not who benefits from it.",
      "Owner type. The Land Registry category of the first owner named on the title. Titles owned by individuals are not in these files.",
      "Net property wealth. A household’s self-valuation of property, minus mortgage debt. Not a registered title, and not the FCA loan book.",
      "Quoted mortgage rates are the Economy series already used on Affordability.",
      "Contains HM Land Registry data © Crown copyright and database right 2026. This data is licensed under the Open Government Licence v3.0.",
    ],
    source: "HM Land Registry · FCA · PRA · MLAR · ONS · Wealth and Assets Survey · Bank of England",
    dataHref: "/data",
  };
}

export function OwnershipData({ ownership }: { ownership: Own }) {
  const stock = yearRows(ownership.balancesOutstanding);
  const advances = yearRows(ownership.grossAdvances);
  const median = yearRows(ownership.medianAllHouseholds);
  const titles = ownership.titles;
  const month = titles.period
    ? `${["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][Number(titles.period.slice(5, 7)) - 1]} ${titles.period.slice(0, 4)}`
    : "";
  const overseasBy = new Map(titles.overseas.places.map((p) => [p.code, p.v]));
  const places = [...titles.uk.places].sort((a, b) => a.name.localeCompare(b.name));
  const overseasType = new Map(titles.overseas.types.map((r) => [r.label, r.v]));
  const typeLabels = [...new Set([...titles.uk.types, ...titles.overseas.types].map((r) => r.label))];
  const ukType = new Map(titles.uk.types.map((r) => [r.label, r.v]));
  const hasTitles = places.length > 0;
  const estates = ownership.estates.rows;
  const COVERAGE = { before: "All estates that reported assets", transition: "Mixed, change on 1 Jan 2022", full: "Full returns only" };
  const hasAny = stock.length > 0 || advances.length > 0 || median.length > 0 || hasTitles || estates.length > 0;

  if (!hasAny) {
    return (
      <EmptyStage label="In preparation">
        Ownership series are not loaded yet. No estimated figures.
      </EmptyStage>
    );
  }

  return (
    <div className={gen.stack}>
      {hasTitles && (
        <>
          <section className={gen.panel}>
            <h3 className={t.stageTitle}>Titles held by companies by local authority · England and Wales · {month}</h3>
            <div className={t.tableWrap}>
              <table className={t.table} aria-label="Titles held by companies by local authority">
                <thead>
                  <tr>
                    <th scope="col">Local authority</th>
                    <th scope="col">UK companies · titles</th>
                    <th scope="col">Overseas companies · titles</th>
                  </tr>
                </thead>
                <tbody>
                  {places.map((p) => (
                    <tr key={p.code}>
                      <th scope="row">{p.name}</th>
                      <td>{fmt.count(p.v)}</td>
                      <td>{fmt.count(overseasBy.get(p.code) ?? 0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className={gen.panel}>
            <h3 className={t.stageTitle}>Titles held by companies by type of owner · England and Wales · {month}</h3>
            <div className={t.tableWrap}>
              <table className={t.table} aria-label="Titles held by companies by type of owner">
                <thead>
                  <tr>
                    <th scope="col">Type of owner</th>
                    <th scope="col">UK companies · titles</th>
                    <th scope="col">Overseas companies · titles</th>
                  </tr>
                </thead>
                <tbody>
                  {typeLabels.map((label) => (
                    <tr key={label}>
                      <th scope="row">{label}</th>
                      <td>{ukType.has(label) ? fmt.count(ukType.get(label)!) : "—"}</td>
                      <td>{overseasType.has(label) ? fmt.count(overseasType.get(label)!) : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {titles.overseas.countries.length > 0 && (
            <section className={gen.panel}>
              <h3 className={t.stageTitle}>Titles held by overseas companies by country of registration · {month}</h3>
              <div className={t.tableWrap}>
                <table className={t.table} aria-label="Titles held by overseas companies by country of registration">
                  <thead>
                    <tr>
                      <th scope="col">Country</th>
                      <th scope="col">Titles</th>
                    </tr>
                  </thead>
                  <tbody>
                    {titles.overseas.countries.map((c) => (
                      <tr key={c.id}>
                        <th scope="row">{c.label}</th>
                        <td>{fmt.count(c.v)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </>
      )}

      {estates.length > 0 && (
        <section className={gen.panel}>
          <h3 className={t.stageTitle}>Residential property in estates · UK · by tax year of death</h3>
          <div className={t.tableWrap}>
            <table className={t.table} aria-label="Residential property in estates reported to HMRC">
              <thead>
                <tr>
                  <th scope="col">Tax year of death</th>
                  <th scope="col">Estates covered</th>
                  <th scope="col">Residential property · £ million</th>
                  <th scope="col">Estates holding it</th>
                  <th scope="col">All assets · £ million</th>
                </tr>
              </thead>
              <tbody>
                {[...estates].reverse().map((r) => (
                  <tr key={r.year}>
                    <th scope="row">{r.year}</th>
                    <td>{COVERAGE[r.coverage]}</td>
                    <td>{r.residential == null ? "—" : fmt.count(r.residential)}</td>
                    <td>{r.holding == null ? "—" : fmt.count(r.holding)}</td>
                    <td>{r.gross == null ? "—" : fmt.count(r.gross)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {stock.length > 0 && (
        <section className={gen.panel}>
          <h3 className={t.stageTitle}>Residential mortgage balances outstanding · UK</h3>
          <div className={t.tableWrap}>
            <table className={t.table} aria-label="Residential mortgage balances outstanding">
              <thead>
                <tr>
                  <th scope="col">Period</th>
                  <th scope="col">Balances · £ million</th>
                </tr>
              </thead>
              <tbody>
                {stock.map((p) => (
                  <tr key={p.t}>
                    <th scope="row">{fmtT(p.t, "quarterly")}</th>
                    <td>{fmt.count(p.v)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {advances.length > 0 && (
        <section className={gen.panel}>
          <h3 className={t.stageTitle}>Gross mortgage advances · UK</h3>
          <div className={t.tableWrap}>
            <table className={t.table} aria-label="Gross mortgage advances">
              <thead>
                <tr>
                  <th scope="col">Period</th>
                  <th scope="col">Advances · £ million</th>
                </tr>
              </thead>
              <tbody>
                {advances.map((p) => (
                  <tr key={p.t}>
                    <th scope="row">{fmtT(p.t, "quarterly")}</th>
                    <td>{fmt.count(p.v)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {median.length > 0 && (
        <section className={gen.panel}>
          <h3 className={t.stageTitle}>Median household net property wealth · Great Britain</h3>
          <div className={t.tableWrap}>
            <table className={t.table} aria-label="Median household net property wealth">
              <thead>
                <tr>
                  <th scope="col">Survey window</th>
                  <th scope="col">Median · £</th>
                </tr>
              </thead>
              <tbody>
                {median.map((p) => (
                  <tr key={p.t}>
                    <th scope="row">{fmtT(p.t, "annual")}</th>
                    <td>{fmt.gbp(p.v)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
