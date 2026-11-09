"use client";

/**
 * Oil, Gas & Fossil Fuels · Data tab.
 * Consumption / Housing pattern: Series control chooses one archive table.
 * Unit lives in the title; cells are figures only. Catalogue index stays in Notes.
 */

import { useId } from "react";
import { EmptyStage, explorerClasses as t } from "../template";
import {
  CRUDE_OIL_ID,
  DOMESTIC_GAS_ID,
  HISTORICAL_COAL_ID,
  NSTA_FIELD_PRODUCTION_ID,
  NSTA_FIELDS_ID,
  PRIMARY_PRODUCTION_ID,
  UK_RESERVES_ID,
  coalMtSeries,
  crudeOilSeries,
  fieldStartYear,
  fieldTimelines,
  gasAnnualSeries,
  offshoreFieldSumSeries,
  primaryFossilStack,
  reservesMeasureSeries,
  type FossilsPack,
} from "./fossils-model";
import s from "./generation.module.css";

export type FossilsDataSeries =
  | "crude"
  | "gas"
  | "coal"
  | "primary"
  | "fields"
  | "field-production"
  | "reserves";

export const FOSSILS_DATA_SERIES: { id: FossilsDataSeries; label: string; record: string }[] = [
  { id: "crude", label: "Crude oil", record: CRUDE_OIL_ID },
  { id: "gas", label: "Domestic gas", record: DOMESTIC_GAS_ID },
  { id: "coal", label: "Historical coal", record: HISTORICAL_COAL_ID },
  { id: "primary", label: "Primary fossil fuels", record: PRIMARY_PRODUCTION_ID },
  { id: "fields", label: "Offshore fields", record: NSTA_FIELDS_ID },
  { id: "field-production", label: "Field production sums", record: NSTA_FIELD_PRODUCTION_ID },
  { id: "reserves", label: "What's left (2P)", record: UK_RESERVES_ID },
];

function fig(v: number | null | undefined, digits = 1): string {
  if (v == null || !Number.isFinite(v)) return "—";
  return v.toLocaleString("en-GB", {
    maximumFractionDigits: digits,
    minimumFractionDigits: 0,
  });
}

function sentence(text: string): string {
  const l = text.toLowerCase();
  return l.charAt(0).toUpperCase() + l.slice(1);
}

export function FossilsData({ pack, series }: { pack: FossilsPack; series: FossilsDataSeries }) {
  const record = FOSSILS_DATA_SERIES.find((x) => x.id === series)?.record ?? CRUDE_OIL_ID;
  return (
    <div className={s.stack}>
      {series === "crude" && <CrudeTable pack={pack} />}
      {series === "gas" && <GasTable pack={pack} />}
      {series === "coal" && <CoalTable pack={pack} />}
      {series === "primary" && <PrimaryTable pack={pack} />}
      {series === "fields" && <FieldsTable pack={pack} />}
      {series === "field-production" && <FieldProductionTable pack={pack} />}
      {series === "reserves" && <ReservesTable pack={pack} />}
      <p className={s.links}>
        <a href={`/api/data/${record}`}>Download full CSV</a>
        {" · "}
        <a href={`/data?record=${record}`}>Catalogue record</a>
      </p>
    </div>
  );
}

