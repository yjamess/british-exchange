/**
 * Economy Domain 03 — Employment & Labour Market helpers.
 * Flagship composition uses matched UK 16–64 SA counts (LF2G + LF2I + LF2M).
 * Never invent a population pie from rates alone.
 */

import type { Observation } from "@/lib/api";
import { finalPts, toT, type Pt } from "../data";
import type { ChartSeries } from "../instrument/TimeChart";
import { sicLabel } from "./wages-model";

/** Drop provisional / missing — Economy charts never plot provisional points. */
export function finalObs(rows: Observation[]): Observation[] {
  return rows.filter(
    (r) =>
      r.value != null &&
      Number.isFinite(r.value) &&
      r.observation_status === "final",
  );
}

/** Monthly LMS observations → TimeChart points (final only). */
export function monthlyPoints(rows: Observation[]): Pt[] {
  return finalPts(
    finalObs(rows).map((r) => ({
      t: toT(r.period_start),
      v: r.value as number,
      provisional: false,
    })),
  );
}

export type WorkforceShow = "share" | "people";

export function asWorkforceShow(raw: string | null): WorkforceShow {
  return raw === "people" ? "people" : "share";
}

export const WORKFORCE_PARTS = [
  { id: "employed", label: "In work", seriesKey: "employmentLevel" as const },
  { id: "unemployed", label: "Unemployed", seriesKey: "unemploymentLevel" as const },
  { id: "inactive", label: "Outside the labour force", seriesKey: "inactivityLevel" as const },
] as const;

/** LMS levels are thousands of people. */
export function fmtPeopleThousands(v: number): string {
  if (Math.abs(v) >= 1000) return `${(v / 1000).toFixed(1)} million`;
  return `${Math.round(v).toLocaleString("en-GB")} thousand`;
}

export function fmtPeopleShort(v: number): string {
  if (Math.abs(v) >= 1000) return `${(v / 1000).toFixed(1)}m`;
  return `${Math.round(v).toLocaleString("en-GB")}k`;
}

export function fmtRate(v: number): string {
  return `${v.toFixed(1)}%`;
}

export function fmtSharePct(v: number): string {
  return `${v.toFixed(1)}%`;
}

export type WorkforceSlice = {
  periodStart: string;
  employed: number;
  unemployed: number;
  inactive: number;
  total: number;
};

/** Align three level series on a shared period and return the latest final month. */
export function latestWorkforceSlice(
  employed: Observation[],
  unemployed: Observation[],
  inactive: Observation[],
): WorkforceSlice | null {
  const e = mapByPeriod(finalObs(employed));
  const u = mapByPeriod(finalObs(unemployed));
  const i = mapByPeriod(finalObs(inactive));
  const periods = [...e.keys()].filter((p) => u.has(p) && i.has(p)).sort();
  const periodStart = periods.at(-1);
  if (!periodStart) return null;
  const employedV = e.get(periodStart)!;
  const unemployedV = u.get(periodStart)!;
  const inactiveV = i.get(periodStart)!;
  return {
    periodStart,
    employed: employedV,
    unemployed: unemployedV,
    inactive: inactiveV,
    total: employedV + unemployedV + inactiveV,
  };
}

export function workforceSliceAt(
  employed: Observation[],
  unemployed: Observation[],
  inactive: Observation[],
  periodStart: string,
): WorkforceSlice | null {
  const e = mapByPeriod(finalObs(employed));
  const u = mapByPeriod(finalObs(unemployed));
  const i = mapByPeriod(finalObs(inactive));
  if (!e.has(periodStart) || !u.has(periodStart) || !i.has(periodStart)) return null;
  const employedV = e.get(periodStart)!;
  const unemployedV = u.get(periodStart)!;
  const inactiveV = i.get(periodStart)!;
  return {
    periodStart,
    employed: employedV,
    unemployed: unemployedV,
    inactive: inactiveV,
    total: employedV + unemployedV + inactiveV,
  };
}

