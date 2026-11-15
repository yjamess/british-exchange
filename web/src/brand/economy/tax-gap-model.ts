/**
 * The Tax Gap — HMRC Measuring tax gaps (MTG 2026 pin).
 *
 * Approach: parse observation notes (`table=`, `measure=`, `tax=`, `behaviour=`, …)
 * and expose only published slices. Controls never invent components.
 *
 * Safety: the tax gap is not the same as fraud. Evasion is one HMRC behaviour
 * category; the largest published share is failure to take reasonable care.
 * 2023–24 / 2024–25 stay provisional on the chart (dotted).
 *
 * Notes parsing mirrors tax-burden-model (semicolon key=value).
 * See https://peps.python.org/pep-0008/ for naming discipline on the connector side;
 * here keys match the curated CSV notes exactly.
 */

import type { Observation } from "@/lib/api";
import { toT, type Pt } from "../data";

export type GapMode = "by_tax" | "by_behaviour" | "history";
export type GapHistoryMeasure = "gbp" | "percent";

export const GAP_MODE_OPTIONS: { value: GapMode; label: string }[] = [
  { value: "by_tax", label: "By tax type" },
  { value: "by_behaviour", label: "By behaviour" },
  { value: "history", label: "History" },
];

export const GAP_HISTORY_OPTIONS: { value: GapHistoryMeasure; label: string }[] = [
  { value: "gbp", label: "Tax gap · £ billion" },
  { value: "percent", label: "Tax gap · % of liabilities" },
];

/** Top-level tax totals for RankBars (Table 1.2) — not nested components. */
const TAX_TOTAL_TYPES = [
  "total-vat",
  "total-excise-duty",
  "total-income-tax-nics-capital-gains-tax",
  "total-corporation-tax",
  "total-other-taxes",
] as const;

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

/** Keep valued rows; provisional years stay for dotted history. */
function valued(rows: Observation[]): Observation[] {
  return rows.filter((r) => r.value != null && Number.isFinite(r.value));
}

/** 2024-25 → 2024–25 */
export function gapTaxYearLabel(id: string): string {
  return id.replace("-", "–");
}

export type GapHeadline = {
  taxYear: string;
  taxYearLabel: string;
  gapBn: number;
  gapPercent: number;
  theoreticalBn: number;
  provisional: boolean;
};

/** Latest tax-year headline from Table 1.2 totals. */
export function gapHeadline(rows: Observation[]): GapHeadline | null {
  const ok = valued(rows);
  let bestYear = "";
  let gapBn: number | null = null;
  let gapPercent: number | null = null;
  let theoreticalBn: number | null = null;
  let provisional = false;

  for (const row of ok) {
    const n = parseNotes(row.notes);
    if (n.table !== "1.2" || n.measure !== "gap-gbp-bn") continue;
    const year = n.tax_year;
    if (!year) continue;
    if (year < bestYear) continue;

    if (year > bestYear) {
      bestYear = year;
      gapBn = null;
      gapPercent = null;
      theoreticalBn = null;
      provisional = row.observation_status === "provisional";
    }

    if (n.tax === "total-tax-gap" && n.type === "total-tax-gap") {
      gapBn = row.value as number;
      provisional = row.observation_status === "provisional";
    } else if (
      n.tax === "total-theoretical-tax-liability" &&
      n.type === "total-theoretical-tax-liability"
    ) {
      theoreticalBn = row.value as number;
    } else if (n.tax === "total-percentage-tax-gap" && n.type === "total-percentage-tax-gap") {
      gapPercent = row.value as number;
    }
  }

  if (!bestYear || gapBn == null || gapPercent == null || theoreticalBn == null) return null;
  return {
    taxYear: bestYear,
    taxYearLabel: gapTaxYearLabel(bestYear),
    gapBn,
    gapPercent,
    theoreticalBn,
    provisional,
  };
}

export type GapRankSlice = {
  ranks: { id: string; label: string; v: number }[];
  taxYearLabel: string;
  provisional: boolean;
};

/** Table 1.2 £bn totals by tax type for the latest tax year. */
export function gapByTaxRanks(rows: Observation[]): GapRankSlice | null {
  const headline = gapHeadline(rows);
  if (!headline) return null;
  const year = headline.taxYear;
  const byType = new Map<string, { label: string; v: number }>();

  for (const row of valued(rows)) {
    const n = parseNotes(row.notes);
    if (n.table !== "1.2" || n.measure !== "gap-gbp-bn") continue;
    if (n.tax_year !== year) continue;
    const typ = n.type;
    if (!(TAX_TOTAL_TYPES as readonly string[]).includes(typ)) continue;
    byType.set(typ, { label: n.tax_label || typ, v: row.value as number });
  }

  const ranks = TAX_TOTAL_TYPES.filter((id) => byType.has(id))
    .map((id) => {
      const hit = byType.get(id)!;
      return { id, label: hit.label, v: hit.v };
    })
    .sort((a, b) => b.v - a.v);

  if (!ranks.length) return null;
  return {
    ranks,
    taxYearLabel: headline.taxYearLabel,
    provisional: headline.provisional,
  };
}

/** Table 7.1 share of gap by illustrative behaviour (latest year). */
export function gapByBehaviourRanks(rows: Observation[]): GapRankSlice | null {
  const headline = gapHeadline(rows);
  if (!headline) return null;
  const year = headline.taxYear;
  const byBeh = new Map<string, { label: string; v: number }>();

  for (const row of valued(rows)) {
    const n = parseNotes(row.notes);
    if (n.table !== "7.1" || n.measure !== "share-of-gap-percent") continue;
    if (n.tax_year !== year) continue;
    const beh = n.behaviour;
    if (!beh || beh === "total") continue;
    byBeh.set(beh, {
      label: n.behaviour_label || beh,
      v: row.value as number,
    });
  }

  const ranks = [...byBeh.entries()]
    .map(([id, hit]) => ({ id, label: hit.label, v: hit.v }))
    .sort((a, b) => b.v - a.v);

  if (!ranks.length) return null;
  return {
    ranks,
    taxYearLabel: headline.taxYearLabel,
    provisional: headline.provisional,
  };
}

/** Total tax gap history — £bn or % — provisional years marked dotted. */
export function gapHistoryPoints(
  rows: Observation[],
  measure: GapHistoryMeasure,
): Pt[] {
  const out: Pt[] = [];
  for (const row of valued(rows)) {
    const n = parseNotes(row.notes);
    if (measure === "gbp") {
      if (n.table !== "1.2" || n.measure !== "gap-gbp-bn") continue;
      if (n.tax !== "total-tax-gap" || n.type !== "total-tax-gap") continue;
    } else {
      if (n.table !== "1.1" || n.measure !== "gap-percent") continue;
      if (n.tax !== "total-tax-gap" || n.type !== "total-tax-gap") continue;
    }
    out.push({
      t: toT(row.period_start),
      v: row.value as number,
      provisional: row.observation_status === "provisional",
    });
  }
  return out.sort((a, b) => a.t - b.t);
}

export function fmtGapBn(v: number): string {
  return `£${v.toFixed(1)}bn`;
}

export function fmtGapPercent(v: number): string {
  return `${v.toFixed(1)}%`;
}

/** Axis / title label for a tax-year point (April start → FY-style label). */
export function gapPeriodLabel(t: number): string {
  const y = Math.floor(t + 1e-6);
  return `${y}–${String((y + 1) % 100).padStart(2, "0")}`;
}
