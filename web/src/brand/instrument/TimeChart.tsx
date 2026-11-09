"use client";

import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { fmtT, type Pt } from "../data";
import { easeInOut, setOf, useDrawOn, useTweened } from "./motion";
import { SeriesLegend } from "./SeriesLegend";
import s from "./instrument.module.css";

/**
 * v1 time chart — the chart template for every sector (see docs/visual-identity.md › Charts).
 * - series order: Electric, Ochre, Union, Verdigris, Plum
 * - multi-series lines: SeriesLegend under the plot names the lines and shows latest values, so the
 *   plot uses the full stage width. End-of-line leaders are opt-in (`leaders={true}`) for the
 *   Generation mix pattern only. One series: a Latest card in the gutter when leaders are on
 *   (default). Narrow screens always use the legend only.
 * - clean observed lines with no decorative area; only supplied statistical range bands are drawn
 * - bars solid ink; provisional bars and stack layers use pen hatching or the muted chart tones
 * - dotted = provisional · dashed = gap between observations (not observed)
 * - on a line, the latest point of the first series is an open ink ring. One series: "Latest" with
 *   value and period in the gutter. Several series: each end gets a leader + name (first also shows
 *   the latest figure). Bars do not get the ring: the last column is already that period.
 *   No Signal red in charts: a mark must explain itself; clean line direction A.
 * - pointer + keyboard inspection (←/→, Home/End, Esc) and an exact-value table
 * - motion (default on, `motion={false}` to opt out; see ./motion.ts): lines are printed by a carriage
 *   and columns set one after another on first view; axes travel when the domain changes.
 *   Inspection snaps to the observation (no glide); readout values change at once. Reduced motion: final state.
 */

export type ChartSeries = { id: string; label: string; points: Pt[]; role?: "reference" };
export type Cadence = "monthly" | "quarterly" | "annual";

const STEP: Record<Cadence, number> = { monthly: 1 / 12, quarterly: 0.25, annual: 1 };
/** Distinct categorical colours; labels remain Union, with matching swatches. */
export const SERIES_TONES = [
  "var(--bo-ink)",
  "var(--bo-chart-2)",
  "var(--bo-chart-3)",
  "var(--bo-chart-4)",
  "var(--bo-chart-5)",
];
/** Retain identity assignments for the lifetime of a chart, including removed series. */
export function assignSeriesSlots(previous: Map<string, number>, ids: string[]) {
  const next = new Map(previous);
  for (const id of ids) if (!next.has(id)) next.set(id, next.size % SERIES_TONES.length);
  return next;
}
const TONES = SERIES_TONES;
/** Stack layers — distinct solids so SeriesLegend swatches match the plot (hatch is for provisional bars only). */
const LAYERS = [
  "var(--bo-ink)",
  "var(--bo-green)",
  "var(--bo-mustard)",
  "var(--bo-chart-4)",
  "var(--bo-chart-5)",
];
/** Square marks at observations only when they can be told apart; dense series stay a clean line. */
const MAX_MARKS = 60;
/** Above this, end-of-line leaders become spaghetti — use a compact legend instead. */
const MAX_END_LEADERS = 5;

function Mark({ cx, cy, r = 4, fill, stroke, strokeWidth = 1.75 }: { cx: number; cy: number; r?: number; fill: string; stroke: string; strokeWidth?: number }) {
  return <circle cx={cx} cy={cy} r={r} fill={fill} stroke={stroke} strokeWidth={strokeWidth} />;
}

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

/** Gridlines can be dense. Labels cannot: on a short track every tick collides. */
function labelTicks(ticks: number[], maxLabels = 4): number[] {
  if (ticks.length <= maxLabels) return ticks;
  const step = Math.ceil((ticks.length - 1) / (maxLabels - 1));
  const picked = ticks.filter((_, index) => index % step === 0);
  const last = ticks[ticks.length - 1];
  if (last !== undefined && picked[picked.length - 1] !== last) picked.push(last);
  return picked;
}