/** Shared final months across the three level pins (ISO period_start ascending). */
export function workforcePeriods(
  employed: Observation[],
  unemployed: Observation[],
  inactive: Observation[],
): string[] {
  const e = mapByPeriod(finalObs(employed));
  const u = mapByPeriod(finalObs(unemployed));
  const i = mapByPeriod(finalObs(inactive));
  return [...e.keys()].filter((p) => u.has(p) && i.has(p)).sort();
}

export function compositionSeries(
  employed: Observation[],
  unemployed: Observation[],
  inactive: Observation[],
): ChartSeries[] {
  return [
    { id: "employed", label: "In work", points: monthlyPoints(employed) },
    { id: "unemployed", label: "Unemployed", points: monthlyPoints(unemployed) },
    {
      id: "inactive",
      label: "Outside the labour force",
      points: monthlyPoints(inactive),
    },
  ];
}

export function rateSeries(
  employmentRate: Observation[],
  inactivityRate: Observation[],
  unemploymentRate: Observation[],
): ChartSeries[] {
  return [
    {
      id: "employment-rate",
      label: "Employment rate · share of working age",
      points: monthlyPoints(employmentRate),
    },
    {
      id: "inactivity-rate",
      label: "Inactivity rate · share of working age",
      points: monthlyPoints(inactivityRate),
    },
    {
      id: "unemployment-rate",
      label: "Unemployment rate · share of people looking for work",
      points: monthlyPoints(unemploymentRate),
      role: "reference",
    },
  ];
}

export function shareRows(slice: WorkforceSlice): { id: string; label: string; v: number }[] {
  if (!slice.total) return [];
  return [
    { id: "employed", label: "In work", v: (100 * slice.employed) / slice.total },
    { id: "unemployed", label: "Unemployed", v: (100 * slice.unemployed) / slice.total },
    {
      id: "inactive",
      label: "Outside the labour force",
      v: (100 * slice.inactive) / slice.total,
    },
  ];
}

export function peopleRows(slice: WorkforceSlice): { id: string; label: string; v: number }[] {
  return [
    { id: "employed", label: "In work", v: slice.employed },
    { id: "unemployed", label: "Unemployed", v: slice.unemployed },
    { id: "inactive", label: "Outside the labour force", v: slice.inactive },
  ];
}

export function shareChange(
  from: WorkforceSlice,
  to: WorkforceSlice,
): { id: string; label: string; from: number; to: number }[] {
  const a = shareRows(from);
  const b = shareRows(to);
  return a.flatMap((row) => {
    const next = b.find((x) => x.id === row.id);
    return next ? [{ id: row.id, label: row.label, from: row.v, to: next.v }] : [];
  });
}

function mapByPeriod(rows: Observation[]): Map<string, number> {
  const out = new Map<string, number>();
  for (const row of rows) {
    if (row.period_start && row.value != null) out.set(row.period_start, row.value as number);
  }
  return out;
}

/** Principal inactivity reasons (INAC01 / LMS levels) — order for charts. */
export const INACTIVITY_REASONS = [
  { id: "students", label: "Students", key: "reasonStudents" as const },
  { id: "long-term-sick", label: "Long-term sick", key: "reasonLongTermSick" as const },
  { id: "family-home", label: "Looking after family or home", key: "reasonFamilyHome" as const },
  { id: "retired", label: "Retired", key: "reasonRetired" as const },
  { id: "other", label: "Other", key: "reasonOther" as const },
  { id: "temp-sick", label: "Temporarily sick", key: "reasonTempSick" as const },
  { id: "discouraged", label: "Discouraged workers", key: "reasonDiscouraged" as const },
] as const;

export type ReasonPackSlice = {
  periodStart: string;
  parts: { id: string; label: string; v: number }[];
  total: number;
};

