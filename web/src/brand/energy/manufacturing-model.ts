/**
 * Domain 08 — Manufacturing helpers (client-safe).
 * Production Anatomy: Ready IoP by SIC subsection/division + national section C measures.
 * Index ≠ % GVA ≠ thousands of jobs ≠ output-per-hour index — never one unmarked axis.
 * Branch index levels are not industry size — compare change, not raw ranks as shares.
 */

import type { IndicatorMeta, Observation } from "@/lib/api";
import { finalPts, toT, type Pt } from "../data";

/** Drop provisional / missing — Energy charts only plot final observations. */
function finalObs(rows: Observation[]): Observation[] {
  return rows.filter(
    (r) =>
      r.value != null &&
      Number.isFinite(Number(r.value)) &&
      r.observation_status === "final",
  );
}

export const OUTPUT_INDEX_ID = "manufacturing-output-index";
export const SHARE_GVA_ID = "manufacturing-share-of-gva";
export const EMPLOYMENT_ID = "manufacturing-employment";
export const OUTPUT_PER_HOUR_ID = "manufacturing-output-per-hour";
/** ONS DJ4P — manufacturing output per filled job (twin of DJK6). */
export const OUTPUT_PER_JOB_ID = "manufacturing-output-per-job";
/** ONS DK3V — manufacturing productivity hours index (formula component). */
export const PRODUCTIVITY_HOURS_ID = "manufacturing-productivity-hours";
/** ONS ASHE Table 4 — manufacturing median earnings by 2-digit SIC. */
export const ASHE_EARNINGS_ID = "ashe-manufacturing-earnings";
export const IOP_BY_DIVISION_ID = "manufacturing-iop-by-division";
/** ONS annual IoP GVA weights (parts per thousand of all production) — additive composition. */
export const IOP_WEIGHTS_ID = "manufacturing-iop-weights";
/** BRES Table 4 — manufacturing employee jobs by UK region (≠ Workforce Jobs). */
export const BRES_EMPLOYEE_JOBS_ID = "bres-manufacturing-employee-jobs-by-region";
/** Nomis open-access BRES — employee jobs by SIC division × GB region. */
export const BRES_BY_DIVISION_REGION_ID = "bres-manufacturing-jobs-by-division-region";

/** SIC 2007 subsections → constituent divisions (for Places when a broad branch is selected). */
export const SUBSECTION_DIVISIONS: Record<string, readonly string[]> = {
  CA: ["10", "11", "12"],
  CB: ["13", "14", "15"],
  CC: ["16", "17", "18"],
  CD: ["19"],
  CE: ["20"],
  CF: ["21"],
  CG: ["22", "23"],
  CH: ["24", "25"],
  CI: ["26"],
  CJ: ["27"],
  CK: ["28"],
  CL: ["29", "30"],
  CM: ["31", "32", "33"],
};

/** Anatomy measure (URL `measure`): composition by ONS weight, or volume index change. */
export const ANATOMY_MEASURES = ["share", "volume"] as const;
export type AnatomyMeasure = (typeof ANATOMY_MEASURES)[number];

export const IOP_LEVELS = ["subsection", "division"] as const;
export type IopLevel = (typeof IOP_LEVELS)[number];

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
  /** Ready DJ4P — output per job (Jobs Productivity Machine). */
  outputPerJob: SeriesPack | null;
  /** Ready DK3V — productivity hours index (Jobs formula component). */
  productivityHours: SeriesPack | null;
  /** Ready ASHE Table 4 manufacturing median earnings. */
  asheEarnings: SeriesPack | null;
  /** Ready DIOP subsections + divisions (multi-series). */
  iopByDivision: SeriesPack | null;
  /** ONS annual IoP weights by the same SIC breaks + section C (KM44). */
  iopWeights: SeriesPack | null;
  /** BRES Table 4 manufacturing employee jobs by region (all manufacturing). */
  bresByRegion: SeriesPack | null;
  /** Nomis BRES employee jobs by SIC division × GB region. */
  bresByDivisionRegion: SeriesPack | null;
};

export type IopBranch = {
  id: string;
  sic: string;
  label: string;
  classification: IopLevel | "combined_division" | "section";
};

