"use client";

/**
 * EngravedArea — the flagship single-series chart.
 * The true line is drawn heavy; beneath it, N contours of the same curve
 * scaled toward the zero baseline form the "engraving". Annotations are
 * computed points (start, peak, latest), passed in — never hand-typed values.
 */

import { useState } from "react";
import { extent, fmtT, nearest, niceTicks, type Pt } from "../data";
import { useWidth } from "../useWidth";
import c from "./charts.module.css";
import { Readout, TimeAxis, YGrid, linePath, scale, type Frame } from "./parts";

export type Annotation = { t: number; label: string; align?: "start" | "end" };

type Props = {
  points: Pt[];
  height?: number;
  format: (v: number) => string;
  tickFormat?: (v: number) => string;
  cadence?: "monthly" | "quarterly" | "annual";
  contours?: number;
  annotations?: Annotation[];
  label: string;
  tone?: "ink" | "paper";
};

export function EngravedArea({ points, height = 420, format, tickFormat, cadence = "annual", contours = 26, annotations = [], label, tone = "ink" }: Props) {
  const [ref, w] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<Pt | null>(null);
  if (points.length < 2) return null;

  const f: Frame = { w, h: height, l: 0, r: 8, t: 36, b: 28 };
  const [t0, t1] = extent(points.map((p) => p.t));
  const [, vHi] = extent(points.map((p) => p.v));
  const ticks = niceTicks(0, vHi, 4);
  const yHi = Math.max(ticks[ticks.length - 1]!, vHi);
  const x = scale(t0, t1, f.l, w - f.r);
  const y = scale(0, yHi, height - f.b, f.t);
  const base = y(0);
  const ink = tone === "ink" ? "var(--bo-ink)" : "var(--bo-paper)";

  const contour = (k: number) => linePath(points.map((p) => ({ x: x(p.t), y: base - (base - y(p.v)) * k })));

  return (
    <div ref={ref} className={c.chart} role="img" aria-label={label} style={{ color: ink }}>
      <svg width={w} height={height}>
        <YGrid ticks={ticks.filter((v) => v > 0)} y={y} f={f} format={tickFormat ?? format} />
        <g fill="none" stroke={ink}>
          {Array.from({ length: contours }, (_, i) => {
            const k = (i + 1) / (contours + 1);
            return <path key={i} d={contour(k)} strokeWidth={0.6} strokeOpacity={0.22 + 0.5 * k} />;
          })}
          <path d={contour(1)} strokeWidth={2.25} strokeLinejoin="round" />
        </g>
        <TimeAxis t0={t0} t1={t1} x={x} f={f} maxTicks={w < 520 ? 4 : 10} />
        {annotations.map((a) => {
          const p = nearest(points, a.t);
          if (!p) return null;
          const ax = x(p.t);
          const ay = y(p.v);
          const end = a.align === "end" || ax > w * 0.8;
          return (
            <g key={a.label} className={c.annot}>
              <line x1={ax} x2={ax} y1={ay - 8} y2={f.t - 16} />
              <circle cx={ax} cy={ay} r={4} fill="var(--bo-paper)" stroke={ink} strokeWidth={1.75} />
              <text x={ax + (end ? -6 : 6)} y={f.t - 18} textAnchor={end ? "end" : "start"} style={{ fontWeight: 500 }}>
                {a.label}
              </text>
              <text x={ax + (end ? -6 : 6)} y={f.t - 5} textAnchor={end ? "end" : "start"} style={{ fillOpacity: 0.7 }}>
                {format(p.v)} · {fmtT(p.t, cadence)}
              </text>
            </g>
          );
        })}
        {hover ? (
          <g>
            <line className={c.cursor} x1={x(hover.t)} x2={x(hover.t)} y1={f.t} y2={base} />
            <circle cx={x(hover.t)} cy={y(hover.v)} r={4} fill={ink} />
          </g>
        ) : null}
        <rect
          className={c.hit}
          x={f.l}
          y={f.t}
          width={w - f.l - f.r}
          height={base - f.t}
          onPointerMove={(e) => {
            const r = e.currentTarget.getBoundingClientRect();
            setHover(nearest(points, t0 + ((e.clientX - r.left) / r.width) * (t1 - t0)));
          }}
          onPointerLeave={() => setHover(null)}
        />
      </svg>
      {hover ? (
        <Readout x={x(hover.t)} f={{ ...f, t: f.t + 24 }}>
          <b>{fmtT(hover.t, cadence)}</b>
          <span>
            {format(hover.v)}
            {hover.provisional ? " · provisional" : ""}
          </span>
        </Readout>
      ) : null}
    </div>
  );
}
