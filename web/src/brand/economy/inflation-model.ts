import type { Observation } from "@/lib/api";
import { finalPts, toT, type Pt } from "../data";

export type InflationMeasure = "cpi" | "cpih";

/** CPIH COICOP division annual-rate pins (Orchestrator CDID map). */
export const CPIH_COICOP_DIVISIONS = [
  { id: "cpih-inflation-food", label: "Food & non-alcoholic beverages", div: "01" },
  { id: "cpih-inflation-alcohol-tobacco", label: "Alcoholic beverages & tobacco", div: "02" },
  { id: "cpih-inflation-clothing", label: "Clothing & footwear", div: "03" },
  { id: "cpih-inflation-housing", label: "Housing, water & fuels", div: "04" },
  { id: "cpih-inflation-furnishings", label: "Furnishings & household equipment", div: "05" },
  { id: "cpih-inflation-health", label: "Health", div: "06" },
  { id: "cpih-inflation-transport", label: "Transport", div: "07" },
  { id: "cpih-inflation-communication", label: "Communication", div: "08" },
  { id: "cpih-inflation-recreation", label: "Recreation & culture", div: "09" },
  { id: "cpih-inflation-education", label: "Education", div: "10" },
  { id: "cpih-inflation-restaurants", label: "Hotels, cafés & restaurants", div: "11" },
  { id: "cpih-inflation-miscellaneous", label: "Miscellaneous goods & services", div: "12" },
] as const;

/** CPIH COICOP division contributions to the all-items annual rate (pp). */
export const CPIH_CONTRIBUTION_DIVISIONS = [
  { id: "cpih-contribution-food", label: "Food & non-alcoholic beverages", div: "01" },
  { id: "cpih-contribution-alcohol-tobacco", label: "Alcoholic beverages & tobacco", div: "02" },
  { id: "cpih-contribution-clothing", label: "Clothing & footwear", div: "03" },
  { id: "cpih-contribution-housing", label: "Housing, water & fuels", div: "04" },
  { id: "cpih-contribution-furnishings", label: "Furnishings & household equipment", div: "05" },
  { id: "cpih-contribution-health", label: "Health", div: "06" },
  { id: "cpih-contribution-transport", label: "Transport", div: "07" },
  { id: "cpih-contribution-communication", label: "Communication", div: "08" },
  { id: "cpih-contribution-recreation", label: "Recreation & culture", div: "09" },
  { id: "cpih-contribution-education", label: "Education", div: "10" },
  { id: "cpih-contribution-restaurants", label: "Hotels, cafés & restaurants", div: "11" },
  { id: "cpih-contribution-miscellaneous", label: "Miscellaneous goods & services", div: "12" },
] as const;

export type CoicopDivisionId = (typeof CPIH_COICOP_DIVISIONS)[number]["id"];
export type CategoryLens = "contributions" | "rates";

export function asCategoryLens(raw: string | null): CategoryLens {
  return raw === "rates" ? "rates" : "contributions";
}

export function fmtPp(v: number): string {
  const abs = Math.abs(v).toFixed(2);
  if (v > 0) return `+${abs}`;
  if (v < 0) return `−${abs}`;
  return abs;
}

/** Everyday basket items (locked in economy.connectors.everyday_basket). */
export const BASKET_ITEMS = [
  { slug: "white-sliced-bread", label: "White sliced bread" },
  { slug: "wholemeal-sliced-bread", label: "Wholemeal sliced bread" },
  { slug: "whole-milk", label: "Whole milk" },
  { slug: "semi-skimmed-milk", label: "Semi-skimmed milk" },
  { slug: "eggs", label: "Eggs" },
  { slug: "butter", label: "Butter" },
  { slug: "bananas", label: "Bananas" },
  { slug: "white-potatoes", label: "White potatoes" },
  { slug: "instant-coffee", label: "Instant coffee" },
  { slug: "restaurant-coffee", label: "Restaurant cup of coffee" },
] as const;

export type BasketSlug = (typeof BASKET_ITEMS)[number]["slug"];

export function asMeasure(raw: string | null): InflationMeasure {
  return raw === "cpih" ? "cpih" : "cpi";
}

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

export function fmtRate(v: number): string {
  return `${v.toFixed(1)}%`;
}

export function fmtIndex(v: number): string {
  return v.toFixed(1);
}

export function fmtPrice(v: number): string {
  return v >= 1 ? `£${v.toFixed(2)}` : `${Math.round(v * 100)}p`;
}

