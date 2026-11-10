"use client";

/**
 * The body of every Renting view except the map.
 * Social-rent breakdown lives in HousingExplorer. Method lives in Notes.
 */

import type { ReactNode } from "react";
import { EmptyStage, explorerClasses as t } from "../../..";
import { TimeChart } from "../../../instrument/TimeChart";
import { fmt, fmtT, type Pt } from "../../../data";
import type { HousingV1 } from "../../load";
import gen from "../../../energy/generation.module.css";
import s from "../explorer.module.css";
import {
  columnHeader,
  formatRent,
  indexBaseline,
  type RentColumn,
  type RentFigure,
  type RentFocus,
} from "./selection";

export const LETTINGS_BREAKDOWN_OPTIONS: {
  value: "history" | "rent" | "needs";
  label: string;
}[] = [
  { value: "history", label: "Annual lettings" },
  { value: "rent", label: "Rent type" },
  { value: "needs", label: "Housing needs type" },
];

export type LettingsDisplay = "history" | "rent" | "needs" | "data";

export function lettingsFoot(display: LettingsDisplay): {
  definition: string;
  method: string[];
  source: string;
  dataHref: string;
} {
  const definition =
    display === "needs"
      ? "General needs: housing not designated for a specific group requiring support. Supported housing: facilities or features for a group requiring support. Neither describes tenancy length or security."
      : display === "rent"
        ? "Social rent, affordable rent and intermediate rent are three ways of charging for the same new lettings. They are not monthly rents in pounds."
        : display === "data"
          ? "New social housing lettings in England, financial years April to March. Rent type and needs type are separate breakdowns of the same total."
          : "Counts are new lettings, not unique households, newly built homes or private tenancy starts. Existing homes can be relet.";
  return {
    definition,
    method: [
      "Financial years run April to March.",
      "The exact values for every year sit in the closed table under the chart.",
    ],
    source: "MHCLG · Social housing lettings in England · CORE",
    dataHref: "/data#social-housing-lettings",
  };
}

export function rentDataFoot(placeName: string): {
  definition: string;
  method: string[];
  source: string;
  dataHref: string;
} {
  return {
    definition: `Private rent observations for ${placeName} on this domain. Index, change and bedroom series are not the same unit as a pounds-per-month average.`,
    method: [
      "The table follows the places, property type and period set in the controls.",
      "Official Price Index of Private Rents — not an advertised asking rent.",
    ],
    source: "ONS · Price Index of Private Rents",
    dataHref: "/data#private-rental-prices",
  };
}

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
}: {
  view: string;
  lettingsView?: LettingsDisplay;
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
    return <LettingsView insecurity={insecurity} display={lettingsView} />;
  }

  if (loading) {
    return <EmptyStage label="Loading">Fetching private rents…</EmptyStage>;
  }
  if (error) {
    return <EmptyStage label="Unavailable">{error}</EmptyStage>;
  }

  if (view === "table") {
    if (emptyReason && table.length === 0) {
      return <EmptyStage label="In preparation">{emptyReason}</EmptyStage>;
    }
    return (
      <div className={gen.stack}>
        <section className={gen.panel}>
          <h3 className={t.stageTitle}>Private rents · {placeName}</h3>
          {emptyReason ? <p className={t.tableNote}>{emptyReason}</p> : null}
          <RentTable columns={table} baseline={baseline} />
        </section>
      </div>
    );
  }

  const chartFormat = (value: number) => formatRent(plotted[0]?.measure ?? "average-rent", value);
  const axisFormat = plotted[0]?.measure === "average-rent" ? (value: number) => fmt.gbpCompact(value) : chartFormat;

  if (emptyReason || plotted.length === 0) {
    return <EmptyStage label="Nothing to plot">{emptyReason ?? "Nothing to plot for this selection."}</EmptyStage>;
  }

  return (
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
          <dt>
            <span className={s.needsSolid} aria-hidden="true" /> General needs · {share(general)}
          </dt>
          <dd className="bo-fig">{fmt.count(general)}</dd>
        </div>
        <div>
          <dt>
            <span className={s.needsDots} aria-hidden="true" /> Supported housing · {share(supported)}
          </dt>
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
      <div className={t.tableWrap}>
        <table className={`${t.table} ${s.lettingsTable}`} aria-label="New social housing lettings in England">
          <thead>
            <tr>
              {[
                "Financial year",
                "New lettings",
                "General needs",
                "Supported housing",
                "Social rent",
                "Affordable rent",
                "Intermediate rent",
              ].map((name) => (
                <th scope="col" key={name}>
                  {name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[...rows].reverse().map((row) => (
              <tr key={row.t}>
                <th scope="row">{financialYear(row.t)}</th>
                {[row.total, row.generalNeeds, row.supported, row.social, row.affordable, row.intermediate].map(
                  (value, i) => (
                    <td key={i}>{fmt.count(value)}</td>
                  ),
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}

function LettingsView({
  insecurity,
  display,
}: {
  insecurity: HousingV1["insecurity"];
  display: LettingsDisplay;
}) {
  const rows = [...insecurity.lettingsBreakdown].sort((a, b) => a.t - b.t);
  const financialYear = (year: number) => `${Math.floor(year)}–${String(Math.floor(year) + 1).slice(-2)}`;
  const latest = rows[rows.length - 1];
  // Older links used lettings=data. That table now sits under the figure, open.
  const breakdown = display === "data" ? "history" : display;

  let figure: ReactNode;
  let title: string;
  if (rows.length === 0 || !latest) {
    title = "New social housing lettings · England";
    figure = (
      <EmptyStage label="In preparation">Social housing lettings are not loaded. No estimated figures.</EmptyStage>
    );
  } else if (breakdown === "rent") {
    title = "New social lettings by rent type · England";
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
    title = `New lettings by housing needs type · England · ${financialYear(latest.t)}`;
    figure = (
      <NeedsSplit
        general={latest.generalNeeds}
        supported={latest.supported}
        year={financialYear(latest.t)}
      />
    );
  } else {
    title = "New social housing lettings · England";
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
    <div className={gen.stack}>
      <section className={gen.panel}>
        <h3 className={t.stageTitle}>{title}</h3>
        {figure}
      </section>
      {rows.length > 0 ? <LettingsYears rows={rows} financialYear={financialYear} open={display === "data"} /> : null}
    </div>
  );
}

export type { RentFigure };
