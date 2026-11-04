/**
 * EngravedPlate — a series drawn as an engraving.
 *
 * N nested contours: line k is the series scaled by k/N toward the baseline,
 * so the outermost line is the true curve and the fill is pure line-work
 * (banknote / intaglio grammar). Ticks and the peak are computed, never typed.
 */

import type { Point } from "./lib/record";

type Props = {
  points: Point[];
  ink: string;
  lines?: number;
  height?: number;
  tickEvery?: number;
  peakLabel?: (p: Point) => string;
  className?: string;
  label: string;
};

const W = 1000;

export function EngravedPlate({ points, ink, lines = 30, height = 260, tickEvery = 25, peakLabel, className, label }: Props) {
  if (points.length < 2) return null;
  const H = height;
  const padT = 18;
  const padB = 28;
  const y0 = points[0]!.year;
  const y1 = points[points.length - 1]!.year;
  const vmax = Math.max(...points.map((p) => p.v));
  const X = (year: number) => ((year - y0) / (y1 - y0 || 1)) * W;
  const plotH = H - padT - padB;
  const base = H - padB;

  const contour = (f: number) =>
    points.map((p, i) => `${i ? "L" : "M"}${X(p.year).toFixed(1)},${(base - (p.v / vmax) * plotH * f).toFixed(1)}`).join("");

  const peak = points.reduce((a, b) => (b.v > a.v ? b : a));
  const ticks: number[] = [];
  for (let t = Math.ceil(y0 / tickEvery) * tickEvery; t <= y1; t += tickEvery) ticks.push(t);

  return (
    <svg className={className} viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label} preserveAspectRatio="none">
      <g fill="none" stroke={ink} strokeLinejoin="round">
        {Array.from({ length: lines }, (_, k) => {
          const f = (k + 1) / lines;
          return (
            <path
              key={k}
              d={contour(f)}
              strokeWidth={k === lines - 1 ? 1.8 : 0.55}
              opacity={k === lines - 1 ? 1 : 0.35 + 0.5 * f}
              vectorEffect="non-scaling-stroke"
            />
          );
        })}
        <line x1="0" x2={W} y1={base} y2={base} strokeWidth="1" vectorEffect="non-scaling-stroke" />
      </g>
      {/* Peak marker */}
      <g>
        <line
          x1={X(peak.year)}
          x2={X(peak.year)}
          y1={base - plotH - 4}
          y2={base}
          stroke={ink}
          strokeDasharray="2 4"
          vectorEffect="non-scaling-stroke"
        />
      </g>
      <g fill={ink} fontFamily="var(--font-mono), monospace" fontSize="11" letterSpacing="1">
        {ticks.map((t) => (
          <g key={t}>
            <line x1={X(t)} x2={X(t)} y1={base} y2={base + 5} stroke={ink} vectorEffect="non-scaling-stroke" />
            <text x={X(t)} y={H - 6} textAnchor={X(t) < 20 ? "start" : X(t) > W - 20 ? "end" : "middle"} opacity="0.75">
              {t}
            </text>
          </g>
        ))}
        {peakLabel ? (
          <text
            x={X(peak.year) + (X(peak.year) > W * 0.75 ? -8 : 8)}
            y={base - plotH + 8}
            textAnchor={X(peak.year) > W * 0.75 ? "end" : "start"}
          >
            {peakLabel(peak)}
          </text>
        ) : null}
      </g>
    </svg>
  );
}
