/**
 * Domain 08 — Manufacturing helpers (client-safe).
 * Study C: Production Anatomy card — national section C only.
 * Index ≠ % GVA ≠ thousands of jobs ≠ output-per-hour index — never one unmarked axis.
 */

import type { IndicatorMeta, Observation } from "@/lib/api";
import { toT, type Pt } from "../data";

export const OUTPUT_INDEX_ID = "manufacturing-output-index";
export const SHARE_GVA_ID = "manufacturing-share-of-gva";
export const EMPLOYMENT_ID = "manufacturing-employment";
export const OUTPUT_PER_HOUR_ID = "manufacturing-output-per-hour";

/** Dial / URL measure for Production Anatomy (Notion Volume / GVA share + jobs & productivity). */
export const ANATOMY_MEASURES = ["volume", "share", "jobs", "productivity"] as const;
export type AnatomyMeasure = (typeof ANATOMY_MEASURES)[number];

export type SeriesPack = {
  meta: IndicatorMeta;
  observations: Observation[];
  sourceVersion: string;
  retrievedNote: string;
};

export type ManufacturingPack = {
  output: SeriesPack | null;
  share: SeriesPack | null;
  employment: SeriesPack | null;
  productivity: SeriesPack | null;
};

export function yearsOf(rows: Observation[]): number[] {
  return [
    ...new Set(rows.map((r) => Number(r.period_start.slice(0, 4))).filter((y) => Number.isFinite(y))),
  ].sort((a, b) => a - b);
}

/** Monthly IoP manufacturing index → continuous monthly points. */
export function outputIndexSeries(rows: Observation[]): { id: string; label: string; points: Pt[] } {
  const sorted = [...rows].sort((a, b) => a.period_start.localeCompare(b.period_start));
  return {
    id: "mfg-output-index",
    label: "Manufacturing output index (CVMSA)",
    points: sorted
      .filter((r) => r.value != null && Number.isFinite(Number(r.value)))
      .map((r) => ({
        t: toT(r.period_start),
        v: Number(r.value),
        provisional: r.observation_status === "provisional",
      })),
  };
}

/** Mean of published months in a calendar year (for figure strip). */
export function outputIndexYearMean(rows: Observation[], year: number): number | null {
  const ms = rows.filter(
    (r) => r.period_start.startsWith(String(year)) && r.value != null && Number.isFinite(Number(r.value)),
  );
  if (!ms.length) return null;
  return ms.reduce((s, r) => s + Number(r.value), 0) / ms.length;
}

export function shareSeries(rows: Observation[]): { id: string; label: string; points: Pt[] } {
  const sorted = [...rows].sort((a, b) => a.period_start.localeCompare(b.period_start));
  return {
    id: "mfg-share-gva",
    label: "Manufacturing share of GVA",
    points: sorted
      .filter((r) => r.value != null && Number.isFinite(Number(r.value)))
      .map((r) => ({
        t: Number(r.period_start.slice(0, 4)),
        v: Number(r.value),
        provisional: r.observation_status === "provisional",
      })),
  };
}

export function shareValueInYear(rows: Observation[], year: number): number | null {
  const row = rows.find((r) => r.period_start.startsWith(String(year)) && r.value != null);
  return row?.value != null && Number.isFinite(Number(row.value)) ? Number(row.value) : null;
}

export function employmentSeries(rows: Observation[]): { id: string; label: string; points: Pt[] } {
  const sorted = [...rows].sort((a, b) => a.period_start.localeCompare(b.period_start));
  return {
    id: "mfg-employment",
    label: "Manufacturing workforce jobs",
    points: sorted
      .filter((r) => r.value != null && Number.isFinite(Number(r.value)))
      .map((r) => ({
        t: toT(r.period_start),
        v: Number(r.value),
        provisional: r.observation_status === "provisional",
      })),
  };
}

/** Mean of published quarters in a calendar year. */
export function employmentYearMean(rows: Observation[], year: number): number | null {
  const qs = rows.filter(
    (r) => r.period_start.startsWith(String(year)) && r.value != null && Number.isFinite(Number(r.value)),
  );
  if (!qs.length) return null;
  return qs.reduce((s, r) => s + Number(r.value), 0) / qs.length;
}

export function productivitySeries(rows: Observation[]): { id: string; label: string; points: Pt[] } {
  const sorted = [...rows].sort((a, b) => a.period_start.localeCompare(b.period_start));
  return {
    id: "mfg-output-per-hour",
    label: "Manufacturing output per hour",
    points: sorted
      .filter((r) => r.value != null && Number.isFinite(Number(r.value)))
      .map((r) => ({
        t: toT(r.period_start),
        v: Number(r.value),
        provisional: r.observation_status === "provisional",
      })),
  };
}

export function productivityYearMean(rows: Observation[], year: number): number | null {
  const qs = rows.filter(
    (r) => r.period_start.startsWith(String(year)) && r.value != null && Number.isFinite(Number(r.value)),
  );
  if (!qs.length) return null;
  return qs.reduce((s, r) => s + Number(r.value), 0) / qs.length;
}

export function fmtIndex(v: number): string {
  return v.toLocaleString("en-GB", { maximumFractionDigits: 1 });
}

export function fmtSharePct(v: number): string {
  return `${v.toLocaleString("en-GB", { maximumFractionDigits: 1 })}%`;
}

export function fmtJobsThousands(v: number): string {
  return `${v.toLocaleString("en-GB", { maximumFractionDigits: 0 })}k`;
}

export function pctChange(from: number, to: number): number | null {
  if (!Number.isFinite(from) || !Number.isFinite(to) || from === 0) return null;
  return ((to - from) / from) * 100;
}
