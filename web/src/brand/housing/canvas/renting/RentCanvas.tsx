"use client";

/**
 * The body of every Renting view except the map.
 * The chart draws the selected place and period. The file is on the data page.
 */

import type { ReactNode } from "react";
import { TimeChart } from "../../../instrument/TimeChart";
import { fmt, fmtT, type Pt } from "../../../data";
import { ControlRow, MenuControl, explorerClasses as t } from "../../..";
import type { HousingV1 } from "../../load";
import s from "../explorer.module.css";
import {
  columnHeader,
  formatRent,
  indexBaseline,
  type RentColumn,
  type RentFigure,
  type RentFocus,
} from "./selection";

export function RentCanvas({
  view,
  placeName,
  focus,
  unit,
  plotted,
  table,
  emptyReason,
  loading,
  error,
  insecurity,
  lettingsView = "history",
  onLettings,
}: {
  view: string;
  lettingsView?: "history" | "rent" | "needs" | "data";
  /** Annual lettings, rent type, or housing needs. Data is the domain tab, not a choice here. */
  onLettings?: (value: "history" | "rent" | "needs") => void;
  placeName: string;
  focus: RentFocus;
  unit: string | undefined;
  /** Points inside the selected period, for the chart and the on-screen table. */
  plotted: RentColumn[];
  table: RentColumn[];
  emptyReason: string | null;
  loading: boolean;
  error: string;
  insecurity: HousingV1["insecurity"];
}) {
  const baseline = indexBaseline(unit);

  if (view === "tenancies") {
    return <LettingsView insecurity={insecurity} display={lettingsView} onBreakdown={onLettings} />;
  }

  if (loading) {
    return <p className={s.pricePaidLead}>Loading private rents…</p>;
  }
  if (error) {
    return <p className={s.pricePaidLead}>{error}</p>;
  }

  if (view === "table") {
    return (
      <div className={s.tableSlot}>
        {emptyReason ? <p className={s.pricePaidLead}>{emptyReason}</p> : null}
        <RentTable columns={table} baseline={baseline} />
      </div>
    );
  }

  const chartFormat = (value: number) => formatRent(plotted[0]?.measure ?? "average-rent", value);
  const axisFormat = plotted[0]?.measure === "average-rent" ? (value: number) => fmt.gbpCompact(value) : chartFormat;

  return (
    <>
      {emptyReason || plotted.length === 0 ? (
        <p className={s.pricePaidLead}>{emptyReason ?? "Nothing to plot for this selection."}</p>
      ) : (
        <TimeChart
          series={plotted.map((col) => ({ id: col.id, label: col.label, points: col.points }))}
          cadence="monthly"
          format={chartFormat}
          axisFormat={axisFormat}
          zero={plotted[0]?.measure === "annual-change"}
          height={380}
          label={
            focus === "index" && baseline
              ? `Private rental price index, ${placeName}. Baseline ${baseline}.`
              : `Private rents, ${placeName}`
          }
        />
      )}
    </>
  );
}

