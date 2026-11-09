"use client";

/**
 * Generation views — four alternatives to the stacked-area "all fuels" chart.
 * A: separate panels · B: share field (halftone) · C: decades · D: labelled lines.
 * One year control drives every study; moving the pointer over any plot scrubs it.
 */

import { useMemo, useState, type PointerEvent } from "react";
import Link from "next/link";
import type { LongFuelId, LongYear } from "@/brand/energy/long-run";
import s from "./views.module.css";

type Gid = "coal" | "oil" | "gas" | "nuclear" | "renewables" | "other";
const GROUPS: { id: Gid; label: string; color: string; on: string; ids: LongFuelId[] }[] = [
  { id: "coal", label: "Coal", color: "var(--bo-union)", on: "var(--bo-paper)", ids: ["coal"] },
  { id: "oil", label: "Oil", color: "var(--bo-chart-2)", on: "var(--bo-paper)", ids: ["oil"] },
  { id: "gas", label: "Gas", color: "var(--bo-mustard)", on: "var(--bo-union)", ids: ["gas"] },
  { id: "nuclear", label: "Nuclear", color: "var(--bo-electric)", on: "var(--bo-paper)", ids: ["nuclear"] },
  { id: "renewables", label: "Wind, solar & hydro", color: "var(--bo-chart-4)", on: "var(--bo-paper)", ids: ["renewables"] },
  { id: "other", label: "Other & storage", color: "var(--bo-chart-5)", on: "var(--bo-paper)", ids: ["other", "storage", "unallocated"] },
];

type Row = { year: number; total: number; v: Record<Gid, number>; pct: Record<Gid, number> };

const fmtT = (v: number) => (v >= 100 ? v.toFixed(0) : v >= 10 ? v.toFixed(1) : v.toFixed(1));
const fmtP = (v: number) => (v >= 10 ? v.toFixed(0) : v.toFixed(1)) + "%";

function useRows(mix: LongYear[]): Row[] {
  return useMemo(
    () =>
      mix.map((y) => {
        const v = Object.fromEntries(GROUPS.map((g) => [g.id, g.ids.reduce((a, id) => a + (y.v[id] ?? 0), 0)])) as Record<Gid, number>;
        const pct = Object.fromEntries(GROUPS.map((g) => [g.id, y.total ? (v[g.id] / y.total) * 100 : 0])) as Record<Gid, number>;
        return { year: y.year, total: y.total, v, pct };
      }),
    [mix],
  );
}

/** Pointer → year for an SVG whose viewBox width is `vbw` and whose time axis runs from x0 to x1. */
function scrubber(vbw: number, x0: number, x1: number, y0: number, y1: number, set: (y: number) => void) {
  return (e: PointerEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - r.left) / r.width) * vbw;
    const yr = Math.round(y0 + ((px - x0) / (x1 - x0)) * (y1 - y0));
    set(Math.min(y1, Math.max(y0, yr)));
  };
}

const ScreenDefs = () => (
  <defs>
    {GROUPS.map((g) => (
      <pattern key={g.id} id={`gv-dot-${g.id}`} width="4" height="4" patternUnits="userSpaceOnUse">
        <rect width="4" height="4" fill="var(--bo-paper)" />
        <circle cx="2" cy="2" r="1.1" fill={g.color} />
      </pattern>
    ))}
  </defs>
);

/* ——— A · Separate panels ——— */

