/**
 * Domain 04 deepen — Cost of Living, Household Ledger, Financial Buffer, Weight of Debt.
 *
 * Parse published `notes` keys only. Do not invent an essentials basket, a
 * reconciled household budget, or a splice of WAS rounds.
 */

import type { Observation } from "@/lib/api";
import { toT, type Pt } from "../data";
import { finiteObs } from "./household-model";

export const LCF_FYE_2025_START = "2024-04-01";
export const WAS_ROUND8_START = "2020-04-01";
export const WAS_ROUND8_LABEL = "April 2020 to March 2022";

const SKIP_YEAR_VARIANT = "census1991_weights";

/** Headline LCF groups plotted as composition (not the 1–12 subtotal or total). */
export const SPEND_GROUPS = [
  "food",
  "alcohol_tobacco",
  "clothing",
  "housing_fuel_power",
  "household_goods",
  "health",
  "transport",
  "communication",
  "recreation",
  "education",
  "restaurants_hotels",
  "miscellaneous",
  "other_items",
] as const;

export type SpendGroup = (typeof SPEND_GROUPS)[number];

/** Published groups the Cost view offers as “essentials” shares — no custom basket. */
export const ESSENTIAL_GROUPS = ["food", "housing_fuel_power", "transport"] as const;

export type EssentialGroup = (typeof ESSENTIAL_GROUPS)[number];

const QUINTILE_ORDER = ["lowest", "2nd", "3rd", "4th", "highest"] as const;

const QUINTILE_LABEL: Record<string, string> = {
  lowest: "Lowest-income fifth",
  "2nd": "2nd fifth",
  "3rd": "3rd fifth",
  "4th": "4th fifth",
  highest: "Highest-income fifth",
  all: "All households",
};

const WEALTH_BAND_ORDER = [
  "less-than-minus-5000",
  "minus-5000-to-minus-500",
  "minus-500-to-minus-0",
  "0-to-500",
  "500-to-5000",
  "5000-to-12500",
  "12500-to-25000",
  "25000-to-50000",
  "50000-to-100000",
  "100000-or-more",
] as const;

const WEALTH_BAND_LABEL: Record<string, string> = {
  "less-than-minus-5000": "Less than −£5,000",
  "minus-5000-to-minus-500": "−£5,000 to −£500",
  "minus-500-to-minus-0": "−£500 to £0",
  "0-to-500": "£0 to £500",
  "500-to-5000": "£500 to £5,000",
  "5000-to-12500": "£5,000 to £12,500",
  "12500-to-25000": "£12,500 to £25,000",
  "25000-to-50000": "£25,000 to £50,000",
  "50000-to-100000": "£50,000 to £100,000",
  "100000-or-more": "£100,000 or more",
};

const COVERAGE_ORDER = [
  "any-formal-including-current-in-credit",
  "savings-accounts",
  "isas",
] as const;

const COVERAGE_LABEL: Record<string, string> = {
  "any-formal-including-current-in-credit": "Any formal financial assets",
  "savings-accounts": "Savings accounts",
  isas: "ISAs",
};

const DECILE_ORDER = [
  "income-decile-1",
  "income-decile-2",
  "income-decile-3",
  "income-decile-4",
  "income-decile-5",
  "income-decile-6",
  "income-decile-7",
  "income-decile-8",
  "income-decile-9",
  "income-decile-10",
] as const;

const FALLBACK_GROUP_LABEL: Record<string, string> = {
  food: "Food and non-alcoholic drinks",
  alcohol_tobacco: "Alcohol, tobacco and narcotics",
  clothing: "Clothing and footwear",
  housing_fuel_power: "Housing (net), fuel and power",
  household_goods: "Household goods and services",
  health: "Health",
  transport: "Transport",
  communication: "Communication",
  recreation: "Recreation and culture",
  education: "Education",
  restaurants_hotels: "Restaurants and hotels",
  miscellaneous: "Miscellaneous goods and services",
  other_items: "Other expenditure items",
  total: "Total expenditure",
};

export type RankRow = { id: string; label: string; v: number };

export type CostMeasure = "weekly" | "share";
export type LedgerMeasure = "category" | "quintile";
export type CreditMeasure = "total" | "credit-cards" | "other" | "all";

export function asCostMeasure(raw: string | null): CostMeasure {
  return raw === "share" ? "share" : "weekly";
}

export function asLedgerMeasure(raw: string | null): LedgerMeasure {
  return raw === "quintile" ? "quintile" : "category";
}

