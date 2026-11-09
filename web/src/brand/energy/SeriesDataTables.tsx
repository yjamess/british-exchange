"use client";

/**
 * Shared observation tables for Energy Data tabs.
 * Land / Fossils / Consumption pattern: stageTitle + tableWrap; unit in the title.
 * Catalogue links stay in the Stage Notes foot — not as the Data body.
 */

import { useId } from "react";
import { EmptyStage, explorerClasses as t } from "../template";

export type SeriesPoint = { t: number; v: number };

type AnnualTableProps = {
  title: string;
  /** Unit shown in the title only. */
  unit: string;
  points: SeriesPoint[];
  format?: (v: number) => string;
  emptyLabel?: string;
};

function defaultFig(v: number): string {
  return v.toLocaleString("en-GB", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  });
}

/** One annual (or dated) series as a two-column archive table. */
export function AnnualSeriesTable({
  title,
  unit,
  points,
  format = defaultFig,
  emptyLabel = "Series unavailable",
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
                <th scope="row">{Number.isInteger(p.t) ? String(p.t) : p.t.toFixed(2)}</th>
                <td>{format(p.v)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
