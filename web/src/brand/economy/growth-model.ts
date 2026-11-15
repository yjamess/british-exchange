import type { Observation } from "@/lib/api";
import { finalPts, toT, type Pt } from "../data";

/** Drop provisional / missing — Economy charts never plot provisional points. */
export function finalObs(rows: Observation[]): Observation[] {
  return rows.filter(
    (r) =>
      r.value != null &&
      Number.isFinite(r.value) &&
      r.observation_status === "final",
  );
}

/** Quarterly observations → TimeChart points (final only). */
export function periodPoints(rows: Observation[]): Pt[] {
  return finalPts(
    finalObs(rows).map((r) => ({
      t: toT(r.period_start),
      v: r.value as number,
      provisional: false,
    })),
  );
}

export function fmtGdpM(v: number): string {
  if (Math.abs(v) >= 1000) return `£${(v / 1000).toFixed(0)}bn`;
  return `£${v.toFixed(0)}m`;
}

export function fmtPerHead(v: number): string {
  return `£${Math.round(v).toLocaleString("en-GB")}`;
}

export function fmtIndex(v: number): string {
  return v.toFixed(1);
}

export function fmtPct1(v: number): string {
  return `${v >= 0 ? "+" : "−"}${Math.abs(v).toFixed(1)}%`;
}

/** Quarter-on-quarter % change (latest vs prior quarter). */
export function qoqPct(rows: Observation[]): number | null {
  const ok = finalObs(rows);
  if (ok.length < 2) return null;
  const latest = ok[ok.length - 1]!.value as number;
  const prior = ok[ok.length - 2]!.value as number;
  if (!prior) return null;
  return ((latest - prior) / prior) * 100;
}

/** Growth since a reference quarter (ISO period_start, e.g. 2019-10-01 = 2019 Q4). */
export function sincePct(rows: Observation[], refPeriodStart: string): number | null {
  const ok = finalObs(rows);
  if (!ok.length) return null;
  const ref = ok.find((r) => r.period_start === refPeriodStart);
  const latest = ok[ok.length - 1];
  if (!ref?.value || !latest?.value) return null;
  return ((latest.value as number) / (ref.value as number) - 1) * 100;
}

/** Index series so the reference quarter = 100 (Exchange-derived, same vintage only). */
export function rebasedTo(rows: Observation[], refPeriodStart: string): Pt[] {
  const pts = periodPoints(rows);
  const ref = finalObs(rows).find((r) => r.period_start === refPeriodStart);
  if (!ref?.value) return [];
  const base = ref.value as number;
  return pts
    .filter((p) => p.t >= toT(refPeriodStart))
    .map((p) => ({ t: p.t, v: (p.v / base) * 100 }));
}

export const PRE_PANDEMIC_Q4 = "2019-10-01";

/**
 * Named ledger baselines (brief §7B). Only offer a quarter when final GDP has it.
 * Default stays 2019 Q4.
 */
export const LEDGER_BASE_OPTIONS: { period: string; label: string }[] = [
  { period: "2019-10-01", label: "2019 Q4" },
  { period: "2008-01-01", label: "2008 Q1" },
  { period: "1990-01-01", label: "1990 Q1" },
  { period: "1979-01-01", label: "1979 Q1" },
  { period: "1955-01-01", label: "1955 Q1" },
];

/** First real GDP-per-head quarter (ONS blank placeholders before this are not plotted). */
export const GDP_PER_HEAD_FIRST_VALID = "1955-01-01";

/** Quarters from LEDGER_BASE_OPTIONS that exist as final observations in `rows`. */
export function availableLedgerBases(rows: Observation[]): { period: string; label: string }[] {
  const ok = new Set(finalObs(rows).map((r) => r.period_start));
  return LEDGER_BASE_OPTIONS.filter((b) => ok.has(b.period));
}

