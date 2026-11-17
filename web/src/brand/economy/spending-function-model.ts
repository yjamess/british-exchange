/**
 * Where spending goes + DEL vs AME (+ real-terms siblings) — HMT PSS July 2026.
 *
 * tes-by-function (Table 5.4): TES / COFOG, £ million. Not monthly EBFT.
 * tes-by-function-real (Table 4.3): same story, £ billion, 2025-26 prices.
 * tme-del-ame (Table 1.1) / tme-del-ame-real (Table 1.2): DEL + AME = table TME.
 */

import type { Observation } from "@/lib/api";
import { toT, type Pt } from "../data";
import type { ChartSeries } from "../instrument/TimeChart";

export type SpendingMeasure = "absolute" | "share";

/** Published unit of the curated value before chart scaling to £bn. */
export type SpendingValueUnit = "million" | "billion";

export const SPENDING_MEASURE_OPTIONS: { value: SpendingMeasure; label: string }[] = [
  { value: "absolute", label: "Pounds" },
  { value: "share", label: "Share" },
];

export const REAL_INSTRUMENT_OPTIONS: { value: "delame" | "function"; label: string }[] = [
  { value: "delame", label: "DEL and AME" },
  { value: "function", label: "Services by function" },
];

/** Where spending goes — short Table 5.4 vs long-run Table 4.2. */
export const FUNCTION_SPAN_OPTIONS: { value: "recent" | "long"; label: string }[] = [
  { value: "recent", label: "Recent years" },
  { value: "long", label: "Long run" },
];

const ESA_ORDER = [
  "esa-gf01-general-public-services",
  "esa-gf02-defence",
  "esa-gf03-public-order-and-safety",
  "esa-gf04-economic-affairs",
  "esa-gf05-environmental-protection",
  "esa-gf06-housing-and-community",
  "esa-gf07-health",
  "esa-gf08-recreation",
  "esa-gf09-education",
  "esa-gf10-social-protection",
] as const;

export type FunctionRank = { id: string; label: string; v: number };

function toChartBn(raw: number, unit: SpendingValueUnit): number {
  return unit === "billion" ? raw : raw / 1000;
}

const COFOG_ORDER = [
  "cofog-01-general-public-services",
  "cofog-02-defence",
  "cofog-03-public-order-and-safety",
  "cofog-04-economic-affairs",
  "cofog-05-environment-protection",
  "cofog-06-housing-and-community-amenities",
  "cofog-07-health",
  "cofog-08-recreation-culture-and-religion",
  "cofog-09-education",
  "cofog-10-social-protection",
] as const;

const DEL_AME_ORDER = ["total-del", "departmental-ame", "other-ame"] as const;

function parseNotes(notes: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const part of (notes || "").split(";")) {
    const chunk = part.trim();
    if (!chunk || !chunk.includes("=")) continue;
    const i = chunk.indexOf("=");
    const key = chunk.slice(0, i).trim().toLowerCase();
    const value = chunk.slice(i + 1).trim();
    if (key && !(key in out)) out[key] = value;
  }
  return out;
}

/** Prefer final years; estimated (2025-26) is available but secondary. */
function valuedRows(rows: Observation[]): Observation[] {
  return rows.filter((r) => r.value != null && r.observation_status !== "missing");
}

function byFySeries(
  rows: Observation[],
): Map<string, Map<string, { current: number; capital: number; total: number; label: string; role: string }>> {
  const out = new Map<
    string,
    Map<string, { current: number; capital: number; total: number; label: string; role: string }>
  >();
  for (const row of valuedRows(rows)) {
    const n = parseNotes(row.notes);
    const fy = n.fy;
    const series = n.series;
    if (!fy || !series || row.value == null) continue;
    let yearMap = out.get(fy);
    if (!yearMap) {
      yearMap = new Map();
      out.set(fy, yearMap);
    }
    let cell = yearMap.get(series);
    if (!cell) {
      cell = {
        current: 0,
        capital: 0,
        total: 0,
        label: n.label || series,
        role: n.role || "",
      };
      yearMap.set(series, cell);
    }
    const v = row.value as number;
    const cls = n.classification || "";
    if (cls === "current") cell.current = v;
    else if (cls === "capital") cell.capital = v;
    else if (cls === "total") cell.total = v;
    else cell.total = v;
    if (n.label) cell.label = n.label;
    if (n.role) cell.role = n.role;
  }
  return out;
}

function functionTotal(
  cell: { current: number; capital: number; total: number } | undefined,
): number {
  if (!cell) return 0;
  // Table 5.4 stores current + capital; Table 4.3 stores a single total.
  if (cell.current !== 0 || cell.capital !== 0) return cell.current + cell.capital;
  return cell.total;
}

export function tesFinancialYears(rows: Observation[]): string[] {
  return [...byFySeries(rows).keys()].sort();
}

