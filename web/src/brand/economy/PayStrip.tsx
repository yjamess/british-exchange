"use client";

/**
 * Wages 02 — Lost and gained purchasing power.
 *
 * Two engraved rules. The first is pounds a week: pointers mark real weekly pay at the two
 * chosen dates and a dimension line measures the difference. The second is time: it runs from
 * the month a previous high was set to the month it was regained (or to the end of the window
 * if it has not been), with the lowest month marked, so the length of the spell is read off
 * the rule like any other measurement.
 *
 * One ink. Every pointer sits on a published monthly value or a calendar-year average of them.
 */

import { useId, useMemo } from "react";
import { fmtT } from "../data";
import { useWidth } from "../useWidth";
import s from "./payStrip.module.css";
import { fmtGbpWeek, fmtMonths, fmtPct1, type RecoverySpell } from "./wages-model";

type Props = {
  fromLabel: string;
  fromValue: number;
  toLabel: string;
  toValue: number;
  /** Whole-series bounds so the pounds rule is the same for every selection. */
  seriesMin: number;
  seriesMax: number;
  spell: RecoverySpell | null;
  /** Window end, for a spell that has not been regained. */
  windowEndT: number;
  label: string;
};

const H_POUNDS = 112;
const H_TIME = 112;
const H_TIME_NARROW = 128;
const PAD = { left: 24, right: 24 };

function niceStep(span: number, target: number): number {
  const raw = span / target;
  const pow = Math.pow(10, Math.floor(Math.log10(raw)));
  for (const m of [1, 2, 5, 10]) if (m * pow >= raw) return m * pow;
  return 10 * pow;
}

