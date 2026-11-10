"use client";

/**
 * Land → Data.
 * Annual Green Belt, the 2022 land-use snapshot, quarterly planning totals,
 * and the brownfield register are separate series. They are not one timeline.
 */

import { useId } from "react";
import { EmptyStage, explorerClasses as t } from "../../..";
import { fmt, fmtT, type Pt } from "../../../data";
import type { HousingV1 } from "../../load";
import gen from "../../../energy/generation.module.css";

function count(v: number | undefined | null): string {
  return v == null ? "—" : fmt.count(v);
}

export function landDataFoot(): {
  definition: string;
  method: string[];
  source: string;
} {
  return {
    definition:
      "Each table is one dataset at its own frequency. A Green Belt year is not quarter 1 of the planning table.",
    method: [
      "Green Belt is the designated area at 31 March, from the official annual series — not a historic map of the boundary.",
      "Land use is one year (Table P400a). These shares are not quarterly observations.",
      "Received, decided and granted in the same quarter are separate totals, not one set of applications.",
      "The brownfield dwelling sum uses only sites that publish a maximum. A blank cell is missing, not zero. Registration is not a deliverable home.",
    ],
    source: "MHCLG · Green Belt · land use · P120 · Planning Data brownfield",
  };
}

export function LandData({ data }: { data: HousingV1 }) {
  const greenBelt = [...data.greenBelt].sort((a, b) => b.t - a.t);
  const planningYears = [
    ...new Set([
      ...data.planningFlow.received.map((p) => p.t),
      ...data.planningFlow.decided.map((p) => p.t),
      ...data.planningFlow.granted.map((p) => p.t),
    ]),
  ].sort((a, b) => b - a);
  const at = (points: Pt[], time: number) => points.find((p) => Math.abs(p.t - time) < 1e-6)?.v;
  const brownfield = data.brownfield;
  const titleId = useId();
  const missingCapacity =
    brownfield.siteCount != null && brownfield.sitesWithEstimate != null
      ? brownfield.siteCount - brownfield.sitesWithEstimate
      : null;

  if (
    greenBelt.length === 0 &&
    planningYears.length === 0 &&
    data.landUseShares.length === 0 &&
    brownfield.siteCount == null
  ) {
    return (
      <EmptyStage label="In preparation">
        Land series are not loaded yet. No estimated figures.
      </EmptyStage>
    );
  }

  return (
    <div className={gen.stack}>
      {greenBelt.length > 0 && (
        <div className={t.tableGroup}>
          <p className={t.stageTitle} id={`${titleId}-belt`}>
            Green Belt area · England · hectares at 31 March
          </p>
          <div className={t.tableWrap}>
            <table className={t.table} aria-labelledby={`${titleId}-belt`}>
              <thead>
                <tr>
                  <th scope="col">31 March</th>
                  <th scope="col">Hectares</th>
                </tr>
              </thead>
              <tbody>
                {greenBelt.map((point) => (
                  <tr key={point.t}>
                    <th scope="row">{fmtT(point.t, "annual")}</th>
                    <td>{fmt.count(point.v)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {data.landUseShares.length > 0 && (
        <div className={t.tableGroup}>
          <p className={t.stageTitle} id={`${titleId}-use`}>
            Share of land area by use · England · 2022
          </p>
          <div className={t.tableWrap}>
            <table className={t.table} aria-labelledby={`${titleId}-use`}>
              <thead>
                <tr>
                  <th scope="col">Use</th>
                  <th scope="col">Share</th>
                </tr>
              </thead>
              <tbody>
                {data.landUseShares
                  .filter((row) => row.points[0])
                  .map((row) => (
                    <tr key={row.id}>
                      <th scope="row">{row.label}</th>
                      <td>{fmt.pct(row.points[0]!.v)}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {planningYears.length > 0 && (
        <div className={t.tableGroup}>
          <p className={t.stageTitle} id={`${titleId}-planning`}>
            Planning applications · England · quarterly
          </p>
          <div className={t.tableWrap}>
            <table className={t.table} aria-labelledby={`${titleId}-planning`}>
              <thead>
                <tr>
                  <th scope="col">Quarter</th>
                  <th scope="col">Received</th>
                  <th scope="col">Decided</th>
                  <th scope="col">Granted</th>
                </tr>
              </thead>
              <tbody>
                {planningYears.slice(0, 24).map((time) => (
                  <tr key={time}>
                    <th scope="row">{fmtT(time, "quarterly")}</th>
                    <td>{count(at(data.planningFlow.received, time))}</td>
                    <td>{count(at(data.planningFlow.decided, time))}</td>
                    <td>{count(at(data.planningFlow.granted, time))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {brownfield.siteCount != null && (
        <div className={t.tableGroup}>
          <p className={t.stageTitle} id={`${titleId}-sites`}>
            Brownfield register · England · snapshot
          </p>
          <div className={t.tableWrap}>
            <table className={t.table} aria-labelledby={`${titleId}-sites`}>
              <thead>
                <tr>
                  <th scope="col">Measure</th>
                  <th scope="col">Value</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <th scope="row">Sites</th>
                  <td>{count(brownfield.siteCount)}</td>
                </tr>
                <tr>
                  <th scope="row">Hectares</th>
                  <td>{brownfield.hectares == null ? "—" : fmt.count(brownfield.hectares)}</td>
                </tr>
                <tr>
                  <th scope="row">Published maximum, summed</th>
                  <td>{count(brownfield.maxDwellings)}</td>
                </tr>
                <tr>
                  <th scope="row">Sites with a published maximum</th>
                  <td>{count(brownfield.sitesWithEstimate)}</td>
                </tr>
                <tr>
                  <th scope="row">Sites with no published maximum</th>
                  <td>{count(missingCapacity)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