/** Latest shared final month across loaded reason level series (skip empty packs). */
export function latestReasonSlice(
  packs: Record<(typeof INACTIVITY_REASONS)[number]["key"], Observation[]>,
): ReasonPackSlice | null {
  const maps = INACTIVITY_REASONS.map((r) => ({
    ...r,
    map: mapByPeriod(finalObs(packs[r.key])),
  })).filter((m) => m.map.size > 0);
  if (!maps.length) return null;
  const periods = [...maps[0]!.map.keys()]
    .filter((p) => maps.every((m) => m.map.has(p)))
    .sort();
  const periodStart = periods.at(-1);
  if (!periodStart) return null;
  const parts = maps.map((m) => ({
    id: m.id,
    label: m.label,
    v: m.map.get(periodStart)!,
  }));
  return {
    periodStart,
    parts,
    total: parts.reduce((s, p) => s + p.v, 0),
  };
}

export function reasonSeries(
  packs: Record<(typeof INACTIVITY_REASONS)[number]["key"], Observation[]>,
): ChartSeries[] {
  return INACTIVITY_REASONS.filter((r) => finalObs(packs[r.key]).length > 0).map((r) => ({
    id: r.id,
    label: r.label,
    points: monthlyPoints(packs[r.key]),
  }));
}

export type RegionalLabourMeasure = "employment" | "unemployment" | "inactivity";

export function asRegionalLabourMeasure(raw: string | null): RegionalLabourMeasure {
  if (raw === "unemployment" || raw === "inactivity") return raw;
  return "employment";
}

function ranksAtPeriod(
  rows: Observation[],
  periodStart: string,
): { id: string; label: string; v: number }[] {
  return rows
    .filter((r) => r.period_start === periodStart && r.value != null)
    .map((r) => ({
      id: r.geography_code,
      label: (r.geography_label || r.geography_code).replace(/ Region$/i, ""),
      v: r.value as number,
    }))
    .sort((a, b) => b.v - a.v);
}

/** Latest (and prior) final period RankBars rows from a multi-geography HI00 pack. */
export function latestRegionalRanks(
  rows: Observation[],
): {
  periodStart: string;
  priorPeriodStart: string | null;
  ranks: { id: string; label: string; v: number }[];
  priorRanks: { id: string; label: string; v: number }[];
} | null {
  const ok = finalObs(rows);
  if (!ok.length) return null;
  const periods = [...new Set(ok.map((r) => r.period_start))].sort();
  const periodStart = periods.at(-1);
  if (!periodStart) return null;
  const ranks = ranksAtPeriod(ok, periodStart);
  if (!ranks.length) return null;
  const priorPeriodStart = periods.length >= 2 ? periods[periods.length - 2]! : null;
  const priorRanks = priorPeriodStart ? ranksAtPeriod(ok, priorPeriodStart) : [];
  return { periodStart, priorPeriodStart, ranks, priorRanks };
}

function noteField(notes: string, key: string): string | null {
  const m = notes.match(new RegExp(`(?:^|;\\s*)${key}=([^;]+)`));
  return m?.[1]?.trim() ?? null;
}

function jobsSeries(row: Observation): string {
  return row.dimensions?.series || noteField(row.notes ?? "", "series") || "";
}

/** One JOBS02 industry section (letter) or the published "total" as quarterly points, final only. */
export function industryJobsPoints(rows: Observation[], section: string): Pt[] {
  return finalPts(
    finalObs(rows)
      .filter((r) => jobsSeries(r) === section)
      .map((r) => ({ t: toT(r.period_start), v: r.value as number, provisional: false })),
  );
}

export type IndustryJobsFacts = {
  latest: Pt;
  first: Pt;
  /** Observation nearest ten years before the latest, if the series reaches that far. */
  tenYears: Pt | null;
  peak: Pt;
};

/** Plain facts read off one section's quarterly points: latest, first, ten years back, peak. */
export function industryJobsFacts(points: Pt[]): IndustryJobsFacts | null {
  if (!points.length) return null;
  const latest = points[points.length - 1]!;
  const first = points[0]!;
  const target = latest.t - 10;
  const nearest = points.reduce<Pt | null>(
    (best, p) => (best == null || Math.abs(p.t - target) < Math.abs(best.t - target) ? p : best),
    null,
  );
  const tenYears = nearest && Math.abs(nearest.t - target) < 0.3 ? nearest : null;
  const peak = points.reduce((a, p) => (p.v > a.v ? p : a), first);
  return { latest, first, tenYears, peak };
}

