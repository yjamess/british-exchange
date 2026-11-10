"use client";

/**
 * All-fuels view for the 1920–2025 generation mix: every fuel as its own line on one shared
 * scale (the peak of any single fuel — not the annual total, which would squash every series),
 * with the switch from DESNZ estimates to reported figures marked.
 *
 * Draws only published annual observations, joined by straight segments. Moving the pointer
 * (or dragging on touch) over the chart sets the year; arrow keys work when focused.
 */

import { type KeyboardEvent, type PointerEvent, type ReactNode } from "react";
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

/** Line ink: the fuel's chart token; other fuels take plum so they never read as nuclear (electric),
 *  storage takes green. Only "not allocated" is dashed slate: a reconciliation, not an observed fuel.
 *  (Dotted means provisional in the line language, so no fuel is dotted.) */
const stroke = (f: LongFuel) =>
  f.fill.kind === "solid" ? f.fill.color : f.id === "other" ? "var(--bo-chart-5)" : f.id === "storage" ? "var(--bo-green)" : "var(--bo-chart-reference)";
const dash = (f: LongFuel) => (f.fill.kind === "outline" ? "3 3" : undefined);
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
  // Hairline right edge — fuel names and year values live in the legend above, not a 150px gutter.
  const m = { l: narrow ? 36 : 48, r: narrow ? 10 : 16, t: 24, b: 40 };
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

  const decades = mix.map((r) => r.year).filter((yr) => yr % (narrow ? 20 : 10) === 0);

  return (
    <div ref={wrap}>
      <ul className={s.legend} aria-label={`Generation by fuel, ${year}`}>
        {fuels.map((f) => (
          <li key={f.id}>
            <span className={s.lineSwatch} style={{ borderTopColor: stroke(f), borderTopStyle: f.fill.kind === "outline" ? "dashed" : "solid" }} />
            <span className={s.legendName}>{f.short}</span>
            <span className={s.legendValue}>{fmtV(measure)(value(row, f.id, measure))}</span>
          </li>
        ))}
        {measure === "absolute" && (
          <li>
            <span aria-hidden="true" />
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
          <text x={eraX - 6} y={m.t + 10} textAnchor="end" className={s.tick}>
            Estimated
          </text>
          <text x={eraX + 6} y={m.t + 10} className={s.tick}>
            Reported
          </text>
          {fuels.map((f) => (
            <path
              key={f.id}
              d={path((r) => value(r, f.id, measure))}
              fill="none"
              stroke={stroke(f)}
              strokeWidth={f.fill.kind === "outline" ? 1.5 : 2.25}
              strokeDasharray={dash(f)}
              strokeLinejoin="round"
            />
          ))}

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

        </svg>
      </Instrument>
    </div>
  );
}
