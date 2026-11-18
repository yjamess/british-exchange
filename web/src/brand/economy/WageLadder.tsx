"use client";

/**
 * Wages 03 — Britain's wage ladder.
 *
 * A vertical pay scale with one rung per percentile ONS publishes from ASHE Table 1.
 * Spacing is measured in cash pounds: rungs crowd lower on the scale and spread at the top.
 * Only five rungs are named on screen (10th, lower quartile, median, upper quartile, 90th);
 * the rest are short marks — hover, focus or click opens a ReadoutCard. Dashed stiles run
 * into the unpublished tails below the 10th and above the 90th.
 *
 * One ink. Controls (coverage sheet) live in the explorer ControlRow.
 */

import { useId, useMemo, useRef, useState } from "react";
import { ReadoutCard } from "../instrument/ReadoutCard";
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
/** Always-on names; other published rungs stay as marks. */
const NAMED = new Set([10, 25, 50, 75, 90]);
const LABEL_GAP = 22;

function ordinal(p: number): string {
  if (p === 50) return "Median";
  const v = p % 100;
  const sfx =
    v >= 11 && v <= 13 ? "th" : p % 10 === 1 ? "st" : p % 10 === 2 ? "nd" : p % 10 === 3 ? "rd" : "th";
  return `${p}${sfx}`;
}

function rungName(p: number): string {
  if (p === 50) return "Median";
  if (p === 25) return "Lower quartile";
  if (p === 75) return "Upper quartile";
  return `${ordinal(p)} percentile`;
}

/** Plain share of jobs that pay less than this rung. */
function shareLess(p: number): string {
  if (p === 50) return "Half";
  if (p % 10 === 0) return `${p / 10} in 10`;
  return `${p} in 100`;
}

function shareMore(p: number): string {
  if (p === 50) return "Half";
  if (p % 10 === 0) return `${(100 - p) / 10} in 10`;
  return `${100 - p} in 100`;
}

