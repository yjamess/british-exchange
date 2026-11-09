"use client";

import { ChangeRows } from "../instrument/TimeChart";
import { LONG_FUELS, fmtPct, fmtTWh, value, type LongYear, type Measure } from "./long-run";

/** One comparison, on one scale. No second depiction or nested story navigation. */
export function CompareFlow({ mix, from, to, measure }: {
  mix: LongYear[]; from: number; to: number; measure: Measure;
}) {
  const a = mix.find(row => row.year === from) ?? mix[0];
  const b = mix.find(row => row.year === to) ?? mix.at(-1);
  if (!a || !b) return null;
  return <ChangeRows
    label={`UK generation by fuel, ${a.year} to ${b.year}${measure === "share" ? "; share differences are percentage points" : ""}`}
    rows={LONG_FUELS.filter(f => a.v[f.id] > 0 || b.v[f.id] > 0).map(f => ({
      id: f.id, label: f.label, from: value(a, f.id, measure), to: value(b, f.id, measure),
    }))}
    fromLabel={String(a.year)} toLabel={String(b.year)}
    format={measure === "share" ? fmtPct : fmtTWh}
    reference={measure === "absolute" ? { label: "All generation", from: a.total, to: b.total } : undefined}
  />;
}