function yearTicks(t0: number, t1: number, maxTicks: number, cadence: Cadence = "annual") {
  // One calendar year of monthly points needs month steps — year steps collapse to a single label.
  if (cadence === "monthly" && t1 - t0 <= 1.5) {
    const out: number[] = [];
    const start = Math.floor(t0 * 12 + 1e-6) / 12;
    for (let t = start; t <= t1 + 1e-6; t += 1 / 12) out.push(Number(t.toFixed(6)));
    if (out.length <= maxTicks) return out;
    const stride = Math.ceil(out.length / maxTicks);
    return out.filter((_, i) => i % stride === 0);
  }
  const span = Math.max(1, t1 - t0);
  const step = [1, 2, 5, 10, 20, 25, 50, 100].find((s) => span / s <= maxTicks) ?? 100;
  const out: number[] = [];
  for (let y = Math.ceil(t0 / step) * step; y <= t1 + 1e-6; y += step) out.push(y);
  return out;
}

export type InspectRow = { label: string; value: string };

/** A dated event drawn as a vertical rule through the plot (e.g. Royal Assent). Context, not a data point. */
export type ChartRule = { id: string; t: number; label?: string; active?: boolean };

/**
 * Plot margins for a chart of this width, kind and series. Exported so instruments that sit on the
 * same time axis (EventRail) line up with the plot exactly.
 *
 * Multi-series charts do not reserve an end-label strip by default — SeriesLegend is the key and
 * the plot fills the stage. Pass `leaders` true only when end-of-line names are actually drawn
 * (single-series Latest card, or an explicit Generation-mix multi-series).
 */
export function chartMargins(
  width: number,
  kind: "line" | "bars" | "stack" = "line",
  seriesCount = 1,
  /** When true and end labels are drawn, reserve the right gutter. */
  leaders = false,
  /** Series display names — sizes a multi-series end-label gutter when leaders are on. */
  labels: readonly string[] = [],
) {
  const narrow = width < 560;
  const manySeries = kind === "line" && seriesCount > MAX_END_LEADERS;
  // Hairline edge unless end labels are drawn into a gutter.
  let lineRight = narrow ? 12 : 16;
  if (!narrow && leaders) {
    if (seriesCount <= 1) {
      lineRight = 128; // "Latest" + value + period card
    } else {
      const longest = labels.length
        ? Math.max(...labels.map((l) => Math.min(l.length, 22)))
        : manySeries
          ? 14
          : 12;
      // Mono micro caps ≈ 6.6px/char; + colour tick (14) + leader gap (20) + edge pad (8).
      lineRight = Math.min(manySeries ? 150 : 160, Math.max(96, Math.ceil(longest * 6.6) + 42));
    }
  }
  return {
    l: narrow ? 44 : 60,
    r: kind === "line" ? lineRight : kind === "bars" ? 12 : 16,
    t: 14,
    b: 28,
  };
}

