/**
 * Domain 04 helpers — national-accounts household income and the saving ratio.
 *
 * Charts plot published quarters, including the latest provisional (dotted).
 * Percentage change is (latest ÷ base − 1) × 100, same idea as Growth's sincePct.
 * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Division
 */

import type { Observation } from "@/lib/api";
import { toT, type Pt } from "../data";

/** Live UKEA chained-volume reference year (DG2R / CRXX titles). */
export const REF_YEAR = 2024;

/** Clear pre-pandemic base, documented in Notes — not a typical household's worst year. */
export const PRE_PANDEMIC_Q4 = "2019-10-01";
export const PRE_PANDEMIC_LABEL = "Q4 2019";

export type HouseholdMeasure = "total" | "per-head";

export function asHouseholdMeasure(raw: string | null): HouseholdMeasure {
  return raw === "per-head" ? "per-head" : "total";
}

/** Keep finite values, including the latest provisional quarter. */
export function finiteObs(rows: Observation[]): Observation[] {
  return rows.filter((r) => r.value != null && Number.isFinite(r.value));
}

export function periodPoints(rows: Observation[]): Pt[] {
  return finiteObs(rows).map((r) => ({
    t: toT(r.period_start),
    v: r.value as number,
    provisional: r.observation_status === "provisional",
  }));
}

export function latestObs(rows: Observation[]): Observation | null {
  const ok = finiteObs(rows);
  return ok.at(-1) ?? null;
}

/** Quarter-on-quarter % change, latest (may be provisional) vs the quarter before. */
export function qoqPct(rows: Observation[]): number | null {
  const ok = finiteObs(rows);
  if (ok.length < 2) return null;
  const latest = ok[ok.length - 1]!.value as number;
  const prior = ok[ok.length - 2]!.value as number;
  if (!prior) return null;
  return ((latest - prior) / prior) * 100;
}

/** Quarter-on-quarter change in percentage points (for a ratio series). */
export function qoqPoints(rows: Observation[]): number | null {
  const ok = finiteObs(rows);
  if (ok.length < 2) return null;
  const latest = ok[ok.length - 1]!.value as number;
  const prior = ok[ok.length - 2]!.value as number;
  return latest - prior;
}

/** Level change since a reference quarter (ISO period_start). */
export function sincePct(rows: Observation[], refPeriodStart: string): number | null {
  const ok = finiteObs(rows);
  if (!ok.length) return null;
  const ref = ok.find((r) => r.period_start === refPeriodStart);
  const latest = ok[ok.length - 1];
  if (!ref?.value || !latest?.value) return null;
  return ((latest.value as number) / (ref.value as number) - 1) * 100;
}

/** Saving-ratio change in percentage points (not percent of the ratio). */
export function sincePoints(rows: Observation[], refPeriodStart: string): number | null {
  const ok = finiteObs(rows);
  if (!ok.length) return null;
  const ref = ok.find((r) => r.period_start === refPeriodStart);
  const latest = ok[ok.length - 1];
  if (ref?.value == null || latest?.value == null) return null;
  return (latest.value as number) - (ref.value as number);
}

/**
 * Lowest published quarter on or after `fromPeriod` — used as a trough reading.
 * For RHDI this is often not 2020 Q2 (furlough lifted aggregate income).
 */
export function troughSince(
  rows: Observation[],
  fromPeriod: string,
): { period: string; value: number } | null {
  const ok = finiteObs(rows).filter((r) => r.period_start >= fromPeriod);
  if (!ok.length) return null;
  let low = ok[0]!;
  for (const r of ok) {
    if ((r.value as number) < (low.value as number)) low = r;
  }
  return { period: low.period_start, value: low.value as number };
}

export function fmtRhdiM(v: number): string {
  if (Math.abs(v) >= 1000) return `£${(v / 1000).toFixed(0)}bn`;
  return `£${v.toFixed(0)}m`;
}

export function fmtPerHead(v: number): string {
  const n = Math.round(v);
  const sign = n < 0 ? "−" : "";
  const digits = String(Math.abs(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `£${sign}${digits}`;
}

export function fmtPct1(v: number): string {
  return `${v >= 0 ? "+" : "−"}${Math.abs(v).toFixed(1)}%`;
}

export function fmtRatio(v: number): string {
  return `${v.toFixed(1)}%`;
}

export function fmtPoints(v: number): string {
  return `${v >= 0 ? "+" : "−"}${Math.abs(v).toFixed(1)} points`;
}