export function asCreditMeasure(raw: string | null): CreditMeasure {
  if (raw === "credit-cards" || raw === "other" || raw === "all") return raw;
  return "total";
}

export function parseNotes(notes: string | null | undefined): Record<string, string> {
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

function note(row: Observation): Record<string, string> {
  return parseNotes(row.notes);
}

function keepSpendYear(n: Record<string, string>): boolean {
  return n.year_variant !== SKIP_YEAR_VARIANT;
}

export function groupLabel(slug: string, published?: string): string {
  const text = (published || "")
    .replace(/\s+/g, " ")
    .trim()
    // Drop ONS footnote digits glued to words ("(net)4, fuel").
    .replace(/(?<=[A-Za-z)])\d+(?=[,.\s]|$)/g, "");
  if (text) return text;
  return FALLBACK_GROUP_LABEL[slug] ?? slug.replace(/_/g, " ");
}

export function quintileLabel(band: string, published?: string): string {
  if (QUINTILE_LABEL[band]) return QUINTILE_LABEL[band];
  return (published || band).replace(/\s+/g, " ").trim();
}

/** Year to March 2025, or a calendar year — no table numbers. */
export function labelSpendPeriod(iso: string): string {
  const y = Number(iso.slice(0, 4));
  const m = Number(iso.slice(5, 7));
  if (m === 4) return `Year to March ${y + 1}`;
  return String(y);
}

/** TimeChart tick for Family spending (April starts → year to March). */
export function labelSpendT(t: number): string {
  const y = Math.floor(t + 1e-6);
  const frac = t - y;
  if (Math.abs(frac - 0.25) < 0.04) return `Year to March ${y + 1}`;
  return String(y);
}

/** ASCII thousands separators — `toLocaleString` can hydrate with NBSP. */
function groupInt(n: number): string {
  const sign = n < 0 ? "−" : "";
  const digits = String(Math.abs(n));
  return `${sign}${digits.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`;
}

export function fmtWeekGbp(v: number): string {
  const [int, frac] = v.toFixed(1).split(".");
  return `£${groupInt(Number(int))}.${frac}`;
}

export function fmtShare1(v: number): string {
  return `${v.toFixed(1)}%`;
}

export function fmtWealthGbp(v: number): string {
  return `£${groupInt(Math.round(v))}`;
}

export function fmtCreditM(v: number): string {
  if (Math.abs(v) >= 1000) {
    const bn = v / 1000;
    const dp = Math.abs(bn) >= 100 ? 0 : 1;
    return `£${bn.toFixed(dp)}bn`;
  }
  return `£${v.toFixed(0)}m`;
}

export type SpendHit = {
  classification: string;
  label: string;
  value: number;
  periodStart: string;
};

function spendCategoryRows(rows: Observation[]): Observation[] {
  return finiteObs(rows).filter((r) => {
    const n = note(r);
    return n.measure === "weekly_gbp_real" && keepSpendYear(n);
  });
}

export function latestSpendPeriod(rows: Observation[]): string | null {
  const ok = spendCategoryRows(rows);
  if (!ok.length) return null;
  return ok.reduce((latest, r) => (r.period_start > latest ? r.period_start : latest), ok[0]!.period_start);
}

export function spendCategoryRanks(rows: Observation[], periodStart: string): RankRow[] {
  const byId = new Map<string, RankRow>();
  for (const r of spendCategoryRows(rows)) {
    if (r.period_start !== periodStart) continue;
    const n = note(r);
    const id = n.classification;
    if (!(SPEND_GROUPS as readonly string[]).includes(id)) continue;
    byId.set(id, {
      id,
      label: groupLabel(id, n.classification_label),
      v: r.value as number,
    });
  }
  return [...byId.values()].sort((a, b) => b.v - a.v);
}

export function spendTotal(rows: Observation[], periodStart: string): number | null {
  for (const r of spendCategoryRows(rows)) {
    if (r.period_start !== periodStart) continue;
    if (note(r).classification === "total") return r.value as number;
  }
  return null;
}

export function spendGroupAt(
  rows: Observation[],
  periodStart: string,
  classification: string,
): SpendHit | null {
  for (const r of spendCategoryRows(rows)) {
    if (r.period_start !== periodStart) continue;
    const n = note(r);
    if (n.classification !== classification) continue;
    return {
      classification,
      label: groupLabel(classification, n.classification_label),
      value: r.value as number,
      periodStart,
    };
  }
  return null;
}