/** Series selection belongs to the enclosing explorer; show every selected series. */
export function TimeChart({
  series: inputSeries,
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
  inspect,
  band,
  sharedDomain,
  sharedTime,
  periodLabel,
  rules,
  motion = true,
  showTable = true,
  leaders,
}: {
  /** Disable only when the enclosing explorer provides a dedicated accessible Data view. */
  showTable?: boolean;
  series: ChartSeries[];
  /** Draw-on, retime and guide glide (default on). */
  motion?: boolean;
  sharedDomain?: [number, number];
  sharedTime?: [number, number];
  /** Dated events as vertical rules (hairline; the active one in ink with its label). Never data. */
  rules?: ChartRule[];
  /** Preserve financial years or survey rounds when the caller has that metadata. */
  periodLabel?: (t: number) => string;
  /**
   * A range across places behind the lines (e.g. 10th–90th percentile of local authorities),
   * printed as a lavender dot screen between matching observations; edges are named
   * in the margin. `lo` and `hi` share their periods.
   */
  band?: { lo: Pt[]; hi: Pt[]; loLabel: string; hiLabel: string };
  kind?: "line" | "bars" | "stack";
  cadence: Cadence;
  format: (v: number) => string;
  axisFormat?: (v: number) => string;
  /** Force the y axis to include zero (bars and stacks always do). */
  zero?: boolean;
  /** Deprecated: clean line direction A has no decorative area. */
  area?: boolean; // Deprecated: retained for source compatibility; no decorative fill.
  /** "break" leaves gaps empty; "dashed" bridges them with a dashed (not observed) line. */
  gaps?: "break" | "dashed";
  /** Small open rings at observations (sparse series only; ignored above 60 points). */
  marks?: boolean;
  height?: number;
  /** Accessible title of the chart. */
  label: string;
  /** Extra readout rows for the hovered period (place, YoY, sales, status, …). */
  inspect?: (t: number) => InspectRow[];
  /**
   * End-of-line labels in the right gutter (wide plots).
   * Omit for auto: on for one series (Latest card); off for several so SeriesLegend keys the
   * lines and the plot fills the stage. Pass true on multi-series only for Generation-mix style.
   */
  leaders?: boolean;
}) {
  const series = useMemo(() => {
    return inputSeries.map(sr => ({ ...sr, points: sr.points.filter(p => Number.isFinite(p.t) && Number.isFinite(p.v)).toSorted((a, b) => a.t - b.t) }));
  }, [inputSeries]);
  // Retained for callers using the former area API; clean lines are now mandatory.
  void area;
  // Remember slots by identity across selection changes, rather than recolouring by position.
  const slots = useRef(new Map<string, number>());
  slots.current = assignSeriesSlots(slots.current, inputSeries.filter(sr => sr.role !== "reference").map(sr => sr.id));
  const toneFor = (id: string) => inputSeries.find(sr => sr.id === id)?.role === "reference"
    ? "var(--bo-chart-reference)" : TONES[slots.current.get(id) ?? 0];
  const wrap = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(760);
  const [tableOpen, setTableOpen] = useState(false);
  const [cursor, setCursor] = useState<number | null>(null);
  const uid = useId().replace(/:/g, "");

  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setWidth(Math.max(280, Math.round(e.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const period = (t: number) => periodLabel?.(t) ?? fmtT(t, cadence);
  const narrow = width < 560;
  const multi = series.length > 1;
  const manySeries = kind === "line" && series.length > MAX_END_LEADERS;
  // Auto: Latest card for one series; multi-series use SeriesLegend so the plot fills the stage.
  const useLeaders = leaders ?? !multi;
  const showEndLeaders = useLeaders && kind === "line" && !narrow;
  const showSideLatest = false;
  const showLegend = multi;
  const M = chartMargins(
    width,
    kind,
    series.length,
    showEndLeaders,
    series.map((sr) => sr.label),
  );
  const W = width - M.l - M.r;
  const H = height - M.t - M.b;

  // Shared time index (union of all series' times), sorted
  const times = useMemo(() => [...new Set(series.flatMap((x) => x.points.map((p) => p.t)))].sort((a, b) => a - b), [series]);
  const lookup = useMemo(() => series.map((x) => new Map(x.points.map((p) => [p.t, p]))), [series]);

  // Motion: the target domain travels (retime); the draw clock prints the chart on first view.
  const target = useMemo(() => {
    if (times.length === 0) return null;
    const vals =
      kind === "stack"
        ? [0, 1]
        : [...series.flatMap((x) => x.points.map((p) => p.v)), ...(band ? [...band.lo, ...band.hi].map((p) => p.v) : [])];
    const min = kind === "line" && !zero ? Math.min(...vals) : Math.min(0, ...vals);
    const nice = niceTicks(sharedDomain?.[0] ?? min, sharedDomain?.[1] ?? Math.max(...vals), narrow ? 4 : 5);
    return { t0: sharedTime?.[0] ?? times[0]!, t1: sharedTime?.[1] ?? times.at(-1)!, lo: nice.lo, hi: nice.hi };
  }, [times, sharedTime, kind, series, band, zero, sharedDomain, narrow]);
  const dom = useTweened(target, { enabled: motion });
  const drawK = useDrawOn(wrap, { enabled: motion });

  // No observations (empty range, failed load): an honest empty frame, never NaN geometry.
  // Keeps the wrap ref so the width observer is attached when data arrives.
  if (times.length === 0) {
    return (
      <figure className={s.figure} aria-label={label}>
        <div ref={wrap} className={`${s.plot} ${s.empty}`} style={{ height }}>
          <p className="bo-label">No observations</p>
          <p>Nothing to plot for this selection. Gaps stay visible; the Exchange does not estimate.</p>
        </div>
      </figure>
    );
  }

  // Target domain (ticks, captions) vs the travelling domain (positions).
  const t0 = sharedTime?.[0] ?? times[0] ?? 0;
  const t1 = sharedTime?.[1] ?? times.at(-1) ?? 1;
  const a0 = dom?.t0 ?? t0;
  const a1 = dom?.t1 ?? t1;
  const x = (t: number) => M.l + ((t - a0) / Math.max(1e-9, a1 - a0)) * W;

  const stackTotals = kind === "stack" ? times.map((t) => lookup.reduce((sum, m) => sum + (m.get(t)?.v ?? 0), 0)) : [];
  const values =
    kind === "stack"
      ? [0, 1]
      : [...series.flatMap((x) => x.points.map((p) => p.v)), ...(band ? [...band.lo, ...band.hi].map((p) => p.v) : [])];
  const vMin = kind === "line" && !zero ? Math.min(...values) : Math.min(0, ...values);
  const vMax = Math.max(...values);
  const { ticks, lo, hi } = niceTicks(sharedDomain?.[0] ?? vMin, sharedDomain?.[1] ?? vMax, narrow ? 4 : 5);
  const ylo = dom?.lo ?? lo;
  const yhi = dom?.hi ?? hi;
  const y = (v: number) => M.t + (1 - (v - ylo) / Math.max(1e-9, yhi - ylo)) * H;
  const inY = (v: number) => y(v) >= M.t - 0.5 && y(v) <= M.t + H + 0.5;
  const inX = (t: number) => x(t) >= M.l - 0.5 && x(t) <= M.l + W + 0.5;
  // Draw-on: lines and stacks are revealed left to right; columns are set one after another.
  const drawn = drawK >= 1;
  const reveal = kind === "bars" ? 1 : easeInOut(drawK);

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

  const xt = yearTicks(t0, t1, narrow ? 4 : 8, cadence);
  const first = series[0]?.points ?? [];
  const latest = first.at(-1);
  const idx = cursor === null ? null : Math.min(cursor, times.length - 1);
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
    const cur = cursor === null ? n : Math.min(cursor, n);
    const map: Record<string, number> = { ArrowLeft: Math.max(0, cur - 1), ArrowRight: Math.min(n, cur + 1), Home: 0, End: n };
    if (e.key in map) {
      e.preventDefault();
      setCursor(map[e.key]!);
    } else if (e.key === "Escape") setCursor(null);
  };

  const readout =
    tc !== undefined
      ? series.map((sr, i) => ({ id: sr.id, label: sr.label, p: lookup[i]!.get(tc) }))
      : [];

  const slot = W / Math.max(1, times.length);
  // Bars: capped width + paper gap so dense monthly volumes read as a clean strip, not a solid block.
  const barW = kind === "bars" ? Math.max(1.5, Math.min(slot * 0.58, slot > 8 ? 11 : slot * 0.7)) : 0;

  const isLine = kind === "line";

  return (
    <figure className={s.figure}>
      <div
        ref={wrap}
        className={s.plot}
        tabIndex={0}
        role="group"
        aria-label={`${label}. Use left and right arrow keys to inspect values.`}
        onPointerDown={(e) => onMove(e.clientX)}
        onPointerMove={(e) => onMove(e.clientX)}
        onPointerLeave={(e) => { if (e.pointerType === "mouse") setCursor(null); }}
        onKeyDown={onKey}
      >
        <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label={label}>
          <defs>
            <pattern id={`range-${uid}`} width="5" height="5" patternUnits="userSpaceOnUse">
              <circle cx="1.5" cy="1.5" r="1" fill="var(--bo-chart-band)" />
            </pattern>
            {/* Pen hatching: provisional bars and the fourth stack layer */}
            <pattern id={`hatch-${uid}`} width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <line x1="0" y1="0" x2="0" y2="4" stroke="var(--bo-ink)" strokeWidth="1" />
            </pattern>
            {/* The plot: marks stay inside while axes travel, and are revealed by the carriage.
                Bars are centred on the first and last year, so the frame has to include half a bar
                or those two columns are sliced narrower than the rest. */}
            <clipPath id={`plot-${uid}`}>
              <rect
                x={M.l - (kind === "bars" ? barW / 2 + 1 : 2)}
                y={M.t - 6}
                width={W * reveal + (reveal >= 1 ? (kind === "bars" ? barW + 2 : 4) : 2)}
                height={H + 12}
              />
            </clipPath>
          </defs>

          {ticks.filter(inY).map((v) => (
            <g key={v}>
              <line x1={M.l} x2={M.l + W} y1={y(v)} y2={y(v)} className={v === 0 ? s.zero : s.grid} />
              <text x={M.l - 8} y={y(v) + 3.5} textAnchor="end" className={s.tick}>
                {axisFormat(v)}
              </text>
            </g>
          ))}
          {xt.filter(inX).map((yr) => (
            <g key={yr}>
              <line x1={x(yr)} x2={x(yr)} y1={M.t + H} y2={M.t + H + 5} className={s.axis} />
              <text x={x(yr)} y={M.t + H + 18} textAnchor="middle" className={s.tick}>
                {periodLabel ? periodLabel(yr) : cadence === "monthly" ? fmtT(yr, "monthly") : yr}
              </text>
            </g>
          ))}
          <line x1={M.l} x2={M.l + W} y1={M.t + H} y2={M.t + H} className={s.axis} />

          {rules?.filter((r) => inX(r.t)).map((r) => (
            <g key={r.id} className={r.active ? s.ruleActive : s.rule} aria-hidden="true">
              <line x1={x(r.t)} x2={x(r.t)} y1={M.t} y2={M.t + H} />
              {r.active && r.label && (
                <text x={x(r.t) + (x(r.t) > M.l + W * 0.7 ? -6 : 6)} y={M.t + 9} textAnchor={x(r.t) > M.l + W * 0.7 ? "end" : "start"}>
                  {r.label}
                </text>
              )}
            </g>
          ))}

          <g clipPath={`url(#plot-${uid})`}>
          {kind === "line" &&
            series.map((sr, i) => {
              const { solid, dotted, dashed } = segs(sr.points);
              const tone = toneFor(sr.id);
              return (
                <g key={sr.id}>
                  {i === 0 && band && (() => {
                    const high = new Map(band.hi.map(p => [p.t, p.v]));
                    const runs: { t: number; lo: number; hi: number }[][] = [];
                    let run: { t: number; lo: number; hi: number }[] = [];
                    for (const p of [...band.lo].sort((a, b) => a.t - b.t)) {
                      const hi = high.get(p.t);
                      if (!Number.isFinite(p.v) || hi === undefined || !Number.isFinite(hi) || hi < p.v) {
                        if (run.length) runs.push(run);
                        run = [];
                        continue;
                      }
                      if (run.length && p.t - run.at(-1)!.t > step * 1.6) { runs.push(run); run = []; }
                      run.push({ t: p.t, lo: p.v, hi });
                    }
                    if (run.length) runs.push(run);
                    return <g aria-hidden="true">{runs.filter(run => run.length > 1).map((run, n) => <path key={n}
                      d={`M${run.map(p => `${x(p.t)},${y(p.hi)}`).join("L")}L${[...run].reverse().map(p => `${x(p.t)},${y(p.lo)}`).join("L")}Z`}
                      fill={`url(#range-${uid})`} />)}</g>;
                  })()}
                  <path d={solid} fill="none" stroke={tone} strokeWidth={2} strokeDasharray={sr.role === "reference" ? "5 5" : undefined} strokeLinejoin="round" />
                  <path d={dotted} fill="none" stroke={tone} strokeWidth={2} strokeDasharray="1.5 3.5" strokeLinecap="round" />
                  <path d={dashed} fill="none" stroke={tone} strokeWidth={1} strokeDasharray="5 5" />
                  {(marks || sr.points.length === 1) &&
                    sr.points.length <= MAX_MARKS &&
                    sr.points.map((p) => (
                      <Mark key={p.t} cx={x(p.t)} cy={y(p.v)} r={2} fill="var(--bo-paper)" stroke={tone} strokeWidth={1.25} />
                    ))}
                </g>
              );
            })}

          {kind === "bars" &&
            series[0]?.points.map((p, j, all) => {
              const h = Math.abs(y(p.v) - y(0)) * setOf(drawK, j, all.length);
              return (
              <rect
                key={p.t}
                x={x(p.t) - barW / 2}
                y={p.v >= 0 ? y(0) - h : y(0)}
                width={barW}
                height={h}
                fill={p.provisional ? `url(#hatch-${uid})` : "var(--bo-ink)"}
                stroke="var(--bo-paper)"
                strokeWidth={slot > 4 ? 0.75 : 0}
              />
              );
            })}

          {kind === "stack" &&
            (() => {
              let base = times.map(() => 0);
              return series.map((sr, i) => {
                const top = times.map((t, k) => base[k]! + (lookup[i]!.get(t)?.v ?? 0) / (stackTotals[k] || 1));
                const d = `M${times.map((t, k) => `${x(t).toFixed(1)} ${y(top[k]!).toFixed(1)}`).join("L")}L${times
                  .map((t, k) => `${x(t).toFixed(1)} ${y(base[k]!).toFixed(1)}`)
                  .reverse()
                  .join("L")}Z`;
                // Names live in SeriesLegend under the plot — no in-plot tags (avoids top/bottom split).
                const el = (
                  <g key={sr.id}>
                    <path d={d} fill={LAYERS[i % LAYERS.length]} stroke="var(--bo-paper)" strokeWidth={1.5} />
                  </g>
                );
                base = top;
                return el;
              });
            })()}
          </g>

          {/* The carriage: a hairline at the printing edge, reading out the period it passes. */}
          {kind !== "bars" && drawK > 0 && !drawn && (() => {
            const ex = M.l + W * reveal;
            const tAt = Math.round((a0 + reveal * (a1 - a0)) / step) * step;
            return (
              <g aria-hidden="true">
                <line x1={ex} x2={ex} y1={M.t} y2={M.t + H} className={s.cursor} />
                <text x={Math.min(ex + 6, M.l + W - 60)} y={M.t + 10} className={s.tick}>
                  {period(tAt)}
                </text>
              </g>
            );
          })()}

          {drawn && kind === "line" && latest && (
            <Mark cx={x(latest.t)} cy={y(latest.v)} r={4} fill="var(--bo-paper)" stroke={toneFor(series[0].id)} strokeWidth={1.75} />
          )}
          {/* End labels with leaders in the right margin.
              One series: Latest card. Multi-series: name + colour tick per line (Generation mix pattern).
              Stacked so labels never collide. */}
          {drawn &&
            isLine &&
            !narrow &&
            showEndLeaders &&
            (() => {
              const lx = M.l + W + 14;
              const short = (t: string) => (t.length > 22 ? `${t.slice(0, 21)}…` : t);
              type Item = { key: string; i: number; label: string; last: Pt; py: number; h: number; top: number };
              const lines: Item[] = series.flatMap((sr, i) => {
                const last = sr.points.at(-1);
                if (!last) return [];
                const py = y(last.v);
                if (multi) return [{ key: sr.id, i, label: sr.label, last, py, h: 14, top: py - 7 }];
                return [{ key: sr.id, i, label: sr.label, last, py, h: 46, top: py - 22 }];
              });
              const edges: Item[] = band
                ? ([
                    [band.hi.at(-1), band.hiLabel, "band-hi"],
                    [band.lo.at(-1), band.loLabel, "band-lo"],
                  ] as const).flatMap(([p, text, key]) => (p ? [{ key, i: -1, label: text, last: p, py: y(p.v), h: 14, top: y(p.v) - 7 }] : []))
                : [];
              const items = [...lines, ...edges].sort((a, b) => a.top - b.top);
              const gap = multi ? 2 : 4;
              for (let k = 1; k < items.length; k++) items[k]!.top = Math.max(items[k]!.top, items[k - 1]!.top + items[k - 1]!.h + gap);
              for (let k = items.length - 1; k >= 0; k--) {
                const limit = k === items.length - 1 ? M.t + H : items[k + 1]!.top - gap;
                if (items[k]!.top + items[k]!.h > limit) items[k]!.top = limit - items[k]!.h;
              }
              return items.map(({ key, label: name, i, last, py, top }) => {
                const tone = i >= 0 ? toneFor(key) : undefined;
                const mid = top + 7;
                return (
                  <g key={`end-${key}`} className={s.latest}>
                    <title>{`${name} · ${format(last.v)} · ${period(last.t)}`}</title>
                    <path
                      d={`M${x(last.t) + 7} ${py}L${lx - 6} ${multi || i === -1 ? mid : top + 22}`}
                      className={s.leader}
                      style={tone ? { stroke: tone } : undefined}
                    />
                    {multi || i === -1 ? (
                      <g transform={`translate(${lx} ${mid})`}>
                        {i >= 0 && <line x1={0} x2={10} y1={0} y2={0} stroke={tone} strokeWidth={2} />}
                        <text x={i >= 0 ? 14 : 0} y={3.5} className={i >= 0 ? s.endLabel : s.tick}>
                          {short(name)}
                        </text>
                      </g>
                    ) : (
                      <g transform={`translate(${lx} ${top})`}>
                        <text y={9} className={s.latestKey}>
                          Latest
                        </text>
                        <text y={30} className={s.latestValue}>
                          {format(last.v)}
                        </text>
                        <text y={43} className={s.tick}>
                          {period(last.t)}
                          {last.provisional ? " · provisional" : ""}
                        </text>
                      </g>
                    )}
                  </g>
                );
              });
            })()}
          {drawn && isLine && !narrow && showSideLatest && latest && (
            <g className={s.latest} transform={`translate(${M.l + W + 12} ${Math.min(Math.max(y(latest.v) - 22, M.t), M.t + H - 46)})`}>
              <text y={9} className={s.latestKey}>
                Latest
              </text>
              <text y={30} className={s.latestValue}>
                {format(latest.v)}
              </text>
              <text y={43} className={s.tick}>
                {period(latest.t)}
                {latest.provisional ? " · provisional" : ""}
              </text>
            </g>
          )}

          {tc !== undefined && (
            <g>
              <line x1={x(tc)} x2={x(tc)} y1={M.t} y2={M.t + H} className={s.cursor} />
              {kind === "line" &&
                series.map((sr, i) => {
                  const p = lookup[i]!.get(tc);
                  return p ? (
                    <Mark key={sr.id} cx={x(tc)} cy={y(p.v)} r={3} fill="var(--bo-paper)" stroke={toneFor(sr.id)} strokeWidth={2} />
                  ) : null;
                })}
            </g>
          )}
        </svg>

        {tc !== undefined && readout.length > 0 && (
          <div
            className={s.readout}
            data-rich={inspect ? "true" : undefined}
            data-stack={kind === "stack" ? "true" : undefined}
            style={{
              left: Math.max(
                0,
                Math.min(x(tc) + 12, width - (inspect || kind === "stack" ? 320 : 240)),
              ),
            }}
            aria-live="polite"
          >
            {/* Period stays for screen readers; the floating year in the plot corner was noise. */}
            <span className="bo-visually-hidden">{period(tc)}</span>
            {readout.map((r) => (
              <span key={r.id} className={s.readRow}>
                {series.length > 1 && <span className={s.readName}><i aria-hidden="true" style={{ background: toneFor(r.id) }} />{r.label}</span>}
                <b className="bo-num">
                  {!r.p ? "Not available" : kind === "stack" ? `${format(r.p.v)} · ${((r.p.v / (stackTotals[idx!] || 1)) * 100).toFixed(1)}%` : format(r.p.v)}
                  {!inspect && r.p?.provisional ? " · provisional" : ""}
                </b>
              </span>
            ))}
            {inspect?.(tc).map((row) => (
              <span key={row.label} className={s.readRow}>
                <span>{row.label}</span>
                <b className="bo-num">{row.value}</b>
              </span>
            ))}
          </div>
        )}
      </div>

      {showLegend && (
        <SeriesLegend
          dense={manySeries || series.length > 4}
          items={series.map((sr, i) => {
            const last = sr.points.at(-1);
            const tone = kind === "stack" ? LAYERS[i % LAYERS.length]! : toneFor(sr.id);
            return {
              id: sr.id,
              label: sr.label,
              tone,
              value: last ? format(last.v) : undefined,
            };
          })}
        />
      )}

      {showTable && <details className={s.table} onToggle={event => setTableOpen(event.currentTarget.open)}>
        <summary className="bo-disclosure">Exact values · selected series and period</summary>
        {tableOpen && <div className={s.tableScroll}><table>
          <caption>{label}</caption>
          <thead><tr>
            <th scope="col">Period</th>
            {series.map(sr => <th scope="col" key={sr.id}>{sr.label}</th>)}
            {band && <th scope="col">{band.loLabel}</th>}
            {band && <th scope="col">{band.hiLabel}</th>}
          </tr></thead>
          <tbody>{times.map(t => {
            const lo = band?.lo.find((p) => p.t === t);
            const hi = band?.hi.find((p) => p.t === t);
            return <tr key={t}><th scope="row">{period(t)}</th>{series.map((sr, i) => {
            const p = lookup[i].get(t);
            return <td key={sr.id}>{p ? `${format(p.v)}${p.provisional ? " · provisional" : ""}` : "Not available"}</td>;
          })}
            {band && <td>{lo ? format(lo.v) : "Not available"}</td>}
            {band && <td>{hi ? format(hi.v) : "Not available"}</td>}
          </tr>;
          })}</tbody>
        </table></div>}
      </details>}
    </figure>
  );
}

/** Ranked horizontal bars for a snapshot (e.g. latest price by region), with a reference row. */
export function RankBars({
  rows,
  reference,
  format,
  label,
  onSelect,
  motion = true,
}: {
  rows: { id: string; label: string; v: number; active?: boolean }[];
  /** Bars are set one after another on first view and when the values change (default on). */
  motion?: boolean;
  reference?: { label: string; v: number };
  format: (v: number) => string;
  label: string;
  /** When set, each row is a toggle button (e.g. linked to a region map). */
  onSelect?: (id: string) => void;
}) {
  const max = Math.max(...rows.map((r) => r.v), reference?.v ?? 0);
  const ref = useRef<HTMLElement>(null);
  const k = useDrawOn(ref, { enabled: motion, ms: 1100, replayKey: rows.map((r) => `${r.id}:${r.v}`).join("|") });
  return (
    <figure ref={ref} className={s.rank} aria-label={label}>
      {rows.map((r, j) => {
        const body = (
          <>
            <span>{r.label}</span>
            <span className={s.rankTrack}>
              <i style={{ width: `${(r.v / max) * 100 * setOf(k, j, rows.length)}%` }} />
              {reference && <em style={{ left: `${(reference.v / max) * 100}%` }} aria-hidden="true" />}
            </span>
            <b className="bo-fig">{format(r.v)}</b>
          </>
        );
        return onSelect ? (
          <button
            key={r.id}
            type="button"
            className={`${s.rankRow} ${s.rankButton} ${r.active ? s.rankActive : ""}`}
            aria-pressed={r.active === true}
            onClick={() => onSelect(r.id)}
          >
            {body}
          </button>
        ) : (
          <div key={r.id} className={`${s.rankRow} ${r.active ? s.rankActive : ""}`}>
            {body}
          </div>
        );
      })}
      {reference && (
        <figcaption className="bo-label">
          Dashed line · {reference.label} {format(reference.v)}
        </figcaption>
      )}
    </figure>
  );
}

/**
 * Start → latest for each row on one shared scale (e.g. each region's first and latest year).
 * Open square = first period, solid ink square = latest, joined by a rule; a reference row (e.g. England)
 * sits on top. Template form for "how far has each place moved?".
 */
export function ChangeRows({
  rows,
  reference,
  fromLabel,
  toLabel,
  format,
  axisFormat = format,
  label,
}: {
  rows: { id: string; label: string; from: number; to: number }[];
  reference?: { label: string; from: number; to: number };
  fromLabel: string;
  toLabel: string;
  format: (v: number) => string;
  axisFormat?: (v: number) => string;
  label: string;
}) {
  const all = [...rows, ...(reference ? [reference] : [])].flatMap((r) => [r.from, r.to]);
  if (all.length === 0) return null;
  const { ticks, lo, hi } = niceTicks(Math.min(0, ...all), Math.max(...all), 5);
  const labels = labelTicks(ticks, 3);
  const pos = (v: number) => ((v - lo) / Math.max(1e-9, hi - lo)) * 100;
  const row = (r: { label: string; from: number; to: number }, key: string, isRef = false) => {
    const a = pos(Math.min(r.from, r.to));
    const b = pos(Math.max(r.from, r.to));
    return (
      <div key={key} className={`${s.changeRow} ${isRef ? s.changeRef : ""}`}>
        <span className={s.changeName}>{r.label}</span>
        <span className={s.changeTrack} aria-hidden="true">
          {ticks.map((v) => (
            <em key={v} style={{ left: `${pos(v)}%` }} />
          ))}
          <i className={s.changeRule} style={{ left: `${a}%`, width: `${b - a}%` }} />
          <i className={s.changeFrom} style={{ left: `${pos(r.from)}%` }} />
          <i className={s.changeTo} style={{ left: `${pos(r.to)}%` }} />
        </span>
        <span className={s.changeValues}>
          <span>{format(r.from)}</span>
          <span aria-hidden="true">→</span>
          <b className="bo-fig">{format(r.to)}</b>
        </span>
      </div>
    );
  };
  return (
    <figure className={s.change} aria-label={label}>
      <div className={s.changeKey}>
        <span className={s.changeKeyItem}>
          <i className={s.changeFrom} aria-hidden="true" />
          {fromLabel}
        </span>
        <span className={s.changeKeyItem}>
          <i className={s.changeTo} aria-hidden="true" />
          {toLabel}
        </span>
      </div>
      {reference && row(reference, "ref", true)}
      {rows.map((r) => row(r, r.id))}
      <div className={s.changeRow} aria-hidden="true">
        <span />
        <span className={s.changeScale}>
          {labels.map((v) => (
            <span
              key={v}
              data-edge={v === labels[0] ? "start" : v === labels[labels.length - 1] ? "end" : undefined}
              style={{ left: `${pos(v)}%` }}
            >
              {axisFormat(v)}
            </span>
          ))}
        </span>
        <span />
      </div>
    </figure>
  );
}
