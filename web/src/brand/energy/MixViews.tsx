"use client";

/**
 * All-fuels view for the 1920–2025 generation mix: every fuel as its own line on one shared
 * scale (the peak of any single fuel — not the annual total, which would squash every series),
 * with the first year each fuel became the largest source marked.
 *
 * Draws only published annual observations, joined by straight segments. Moving the pointer
 * (or dragging on touch) over the chart sets the year; arrow keys work when focused.
 */

import { useMemo, type KeyboardEvent, type PointerEvent, type ReactNode } from "react";
import { useWidth } from "../useWidth";
import { LONG_FUELS, LONG_RUN_SOURCE, fmtPct, fmtTWh, value, type LongFuel, type LongFuelId, type LongYear, type Measure } from "./long-run";
import s from "./changing.module.css";

type Props = {
  mix: LongYear[];
  measure: Measure;
  year: number;
  onYear: (y: number) => void;
};

/** Line order: the century's story, oldest fuel first. */
const ORDER: LongFuelId[] = ["coal", "oil", "gas", "nuclear", "renewables", "other", "storage", "unallocated"];
const FUELS = ORDER.map((id) => LONG_FUELS.find((f) => f.id === id)!);

/** Line ink: the fuel's chart token; other fuels take plum so they never read as nuclear (electric). */
const stroke = (f: LongFuel) => (f.fill.kind === "solid" ? f.fill.color : f.id === "other" ? "var(--bo-chart-5)" : "var(--bo-ink)");
const dash = (f: LongFuel) => (f.fill.kind === "dots" ? "1 3" : f.fill.kind === "outline" ? "3 3" : undefined);
const fmtV = (m: Measure) => (m === "share" ? fmtPct : fmtTWh);

/** Nice top of the y-axis and grid step from a data peak (share always reads to 100%). */
function axisTop(peak: number, m: Measure): { max: number; unit: number } {
  if (m === "share") return { max: 100, unit: 25 };
  if (!(peak > 0)) return { max: 50, unit: 10 };
  const rough = peak * 1.06;
  const unit = rough > 200 ? 50 : rough > 100 ? 25 : rough > 40 ? 10 : 5;
  return { max: Math.ceil(rough / unit) * unit, unit };
}

/** Pointer scrub + arrow keys. */
function useScrub(mix: LongYear[], year: number, onYear: (y: number) => void) {
  const y0 = mix[0]!.year;
  const y1 = mix.at(-1)!.year;
  const clamp = (v: number) => Math.min(y1, Math.max(y0, v));
  const pointer = (left: number, right: number) => (e: PointerEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const px = e.clientX - r.left;
    const yr = clamp(Math.round(y0 + ((px - left) / (r.width - left - right)) * (y1 - y0)));
    if (yr !== year) onYear(yr);
  };
  const down = (e: PointerEvent<SVGSVGElement>) => {
    if (e.pointerType !== "mouse") e.currentTarget.setPointerCapture(e.pointerId);
  };
  const key = (e: KeyboardEvent<HTMLElement>) => {
    const n = e.shiftKey ? 10 : 1;
    const map: Record<string, number> = { ArrowLeft: year - n, ArrowRight: year + n, ArrowDown: year - n, ArrowUp: year + n, Home: y0, End: y1 };
    if (!(e.key in map)) return;
    e.preventDefault();
    onYear(clamp(map[e.key]!));
  };
  return { y0, y1, pointer, down, key };
}

function Instrument({ label, mix, year, scrub, children, className }: {
  label: string;
  mix: LongYear[];
  year: number;
  scrub: ReturnType<typeof useScrub>;
  children: ReactNode;
  className?: string;
}) {
  const row = mix.find((r) => r.year === year)!;
  return (
    <div
      className={className}
      role="slider"
      tabIndex={0}
      aria-label={`${label}. Arrow keys move one year, Shift with arrows ten years.`}
      aria-valuemin={scrub.y0}
      aria-valuemax={scrub.y1}
      aria-valuenow={year}
      aria-valuetext={`${year}: ${fmtTWh(row.total)} generated`}
      onKeyDown={scrub.key}
    >
      {children}
    </div>
  );
}

