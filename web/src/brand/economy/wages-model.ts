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

/** Monthly observations → TimeChart points (final only). */
export function monthlyPoints(rows: Observation[]): Pt[] {
  return finalPts(
    finalObs(rows).map((r) => ({
      t: toT(r.period_start),
      v: r.value as number,
      provisional: false,
    })),
  );
}

export function fmtGbpWeek(v: number): string {
  return `£${v.toFixed(0)}`;
}

export function fmtIndex(v: number): string {
  return v.toFixed(1);
}

export function fmtPct1(v: number): string {
  return `${v >= 0 ? "+" : "−"}${Math.abs(v).toFixed(1)}%`;
}

/**
 * Rebase two series so the first shared month is 100 on both.
 * Used for "pay vs prices" — levels are not comparable; growth shape is.
 */
export function rebasedPair(primary: Pt[], companion: Pt[]): { a: Pt[]; b: Pt[]; baseT: number | null } {
  if (!primary.length || !companion.length) return { a: [], b: [], baseT: null };
  const companionByT = new Map(companion.map((p) => [p.t.toFixed(6), p.v]));
  let baseT: number | null = null;
  let a0 = NaN;
  let b0 = NaN;
  for (const p of primary) {
    const c = companionByT.get(p.t.toFixed(6));
    if (c == null || !Number.isFinite(c) || !Number.isFinite(p.v) || p.v === 0 || c === 0) continue;
    baseT = p.t;
    a0 = p.v;
    b0 = c;
    break;
  }
  if (baseT == null) return { a: [], b: [], baseT: null };
  return {
    baseT,
    a: primary.map((p) => ({ t: p.t, v: (p.v / a0) * 100 })),
    b: companion.map((p) => ({ t: p.t, v: (p.v / b0) * 100 })),
  };
}

/** Twelve-month % change at every month that has a final observation a year earlier. */
export function yoyPoints(rows: Observation[]): Pt[] {
  const ok = finalObs(rows);
  const byKey = new Map(ok.map((r) => [r.period_start.slice(0, 7), r.value as number]));
  const out: Pt[] = [];
  for (const r of ok) {
    const y = Number(r.period_start.slice(0, 4)) - 1;
    const prior = byKey.get(`${y}-${r.period_start.slice(5, 7)}`);
    if (prior == null || prior === 0) continue;
    out.push({ t: toT(r.period_start), v: ((r.value as number) / prior - 1) * 100, provisional: false });
  }
  return out;
}

/** Points from the first month of `fromYear` onwards (inclusive). */
export function pointsFrom(points: Pt[], fromYear: number): Pt[] {
  return points.filter((p) => p.t >= fromYear);
}

/** Calendar years covered by a monthly series, ascending. */
export function seriesYears(points: Pt[]): number[] {
  const years = new Set<number>();
  for (const p of points) years.add(Math.floor(p.t));
  return [...years].sort((a, b) => a - b);
}

export function yoyPct(rows: Observation[]): number | null {
  const ok = finalObs(rows);
  if (ok.length < 13) return null;
  const latest = ok[ok.length - 1]!.value as number;
  const prior = ok[ok.length - 13]!.value as number;
  if (!prior) return null;
  return ((latest - prior) / prior) * 100;
}

/* ——— The Value of Work (real AWE levels) ——— */

/** Calendar-year averages of a monthly £/week series (complete years only). */
export function annualAverages(rows: Observation[]): Map<number, number> {
  const acc = new Map<number, { sum: number; n: number }>();
  for (const r of finalObs(rows)) {
    const y = Number(r.period_start.slice(0, 4));
    const a = acc.get(y) ?? { sum: 0, n: 0 };
    a.sum += r.value as number;
    a.n += 1;
    acc.set(y, a);
  }
  const out = new Map<number, number>();
  for (const [y, a] of acc) if (a.n === 12) out.set(y, a.sum / a.n);
  return out;
}

