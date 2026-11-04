/** Spark — a micro-line for pathways and ledgers. Shape only; no axes, no claims. */

import type { Pt } from "../data";

export function Spark({ points, height = 48, strong = false }: { points: Pt[]; height?: number; strong?: boolean }) {
  if (points.length < 2) return null;
  const t0 = points[0]!.t;
  const t1 = points[points.length - 1]!.t;
  const vs = points.map((p) => p.v);
  const lo = Math.min(...vs);
  const hi = Math.max(...vs);
  const d = points
    .map((p, i) => `${i ? "L" : "M"}${(((p.t - t0) / (t1 - t0 || 1)) * 100).toFixed(2)},${(height - 2 - ((p.v - lo) / (hi - lo || 1)) * (height - 6)).toFixed(2)}`)
    .join("");
  return (
    <svg viewBox={`0 0 100 ${height}`} preserveAspectRatio="none" width="100%" height={height} aria-hidden="true" style={{ display: "block", overflow: "visible" }}>
      <path d={d} fill="none" stroke="currentColor" strokeWidth={strong ? 1.75 : 1.25} vectorEffect="non-scaling-stroke" />
    </svg>
  );
}
