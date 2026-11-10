"use client";

/**
 * Shared observation tables for Energy Data tabs.
 * Land / Fossils / Consumption pattern: stageTitle + tableWrap; unit in the title.
 * Catalogue links stay in the Stage Notes foot — not as the Data body.
 */

import { useId } from "react";
import { fmtT } from "../data";
import { EmptyStage, explorerClasses as t } from "../template";

export type SeriesPoint = { t: number; v: number };
type TableCadence = "monthly" | "quarterly" | "annual";

type AnnualTableProps = {
  title: string;
  /** Unit shown in the title only. */
  unit: string;
  points: SeriesPoint[];
  format?: (v: number) => string;
  emptyLabel?: string;
  /** How to print fractional brand time (default annual calendar year). */
  cadence?: TableCadence;
};

function defaultFig(v: number): string {
  return v.toLocaleString("en-GB", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  });
}

/** One series as a two-column archive table. */
export function AnnualSeriesTable({
  title,
  unit,
  points,
  format = defaultFig,
  emptyLabel = "Series unavailable",
  cadence = "annual",
}: AnnualTableProps) {
  const titleId = useId();
  const rows = [...points].sort((a, b) => b.t - a.t);
  if (!rows.length) {
    return <EmptyStage label={emptyLabel}>No observations loaded for this series.</EmptyStage>;
  }
  return (
    <div className={t.tableGroup}>
      <p className={t.stageTitle} id={titleId}>
        {title} · {unit}
      </p>
      <div className={t.tableWrap}>
        <table className={t.table} aria-labelledby={titleId}>
          <thead>
            <tr>
              <th scope="col">Period</th>
              <th scope="col">Value</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.t}>
                <th scope="row">{fmtT(p.t, cadence)}</th>
                <td>{format(p.v)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