export function spendHistory(
  rows: Observation[],
  classification: string,
): { points: Pt[]; label: string } {
  const points: Pt[] = [];
  let label = groupLabel(classification);
  for (const r of spendCategoryRows(rows)) {
    const n = note(r);
    if (n.classification !== classification) continue;
    label = groupLabel(classification, n.classification_label);
    points.push({ t: toT(r.period_start), v: r.value as number });
  }
  points.sort((a, b) => a.t - b.t);
  return { points, label };
}

export function spendCategoryOptions(rows: Observation[]): { value: string; label: string }[] {
  const latest = latestSpendPeriod(rows);
  const seen = new Map<string, string>();
  for (const r of spendCategoryRows(rows)) {
    if (latest && r.period_start !== latest) continue;
    const n = note(r);
    const id = n.classification;
    if (!(SPEND_GROUPS as readonly string[]).includes(id)) continue;
    if (!seen.has(id)) seen.set(id, groupLabel(id, n.classification_label));
  }
  return SPEND_GROUPS.filter((id) => seen.has(id)).map((id) => ({
    value: id,
    label: seen.get(id)!,
  }));
}

export function asSpendCategory(raw: string | null, options: { value: string }[]): string {
  if (raw && options.some((o) => o.value === raw)) return raw;
  if (options.some((o) => o.value === "housing_fuel_power")) return "housing_fuel_power";
  return options[0]?.value ?? "food";
}

function isShareMeasure(measure: string | undefined): boolean {
  return measure === "share_pct" || measure === "share_of_total_expenditure";
}

function incomeRows(rows: Observation[], measure: "weekly_gbp" | "share_pct"): Observation[] {
  return finiteObs(rows).filter((r) => {
    const m = note(r).measure;
    return measure === "share_pct" ? isShareMeasure(m) : m === "weekly_gbp";
  });
}

export function incomeQuintileRanks(
  rows: Observation[],
  classification: string,
  measure: "weekly_gbp" | "share_pct",
): { ranks: RankRow[]; all: number | null; label: string; periodStart: string } | null {
  const byBand = new Map<string, RankRow>();
  let all: number | null = null;
  let label = groupLabel(classification);
  let periodStart = "";
  for (const r of incomeRows(rows, measure)) {
    const n = note(r);
    if (n.classification !== classification) continue;
    periodStart = r.period_start;
    label = groupLabel(classification, n.classification_label);
    if (n.band === "all") {
      all = r.value as number;
      continue;
    }
    if ((QUINTILE_ORDER as readonly string[]).includes(n.band)) {
      byBand.set(n.band, {
        id: n.band,
        label: quintileLabel(n.band, n.band_label),
        v: r.value as number,
      });
    }
  }
  const ranks = QUINTILE_ORDER.filter((b) => byBand.has(b)).map((b) => byBand.get(b)!);
  if (!ranks.length) return null;
  return { ranks, all, label, periodStart };
}

export function incomeTotalByQuintile(rows: Observation[]): {
  ranks: RankRow[];
  all: number | null;
  periodStart: string;
} | null {
  return incomeQuintileRanks(rows, "total", "weekly_gbp");
}

export function incomeShareHit(
  rows: Observation[],
  classification: string,
  band: string,
): number | null {
  for (const r of incomeRows(rows, "share_pct")) {
    const n = note(r);
    if (n.classification === classification && n.band === band) return r.value as number;
  }
  return null;
}

export function wasRound8(rows: Observation[]): Observation[] {
  return finiteObs(rows).filter((r) => r.period_start === WAS_ROUND8_START);
}

function wasMatch(
  rows: Observation[],
  pred: (n: Record<string, string>) => boolean,
): Observation | null {
  return wasRound8(rows).find((r) => pred(note(r))) ?? null;
}

export function wasPercentile(
  rows: Observation[],
  series: "p25" | "median" | "p75",
  population = "all-households",
): number | null {
  const hit = wasMatch(
    rows,
    (n) =>
      n.table === "5.10" &&
      n.series === series &&
      n.population === population &&
      n.measure === "net-financial-wealth",
  );
  return hit?.value ?? null;
}

export function wasCoverageRanks(rows: Observation[]): RankRow[] {
  const byId = new Map<string, RankRow>();
  for (const r of wasRound8(rows)) {
    const n = note(r);
    if (n.table !== "5.1" || n.series !== "coverage") continue;
    const id = n.asset;
    if (!(COVERAGE_ORDER as readonly string[]).includes(id)) continue;
    byId.set(id, { id, label: COVERAGE_LABEL[id] ?? id, v: r.value as number });
  }
  return COVERAGE_ORDER.filter((id) => byId.has(id)).map((id) => byId.get(id)!);
}

