"use client";

import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { fmtT, type Pt } from "../data";
import s from "./instrument.module.css";

/**
 * v1 time chart in the instrument language.
 * - lines in ink and solid ink mixes (no new hues), identified by direct end labels
 * - area and bar shading with the dot screen; tints are dots, never opacity
 * - dotted = provisional · dashed = gap between observations (not observed)
 * - Signal marks the latest point of the first series
 * - pointer + keyboard inspection (←/→, Home/End, Esc) and an exact-value table
 */

export type ChartSeries = { id: string; label: string; points: Pt[] };
export type Cadence = "monthly" | "quarterly" | "annual";

const STEP: Record<Cadence, number> = { monthly: 1 / 12, quarterly: 0.25, annual: 1 };
const TONES = ["var(--bo-ink)", "var(--bo-ink-60)", "var(--bo-ink-40)", "var(--bo-ink-80)"];

function niceTicks(min: number, max: number, count = 5) {
  const span = max - min || Math.abs(max) || 1;
  const raw = span / count;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const e = raw / mag;
  const step = (e >= 7.5 ? 10 : e >= 3.5 ? 5 : e >= 1.5 ? 2 : 1) * mag;
  const lo = Math.floor(min / step) * step;
  const hi = Math.ceil(max / step) * step;
  const ticks: number[] = [];
  for (let v = lo; v <= hi + step * 1e-6; v += step) ticks.push(Number(v.toFixed(10)));
  return { ticks, lo, hi };
}

function yearTicks(t0: number, t1: number, maxTicks: number) {
  const span = Math.max(1, t1 - t0);
  const step = [1, 2, 5, 10, 20, 25, 50, 100].find((s) => span / s <= maxTicks) ?? 100;
  const out: number[] = [];
  for (let y = Math.ceil(t0 / step) * step; y <= t1 + 1e-6; y += step) out.push(y);
  return out;
}