/** Latest final quarter of JOBS02 industry levels, plus published total.

  Visitor-facing labels use plain industry names (same wording as Wages).
  Letter codes stay as row ids only — they are ONS publisher keys, not UI copy.
  */
export function latestIndustryJobRanks(
  rows: Observation[],
): {
  periodStart: string;
  ranks: { id: string; label: string; v: number }[];
  total: number | null;
} | null {
  const ok = finalObs(rows);
  if (!ok.length) return null;
  const periods = [...new Set(ok.map((r) => r.period_start))].sort();
  const periodStart = periods.at(-1);
  if (!periodStart) return null;
  const at = ok.filter((r) => r.period_start === periodStart && r.value != null);
  const totalRow = at.find((r) => jobsSeries(r) === "total");
  const ranks = at
    .filter((r) => {
      const series = jobsSeries(r);
      return series.length === 1 && /[A-T]/.test(series);
    })
    .map((r) => {
      const id = jobsSeries(r);
      return {
        id,
        label: sicLabel(id),
        v: r.value as number,
      };
    })
    .sort((a, b) => b.v - a.v);
  if (!ranks.length) return null;
  return {
    periodStart,
    ranks,
    total: totalRow?.value != null ? (totalRow.value as number) : null,
  };
}

/* ——— Working Week extras: EMP16 underemployment · APS occupation ——— */

function seriesOf(row: Observation): string {
  return row.dimensions?.series || noteField(row.notes ?? "", "series") || "";
}

/** EMP16 underemployment rate (% of people in employment, NSA, 16+) as quarterly points, final only. */
export function underemploymentRatePoints(rows: Observation[]): Pt[] {
  return finalPts(
    finalObs(rows)
      .filter((r) => seriesOf(r) === "underemployment_rate")
      .map((r) => ({ t: toT(r.period_start), v: r.value as number, provisional: false })),
  );
}

/** Latest final EMP16 rate row, for the figure strip. */
export function latestUnderemploymentRate(rows: Observation[]): Observation | null {
  return finalObs(rows).filter((r) => seriesOf(r) === "underemployment_rate").at(-1) ?? null;
}

export type OccupationRank = { id: string; label: string; v: number; people: number | null };
export type OccupationSlice = {
  /** Window label as published, e.g. "Jul 2025-Jun 2026". */
  window: string;
  periodStart: string;
  periodEnd: string;
  employment: number | null;
  ranks: OccupationRank[];
};

/** Latest final APS window: nine SOC 2020 major groups by published share, largest first. */
export function latestOccupationSlice(rows: Observation[]): OccupationSlice | null {
  const final = finalObs(rows);
  if (!final.length) return null;
  const periodEnd = final.reduce((a, r) => (r.period_end > a ? r.period_end : a), final[0]!.period_end);
  const slice = final.filter((r) => r.period_end === periodEnd);
  const shares = slice.filter((r) => seriesOf(r) === "share");
  if (!shares.length) return null;
  const people = new Map(
    slice
      .filter((r) => seriesOf(r) === "people")
      .map((r) => [noteField(r.notes ?? "", "soc"), r.value as number] as const),
  );
  const employment = slice.find((r) => seriesOf(r) === "employment")?.value ?? null;
  const ranks = shares
    .map((r) => {
      const soc = noteField(r.notes ?? "", "soc") ?? "";
      return {
        id: soc,
        label: noteField(r.notes ?? "", "occupation") ?? `Group ${soc}`,
        v: r.value as number,
        people: people.get(soc) ?? null,
      };
    })
    .sort((a, b) => b.v - a.v);
  return {
    window: noteField(shares[0]!.notes ?? "", "window") ?? "",
    periodStart: shares[0]!.period_start,
    periodEnd,
    employment: employment as number | null,
    ranks,
  };
}

/** "Jul 2025-Jun 2026" → "twelve months to Jun 2026". */
export function windowLabel(window: string): string {
  const end = window.split("-").at(-1)?.trim();
  return end ? `twelve months to ${end}` : window;
}
