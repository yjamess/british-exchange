/**
 * Who Bears the Tax Burden? — ONS Effects of taxes and benefits (ETB) FYE 2024.
 *
 * Only measures ONS publishes: direct/indirect/all as % of gross income;
 * indirect as % of disposable income or expenditure; Table 2a £ averages.
 * No invented direct×disposable/expenditure shares.
 */

import type { Observation } from "@/lib/api";
import { finalObs } from "./debt-model";

export type BurdenMeasure =
  | "direct_gross"
  | "indirect_gross"
  | "all_gross"
  | "indirect_disposable"
  | "indirect_expenditure"
  | "direct_gbp"
  | "indirect_gbp";

export const BURDEN_MEASURE_OPTIONS: { value: BurdenMeasure; label: string }[] = [
  { value: "direct_gross", label: "Direct tax · % of gross income" },
  { value: "indirect_gross", label: "Indirect tax · % of gross income" },
  { value: "all_gross", label: "All taxes · % of gross income" },
  { value: "indirect_disposable", label: "Indirect tax · % of disposable income" },
  { value: "indirect_expenditure", label: "Indirect tax · % of spending" },
  { value: "direct_gbp", label: "Direct tax · £ a year" },
  { value: "indirect_gbp", label: "Indirect tax · £ a year" },
];

const BAND_ORDER = ["bottom", "2nd", "3rd", "4th", "top"] as const;

type MeasureSpec = {
  tax: string;
  denominator: string | null;
  measure: "tax_share" | "average_gbp";
};

const SPECS: Record<BurdenMeasure, MeasureSpec> = {
  direct_gross: { tax: "direct", denominator: "gross_income", measure: "tax_share" },
  indirect_gross: { tax: "indirect", denominator: "gross_income", measure: "tax_share" },
  all_gross: { tax: "all", denominator: "gross_income", measure: "tax_share" },
  indirect_disposable: { tax: "indirect", denominator: "disposable_income", measure: "tax_share" },
  indirect_expenditure: { tax: "indirect", denominator: "expenditure", measure: "tax_share" },
  direct_gbp: { tax: "direct", denominator: null, measure: "average_gbp" },
  indirect_gbp: { tax: "indirect", denominator: null, measure: "average_gbp" },
};

