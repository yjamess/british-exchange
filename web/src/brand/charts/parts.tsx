"use client";

/**
 * Shared chart parts. Brand rules encoded here, once:
 *  - Time is always a linear axis (no categorical years — uneven gaps stay uneven).
 *  - Gridlines are hairlines; values sit ON the line at the left, not in a gutter.
 *  - Labels are mono, units are formatted, raw floats never reach the screen.
 */

import type { ReactNode } from "react";
import { yearTicks } from "../data";
import c from "./charts.module.css";

export type Frame = { w: number; h: number; l: number; r: number; t: number; b: number };

export const scale = (d0: number, d1: number, r0: number, r1: number) => (v: number) =>
  r0 + ((v - d0) / (d1 - d0 || 1)) * (r1 - r0);

export function YGrid({ ticks, y, f, format }: { ticks: number[]; y: (v: number) => number; f: Frame; format: (v: number) => string }) {
  return (
    <g className={c.grid}>
      {ticks.map((v) => (
        <g key={v}>
          <line x1={f.l} x2={f.w - f.r} y1={y(v)} y2={y(v)} />
          <text x={f.l} y={y(v) - 5} paintOrder="stroke" stroke="var(--bo-paper)" strokeWidth={3} strokeLinejoin="round">
            {format(v)}
          </text>
        </g>
      ))}
    </g>
  );
}

export function TimeAxis({ t0, t1, x, f, maxTicks = 8 }: { t0: number; t1: number; x: (t: number) => number; f: Frame; maxTicks?: number }) {
  const ticks = yearTicks(t0, t1, maxTicks);
  return (
    <g className={c.axis}>
      <line x1={f.l} x2={f.w - f.r} y1={f.h - f.b} y2={f.h - f.b} />
      {ticks.map((t) => (
        <g key={t}>
          <line x1={x(t)} x2={x(t)} y1={f.h - f.b} y2={f.h - f.b + 5} />
          <text x={x(t)} y={f.h - f.b + 18} textAnchor={x(t) - f.l < 16 ? "start" : "middle"}>
            {t}
          </text>
        </g>
      ))}
    </g>
  );
}

/** Floating readout pinned to the top of the plot, flipping side near the right edge. */
export function Readout({ x, f, children }: { x: number; f: Frame; children: ReactNode }) {
  const flip = x > f.w * 0.66;
  return (
    <div
      className={c.readout}
      style={{
        left: flip ? undefined : x + 10,
        right: flip ? f.w - x + 10 : undefined,
        top: f.t,
      }}
    >
      {children}
    </div>
  );
}

/** Spread end-labels vertically so they never overlap. */
export function spread(items: { id: string; y: number }[], minGap = 15, top = 0, bottom = Infinity) {
  const sorted = [...items].sort((a, b) => a.y - b.y);
  for (let i = 1; i < sorted.length; i += 1) {
    if (sorted[i]!.y - sorted[i - 1]!.y < minGap) sorted[i]!.y = sorted[i - 1]!.y + minGap;
  }
  const overflow = (sorted[sorted.length - 1]?.y ?? 0) - bottom;
  if (overflow > 0) sorted.forEach((s) => (s.y -= overflow));
  sorted.forEach((s) => (s.y = Math.max(top, s.y)));
  return new Map(sorted.map((s) => [s.id, s.y]));
}

export function linePath(pts: { x: number; y: number }[]): string {
  return pts.map((p, i) => `${i ? "L" : "M"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join("");
}
