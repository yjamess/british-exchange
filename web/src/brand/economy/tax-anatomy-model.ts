/**
 * Anatomy of Revenue — two composition levels from Ready packages.
 *
 * AHHY heads (`tax-receipts-composition`):
 *   MF6P + AIIH + NMHM + AHGR = AHHY
 *
 * Central government taxes under MF6P (`tax-receipts-cg-composition`):
 *   NMBY + NMCU + LIQR = MF6P
 *
 * Charts use final months only, and only periods where every head at that level
 * is valued. Deeper leaves (LIBR / NZGF / CPRN) are not modelled here.
 */

import type { Observation } from "@/lib/api";
import { toT, type Pt } from "../data";
import type { ChartSeries } from "../instrument/TimeChart";
import { finalObs } from "./debt-model";

export type AnatomyRank = { id: string; label: string; v: number };

export type AnatomyCategory =
  | "cg-taxes"
  | "social-contributions"
  | "council-tax"
  | "other-lg-taxes";

/** First-depth CG drill under MF6P — not a new AHHY total. */
export type AnatomyCgCategory =
  | "cg-production-taxes"
  | "cg-income-wealth-taxes"
  | "other-cg-taxes";

export type AnatomyMeasure = "absolute" | "share";

/** What Britain raises — Measure menu: the flagship total, or the composition two ways. */
export type RevenueMeasure = "total" | "absolute" | "share";

export const REVENUE_MEASURE_OPTIONS: { value: RevenueMeasure; label: string }[] = [
  { value: "total", label: "Total receipts" },
  { value: "absolute", label: "Composition · pounds" },
  { value: "share", label: "Composition · share" },
];

/** Pen pattern per head, fixed by head id so each keeps its mark across levels and years. */
export const HEAD_PATTERN: Record<string, "solid" | "stipple" | "sparse" | "hatch" | "cross" | "engrave"> = {
  "cg-taxes": "solid",
  "social-contributions": "hatch",
  "council-tax": "stipple",
  "other-lg-taxes": "cross",
  "cg-production-taxes": "solid",
  "cg-income-wealth-taxes": "hatch",
  "other-cg-taxes": "stipple",
};

export type RevenueRowPart = { id: string; label: string; m: number; share: number };
export type RevenueRow = { period: string; label: string; totalM: number; parts: RevenueRowPart[] };

/** URL key `al` — public-sector AHHY heads vs CG under MF6P. */
export type AnatomyLevel = "ahhy" | "cg";

type AnatomyHead<C extends string> = { id: C; label: string; series: string };

export const ANATOMY_CATEGORIES: AnatomyHead<AnatomyCategory>[] = [
  { id: "cg-taxes", label: "Central government taxes", series: "MF6P" },
  { id: "social-contributions", label: "Social contributions (mainly NICs)", series: "AIIH" },
  { id: "council-tax", label: "Council tax", series: "NMHM" },
  { id: "other-lg-taxes", label: "Other local government taxes", series: "AHGR" },
];

export const ANATOMY_CG_CATEGORIES: AnatomyHead<AnatomyCgCategory>[] = [
  { id: "cg-production-taxes", label: "Taxes on production", series: "NMBY" },
  { id: "cg-income-wealth-taxes", label: "Taxes on income and wealth", series: "NMCU" },
  { id: "other-cg-taxes", label: "Other central government taxes", series: "LIQR" },
];

export const ANATOMY_MEASURE_OPTIONS: { value: AnatomyMeasure; label: string }[] = [
  { value: "absolute", label: "Pounds" },
  { value: "share", label: "Share of total" },
];

export const ANATOMY_LEVEL_OPTIONS: { value: AnatomyLevel; label: string }[] = [
  { value: "ahhy", label: "All taxes and National Insurance" },
  { value: "cg", label: "Central government taxes" },
];

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

function categoryOfHeads<C extends string>(
  row: Observation,
  heads: AnatomyHead<C>[],
): C | null {
  const ids = new Set(heads.map((h) => h.id));
  const fromDim = row.dimensions?.category as C | undefined;
  if (fromDim && ids.has(fromDim)) return fromDim;
  const notes = parseNotes(row.notes);
  const cat = notes.category as C | undefined;
  if (cat && ids.has(cat)) return cat;
  return null;
}

