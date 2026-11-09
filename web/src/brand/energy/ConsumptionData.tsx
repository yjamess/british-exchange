"use client";

/**
 * Energy Consumption · Data tab.
 * Housing Stock/Land Data pattern: stageTitle + tableWrap, no catalogue index.
 * Unit lives in the title; cells are figures only (not “437 ktoe” in Archivo).
 */

import { useId } from "react";
import { EmptyStage, explorerClasses as t } from "../template";
import {
  FLOW_STAGES,
  SECTORS,
  geographyRankRows,
  noteMap,
  yearsOf,
  type ConsumptionPack,
} from "./consumption-model";
import s from "./generation.module.css";

export type ConsumptionDataSeries =
  | "c1"
  | "w1"
  | "u3"
  | "cross"
  | "geography";

export const CONSUMPTION_DATA_SERIES: { id: ConsumptionDataSeries; label: string }[] = [
  { id: "c1", label: "Final consumption (C1)" },
  { id: "w1", label: "Primary allocation (W1)" },
  { id: "u3", label: "Domestic end use (U3)" },
  { id: "cross", label: "Cross-sector end use" },
  { id: "geography", label: "Subnational geography" },
];

function yearOf(periodStart: string): number {
  return Number(periodStart.slice(0, 4));
}

/** Table cell figure — number only; unit belongs in the stage title. */
function fig(v: number | null | undefined, digits = 1): string {
  if (v == null || !Number.isFinite(v)) return "—";
  return v.toLocaleString("en-GB", {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  });
}

const GEO_SECTOR_LABEL: Record<string, string> = {
  all: "total",
  domestic: "domestic",
  transport: "transport",
  "industry-commercial": "industry & commercial",
};

export function ConsumptionData({
  pack,
  series,
  year,
  geoSector,
}: {
  pack: ConsumptionPack;
  series: ConsumptionDataSeries;
  year: number;
  geoSector: "all" | "domestic" | "transport" | "industry-commercial";
}) {
  return (
    <div className={s.stack}>
      {series === "c1" && <C1Table pack={pack} />}
      {series === "w1" && <W1Table pack={pack} />}
      {series === "u3" && <EndUseTable pack={pack} />}
      {series === "cross" && <CrossTable pack={pack} />}
      {series === "geography" && (
        <GeographyTable pack={pack} year={year} geoSector={geoSector} />
      )}
    </div>
  );
}

