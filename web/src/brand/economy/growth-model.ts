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

export function asLedgerBase(raw: string | null, rows: Observation[]): string {
  const available = availableLedgerBases(rows);
  if (raw && available.some((b) => b.period === raw)) return raw;
  if (available.some((b) => b.period === PRE_PANDEMIC_Q4)) return PRE_PANDEMIC_Q4;
  return available[0]?.period ?? PRE_PANDEMIC_Q4;
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
