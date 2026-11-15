"use client";

/**
 * Wages 03 — Britain's wage ladder.
 *
 * A vertical pay scale with one rung per percentile ONS publishes from ASHE Table 1. The
 * rungs are the published pounds; nothing between them is reconstructed. Their spacing is the
 * reading: rungs crowd at the bottom of the scale and spread out at the top. Each tenth of
 * jobs is named in the gap between decile rungs; the lowest and highest tenths run off the
 * ends of the ladder as dashed stiles, because ONS does not publish where they start or end.
 *
 * One ink. The median is the heavy rung with a paper tag. Hover or focus a rung for its
 * plain-words reading. Controls (coverage sheet) live in the explorer ControlRow.
 */

import { useId, useMemo, useRef, useState } from "react";
import { useWidth } from "../useWidth";
import { useDrawOn, useTweened } from "../instrument/motion";
import s from "./wageLadder.module.css";
import { fmtGbpWeek, type AsheLadderPoint } from "./wages-model";

type Props = {
  ranks: AsheLadderPoint[];
  /** Fixed £ top so sheets and editions compare on one scale. */
  axisMax: number;
  editionLabel: string;
  sheetLabel: string;
  label: string;
};

const PAD = { top: 36, bottom: 36 };
const PLOT_H = 520;
const LABEL_GAP = 18;

function ordinal(p: number): string {
  if (p === 50) return "Median";
  const v = p % 100;
  const sfx = v >= 11 && v <= 13 ? "th" : p % 10 === 1 ? "st" : p % 10 === 2 ? "nd" : p % 10 === 3 ? "rd" : "th";
  return `${p}${sfx}`;
}

function rungName(p: number): string {
  if (p === 50) return "Median";
  if (p === 25) return "Lower quartile";
  if (p === 75) return "Upper quartile";
  return `${ordinal(p)} percentile`;
}

function below(p: number): string {
  if (p === 50) return "half";
  if (p % 10 === 0) return `${p / 10} in 10`;
  return `${p} in 100`;
}

/** Push labels apart so none overlap, keeping their top-to-bottom order (ys ascending). */
function spread(ys: number[], gap: number, lo: number, hi: number): number[] {
  const out = ys.slice();
  if (!out.length) return out;
  out[0] = Math.max(out[0]!, lo);
  for (let i = 1; i < out.length; i++) out[i] = Math.max(out[i]!, out[i - 1]! + gap);
  if (out[out.length - 1]! > hi) {
    out[out.length - 1] = hi;
    for (let i = out.length - 2; i >= 0; i--) out[i] = Math.min(out[i]!, out[i + 1]! - gap);
  }
  return out;
}

