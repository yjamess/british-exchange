"use client";

/**
 * ShareArea — composition over time (e.g. tenure).
 * Bands are told apart by PRINT PATTERN, not hue: solid ink, line hatch,
 * stipple. One ink, legible in greyscale, photocopies, and for colour-blind readers.
 * End labels and hover readout use the same paper cards as TimeChart.
 */

import { useEffect, useId, useState } from "react";
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
  const [mounted, setMounted] = useState(false);
  const id = useId().replace(/:/g, "");
  // Width is measured after layout — keep SSR and the first client paint as an
  // empty shell so SVG attributes do not hydrate-mismatch (docs.react.dev › hydration).
  useEffect(() => setMounted(true), []);
  if (years.length < 2) return null;

  if (!mounted) {
    return <div ref={ref} className={c.chart} style={{ height }} role="img" aria-label={label} />;
  }

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
        {/* End labels: paper card + ink rule + Union type — same as TimeChart stack tags. */}
        {bands.map((b, bi) => {
          const last = cum[cum.length - 1]![bi]!;
          const mid = y((last[0] + last[1]) / 2);
          const share = b.values[b.values.length - 1] ?? 0;
          if (share < 0.06 || w < 520) return null;
          const text = `${b.label} ${fmt.pct(share * 100, 0)}`;
          const tw = text.length * 6.6 + 14;
          return (
            <g key={`l-${b.id}`} transform={`translate(${w - f.r - 8 - tw} ${mid - 9})`}>
              <rect width={tw} height={18} fill="var(--bo-paper)" stroke="var(--bo-ink)" />
              <text x={tw / 2} y={12.5} textAnchor="middle" className={c.endLabel} fill="var(--bo-union)">
                {text}
              </text>
            </g>
          );
        })}
        {hi !== null ? <line className={c.cursor} x1={x(years[hi]!)} x2={x(years[hi]!)} y1={f.t} y2={height - f.b} /> : null}
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
              <span>
                <i data-pattern={b.pattern} aria-hidden="true" />
                {b.label}
              </span>
              <span>{fmt.pct((b.values[hi] ?? 0) * 100, 1)}</span>
            </span>
          ))}
        </Readout>
      ) : null}
      <ul className={c.legend} aria-hidden="true">
        {[...bands].reverse().map((b) => (
          <li key={b.id}>
            <i data-pattern={b.pattern} />
            {b.label}
          </li>
        ))}
      </ul>
    </div>
  );
}