function C1Table({ pack }: { pack: ConsumptionPack }) {
  const titleId = useId();
  const rows = pack.final?.observations ?? [];
  if (!rows.length) {
    return (
      <EmptyStage label="C1 series unavailable">
        Final energy consumption by sector did not load.
      </EmptyStage>
    );
  }
  const years = [...yearsOf(rows)].reverse();
  const sectors = SECTORS.filter((s) => s.stack || s.id === "all-final");
  const byKey = new Map<string, number>();
  for (const r of rows) {
    const n = noteMap(r.notes);
    if (n.fuel !== "Total" || typeof r.value !== "number") continue;
    byKey.set(`${yearOf(r.period_start)}|${n.sector}`, r.value);
  }
  return (
    <div className={t.tableGroup}>
      <p className={t.stageTitle} id={titleId}>
        Final consumption by sector · fuel=Total · ktoe
      </p>
      <div className={t.tableWrap}>
        <table className={t.table} aria-labelledby={titleId}>
          <thead>
            <tr>
              <th scope="col">Year</th>
              {sectors.map((sec) => (
                <th key={sec.id} scope="col">
                  {sec.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {years.map((yr) => (
              <tr key={yr}>
                <th scope="row">{yr}</th>
                {sectors.map((sec) => {
                  const v = byKey.get(`${yr}|${sec.id}`);
                  return <td key={sec.id}>{v == null ? "—" : fig(v, 0)}</td>;
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function W1Table({ pack }: { pack: ConsumptionPack }) {
  const titleId = useId();
  const rows = pack.flow?.observations ?? [];
  if (!rows.length) {
    return (
      <EmptyStage label="W1 series unavailable">
        Primary energy flow allocation did not load.
      </EmptyStage>
    );
  }
  const years = [...yearsOf(rows)].reverse();
  const byKey = new Map<string, number>();
  for (const r of rows) {
    const n = noteMap(r.notes);
    if (!n.stage || typeof r.value !== "number") continue;
    byKey.set(`${yearOf(r.period_start)}|${n.stage}`, r.value);
  }
  return (
    <div className={t.tableGroup}>
      <p className={t.stageTitle} id={titleId}>
        Primary allocation · W1 stages · ktoe
      </p>
      <div className={t.tableWrap}>
        <table className={t.table} aria-labelledby={titleId}>
          <thead>
            <tr>
              <th scope="col">Year</th>
              {FLOW_STAGES.map((stage) => (
                <th key={stage} scope="col">
                  {stage}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {years.map((yr) => (
              <tr key={yr}>
                <th scope="row">{yr}</th>
                {FLOW_STAGES.map((stage) => {
                  const v = byKey.get(`${yr}|${stage}`);
                  return <td key={stage}>{v == null ? "—" : fig(v, 0)}</td>;
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function EndUseTable({ pack }: { pack: ConsumptionPack }) {
  const titleId = useId();
  const rows = pack.endUse?.observations ?? [];
  if (!rows.length) {
    return (
      <EmptyStage label="U3 series unavailable">Domestic end-use data did not load.</EmptyStage>
    );
  }
  const years = [...yearsOf(rows)].reverse();
  const endUses = [
    ...new Set(
      rows
        .map((r) => noteMap(r.notes).end_use)
        .filter((id): id is string => !!id && !/^total$/i.test(id)),
    ),
  ].sort((a, b) => a.localeCompare(b));
  const byKey = new Map<string, number>();
  for (const r of rows) {
    const n = noteMap(r.notes);
    if (n.fuel !== "Total" || !n.end_use || typeof r.value !== "number") continue;
    byKey.set(`${yearOf(r.period_start)}|${n.end_use}`, r.value);
  }
  return (
    <div className={t.tableGroup}>
      <p className={t.stageTitle} id={titleId}>
        Domestic end use · fuel=Total · ktoe
      </p>
      <div className={t.tableWrap}>
        <table className={t.table} aria-labelledby={titleId}>
          <thead>
            <tr>
              <th scope="col">Year</th>
              {endUses.map((eu) => (
                <th key={eu} scope="col">
                  {eu}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {years.map((yr) => (
              <tr key={yr}>
                <th scope="row">{yr}</th>
                {endUses.map((eu) => {
                  const v = byKey.get(`${yr}|${eu}`);
                  return <td key={eu}>{v == null ? "—" : fig(v, 0)}</td>;
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CrossTable({ pack }: { pack: ConsumptionPack }) {
  const titleId = useId();
  const rows = pack.crossEndUse?.observations ?? [];
  if (!rows.length) {
    return (
      <EmptyStage label="Cross-sector series unavailable">
        Cross-sector end-use data did not load.
      </EmptyStage>
    );
  }
  const years = [...yearsOf(rows)].reverse();
  const endUses = [
    ...new Set(
      rows
        .map((r) => noteMap(r.notes).end_use)
        .filter((id): id is string => !!id && !/^total$/i.test(id)),
    ),
  ].sort((a, b) => a.localeCompare(b));
  const byKey = new Map<string, number>();
  for (const r of rows) {
    const n = noteMap(r.notes);
    if (!n.end_use || /^total$/i.test(n.end_use) || typeof r.value !== "number") continue;
    if (n.fuel && n.fuel !== "Total") continue;
    const key = `${yearOf(r.period_start)}|${n.end_use}`;
    byKey.set(key, (byKey.get(key) ?? 0) + r.value);
  }
  return (
    <div className={t.tableGroup}>
      <p className={t.stageTitle} id={titleId}>
        Cross-sector end use · ktoe
      </p>
      <div className={t.tableWrap}>
        <table className={t.table} aria-labelledby={titleId}>
          <thead>
            <tr>
              <th scope="col">Year</th>
              {endUses.map((eu) => (
                <th key={eu} scope="col">
                  {eu}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {years.map((yr) => (
              <tr key={yr}>
                <th scope="row">{yr}</th>
                {endUses.map((eu) => {
                  const v = byKey.get(`${yr}|${eu}`);
                  return <td key={eu}>{v == null || v === 0 ? "—" : fig(v, 0)}</td>;
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function GeographyTable({
  pack,
  year,
  geoSector,
}: {
  pack: ConsumptionPack;
  year: number;
  geoSector: "all" | "domestic" | "transport" | "industry-commercial";
}) {
  const titleId = useId();
  const geo = pack.geography;
  if (!geo || geo.places.length === 0) {
    return (
      <EmptyStage label="Subnational geography unavailable">
        Run the subnational-final-consumption connector and refresh.
      </EmptyStage>
    );
  }
  const y = geo.years.includes(year) ? year : (geo.years.at(-1) ?? year);
  const sectorLabel = GEO_SECTOR_LABEL[geoSector] ?? geoSector;
  const ranks = geographyRankRows(geo.places, y, geoSector, null, false);
  const laTop = [...geo.authorities]
    .filter((p) => p.la !== "Unallocated")
    .map((p) => ({
      code: p.code,
      label: p.label,
      v: p.sectors[geoSector]?.[String(y)] ?? 0,
    }))
    .filter((r) => r.v > 0)
    .sort((a, b) => b.v - a.v)
    .slice(0, 40);

  return (
    <>
      <div className={t.tableGroup}>
        <p className={t.stageTitle} id={`${titleId}-regions`}>
          Nations and English regions · {sectorLabel} · {y} · ktoe
        </p>
        <div className={t.tableWrap}>
          <table className={t.table} aria-labelledby={`${titleId}-regions`}>
            <thead>
              <tr>
                <th scope="col">Place</th>
                <th scope="col">Code</th>
                <th scope="col">Total</th>
              </tr>
            </thead>
            <tbody>
              {ranks.map((r) => (
                <tr key={r.id}>
                  <th scope="row">{r.label}</th>
                  <td>{r.id}</td>
                  <td>{fig(r.v, 1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div className={t.tableGroup}>
        <p className={t.stageTitle} id={`${titleId}-la`}>
          Local authorities · {sectorLabel} · {y} · largest 40 · ktoe
        </p>
        <div className={t.tableWrap}>
          <table className={t.table} aria-labelledby={`${titleId}-la`}>
            <thead>
              <tr>
                <th scope="col">Authority</th>
                <th scope="col">Code</th>
                <th scope="col">Total</th>
              </tr>
            </thead>
            <tbody>
              {laTop.map((r) => (
                <tr key={r.code}>
                  <th scope="row">{r.label}</th>
                  <td>{r.code}</td>
                  <td>{fig(r.v, 1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
