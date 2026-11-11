"use client";

/**
 * Wages 03 — Britain's wage ladder drawn as a spectrum.
 *
 * ASHE Table 1 publishes weekly gross pay at the 10th…90th percentiles and the median.
 * Between two neighbouring percentiles a known share of employee jobs sits in a known pay
 * range, so each block is measured: width = the published pay range, area = that share,
 * height = share per £100 of pay. The two tails are drawn dashed: a tenth of jobs sits
 * below the 10th percentile (bounded by £0) and a tenth above the 90th (unbounded).
 *
 * One ink. Blocks below the median are stippled, blocks above are hatched; the chosen block
 * is solid ink with paper type. A previous edition can be laid over as a dotted outline.
 * Controls (coverage sheet) live in the explorer ControlRow, not here.
 */

import { useId, useMemo, useRef, useState } from "react";
import { useWidth } from "../useWidth";
import { useDrawOn, useTweened } from "../instrument/motion";
import s from "./wageSpectrum.module.css";
import { fmtGbpWeek, type SpectrumBlock } from "./wages-model";

type Props = {
  blocks: SpectrumBlock[];
  median: number | null;
  /** Fixed £ axis top so sheets and editions compare on one scale. */
  axisMax: number;
  /** Fixed height scale (share per £100) so heights compare across sheets. */
  densityMax: number;
  /** Optional earlier edition drawn as an outline. */
  compare?: { label: string; blocks: SpectrumBlock[]; median: number | null } | null;
  editionLabel: string;
  sheetLabel: string;
  label: string;
};

const H = 300;
const PAD = { top: 28, right: 16, bottom: 36, left: 40 };

function pctLabel(b: SpectrumBlock): string {
  if (b.tail === "below") return `Lowest ${b.share.toFixed(0)}% of jobs`;
  if (b.tail === "above") return `Highest ${b.share.toFixed(0)}% of jobs`;
  return `${b.pLo}th to ${b.pHi}th percentile`;
}

function rangeLabel(b: SpectrumBlock): string {
  if (b.tail === "below") return `under ${fmtGbpWeek(b.hi ?? 0)} a week`;
  if (b.tail === "above") return `above ${fmtGbpWeek(b.lo)} a week`;
  return `${fmtGbpWeek(b.lo)} to ${fmtGbpWeek(b.hi ?? b.lo)} a week`;
}