export type SeriesPeak = {
  t: number;
  v: number;
  periodStart: string;
};

/** Highest final observation in the published series (observed peak, not "all-time forever"). */
export function seriesPeak(rows: Observation[]): SeriesPeak | null {
  const ok = finalObs(rows);
  if (!ok.length) return null;
  let best = ok[0]!;
  for (const r of ok) {
    if ((r.value as number) > (best.value as number)) best = r;
  }
  return {
    t: toT(best.period_start),
    v: best.value as number,
    periodStart: best.period_start,
  };
}

export type ValueOfWork = {
  year: number;
  yearAvg: number;
  latest: number;
  latestT: number;
  /** Latest ÷ year average − 1. */
  vsYearPct: number;
  peak: SeriesPeak;
  /** Latest − peak (usually ≤ 0). */
  belowPeak: number;
  /** (Latest − peak) / peak. */
  belowPeakPct: number;
};

/** ASHE ladder sheets available in the national Table 1 pin. */
export type AsheSheet = "All" | "Full-Time" | "Part-Time";

export function asAsheSheet(raw: string | null): AsheSheet {
  return raw === "Full-Time" || raw === "Part-Time" ? raw : "All";
}

export function asheSheetLabel(sheet: AsheSheet): string {
  return sheet === "Full-Time" ? "full-time" : sheet === "Part-Time" ? "part-time" : "all";
}

/** Editions (one April each) in an ASHE pin, oldest first. */
export function asheEditions(rows: Observation[]): string[] {
  return [...new Set(rows.map((r) => r.period_start))].sort();
}

/** "April 2026 provisional" / "April 2025 revised" from the pin's own edition note. */
export function asheEditionLabel(rows: Observation[], periodStart: string | null): string {
  if (!periodStart) return "";
  const row = rows.find((r) => r.period_start === periodStart);
  const year = periodStart.slice(0, 4);
  const edition = noteField(row?.notes, "edition") ?? "";
  const kind = edition.includes("provisional")
    ? "provisional"
    : edition.includes("revised")
      ? "revised"
      : row?.observation_status === "provisional"
        ? "provisional"
        : "";
  return `April ${year}${kind ? ` ${kind}` : ""}`;
}

export type AsheLadderPoint = {
  id: string;
  label: string;
  v: number;
  /** Sort key: p10…p90 then median then mean last. */
  order: number;
};

const STAT_ORDER: Record<string, number> = {
  p10: 10,
  p20: 20,
  p25: 25,
  p30: 30,
  p40: 40,
  median: 50,
  p60: 60,
  p70: 70,
  p75: 75,
  p80: 80,
  p90: 90,
  mean: 1000,
};

const STAT_LABEL: Record<string, string> = {
  p10: "10th percentile",
  p20: "20th",
  p25: "25th (lower quartile)",
  p30: "30th",
  p40: "40th",
  median: "Median (50th)",
  p60: "60th",
  p70: "70th",
  p75: "75th (upper quartile)",
  p80: "80th",
  p90: "90th percentile",
  mean: "Mean",
};

function noteField(notes: string | undefined, key: string): string | null {
  if (!notes) return null;
  const hit = notes.split(";").map((p) => p.trim()).find((p) => p.startsWith(`${key}=`));
  return hit ? hit.slice(key.length + 1) : null;
}

/** Most recent April in an ASHE pin (latest edition). */
export function latestAshePeriod(rows: Observation[]): string | null {
  let best: string | null = null;
  for (const r of rows) if (best == null || r.period_start > best) best = r.period_start;
  return best;
}

/** Rows for one April only (default: the latest edition in the pin). */
export function asheEdition(rows: Observation[], periodStart?: string | null): Observation[] {
  const p = periodStart ?? latestAshePeriod(rows);
  return p ? rows.filter((r) => r.period_start === p) : rows;
}

