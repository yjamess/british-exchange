/**
 * Build annual generation mixes from ET 5.1 quarterly observations.
 * Calendar-year totals = sum of component fuels only; never aggregate rows.
 */

import { toT, type Pt } from "../data";
import { FUELS, STACK_GROUPS, fuelFromSourceLabel, type FuelId, type StackGroupId } from "./fuels";

export type GenObs = {
  period_start: string;
  value: number | null;
  observation_status: string;
  notes: string;
  source_version: string;
};

export type YearFuel = {
  year: number;
  byFuel: Record<FuelId, number>;
  byStack: Record<StackGroupId, number>;
  total: number;
  /** Fewer than four calendar quarters present for this year. */
  partial: boolean;
  /** Any quarter marked provisional in the pin. */
  provisional: boolean;
  quarters: number;
};

function fuelLabel(notes: string): string {
  const m = /^fuel=(.*)$/.exec(notes.trim());
  return m?.[1]?.trim() ?? "";
}

function yearOf(iso: string): number {
  return Number(iso.slice(0, 4));
}

function emptyFuels(): Record<FuelId, number> {
  return Object.fromEntries(FUELS.map((f) => [f.id, 0])) as Record<FuelId, number>;
}

function emptyStack(): Record<StackGroupId, number> {
  return Object.fromEntries(STACK_GROUPS.map((g) => [g.id, 0])) as Record<StackGroupId, number>;
}

/** Roll quarterly component observations into calendar years. */
export function annualMix(rows: GenObs[]): YearFuel[] {
  type Acc = {
    byFuel: Record<FuelId, number>;
    byStack: Record<StackGroupId, number>;
    quarters: Set<string>;
    provisional: boolean;
  };
  const byYear = new Map<number, Acc>();

  for (const row of rows) {
    const label = fuelLabel(row.notes);
    const fuel = fuelFromSourceLabel(label);
    if (!fuel || row.value == null || !Number.isFinite(row.value)) continue;

    const y = yearOf(row.period_start);
    let acc = byYear.get(y);
    if (!acc) {
      acc = { byFuel: emptyFuels(), byStack: emptyStack(), quarters: new Set(), provisional: false };
      byYear.set(y, acc);
    }
    acc.byFuel[fuel.id] += row.value;
    acc.byStack[fuel.stack] += row.value;
    acc.quarters.add(row.period_start);
    if (row.observation_status === "provisional") acc.provisional = true;
  }

  return [...byYear.entries()]
    .map(([year, acc]) => {
      const total = FUELS.reduce((s, f) => s + acc.byFuel[f.id], 0);
      return {
        year,
        byFuel: acc.byFuel,
        byStack: acc.byStack,
        total,
        partial: acc.quarters.size < 4,
        provisional: acc.provisional || acc.quarters.size < 4,
        quarters: acc.quarters.size,
      };
    })
    .filter((y) => y.total > 0)
    .sort((a, b) => a.year - b.year);
}

export function yearsOf(mix: YearFuel[]): number[] {
  return mix.map((y) => y.year);
}

export function yearRow(mix: YearFuel[], year: number): YearFuel | undefined {
  return mix.find((y) => y.year === year);
}

/** RankBars rows for one year (absolute TWh or share of total). */
export function compositionRows(
  row: YearFuel,
  measure: "absolute" | "share",
  active?: FuelId,
): { id: string; label: string; v: number; active?: boolean }[] {
  return FUELS.map((f) => {
    const twh = row.byFuel[f.id];
    const v = measure === "share" ? (row.total > 0 ? (twh / row.total) * 100 : 0) : twh;
    return { id: f.id, label: f.label, v, active: active === f.id };
  }).filter((r) => r.v > 0 || measure === "absolute");
}

/** TimeChart series for one fuel (annual TWh or share). */
export function fuelTrajectory(
  mix: YearFuel[],
  fuel: FuelId,
  measure: "absolute" | "share",
  from: number,
  to: number,
): Pt[] {
  return mix
    .filter((y) => y.year >= from && y.year <= to)
    .map((y) => {
      const twh = y.byFuel[fuel];
      const v = measure === "share" ? (y.total > 0 ? (twh / y.total) * 100 : 0) : twh;
      return { t: y.year, v, provisional: y.provisional };
    })
    .filter((p) => Number.isFinite(p.v));
}

/** Five-group stack series for share-over-time context. */
export function stackSeries(mix: YearFuel[], from: number, to: number): { id: string; label: string; points: Pt[] }[] {
  return STACK_GROUPS.map((g) => ({
    id: g.id,
    label: g.label,
    points: mix
      .filter((y) => y.year >= from && y.year <= to)
      .map((y) => ({
        t: y.year,
        v: y.byStack[g.id],
        provisional: y.provisional,
      })),
  }));
}

/** ChangeRows payload: fuel share (or TWh) from year A → year B. */
export function compareFuels(
  a: YearFuel,
  b: YearFuel,
  measure: "absolute" | "share",
): { id: string; label: string; from: number; to: number }[] {
  return FUELS.map((f) => {
    const va = measure === "share" ? (a.total > 0 ? (a.byFuel[f.id] / a.total) * 100 : 0) : a.byFuel[f.id];
    const vb = measure === "share" ? (b.total > 0 ? (b.byFuel[f.id] / b.total) * 100 : 0) : b.byFuel[f.id];
    return { id: f.id, label: f.label, from: va, to: vb };
  }).filter((r) => r.from > 0 || r.to > 0);
}

export function fmtTwh(v: number): string {
  if (v >= 100) return v.toFixed(0);
  if (v >= 10) return v.toFixed(1);
  return v.toFixed(2);
}

export function fmtShare(v: number): string {
  return `${v.toFixed(1)}%`;
}

/** Period label helper for annual charts. */
export function annualLabel(t: number): string {
  return String(Math.floor(t + 1e-6));
}

export function parseFuelNotes(notes: string): string {
  return fuelLabel(notes);
}

/** Keep toT available for quarterly archive tables. */
export { toT };
