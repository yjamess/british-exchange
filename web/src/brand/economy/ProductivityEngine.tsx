"use client";

import { useId } from "react";
import { useWidth } from "../useWidth";
import s from "./productivityEngine.module.css";
import { fmtPct1, type EngineReading } from "./growth-model";

type Props = {
  reading: EngineReading;
  fromLabel: string;
  toLabel: string;
  label: string;
};

/** "+3.9 points" — share of the output change, in plain words. */
export function fmtPoints(v: number): string {
  const n = Math.abs(v).toFixed(1);
  const sign = v > 0.05 ? "+" : v < -0.05 ? "−" : "";
  return `${sign}${n} point${n === "1.0" ? "" : "s"}`;
}

export function ProductivityEngine({ reading, fromLabel, toLabel, label }: Props) {
  const id = useId();
  const [wrapRef, width] = useWidth<HTMLDivElement>(900);
  const factors = [
    { name: "Hours worked", change: reading.hoursPct, points: reading.hoursContrib, pattern: "dots" },
    { name: "Output per hour", change: reading.perHourPct, points: reading.perHourContrib, pattern: "hatch" },
  ];

  // Stack contributions of the same sign. Opposing contributions extend either side of zero.
  const positive = Math.max(0, reading.hoursContrib) + Math.max(0, reading.perHourContrib);
  const negative = Math.min(0, reading.hoursContrib) + Math.min(0, reading.perHourContrib);
  const min = Math.min(-0.5, negative * 1.1);
  const max = Math.max(0.5, positive * 1.1);
  const x = (value: number) => 8 + ((value - min) / (max - min)) * (width - 16);
  const zero = x(0);
  const net = x(reading.outputPct);

  return (
    <div ref={wrapRef} className={s.root}>
      <div className={s.reading}>
        <div>
          <div className="bo-label">{fromLabel} to {toLabel} · {reading.quarters} quarters</div>
          <div className={s.output}>Output change</div>
        </div>
        <strong className={s.total}>{fmtPct1(reading.outputPct)}</strong>
      </div>

      <svg className={s.strip} width={width} height={68} viewBox={`0 0 ${width} 68`} role="img" aria-label={label}>
        <defs>
          <pattern id={`${id}-dots`} width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <circle cx="2.5" cy="2.5" r="1.15" className={s.ink} />
          </pattern>
          <pattern id={`${id}-hatch`} width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <path d="M0 0V5" className={s.mark} />
          </pattern>
        </defs>
        <line x1="8" x2={width - 8} y1="46" y2="46" className={s.rule} />
        {factors.map((factor, index) => {
          const previous = index === 0 ? 0 : reading.hoursContrib;
          const start = factor.points < 0 ? Math.min(0, previous) : Math.max(0, previous);
          const end = start + factor.points;
          return (
            <rect
              key={factor.pattern}
              x={x(Math.min(start, end))}
              y="18"
              width={Math.abs(x(end) - x(start))}
              height="28"
              fill={`url(#${id}-${factor.pattern})`}
              className={s.mark}
            />
          );
        })}
        <line x1={zero} x2={zero} y1="14" y2="51" className={s.mark} />
        <text x={zero} y="64" textAnchor="middle" className={s.zero}>0</text>
        <circle cx={net} cy="8" r="4" className={s.net} />
        <line x1={net} x2={net} y1="12" y2="18" className={s.mark} />
      </svg>

      {/* Key — same grammar as SeriesLegend under a line chart: mark · name · value. */}
      <ul className={s.key} aria-label="Key">
        {factors.map((factor) => (
          <li key={factor.pattern}>
            <svg width="14" height="10" aria-hidden="true">
              <rect width="14" height="10" fill={`url(#${id}-${factor.pattern})`} className={s.mark} />
            </svg>
            <span>{factor.name}</span>
            <b className="bo-num">{fmtPoints(factor.points)}</b>
          </li>
        ))}
        <li>
          <svg width="14" height="10" aria-hidden="true">
            <circle cx="7" cy="5" r="3.5" className={s.net} />
          </svg>
          <span>Output</span>
          <b className="bo-num">{fmtPct1(reading.outputPct)}</b>
        </li>
      </ul>

      <dl className={s.factors}>
        {factors.map((factor) => (
          <div key={factor.pattern} className={s.factor}>
            <dt>{factor.name}</dt>
            <dd>
              <strong>{fmtPct1(factor.change)}</strong> between {fromLabel} and {toLabel}
            </dd>
            <dd>{fmtPoints(factor.points)} of the {fmtPct1(reading.outputPct)} change in output</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