/**
 * Wage-ladder ranks from ASHE Table 1.
 * Includes provisional edition rows (the whole pin is one April snapshot).
 * Mean is kept for Notes honesty but omitted from the default ladder bars.
 */
export function asheLadderRanks(
  rows: Observation[],
  sheet: AsheSheet,
  includeMean = false,
  periodStart?: string | null,
): AsheLadderPoint[] {
  const out: AsheLadderPoint[] = [];
  for (const r of asheEdition(rows, periodStart)) {
    if (r.value == null || !Number.isFinite(r.value)) continue;
    if (noteField(r.notes, "sheet") !== sheet) continue;
    const statistic = noteField(r.notes, "statistic");
    if (!statistic || (!(statistic in STAT_ORDER))) continue;
    if (statistic === "mean" && !includeMean) continue;
    out.push({
      id: statistic,
      label: STAT_LABEL[statistic] ?? statistic,
      v: r.value as number,
      order: STAT_ORDER[statistic] ?? 999,
    });
  }
  return out.sort((a, b) => a.order - b.order);
}

export function asheStatistic(
  rows: Observation[],
  sheet: AsheSheet,
  statistic: string,
  periodStart?: string | null,
): number | null {
  for (const r of asheEdition(rows, periodStart)) {
    if (r.value == null || !Number.isFinite(r.value)) continue;
    if (noteField(r.notes, "sheet") !== sheet) continue;
    if (noteField(r.notes, "statistic") === statistic) return r.value as number;
  }
  return null;
}

/* ——— Geography of Pay (ASHE Table 7 workplace) ——— */

export type AsheGeoPoint = {
  code: string;
  label: string;
  v: number;
  classification: string;
};

/** One geography × sheet median from Table 7 (includes provisional edition rows). */
export function asheRegionalPoints(
  rows: Observation[],
  sheet: AsheSheet,
  classification?: string,
  periodStart?: string | null,
): AsheGeoPoint[] {
  const out: AsheGeoPoint[] = [];
  for (const r of asheEdition(rows, periodStart)) {
    if (r.value == null || !Number.isFinite(r.value)) continue;
    if (noteField(r.notes, "sheet") !== sheet) continue;
    if (noteField(r.notes, "statistic") !== "median") continue;
    if (noteField(r.notes, "basis") !== "workplace") continue;
    const cls = noteField(r.notes, "classification") ?? "other";
    if (classification && cls !== classification) continue;
    out.push({
      code: r.geography_code,
      label: r.geography_label,
      v: r.value as number,
      classification: cls,
    });
  }
  return out.sort((a, b) => b.v - a.v || a.label.localeCompare(b.label));
}

export function asheRegionalValue(
  rows: Observation[],
  sheet: AsheSheet,
  code: string,
  periodStart?: string | null,
): number | null {
  for (const r of asheEdition(rows, periodStart)) {
    if (r.value == null || !Number.isFinite(r.value)) continue;
    if (r.geography_code !== code) continue;
    if (noteField(r.notes, "sheet") !== sheet) continue;
    if (noteField(r.notes, "statistic") !== "median") continue;
    return r.value as number;
  }
  return null;
}

/**
 * Distance below the highest earlier month, as % (0 = at a new high).
 * Exchange-derived from the published real pay series.
 */
export function drawdownPoints(points: Pt[]): Pt[] {
  let high = -Infinity;
  return points.map((p) => {
    if (p.v > high) high = p.v;
    return { t: p.t, v: high > 0 ? (p.v / high - 1) * 100 : 0, provisional: false };
  });
}

export type WorkComparison = {
  fromYear: number;
  fromAvg: number;
  /** Null = latest month. */
  toYear: number | null;
  toValue: number;
  toT: number;
  toLabel: string;
  changePct: number;
  verdict: "more" | "less" | "same";
  peak: SeriesPeak;
  belowPeakPct: number;
  latest: number;
  latestT: number;
};

