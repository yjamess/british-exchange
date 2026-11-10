/**
 * Domain 09 — Jobs & Productivity helpers (client-safe).
 * Labour Landscape (national) + Employment Atlas (BRES) + Productivity Machine.
 * Reuses Manufacturing Ready series — jobs ≠ volume index ≠ productivity.
 */

import type { Observation } from "@/lib/api";
import type { ManufacturingPack, SeriesPack } from "./manufacturing-model";

export {
  ASHE_EARNINGS_ID,
  BRES_BY_DIVISION_REGION_ID,
  BRES_EMPLOYEE_JOBS_ID,
  EMPLOYMENT_ID,
  OUTPUT_INDEX_ID,
  OUTPUT_PER_HOUR_ID,
  OUTPUT_PER_JOB_ID,
  PRODUCTIVITY_HOURS_ID,
  bresChangeRanks,
  bresDivisionRowsForBranch,
  bresRankForYear,
  bresRegionCount,
  bresSicCodesForBranch,
  bresUkSum,
  bresYearsOf,
  completeMonthlyYears,
  completeQuarterlyYears,
  employmentSeries,
  employmentYearMean,
  fmtBresThousands,
  fmtIndex,
  fmtJobsThousands,
  listIopBranches,
  outputIndexSeries,
  outputIndexYearMean,
  outputPerJobSeries,
  outputPerJobYearMean,
  pctChange,
  productivityHoursSeries,
  productivityHoursYearMean,
  productivitySeries,
  productivityYearMean,
  yearsOf,
  type IopBranch,
  type IopLevel,
  IOP_LEVELS,
} from "./manufacturing-model";

export type JobsPack = {
  employment: SeriesPack | null;
  output: SeriesPack | null;
  productivity: SeriesPack | null;
  outputPerJob: SeriesPack | null;
  productivityHours: SeriesPack | null;
  asheEarnings: SeriesPack | null;
  bresByRegion: SeriesPack | null;
  bresByDivisionRegion: SeriesPack | null;
  iopByDivision: SeriesPack | null;
};

export const PRODUCTIVITY_MEASURES = ["hour", "job"] as const;
export type ProductivityMeasure = (typeof PRODUCTIVITY_MEASURES)[number];

export const PAY_MEASURES = ["weekly_gross", "hourly_ex_ot"] as const;
export type PayMeasure = (typeof PAY_MEASURES)[number];

export const PAY_SHEETS = ["Full-Time", "All"] as const;
export type PaySheet = (typeof PAY_SHEETS)[number];

export function jobsPackFromManufacturing(m: ManufacturingPack): JobsPack {
  return {
    employment: m.employment,
    output: m.output,
    productivity: m.productivity,
    outputPerJob: m.outputPerJob,
    productivityHours: m.productivityHours,
    asheEarnings: m.asheEarnings,
    bresByRegion: m.bresByRegion,
    bresByDivisionRegion: m.bresByDivisionRegion,
    iopByDivision: m.iopByDivision,
  };
}

export function fmtPctChange(v: number): string {
  const sign = v > 0 ? "+" : v < 0 ? "−" : "";
  return `${sign}${Math.abs(v).toLocaleString("en-GB", { maximumFractionDigits: 1 })}%`;
}

export function fmtGbp(v: number, measure: PayMeasure): string {
  if (measure === "hourly_ex_ot") {
    return `£${v.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  return `£${v.toLocaleString("en-GB", { maximumFractionDigits: 0 })}`;
}

function noteMap(notes: string | null | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  for (const part of (notes ?? "").split("; ")) {
    if (!part.includes("=")) continue;
    const i = part.indexOf("=");
    out[part.slice(0, i)] = part.slice(i + 1);
  }
  return out;
}

export type AshePayRow = {
  sic: string;
  label: string;
  classification: "section" | "division";
  median: number;
  annualPctChange: number | null;
};

/** ASHE manufacturing rows for one measure × employee sheet. */
export function ashePayRows(
  rows: Observation[],
  measure: PayMeasure,
  sheet: PaySheet,
): AshePayRow[] {
  const out: AshePayRow[] = [];
  for (const row of rows) {
    if (row.value == null || !Number.isFinite(Number(row.value))) continue;
    const notes = noteMap(row.notes);
    if (notes.measure !== measure || notes.sheet !== sheet) continue;
    const sic = (notes.sic || "").trim();
    if (!sic) continue;
    const classification = notes.classification === "section" ? "section" : "division";
    const changeRaw = notes.annual_pct_change;
    const annualPctChange =
      changeRaw && Number.isFinite(Number(changeRaw)) ? Number(changeRaw) : null;
    out.push({
      sic,
      label: (notes.label || sic).trim(),
      classification,
      median: Number(row.value),
      annualPctChange,
    });
  }
  return out;
}

export function asheSectionMedian(rows: AshePayRow[]): number | null {
  return rows.find((r) => r.classification === "section")?.median ?? null;
}

export function asheSectionChange(rows: AshePayRow[]): number | null {
  return rows.find((r) => r.classification === "section")?.annualPctChange ?? null;
}

/** Division ranks by median pay (section C excluded from the bars). */
export function asheDivisionRanks(rows: AshePayRow[]): { id: string; label: string; v: number }[] {
  return rows
    .filter((r) => r.classification === "division")
    .map((r) => ({
      id: r.sic,
      label: `${r.sic} · ${r.label.replace(/^Manufacture of /i, "").replace(/^MANUFACTURING$/i, "Manufacturing")}`,
      v: r.median,
    }))
    .sort((a, b) => b.v - a.v);
}

/**
 * Division ranks by the annual % change in the median exactly as ONS publishes it.
 * The prior-year pound figure is deliberately not derived here: ASHE publishes the
 * percentage, not last year's median, and a back-calculated £ would read as an ONS value.
 */
export function asheDivisionChangeRanks(
  rows: AshePayRow[],
): { id: string; label: string; v: number }[] {
  return rows
    .filter((r) => r.classification === "division" && r.annualPctChange != null)
    .map((r) => ({
      id: r.sic,
      label: `${r.sic} · ${r.label.replace(/^Manufacture of /i, "")}`,
      v: r.annualPctChange!,
    }))
    .sort((a, b) => b.v - a.v);
}