/** Final valued rows by category for a fixed head list. */
function compositionByHeads<C extends string>(
  rows: Observation[],
  heads: AnatomyHead<C>[],
): Record<C, Map<string, number>> {
  const out = Object.fromEntries(
    heads.map((c) => [c.id, new Map<string, number>()]),
  ) as Record<C, Map<string, number>>;
  for (const row of finalObs(rows)) {
    const cat = categoryOfHeads(row, heads);
    if (!cat || row.value == null) continue;
    out[cat].set(row.period_start, row.value as number);
  }
  return out;
}

/** Periods where every head is present (final). */
function completePeriodsForHeads<C extends string>(
  byCat: Record<C, Map<string, number>>,
  heads: AnatomyHead<C>[],
): string[] {
  const [first, ...rest] = heads;
  if (!first) return [];
  const periods = [...(byCat[first.id].keys())].sort();
  return periods.filter((p) => rest.every((c) => byCat[c.id].has(p)));
}

function stackSeriesForHeads<C extends string>(
  rows: Observation[],
  heads: AnatomyHead<C>[],
  measure: AnatomyMeasure,
): ChartSeries[] {
  const byCat = compositionByHeads(rows, heads);
  const periods = completePeriodsForHeads(byCat, heads);
  return heads
    .map((c) => {
      const points: Pt[] = [];
      for (const p of periods) {
        const v = byCat[c.id].get(p);
        if (v == null) continue;
        if (measure === "absolute") {
          // Chart in £ billion for readability (same as flagship).
          points.push({ t: toT(p), v: v / 1000 });
        } else {
          const total = heads.reduce((sum, x) => sum + (byCat[x.id].get(p) ?? 0), 0);
          if (total === 0) continue;
          points.push({ t: toT(p), v: (v / total) * 100 });
        }
      }
      return { id: c.id, label: c.label, points };
    })
    .filter((s) => s.points.length > 0);
}

/**
 * Each head as a rolling 12-month sum in £bn over complete months — the flagship's convention,
 * so the composition is read without the tax-calendar swing of single months. The share stack
 * normalises these itself, so one series set serves both measures.
 */
function rollingSeriesForHeads<C extends string>(
  rows: Observation[],
  heads: AnatomyHead<C>[],
): ChartSeries[] {
  const byCat = compositionByHeads(rows, heads);
  const periods = completePeriodsForHeads(byCat, heads);
  return heads
    .map((c) => {
      const points: Pt[] = [];
      const window: number[] = [];
      let prevT: number | null = null;
      for (const p of periods) {
        const v = byCat[c.id].get(p);
        const t = toT(p);
        // A gap in complete months restarts the window.
        if (v == null || (prevT != null && t - prevT > 1 / 12 + 1e-6)) window.length = 0;
        prevT = t;
        if (v == null) continue;
        window.push(v);
        if (window.length > 12) window.shift();
        if (window.length === 12) points.push({ t, v: window.reduce((a, b) => a + b, 0) / 1000 });
      }
      return { id: c.id, label: c.label, points };
    })
    .filter((s) => s.points.length > 0);
}

export function anatomyRollingSeries(rows: Observation[]): ChartSeries[] {
  return rollingSeriesForHeads(rows, ANATOMY_CATEGORIES);
}

export function anatomyCgRollingSeries(rows: Observation[]): ChartSeries[] {
  return rollingSeriesForHeads(rows, ANATOMY_CG_CATEGORIES);
}