/** Any quarter with a final GDP level may be a ledger base (brief 02: user-selected quarter). */
export function asLedgerBase(raw: string | null, rows: Observation[]): string {
  const ok = finalObs(rows);
  if (!ok.length) return PRE_PANDEMIC_Q4;
  // The latest final quarter cannot be a base (nothing after it to compare).
  const usable = ok.slice(0, -1).map((r) => r.period_start);
  if (raw && usable.includes(raw)) return raw;
  if (usable.includes(PRE_PANDEMIC_Q4)) return PRE_PANDEMIC_Q4;
  return usable[0] ?? PRE_PANDEMIC_Q4;
}

/** Years that hold at least one usable base quarter, ascending. */
export function ledgerYears(rows: Observation[]): number[] {
  const ok = finalObs(rows).slice(0, -1);
  return [...new Set(ok.map((r) => Number(r.period_start.slice(0, 4))))].sort((a, b) => a - b);
}

/** Usable base quarters within one year, as ISO period starts. */
export function ledgerQuartersIn(rows: Observation[], year: number): string[] {
  return finalObs(rows)
    .slice(0, -1)
    .map((r) => r.period_start)
    .filter((p) => Number(p.slice(0, 4)) === year);
}

export function quarterOf(iso: string): number {
  return Math.floor((Number(iso.slice(5, 7)) - 1) / 3) + 1;
}

export type GrowthMeasure = "gdp" | "per-head" | "productivity";

/** GDP / per-head only — Revisions does not plot productivity vintages. */
export type VintageMeasure = "gdp" | "per-head";

export function asGrowthMeasure(raw: string | null): GrowthMeasure {
  if (raw === "per-head" || raw === "productivity") return raw;
  return "gdp";
}

export function asVintageMeasure(raw: string | null): VintageMeasure {
  return raw === "per-head" ? "per-head" : "gdp";
}

/** Plain-language definition for the Produce measure menu. */
export function growthMeasureDefinition(measure: GrowthMeasure): string {
  if (measure === "per-head") {
    return "Real GDP divided by population — production per person, not household income.";
  }
  if (measure === "productivity") {
    return "Whole-economy output per hour worked — not the same measure as GDP growth.";
  }
  return "Total real economic production (chained volume, seasonally adjusted).";
}

/** Pack index rows → TimeChart points (`t` already fractional year). */
export function vintageIndexPoints(
  rows: { t: number; v: number }[] | undefined,
): Pt[] {
  if (!rows?.length) return [];
  return rows.map((r) => ({ t: r.t, v: r.v }));
}

/* ——— Productivity engine: output = hours × output per hour (accounting identity) ——— */

export type EngineReading = {
  from: string;
  to: string;
  /** Index levels at each end (2023 = 100). */
  hours0: number;
  hours1: number;
  perHour0: number;
  perHour1: number;
  /** Derived output index = hours × output per hour ÷ 100. */
  output0: number;
  output1: number;
  /** Percent changes over the interval. */
  hoursPct: number;
  perHourPct: number;
  outputPct: number;
  /** Log contributions to output growth, in percentage points of the output change (sum to outputPct). */
  hoursContrib: number;
  perHourContrib: number;
  quarters: number;
};

function finalAt(rows: Observation[], period: string): number | null {
  const r = finalObs(rows).find((x) => x.period_start === period);
  return r?.value != null ? (r.value as number) : null;
}

/** Quarters where both hours and output per hour are final. */
export function engineQuarters(hoursRows: Observation[], perHourRows: Observation[]): string[] {
  const h = new Set(finalObs(hoursRows).map((r) => r.period_start));
  return finalObs(perHourRows)
    .map((r) => r.period_start)
    .filter((p) => h.has(p))
    .sort();
}