export function PayStrip({
  fromLabel,
  fromValue,
  toLabel,
  toValue,
  seriesMin,
  seriesMax,
  spell,
  windowEndT,
  label,
}: Props) {
  const uid = useId().replace(/:/g, "");
  const [wrapRef, width] = useWidth<HTMLDivElement>(900);
  const plotW = Math.max(200, width - PAD.left - PAD.right);

  /* ——— Pounds rule: whole-series range, rounded out to the tick step ——— */
  const pounds = useMemo(() => {
    const step = niceStep(Math.max(1, seriesMax - seriesMin), width < 560 ? 5 : 10);
    const lo = Math.floor(seriesMin / step) * step;
    const hi = Math.ceil(seriesMax / step) * step;
    const ticks: number[] = [];
    for (let v = lo; v <= hi + 1e-9; v += step) ticks.push(v);
    return { lo, hi, step, ticks };
  }, [seriesMin, seriesMax, width]);
  const xp = (v: number) => PAD.left + ((v - pounds.lo) / (pounds.hi - pounds.lo)) * plotW;
  const diff = toValue - fromValue;
  const diffPct = fromValue !== 0 ? (toValue / fromValue - 1) * 100 : 0;
  const yearly = diff * 52;

  /* ——— Time rule: from the high to regaining it ——— */
  const time = useMemo(() => {
    if (!spell) return null;
    const t0 = spell.peakT;
    const t1 = spell.regainedT ?? windowEndT;
    const years = Math.max(0.5, t1 - t0);
    const step = years > 12 ? 2 : years > 4 ? 1 : 0.5;
    const ticks: number[] = [];
    for (let v = Math.ceil(t0 / step) * step; v <= t1 + 1e-9; v += step) ticks.push(v);
    return { t0, t1, ticks, step };
  }, [spell, windowEndT]);
  const xt = (t: number) => (time ? PAD.left + ((t - time.t0) / (time.t1 - time.t0)) * plotW : 0);

  const aria = `${label}. Real weekly pay ${fmtGbpWeek(fromValue)} in ${fromLabel} and ${fmtGbpWeek(toValue)} in ${toLabel}, a difference of ${fmtGbpWeek(Math.abs(diff))} a week.${
    spell
      ? ` Longest spell below a previous high: ${fmtMonths(spell.months)} from ${fmtT(spell.peakT)}${
          spell.regainedT != null ? `, regained ${fmtT(spell.regainedT)}` : ", not yet regained"
        }.`
      : ""
  }`;

  const diffY = 34;
  const ruleY = 70;
  const ruleYT = width < 560 ? 86 : 70;
  const fromX = xp(fromValue);
  const toX = xp(toValue);
  const leftX = Math.min(fromX, toX);
  const rightX = Math.max(fromX, toX);
  const ruleL = PAD.left;
  const ruleR = PAD.left + plotW;
  // Labels sit on the rule ends when the plot is narrow or the two pointers are close.
  const tight = width < 560 || rightX - leftX < 170;
  const fromAtLeft = fromX <= toX;

  return (
    <div ref={wrapRef} className={s.root} role="group" aria-label={aria}>
      <div className={s.strip}>
        <div className={s.stripHead}>
          <span className={`bo-label ${s.stripTitle}`}>Real weekly pay · 2015 prices</span>
          <span className={s.stripFig}>
            {diff >= 0 ? "+" : "−"}
            {fmtGbpWeek(Math.abs(diff))} a week
            <small>
              {fmtPct1(diffPct)} · about {yearly >= 0 ? "+" : "−"}£{Math.abs(Math.round(yearly / 10) * 10).toLocaleString("en-GB")} a year
            </small>
          </span>
        </div>
        <svg className={s.svg} viewBox={`0 0 ${width} ${H_POUNDS}`} width={width} height={H_POUNDS} aria-hidden="true">
          <defs>
            <marker id={`${uid}-arrow`} viewBox="0 0 8 8" refX="4" refY="4" markerWidth="8" markerHeight="8" orient="auto-start-reverse">
              <path d="M0,1 L8,4 L0,7 Z" className={s.pointer} />
            </marker>
          </defs>
          {/* dimension line between the two pointers */}
          {rightX - leftX > 14 ? (
            <>
              <line x1={leftX} x2={leftX} y1={diffY} y2={ruleY - 6} className={s.dimDashed} />
              <line x1={rightX} x2={rightX} y1={diffY} y2={ruleY - 6} className={s.dimDashed} />
              <line
                x1={leftX}
                x2={rightX}
                y1={diffY}
                y2={diffY}
                className={s.dim}
                markerStart={`url(#${uid}-arrow)`}
                markerEnd={`url(#${uid}-arrow)`}
              />
              <text x={(leftX + rightX) / 2} y={diffY - 8} textAnchor="middle" className={s.labelFig}>
                {diff >= 0 ? "+" : "−"}
                {fmtGbpWeek(Math.abs(diff))}
              </text>
            </>
          ) : null}
          {/* the rule */}
          <line x1={PAD.left} x2={PAD.left + plotW} y1={ruleY} y2={ruleY} className={s.rule} />
          {pounds.ticks.map((v, i) => (
            <g key={v}>
              <line x1={xp(v)} x2={xp(v)} y1={ruleY} y2={ruleY + (i % 2 === 0 ? 10 : 6)} className={i % 2 === 0 ? s.tick : s.tickMinor} />
              {i % 2 === 0 ? (
                <text x={xp(v)} y={ruleY + 24} textAnchor="middle" className={s.tickText}>
                  £{v}
                </text>
              ) : null}
            </g>
          ))}
          {/* pointers: open ring = from, solid = to */}
          <circle cx={fromX} cy={ruleY} r={6} className={s.pointerOpen} />
          <circle cx={toX} cy={ruleY} r={6} className={s.pointer} />
          <text
            x={tight ? (fromAtLeft ? ruleL : ruleR) : fromX}
            y={ruleY + 40}
            textAnchor={fromAtLeft ? (tight ? "start" : "end") : tight ? "end" : "start"}
            className={s.label}
          >
            {fromLabel} {fmtGbpWeek(fromValue)}
          </text>
          <text
            x={tight ? (fromAtLeft ? ruleR : ruleL) : toX}
            y={ruleY + 40}
            textAnchor={fromAtLeft ? (tight ? "end" : "start") : tight ? "start" : "end"}
            className={s.label}
          >
            {toLabel} {fmtGbpWeek(toValue)}
          </text>
        </svg>
      </div>

      <div className={s.strip}>
        <div className={s.stripHead}>
          <span className={`bo-label ${s.stripTitle}`}>Longest spell below a previous high</span>
          {spell ? (
            <span className={s.stripFig}>
              {fmtMonths(spell.months)}
              <small>{spell.regainedT != null ? `high of ${fmtT(spell.peakT)} regained ${fmtT(spell.regainedT)}` : `below the high of ${fmtT(spell.peakT)} and not yet regained`}</small>
            </span>
          ) : (
            <span className={s.stripFig}>
              none<small>pay set a new high in every month of this interval</small>
            </span>
          )}
        </div>
        {spell && time ? (
          <svg
            className={s.svg}
            viewBox={`0 0 ${width} ${width < 560 ? H_TIME_NARROW : H_TIME}`}
            width={width}
            height={width < 560 ? H_TIME_NARROW : H_TIME}
            aria-hidden="true"
          >
            {/* the band of months below the high, drawn as a solid measured length */}
            <rect x={xt(time.t0)} y={ruleYT - 14} width={Math.max(0, xt(time.t1) - xt(time.t0))} height={6} className={s.band} />
            <line x1={PAD.left} x2={PAD.left + plotW} y1={ruleYT} y2={ruleYT} className={s.rule} />
            {time.ticks.map((t) => {
              const whole = Math.abs(t - Math.round(t)) < 1e-6;
              return (
                <g key={t}>
                  <line x1={xt(t)} x2={xt(t)} y1={ruleYT} y2={ruleYT + (whole ? 10 : 6)} className={whole ? s.tick : s.tickMinor} />
                  {whole ? (
                    <text x={xt(t)} y={ruleYT + 24} textAnchor="middle" className={s.tickText}>
                      {Math.round(t)}
                    </text>
                  ) : null}
                </g>
              );
            })}
            <circle cx={xt(time.t0)} cy={ruleYT} r={6} className={s.pointer} />
            <circle cx={xt(spell.troughT)} cy={ruleYT} r={5} className={s.pointerOpen} />
            {spell.regainedT != null ? <circle cx={xt(time.t1)} cy={ruleYT} r={6} className={s.pointer} /> : null}
            <text x={xt(time.t0)} y={ruleYT - 22} textAnchor="start" className={s.label}>
              High {fmtGbpWeek(spell.peakV)} · {fmtT(spell.peakT)}
            </text>
            <text
              x={Math.min(Math.max(xt(spell.troughT), ruleL + 70), ruleR - 70)}
              y={ruleYT + 40}
              textAnchor="middle"
              className={s.label}
            >
              Low {fmtGbpWeek(spell.troughV)} · {fmtT(spell.troughT)}
            </text>
            {spell.regainedT != null ? (
              <text x={xt(time.t1)} y={ruleYT - (width < 560 ? 40 : 22)} textAnchor="end" className={s.label}>
                Regained · {fmtT(spell.regainedT)}
              </text>
            ) : (
              <text x={xt(time.t1)} y={ruleYT - (width < 560 ? 40 : 22)} textAnchor="end" className={s.label}>
                Still below · {fmtT(windowEndT)}
              </text>
            )}
          </svg>
        ) : null}
      </div>
    </div>
  );
}