/** Push named labels apart so none overlap, keeping top-to-bottom order (ys ascending). */
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
  const ladderW = narrow ? 56 : 100;
  const ladderX = axisW + (narrow ? 12 : 24);
  const labelX = ladderX + ladderW + 16;
  const H = PAD.top + PLOT_H + PAD.bottom;
  const y = (v: number) => PAD.top + PLOT_H - (Math.min(v, axisMax) / axisMax) * PLOT_H;

  const pts = useMemo(
    () => ranks.filter((r) => r.order <= 90).slice().sort((a, b) => b.order - a.order),
    [ranks],
  );
  const target = useMemo(
    () => Object.fromEntries(pts.map((r) => [`p${r.order}`, r.v])) as Record<string, number>,
    [pts],
  );
  const tw = useTweened(target) ?? target;
  const k = useDrawOn(svgRef, { replayKey: `${editionLabel}-${sheetLabel}` });

  const rungs = pts.map((r) => ({ ...r, yy: y(tw[`p${r.order}`] ?? r.v), v: tw[`p${r.order}`] ?? r.v }));
  /* Median uses the ink tag only — spread labels among the other named rungs. */
  const labelled = rungs.filter((r) => NAMED.has(r.order) && r.order !== 50);
  const labelYs = spread(
    labelled.map((r) => r.yy),
    LABEL_GAP,
    PAD.top + 8,
    PAD.top + PLOT_H - 4,
  );
  const namedLabelY = new Map(labelled.map((r, i) => [r.order, labelYs[i]!]));

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

  if (!pts.length) return null;

  const summary = `${label}. ${editionLabel}, ${sheetLabel} employee jobs. ${
    median ? `Median ${fmtGbpWeek(median.v)} a week.` : ""
  } ${bottom ? `A tenth of jobs pay under ${fmtGbpWeek(bottom.v)}` : ""}${
    top ? `, a tenth pay over ${fmtGbpWeek(top.v)}.` : "."
  }`;

  const readoutTop = activeRung
    ? Math.min(Math.max(activeRung.yy - 28, PAD.top), PAD.top + PLOT_H - 72)
    : PAD.top;
  const readoutLeft = Math.min(labelX + (narrow ? 72 : 168), Math.max(12, width - 220));

  return (
    <div ref={wrapRef} className={s.root}>
      <div className={s.plot}>
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

          {/* Stiles: solid between published ends, dashed into the tails */}
          {bottom && top ? (
            <g aria-hidden="true">
              <line x1={ladderX} x2={ladderX} y1={top.yy} y2={bottom.yy} className={s.stile} />
              <line x1={ladderX + ladderW} x2={ladderX + ladderW} y1={top.yy} y2={bottom.yy} className={s.stile} />
              <line x1={ladderX} x2={ladderX} y1={bottom.yy} y2={y(0)} className={s.stileOpen} />
              <line
                x1={ladderX + ladderW}
                x2={ladderX + ladderW}
                y1={bottom.yy}
                y2={y(0)}
                className={s.stileOpen}
              />
              <line x1={ladderX} x2={ladderX} y1={PAD.top} y2={top.yy} className={s.stileOpen} />
              <line
                x1={ladderX + ladderW}
                x2={ladderX + ladderW}
                y1={PAD.top}
                y2={top.yy}
                className={s.stileOpen}
              />
            </g>
          ) : null}

          {/* Rungs — named set gets short leaders + labels; others are marks only */}
          {rungs.map((r) => {
            const isMedian = r.order === 50;
            const minor = r.order === 25 || r.order === 75;
            const named = NAMED.has(r.order);
            const isOn = active === r.order;
            const ly = namedLabelY.get(r.order);
            const inset = named ? (minor ? ladderW * 0.15 : 0) : ladderW * 0.28;
            const x0 = ladderX + inset;
            const x1 = ladderX + ladderW - inset;
            const drawn = (x1 - x0) * k;
            return (
              <g
                key={r.order}
                className={s.hit}
                role="button"
                tabIndex={0}
                aria-pressed={picked === r.order}
                aria-label={`${rungName(r.order)}: ${fmtGbpWeek(r.v)} a week. ${shareLess(r.order)} of ${sheetLabel} employee jobs pay less.`}
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
                <rect x={ladderX - 6} y={r.yy - 10} width={ladderW + 12} height={20} />
                <line
                  x1={ladderX + ladderW / 2 - drawn / 2}
                  x2={ladderX + ladderW / 2 + drawn / 2}
                  y1={r.yy}
                  y2={r.yy}
                  className={`${isMedian ? s.rungMedian : minor ? s.rungMinor : s.rung} ${isOn ? s.rungOn : ""}`}
                />
                {/* Median name lives in the ink tag — no right-side duplicate */}
                {named && !isMedian && ly != null ? (
                  <>
                    {Math.abs(ly - r.yy) > 1 ? (
                      <path d={`M${x1},${r.yy} L${labelX - 8},${ly}`} className={s.leader} />
                    ) : (
                      <line x1={x1} x2={labelX - 8} y1={r.yy} y2={r.yy} className={s.leader} />
                    )}
                    <text x={labelX} y={ly + 4} className={`${s.name} ${isOn ? s.nameOn : ""}`}>
                      {narrow
                        ? r.order === 25
                          ? "LQ"
                          : r.order === 75
                            ? "UQ"
                            : ordinal(r.order)
                        : rungName(r.order)}
                    </text>
                    <text x={labelX + (narrow ? 40 : 130)} y={ly + 5} className={s.value}>
                      {fmtGbpWeek(r.v)}
                    </text>
                  </>
                ) : null}
              </g>
            );
          })}

          {median ? (
            <g aria-hidden="true" pointerEvents="none">
              <rect
                x={narrow ? ladderX : ladderX + ladderW / 2 - 46}
                y={median.yy - 22}
                width={92}
                height={14}
                className={s.tagBox}
              />
              <text
                x={narrow ? ladderX + 46 : ladderX + ladderW / 2}
                y={median.yy - 12}
                textAnchor="middle"
                className={s.tagText}
              >
                Median {fmtGbpWeek(median.v)}
              </text>
            </g>
          ) : null}
          <title id={`${uid}-title`}>{summary}</title>
        </svg>

        {activeRung ? (
          <ReadoutCard
            head={rungName(activeRung.order)}
            rows={[
              { label: "A week", value: fmtGbpWeek(activeRung.v) },
              {
                label: "Pay less",
                value: `${shareLess(activeRung.order)} of ${sheetLabel} jobs`,
              },
              {
                label: "Pay more",
                value: `${shareMore(activeRung.order)} of ${sheetLabel} jobs`,
              },
            ]}
            style={{ top: readoutTop, left: readoutLeft }}
          />
        ) : null}
      </div>

      {median && !activeRung ? (
        <ReadoutCard
          placement="inline"
          head={`Median weekly pay · ${editionLabel}`}
          rows={[
            { label: "A week", value: fmtGbpWeek(median.v) },
            {
              label: "Split",
              value: `Half of ${sheetLabel} jobs pay less, half more`,
            },
          ]}
        />
      ) : null}
    </div>
  );
}