function noteMap(notes: string | null | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  for (const part of (notes ?? "").split("; ")) {
    if (!part.includes("=")) continue;
    const i = part.indexOf("=");
    out[part.slice(0, i)] = part.slice(i + 1);
  }
  return out;
}

export function iopBranchOf(row: Observation): IopBranch | null {
  const dims = row.dimensions as { series?: string; category?: string } | undefined;
  const notes = noteMap(row.notes);
  const id = (dims?.series || notes.series || "").trim();
  if (!id) return null;
  const classification = (notes.classification || dims?.category || "division") as IopBranch["classification"];
  return {
    id,
    sic: (notes.sic || "").trim() || id,
    label: (notes.label || id).trim(),
    classification,
  };
}

export function listIopBranches(rows: Observation[], level: IopLevel): IopBranch[] {
  const want =
    level === "subsection"
      ? new Set(["subsection"])
      : new Set(["division", "combined_division"]);
  const byId = new Map<string, IopBranch>();
  for (const row of rows) {
    const b = iopBranchOf(row);
    if (!b || !want.has(b.classification)) continue;
    if (!byId.has(b.id)) byId.set(b.id, b);
  }
  return [...byId.values()].sort((a, b) => a.sic.localeCompare(b.sic, "en", { numeric: true }));
}

export function iopRowsForBranch(rows: Observation[], branchId: string): Observation[] {
  return rows.filter((r) => iopBranchOf(r)?.id === branchId);
}

export function iopBranchSeries(
  rows: Observation[],
  branch: IopBranch,
): { id: string; label: string; points: Pt[] } {
  const sorted = [...finalObs(iopRowsForBranch(rows, branch.id))].sort((a, b) =>
    a.period_start.localeCompare(b.period_start),
  );
  return {
    id: `iop-${branch.id}`,
    label: `${branch.label} · volume index`,
    points: finalPts(
      sorted.map((r) => ({
        t: toT(r.period_start),
        v: Number(r.value),
      })),
    ),
  };
}

export function iopBranchYearMean(rows: Observation[], branchId: string, year: number): number | null {
  const ms = finalObs(iopRowsForBranch(rows, branchId)).filter((r) =>
    r.period_start.startsWith(String(year)),
  );
  // Complete calendar year only — part years are not charted or compared.
  if (ms.length < 12) return null;
  return ms.reduce((s, r) => s + Number(r.value), 0) / ms.length;
}

/** % change in year-mean index — comparable across branches; not industry size. */
export function iopBranchPctChange(
  rows: Observation[],
  branchId: string,
  fromYear: number,
  toYear: number,
): number | null {
  const from = iopBranchYearMean(rows, branchId, fromYear);
  const to = iopBranchYearMean(rows, branchId, toYear);
  if (from == null || to == null) return null;
  return pctChange(from, to);
}

export function iopChangeRanks(
  rows: Observation[],
  level: IopLevel,
  fromYear: number,
  toYear: number,
): { id: string; label: string; v: number; from: number; to: number }[] {
  const out: { id: string; label: string; v: number; from: number; to: number }[] = [];
  for (const b of listIopBranches(rows, level)) {
    const from = iopBranchYearMean(rows, b.id, fromYear);
    const to = iopBranchYearMean(rows, b.id, toYear);
    const change = from != null && to != null ? pctChange(from, to) : null;
    if (change == null || from == null || to == null) continue;
    out.push({
      id: b.id,
      label: `${b.sic} · ${b.label}`,
      v: change,
      from,
      to,
    });
  }
  return out.sort((a, b) => Math.abs(b.v) - Math.abs(a.v));
}

export function iopYearsOf(rows: Observation[], level?: IopLevel): number[] {
  const scoped =
    level == null
      ? rows
      : rows.filter((r) => {
          const b = iopBranchOf(r);
          if (!b) return false;
          if (level === "subsection") return b.classification === "subsection";
          return b.classification === "division" || b.classification === "combined_division";
        });
  // Annual means pack already omits part/provisional years; monthly fallback uses finalObs.
  return yearsOf(finalObs(scoped));
}

export function yearsOf(rows: Observation[]): number[] {
  return [
    ...new Set(rows.map((r) => Number(r.period_start.slice(0, 4))).filter((y) => Number.isFinite(y))),
  ].sort((a, b) => a - b);
}

