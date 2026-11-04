"use client";

/**
 * LineChart — comparison over time.
 * Colour is role, not category: one primary ink, one signal (the selection),
 * everything else an ink tint. Series are labelled at their ends — no legend.
 * Provisional observations are drawn dotted (brand line language).
 */

import { useState } from "react";
import { extent, fmtT, nearest, niceTicks, type Series } from "../data";
import { useWidth } from "../useWidth";
import c from "./charts.module.css";
import { Readout, TimeAxis, YGrid, linePath, scale, spread, type Frame } from "./parts";

type Props = {
  series: Series[];
  height?: number;
  format: (v: number) => string;
  tickFormat?: (v: number) => string;
  cadence?: "monthly" | "quarterly" | "annual";
  zero?: boolean;
  label: string;
  endLabelWidth?: number;
};

const STROKE = { primary: "var(--bo-ink)", signal: "var(--bo-signal)", context: "var(--bo-ink-40)" } as const;
const WIDTH = { primary: 1.75, signal: 2.25, context: 1.25 } as const;

export function LineChart({ series, height = 340, format, tickFormat, cadence = "monthly", zero = false, label, endLabelWidth = 150 }: Props) {
  const [ref, w] = useWidth<HTMLDivElement>();
  const [hoverT, setHoverT] = useState<number | null>(null);
  const all = series.flatMap((s) => s.points);
  if (!all.length) return null;

  const f: Frame = { w, h: height, l: 0, r: w < 520 ? 70 : endLabelWidth, t: 18, b: 28 };
  const [t0, t1] = extent(all.map((p) => p.t));
  const [vLo, vHi] = extent(all.map((p) => p.v));
  const ticks = niceTicks(zero ? 0 : vLo, vHi, 4);
  const yLo = Math.min(ticks[0]!, zero ? 0 : vLo);
  const yHi = Math.max(ticks[ticks.length - 1]!, vHi);
  const x = scale(t0, t1, f.l, w - f.r);
  const y = scale(yLo, yHi, height - f.b, f.t);

  // Draw order: context → primary → signal
  const order = [...series].sort((a, b) => rank(a.role) - rank(b.role));
  const ends = spread(
    series.map((s) => ({ id: s.id, y: y(s.points[s.points.length - 1]!.v) })),
    14,
    f.t,
    height - f.b,
  );

  const onMove = (e: React.PointerEvent<SVGRectElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const px = e.clientX - r.left;
    setHoverT(t0 + (px / r.width) * (t1 - t0));
  };

  const hovered = hoverT === null ? null : series.map((s) => ({ s, p: nearest(s.points, hoverT) })).filter((h) => h.p);
  const hx = hovered?.[0]?.p ? x(hovered[0].p.t) : 0;

  return (
    <div ref={ref} className={c.chart} role="img" aria-label={label}>
      <svg width={w} height={height}>
        <YGrid ticks={ticks} y={y} f={f} format={tickFormat ?? format} />
        <TimeAxis t0={t0} t1={t1} x={x} f={f} maxTicks={w < 520 ? 4 : 8} />
        {order.map((s) => {
          const role = s.role ?? "context";
          const obs = s.points.filter((p) => !p.provisional);
          const firstProv = s.points.findIndex((p) => p.provisional);
          const prov = firstProv >= 0 ? s.points.slice(Math.max(0, firstProv - 1)) : [];
          return (
            <g key={s.id}>
              <path d={linePath(obs.map((p) => ({ x: x(p.t), y: y(p.v) })))} fill="none" stroke={STROKE[role]} strokeWidth={WIDTH[role]} strokeLinejoin="round" />
              {prov.length > 1 ? (
                <path
                  d={linePath(prov.map((p) => ({ x: x(p.t), y: y(p.v) })))}
                  fill="none"
                  stroke={STROKE[role]}
                  strokeWidth={WIDTH[role]}
                  strokeDasharray="0.1 4"
                  strokeLinecap="round"
                />
              ) : null}
            </g>
          );
        })}
        {series.map((s) => {
          const last = s.points[s.points.length - 1]!;
          const role = s.role ?? "context";
          const ly = ends.get(s.id) ?? y(last.v);
          return (
            <g key={`end-${s.id}`}>
              <circle cx={x(last.t)} cy={y(last.v)} r={role === "context" ? 2 : 3} fill={STROKE[role]} />
              <text className={c.endLabel} x={x(last.t) + 10} y={ly + 3.5} fill={STROKE[role]} style={{ fill: STROKE[role] }}>
                {w < 520 ? s.label.slice(0, 9) : s.label}
              </text>
            </g>
          );
        })}
        {hovered ? (
          <g>
            <line className={c.cursor} x1={hx} x2={hx} y1={f.t} y2={height - f.b} />
            {hovered.map(({ s, p }) => (
              <circle key={s.id} cx={x(p!.t)} cy={y(p!.v)} r={3.5} fill="var(--bo-paper)" stroke={STROKE[s.role ?? "context"]} strokeWidth={1.5} />
            ))}
          </g>
        ) : null}
        <rect
          className={c.hit}
          x={f.l}
          y={f.t}
          width={w - f.r - f.l}
          height={height - f.t - f.b}
          onPointerMove={onMove}
          onPointerLeave={() => setHoverT(null)}
        />
      </svg>
      {hovered && hovered[0]?.p ? (
        <Readout x={hx} f={f}>
          <b>{fmtT(hovered[0].p.t, cadence)}</b>
          {hovered
            .sort((a, b) => b.p!.v - a.p!.v)
            .map(({ s, p }) => (
              <span key={s.id} className={c.readRow}>
                <span>
                  <i style={{ background: s.role === "signal" ? "var(--bo-signal)" : s.role === "primary" ? "var(--bo-paper)" : "var(--bo-paper-on-ink-70)" }} />
                  {s.label}
                </span>
                <span>
                  {format(p!.v)}
                  {p!.provisional ? " · prov." : ""}
                </span>
              </span>
            ))}
        </Readout>
      ) : null}
    </div>
  );
}

function rank(r?: Series["role"]) {
  return r === "signal" ? 2 : r === "primary" ? 1 : 0;
}