/** Year-over-year change in annual rate (percentage points), latest vs 12 months earlier. */
export function rateYoYChangePp(rows: Observation[]): number | null {
  const ok = finalObs(rows);
  if (ok.length < 13) return null;
  const latest = ok[ok.length - 1]!;
  const prior = ok[ok.length - 13]!;
  return (latest.value as number) - (prior.value as number);
}

/* ——— What does £1 buy? (derived from an all-items index; never an ONS statistic) ——— */

/** Calendar-year averages of a monthly index, complete years only (12 months). */
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

export type PoundWorth = {
  year: number;
  /** Latest month's index ÷ the year's average index: what £1 of that year costs now. */
  ratio: number;
  /** Latest observation month, as a chart time. */
  latestT: number;
  /** Average yearly rise in prices between the base year's midpoint and the latest month. */
  perYear: number;
  /** £ needed in each later month for £1 of base-year goods. */
  path: Pt[];
};

export function poundWorth(rows: Observation[], year: number): PoundWorth | null {
  const base = annualAverages(rows).get(year);
  const pts = monthlyPoints(rows);
  const last = pts[pts.length - 1];
  if (base == null || !last) return null;
  const ratio = last.v / base;
  const years = last.t - (year + 0.5);
  return {
    year,
    ratio,
    latestT: last.t,
    perYear: years > 0 ? Math.pow(ratio, 1 / years) - 1 : 0,
    path: pts.filter((p) => p.t >= year).map((p) => ({ t: p.t, v: p.v / base })),
  };
}

export function fmtPounds(v: number): string {
  return `£${v.toFixed(2)}`;
}

export function fmtPence(v: number): string {
  return v >= 1 ? fmtPounds(v) : `${Math.round(v * 100)}p`;
}

/* ——— Categories (CPIH COICOP division annual rates) ——— */

export type CoicopRank = {
  id: string;
  label: string;
  v: number;
};

type DivisionSpec = { id: string; label: string };

/** Latest final month shared by every division pack (ISO period_start). */
export function coicopLatestMonth(
  packs: Record<string, { observations: Observation[] } | null | undefined>,
  divisions: readonly DivisionSpec[] = CPIH_COICOP_DIVISIONS,
): string | null {
  let latest: string | null = null;
  for (const div of divisions) {
    const rows = finalObs(packs[div.id]?.observations ?? []);
    const last = rows[rows.length - 1];
    if (!last) return null;
    if (latest == null || last.period_start < latest) latest = last.period_start;
  }
  return latest;
}

/** RankBars rows for one month of CPIH division values (signed). */
export function coicopRanksForMonth(
  packs: Record<string, { observations: Observation[] } | null | undefined>,
  periodStart: string,
  divisions: readonly DivisionSpec[] = CPIH_COICOP_DIVISIONS,
): CoicopRank[] {
  const rows: CoicopRank[] = [];
  for (const div of divisions) {
    const hit = finalObs(packs[div.id]?.observations ?? []).find(
      (r) => r.period_start === periodStart,
    );
    if (hit?.value == null) continue;
    rows.push({ id: div.id, label: div.label, v: hit.value });
  }
  return rows.sort((a, b) => b.v - a.v);
}

export function valueAtMonth(rows: Observation[], periodStart: string): number | null {
  const hit = finalObs(rows).find((r) => r.period_start === periodStart);
  return hit?.value ?? null;
}

/* ——— Everyday basket ——— */

function noteField(notes: string, key: string): string | null {
  const m = notes.match(new RegExp(`(?:^|;\\s*)${key}=([^;]+)`));
  return m?.[1]?.trim() ?? null;
}

export function basketCategory(row: Observation): string | null {
  return row.dimensions?.category ?? noteField(row.notes ?? "", "category");
}

export function basketRowsForItem(rows: Observation[], slug: string): Observation[] {
  return finalObs(rows).filter((r) => basketCategory(r) === slug);
}

/** Latest final month present for every basket item. */
export function basketLatestMonth(rows: Observation[]): string | null {
  let latest: string | null = null;
  for (const item of BASKET_ITEMS) {
    const itemRows = basketRowsForItem(rows, item.slug);
    const last = itemRows[itemRows.length - 1];
    if (!last) return null;
    if (latest == null || last.period_start < latest) latest = last.period_start;
  }
  return latest;
}

export function basketRanksForMonth(rows: Observation[], periodStart: string): CoicopRank[] {
  const out: CoicopRank[] = [];
  for (const item of BASKET_ITEMS) {
    const hit = basketRowsForItem(rows, item.slug).find((r) => r.period_start === periodStart);
    if (hit?.value == null) continue;
    out.push({ id: item.slug, label: item.label, v: hit.value });
  }
  return out.sort((a, b) => b.v - a.v);
}