/** Complete calendar years with twelve final monthly observations. */
export function completeMonthlyYears(rows: Observation[]): number[] {
  const byYear = new Map<number, number>();
  for (const r of finalObs(rows)) {
    const y = Number(r.period_start.slice(0, 4));
    byYear.set(y, (byYear.get(y) ?? 0) + 1);
  }
  return [...byYear.entries()].filter(([, n]) => n >= 12).map(([y]) => y).sort((a, b) => a - b);
}

/** Complete calendar years with four final quarterly observations. */
export function completeQuarterlyYears(rows: Observation[]): number[] {
  const byYear = new Map<number, number>();
  for (const r of finalObs(rows)) {
    const y = Number(r.period_start.slice(0, 4));
    byYear.set(y, (byYear.get(y) ?? 0) + 1);
  }
  return [...byYear.entries()].filter(([, n]) => n >= 4).map(([y]) => y).sort((a, b) => a - b);
}

/** Monthly IoP manufacturing index → continuous monthly points (final only). */
export function outputIndexSeries(rows: Observation[]): { id: string; label: string; points: Pt[] } {
  const sorted = [...finalObs(rows)].sort((a, b) => a.period_start.localeCompare(b.period_start));
  return {
    id: "mfg-output-index",
    label: "Manufacturing output index",
    points: finalPts(sorted.map((r) => ({ t: toT(r.period_start), v: Number(r.value) }))),
  };
}

/** Mean of twelve final months in a calendar year (for figure strip). */
export function outputIndexYearMean(rows: Observation[], year: number): number | null {
  const ms = finalObs(rows).filter((r) => r.period_start.startsWith(String(year)));
  if (ms.length < 12) return null;
  return ms.reduce((s, r) => s + Number(r.value), 0) / ms.length;
}

export function shareSeries(rows: Observation[]): { id: string; label: string; points: Pt[] } {
  const sorted = [...finalObs(rows)].sort((a, b) => a.period_start.localeCompare(b.period_start));
  return {
    id: "mfg-share-gva",
    label: "Manufacturing share of GVA",
    points: finalPts(
      sorted.map((r) => ({
        t: Number(r.period_start.slice(0, 4)),
        v: Number(r.value),
      })),
    ),
  };
}

export function shareValueInYear(rows: Observation[], year: number): number | null {
  const row = finalObs(rows).find((r) => r.period_start.startsWith(String(year)));
  return row?.value != null && Number.isFinite(Number(row.value)) ? Number(row.value) : null;
}

export function employmentSeries(rows: Observation[]): { id: string; label: string; points: Pt[] } {
  const sorted = [...finalObs(rows)].sort((a, b) => a.period_start.localeCompare(b.period_start));
  return {
    id: "mfg-employment",
    label: "Manufacturing workforce jobs",
    points: finalPts(sorted.map((r) => ({ t: toT(r.period_start), v: Number(r.value) }))),
  };
}

/** Mean of four final quarters in a calendar year. */
export function employmentYearMean(rows: Observation[], year: number): number | null {
  const qs = finalObs(rows).filter((r) => r.period_start.startsWith(String(year)));
  if (qs.length < 4) return null;
  return qs.reduce((s, r) => s + Number(r.value), 0) / qs.length;
}

export function productivitySeries(rows: Observation[]): { id: string; label: string; points: Pt[] } {
  const sorted = [...finalObs(rows)].sort((a, b) => a.period_start.localeCompare(b.period_start));
  return {
    id: "mfg-output-per-hour",
    label: "Manufacturing output per hour",
    points: finalPts(sorted.map((r) => ({ t: toT(r.period_start), v: Number(r.value) }))),
  };
}

export function outputPerJobSeries(rows: Observation[]): { id: string; label: string; points: Pt[] } {
  const sorted = [...finalObs(rows)].sort((a, b) => a.period_start.localeCompare(b.period_start));
  return {
    id: "mfg-output-per-job",
    label: "Manufacturing output per job",
    points: finalPts(sorted.map((r) => ({ t: toT(r.period_start), v: Number(r.value) }))),
  };
}

