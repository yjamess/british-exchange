"use client";

/**
 * Frontier — every series in the catalogue as one engraved thread,
 * each scaled to its own range and ending at its latest observation.
 * Drawn back-to-front with an occluding fill (ridgeline). Past the
 * present line there is nothing: what hasn't been observed isn't drawn.
 */

import { useState } from "react";
import type { SeriesRecord } from "./lib/record";

type Props = {
  series: SeriesRecord[];
  from: number;
  now: number;
  ink: string;
  paper: string;
  className?: string;
};

const W = 1000;
const ROW = 13;
const AMP = 30;
const LEFT = 0;
const FUTURE = 130;

export function Frontier({ series, from, now, ink, paper, className }: Props) {
  const [hover, setHover] = useState<number | null>(null);
  const rows = series
    .map((s) => ({ ...s, pts: s.points.filter((p) => p.year >= from && p.year <= now) }))
    .filter((s) => s.pts.length >= 3)
    .sort((a, b) => a.pts[a.pts.length - 1]!.year - b.pts[b.pts.length - 1]!.year || a.pts[0]!.year - b.pts[0]!.year);
  const H = rows.length * ROW + AMP + 30;
  const plotW = W - FUTURE - LEFT;
  const X = (y: number) => LEFT + ((y - from) / (now - from)) * plotW;
  const xNow = X(now);

  return (
    <div className={className} style={{ position: "relative" }}>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${rows.length} series from ${from} to ${now}, each ending at its latest release`} style={{ display: "block", width: "100%", height: "auto" }}>
        <defs>
          <linearGradient id="frontier-fog" x1="0" x2="1">
            <stop offset="0" stopColor={paper} stopOpacity="0" />
            <stop offset="1" stopColor={paper} stopOpacity="1" />
          </linearGradient>
        </defs>
        {rows.map((s, i) => {
          const base = AMP + i * ROW + ROW;
          const vs = s.pts.map((p) => p.v);
          const mn = Math.min(...vs);
          const mx = Math.max(...vs);
          const Y = (v: number) => base - ((v - mn) / (mx - mn || 1)) * AMP;
          const line = s.pts.map((p, k) => `${k ? "L" : "M"}${X(p.year).toFixed(1)},${Y(p.v).toFixed(1)}`).join("");
          const lastX = X(s.pts[s.pts.length - 1]!.year);
          const firstX = X(s.pts[0]!.year);
          const active = hover === i;
          return (
            <g key={s.id} onPointerEnter={() => setHover(i)} onPointerLeave={() => setHover(null)} style={{ cursor: "crosshair" }}>
              <title>{`${s.title} · ${s.pts[0]!.year}–${s.pts[s.pts.length - 1]!.year} · ${s.publisher}`}</title>
              <path d={`${line}L${lastX},${base + 2}L${firstX},${base + 2}Z`} fill={paper} />
              <path d={line} fill="none" stroke={ink} strokeWidth={active ? 2 : 1.15} vectorEffect="non-scaling-stroke" opacity={hover === null || active ? 1 : 0.3} />
              <circle cx={lastX} cy={Y(s.pts[s.pts.length - 1]!.v)} r={active ? 2.6 : 1.3} fill={ink} />
            </g>
          );
        })}
        {/* Present line + unobserved region */}
        <line x1={xNow} x2={xNow} y1="8" y2={H - 18} stroke={ink} strokeWidth="1" vectorEffect="non-scaling-stroke" />
        <rect x={xNow + 1} y="0" width={W - xNow} height={H} fill="url(#frontier-fog)" opacity="0.5" />
        <g fontFamily="var(--font-mono), monospace" fontSize="10" letterSpacing="1.4" fill={ink}>
          <text x={xNow} y={H - 4} textAnchor="middle">{`NOW · ${now}`}</text>
          <text x={LEFT} y={H - 4}>{from}</text>
          <text x={xNow + 14} y={AMP + 6} opacity="0.7">NOT YET</text>
          <text x={xNow + 14} y={AMP + 20} opacity="0.7">OBSERVED</text>
        </g>
      </svg>
      <p
        aria-live="polite"
        style={{
          margin: "0.75rem 0 0",
          minHeight: "1.2em",
          fontFamily: "var(--font-mono)",
          fontSize: "0.7rem",
          letterSpacing: "0.1em",
          textTransform: "uppercase",
        }}
      >
        {hover !== null
          ? `${rows[hover]!.title} — ${rows[hover]!.pts[0]!.year}–${rows[hover]!.pts[rows[hover]!.pts.length - 1]!.year} · ${rows[hover]!.publisher}`
          : `${rows.length} threads · hover to read one`}
      </p>
    </div>
  );
}