function Panels({ rows, year, setYear }: { rows: Row[]; year: number; setYear: (y: number) => void }) {
  const y0 = rows[0]!.year;
  const y1 = rows.at(-1)!.year;
  const max = Math.ceil(Math.max(...rows.flatMap((r) => GROUPS.map((g) => r.v[g.id]))) / 50) * 50;
  const W = 300;
  const H = 150;
  const L = 30;
  const R = 292;
  const T = 10;
  const B = 124;
  const x = (yr: number) => L + ((yr - y0) / (y1 - y0)) * (R - L);
  const y = (v: number) => B - (v / max) * (B - T);
  const row = rows.find((r) => r.year === year)!;
  return (
    <div className={s.panels}>
      {GROUPS.map((g) => {
        const line = rows.map((r, i) => `${i ? "L" : "M"}${x(r.year).toFixed(1)},${y(r.v[g.id]).toFixed(1)}`).join("");
        const pk = rows.reduce((a, r) => (r.v[g.id] > a.v[g.id] ? r : a), rows[0]!);
        return (
          <figure key={g.id} className={s.panel}>
            <figcaption>
              <span className={s.panelName}>{g.label}</span>
              <span className={s.panelValue}>
                {fmtT(row.v[g.id])} <small>TWh · {fmtP(row.pct[g.id])}</small>
              </span>
            </figcaption>
            <svg viewBox={`0 0 ${W} ${H}`} className={s.svg} onPointerMove={scrubber(W, L, R, y0, y1, setYear)}>
              <ScreenDefs />
              {[0, max / 2, max].map((v) => (
                <g key={v}>
                  <line x1={L} x2={R} y1={y(v)} y2={y(v)} className={v ? s.grid : s.base} />
                  <text x={L - 5} y={y(v) + 3} textAnchor="end" className={s.tick}>
                    {v}
                  </text>
                </g>
              ))}
              {[1920, 1970, 2020].map((t) => (
                <text key={t} x={x(t)} y={H - 10} textAnchor="middle" className={s.tick}>
                  {t}
                </text>
              ))}
              <path d={`${line}L${x(y1)},${B}L${x(y0)},${B}Z`} fill={`url(#gv-dot-${g.id})`} />
              <path d={line} fill="none" stroke={g.color} strokeWidth="1.75" strokeLinejoin="round" />
              {pk.v[g.id] > max * 0.15 && (
                <text x={Math.min(x(pk.year), R - 50)} y={y(pk.v[g.id]) - 5} className={s.note} textAnchor="middle">
                  peak {pk.year}
                </text>
              )}
              <line x1={x(year)} x2={x(year)} y1={T} y2={B} className={s.guide} />
              <circle cx={x(year)} cy={y(row.v[g.id])} r="3.5" className={s.ring} stroke={g.color} />
            </svg>
          </figure>
        );
      })}
    </div>
  );
}

/* ——— B · Share field ——— */

function Field({ rows, year, setYear }: { rows: Row[]; year: number; setYear: (y: number) => void }) {
  const y0 = rows[0]!.year;
  const y1 = rows.at(-1)!.year;
  const W = 960;
  const L = 150;
  const R = 890;
  const cw = (R - L) / rows.length;
  const rh = 22;
  const top = 8;
  const fieldH = GROUPS.length * rh;
  const barH = 64;
  const H = top + fieldH + 18 + barH + 34;
  const maxT = Math.max(...rows.map((r) => r.total));
  const cx = (yr: number) => L + (yr - y0 + 0.5) * cw;
  // Full share fills the cell edge to edge, so a 100% run prints as a solid rule.
  const rMax = cw * 0.72;
  const row = rows.find((r) => r.year === year)!;
  const barBase = top + fieldH + 18 + barH;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className={s.svg} onPointerMove={scrubber(W, L + cw / 2, R - cw / 2, y0, y1, setYear)}>
      <rect x={cx(year) - cw / 2} y={0} width={cw} height={barBase} className={s.column} />
      {GROUPS.map((g, gi) => {
        const cy = top + gi * rh + rh / 2;
        return (
          <g key={g.id}>
            <text x={0} y={cy + 4} className={s.rowLabel}>
              {g.label}
            </text>
            {rows.map((r) => {
              const rad = Math.sqrt(r.pct[g.id] / 100) * rMax;
              return rad < 0.25 ? null : <circle key={r.year} cx={cx(r.year)} cy={cy} r={rad} fill={g.color} />;
            })}
            <text x={W} y={cy + 4} textAnchor="end" className={s.rowValue}>
              {fmtP(row.pct[g.id])}
            </text>
          </g>
        );
      })}
      <text x={0} y={barBase - barH / 2} className={s.rowLabel}>
        Total, TWh
      </text>
      {rows.map((r) => {
        const h = (r.total / maxT) * barH;
        return <rect key={r.year} x={cx(r.year) - cw * 0.32} y={barBase - h} width={cw * 0.64} height={h} className={r.year === year ? s.barOn : s.bar} />;
      })}
      <text x={W} y={barBase - barH / 2} textAnchor="end" className={s.rowValue}>
        {fmtT(row.total)}
      </text>
      <line x1={L} x2={R} y1={barBase} y2={barBase} className={s.base} />
      {rows
        .filter((r) => r.year % 10 === 0)
        .map((r) => (
          <text key={r.year} x={cx(r.year)} y={barBase + 18} textAnchor="middle" className={s.tick}>
            {r.year}
          </text>
        ))}
    </svg>
  );
}