/** Real pay in one calendar year against another year or the latest month. */
export function compareWork(
  rows: Observation[],
  fromYear: number,
  toYear: number | null,
): WorkComparison | null {
  const avgs = annualAverages(rows);
  const fromAvg = avgs.get(fromYear);
  const pts = monthlyPoints(rows);
  const last = pts[pts.length - 1];
  const peak = seriesPeak(rows);
  if (fromAvg == null || !last || !peak) return null;
  let toValue = last.v;
  let toT = last.t;
  let toLabel = "Now";
  if (toYear != null) {
    const a = avgs.get(toYear);
    if (a == null) return null;
    toValue = a;
    toT = toYear + 0.5;
    toLabel = `${toYear} average`;
  }
  const changePct = (toValue / fromAvg - 1) * 100;
  return {
    fromYear,
    fromAvg,
    toYear,
    toValue,
    toT,
    toLabel,
    changePct,
    verdict: Math.abs(changePct) < 1 ? "same" : changePct > 0 ? "more" : "less",
    peak,
    belowPeakPct: peak.v !== 0 ? (last.v / peak.v - 1) * 100 : 0,
    latest: last.v,
    latestT: last.t,
  };
}

/* ——— Industry lens (ASHE Table 4 UK sections · Table 5 region × section) ——— */

/** Plain names for SIC 2007 sections, for the public UI. */
export const SIC_SECTION_LABEL: Record<string, string> = {
  A: "Farming, forestry and fishing",
  B: "Mining and quarrying",
  C: "Manufacturing",
  D: "Electricity and gas",
  E: "Water and waste",
  F: "Construction",
  G: "Retail and wholesale",
  H: "Transport and storage",
  I: "Hotels and restaurants",
  J: "Information and communication",
  K: "Finance and insurance",
  L: "Property",
  M: "Professional and scientific",
  N: "Administrative and support",
  O: "Public administration and defence",
  P: "Education",
  Q: "Health and social work",
  R: "Arts and recreation",
  S: "Other services",
  T: "Households as employers",
  U: "International organisations",
};

export function sicLabel(code: string): string {
  return SIC_SECTION_LABEL[code] ?? code;
}

export type AsheIndustryPoint = {
  sic: string;
  label: string;
  v: number;
};

/** UK median by SIC section from Table 4 (latest edition by default). */
export function asheIndustryPoints(
  rows: Observation[],
  sheet: AsheSheet,
  periodStart?: string | null,
): AsheIndustryPoint[] {
  const out: AsheIndustryPoint[] = [];
  for (const r of asheEdition(rows, periodStart)) {
    if (r.value == null || !Number.isFinite(r.value)) continue;
    if (noteField(r.notes, "sheet") !== sheet) continue;
    if (noteField(r.notes, "statistic") !== "median") continue;
    const sic = noteField(r.notes, "sic");
    if (!sic) continue;
    out.push({ sic, label: sicLabel(sic), v: r.value as number });
  }
  return out.sort((a, b) => b.v - a.v || a.label.localeCompare(b.label));
}

/** One industry's workplace median across places from Table 5. */
export function asheRegionIndustryByPlace(
  rows: Observation[],
  sheet: AsheSheet,
  sic: string,
  periodStart?: string | null,
): AsheGeoPoint[] {
  const out: AsheGeoPoint[] = [];
  for (const r of asheEdition(rows, periodStart)) {
    if (r.value == null || !Number.isFinite(r.value)) continue;
    if (noteField(r.notes, "sheet") !== sheet) continue;
    if (noteField(r.notes, "statistic") !== "median") continue;
    if (noteField(r.notes, "sic") !== sic) continue;
    out.push({
      code: r.geography_code,
      label: r.geography_label,
      v: r.value as number,
      classification: r.geography_code.startsWith("E12") ? "region" : "nation",
    });
  }
  return out.sort((a, b) => b.v - a.v || a.label.localeCompare(b.label));
}