export function WageLadder({ ranks, axisMax, editionLabel, sheetLabel, label }: Props) {
  const uid = useId().replace(/:/g, "");
  const [wrapRef, width] = useWidth<HTMLDivElement>(900);
  const svgRef = useRef<SVGSVGElement>(null);
  const [picked, setPicked] = useState<number | null>(null);
  const [hover, setHover] = useState<number | null>(null);

  const narrow = width < 560;
  const axisW = 44;
  const shareW = narrow ? 0 : 132;
  const ladderW = narrow ? 56 : 120;
  const ladderX = axisW + shareW;
  const labelX = ladderX + ladderW + 16;
  const H = PAD.top + PLOT_H + PAD.bottom;
  const y = (v: number) => PAD.top + PLOT_H - (Math.min(v, axisMax) / axisMax) * PLOT_H;

  const pts = useMemo(() => ranks.filter((r) => r.order <= 90).slice().sort((a, b) => b.order - a.order), [ranks]);
  const target = useMemo(() => Object.fromEntries(pts.map((r) => [`p${r.order}`, r.v])) as Record<string, number>, [pts]);
  const tw = useTweened(target) ?? target;
  const k = useDrawOn(svgRef, { replayKey: `${editionLabel}-${sheetLabel}` });

  const rungs = pts.map((r) => ({ ...r, yy: y(tw[`p${r.order}`] ?? r.v), v: tw[`p${r.order}`] ?? r.v }));
  const labelYs = spread(
    rungs.map((r) => r.yy),
    LABEL_GAP,
    PAD.top + 8,
    PAD.top + PLOT_H - 4,
  );

  const median = rungs.find((r) => r.order === 50) ?? null;
  const top = rungs[0] ?? null;
  const bottom = rungs[rungs.length - 1] ?? null;
  const active = hover ?? picked;
  const activeRung = rungs.find((r) => r.order === active) ?? null;

  const ticks = useMemo(() => {
    const step = axisMax > 2000 ? 500 : axisMax > 1000 ? 250 : 100;
    const out: number[] = [];
    for (let v = 0; v <= axisMax; v += step) out.push(v);
    return out;
  }, [axisMax]);

  // Decile gaps, each one tenth of jobs.
  const deciles = rungs.filter((r) => r.order % 10 === 0);
  const gaps: { y0: number; y1: number; text: string }[] = [];
  for (let i = 0; i + 1 < deciles.length; i++) {
    gaps.push({ y0: deciles[i]!.yy, y1: deciles[i + 1]!.yy, text: "1 in 10" });
  }

  if (!pts.length) return null;

  const summary = `${label}. ${editionLabel}, ${sheetLabel} employee jobs. ${
    median ? `Median ${fmtGbpWeek(median.v)} a week.` : ""
  } ${bottom ? `A tenth of jobs pay under ${fmtGbpWeek(bottom.v)}` : ""}${
    top ? `, a tenth pay over ${fmtGbpWeek(top.v)}.` : "."
  }`;

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
        {/* Pay axis */}
        <g aria-hidden="true">
          <line x1={axisW} x2={axisW} y1={PAD.top} y2={PAD.top + PLOT_H} className={s.axis} />
          {ticks.map((v) => (
            <g key={v}>
              <line x1={axisW - 5} x2={width} y1={y(v)} y2={y(v)} className={v === 0 ? s.axis : s.grid} />
              <text x={axisW - 9} y={y(v) + 3} textAnchor="end" className={s.tick}>
                £{v}
              </text>
            </g>
          ))}
          <text x={axisW - 9} y={PAD.top - 14} textAnchor="end" className={s.tick}>
            A WEEK
          </text>
        </g>

        {/* Tenths of jobs between decile rungs */}
        {!narrow ? (
          <g aria-hidden="true">
            {gaps.map((g, i) => {
              const mid = (g.y0 + g.y1) / 2;
              const tall = g.y1 - g.y0 >= 14;
              return (
                <g key={i}>
                  <line x1={ladderX - 28} x2={ladderX - 28} y1={g.y0 + 2} y2={g.y1 - 2} className={s.shareBar} />
                  {tall ? (
                    <text x={ladderX - 36} y={mid + 3} textAnchor="end" className={s.share}>
                      {g.text}
                    </text>
                  ) : null}
                </g>
              );
            })}
            {bottom ? (
              <text x={ladderX - 36} y={(bottom.yy + y(0)) / 2 - 3} textAnchor="end" className={s.share}>
                <tspan x={ladderX - 36}>1 in 10</tspan>
                <tspan x={ladderX - 36} dy="13">below</tspan>
              </text>
            ) : null}
            {top ? (
              <text x={ladderX - 36} y={Math.max(PAD.top + 10, (top.yy + PAD.top) / 2 - 3)} textAnchor="end" className={s.share}>
                <tspan x={ladderX - 36}>1 in 10</tspan>
                <tspan x={ladderX - 36} dy="13">above</tspan>
              </text>
            ) : null}
          </g>
        ) : null}

        {/* Stiles: solid between the lowest and highest published rungs, dashed into the tails */}
        {bottom && top ? (
          <g aria-hidden="true">
            <line x1={ladderX} x2={ladderX} y1={top.yy} y2={bottom.yy} className={s.stile} />
            <line x1={ladderX + ladderW} x2={ladderX + ladderW} y1={top.yy} y2={bottom.yy} className={s.stile} />
            <line x1={ladderX} x2={ladderX} y1={bottom.yy} y2={y(0)} className={s.stileOpen} />
            <line x1={ladderX + ladderW} x2={ladderX + ladderW} y1={bottom.yy} y2={y(0)} className={s.stileOpen} />
            <line x1={ladderX} x2={ladderX} y1={PAD.top} y2={top.yy} className={s.stileOpen} />
            <line x1={ladderX + ladderW} x2={ladderX + ladderW} y1={PAD.top} y2={top.yy} className={s.stileOpen} />
          </g>
        ) : null}

        {/* Rungs with leaders to their labels */}
        {rungs.map((r, i) => {
          const isMedian = r.order === 50;
          const minor = r.order === 25 || r.order === 75;
          const isOn = active === r.order;
          const ly = labelYs[i]!;
          const x0 = ladderX + (minor ? ladderW * 0.2 : 0);
          const x1 = ladderX + ladderW - (minor ? ladderW * 0.2 : 0);
          const drawn = (x1 - x0) * k;
          return (
            <g
              key={r.order}
              className={s.hit}
              role="button"
              tabIndex={0}
              aria-pressed={picked === r.order}
              aria-label={`${rungName(r.order)}: ${fmtGbpWeek(r.v)} a week. ${below(r.order)} of ${sheetLabel} employee jobs pay less.`}
              onMouseEnter={() => setHover(r.order)}
              onMouseLeave={() => setHover(null)}
              onFocus={() => setHover(r.order)}
              onBlur={() => setHover(null)}
              onClick={() => setPicked((cur) => (cur === r.order ? null : r.order))}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setPicked((cur) => (cur === r.order ? null : r.order));
                }
              }}
            >
              <rect x={ladderX - 4} y={Math.min(r.yy, ly) - 9} width={width - ladderX} height={Math.abs(r.yy - ly) + 18} />
              <line
                x1={ladderX + ladderW / 2 - drawn / 2}
                x2={ladderX + ladderW / 2 + drawn / 2}
                y1={r.yy}
                y2={r.yy}
                className={`${isMedian ? s.rungMedian : minor ? s.rungMinor : s.rung} ${isOn ? s.rungOn : ""}`}
              />
              {Math.abs(ly - r.yy) > 1 ? (
                <path d={`M${x1},${r.yy} L${labelX - 8},${ly}`} className={s.leader} />
              ) : null}
              <text x={labelX} y={ly + 4} className={`${s.name} ${isOn || isMedian ? s.nameOn : ""}`}>
                {narrow ? ordinal(r.order) : rungName(r.order)}
              </text>
              <text x={labelX + (narrow ? 64 : 150)} y={ly + 5} className={s.value}>
                {fmtGbpWeek(r.v)}
              </text>
            </g>
          );
        })}

        {median ? (
          <g aria-hidden="true">
            <rect x={narrow ? ladderX : ladderX + ladderW / 2 - 46} y={median.yy - 22} width={92} height={14} className={s.tagBox} />
            <text x={narrow ? ladderX + 46 : ladderX + ladderW / 2} y={median.yy - 12} textAnchor="middle" className={s.tagText}>
              Median {fmtGbpWeek(median.v)}
            </text>
          </g>
        ) : null}
        <title id={`${uid}-title`}>{summary}</title>
      </svg>

      <div className={s.readout} aria-live="polite">
        {activeRung ? (
          <>
            <span className={s.readoutFig}>{fmtGbpWeek(activeRung.v)}</span>
            <span className={s.readoutText}>
              <b>{rungName(activeRung.order)}</b> · {below(activeRung.order)} of {sheetLabel} employee jobs pay less than this a week,{" "}
              {activeRung.order === 50 ? "half" : activeRung.order % 10 === 0 ? `${(100 - activeRung.order) / 10} in 10` : `${100 - activeRung.order} in 100`} pay more · {editionLabel}
            </span>
          </>
        ) : (
          <>
            <span className={s.readoutFig}>{median ? fmtGbpWeek(median.v) : "—"}</span>
            <span className={s.readoutText}>
              <b>Median weekly pay</b> · half of {sheetLabel} employee jobs pay less, half more · {editionLabel}. Choose a rung to read it.
            </span>
          </>
        )}
      </div>
    </div>
  );
}
