"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { DualScramble, FlickerFigure } from "@/brand/motion";
import { fmt, niceTicks, yearTicks } from "@/brand/data";
import { useWidth } from "@/brand/useWidth";
import s from "./chart-motion.module.css";

/**
 * Lab: motion for the brand charts. Five studies on real Exchange series, drawn in the
 * TimeChart language (one ink, clean line, dotted provisional, open ring on the latest point).
 * Motion moves the marks only: no fades, no texture in the plot. Reduced motion = final state.
 */

type P = { t: number; v: number; p: boolean };
type Rank = { id: string; label: string; price: number; change: number; period: string };
export type LabData = {
  line: { label: string; points: P[]; source: string };
  ranks: { rows: Rank[]; source: string };
  columns: { points: P[]; source: string };
};

/* ——— motion primitives ——— */

/** ≈ --bo-ease cubic-bezier(0.2, 0.8, 0.2, 1) */
const easeOut = (x: number) => 1 - Math.pow(1 - x, 3.2);
/** Carriage travel (≈ power3.inOut). */
const easeInOut = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);

function useReduced() {
  const [r, setR] = useState(false);
  useEffect(() => setR(matchMedia("(prefers-reduced-motion: reduce)").matches), []);
  return r;
}

/** True once the element has been half on screen. */
function useSeen<T extends Element>() {
  const ref = useRef<T>(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => e?.isIntersecting && setSeen(true), { threshold: 0.5 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return [ref, seen] as const;
}

function tween(ms: number, ease: (x: number) => number, on: (k: number) => void, done?: () => void) {
  let raf = 0;
  const t0 = performance.now();
  const step = (now: number) => {
    const k = Math.min(1, (now - t0) / ms);
    on(ease(k));
    if (k < 1) raf = requestAnimationFrame(step);
    else done?.();
  };
  raf = requestAnimationFrame(step);
  return () => cancelAnimationFrame(raf);
}

/* ——— drawing helpers ——— */

/** Nice ticks that cover [lo, hi] (niceTicks alone can stop below the maximum). */
function cover(lo: number, hi: number, count = 4): number[] {
  const base = niceTicks(lo, hi, count);
  const step = base.length > 1 ? base[1]! - base[0]! : Math.max(1, Math.abs(hi));
  const start = Math.floor(lo / step) * step;
  const out: number[] = [];
  for (let v = start; v < hi + step - 1e-9; v += step) out.push(Number(v.toFixed(10)));
  return out;
}

const M = { top: 16, right: 132, bottom: 28, left: 56 };
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const monthLabel = (t: number) => `${MON[Math.round((t % 1) * 12) % 12]} ${Math.floor(t + 1e-6)}`;
const quarterLabel = (t: number) => `Q${Math.floor(((t % 1) * 12 + 1e-6) / 3) + 1} ${Math.floor(t + 1e-6)}`;

/** Solid path for observed points, dotted path for provisional ones (joined at the last observed). */
function paths(pts: P[], x: (t: number) => number, y: (v: number) => number) {
  const firstProv = pts.findIndex((p) => p.p);
  const solid = firstProv < 0 ? pts : pts.slice(0, firstProv);
  const prov = firstProv < 0 ? [] : pts.slice(Math.max(0, firstProv - 1));
  const d = (list: P[]) => list.map((p, i) => `${i ? "L" : "M"}${x(p.t).toFixed(1)},${y(p.v).toFixed(1)}`).join("");
  return { solid: d(solid), prov: prov.length > 1 ? d(prov) : "" };
}

function Study({
  n,
  title,
  note,
  use,
  controls,
  source,
  children,
}: {
  n: string;
  title: string;
  note: string;
  use: string;
  controls?: ReactNode;
  source: string;
  children: ReactNode;
}) {
  return (
    <section className={s.study} aria-labelledby={`study-${n}`}>
      <header className={s.studyHead}>
        <p className="bo-label">Study {n}</p>
        <h2 id={`study-${n}`} className="bo-d3">
          {title}
        </h2>
        <p className="bo-prose">{note}</p>
        <p className="bo-note">
          <span className="bo-label">Use </span>
          {use}
        </p>
      </header>
      <figure className={s.stage}>
        {controls && <div className={s.controls}>{controls}</div>}
        {children}
        <figcaption className={s.source}>
          <span className="bo-label">Source</span> {source}
        </figcaption>
      </figure>
    </section>
  );
}

function Tabs<T extends string>({ value, options, onChange, label }: { value: T; options: { id: T; label: string }[]; onChange: (v: T) => void; label: string }) {
  return (
    <div className={s.tabs} role="group" aria-label={label}>
      {options.map((o) => (
        <button key={o.id} type="button" aria-pressed={value === o.id} onClick={() => onChange(o.id)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

function Replay({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" className={s.replay} onClick={onClick}>
      Replay
    </button>
  );
}

/* ——— 01 · Drawn by the carriage ——— */

function DrawOn({ line }: { line: LabData["line"] }) {
  const reduced = useReduced();
  const [wrap, width] = useWidth<HTMLDivElement>(900);
  const [seenRef, seen] = useSeen<HTMLDivElement>();
  const [k, setK] = useState(0);
  const [run, setRun] = useState(0);
  const H = 300;
  const pts = line.points;
  const t0 = pts[0]!.t;
  const t1 = pts[pts.length - 1]!.t;
  const vmax = Math.max(...pts.map((p) => p.v));
  const ticks = cover(0, vmax, 4);
  const top = ticks[ticks.length - 1]!;
  const x = (t: number) => M.left + ((t - t0) / (t1 - t0)) * (width - M.left - M.right);
  const y = (v: number) => M.top + (1 - v / top) * (H - M.top - M.bottom);
  const { solid, prov } = paths(pts, x, y);

  useEffect(() => {
    if (!seen) return;
    if (reduced) return setK(1);
    setK(0);
    return tween(2200, easeInOut, setK);
  }, [seen, run, reduced]);

  const edge = M.left + k * (width - M.left - M.right);
  const tAt = t0 + k * (t1 - t0);
  const last = pts[pts.length - 1]!;
  const done = k >= 1;

  return (
    <Study
      n="01"
      title="Drawn by the carriage"
      note="The line is printed left to right by a hairline carriage that reads out the period it is passing. The latest ring and its figure arrive only when the carriage reaches them."
      use="First time a stage scrolls into view. Once per page view; never on control changes."
      controls={<Replay onClick={() => setRun((r) => r + 1)} />}
      source={line.source}
    >
      <div ref={seenRef}>
        <div ref={wrap} className={s.plotWrap}>
          <svg width={width} height={H} role="img" aria-label={`${line.label}, ${monthLabel(t0)} to ${monthLabel(t1)}`}>
            <defs>
              <clipPath id="draw-clip">
                <rect x={0} y={0} width={edge} height={H} />
              </clipPath>
            </defs>
            {ticks.map((v) => (
              <g key={v}>
                <line x1={M.left} x2={width - M.right} y1={y(v)} y2={y(v)} className={v === 0 ? s.axis : s.grid} />
                <text x={M.left - 8} y={y(v)} className={s.tickY}>
                  {fmt.gbpCompact(v)}
                </text>
              </g>
            ))}
            {yearTicks(t0, t1, 7).map((yr) => (
              <text key={yr} x={x(yr)} y={H - 8} className={s.tickX}>
                {yr}
              </text>
            ))}
            <g clipPath="url(#draw-clip)">
              <path d={solid} className={s.line} />
              {prov && <path d={prov} className={`${s.line} ${s.prov}`} />}
            </g>
            {!done && k > 0 && (
              <g className={s.carriage}>
                <line x1={edge} x2={edge} y1={M.top} y2={H - M.bottom} />
                <text x={edge + 6} y={M.top + 10}>
                  {monthLabel(tAt)}
                </text>
              </g>
            )}
            {done && <circle cx={x(last.t)} cy={y(last.v)} r={4.5} className={s.ring} />}
          </svg>
          {done && (
            <div className={s.latest} style={{ left: x(last.t) + 14, top: y(last.v) - 22 }}>
              <span className="bo-label">Latest · provisional</span>
              <span className={`bo-fig ${s.latestFig}`}>
                <FlickerFigure value={fmt.gbp(last.v)} replayKey={run} />
              </span>
              <span className={s.latestPeriod}>{monthLabel(last.t)}</span>
            </div>
          )}
        </div>
      </div>
    </Study>
  );
}

/* ——— 02 · Retime: the axes travel, the line stays the same line ——— */

const SPANS = [
  { id: "5", label: "5 years" },
  { id: "10", label: "10 years" },
  { id: "30", label: "30 years" },
  { id: "all", label: "All" },
] as const;
type SpanId = (typeof SPANS)[number]["id"];

function Retime({ line }: { line: LabData["line"] }) {
  const reduced = useReduced();
  const [wrap, width] = useWidth<HTMLDivElement>(900);
  const [span, setSpan] = useState<SpanId>("10");
  const pts = line.points;
  const tEnd = pts[pts.length - 1]!.t;
  const target = useCallback(
    (id: SpanId) => {
      const t0 = id === "all" ? pts[0]!.t : tEnd - Number(id);
      const inSpan = pts.filter((p) => p.t >= t0 - 1e-6);
      const lo = Math.min(...inSpan.map((p) => p.v));
      const hi = Math.max(...inSpan.map((p) => p.v));
      const pad = (hi - lo) * 0.08;
      return { t0, t1: tEnd, lo: id === "all" ? 0 : lo - pad, hi: hi + pad };
    },
    [pts, tEnd],
  );
  const [dom, setDom] = useState(() => target("10"));
  const domRef = useRef(dom);
  domRef.current = dom;

  useEffect(() => {
    const to = target(span);
    if (reduced) return setDom(to);
    const from = domRef.current;
    return tween(700, easeInOut, (k) =>
      setDom({
        t0: from.t0 + (to.t0 - from.t0) * k,
        t1: from.t1 + (to.t1 - from.t1) * k,
        lo: from.lo + (to.lo - from.lo) * k,
        hi: from.hi + (to.hi - from.hi) * k,
      }),
    );
  }, [span, target, reduced]);

  const H = 300;
  const x = (t: number) => M.left + ((t - dom.t0) / (dom.t1 - dom.t0)) * (width - M.left - M.right);
  const y = (v: number) => M.top + (1 - (v - dom.lo) / (dom.hi - dom.lo)) * (H - M.top - M.bottom);
  const visible = pts.filter((p) => p.t >= dom.t0 - 0.5);
  const { solid, prov } = paths(visible, x, y);
  const goal = target(span);
  const first = pts.find((p) => p.t >= goal.t0 - 1e-6)!;
  const last = pts[pts.length - 1]!;
  const change = (last.v / first.v - 1) * 100;

  return (
    <Study
      n="02"
      title="Retime"
      note="Changing the period never redraws the chart. The axes travel to the new span and the same line stretches with them, so the reader can follow where they were. The change figure re-ticks to its new value."
      use="Period, place and measure controls in every Explorer stage (cohesion: same form, new frame)."
      controls={<Tabs label="Period" value={span} options={[...SPANS]} onChange={setSpan} />}
      source={line.source}
    >
      <div className={s.readout}>
        <span className="bo-label">Change over the period</span>
        <span className={`bo-fig ${s.readoutFig}`}>
          <FlickerFigure value={fmt.pctSigned(change)} />
        </span>
        <span className={s.latestPeriod}>
          {monthLabel(first.t)} – {monthLabel(last.t)}
        </span>
      </div>
      <div ref={wrap} className={s.plotWrap}>
        <svg width={width} height={H} role="img" aria-label={`${line.label}, ${monthLabel(goal.t0)} to ${monthLabel(goal.t1)}`}>
          <defs>
            <clipPath id="retime-clip">
              <rect x={M.left} y={0} width={width - M.left - M.right} height={H} />
            </clipPath>
          </defs>
          {niceTicks(dom.lo, dom.hi, 4)
            .filter((v) => v >= dom.lo && v <= dom.hi)
            .map((v) => (
              <g key={v}>
                <line x1={M.left} x2={width - M.right} y1={y(v)} y2={y(v)} className={s.grid} />
                <text x={M.left - 8} y={y(v)} className={s.tickY}>
                  {fmt.gbpCompact(v)}
                </text>
              </g>
            ))}
          {yearTicks(dom.t0, dom.t1, 7).map((yr) => (
            <text key={yr} x={x(yr)} y={H - 8} className={s.tickX}>
              {yr}
            </text>
          ))}
          <line x1={M.left} x2={width - M.right} y1={H - M.bottom} y2={H - M.bottom} className={s.axis} />
          <g clipPath="url(#retime-clip)">
            <path d={solid} className={s.line} />
            {prov && <path d={prov} className={`${s.line} ${s.prov}`} />}
          </g>
          <circle cx={x(last.t)} cy={y(last.v)} r={4.5} className={s.ring} />
        </svg>
      </div>
    </Study>
  );
}

/* ——— 03 · Inspect: the guide is a carriage too ——— */

function Inspect({ line }: { line: LabData["line"] }) {
  const reduced = useReduced();
  const [wrap, width] = useWidth<HTMLDivElement>(900);
  const pts = useMemo(() => line.points.slice(-120), [line.points]);
  const H = 280;
  const t0 = pts[0]!.t;
  const t1 = pts[pts.length - 1]!.t;
  const lo = Math.min(...pts.map((p) => p.v));
  const hi = Math.max(...pts.map((p) => p.v));
  const ticks = cover(lo, hi, 4);
  const yLo = ticks[0]!;
  const yHi = ticks[ticks.length - 1]!;
  const x = (t: number) => M.left + ((t - t0) / (t1 - t0)) * (width - M.left - M.right);
  const y = (v: number) => M.top + (1 - (v - yLo) / (yHi - yLo)) * (H - M.top - M.bottom);
  const { solid, prov } = paths(pts, x, y);

  const [i, setI] = useState(pts.length - 1);
  const [gx, setGx] = useState(() => x(pts[pts.length - 1]!.t));
  const gxRef = useRef(gx);
  gxRef.current = gx;
  const p = pts[i]!;
  useEffect(() => {
    const to = x(p.t);
    if (reduced) return setGx(to);
    const from = gxRef.current;
    return tween(220, easeOut, (k) => setGx(from + (to - from) * k));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i, width, reduced]);

  const pick = (clientX: number, el: Element) => {
    const r = el.getBoundingClientRect();
    const t = t0 + ((clientX - r.left - M.left) / (width - M.left - M.right)) * (t1 - t0);
    let best = 0;
    for (let j = 1; j < pts.length; j++) if (Math.abs(pts[j]!.t - t) < Math.abs(pts[best]!.t - t)) best = j;
    setI(best);
  };
  const onKey = (e: KeyboardEvent) => {
    if (e.key === "ArrowLeft") setI((v) => Math.max(0, v - 1));
    else if (e.key === "ArrowRight") setI((v) => Math.min(pts.length - 1, v + 1));
    else if (e.key === "Home") setI(0);
    else if (e.key === "End") setI(pts.length - 1);
    else return;
    e.preventDefault();
  };

  return (
    <Study
      n="03"
      title="Inspect"
      note="The period guide does not jump: it travels to the nearest observation like the ink carriage. The readout changes at once, so the number never lags the guide. Arrow keys step one period; the guide moves the same way."
      use="Pointer, touch and keyboard inspection on every time chart."
      source={line.source}
    >
      <div className={s.readout} aria-live="polite">
        <span className="bo-label">{p.p ? "Provisional" : "Observed"}</span>
        {/* The value lands at once: a ticking readout lags the guide and confuses inspection. */}
        <span className={`bo-fig ${s.readoutFig}`}>{fmt.gbp(p.v)}</span>
        <span className={s.latestPeriod}>{monthLabel(p.t)}</span>
      </div>
      <div ref={wrap} className={s.plotWrap}>
        <svg
          width={width}
          height={H}
          tabIndex={0}
          className={s.inspectable}
          role="img"
          aria-label={`${line.label}. Use the arrow keys to step through periods.`}
          onPointerMove={(e) => pick(e.clientX, e.currentTarget)}
          onPointerDown={(e) => pick(e.clientX, e.currentTarget)}
          onKeyDown={onKey}
        >
          {ticks.map((v) => (
            <g key={v}>
              <line x1={M.left} x2={width - M.right} y1={y(v)} y2={y(v)} className={s.grid} />
              <text x={M.left - 8} y={y(v)} className={s.tickY}>
                {fmt.gbpCompact(v)}
              </text>
            </g>
          ))}
          {yearTicks(t0, t1, 8).map((yr) => (
            <text key={yr} x={x(yr)} y={H - 8} className={s.tickX}>
              {yr}
            </text>
          ))}
          <line x1={M.left} x2={width - M.right} y1={H - M.bottom} y2={H - M.bottom} className={s.axis} />
          <path d={solid} className={s.line} />
          {prov && <path d={prov} className={`${s.line} ${s.prov}`} />}
          <line x1={gx} x2={gx} y1={M.top} y2={H - M.bottom} className={s.guide} />
          <circle cx={gx} cy={y(p.v)} r={4.5} className={s.ring} />
        </svg>
      </div>
    </Study>
  );
}

/* ——— 04 · Columns set like type ——— */

function Columns({ columns }: { columns: LabData["columns"] }) {
  const reduced = useReduced();
  const [wrap, width] = useWidth<HTMLDivElement>(900);
  const [seenRef, seen] = useSeen<HTMLDivElement>();
  const [run, setRun] = useState(0);
  const [k, setK] = useState(0);
  const pts = columns.points;
  const n = pts.length;
  const H = 280;
  const ticks = cover(0, Math.max(...pts.map((p) => p.v)), 4);
  const top = ticks[ticks.length - 1]!;
  const plotW = width - M.left - 24;
  const slot = plotW / n;
  const bw = Math.max(2, slot * 0.72);
  const y = (v: number) => M.top + (1 - v / top) * (H - M.top - M.bottom);
  const base = y(0);

  // One clock for the whole set: each column starts a little after its neighbour (a carriage pass).
  const stagger = 0.55; // share of the run spent staggering
  useEffect(() => {
    if (!seen) return;
    if (reduced) return setK(1);
    setK(0);
    return tween(1600, (x) => x, setK);
  }, [seen, run, reduced]);
  const hOf = (j: number) => {
    const start = (j / Math.max(1, n - 1)) * stagger;
    const local = Math.min(1, Math.max(0, (k - start) / (1 - stagger)));
    return easeOut(local);
  };

  return (
    <Study
      n="04"
      title="Columns set like type"
      note="Columns rise from the baseline one after another, left to right, as if a carriage were setting them. Each lands at its exact height; nothing overshoots."
      use="Column charts (completions, decisions, sales) on first view."
      controls={<Replay onClick={() => setRun((r) => r + 1)} />}
      source={columns.source}
    >
      <div ref={seenRef}>
        <div ref={wrap} className={s.plotWrap}>
          <svg width={width} height={H} role="img" aria-label={`Quarterly completions, ${quarterLabel(pts[0]!.t)} to ${quarterLabel(pts[n - 1]!.t)}`}>
            <defs>
              <pattern id="cols-hatch" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                <line x1="0" y1="0" x2="0" y2="5" className={s.hatchLine} />
              </pattern>
            </defs>
            {ticks.map((v) => (
              <g key={v}>
                <line x1={M.left} x2={width - 24} y1={y(v)} y2={y(v)} className={v === 0 ? s.axis : s.grid} />
                <text x={M.left - 8} y={y(v)} className={s.tickY}>
                  {fmt.countCompact(v)}
                </text>
              </g>
            ))}
            {pts.map((p, j) =>
              Math.floor(p.t + 1e-6) % 2 === 0 && Math.round((p.t % 1) * 4) === 0 ? (
                <text key={`l${p.t}`} x={M.left + j * slot + slot / 2} y={H - 8} className={s.tickX}>
                  {Math.floor(p.t + 1e-6)}
                </text>
              ) : null,
            )}
            {pts.map((p, j) => {
              const h = (base - y(p.v)) * hOf(j);
              return (
                <rect
                  key={p.t}
                  x={M.left + j * slot + (slot - bw) / 2}
                  y={base - h}
                  width={bw}
                  height={h}
                  className={p.p ? s.colProv : s.col}
                  fill={p.p ? "url(#cols-hatch)" : undefined}
                />
              );
            })}
          </svg>
        </div>
      </div>
    </Study>
  );
}

/* ——— 05 · Ranked bars re-sort ——— */

type RankMeasure = "price" | "change";

function Ranks({ ranks }: { ranks: LabData["ranks"] }) {
  const reduced = useReduced();
  const [wrap, width] = useWidth<HTMLDivElement>(900);
  const [measure, setMeasure] = useState<RankMeasure>("price");
  const rows = ranks.rows;
  const val = (r: Rank, m: RankMeasure) => (m === "price" ? r.price : r.change);
  const order = (m: RankMeasure) => [...rows].sort((a, b) => val(b, m) - val(a, m)).map((r) => r.id);
  const scaleOf = (m: RankMeasure) => {
    const vs = rows.map((r) => val(r, m));
    return { lo: Math.min(0, ...vs), hi: Math.max(0, ...vs) };
  };

  // Animated state: each row's rank position and value, plus the scale.
  type Frame = { pos: Record<string, number>; v: Record<string, number>; lo: number; hi: number };
  const frameOf = (m: RankMeasure): Frame => {
    const o = order(m);
    return {
      pos: Object.fromEntries(o.map((id, i) => [id, i])),
      v: Object.fromEntries(rows.map((r) => [r.id, val(r, m)])),
      ...scaleOf(m),
    };
  };
  const [f, setF] = useState<Frame>(() => frameOf("price"));
  const fRef = useRef(f);
  fRef.current = f;
  useEffect(() => {
    const to = frameOf(measure);
    if (reduced) return setF(to);
    const from = fRef.current;
    const mix = (a: number, b: number, k: number) => a + (b - a) * k;
    return tween(800, easeInOut, (k) =>
      setF({
        pos: Object.fromEntries(rows.map((r) => [r.id, mix(from.pos[r.id]!, to.pos[r.id]!, k)])),
        v: Object.fromEntries(rows.map((r) => [r.id, mix(from.v[r.id]!, to.v[r.id]!, k)])),
        lo: mix(from.lo, to.lo, k),
        hi: mix(from.hi, to.hi, k),
      }),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [measure, reduced]);

  const ROW = 26;
  const labelW = 190;
  const valueW = 90;
  const H = rows.length * ROW + 8;
  const x0 = labelW;
  const x1 = width - valueW;
  const x = (v: number) => x0 + ((v - f.lo) / (f.hi - f.lo || 1)) * (x1 - x0);
  const zero = x(0);
  const format = (v: number) => (measure === "price" ? fmt.gbp(v) : fmt.pctSigned(v));
  const period = rows[0] ? monthLabel(Number(rows[0].period.slice(0, 4)) + (Number(rows[0].period.slice(5, 7)) - 1) / 12) : "";

  return (
    <Study
      n="05"
      title="Ranked bars re-sort"
      note="Switching measure keeps every place on screen: rows slide to their new rank while the bars stretch to their new length, and each value scrambles to its new figure. The reader can watch a place climb or fall."
      use="RankBars and ChangeRows when the measure or period changes."
      controls={
        <Tabs
          label="Measure"
          value={measure}
          options={[
            { id: "price", label: "Average price" },
            { id: "change", label: "Annual change" },
          ]}
          onChange={setMeasure}
        />
      }
      source={`${ranks.source} · ${period}`}
    >
      <div ref={wrap} className={s.plotWrap}>
        <svg width={width} height={H} role="img" aria-label={`Places ranked by ${measure === "price" ? "average price" : "annual change"}, ${period}`}>
          <line x1={zero} x2={zero} y1={0} y2={H} className={s.axis} />
          {rows.map((r) => {
            const yy = 4 + f.pos[r.id]! * ROW;
            const v = f.v[r.id]!;
            const a = Math.min(zero, x(v));
            return (
              <g key={r.id} transform={`translate(0 ${yy.toFixed(1)})`}>
                <text x={labelW - 12} y={ROW / 2} className={s.rankLabel}>
                  {r.label}
                </text>
                <rect x={a} y={5} width={Math.abs(x(v) - zero)} height={ROW - 10} className={s.bar} />
              </g>
            );
          })}
        </svg>
        <ol className={s.rankValues} style={{ left: width - valueW + 10 }} aria-hidden="true">
          {rows.map((r) => (
            <li key={r.id} style={{ top: 4 + f.pos[r.id]! * ROW }}>
              <DualScramble text={format(val(r, measure))} trigger="manual" play={measure} duration={0.6} />
            </li>
          ))}
        </ol>
      </div>
    </Study>
  );
}

/* ——— page ——— */

export function ChartMotionLab({ data }: { data: LabData | null }) {
  return (
    <div className={s.page}>
      <header className={`bo-wrap ${s.head}`}>
        <p className="bo-label">Design lab · charts</p>
        <h1 className="bo-d2">Charts that move like instruments.</h1>
        <p className="bo-prose">
          Five studies for motion in the brand charts, on real Exchange series. Motion moves the marks only: lines are printed, axes travel,
          guides glide, columns are set, ranks re-sort. Nothing fades and no texture enters a plot. With reduced motion every study shows its
          final state.
        </p>
      </header>
      <main className={`bo-wrap ${s.main}`}>
        {!data ? (
          <p className="bo-prose">The data service did not answer, so the studies have nothing to draw. Start the API and reload.</p>
        ) : (
          <>
            <DrawOn line={data.line} />
            <Retime line={data.line} />
            <Inspect line={data.line} />
            <Columns columns={data.columns} />
            <Ranks ranks={data.ranks} />
          </>
        )}
      </main>
    </div>
  );
}
