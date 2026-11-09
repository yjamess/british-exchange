"use client";

/**
 * Land → Data.
 * Annual Green Belt, the 2022 land-use snapshot, quarterly planning totals,
 * and the brownfield register are separate series. They are not one timeline.
 */

import { useId } from "react";
import { fmt, fmtT, type Pt } from "../../../data";
import { explorerClasses as t } from "../../..";
import type { HousingV1 } from "../../load";
import s from "./land.module.css";

function count(v: number | undefined | null): string {
  return v == null ? "—" : fmt.count(v);
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

  return (
    <div className={s.root}>
      <p className={s.lede}>
        Each table is one dataset at its own frequency. Green Belt is a 31 March area. Planning
        applications are quarters. Land use and the brownfield register are snapshots. A Green Belt
        year is not quarter 1 of the planning table.
      </p>

      <div className={t.tableGroup}>
        <p className={t.stageTitle} id={`${titleId}-belt`}>
          The changing British landscape
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

      {data.landUseShares.length > 0 && (
        <div className={t.tableGroup}>
          <p className={t.stageTitle} id={`${titleId}-use`}>
            Share of land area by use, 2022
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

      <div className={t.tableGroup}>
        <p className={t.stageTitle} id={`${titleId}-planning`}>
          The Planning Decision Machine
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

      {brownfield.siteCount != null && (
        <div className={t.tableGroup}>
          <p className={t.stageTitle} id={`${titleId}-sites`}>
            Britain&apos;s development potential
          </p>
          <div className={t.tableWrap}>
            <table className={t.table} aria-labelledby={`${titleId}-sites`}>
              <thead>
                <tr>
                  <th scope="col">Sites</th>
                  <th scope="col">Hectares</th>
                  <th scope="col">Published maximum, summed</th>
                  <th scope="col">Sites with a published maximum</th>
                  <th scope="col">Sites with no published maximum</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>{count(brownfield.siteCount)}</td>
                  <td>{brownfield.hectares == null ? "—" : fmt.count(brownfield.hectares)}</td>
                  <td>{count(brownfield.maxDwellings)}</td>
                  <td>{count(brownfield.sitesWithEstimate)}</td>
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