function CrudeTable({ pack }: { pack: FossilsPack }) {
  const titleId = useId();
  const points = crudeOilSeries(pack.crude?.observations ?? []).points;
  if (!points.length) {
    return <EmptyStage label="Crude series unavailable">Indigenous crude oil did not load.</EmptyStage>;
  }
  return (
    <div className={t.tableGroup}>
      <p className={t.stageTitle} id={titleId}>
        Indigenous crude oil · Total · million tonnes
      </p>
      <div className={t.tableWrap}>
        <table className={t.table} aria-labelledby={titleId}>
          <thead>
            <tr>
              <th scope="col">Year</th>
              <th scope="col">Mt</th>
              <th scope="col">Status</th>
            </tr>
          </thead>
          <tbody>
            {[...points].reverse().map((p) => (
              <tr key={p.t}>
                <th scope="row">{p.t}</th>
                <td>{fig(p.v, 3)}</td>
                <td>{p.provisional ? "Provisional" : "Final"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function GasTable({ pack }: { pack: FossilsPack }) {
  const titleId = useId();
  const points = gasAnnualSeries(pack.gas?.observations ?? []).points;
  if (!points.length) {
    return <EmptyStage label="Gas series unavailable">Domestic gas production did not load.</EmptyStage>;
  }
  return (
    <div className={t.tableGroup}>
      <p className={t.stageTitle} id={titleId}>
        UK gas · calendar-year sum · bcm
      </p>
      <div className={t.tableWrap}>
        <table className={t.table} aria-labelledby={titleId}>
          <thead>
            <tr>
              <th scope="col">Year</th>
              <th scope="col">bcm</th>
              <th scope="col">Status</th>
            </tr>
          </thead>
          <tbody>
            {[...points].reverse().map((p) => (
              <tr key={p.t}>
                <th scope="row">{p.t}</th>
                <td>{fig(p.v, 2)}</td>
                <td>{p.provisional ? "Provisional" : "Final"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CoalTable({ pack }: { pack: FossilsPack }) {
  const titleId = useId();
  const points = coalMtSeries(pack.coal?.observations ?? []).points;
  if (!points.length) {
    return <EmptyStage label="Coal series unavailable">Historical coal production did not load.</EmptyStage>;
  }
  return (
    <div className={t.tableGroup}>
      <p className={t.stageTitle} id={titleId}>
        Historical coal · Total Output · million tonnes
      </p>
      <div className={t.tableWrap}>
        <table className={t.table} aria-labelledby={titleId}>
          <thead>
            <tr>
              <th scope="col">Year</th>
              <th scope="col">Mt</th>
              <th scope="col">Status</th>
            </tr>
          </thead>
          <tbody>
            {[...points].reverse().map((p) => (
              <tr key={p.t}>
                <th scope="row">{p.t}</th>
                <td>{fig(p.v, 2)}</td>
                <td>{p.provisional ? "Provisional" : "Final"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PrimaryTable({ pack }: { pack: FossilsPack }) {
  const titleId = useId();
  const stack = primaryFossilStack(pack.primary?.observations ?? []);
  const years = [...new Set(stack.flatMap((s) => s.points.map((p) => p.t)))].sort((a, b) => b - a);
  if (!years.length) {
    return <EmptyStage label="Primary series unavailable">Primary energy production did not load.</EmptyStage>;
  }
  const byId = new Map(stack.map((s) => [s.id, new Map(s.points.map((p) => [p.t, p]))]));
  return (
    <div className={t.tableGroup}>
      <p className={t.stageTitle} id={titleId}>
        Primary energy · Coal / Petroleum / Natural gas · Mtoe
      </p>
      <div className={t.tableWrap}>
        <table className={t.table} aria-labelledby={titleId}>
          <thead>
            <tr>
              <th scope="col">Year</th>
              {stack.map((s) => (
                <th key={s.id} scope="col">
                  {s.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {years.map((yr) => (
              <tr key={yr}>
                <th scope="row">{yr}</th>
                {stack.map((s) => {
                  const pt = byId.get(s.id)?.get(yr);
                  return <td key={s.id}>{pt ? fig(pt.v, 2) : "—"}</td>;
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function FieldsTable({ pack }: { pack: FossilsPack }) {
  const titleId = useId();
  const timelines = fieldTimelines(pack.fieldProduction);
  const rows = [...pack.fields].sort((a, b) => a.name.localeCompare(b.name));
  if (!rows.length) {
    return <EmptyStage label="Field register unavailable">NSTA offshore fields did not load.</EmptyStage>;
  }
  return (
    <div className={t.tableGroup}>
      <p className={t.stageTitle} id={titleId}>
        NSTA UKCS offshore fields · {rows.length.toLocaleString("en-GB")} · status today
      </p>
      <div className={t.tableWrap}>
        <table className={t.table} aria-labelledby={titleId}>
          <thead>
            <tr>
              <th scope="col">Field</th>
              <th scope="col">Type</th>
              <th scope="col">Status today</th>
              <th scope="col">Started</th>
              <th scope="col">Operator</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((f) => (
              <tr key={f.id}>
                <th scope="row">{sentence(f.name)}</th>
                <td>{f.fieldType || "—"}</td>
                <td>{sentence(f.status)}</td>
                <td>{fieldStartYear(f, timelines.get(f.name)) ?? "Not published"}</td>
                <td>{f.operator || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function FieldProductionTable({ pack }: { pack: FossilsPack }) {
  const titleId = useId();
  const oil = offshoreFieldSumSeries(pack.fieldProduction, "oil");
  const gas = offshoreFieldSumSeries(pack.fieldProduction, "gas");
  const years = [...new Set([...oil.points.map((p) => p.t), ...gas.points.map((p) => p.t)])].sort(
    (a, b) => b - a,
  );
  if (!years.length) {
    return (
      <EmptyStage label="Field production unavailable">NSTA field production sums did not load.</EmptyStage>
    );
  }
  const oilBy = new Map(oil.points.map((p) => [p.t, p]));
  const gasBy = new Map(gas.points.map((p) => [p.t, p]));
  return (
    <div className={t.tableGroup}>
      <p className={t.stageTitle} id={titleId}>
        Sum of offshore fields reporting · oil Mt · gas bcm · not a UK total
      </p>
      <div className={t.tableWrap}>
        <table className={t.table} aria-labelledby={titleId}>
          <thead>
            <tr>
              <th scope="col">Year</th>
              <th scope="col">Oil · Mt</th>
              <th scope="col">Gas · bcm</th>
            </tr>
          </thead>
          <tbody>
            {years.map((yr) => {
              const o = oilBy.get(yr);
              const g = gasBy.get(yr);
              return (
                <tr key={yr}>
                  <th scope="row">{yr}</th>
                  <td>{o ? fig(o.v, 2) : "—"}</td>
                  <td>{g ? fig(g.v, 2) : "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ReservesTable({ pack }: { pack: FossilsPack }) {
  const titleId = useId();
  const rows = pack.reserves?.observations ?? [];
  const oil2p = reservesMeasureSeries(rows, "oil_2p_mt");
  const oilEx = reservesMeasureSeries(rows, "oil_production_mt");
  const gas2p = reservesMeasureSeries(rows, "gas_2p_bcm");
  const years = [
    ...new Set([
      ...oil2p.points.map((p) => p.t),
      ...oilEx.points.map((p) => p.t),
      ...gas2p.points.map((p) => p.t),
    ]),
  ].sort((a, b) => b - a);
  if (!years.length) {
    return <EmptyStage label="Remaining estimates unavailable">UK oil and gas reserves did not load.</EmptyStage>;
  }
  const a = new Map(oil2p.points.map((p) => [p.t, p]));
  const b = new Map(oilEx.points.map((p) => [p.t, p]));
  const c = new Map(gas2p.points.map((p) => [p.t, p]));
  return (
    <div className={t.tableGroup}>
      <p className={t.stageTitle} id={titleId}>
        Still counted as 2P · beside oil extracted that year
      </p>
      <div className={t.tableWrap}>
        <table className={t.table} aria-labelledby={titleId}>
          <thead>
            <tr>
              <th scope="col">Year</th>
              <th scope="col">Oil 2P · Mt</th>
              <th scope="col">Oil extracted · Mt</th>
              <th scope="col">Gas 2P · bcm</th>
            </tr>
          </thead>
          <tbody>
            {years.map((yr) => (
              <tr key={yr}>
                <th scope="row">{yr}</th>
                <td>{a.get(yr) ? fig(a.get(yr)!.v, 2) : "—"}</td>
                <td>{b.get(yr) ? fig(b.get(yr)!.v, 2) : "—"}</td>
                <td>{c.get(yr) ? fig(c.get(yr)!.v, 2) : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
