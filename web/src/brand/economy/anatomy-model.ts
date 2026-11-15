/**
 * Growth › Anatomy — UK GVA by SIC section (current prices).
 *
 * Shares use current-price £m only (additive). Chained-volume £m stay out of
 * this view on purpose (see Domain 05 Notes / BX-BACK-007).
 */

import type { Observation } from "@/lib/api";
import { finalObs } from "./growth-model";

export type AnatomySection = {
  id: string;
  label: string;
  value: number;
  sharePct: number;
};

function noteField(notes: string, key: string): string | null {
  const m = notes.match(new RegExp(`(?:^|;\\s*)${key}=([^;]+)`));
  return m?.[1]?.trim() ?? null;
}

export function anatomySeries(row: Observation): string {
  return row.dimensions?.series || noteField(row.notes ?? "", "series") || "";
}

export function anatomyKind(row: Observation): string {
  return row.dimensions?.category || noteField(row.notes ?? "", "kind") || "";
}

export function anatomyLabel(row: Observation): string {
  return noteField(row.notes ?? "", "section_name") || anatomySeries(row);
}

export function anatomyGrain(row: Observation): string {
  return noteField(row.notes ?? "", "grain") || "";
}

/** Current-price rows only (final). */
export function currentPriceRows(rows: Observation[]): Observation[] {
  return finalObs(rows).filter((r) => anatomyKind(r) === "current_price");
}

/** Distinct period starts for a grain (quarterly preferred for the live dial). */
export function anatomyPeriods(
  rows: Observation[],
  grain: "quarterly" | "annual" = "quarterly",
): string[] {
  const set = new Set<string>();
  for (const r of currentPriceRows(rows)) {
    if (anatomyGrain(r) === grain) set.add(r.period_start);
  }
  return [...set].sort();
}

export function anatomyYears(periods: string[]): number[] {
  return [...new Set(periods.map((p) => Number(p.slice(0, 4))))].sort((a, b) => a - b);
}

export function anatomyQuartersIn(periods: string[], year: number): string[] {
  return periods.filter((p) => Number(p.slice(0, 4)) === year);
}

/** Section shares of Total GVA for one period (excludes total from the bar list). */
export function anatomySharesForPeriod(
  rows: Observation[],
  periodStart: string,
): { total: number | null; sections: AnatomySection[] } {
  const at = currentPriceRows(rows).filter((r) => r.period_start === periodStart);
  const totalRow = at.find((r) => anatomySeries(r) === "total");
  const total = totalRow?.value ?? null;
  if (total == null || total === 0) return { total, sections: [] };

  const sections: AnatomySection[] = [];
  for (const r of at) {
    const id = anatomySeries(r);
    if (!id || id === "total" || r.value == null) continue;
    sections.push({
      id,
      label: anatomyLabel(r),
      value: r.value,
      sharePct: (r.value / total) * 100,
    });
  }
  sections.sort((a, b) => b.sharePct - a.sharePct);
  return { total, sections };
}

/** Percentage-point change in share between two periods (same sections). */
export function anatomyShareChange(
  rows: Observation[],
  fromPeriod: string,
  toPeriod: string,
): { id: string; label: string; from: number; to: number }[] {
  const a = anatomySharesForPeriod(rows, fromPeriod).sections;
  const b = anatomySharesForPeriod(rows, toPeriod).sections;
  const byId = new Map(a.map((s) => [s.id, s]));
  const out: { id: string; label: string; from: number; to: number }[] = [];
  for (const s of b) {
    const prev = byId.get(s.id);
    if (!prev) continue;
    out.push({ id: s.id, label: s.label, from: prev.sharePct, to: s.sharePct });
  }
  return out.sort((x, y) => Math.abs(y.to - y.from) - Math.abs(x.to - x.from));
}

/** Services share = sum of sections G–T (current prices). */
export function servicesSharePct(sections: AnatomySection[]): number | null {
  const ids = new Set("GHIJKLMNOPQRST".split(""));
  const hit = sections.filter((s) => ids.has(s.id));
  if (!hit.length) return null;
  return hit.reduce((acc, s) => acc + s.sharePct, 0);
}

export function fmtShare(v: number): string {
  return `${v.toFixed(1)}%`;
}

export function fmtGdpMShort(v: number): string {
  if (Math.abs(v) >= 1000) return `${(v / 1000).toFixed(1)}bn`;
  return `${Math.round(v)}m`;
}
