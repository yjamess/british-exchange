"use client";

/**
 * Affordability → Data.
 * One table per measure already drawn on the other tabs. Each title is the
 * stage title of that tab. Method stays in the figure notes.
 */

import { useId } from "react";
import { EmptyStage, explorerClasses as t } from "../../..";
import { fmtFY, fmtT, type Pt } from "../../../data";
import type { HousingV1 } from "../../load";
import gen from "../../../energy/generation.module.css";

function yearRows(points: Pt[]): Map<number, number> {
  return new Map(points.map((p) => [Math.floor(p.t + 1e-6), p.v]));
}

export function affordabilityDataFoot(): {
  definition: string;
  method: string[];
  source: string;
  dataHref: string;
} {
  return {
    definition:
      "Each table is the series from one Affordability tab. A ratio, a rent share and a mortgage share are not the same unit.",
    method: [
      "England and Wales on the map is not the United Kingdom price.",
      "Purchase-affordability years are financial years, April to March.",
    ],
    source: "ONS · AFF1 · Housing purchase affordability · MHCLG English Housing Survey · derived rent-to-earnings",
    dataHref: "/data#house-price-to-earnings-ratio",
  };
}

export function AffordabilityData({ data }: { data: HousingV1 }) {
  const spread = data.affordSpread;
  const years = [
    ...new Set([
      ...data.afford.map((p) => Math.floor(p.t + 1e-6)),
      ...(spread?.lo.map((p) => Math.floor(p.t + 1e-6)) ?? []),
      ...(spread?.hi.map((p) => Math.floor(p.t + 1e-6)) ?? []),
    ]),
  ].sort((a, b) => b - a);
  const england = yearRows(data.afford);
  const lo = yearRows(spread?.lo ?? []);
  const hi = yearRows(spread?.hi ?? []);
  const ratio = (v: number | undefined) => (v == null ? "—" : `${v.toFixed(2)}×`);
  const latestEhs = data.ehsMortgageByAge?.years.at(-1);
  const titleId = useId();
  const ratioTitle = spread
    ? "House price to workplace earnings · England, within the spread of local authorities"
    : "House price to workplace-based earnings ratio";

  const hasAny =
    years.length > 0 ||
    costRows(data).length > 0 ||
    Boolean(latestEhs) ||
    data.rentToEarnings.length > 0 ||
    data.purchaseAffordRegions.length > 0;

  if (!hasAny) {
    return (
      <EmptyStage label="In preparation">
        Affordability series are not loaded yet. No estimated figures.
      </EmptyStage>
    );
  }

  return (
    <div className={gen.stack}>
      {years.length > 0 && (
        <section className={gen.panel}>
          <h3 className={t.stageTitle} id={`${titleId}-ratio`}>
            {ratioTitle}
          </h3>
          <div className={t.tableWrap}>
            <table className={t.table} aria-labelledby={`${titleId}-ratio`}>
              <thead>
                <tr>
                  <th scope="col">Year</th>
                  <th scope="col">England</th>
                  <th scope="col">Most affordable 10%</th>
                  <th scope="col">Least affordable 10%</th>
                </tr>
              </thead>
              <tbody>
                {years.map((year) => (
                  <tr key={year}>
                    <th scope="row">{year}</th>
                    <td>{ratio(england.get(year))}</td>
                    <td>{ratio(lo.get(year))}</td>
                    <td>{ratio(hi.get(year))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {costRows(data).length > 0 && (
        <section className={gen.panel}>
          <h3 className={t.stageTitle} id={`${titleId}-ages`}>
            Housing costs by age · England
          </h3>
          <div className={t.tableWrap}>
            <table className={t.table} aria-labelledby={`${titleId}-ages`}>
              <thead>
                <tr>
                  <th scope="col">Place</th>
                  <th scope="col">Age</th>
                  <th scope="col">Housing cost</th>
                  <th scope="col">Mean latest</th>
                  <th scope="col">Median latest</th>
                  <th scope="col">Mean earlier</th>
                </tr>
              </thead>
              <tbody>
                {costRows(data).map((row) => (
                  <tr key={`${row.place}-${row.age}-${row.tenure}`}>
                    <th scope="row">{row.place}</th>
                    <td>{row.age}</td>
                    <td>{row.tenure}</td>
                    <td>{pct(row.mean)}</td>
                    <td>{pct(row.median)}</td>
                    <td>{pct(row.earlier)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {latestEhs && (
        <section className={gen.panel}>
          <h3 className={t.stageTitle} id={`${titleId}-mortgage`}>
            Mortgage payment by age · England
          </h3>
          <div className={t.tableWrap}>
            <table className={t.table} aria-labelledby={`${titleId}-mortgage`}>
              <thead>
                <tr>
                  <th scope="col">Age</th>
                  <th scope="col">Mortgage as % of income</th>
                  <th scope="col">Mean £ / week</th>
                </tr>
              </thead>
              <tbody>
                {latestEhs.rows.map((row) => (
                  <tr key={row.age}>
                    <th scope="row">{row.age}</th>
                    <td>{row.incomeRatio == null ? "—" : `${row.incomeRatio}%`}</td>
                    <td>{row.meanWeekly == null ? "—" : row.meanWeekly.toLocaleString("en-GB")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {data.rentToEarnings.length > 0 && (
        <section className={gen.panel}>
          <h3 className={t.stageTitle} id={`${titleId}-rent`}>
            Private rent as a share of workplace earnings · England
          </h3>
          <div className={t.tableWrap}>
            <table className={t.table} aria-labelledby={`${titleId}-rent`}>
              <thead>
                <tr>
                  <th scope="col">Year</th>
                  <th scope="col">Rent as % of workplace earnings</th>
                </tr>
              </thead>
              <tbody>
                {[...data.rentToEarnings].reverse().map((point) => (
                  <tr key={point.t}>
                    <th scope="row">{fmtT(point.t, "annual")}</th>
                    <td>{(point.v * 100).toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {data.purchaseAffordRegions.length > 0 && (
        <section className={gen.panel}>
          <h3 className={t.stageTitle} id={`${titleId}-households`}>
            Who can afford Britain · household income versus house prices
          </h3>
          <div className={t.tableWrap}>
            <table className={t.table} aria-labelledby={`${titleId}-households`}>
              <thead>
                <tr>
                  <th scope="col">Place</th>
                  <th scope="col">First financial year</th>
                  <th scope="col">Latest financial year</th>
                </tr>
              </thead>
              <tbody>
                {data.purchaseAffordRegions.map((place) => {
                  const first = place.points[0];
                  const last = place.points.at(-1);
                  if (!first || !last) return null;
                  return (
                    <tr key={place.id}>
                      <th scope="row">{place.label}</th>
                      <td>
                        {first.v.toFixed(2)}× <span className="bo-label">{fmtFY(first.t)}</span>
                      </td>
                      <td>
                        {last.v.toFixed(2)}× <span className="bo-label">{fmtFY(last.t)}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}

const COST_PLACES = ["all households", "London", "England excluding London"] as const;
const COST_PLACE_LABEL: Record<string, string> = {
  "all households": "England",
  London: "London",
  "England excluding London": "Rest of England",
};
const COST_AGE_LABEL: Record<string, string> = {
  "16 to 34": "16–34",
  "65 and over": "65 and over",
};

function pct(value: number | null): string {
  return value == null ? "—" : `${value.toFixed(1)}%`;
}

function costRows(data: HousingV1): {
  place: string;
  age: string;
  tenure: string;
  mean: number | null;
  median: number | null;
  earlier: number | null;
}[] {
  const costs = data.ehsHousingCostsByAge;
  if (!costs) return [];
  return costs.cohorts.flatMap((cohort) =>
    COST_PLACES.flatMap((place) => {
      const row = cohort.rows.find((item) => item.place === place);
      if (!row) return [];
      return row.tenures.map((tenure) => ({
        place: COST_PLACE_LABEL[place] ?? place,
        age: COST_AGE_LABEL[cohort.age] ?? cohort.age,
        tenure: tenure.label,
        mean: tenure.latest.mean,
        median: tenure.latest.median,
        earlier: tenure.earlier.mean,
      }));
    }),
  );
}
