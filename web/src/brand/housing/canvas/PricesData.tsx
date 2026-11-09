/**
 * Prices → Data. One row per series already drawn on the other Prices tabs.
 * Coverage, geography and basis come from the loaded points, not from fixed dates.
 */

import { fmt, fmtT, type Pt } from "../../data";
import { explorerClasses as t } from "../..";
import type { HousingV1 } from "../load";
import s from "./explorer.module.css";

export type PriceRow = {
  id: string;
  series: string;
  place: string;
  basis: string;
  purpose: string;
  points: Pt[];
};

function row(
  id: string,
  series: string,
  place: string,
  basis: string,
  purpose: string,
  points: Pt[],
): PriceRow | null {
  return points.length ? { id, series, place, basis, purpose, points } : null;
}

/** Series the Prices tabs can show, in the order a reader meets them. */
export function priceCatalogue(d: HousingV1): PriceRow[] {
  const rows = [
    row(
      "average",
      "Average price",
      "United Kingdom",
      "Nominal £",
      "Headline mix-adjusted average",
      d.price,
    ),
    row(
      "real",
      "Average price, CPI-adjusted",
      "United Kingdom",
      "£ of latest CPI month",
      "Same UK average, restated for inflation",
      d.priceReal,
    ),
    ...d.types.map((line) =>
      row(line.id, line.label, "United Kingdom", "Nominal £", "Average for that property type", line.points),
    ),
    ...d.newExisting.map((line) =>
      row(
        line.id,
        line.label,
        "United Kingdom",
        "Nominal £",
        "That build status only — a different mix of homes",
        line.points,
      ),
    ),
    row(
      "first-time-buyer",
      "First-time buyer",
      "England",
      "Nominal £",
      "Homes bought by first-time buyers",
      d.firstTimeBuyer,
    ),
    ...d.cashMortgage.map((line) =>
      row(line.id, line.label, "England", "Nominal £", "Homes bought with that finance", line.points),
    ),
    row(
      "sales-volume",
      "Sales volume",
      "United Kingdom",
      "Transactions",
      "Monthly count in the UK House Price Index",
      d.sales,
    ),
  ];
  return rows.filter((item): item is PriceRow => item !== null);
}

function span(points: Pt[]): string {
  const first = points[0];
  const end = points[points.length - 1];
  if (!first || !end) return "—";
  return `${fmtT(first.t)} – ${fmtT(end.t)}`;
}

export function PricesData({ data }: { data: HousingV1 }) {
  const rows = priceCatalogue(data);
  return (
    <div>
      <div className={`${t.tableWrap} ${s.dataTable}`}>
      <table className={t.table} aria-label="Price series loaded for this page">
        <thead>
          <tr>
            <th scope="col">Series</th>
            <th scope="col">Place</th>
            <th scope="col">Basis</th>
            <th scope="col">Coverage</th>
            <th scope="col">Latest</th>
            <th scope="col">Purpose</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((item) => {
            const end = item.points[item.points.length - 1]!;
            const value = item.basis === "Transactions" ? fmt.count(end.v) : fmt.gbp(end.v);
            return (
              <tr key={item.id}>
                <th scope="row">{item.series}</th>
                <td>{item.place}</td>
                <td>{item.basis}</td>
                <td>{span(item.points)}</td>
                <td>
                  {value}
                  <span className="bo-label"> {fmtT(end.t)}</span>
                </td>
                <td>{item.purpose}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      </div>
    </div>
  );
}