function parseNotes(notes: string): Record<string, string> {
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

function matches(row: Observation, spec: MeasureSpec): Record<string, string> | null {
  const n = parseNotes(row.notes);
  if (n.measure !== spec.measure) return null;
  if (n.tax !== spec.tax) return null;
  if (spec.denominator != null && n.denominator !== spec.denominator) return null;
  if (spec.measure === "average_gbp" && n.table !== "2a") return null;
  if (spec.measure === "tax_share" && n.table !== "8") return null;
  return n;
}

export type BurdenSlice = {
  ranks: { id: string; label: string; v: number }[];
  all: number | null;
  periodLabel: string;
};

/** Quintile RankBars for one published measure (excludes “All” from bars). */
export function burdenRanks(rows: Observation[], measure: BurdenMeasure): BurdenSlice | null {
  const spec = SPECS[measure];
  const byBand = new Map<string, { label: string; v: number }>();
  let all: number | null = null;
  let periodStart = "";

  for (const row of finalObs(rows)) {
    if (row.value == null || !Number.isFinite(row.value)) continue;
    const n = matches(row, spec);
    if (!n) continue;
    periodStart = row.period_start;
    const band = n.band;
    const label = n.band_label || band;
    if (band === "all") {
      all = row.value as number;
      continue;
    }
    if ((BAND_ORDER as readonly string[]).includes(band)) {
      byBand.set(band, { label, v: row.value as number });
    }
  }

  const ranks = BAND_ORDER.filter((b) => byBand.has(b)).map((b) => {
    const hit = byBand.get(b)!;
    return { id: b, label: hit.label === "Bottom" ? "Bottom fifth" : hit.label === "Top" ? "Top fifth" : `${hit.label} fifth`, v: hit.v };
  });
  if (!ranks.length) return null;

  const y0 = periodStart ? Number(periodStart.slice(0, 4)) : 2023;
  const periodLabel = `Financial year ending ${y0 + 1}`;

  return { ranks, all, periodLabel };
}

export function fmtBurdenShare(v: number): string {
  return `${v.toFixed(1)}%`;
}

export function fmtBurdenGbp(v: number): string {
  return `£${Math.round(v).toLocaleString("en-GB")}`;
}

export function isBurdenShare(measure: BurdenMeasure): boolean {
  return measure !== "direct_gbp" && measure !== "indirect_gbp";
}

/* ——— Direct and indirect side by side (Who bears the tax burden instrument) ——— */

/** Measure menu: the denominators ONS publishes, nothing invented. */
export type BurdenView = "gross" | "indirect_disposable" | "indirect_expenditure" | "gbp";

export const BURDEN_VIEW_OPTIONS: { value: BurdenView; label: string }[] = [
  { value: "gross", label: "Share of gross income" },
  { value: "indirect_disposable", label: "Indirect tax · share of disposable income" },
  { value: "indirect_expenditure", label: "Indirect tax · share of spending" },
  { value: "gbp", label: "Pounds a year" },
];

/** Legacy `bm` values map onto the view that holds them. */
export function asBurdenView(raw: string | null): BurdenView {
  if (BURDEN_VIEW_OPTIONS.some((o) => o.value === raw)) return raw as BurdenView;
  if (raw === "direct_gbp" || raw === "indirect_gbp") return "gbp";
  if (raw === "indirect_disposable" || raw === "indirect_expenditure") return raw;
  return "gross";
}

export type BurdenRow = {
  id: string;
  label: string;
  /** Null where ONS does not publish that part for the denominator. */
  direct: number | null;
  indirect: number | null;
  /** Published "all taxes" where it exists; otherwise direct + indirect when both exist. */
  all: number | null;
  reference: boolean;
};

/** Plain words for the quintile groups: ranked by income, lowest to highest. */
const ROW_LABEL: Record<string, string> = {
  bottom: "Lowest-income fifth",
  "2nd": "2nd fifth",
  "3rd": "3rd fifth",
  "4th": "4th fifth",
  top: "Highest-income fifth",
  all: "All households",
};

function valuesFor(rows: Observation[], measure: BurdenMeasure): Map<string, number> {
  const spec = SPECS[measure];
  const out = new Map<string, number>();
  for (const row of finalObs(rows)) {
    if (row.value == null || !Number.isFinite(row.value)) continue;
    const n = matches(row, spec);
    if (!n) continue;
    out.set(n.band, row.value as number);
  }
  return out;
}

export function burdenRows(rows: Observation[], view: BurdenView): { rows: BurdenRow[]; periodLabel: string } | null {
  const direct =
    view === "gross" ? valuesFor(rows, "direct_gross") : view === "gbp" ? valuesFor(rows, "direct_gbp") : null;
  const indirect = valuesFor(
    rows,
    view === "gross"
      ? "indirect_gross"
      : view === "gbp"
        ? "indirect_gbp"
        : view === "indirect_disposable"
          ? "indirect_disposable"
          : "indirect_expenditure",
  );
  const all = view === "gross" ? valuesFor(rows, "all_gross") : null;
  if (!indirect.size) return null;
  const out: BurdenRow[] = [...BAND_ORDER, "all"].map((band) => {
    const d = direct?.get(band) ?? null;
    const i = indirect.get(band) ?? null;
    const a = all?.get(band) ?? (d != null && i != null ? d + i : null);
    return { id: band, label: ROW_LABEL[band] ?? band, direct: d, indirect: i, all: a, reference: band === "all" };
  });
  const period = finalObs(rows)[0]?.period_start ?? "";
  const y0 = period ? Number(period.slice(0, 4)) : 2023;
  return { rows: out, periodLabel: `Financial year ending ${y0 + 1}` };
}

export function isBurdenViewShare(view: BurdenView): boolean {
  return view !== "gbp";
}