export function productivityHoursSeries(rows: Observation[]): {
  id: string;
  label: string;
  points: Pt[];
} {
  const sorted = [...finalObs(rows)].sort((a, b) => a.period_start.localeCompare(b.period_start));
  return {
    id: "mfg-productivity-hours",
    label: "Manufacturing productivity hours",
    points: finalPts(sorted.map((r) => ({ t: toT(r.period_start), v: Number(r.value) }))),
  };
}

export function productivityYearMean(rows: Observation[], year: number): number | null {
  const qs = finalObs(rows).filter((r) => r.period_start.startsWith(String(year)));
  if (qs.length < 4) return null;
  return qs.reduce((s, r) => s + Number(r.value), 0) / qs.length;
}

/** Mean of published quarters — same rule for DJ4P / DK3V as DJK6. */
export const outputPerJobYearMean = productivityYearMean;
export const productivityHoursYearMean = productivityYearMean;

export function fmtIndex(v: number): string {
  return v.toLocaleString("en-GB", { maximumFractionDigits: 1 });
}

export function fmtSharePct(v: number): string {
  return `${v.toLocaleString("en-GB", { maximumFractionDigits: 1 })}%`;
}

export function fmtJobsThousands(v: number): string {
  return `${v.toLocaleString("en-GB", { maximumFractionDigits: 0 })}k`;
}

/** BRES employee-jobs values are already in thousands. */
export function fmtBresThousands(v: number): string {
  return v.toLocaleString("en-GB", { maximumFractionDigits: 1 });
}

export function pctChange(from: number, to: number): number | null {
  if (!Number.isFinite(from) || !Number.isFinite(to) || from === 0) return null;
  return ((to - from) / from) * 100;
}

export function bresYearsOf(rows: Observation[]): number[] {
  return yearsOf(rows.filter((r) => r.value != null && Number.isFinite(Number(r.value))));
}

export function bresValueInYear(
  rows: Observation[],
  geographyCode: string,
  year: number,
): number | null {
  const row = rows.find(
    (r) =>
      r.geography_code === geographyCode &&
      r.period_start.startsWith(String(year)) &&
      r.value != null &&
      Number.isFinite(Number(r.value)),
  );
  return row?.value != null ? Number(row.value) : null;
}

/** Regional ranks for one year — employee jobs, not plant counts. */
export function bresRankForYear(
  rows: Observation[],
  year: number,
): { id: string; label: string; v: number }[] {
  const byCode = new Map<string, { label: string; v: number }>();
  for (const r of rows) {
    if (!r.period_start.startsWith(String(year))) continue;
    if (r.value == null || !Number.isFinite(Number(r.value))) continue;
    const code = r.geography_code || r.geography_label || "";
    if (!code) continue;
    byCode.set(code, {
      label: r.geography_label || code,
      v: Number(r.value),
    });
  }
  return [...byCode.entries()]
    .map(([id, row]) => ({ id, label: row.label, v: row.v }))
    .sort((a, b) => b.v - a.v);
}

/** % change in employee jobs by region — comparable ranks, not a plant map. */
export function bresChangeRanks(
  rows: Observation[],
  fromYear: number,
  toYear: number,
): { id: string; label: string; v: number; from: number; to: number }[] {
  const codes = new Set(
    rows.map((r) => r.geography_code).filter((c): c is string => Boolean(c)),
  );
  const out: { id: string; label: string; v: number; from: number; to: number }[] = [];
  for (const code of codes) {
    const from = bresValueInYear(rows, code, fromYear);
    const to = bresValueInYear(rows, code, toYear);
    const change = from != null && to != null ? pctChange(from, to) : null;
    if (change == null || from == null || to == null) continue;
    const label =
      rows.find((r) => r.geography_code === code)?.geography_label || code;
    out.push({ id: code, label, v: change, from, to });
  }
  return out.sort((a, b) => Math.abs(b.v) - Math.abs(a.v));
}

export function bresRegionCount(rows: Observation[], year: number): number {
  return bresRankForYear(rows, year).length;
}

export function bresUkSum(rows: Observation[], year: number): number | null {
  const ranks = bresRankForYear(rows, year);
  if (!ranks.length) return null;
  return ranks.reduce((s, r) => s + r.v, 0);
}