/** One place's workplace medians across industries from Table 5. */
export function asheRegionIndustryByIndustry(
  rows: Observation[],
  sheet: AsheSheet,
  code: string,
  periodStart?: string | null,
): AsheIndustryPoint[] {
  const out: AsheIndustryPoint[] = [];
  for (const r of asheEdition(rows, periodStart)) {
    if (r.value == null || !Number.isFinite(r.value)) continue;
    if (r.geography_code !== code) continue;
    if (noteField(r.notes, "sheet") !== sheet) continue;
    if (noteField(r.notes, "statistic") !== "median") continue;
    const sic = noteField(r.notes, "sic");
    if (!sic) continue;
    out.push({ sic, label: sicLabel(sic), v: r.value as number });
  }
  return out.sort((a, b) => b.v - a.v || a.label.localeCompare(b.label));
}

/** Industry sections present in a Table 5 pin, in SIC order. */
export function asheSections(rows: Observation[]): string[] {
  const out = new Set<string>();
  for (const r of rows) {
    const sic = noteField(r.notes, "sic");
    if (sic) out.add(sic);
  }
  return [...out].sort();
}

export function valueOfWork(rows: Observation[], year: number): ValueOfWork | null {
  const avgs = annualAverages(rows);
  const yearAvg = avgs.get(year);
  const pts = monthlyPoints(rows);
  const last = pts[pts.length - 1];
  const peak = seriesPeak(rows);
  if (yearAvg == null || !last || !peak) return null;
  return {
    year,
    yearAvg,
    latest: last.v,
    latestT: last.t,
    vsYearPct: last.v / yearAvg - 1,
    peak,
    belowPeak: last.v - peak.v,
    belowPeakPct: peak.v !== 0 ? last.v / peak.v - 1 : 0,
  };
}

/* ——— Lost and gained purchasing power: the longest spell below a previous high ——— */

export type RecoverySpell = {
  /** Month the previous high was set. */
  peakT: number;
  peakV: number;
  /** Lowest month inside the spell. */
  troughT: number;
  troughV: number;
  /** Month the high was regained; null if still below at the end of the window. */
  regainedT: number | null;
  /** Months from the high to regaining it (or to the window end if not regained). */
  months: number;
};

/**
 * Longest stretch below an earlier high that overlaps [fromT, toT], from monthly points.
 * Highs are running maxima over the whole published series, so the first month cannot be a spell.
 */
export function longestSpellBelowHigh(points: Pt[], fromT: number, toT: number): RecoverySpell | null {
  const spells: RecoverySpell[] = [];
  let high = -Infinity;
  let highT = NaN;
  let open: RecoverySpell | null = null;
  for (const p of points) {
    if (p.t > toT + 1e-6) break;
    if (p.v >= high) {
      if (open) {
        open.regainedT = p.t;
        open.months = Math.round((p.t - open.peakT) * 12);
        spells.push(open);
        open = null;
      }
      high = p.v;
      highT = p.t;
      continue;
    }
    if (!open) open = { peakT: highT, peakV: high, troughT: p.t, troughV: p.v, regainedT: null, months: 0 };
    if (p.v < open.troughV) {
      open.troughV = p.v;
      open.troughT = p.t;
    }
  }
  if (open) {
    open.months = Math.round((toT - open.peakT) * 12);
    spells.push(open);
  }
  const overlapping = spells.filter((sp) => (sp.regainedT ?? toT) >= fromT - 1e-6 && sp.peakT <= toT + 1e-6);
  if (!overlapping.length) return null;
  return overlapping.reduce((a, b) => (b.months > a.months ? b : a));
}

export function fmtMonths(months: number): string {
  const y = Math.floor(months / 12);
  const m = months % 12;
  const parts: string[] = [];
  if (y) parts.push(`${y} year${y === 1 ? "" : "s"}`);
  if (m || !y) parts.push(`${m} month${m === 1 ? "" : "s"}`);
  return parts.join(" ");
}