export function wasBandRanks(rows: Observation[]): RankRow[] {
  const byId = new Map<string, RankRow>();
  for (const r of wasRound8(rows)) {
    const n = note(r);
    if (n.table !== "5.11" || n.series !== "band-share") continue;
    const id = n.band;
    if (!(WEALTH_BAND_ORDER as readonly string[]).includes(id)) continue;
    byId.set(id, { id, label: WEALTH_BAND_LABEL[id] ?? id, v: r.value as number });
  }
  return WEALTH_BAND_ORDER.filter((id) => byId.has(id)).map((id) => byId.get(id)!);
}

export function wasDecileMedianRanks(rows: Observation[]): RankRow[] {
  const byId = new Map<string, RankRow>();
  for (const r of wasRound8(rows)) {
    const n = note(r);
    if (n.table !== "5.13" || n.series !== "median" || n.band === "all") continue;
    const id = n.band;
    if (!(DECILE_ORDER as readonly string[]).includes(id)) continue;
    const nDecile = Number(id.replace("income-decile-", ""));
    const label =
      nDecile === 1
        ? "Lowest-income tenth"
        : nDecile === 10
          ? "Highest-income tenth"
          : nDecile === 2
            ? "2nd tenth"
            : nDecile === 3
              ? "3rd tenth"
              : `${nDecile}th tenth`;
    byId.set(id, { id, label, v: r.value as number });
  }
  return DECILE_ORDER.filter((id) => byId.has(id)).map((id) => byId.get(id)!);
}

export function wasHighBandShare(rows: Observation[]): number | null {
  const hit = wasRound8(rows).find((r) => {
    const n = note(r);
    return n.table === "5.11" && n.band === "100000-or-more";
  });
  return hit?.value ?? null;
}

export function wasAnyFormal(rows: Observation[]): number | null {
  const hit = wasRound8(rows).find((r) => {
    const n = note(r);
    return n.table === "5.1" && n.asset === "any-formal-including-current-in-credit";
  });
  return hit?.value ?? null;
}

export function creditSeriesPoints(rows: Observation[], series: string): Pt[] {
  return finiteObs(rows)
    .filter((r) => note(r).series === series)
    .map((r) => ({
      t: toT(r.period_start),
      v: r.value as number,
      provisional: r.observation_status === "provisional",
    }));
}

export function latestCredit(rows: Observation[], series: string): Observation | null {
  const ok = finiteObs(rows).filter((r) => note(r).series === series);
  return ok.at(-1) ?? null;
}

export const CREDIT_SERIES_LABEL: Record<string, string> = {
  total: "Total excluding student loans",
  "credit-cards": "Credit cards",
  other: "Other consumer credit",
};

export function creditNoteLabel(row: Observation): string {
  const series = note(row).series;
  return CREDIT_SERIES_LABEL[series] ?? series ?? "Series";
}

export function spendNoteLabel(row: Observation): string {
  const n = note(row);
  const group = groupLabel(n.classification, n.classification_label);
  const band = n.band ? quintileLabel(n.band, n.band_label) : "";
  const measure =
    n.measure === "share_pct" || n.measure === "share_of_total_expenditure"
      ? "share of spending"
      : "£ a week";
  return [group, band, measure].filter(Boolean).join(" · ");
}

export function wealthNoteLabel(row: Observation): string {
  const n = note(row);
  if (n.table === "5.1") return COVERAGE_LABEL[n.asset] ?? n.asset ?? "Coverage";
  if (n.table === "5.11") return WEALTH_BAND_LABEL[n.band] ?? n.band ?? "Band";
  if (n.table === "5.13") {
    const series = n.series === "p25" ? "Lower quarter" : n.series === "p75" ? "Upper quarter" : "Median";
    if (n.band === "all") return `${series} · all households`;
    return `${series} · ${n.band?.replace("income-decile-", "income tenth ")}`;
  }
  if (n.table === "5.10") {
    const who = n.population === "with-assets-or-liabilities" ? "with assets or debts" : "all households";
    const series =
      n.series === "p25" ? "Lower quarter" : n.series === "p75" ? "Upper quarter" : n.series === "median" ? "Median" : n.series;
    return `${series} · ${who}`;
  }
  if (n.table === "5.12") {
    if (n.series === "aggregate-net") return "Total net financial wealth";
    if (n.series === "aggregate-gross") return "Total gross financial wealth";
    if (n.series === "aggregate-liabilities") return "Total financial debts";
  }
  return n.series || n.table || "Series";
}
