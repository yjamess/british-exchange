"use client";

/** CombBars — dense periodic counts (quarterly completions) as a fine comb of ink bars. */

import { useState } from "react";
import { extent, fmtT, niceTicks, type Pt } from "../data";
import { useWidth } from "../useWidth";
import c from "./charts.module.css";
import { Readout, TimeAxis, YGrid, scale, type Frame } from "./parts";

export function CombBars({
  points,
  height = 260,
  format,
  tickFormat,
  cadence = "quarterly",
  label,
}: {
  points: Pt[];
  height?: number;
  format: (v: number) => string;
  tickFormat?: (v: number) => string;
  cadence?: "monthly" | "quarterly" | "annual";
  label: string;
}) {
  const [ref, w] = useWidth<HTMLDivElement>();
  const [hi, setHi] = useState<number | null>(null);
  if (points.length < 2) return null;
  const f: Frame = { w, h: height, l: 0, r: 8, t: 16, b: 28 };
  const [t0, t1] = extent(points.map((p) => p.t));
  const [, vHi] = extent(points.map((p) => p.v));
  const ticks = niceTicks(0, vHi, 4);
  const x = scale(t0, t1 + 0.25, f.l, w - f.r);
  const y = scale(0, Math.max(vHi, ticks[ticks.length - 1]!), height - f.b, f.t);
  const bw = Math.max(1, ((w - f.l - f.r) / points.length) * 0.62);

  return (
    <div ref={ref} className={c.chart} role="img" aria-label={label}>
      <svg width={w} height={height}>
        {points.map((p, i) => (
          <rect
            key={p.t}
            x={x(p.t)}
            y={y(p.v)}
            width={bw}
            height={y(0) - y(p.v)}
            fill={i === hi ? "var(--bo-signal)" : p.provisional ? "var(--bo-ink-40)" : "var(--bo-ink)"}
          />
        ))}
        {/* Grid after bars so values stay legible over dense teeth */}
        <YGrid ticks={ticks.filter((v) => v > 0)} y={y} f={f} format={tickFormat ?? format} />
        <TimeAxis t0={t0} t1={t1} x={x} f={f} maxTicks={w < 520 ? 4 : 9} />
        <rect
          className={c.hit}
          x={f.l}
          y={f.t}
          width={w - f.l - f.r}
          height={height - f.t - f.b}
          onPointerMove={(e) => {
            const r = e.currentTarget.getBoundingClientRect();
            const i = Math.round(((e.clientX - r.left) / r.width) * (points.length - 1));
            setHi(Math.max(0, Math.min(points.length - 1, i)));
          }}
          onPointerLeave={() => setHi(null)}
        />
      </svg>
      {hi !== null ? (
        <Readout x={x(points[hi]!.t)} f={f}>
          <b>{fmtT(points[hi]!.t, cadence)}</b>
          <span>{format(points[hi]!.v)}</span>
        </Readout>
      ) : null}
    </div>
  );
}