export function tesLatestFinalYear(rows: Observation[]): string | null {
  const finals = new Set(
    valuedRows(rows)
      .filter((r) => r.observation_status === "final")
      .map((r) => parseNotes(r.notes).fy)
      .filter(Boolean),
  );
  const years = [...finals].sort();
  return years.at(-1) ?? tesFinancialYears(rows).at(-1) ?? null;
}

/** Ten COFOG functions for one FY — current + capital (or published total), ranked high→low. */
export function tesFunctionRanks(
  rows: Observation[],
  fy: string,
  measure: SpendingMeasure,
  unit: SpendingValueUnit = "million",
): { ranks: FunctionRank[]; tesM: number; adjustmentsM: number; tableTmeM: number } | null {
  const yearMap = byFySeries(rows).get(fy);
  if (!yearMap) return null;
  const tesM = functionTotal(yearMap.get("tes-total"));
  const adjustmentsM = functionTotal(yearMap.get("accounting-adjustments"));
  const tableTmeM = functionTotal(yearMap.get("table-tme"));
  if (!tesM) return null;
  const ranks: FunctionRank[] = COFOG_ORDER.map((id) => {
    const cell = yearMap.get(id);
    const raw = functionTotal(cell);
    return {
      id,
      label: cell?.label ?? id,
      v: measure === "share" ? (raw / tesM) * 100 : toChartBn(raw, unit),
    };
  }).sort((a, b) => b.v - a.v);
  return { ranks, tesM, adjustmentsM, tableTmeM };
}

/** Stack history of the ten functions, £bn or % of published TES. */
export function tesFunctionStack(
  rows: Observation[],
  measure: SpendingMeasure,
  unit: SpendingValueUnit = "million",
): ChartSeries[] {
  const byFy = byFySeries(rows);
  const years = [...byFy.keys()].sort();
  return COFOG_ORDER.map((id) => {
    const points: Pt[] = [];
    for (const fy of years) {
      const yearMap = byFy.get(fy)!;
      const cell = yearMap.get(id);
      const raw = functionTotal(cell);
      const tesM = functionTotal(yearMap.get("tes-total"));
      if (!cell || !tesM) continue;
      // Mid financial year for axis (October of start year).
      const startY = Number(fy.slice(0, 4));
      const t = toT(`${startY}-10-01`);
      points.push({
        t,
        v: measure === "share" ? (raw / tesM) * 100 : toChartBn(raw, unit),
      });
    }
    const label = byFy.get(years[0]!)?.get(id)?.label ?? id;
    return { id, label, points };
  }).filter((s) => s.points.length > 0);
}

/** Services narrative bridge: TES · adjustments · table TME for one FY (nominal £m). */
export function tesServicesBridge(
  rows: Observation[],
  fy: string,
): { tesM: number; adjustmentsM: number; tableTmeM: number; ranks: FunctionRank[] } | null {
  const yearMap = byFySeries(rows).get(fy);
  if (!yearMap) return null;
  const tesM = functionTotal(yearMap.get("tes-total"));
  const adjustmentsM = functionTotal(yearMap.get("accounting-adjustments"));
  const tableTmeM = functionTotal(yearMap.get("table-tme"));
  if (!tesM || !tableTmeM) return null;
  return {
    tesM,
    adjustmentsM,
    tableTmeM,
    ranks: [
      { id: "tes-total", label: "Expenditure on services", v: tesM / 1000 },
      { id: "accounting-adjustments", label: "Accounting adjustments", v: adjustmentsM / 1000 },
      { id: "table-tme", label: "This table’s managed expenditure", v: tableTmeM / 1000 },
    ],
  };
}

export function delAmeFinancialYears(rows: Observation[]): string[] {
  const years = new Set(
    valuedRows(rows)
      .map((r) => parseNotes(r.notes).fy)
      .filter(Boolean),
  );
  return [...years].sort();
}

export function delAmeLatestFinalYear(rows: Observation[]): string | null {
  const finals = new Set(
    valuedRows(rows)
      .filter((r) => r.observation_status === "final")
      .map((r) => parseNotes(r.notes).fy)
      .filter(Boolean),
  );
  const years = [...finals].sort();
  return years.at(-1) ?? delAmeFinancialYears(rows).at(-1) ?? null;
}

function delAmeByFy(rows: Observation[]): Map<string, Map<string, { v: number; label: string }>> {
  const out = new Map<string, Map<string, { v: number; label: string }>>();
  for (const row of valuedRows(rows)) {
    const n = parseNotes(row.notes);
    const fy = n.fy;
    const series = n.series;
    if (!fy || !series || row.value == null) continue;
    let yearMap = out.get(fy);
    if (!yearMap) {
      yearMap = new Map();
      out.set(fy, yearMap);
    }
    yearMap.set(series, { v: row.value as number, label: n.label || series });
  }
  return out;
}