function latestRanksForHeads<C extends string>(
  rows: Observation[],
  heads: AnatomyHead<C>[],
  measure: AnatomyMeasure,
): { period: string; ranks: AnatomyRank[]; totalM: number } | null {
  const byCat = compositionByHeads(rows, heads);
  const periods = completePeriodsForHeads(byCat, heads);
  const period = periods.at(-1);
  if (!period) return null;
  const totalM = heads.reduce((sum, c) => sum + (byCat[c.id].get(period) ?? 0), 0);
  const ranks: AnatomyRank[] = heads
    .map((c) => {
      const raw = byCat[c.id].get(period) ?? 0;
      return {
        id: c.id,
        label: c.label,
        v: measure === "absolute" ? raw / 1000 : totalM === 0 ? 0 : (raw / totalM) * 100,
      };
    })
    .sort((a, b) => Math.abs(b.v) - Math.abs(a.v));
  return { period, ranks, totalM };
}

/**
 * The latest complete month and the same calendar month every `step` years back, as far as the
 * data is complete — a decades reading of the composition.
 */
function rowsForHeads<C extends string>(
  rows: Observation[],
  heads: AnatomyHead<C>[],
  step = 5,
  max = 6,
): RevenueRow[] {
  const byCat = compositionByHeads(rows, heads);
  const periods = completePeriodsForHeads(byCat, heads);
  const latest = periods.at(-1);
  if (!latest) return [];
  const have = new Set(periods);
  const out: RevenueRow[] = [];
  const month = latest.slice(4);
  let year = Number(latest.slice(0, 4));
  while (out.length < max) {
    const period = `${year}${month}`;
    if (!have.has(period)) break;
    const totalM = heads.reduce((sum, c) => sum + (byCat[c.id].get(period) ?? 0), 0);
    out.push({
      period,
      label: `${["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][Number(period.slice(5, 7)) - 1]} ${year}`,
      totalM,
      parts: heads.map((c) => {
        const m = byCat[c.id].get(period) ?? 0;
        return { id: c.id, label: c.label, m, share: totalM === 0 ? 0 : (m / totalM) * 100 };
      }),
    });
    year -= step;
  }
  return out.reverse();
}

export function anatomyRows(rows: Observation[]): RevenueRow[] {
  return rowsForHeads(rows, ANATOMY_CATEGORIES);
}

export function anatomyCgRows(rows: Observation[]): RevenueRow[] {
  return rowsForHeads(rows, ANATOMY_CG_CATEGORIES);
}

/** Final valued rows by AHHY category. */
export function compositionByCategory(
  rows: Observation[],
): Record<AnatomyCategory, Map<string, number>> {
  return compositionByHeads(rows, ANATOMY_CATEGORIES);
}

/** Periods where all four AHHY heads are present (final). */
export function completePeriods(
  byCat: Record<AnatomyCategory, Map<string, number>>,
): string[] {
  return completePeriodsForHeads(byCat, ANATOMY_CATEGORIES);
}

export function anatomyStackSeries(
  rows: Observation[],
  measure: AnatomyMeasure,
): ChartSeries[] {
  return stackSeriesForHeads(rows, ANATOMY_CATEGORIES, measure);
}

/** Latest complete month → RankBars rows (£bn or % of total). */
export function anatomyLatestRanks(
  rows: Observation[],
  measure: AnatomyMeasure,
): { period: string; ranks: AnatomyRank[]; totalM: number } | null {
  return latestRanksForHeads(rows, ANATOMY_CATEGORIES, measure);
}

export function anatomyCgStackSeries(
  rows: Observation[],
  measure: AnatomyMeasure,
): ChartSeries[] {
  return stackSeriesForHeads(rows, ANATOMY_CG_CATEGORIES, measure);
}

/** Latest complete CG month under MF6P → RankBars rows. */
export function anatomyCgLatestRanks(
  rows: Observation[],
  measure: AnatomyMeasure,
): { period: string; ranks: AnatomyRank[]; totalM: number } | null {
  return latestRanksForHeads(rows, ANATOMY_CG_CATEGORIES, measure);
}

export function fmtAnatomyBn(v: number): string {
  const abs = Math.abs(v);
  const body = abs >= 100 ? abs.toFixed(0) : abs.toFixed(1);
  return `${v < 0 ? "−" : ""}£${body}bn`;
}

export function fmtAnatomyShare(v: number): string {
  const sign = v < 0 ? "−" : "";
  return `${sign}${Math.abs(v).toFixed(1)}%`;
}