/** SIC codes that make up an Anatomy branch, for Places Nomis filtering. */
export function bresSicCodesForBranch(branch: IopBranch): string[] {
  if (branch.classification === "subsection") {
    return [...(SUBSECTION_DIVISIONS[branch.sic] ?? [])];
  }
  if (branch.sic.includes("+")) {
    return branch.sic.split("+").map((s) => s.trim()).filter(Boolean);
  }
  return branch.sic ? [branch.sic] : [];
}

function noteSic(row: Observation): string {
  const notes = noteMap(row.notes);
  return (notes.sic || "").trim();
}

/**
 * Nomis division×region rows for one Anatomy branch.
 * Divisions filter directly; subsections sum their divisions per region×year.
 */
export function bresDivisionRowsForBranch(
  rows: Observation[],
  branch: IopBranch,
): Observation[] {
  const sics = new Set(bresSicCodesForBranch(branch));
  if (!sics.size) return [];
  const matched = rows.filter((r) => sics.has(noteSic(r)));
  if (sics.size === 1) return matched;

  const keyed = new Map<string, Observation>();
  for (const r of matched) {
    if (r.value == null || !Number.isFinite(Number(r.value))) continue;
    const key = `${r.period_start}|${r.geography_code}`;
    const prev = keyed.get(key);
    if (!prev) {
      keyed.set(key, {
        ...r,
        value: Number(r.value),
        notes: `${r.notes}; aggregate_sics=${[...sics].join("+")}`,
      });
      continue;
    }
    keyed.set(key, {
      ...prev,
      value: Number(prev.value) + Number(r.value),
    });
  }
  return [...keyed.values()];
}

/* ——— Anatomy: ONS IoP weights ——— */

/** Section C weight (parts per thousand of all production) for a year. */
export function sectionWeight(rows: Observation[], year: number): number | null {
  const row = rows.find(
    (r) => r.period_start.startsWith(String(year)) && iopBranchOf(r)?.classification === "section",
  );
  return row?.value != null && Number.isFinite(Number(row.value)) ? Number(row.value) : null;
}

export function weightYearsOf(rows: Observation[]): number[] {
  return yearsOf(rows.filter((r) => r.value != null && iopBranchOf(r)?.classification === "section"));
}

export function branchWeight(rows: Observation[], branchId: string, year: number): number | null {
  const row = rows.find((r) => r.period_start.startsWith(String(year)) && iopBranchOf(r)?.id === branchId);
  return row?.value != null && Number.isFinite(Number(row.value)) ? Number(row.value) : null;
}

/** Branch share of manufacturing (%) = branch weight ÷ section C weight, same year. */
export function branchShare(rows: Observation[], branchId: string, year: number): number | null {
  const w = branchWeight(rows, branchId, year);
  const c = sectionWeight(rows, year);
  return w != null && c != null && c > 0 ? (w / c) * 100 : null;
}

export type CompositionCell = {
  id: string;
  sic: string;
  label: string;
  /** Share of manufacturing, % (cells at one level sum to ~100). */
  share: number;
  /** Published weight, parts per thousand of all production. */
  weight: number;
};

/** One year's composition at a level, in SIC order. Branches come from the index catalogue. */
export function compositionFor(
  weightRows: Observation[],
  branches: IopBranch[],
  year: number,
): CompositionCell[] {
  const c = sectionWeight(weightRows, year);
  if (c == null || c <= 0) return [];
  const out: CompositionCell[] = [];
  for (const b of branches) {
    const w = branchWeight(weightRows, b.id, year);
    if (w == null) continue;
    out.push({ id: b.id, sic: b.sic, label: b.label, share: (w / c) * 100, weight: w });
  }
  return out;
}

export function branchShareSeries(
  rows: Observation[],
  branch: IopBranch,
): { id: string; label: string; points: Pt[] } {
  const points: Pt[] = [];
  for (const y of weightYearsOf(rows)) {
    const v = branchShare(rows, branch.id, y);
    if (v != null) points.push({ t: y, v });
  }
  return { id: `share-${branch.id}`, label: `${branch.label} · share of manufacturing`, points };
}

export function fmtShareOfMfg(v: number): string {
  return `${v.toLocaleString("en-GB", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
}