function RentTable({
  columns,
  baseline,
}: {
  columns: RentColumn[];
  baseline: string | null;
}) {
  const times = [...new Set(columns.flatMap((col) => col.points.map((p) => p.t)))].sort((a, b) => b - a);
  const lookups = columns.map((col) => new Map(col.points.map((p) => [p.t, p])));
  return (
    <div className={t.tableWrap}>
      <table className={t.table}>
        <thead>
          <tr>
            <th scope="col">Period</th>
            {columns.map((col) => (
              <th key={col.id} scope="col">
                {columnHeader(col, baseline)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {times.map((t) => (
            <tr key={t}>
              <th scope="row">{fmtT(t)}</th>
              {lookups.map((lookup, index) => {
                const point = lookup.get(t);
                const col = columns[index]!;
                return <td key={col.id}>{point ? formatRent(col.measure, point.v) : "—"}</td>;
              })}
            </tr>
          ))}
        </tbody>
      </table>
      {times.length === 0 && <p className={t.tableNote}>No observations in this period.</p>}
    </div>
  );
}

function lettingsSeries(rows: HousingV1["insecurity"]["lettingsBreakdown"]): { id: string; label: string; points: Pt[] }[] {
  const point = (pick: (row: (typeof rows)[number]) => number) =>
    rows.map((row) => ({ t: row.t, v: pick(row) }));
  return [
    { id: "social", label: "Social rent", points: point((row) => row.social) },
    { id: "affordable", label: "Affordable rent", points: point((row) => row.affordable) },
    { id: "intermediate", label: "Intermediate rent", points: point((row) => row.intermediate) },
  ];
}

/** One bar, two parts of the same lettings total. Solid ink is general needs; dots are supported housing. */
function NeedsSplit({ general, supported, year }: { general: number; supported: number; year: string }) {
  const share = (part: number) => `${((part / (general + supported)) * 100).toFixed(1)}%`;
  return (
    <figure className={s.needsSplit} aria-label={`New social lettings by needs type, England, ${year}`}>
      <div className={s.needsTrack}>
        <span className={s.needsSolid} style={{ flexGrow: general }} />
        <span className={s.needsDots} style={{ flexGrow: supported }} />
      </div>
      <dl className={s.needsKey}>
        <div>
          <dt><span className={s.needsSolid} aria-hidden="true" /> General needs · {share(general)}</dt>
          <dd className="bo-fig">{fmt.count(general)}</dd>
        </div>
        <div>
          <dt><span className={s.needsDots} aria-hidden="true" /> Supported housing · {share(supported)}</dt>
          <dd className="bo-fig">{fmt.count(supported)}</dd>
        </div>
      </dl>
    </figure>
  );
}

function LettingsYears({
  rows,
  financialYear,
  open,
}: {
  rows: HousingV1["insecurity"]["lettingsBreakdown"];
  financialYear: (year: number) => string;
  open: boolean;
}) {
  return (
    <details className={s.lettingsYears} {...(open ? { open: true } : {})}>
      <summary className="bo-disclosure">All years as a table</summary>
      <div className={s.tableSlot}>
        <div className={t.tableWrap}>
          <table className={`${t.table} ${s.lettingsTable}`} aria-label="New social housing lettings in England">
            <thead>
              <tr>
                {["Financial year", "New lettings", "General needs", "Supported housing", "Social rent", "Affordable rent", "Intermediate rent"].map((name) => (
                  <th scope="col" key={name}>{name}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...rows].reverse().map((row) => (
                <tr key={row.t}>
                  <th scope="row">{financialYear(row.t)}</th>
                  {[row.total, row.generalNeeds, row.supported, row.social, row.affordable, row.intermediate].map((value, i) => (
                    <td key={i}>{fmt.count(value)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </details>
  );
}

function LettingsView({
  insecurity,
  display,
  onBreakdown,
}: {
  insecurity: HousingV1["insecurity"];
  display: "history" | "rent" | "needs" | "data";
  onBreakdown?: (value: "history" | "rent" | "needs") => void;
}) {
  const rows = [...insecurity.lettingsBreakdown].sort((a, b) => a.t - b.t);
  const financialYear = (year: number) => `${Math.floor(year)}–${String(Math.floor(year) + 1).slice(-2)}`;
  const latest = rows[rows.length - 1];
  // Older links used lettings=data. That table now sits under the figure, open.
  const breakdown = display === "data" ? "history" : display;

  let figure: ReactNode;
  if (rows.length === 0 || !latest) {
    figure = <p className={s.pricePaidLead}>Social housing lettings are not loaded.</p>;
  } else if (breakdown === "rent") {
    figure = (
      <TimeChart
        series={lettingsSeries(rows)}
        cadence="annual"
        periodLabel={financialYear}
        format={fmt.count}
        axisFormat={fmt.countCompact}
        height={380}
        label="New social housing lettings in England by rent type"
      />
    );
  } else if (breakdown === "needs") {
    figure = (
      <NeedsSplit
        general={latest.generalNeeds}
        supported={latest.supported}
        year={financialYear(latest.t)}
      />
    );
  } else {
    figure = (
      <TimeChart
        series={[{ id: "lettings", label: "New lettings", points: rows.map((row) => ({ t: row.t, v: row.total })) }]}
        cadence="annual"
        periodLabel={financialYear}
        kind="bars"
        format={fmt.count}
        axisFormat={fmt.countCompact}
        height={380}
        label="New social housing lettings in England"
      />
    );
  }

  return (
    <>
      <ControlRow label="Social rent breakdown">
        <MenuControl
          label="Breakdown"
          value={breakdown}
          options={[
            { value: "history", label: "Annual lettings" },
            { value: "rent", label: "Rent type" },
            { value: "needs", label: "Housing needs type" },
          ]}
          onChange={(value) => onBreakdown?.(value)}
        />
      </ControlRow>
      {figure}
      {rows.length > 0 ? <LettingsYears rows={rows} financialYear={financialYear} open={display === "data"} /> : null}
    </>
  );
}

export type { RentFigure };
