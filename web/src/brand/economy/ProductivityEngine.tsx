"use client";

/**
 * Growth · Productivity engine — one ink instrument.
 * Output change splits into hours worked and output per hour. The strip is the reading:
 * patterned segments add to the net mark. Factor cards under the strip carry the plain words.
 */

import { useId, useMemo } from "react";
import { useWidth } from "../useWidth";
import s from "./productivityEngine.module.css";
import { fmtPct1, type EngineReading } from "./growth-model";

type Props = {
  reading: EngineReading;
  fromLabel: string;
  toLabel: string;
  label: string;
};

type Factor = {
  name: string;
  change: number;
  points: number;
  pattern: "dots" | "hatch";
};

/** "+3.9 points" — share of the output change, in plain words. */
export function fmtPoints(v: number): string {
  const n = Math.abs(v).toFixed(1);
  const sign = v > 0.05 ? "+" : v < -0.05 ? "−" : "";
  return `${sign}${n} point${n === "1.0" ? "" : "s"}`;
}

export function ProductivityEngine({ reading, fromLabel, toLabel, label }: Props) {
  const id = useId().replace(/:/g, "");
  const [wrapRef, width] = useWidth<HTMLDivElement>(900);

  const factors: Factor[] = useMemo(
    () => [
      {
        name: "Hours worked",
        change: reading.hoursPct,
        points: reading.hoursContrib,
        pattern: "dots",
      },
      {
        name: "Output per hour",
        change: reading.perHourPct,
        points: reading.perHourContrib,
        pattern: "hatch",
      },
    ],
    [reading],
  );

  // Stack contributions of the same sign. Opposing contributions extend either side of zero.
  const positive = Math.max(0, reading.hoursContrib) + Math.max(0, reading.perHourContrib);
  const negative = Math.min(0, reading.hoursContrib) + Math.min(0, reading.perHourContrib);
  const min = Math.min(-0.5, negative * 1.15);
  const max = Math.max(0.5, positive * 1.15);
  const pad = 12;
  const plotW = Math.max(120, width - pad * 2);
  const x = (value: number) => pad + ((value - min) / (max - min)) * plotW;
  const zero = x(0);
  const net = x(reading.outputPct);

  const segments = factors.map((factor, index) => {
    const previous = index === 0 ? 0 : reading.hoursContrib;
    const start = factor.points < 0 ? Math.min(0, previous) : Math.max(0, previous);
    const end = start + factor.points;
    const x0 = x(Math.min(start, end));
    const x1 = x(Math.max(start, end));
    return { ...factor, x0, x1, mid: (x0 + x1) / 2, w: Math.max(0, x1 - x0) };
  });

  const stripH = 112;
  const barY = 28;
  const barH = 44;

  return (
    <div ref={wrapRef} className={s.root}>
      <div className={s.reading}>
        <div>
          <p className={`bo-label ${s.period}`}>
            {fromLabel} to {toLabel} · {reading.quarters} quarters
          </p>
          <h4 className={s.output}>Output change</h4>
        </div>
        <strong className={s.total}>{fmtPct1(reading.outputPct)}</strong>
      </div>

      <svg
        className={s.strip}
        width={width}
        height={stripH}
        viewBox={`0 0 ${width} ${stripH}`}
        role="img"
        aria-label={label}
      >
        <defs>
          <pattern
            id={`${id}-dots`}
            width="5"
            height="5"
            patternUnits="userSpaceOnUse"
            patternTransform="rotate(45)"
          >
            <circle cx="2.5" cy="2.5" r="1.15" className={s.ink} />
          </pattern>
          <pattern
            id={`${id}-hatch`}
            width="5"
            height="5"
            patternUnits="userSpaceOnUse"
            patternTransform="rotate(45)"
          >
            <path d="M0 0V5" className={s.mark} />
          </pattern>
        </defs>

        <line x1={pad} x2={width - pad} y1={barY + barH + 6} y2={barY + barH + 6} className={s.rule} />
        <line x1={zero} x2={zero} y1={barY - 6} y2={barY + barH + 6} className={s.axis} />

        {segments.map((seg) =>
          seg.w > 0 ? (
            <g key={seg.pattern}>
              <rect
                x={seg.x0}
                y={barY}
                width={seg.w}
                height={barH}
                fill={`url(#${id}-${seg.pattern})`}
                stroke="var(--bo-paper)"
                strokeWidth={1.5}
              />
              {seg.w >= 64 ? (
                <text x={seg.mid} y={barY + barH / 2 + 4} textAnchor="middle" className={s.segValue}>
                  {fmtPoints(seg.points)}
                </text>
              ) : null}
            </g>
          ) : null,
        )}

        <circle cx={net} cy={barY - 10} r={5} className={s.net} />
        <line x1={net} x2={net} y1={barY - 5} y2={barY} className={s.axis} />
        <text x={net} y={18} textAnchor={net > width - 80 ? "end" : net < 80 ? "start" : "middle"} className={s.netLabel}>
          Output {fmtPct1(reading.outputPct)}
        </text>
        <text x={zero} y={stripH - 6} textAnchor="middle" className={s.zero}>
          0
        </text>
      </svg>

      <ul className={s.key} aria-label="Key">
        {factors.map((factor) => (
          <li key={factor.pattern}>
            <i className={s.swatch} data-pattern={factor.pattern} aria-hidden="true" />
            <span>{factor.name}</span>
            <b className="bo-num">{fmtPoints(factor.points)}</b>
          </li>
        ))}
        <li>
          <i className={s.swatch} data-pattern="net" aria-hidden="true" />
          <span>Output</span>
          <b className="bo-num">{fmtPct1(reading.outputPct)}</b>
        </li>
      </ul>

      <dl className={s.factors}>
        {factors.map((factor) => (
          <div key={factor.pattern} className={s.factor}>
            <dt>
              <i className={s.swatch} data-pattern={factor.pattern} aria-hidden="true" />
              {factor.name}
            </dt>
            <dd>
              <strong>{fmtPct1(factor.change)}</strong>
              <span>
                between {fromLabel} and {toLabel}
              </span>
            </dd>
            <dd className={s.factorNote}>
              {fmtPoints(factor.points)} of the {fmtPct1(reading.outputPct)} change in output
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