/* ——— Lines ——— */

export function MixLines({ mix, measure, year, onYear }: Props) {
  const [wrap, width] = useWidth<HTMLDivElement>(900);
  const scrub = useScrub(mix, year, onYear);
  const narrow = width < 560;
  const fuels = FUELS.filter((f) => mix.some((r) => r.v[f.id] > 0));
  const W = width;
  const H = Math.round(narrow ? Math.max(320, W * 0.9) : Math.min(560, Math.max(380, W * 0.5)));
  const m = { l: narrow ? 36 : 48, r: narrow ? 10 : 150, t: 24, b: 40 };
  const pw = W - m.l - m.r;
  const ph = H - m.t - m.b;
  // Scale to the tallest single fuel — including the annual total flattened every series into the lower half.
  const peakFuel = Math.max(0, ...mix.flatMap((r) => fuels.map((f) => value(r, f.id, measure))));
  const { max, unit } = axisTop(peakFuel, measure);
  const x = (yr: number) => m.l + ((yr - scrub.y0) / (scrub.y1 - scrub.y0)) * pw;
  const y = (v: number) => m.t + ph * (1 - v / max);
  const path = (f: (r: LongYear) => number) => mix.map((r, i) => `${i ? "L" : "M"}${x(r.year).toFixed(1)},${y(f(r)).toFixed(1)}`).join("");
  const row = mix.find((r) => r.year === year)!;
  const eraX = x(LONG_RUN_SOURCE.firstReported - 0.5);

  // First year each fuel becomes the largest source (back-and-forth swaps are not re-marked).
  const handovers = useMemo(() => {
    const lead = mix.map((r) => fuels.reduce((a, f) => (r.v[f.id] > r.v[a.id] ? f : a), fuels[0]!));
    const seen = new Set<LongFuelId>([lead[0]!.id]);
    const out: { year: number; from: LongFuel; to: LongFuel; row: LongYear }[] = [];
    for (let i = 1; i < mix.length; i++) {
      if (seen.has(lead[i]!.id)) continue;
      seen.add(lead[i]!.id);
      out.push({ year: mix[i]!.year, from: lead[i - 1]!, to: lead[i]!, row: mix[i]! });
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mix]);

  // End labels in the right gutter, stacked so they never collide. Narrow screens use the legend.
  const last = mix.at(-1)!;
  const ends = fuels
    .map((f) => ({ id: f.id as string, text: f.short, color: stroke(f), v: value(last, f.id, measure) }))
    .map((e) => ({ ...e, ty: y(e.v) }))
    .sort((a, b) => a.ty - b.ty);
  for (let i = 1; i < ends.length; i++) ends[i]!.ty = Math.max(ends[i]!.ty, ends[i - 1]!.ty + 14);
  const floor = m.t + ph + 4;
  if (ends.length && ends.at(-1)!.ty > floor) {
    ends.at(-1)!.ty = floor;
    for (let i = ends.length - 2; i >= 0; i--) ends[i]!.ty = Math.min(ends[i]!.ty, ends[i + 1]!.ty - 14);
  }

  const decades = mix.map((r) => r.year).filter((yr) => yr % (narrow ? 20 : 10) === 0);

  return (
    <div ref={wrap}>
      <ul className={s.legend} aria-label={`Generation by fuel, ${year}`}>
        {fuels.map((f) => (
          <li key={f.id}>
            <span className={s.lineSwatch} style={{ borderTopColor: stroke(f), borderTopStyle: f.fill.kind === "dots" ? "dotted" : f.fill.kind === "outline" ? "dashed" : "solid" }} />
            <span className={s.legendName}>{f.short}</span>
            <span className={s.legendValue}>{fmtV(measure)(value(row, f.id, measure))}</span>
          </li>
        ))}
        {measure === "absolute" && (
          <li>
            <span className={s.legendName}>All generation</span>
            <span className={s.legendValue}>{fmtTWh(row.total)}</span>
          </li>
        )}
      </ul>
      <Instrument label={`UK electricity generation by fuel, ${scrub.y0} to ${scrub.y1}, one line per fuel`} mix={mix} year={year} scrub={scrub} className={s.mixFocus}>
        <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className={s.linesPlot} onPointerMove={scrub.pointer(m.l, m.r)} onPointerDown={scrub.down} aria-hidden="true">
          {Array.from({ length: Math.round(max / unit) + 1 }, (_, i) => i * unit).map((v) => (
            <g key={v}>
              <line x1={m.l} x2={m.l + pw} y1={y(v)} y2={y(v)} className={v ? s.grid : s.zero} />
              <text x={m.l - 8} y={y(v)} textAnchor="end" dominantBaseline="middle" className={s.tick}>
                {measure === "share" ? `${v}%` : v}
              </text>
            </g>
          ))}
          <text x={4} y={m.t - 12} className={s.tick}>
            {measure === "share" ? "% of generation" : "TWh"}
          </text>
          {decades.map((yr) => (
            <text key={yr} x={x(yr)} y={m.t + ph + 30} textAnchor="middle" className={s.tick}>
              {yr}
            </text>
          ))}
          <line x1={eraX} x2={eraX} y1={m.t} y2={m.t + ph + 6} className={s.era} />
          <text x={eraX - 6} y={m.t + ph + 14} textAnchor="end" className={`${s.tick} ${s.halo}`}>
            ← Estimated
          </text>
          <text x={eraX + 6} y={m.t + ph + 14} textAnchor="start" className={`${s.tick} ${s.halo}`}>
            Reported →
          </text>

          {fuels.map((f) => (
            <path
              key={f.id}
              d={path((r) => value(r, f.id, measure))}
              fill="none"
              stroke={stroke(f)}
              strokeWidth={f.fill.kind === "solid" ? 2.25 : 1.5}
              strokeDasharray={dash(f)}
              strokeLinejoin="round"
            />
          ))}

          {handovers.map((h, i) => {
            const hy = y(value(h.row, h.to.id, measure));
            const ly = m.t + 12 + (i % 3) * 16;
            const hx = x(h.year);
            const anchor = hx > m.l + pw - 90 ? "end" : hx < m.l + 90 ? "start" : "middle";
            return (
              <g key={h.year}>
                <line x1={hx} x2={hx} y1={hy - 5} y2={ly + 4} className={s.leader} />
                <circle cx={hx} cy={hy} r={5} className={s.ring} stroke="var(--bo-ink)" />
                <text x={hx} y={ly} textAnchor={anchor} className={`${s.tick} ${s.halo}`}>
                  {h.to.short} passes {h.from.short.toLowerCase()} · {h.year}
                </text>
              </g>
            );
          })}

          <line x1={x(year)} x2={x(year)} y1={m.t - 6} y2={m.t + ph} className={s.carriage} />
          {fuels.map((f) => (
            <circle key={f.id} cx={x(year)} cy={y(value(row, f.id, measure))} r={3} className={s.ring} stroke={stroke(f)} />
          ))}
          <g transform={`translate(${Math.min(Math.max(x(year), m.l + 26), m.l + pw - 26)},${m.t - 12})`}>
            <rect x={-26} y={-14} width={52} height={20} className={s.carriageTag} />
            <text textAnchor="middle" y={1} className={s.carriageText}>
              {year}
            </text>
          </g>

          {!narrow &&
            ends.map((e) => (
              <g key={e.id} className={s.endLabel}>
                <polyline points={`${m.l + pw + 4},${y(e.v)} ${m.l + pw + 12},${e.ty} ${m.l + pw + 16},${e.ty}`} stroke={e.color} />
                <text x={m.l + pw + 20} y={e.ty} dominantBaseline="middle">
                  {e.text}
                </text>
              </g>
            ))}
        </svg>
      </Instrument>
    </div>
  );
}
