/**
 * Prices → Data. One row per series already drawn on the other Prices tabs.
 * Coverage, geography and basis come from the loaded points, not from fixed dates.
 */

import { EmptyStage, explorerClasses as t } from "../..";
import { fmt, fmtT, type Pt } from "../../data";
import type { HousingV1 } from "../load";
import gen from "../../energy/generation.module.css";

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

export function pricesDataFoot(data: HousingV1): {
  definition: string;
  method: string[];
  source: string;
  dataHref: string;
} {
  return {
    definition:
      "Each row is a series already used on this domain. Nominal pounds, CPI-adjusted pounds and transaction counts are not the same unit.",
    method: [
      "Nominal means pounds of that month, with no adjustment for inflation. The CPI-adjusted row is an Exchange calculation.",
      "A gap between two rows is not the premium for an otherwise identical home.",
      data.pricePaid.available
        ? `Recorded-sales search is not in this table. It is HM Land Registry Price Paid${data.pricePaid.year != null ? ` · calendar year ${data.pricePaid.year}` : ""}.`
        : "Recorded-sales search is not in this table. Search is not available on this copy.",
    ],
    source: "HM Land Registry · UK House Price Index · ONS CPI",
    dataHref: "/data#uk-average-house-price",
  };
}

export function pricesTransactionsFoot(data: HousingV1): {
  definition: string;
  method: string[];
  source: string;
  dataHref: string;
} {
  const volume = (() => {
    const sales = data.sales[data.sales.length - 1];
    if (!sales) {
      return "The UK House Price Index sales-volume series is not loaded. It is separate from recorded-sales search.";
    }
    return "A count of transactions in the index, not a sum of Price Paid search results.";
  })();
  return {
    definition:
      "Recorded sales are one sale lodged with HM Land Registry. The monthly count is the UK House Price Index sales volume — a different series.",
    method: [
      "A recorded price is for that property, not an estimate and not the monthly UK index.",
      volume,
      data.pricePaid.available
        ? `Price Paid search covers England and Wales${data.pricePaid.year != null ? ` · calendar year ${data.pricePaid.year}` : ""}.`
        : "Recorded-sales search is not available on this copy.",
    ],
    source: "HM Land Registry · Price Paid · UK House Price Index sales volume",
    dataHref: "/data#uk-average-house-price",
  };
}

export function PricesData({ data }: { data: HousingV1 }) {
  const rows = priceCatalogue(data);

  if (rows.length === 0) {
    return (
      <EmptyStage label="In preparation">Price series are not loaded yet. No estimated figures.</EmptyStage>
    );
  }

  return (
    <div className={gen.stack}>
      <section className={gen.panel}>
        <h3 className={t.stageTitle}>Price series on this page</h3>
        <div className={t.tableWrap}>
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
      </section>
    </div>
  );
}