export function TimeChart({
  series,
  kind = "line",
  cadence,
  format,
  axisFormat = format,
  zero = false,
  area = false,
  gaps = "break",
  marks = false,
  height = 340,
  label,
}: {
  series: ChartSeries[];
  kind?: "line" | "bars" | "stack";
  cadence: Cadence;
  format: (v: number) => string;
  axisFormat?: (v: number) => string;
  /** Force the y axis to include zero (bars and stacks always do). */
  zero?: boolean;
  /** Dot-screen area under the first line. */
  area?: boolean;
  /** "break" leaves gaps empty; "dashed" bridges them with a dashed (not observed) line. */
  gaps?: "break" | "dashed";
  /** Plot a dot at every observation. */
  marks?: boolean;
  height?: number;
  /** Accessible title of the chart. */
  label: string;
}) {
  const wrap = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(760);
  const [cursor, setCursor] = useState<number | null>(null);
  const uid = useId().replace(/:/g, "");

  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setWidth(Math.max(280, Math.round(e.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const narrow = width < 560;
  const M = { l: narrow ? 44 : 60, r: kind === "line" && series.length > 1 ? (narrow ? 12 : 120) : 16, t: 14, b: 28 };
  const W = width - M.l - M.r;
  const H = height - M.t - M.b;

  // Shared time index (union of all series' times), sorted
  const times = useMemo(() => [...new Set(series.flatMap((x) => x.points.map((p) => p.t)))].sort((a, b) => a - b), [series]);
  const lookup = useMemo(() => series.map((x) => new Map(x.points.map((p) => [p.t, p]))), [series]);

  const t0 = times[0] ?? 0;
  const t1 = times.at(-1) ?? 1;
  const x = (t: number) => M.l + ((t - t0) / Math.max(1e-9, t1 - t0)) * W;

  const stackTotals = kind === "stack" ? times.map((t) => lookup.reduce((sum, m) => sum + (m.get(t)?.v ?? 0), 0)) : [];
  const values = kind === "stack" ? [0, 1] : series.flatMap((x) => x.points.map((p) => p.v));
  const vMin = kind === "line" && !zero ? Math.min(...values) : Math.min(0, ...values);
  const vMax = Math.max(...values);
  const { ticks, lo, hi } = niceTicks(vMin, vMax, narrow ? 4 : 5);
  const y = (v: number) => M.t + (1 - (v - lo) / Math.max(1e-9, hi - lo)) * H;

  const step = STEP[cadence];
  const segs = (pts: Pt[]) => {
    const solid: string[] = [];
    const dotted: string[] = [];
    const dashed: string[] = [];
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1]!;
      const b = pts[i]!;
      const d = `M${x(a.t).toFixed(1)} ${y(a.v).toFixed(1)}L${x(b.t).toFixed(1)} ${y(b.v).toFixed(1)}`;
      if (b.t - a.t > step * 1.6) {
        if (gaps === "dashed") dashed.push(d);
      } else if (a.provisional || b.provisional) dotted.push(d);
      else solid.push(d);
    }
    return { solid: solid.join(""), dotted: dotted.join(""), dashed: dashed.join("") };
  };

  const xt = yearTicks(t0, t1, narrow ? 4 : 8);
  const first = series[0]?.points ?? [];
  const latest = first.at(-1);
  const idx = cursor ?? null;
  const tc = idx !== null ? times[idx] : undefined;

  const onMove = (clientX: number) => {
    const r = wrap.current?.getBoundingClientRect();
    if (!r || !times.length) return;
    const t = t0 + ((clientX - r.left - M.l) / W) * (t1 - t0);
    let best = 0;
    for (let i = 1; i < times.length; i++) if (Math.abs(times[i]! - t) < Math.abs(times[best]! - t)) best = i;
    setCursor(best);
  };
  const onKey = (e: KeyboardEvent) => {
    if (!times.length) return;
    const n = times.length - 1;
    const cur = cursor ?? n;
    const map: Record<string, number> = { ArrowLeft: Math.max(0, cur - 1), ArrowRight: Math.min(n, cur + 1), Home: 0, End: n };
    if (e.key in map) {
      e.preventDefault();
      setCursor(map[e.key]!);
    } else if (e.key === "Escape") setCursor(null);
  };

  const readout =
    tc !== undefined
      ? series.map((sr, i) => ({ label: sr.label, p: lookup[i]!.get(tc) })).filter((r) => r.p)
      : [];

  const barW = kind === "bars" ? Math.max(1, (W / Math.max(1, times.length)) * 0.72) : 0;

  return (
    <figure className={s.figure}>
      <div
        ref={wrap}
        className={s.plot}
        tabIndex={0}
        role="group"
        aria-label={`${label}. Use left and right arrow keys to inspect values.`}
        onPointerMove={(e) => onMove(e.clientX)}
        onPointerLeave={() => setCursor(null)}
        onKeyDown={onKey}
      >
        <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label={label}>
          <defs>
            <pattern id={`d30-${uid}`} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <circle cx="3" cy="3" r="1.15" fill="var(--bo-ink)" />
            </pattern>
            <pattern id={`d60-${uid}`} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <circle cx="3" cy="3" r="2" fill="var(--bo-ink)" />
            </pattern>
          </defs>

          {ticks.map((v) => (
            <g key={v}>
              <line x1={M.l} x2={M.l + W} y1={y(v)} y2={y(v)} className={v === 0 ? s.zero : s.grid} />
              <text x={M.l - 8} y={y(v) + 3.5} textAnchor="end" className={s.tick}>
                {axisFormat(v)}
              </text>
            </g>
          ))}
          {xt.map((yr) => (
            <g key={yr}>
              <line x1={x(yr)} x2={x(yr)} y1={M.t + H} y2={M.t + H + 5} className={s.axis} />
              <text x={x(yr)} y={M.t + H + 18} textAnchor="middle" className={s.tick}>
                {yr}
              </text>
            </g>
          ))}
          <line x1={M.l} x2={M.l + W} y1={M.t + H} y2={M.t + H} className={s.axis} />

          {kind === "line" &&
            series.map((sr, i) => {
              const { solid, dotted, dashed } = segs(sr.points);
              const tone = TONES[i % TONES.length];
              const last = sr.points.at(-1);
              return (
                <g key={sr.id}>
                  {i === 0 && area && sr.points.length > 1 && (
                    <path
                      d={`M${x(sr.points[0]!.t)} ${y(Math.max(lo, 0))}${sr.points.map((p) => `L${x(p.t).toFixed(1)} ${y(p.v).toFixed(1)}`).join("")}L${x(last!.t)} ${y(Math.max(lo, 0))}Z`}
                      fill={`url(#d30-${uid})`}
                    />
                  )}
                  <path d={solid} fill="none" stroke={tone} strokeWidth={i === 0 ? 2 : 1.4} />
                  <path d={dotted} fill="none" stroke={tone} strokeWidth={i === 0 ? 2 : 1.4} strokeDasharray="1.5 3.5" strokeLinecap="round" />
                  <path d={dashed} fill="none" stroke={tone} strokeWidth={1} strokeDasharray="5 5" />
                  {marks && sr.points.map((p) => <circle key={p.t} cx={x(p.t)} cy={y(p.v)} r={2} fill={tone} />)}
                  {series.length > 1 && last && !narrow && (
                    <text x={x(last.t) + 8} y={y(last.v) + 3.5} className={s.endLabel} fill={tone}>
                      {sr.label}
                    </text>
                  )}
                </g>
              );
            })}

          {kind === "bars" &&
            series[0]?.points.map((p) => (
              <rect
                key={p.t}
                x={x(p.t) - barW / 2}
                y={y(Math.max(0, p.v))}
                width={barW}
                height={Math.abs(y(p.v) - y(0))}
                fill={p.provisional ? `url(#d60-${uid})` : "var(--bo-ink)"}
              />
            ))}

          {kind === "stack" &&
            (() => {
              const fills = [`url(#d60-${uid})`, "var(--bo-ink)", `url(#d30-${uid})`];
              let base = times.map(() => 0);
              return series.map((sr, i) => {
                const top = times.map((t, k) => base[k]! + (lookup[i]!.get(t)?.v ?? 0) / (stackTotals[k] || 1));
                const d = `M${times.map((t, k) => `${x(t).toFixed(1)} ${y(top[k]!).toFixed(1)}`).join("L")}L${times
                  .map((t, k) => `${x(t).toFixed(1)} ${y(base[k]!).toFixed(1)}`)
                  .reverse()
                  .join("L")}Z`;
                const mid = (top.at(-1)! + base.at(-1)!) / 2;
                const el = (
                  <g key={sr.id}>
                    <path d={d} fill={fills[i % fills.length]} stroke="var(--bo-paper)" strokeWidth={1} />
                    {!narrow &&
                      (() => {
                        const w = sr.label.length * 6.6 + 14;
                        const solid = i % fills.length === 1;
                        return (
                          <g transform={`translate(${M.l + W - 8 - w} ${y(mid) - 9})`}>
                            <rect width={w} height={18} fill={solid ? "var(--bo-ink)" : "var(--bo-paper)"} stroke={solid ? "var(--bo-paper)" : "var(--bo-ink)"} />
                            <text x={w / 2} y={12.5} textAnchor="middle" className={s.stackLabel} fill={solid ? "var(--bo-paper)" : "var(--bo-ink)"}>
                              {sr.label}
                            </text>
                          </g>
                        );
                      })()}
                  </g>
                );
                base = top;
                return el;
              });
            })()}

          {kind !== "stack" && latest && (
            <circle cx={x(latest.t)} cy={y(latest.v)} r={4.5} fill="var(--bo-signal)" stroke="var(--bo-paper)" strokeWidth={2} />
          )}

          {tc !== undefined && (
            <g>
              <line x1={x(tc)} x2={x(tc)} y1={M.t} y2={M.t + H} className={s.cursor} />
              {kind === "line" &&
                series.map((sr, i) => {
                  const p = lookup[i]!.get(tc);
                  return p ? <circle key={sr.id} cx={x(tc)} cy={y(p.v)} r={3.5} fill="var(--bo-paper)" stroke={TONES[i % TONES.length]} strokeWidth={2} /> : null;
                })}
            </g>
          )}
        </svg>

        {tc !== undefined && readout.length > 0 && (
          <div className={s.readout} style={{ left: Math.min(Math.max(x(tc) + 12, 0), width - 210) }} aria-live="polite">
            <span className="bo-label">{fmtT(tc, cadence)}</span>
            {readout.map((r) => (
              <span key={r.label} className={s.readRow}>
                {series.length > 1 && <span>{r.label}</span>}
                <b className="bo-num">
                  {kind === "stack" ? `${format(r.p!.v)} · ${((r.p!.v / (stackTotals[idx!] || 1)) * 100).toFixed(1)}%` : format(r.p!.v)}
                  {r.p!.provisional ? " · provisional" : ""}
                </b>
              </span>
            ))}
          </div>
        )}
      </div>

      {series.length > 1 && narrow && kind === "line" && (
        <ul className={s.legend}>
          {series.map((sr, i) => (
            <li key={sr.id}>
              <i style={{ background: TONES[i % TONES.length] }} />
              {sr.label}
            </li>
          ))}
        </ul>
      )}

      <details className={s.table}>
        <summary className="bo-label">Data table · {times.length} periods</summary>
        <div className={s.tableScroll}>
          <table>
            <thead>
              <tr>
                <th scope="col">Period</th>
                {series.map((sr) => (
                  <th key={sr.id} scope="col">
                    {sr.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...times].reverse().map((t) => (
                <tr key={t}>
                  <th scope="row">{fmtT(t, cadence)}</th>
                  {lookup.map((m, i) => {
                    const p = m.get(t);
                    return <td key={i}>{p ? `${format(p.v)}${p.provisional ? " (p)" : ""}` : "—"}</td>;
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </figure>
  );
}

/** Ranked horizontal bars for a snapshot (e.g. latest price by region), with a reference row. */
export function RankBars({
  rows,
  reference,
  format,
  label,
}: {
  rows: { id: string; label: string; v: number; active?: boolean }[];
  reference?: { label: string; v: number };
  format: (v: number) => string;
  label: string;
}) {
  const max = Math.max(...rows.map((r) => r.v), reference?.v ?? 0);
  return (
    <figure className={s.rank} aria-label={label}>
      {rows.map((r) => (
        <div key={r.id} className={`${s.rankRow} ${r.active ? s.rankActive : ""}`}>
          <span>{r.label}</span>
          <span className={s.rankTrack}>
            <i style={{ width: `${(r.v / max) * 100}%` }} />
            {reference && <em style={{ left: `${(reference.v / max) * 100}%` }} aria-hidden="true" />}
          </span>
          <b className="bo-fig">{format(r.v)}</b>
        </div>
      ))}
      {reference && (
        <figcaption className="bo-label">
          Dashed line · {reference.label} {format(reference.v)}
        </figcaption>
      )}
    </figure>
  );
}