/* ——— C · Decades ——— */

function Decades({ rows, year, setYear }: { rows: Row[]; year: number; setYear: (y: number) => void }) {
  const decades = useMemo(() => {
    const out: { d: number; avg: number; pct: Record<Gid, number> }[] = [];
    for (let d = Math.floor(rows[0]!.year / 10) * 10; d <= rows.at(-1)!.year; d += 10) {
      const rs = rows.filter((r) => r.year >= d && r.year < d + 10);
      const tot = rs.reduce((a, r) => a + r.total, 0);
      const pct = Object.fromEntries(GROUPS.map((g) => [g.id, (rs.reduce((a, r) => a + r.v[g.id], 0) / tot) * 100])) as Record<Gid, number>;
      out.push({ d, avg: tot / rs.length, pct });
    }
    return out;
  }, [rows]);
  const W = 960;
  const L = 70;
  const R = 860;
  const rh = 30;
  const gap = 8;
  const H = decades.length * (rh + gap) + 30;
  const on = Math.floor(year / 10) * 10;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className={s.svg}>
      {[0, 25, 50, 75, 100].map((p) => (
        <g key={p}>
          <line x1={L + (p / 100) * (R - L)} x2={L + (p / 100) * (R - L)} y1={0} y2={H - 22} className={s.grid} />
          <text x={L + (p / 100) * (R - L)} y={H - 6} textAnchor="middle" className={s.tick}>
            {p}%
          </text>
        </g>
      ))}
      {decades.map((dd, i) => {
        const yy = i * (rh + gap);
        let acc = 0;
        return (
          <g key={dd.d} className={s.decade} onPointerEnter={() => setYear(Math.min(rows.at(-1)!.year, dd.d + 5))}>
            <text x={0} y={yy + rh / 2 + 5} className={dd.d === on ? s.decadeOn : s.decadeLabel}>
              {dd.d}s
            </text>
            {GROUPS.map((g) => {
              const w = (dd.pct[g.id] / 100) * (R - L);
              const x0 = L + acc;
              acc += w;
              if (w <= 0) return null;
              return (
                <g key={g.id}>
                  <rect x={x0} y={yy} width={w} height={rh} fill={g.color} className={s.seg} />
                  {w > 34 && (
                    <text x={x0 + 6} y={yy + rh / 2 + 4} className={s.segLabel} style={{ fill: g.on }}>
                      {fmtP(dd.pct[g.id])}
                    </text>
                  )}
                </g>
              );
            })}
            {dd.d === on && <rect x={L - 3} y={yy - 3} width={R - L + 6} height={rh + 6} className={s.decadeFrame} />}
            <text x={W} y={yy + rh / 2 + 5} textAnchor="end" className={s.rowValue}>
              {fmtT(dd.avg)} TWh/yr
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/* ——— D · Labelled lines ——— */

function Lines({ rows, year, setYear }: { rows: Row[]; year: number; setYear: (y: number) => void }) {
  const y0 = rows[0]!.year;
  const y1 = rows.at(-1)!.year;
  const W = 960;
  const H = 440;
  const L = 48;
  const R = 790;
  const T = 16;
  const B = 400;
  const max = Math.ceil(Math.max(...rows.map((r) => r.total)) / 100) * 100;
  const x = (yr: number) => L + ((yr - y0) / (y1 - y0)) * (R - L);
  const y = (v: number) => B - (v / max) * (B - T);
  const path = (f: (r: Row) => number) => rows.map((r, i) => `${i ? "L" : "M"}${x(r.year).toFixed(1)},${y(f(r)).toFixed(1)}`).join("");
  const row = rows.find((r) => r.year === year)!;

  // The first year each fuel becomes the largest source (later swaps back and forth are not re-marked).
  const handovers = useMemo(() => {
    const lead = rows.map((r) => GROUPS.reduce((a, g) => (r.v[g.id] > r.v[a.id] ? g : a), GROUPS[0]!));
    const seen = new Set<Gid>([lead[0]!.id]);
    const out: { year: number; from: (typeof GROUPS)[number]; to: (typeof GROUPS)[number]; v: number }[] = [];
    for (let i = 1; i < rows.length; i++) {
      if (seen.has(lead[i]!.id)) continue;
      seen.add(lead[i]!.id);
      out.push({ year: rows[i]!.year, from: lead[i - 1]!, to: lead[i]!, v: rows[i]!.v[lead[i]!.id] });
    }
    return out;
  }, [rows]);

  // End labels, stacked so they never collide.
  const ends = GROUPS.map((g) => ({ g, v: rows.at(-1)!.v[g.id], ty: y(rows.at(-1)!.v[g.id]) })).sort((a, b) => a.ty - b.ty);
  ends.push({ g: { id: "total" } as never, v: rows.at(-1)!.total, ty: y(rows.at(-1)!.total) });
  ends.sort((a, b) => a.ty - b.ty);
  for (let i = 1; i < ends.length; i++) ends[i]!.ty = Math.max(ends[i]!.ty, ends[i - 1]!.ty + 15);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className={s.svg} onPointerMove={scrubber(W, L, R, y0, y1, setYear)}>
      {Array.from({ length: max / 100 + 1 }, (_, i) => i * 100).map((v) => (
        <g key={v}>
          <line x1={L} x2={R} y1={y(v)} y2={y(v)} className={v ? s.grid : s.base} />
          <text x={L - 8} y={y(v) + 4} textAnchor="end" className={s.tick}>
            {v}
          </text>
        </g>
      ))}
      <text x={L - 8} y={T - 4} textAnchor="end" className={s.tick}>
        TWh
      </text>
      {rows
        .filter((r) => r.year % 10 === 0)
        .map((r) => (
          <text key={r.year} x={x(r.year)} y={B + 22} textAnchor="middle" className={s.tick}>
            {r.year}
          </text>
        ))}
      <path d={path((r) => r.total)} className={s.total} />
      {GROUPS.map((g) => (
        <path key={g.id} d={path((r) => r.v[g.id])} fill="none" stroke={g.color} strokeWidth={g.id === "other" ? 1.5 : 2.25} strokeLinejoin="round" />
      ))}
      {handovers.map((h, i) => {
        // Labels sit in staggered rows under the axis top, leaders drop to the ring — never overprint.
        const ly = T + 40 + (i % 3) * 18;
        return (
          <g key={h.year}>
            <line x1={x(h.year)} x2={x(h.year)} y1={y(h.v) - 5} y2={ly + 3} className={s.leader} />
            <circle cx={x(h.year)} cy={y(h.v)} r="5" className={s.ring} stroke="var(--bo-ink)" />
            <text x={x(h.year)} y={ly} textAnchor="middle" className={s.note}>
              {h.to.label.split(",")[0]} passes {h.from.label.toLowerCase().split(",")[0]} · {h.year}
            </text>
          </g>
        );
      })}
      <line x1={x(year)} x2={x(year)} y1={T} y2={B} className={s.guide} />
      {GROUPS.map((g) => (
        <circle key={g.id} cx={x(year)} cy={y(row.v[g.id])} r="3" className={s.ring} stroke={g.color} />
      ))}
      {ends.map((e) => {
        const isTotal = (e.g.id as string) === "total";
        return (
          <g key={e.g.id}>
            <path d={`M${R + 4},${y(e.v)} L${R + 12},${e.ty} L${R + 16},${e.ty}`} fill="none" stroke={isTotal ? "var(--bo-ink)" : e.g.color} />
            <text x={R + 20} y={e.ty + 4} className={s.endLabel} style={{ fill: isTotal ? "var(--bo-ink)" : e.g.color }}>
              {isTotal ? "All generation" : e.g.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/* ——— Page ——— */

const STUDIES = [
  {
    key: "A",
    title: "Separate panels",
    lede: "One small chart per fuel on a shared TWh scale. Every rise and fall reads against a flat baseline, so oil’s 1970s bump and nuclear’s plateau are as legible as coal’s collapse.",
    good: "Most accurate for each fuel; no stacking distortion",
    cost: "Totals and shares need the readout",
    View: Panels,
  },
  {
    key: "B",
    title: "Share field",
    lede: "A halftone printed by the data: each dot’s area is that fuel’s share of the year. Total generation sits underneath as a bar strip. Shares and scale are kept apart, so neither distorts the other.",
    good: "Very on-brand; shows the shift at a glance",
    cost: "Exact values need the right-hand column",
    View: Field,
  },
  {
    key: "C",
    title: "Decades",
    lede: "Eleven bars, one per decade, each split by share of generation. It gives up the year-by-year wiggle for a table you can read in five seconds.",
    good: "Simplest; labels fit inside the bars",
    cost: "Hides single-year events (1984 miners’ strike)",
    View: Decades,
  },
  {
    key: "D",
    title: "Labelled lines",
    lede: "Each fuel as its own line on one TWh scale, with all generation dashed above. Rings mark the years the largest source changed hands.",
    good: "Crossovers are the story, and lines show them best",
    cost: "Small fuels crowd near zero",
    View: Lines,
  },
] as const;

export function GenerationViews({ mix }: { mix: LongYear[] }) {
  const rows = useRows(mix);
  const [year, setYear] = useState(rows.at(-1)?.year ?? 2025);
  if (!rows.length) return <main className={s.page}>No long-run data found in data/energy.</main>;
  const y0 = rows[0]!.year;
  const y1 = rows.at(-1)!.year;
  const row = rows.find((r) => r.year === year)!;
  return (
    <main className={s.page}>
      <nav>
        <Link href="/design-lab">Design lab</Link>
        <Link href="/energy?domain=generation">Live page →</Link>
      </nav>
      <header className={s.header}>
        <p className={s.eyebrow}>Design lab · Electricity generation</p>
        <h1>Four ways to draw a century of power</h1>
        <p>The same DESNZ series, 1920–{y1}, in four forms. Move across any chart to change the year; every study follows.</p>
      </header>

      <div className={s.controls}>
        <label className={s.slider}>
          <span>Year</span>
          <strong>{year}</strong>
          <input type="range" min={y0} max={y1} value={year} onChange={(e) => setYear(Number(e.target.value))} />
        </label>
        <ul className={s.key}>
          {GROUPS.map((g) => (
            <li key={g.id}>
              <span className={s.swatch} style={{ background: g.color }} />
              {g.label}
              <b>{fmtT(row.v[g.id])}</b>
            </li>
          ))}
          <li className={s.keyTotal}>
            All generation <b>{fmtT(row.total)} TWh</b>
          </li>
        </ul>
      </div>

      {STUDIES.map(({ key, title, lede, good, cost, View }) => (
        <section key={key} className={s.study}>
          <div className={s.caption}>
            <p className={s.eyebrow}>Study {key}</p>
            <h2>{title}</h2>
            <p>{lede}</p>
            <dl>
              <dt>Strength</dt>
              <dd>{good}</dd>
              <dt>Cost</dt>
              <dd>{cost}</dd>
            </dl>
          </div>
          <View rows={rows} year={year} setYear={setYear} />
        </section>
      ))}

      <p className={s.source}>
        Source: DESNZ, Electricity since 1920 (DUKES historical) · UK · calendar year · DESNZ estimates before 1996. “Other &amp; storage” combines
        other fuels, pumped storage and generation not allocated to a fuel.
      </p>
    </main>
  );
}
