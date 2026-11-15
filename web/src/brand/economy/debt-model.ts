/**
 * Domain 08 helpers — final-only charts; 12-month rolling sums for NSA flows.
 *
 * Approach: PSF monthly borrowing and interest are strongly seasonal. The handover
 * requires a 12-month rolling sum labelled **derived** so the trend is readable
 * without inventing a new official series.
 *
 * Best practice: filter provisional before charting (same pattern as Growth /
 * Inflation — charts never plot provisional points).
 * See https://docs.python.org/3/library/dataclasses.html for the shared Observation
 * contract on the Python side; here we only read the API shape.
 */

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
export function periodPoints(rows: Observation[]): Pt[] {
  return finalPts(
    finalObs(rows).map((r) => ({
      t: toT(r.period_start),
      v: r.value as number,
      provisional: false,
    })),
  );
}

/**
 * Trailing 12-month sum of final monthly levels (flows in £m).
 * Needs 12 consecutive valued months ending at each point — labelled derived in Notes.
 */
export function rolling12mSum(rows: Observation[]): Pt[] {
  const ok = finalObs(rows).slice().sort((a, b) => a.period_start.localeCompare(b.period_start));
  if (ok.length < 12) return [];
  const out: Pt[] = [];
  for (let i = 11; i < ok.length; i++) {
    let sum = 0;
    let contiguous = true;
    for (let j = i - 11; j <= i; j++) {
      const cur = ok[j]!;
      const prev = j > i - 11 ? ok[j - 1]! : null;
      if (prev) {
        const expected = nextMonthStart(prev.period_start);
        if (cur.period_start !== expected) {
          contiguous = false;
          break;
        }
      }
      sum += cur.value as number;
    }
    if (!contiguous) continue;
    out.push({ t: toT(ok[i]!.period_start), v: sum });
  }
  return out;
}

/** ISO month start → next month start (YYYY-MM-01). */
function nextMonthStart(iso: string): string {
  const y = Number(iso.slice(0, 4));
  const m = Number(iso.slice(5, 7));
  const nm = m === 12 ? 1 : m + 1;
  const ny = m === 12 ? y + 1 : y;
  return `${ny.toString().padStart(4, "0")}-${nm.toString().padStart(2, "0")}-01`;
}

/** HF6W is already £ billion. */
export function fmtDebtBn(v: number): string {
  return `£${v.toFixed(v >= 100 ? 0 : 1)}bn`;
}

/** DZLS / NMFX are £ million → display £bn. */
export function fmtFlowBn(v: number): string {
  const bn = v / 1000;
  const sign = bn < 0 ? "−" : "";
  const abs = Math.abs(bn);
  return `${sign}£${abs.toFixed(abs >= 10 ? 1 : 2)}bn`;
}

export function fmtPctGdp(v: number): string {
  return `${v.toFixed(1)}%`;
}

export type DebtMeasure = "debt" | "borrowing" | "interest" | "percent";

/** Measure menu — plain words; stock / flow / ratio sit in stage titles and Notes. */
export const DEBT_MEASURES: { value: DebtMeasure; label: string }[] = [
  { value: "debt", label: "Net debt" },
  { value: "percent", label: "Debt % of GDP" },
  { value: "borrowing", label: "Net borrowing" },
  { value: "interest", label: "Debt interest" },
];

export function asDebtMeasure(raw: string | null): DebtMeasure {
  if (raw === "borrowing" || raw === "interest" || raw === "percent") return raw;
  return "debt";
}
