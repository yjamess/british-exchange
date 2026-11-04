"use client";

/**
 * ShareArea — composition over time (e.g. tenure).
 * Bands are told apart by PRINT PATTERN, not hue: solid ink, line hatch,
 * stipple. One ink, legible in greyscale, photocopies, and for colour-blind readers.
 * Labels sit inside their bands at the latest year.
 */

import { useId, useState } from "react";
import { fmt } from "../data";
import { useWidth } from "../useWidth";
import c from "./charts.module.css";
import { Readout, TimeAxis, scale, type Frame } from "./parts";

export type Band = { id: string; label: string; pattern: "solid" | "hatch" | "stipple" | "paper"; values: number[] };

type Props = {
  years: number[];
  bands: Band[]; // bottom → top; values are shares that sum to 1 per year
  height?: number;
  label: string;
};

export function ShareArea({ years, bands, height = 360, label }: Props) {
  const [ref, w] = useWidth<HTMLDivElement>();
  const [hi, setHi] = useState<number | null>(null);
  const id = useId().replace(/:/g, "");
  if (years.length < 2) return null;

  const f: Frame = { w, h: height, l: 34, r: 8, t: 10, b: 28 };
  const t0 = years[0]!;
  const t1 = years[years.length - 1]!;
  const x = scale(t0, t1, f.l, w - f.r);
  const y = scale(0, 1, height - f.b, f.t);

  // Cumulative stacks
  const cum = years.map((_, i) => {
    let acc = 0;
    return bands.map((b) => {
      const lo = acc;
      acc += b.values[i] ?? 0;
      return [lo, acc] as const;
    });
  });

  const fills: Record<Band["pattern"], string> = {
    solid: "var(--bo-ink)",
    hatch: `url(#hatch-${id})`,
    stipple: `url(#stipple-${id})`,
    paper: "var(--bo-paper-lift)",
  };

  return (
    <div ref={ref} className={c.chart} role="img" aria-label={label}>
      <svg width={w} height={height}>
        <defs>
          <pattern id={`hatch-${id}`} width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect width="5" height="5" fill="var(--bo-paper)" />
            <line x1="0" y1="0" x2="0" y2="5" stroke="var(--bo-ink)" strokeWidth="1.6" />
          </pattern>
          <pattern id={`stipple-${id}`} width="4" height="4" patternUnits="userSpaceOnUse">
            <rect width="4" height="4" fill="var(--bo-paper)" />
            <circle cx="1" cy="1" r="0.9" fill="var(--bo-ink)" />
            <circle cx="3" cy="3" r="0.9" fill="var(--bo-ink)" />
          </pattern>
        </defs>
        {bands.map((b, bi) => {
          const top = years.map((t, i) => `${x(t).toFixed(1)},${y(cum[i]![bi]![1]).toFixed(1)}`);
          const bottom = years.map((t, i) => `${x(t).toFixed(1)},${y(cum[i]![bi]![0]).toFixed(1)}`).reverse();
          return (
            <path key={b.id} d={`M${top.join("L")}L${bottom.join("L")}Z`} fill={fills[b.pattern]} stroke="var(--bo-ink)" strokeWidth={0.75} />
          );
        })}
        {/* y: share ticks */}
        <g className={c.grid}>
          {[0, 0.25, 0.5, 0.75, 1].map((v) => (
            <text key={v} x={0} y={y(v) + 3.5}>
              {v * 100}%
            </text>
          ))}
        </g>
        <TimeAxis t0={t0} t1={t1} x={x} f={f} maxTicks={w < 520 ? 4 : 8} />
        {/* In-band labels at the latest year */}
        {bands.map((b, bi) => {
          const last = cum[cum.length - 1]![bi]!;
          const mid = y((last[0] + last[1]) / 2);
          const share = b.values[b.values.length - 1] ?? 0;
          if (share < 0.06) return null;
          const onInk = b.pattern === "solid";
          return (
            <g key={`l-${b.id}`}>
              <rect x={w - f.r - 158} y={mid - 11} width={150} height={22} fill={onInk ? "var(--bo-ink)" : "var(--bo-paper)"} />
              <text className={c.endLabel} x={w - f.r - 150} y={mid + 3.5} style={{ fill: onInk ? "var(--bo-paper)" : "var(--bo-ink)" }}>
                {b.label} {fmt.pct(share * 100, 0)}
              </text>
            </g>
          );
        })}
        {hi !== null ? <line className={c.cursor} x1={x(years[hi]!)} x2={x(years[hi]!)} y1={f.t} y2={height - f.b} style={{ stroke: "var(--bo-signal)" }} /> : null}
        <rect
          className={c.hit}
          x={f.l}
          y={f.t}
          width={w - f.l - f.r}
          height={height - f.t - f.b}
          onPointerMove={(e) => {
            const r = e.currentTarget.getBoundingClientRect();
            const t = t0 + ((e.clientX - r.left) / r.width) * (t1 - t0);
            let best = 0;
            years.forEach((yy, i) => Math.abs(yy - t) < Math.abs(years[best]! - t) && (best = i));
            setHi(best);
          }}
          onPointerLeave={() => setHi(null)}
        />
      </svg>
      {hi !== null ? (
        <Readout x={x(years[hi]!)} f={f}>
          <b>{years[hi]}</b>
          {[...bands].reverse().map((b) => (
            <span key={b.id} className={c.readRow}>
              <span>{b.label}</span>
              <span>{fmt.pct((b.values[hi] ?? 0) * 100, 1)}</span>
            </span>
          ))}
        </Readout>
      ) : null}
    </div>
  );
}