export function delAmeRanks(
  rows: Observation[],
  fy: string,
  measure: SpendingMeasure,
): { ranks: FunctionRank[]; tableTmeM: number } | null {
  const yearMap = delAmeByFy(rows).get(fy);
  if (!yearMap) return null;
  const tableTmeM = yearMap.get("table-tme")?.v ?? 0;
  if (!tableTmeM) return null;
  const ranks: FunctionRank[] = DEL_AME_ORDER.map((id) => {
    const cell = yearMap.get(id);
    const raw = cell?.v ?? 0;
    return {
      id,
      label: cell?.label ?? id,
      v: measure === "share" ? (raw / tableTmeM) * 100 : raw / 1000,
    };
  });
  return { ranks, tableTmeM };
}

export function delAmeStack(rows: Observation[], measure: SpendingMeasure): ChartSeries[] {
  const byFy = delAmeByFy(rows);
  const years = [...byFy.keys()].sort();
  return DEL_AME_ORDER.map((id) => {
    const points: Pt[] = [];
    for (const fy of years) {
      const yearMap = byFy.get(fy)!;
      const cell = yearMap.get(id);
      const tme = yearMap.get("table-tme")?.v ?? 0;
      if (!cell || !tme) continue;
      const startY = Number(fy.slice(0, 4));
      points.push({
        t: toT(`${startY}-10-01`),
        v: measure === "share" ? (cell.v / tme) * 100 : cell.v / 1000,
      });
    }
    const label = byFy.get(years[0]!)?.get(id)?.label ?? id;
    return { id, label, points };
  }).filter((s) => s.points.length > 0);
}

export function fmtSpendingBn(v: number): string {
  if (!Number.isFinite(v)) return "—";
  const abs = Math.abs(v);
  const body = abs >= 100 ? abs.toFixed(0) : abs.toFixed(1);
  return `${v < 0 ? "−" : ""}£${body}bn`;
}

export function fmtSpendingShare(v: number): string {
  if (!Number.isFinite(v)) return "—";
  const sign = v < 0 ? "−" : "";
  return `${sign}${Math.abs(v).toFixed(1)}%`;
}

/** ESA Table 11 — calendar year key as "2024". */
function esaByYear(
  rows: Observation[],
): Map<string, Map<string, { v: number; label: string }>> {
  const out = new Map<string, Map<string, { v: number; label: string }>>();
  for (const row of valuedRows(rows)) {
    const n = parseNotes(row.notes);
    const year = n.calendar_year || row.period_start.slice(0, 4);
    const series = n.series;
    if (!year || !series || row.value == null) continue;
    let yearMap = out.get(year);
    if (!yearMap) {
      yearMap = new Map();
      out.set(year, yearMap);
    }
    yearMap.set(series, { v: row.value as number, label: n.label || series });
  }
  return out;
}

export function esaCalendarYears(rows: Observation[]): string[] {
  return [...esaByYear(rows).keys()].sort();
}

export function esaLatestYear(rows: Observation[]): string | null {
  return esaCalendarYears(rows).at(-1) ?? null;
}

export function esaFunctionRanks(
  rows: Observation[],
  year: string,
  measure: SpendingMeasure,
): { ranks: FunctionRank[]; totalM: number } | null {
  const yearMap = esaByYear(rows).get(year);
  if (!yearMap) return null;
  const totalM = yearMap.get("esa-total")?.v ?? 0;
  if (!totalM) return null;
  const ranks: FunctionRank[] = ESA_ORDER.map((id) => {
    const cell = yearMap.get(id);
    const raw = cell?.v ?? 0;
    return {
      id,
      label: cell?.label ?? id,
      v: measure === "share" ? (raw / totalM) * 100 : raw / 1000,
    };
  }).sort((a, b) => b.v - a.v);
  return { ranks, totalM };
}

export function esaFunctionStack(rows: Observation[], measure: SpendingMeasure): ChartSeries[] {
  const byYear = esaByYear(rows);
  const years = [...byYear.keys()].sort();
  return ESA_ORDER.map((id) => {
    const points: Pt[] = [];
    for (const year of years) {
      const yearMap = byYear.get(year)!;
      const cell = yearMap.get(id);
      const total = yearMap.get("esa-total")?.v ?? 0;
      if (!cell || !total) continue;
      points.push({
        t: toT(`${year}-07-01`),
        v: measure === "share" ? (cell.v / total) * 100 : cell.v / 1000,
      });
    }
    const label = byYear.get(years[0]!)?.get(id)?.label ?? id;
    return { id, label, points };
  }).filter((s) => s.points.length > 0);
}

export function calendarYearLabel(tt: number): string {
  return String(Math.floor(tt));
}