export function WageSpectrum({
  blocks,
  median,
  axisMax,
  densityMax,
  compare,
  editionLabel,
  sheetLabel,
  label,
}: Props) {
  const uid = useId().replace(/:/g, "");
  const [wrapRef, width] = useWidth<HTMLDivElement>(900);
  const svgRef = useRef<SVGSVGElement>(null);
  const [picked, setPicked] = useState<string | null>(null);
  const [hover, setHover] = useState<string | null>(null);

  const plotW = Math.max(200, width - PAD.left - PAD.right);
  const plotH = H - PAD.top - PAD.bottom;
  const x = (v: number) => PAD.left + (Math.min(v, axisMax) / axisMax) * plotW;
  const y = (d: number) => PAD.top + plotH - (Math.min(d, densityMax) / densityMax) * plotH;

  // Retime: block edges travel when the sheet changes rather than jumping.
  const target = useMemo(() => {
    const o: Record<string, number> = {};
    blocks.forEach((b, i) => {
      o[`lo${i}`] = b.lo;
      o[`hi${i}`] = b.hi ?? axisMax;
      o[`d${i}`] = b.density ?? 0;
    });
    o.n = blocks.length;
    o.median = median ?? 0;
    return o;
  }, [blocks, median, axisMax]);
  const tw = useTweened(target) ?? target;
  const k = useDrawOn(svgRef, { replayKey: `${editionLabel}-${sheetLabel}` });

  const active = hover ?? picked;
  const activeBlock = blocks.find((b) => b.id === active) ?? null;

  const ticks = useMemo(() => {
    // Keep ticks at least ~64px apart so the pound labels never touch on narrow plots.
    const base = axisMax > 2000 ? 500 : axisMax > 1200 ? 250 : 200;
    let step = base;
    while ((step / axisMax) * plotW < 64) step += base;
    const out: number[] = [];
    for (let v = 0; v <= axisMax; v += step) out.push(v);
    return out;
  }, [axisMax, plotW]);
  const yTicks = useMemo(() => {
    const step = densityMax > 20 ? 10 : densityMax > 8 ? 5 : 2;
    const out: number[] = [];
    for (let v = 0; v <= densityMax; v += step) out.push(v);
    return out;
  }, [densityMax]);

  if (!blocks.length) return null;

  const summary = `${label}. ${editionLabel}, ${sheetLabel} employee jobs. Median ${
    median != null ? fmtGbpWeek(median) : "not published"
  } a week.`;

  return (
    <div ref={wrapRef} className={s.root}>
      <svg
        ref={svgRef}
        className={s.svg}
        viewBox={`0 0 ${width} ${H}`}
        width={width}
        height={H}
        role="img"
        aria-label={summary}
      >
        <defs>
          <pattern id={`${uid}-stipple`} width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <circle cx="2" cy="2" r="0.9" className={s.inkFill} />
          </pattern>
          <pattern id={`${uid}-hatch`} width="4.5" height="4.5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="4.5" className={s.penLine} />
          </pattern>
          <pattern id={`${uid}-sparse`} width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <circle cx="3.5" cy="3.5" r="0.9" className={s.inkFill} />
          </pattern>
        </defs>

        {/* Grid + axes */}
        <g aria-hidden="true">
          {yTicks.map((d) => (
            <g key={`y${d}`}>
              <line x1={PAD.left} x2={PAD.left + plotW} y1={y(d)} y2={y(d)} className={d === 0 ? s.axis : s.grid} />
              <text x={PAD.left - 6} y={y(d) + 3} textAnchor="end" className={s.tick}>
                {d}%
              </text>
            </g>
          ))}
          <text x={PAD.left} y={PAD.top - 12} className={s.tick}>
            SHARE OF JOBS PER £100 OF WEEKLY PAY
          </text>
          {ticks.map((v) => (
            <g key={`x${v}`}>
              <line x1={x(v)} x2={x(v)} y1={PAD.top + plotH} y2={PAD.top + plotH + 4} className={s.axis} />
              <text x={x(v)} y={PAD.top + plotH + 16} textAnchor="middle" className={s.tick}>
                £{v}
              </text>
            </g>
          ))}
          <text x={PAD.left + plotW} y={PAD.top + plotH + 30} textAnchor="end" className={s.tick}>
            WEEKLY GROSS PAY
          </text>
        </g>

        {/* Blocks */}
        {blocks.map((b, i) => {
          const lo = tw[`lo${i}`] ?? b.lo;
          const hi = tw[`hi${i}`] ?? b.hi ?? axisMax;
          const d = tw[`d${i}`] ?? b.density ?? 0;
          const x0 = x(lo);
          const x1 = x(hi);
          const full = Math.max(0, y(0) - y(d));
          const h = full * k;
          const isOn = active === b.id;
          const belowMedian = median != null && (b.hi ?? Infinity) <= median + 0.01;
          const fill = isOn
            ? undefined
            : b.tail === "above"
              ? undefined
              : belowMedian
                ? `url(#${uid}-stipple)`
                : `url(#${uid}-hatch)`;
          const tailH = b.tail === "above" ? Math.max(10, full || 14) : full;
          return (
            <g
              key={b.id}
              className={s.hit}
              role="button"
              tabIndex={0}
              aria-pressed={picked === b.id}
              aria-label={`${pctLabel(b)}: ${rangeLabel(b)}, ${b.share.toFixed(0)}% of employee jobs`}
              onMouseEnter={() => setHover(b.id)}
              onMouseLeave={() => setHover(null)}
              onFocus={() => setHover(b.id)}
              onBlur={() => setHover(null)}
              onClick={() => setPicked((cur) => (cur === b.id ? null : b.id))}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setPicked((cur) => (cur === b.id ? null : b.id));
                }
              }}
            >
              {b.tail === "above" ? (
                <rect
                  x={x0}
                  y={y(0) - tailH * k}
                  width={Math.max(0, x1 - x0)}
                  height={tailH * k}
                  className={`${s.tail} ${isOn ? s.blockOn : ""}`}
                />
              ) : (
                <rect
                  x={x0}
                  y={y(0) - h}
                  width={Math.max(0, x1 - x0)}
                  height={h}
                  className={`${s.block} ${b.tail === "below" ? s.tail : ""} ${isOn ? s.blockOn : ""}`}
                  fill={fill}
                />
              )}
            </g>
          );
        })}

        {/* Earlier edition as a dotted outline */}
        {compare?.blocks.length ? (
          <g aria-hidden="true">
            <path
              className={s.outline}
              d={compare.blocks
                .filter((b) => b.tail !== "above" && b.density != null)
                .map((b, i) => {
                  const x0 = x(b.lo);
                  const x1 = x(b.hi ?? axisMax);
                  const yy = y(b.density ?? 0);
                  return `${i === 0 ? `M${x0},${y(0)} ` : ""}L${x0},${yy} L${x1},${yy} L${x1},${y(0)}`;
                })
                .join(" ")}
            />
          </g>
        ) : null}

        {/* Median rule */}
        {median != null ? (
          <g aria-hidden="true">
            <line x1={x(tw.median ?? median)} x2={x(tw.median ?? median)} y1={PAD.top - 2} y2={y(0)} className={s.median} />
            <rect x={x(tw.median ?? median) + 4} y={PAD.top - 2} width={92} height={14} className={s.tagBox} />
            <text x={x(tw.median ?? median) + 8} y={PAD.top + 8} className={`${s.tagText} ${s.tagOn}`}>
              Median {fmtGbpWeek(median)}
            </text>
          </g>
        ) : null}
      </svg>

      <div className={s.readout} aria-live="polite">
        {activeBlock ? (
          <>
            <span className={s.readoutFig}>{activeBlock.share.toFixed(0)}% of jobs</span>
            <span className={s.readoutText}>
              <b>{pctLabel(activeBlock)}</b> · {rangeLabel(activeBlock)} · {editionLabel} · {sheetLabel} employee jobs
            </span>
          </>
        ) : (
          <>
            <span className={s.readoutFig}>{median != null ? fmtGbpWeek(median) : "—"}</span>
            <span className={s.readoutText}>
              <b>Median weekly pay</b> · half of {sheetLabel} employee jobs earn less, half more · {editionLabel}. Choose a block for its share.
            </span>
          </>
        )}
      </div>

      <div className={s.key} aria-hidden="true">
        <span className={s.keyItem}>
          <svg className={s.keySwatch} viewBox="0 0 20 12"><rect width="20" height="12" fill={`url(#${uid}-stipple)`} /></svg>
          Below the median
        </span>
        <span className={s.keyItem}>
          <svg className={s.keySwatch} viewBox="0 0 20 12"><rect width="20" height="12" fill={`url(#${uid}-hatch)`} /></svg>
          Above the median
        </span>
        <span className={s.keyItem}>
          <svg className={s.keySwatch} viewBox="0 0 20 12"><rect x="0.5" y="0.5" width="19" height="11" className={s.tail} /></svg>
          Tenth of jobs, range not published
        </span>
        {compare ? (
          <span className={s.keyItem}>
            <svg className={s.keySwatch} viewBox="0 0 20 12"><rect x="0.5" y="0.5" width="19" height="11" className={s.outline} /></svg>
            {compare.label}
          </span>
        ) : null}
      </div>
    </div>
  );
}