export function engineReading(
  hoursRows: Observation[],
  perHourRows: Observation[],
  from: string,
  to: string,
): EngineReading | null {
  const hours0 = finalAt(hoursRows, from);
  const hours1 = finalAt(hoursRows, to);
  const perHour0 = finalAt(perHourRows, from);
  const perHour1 = finalAt(perHourRows, to);
  if (hours0 == null || hours1 == null || perHour0 == null || perHour1 == null) return null;
  if (Math.min(hours0, hours1, perHour0, perHour1) <= 0 || from >= to) return null;
  const output0 = (hours0 * perHour0) / 100;
  const output1 = (hours1 * perHour1) / 100;
  const hoursPct = (hours1 / hours0 - 1) * 100;
  const perHourPct = (perHour1 / perHour0 - 1) * 100;
  const outputPct = (output1 / output0 - 1) * 100;
  const lh = Math.log(hours1 / hours0);
  const lp = Math.log(perHour1 / perHour0);
  const ly = lh + lp;
  // The scale tends to 100 as net change approaches zero, preserving offsetting contributions.
  const scale = ly === 0 ? 100 : (100 * Math.expm1(ly)) / ly;
  const hoursContrib = lh * scale;
  const perHourContrib = lp * scale;
  const q = (iso: string) => Number(iso.slice(0, 4)) * 4 + quarterOf(iso);
  return {
    from,
    to,
    hours0,
    hours1,
    perHour0,
    perHour1,
    output0,
    output1,
    hoursPct,
    perHourPct,
    outputPct,
    hoursContrib,
    perHourContrib,
    quarters: q(to) - q(from),
  };
}

/** Derived output index points (hours × output per hour ÷ 100), final quarters only. */
export function engineOutputPoints(hoursRows: Observation[], perHourRows: Observation[]): Pt[] {
  const perHour = new Map(finalObs(perHourRows).map((r) => [r.period_start, r.value as number]));
  return finalPts(
    finalObs(hoursRows)
      .filter((r) => perHour.has(r.period_start))
      .map((r) => ({
        t: toT(r.period_start),
        v: ((r.value as number) * (perHour.get(r.period_start) as number)) / 100,
        provisional: false,
      })),
  );
}

/** Index a point series so the value at `refT` = 100, from that point on. */
export function rebasePoints(points: Pt[], refT: number): Pt[] {
  const ref = points.find((p) => Math.abs(p.t - refT) < 1e-6);
  if (!ref || ref.v === 0) return [];
  return points.filter((p) => p.t >= refT - 1e-6).map((p) => ({ t: p.t, v: (p.v / ref.v) * 100 }));
}

/** Plain-words account of an engine reading. Accounting split, never a cause. */
export function engineSentence(r: EngineReading, fromLabel: string, toLabel: string): string {
  const pct = (v: number) => `${Math.abs(v).toFixed(1)}%`;
  const dir = (v: number) => (v > 0.05 ? "rose" : v < -0.05 ? "fell" : "was flat");
  const first = `Between ${fromLabel} and ${toLabel}, output ${dir(r.outputPct)}${
    Math.abs(r.outputPct) > 0.05 ? ` by ${pct(r.outputPct)}` : ""
  }. Hours worked ${dir(r.hoursPct)}${Math.abs(r.hoursPct) > 0.05 ? ` ${pct(r.hoursPct)}` : ""} and output per hour ${dir(r.perHourPct)}${
    Math.abs(r.perHourPct) > 0.05 ? ` ${pct(r.perHourPct)}` : ""
  }.`;
  let second: string;
  if (Math.abs(r.outputPct) <= 0.05) {
    second = "Output was about the same at both ends of the interval.";
  } else if (r.hoursPct > 0.05 && r.perHourPct > 0.05) {
    second =
      r.hoursContrib > r.perHourContrib
        ? "More of the extra output is accounted for by more hours than by more output per hour."
        : "More of the extra output is accounted for by more output per hour than by more hours.";
  } else if (r.hoursPct < -0.05 && r.perHourPct > 0.05) {
    second = r.outputPct > 0 ? "The gain in output per hour outweighed the fall in hours worked." : "The fall in hours worked outweighed the gain in output per hour.";
  } else if (r.hoursPct > 0.05 && r.perHourPct < -0.05) {
    second = r.outputPct > 0 ? "The gain in hours worked outweighed the fall in output per hour." : "The fall in output per hour outweighed the gain in hours worked.";
  } else if (r.hoursPct < -0.05 && r.perHourPct < -0.05) {
    second = "Both fewer hours and less output per hour pulled output down.";
  } else {
    second = "One of the two parts barely moved, so the other accounts for almost all of the change.";
  }
  return `${first} ${second}`;
}
