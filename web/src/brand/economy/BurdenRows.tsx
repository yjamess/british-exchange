"use client";

/**
 * Tax 03 — Who bears the tax burden.
 *
 * One row per income fifth, bottom to top, then all households as a reference row below a
 * hairline. Each row is the household group's taxes laid end to end on one rule: direct taxes
 * solid, indirect taxes hatched, so the join is the reading — the bottom fifth's row is mostly
 * hatch, the top fifth's mostly solid. The rule is a share of gross income or pounds a year,
 * fixed across rows. Where ONS publishes only the indirect part for a denominator, only that
 * segment is drawn.
 *
 * One ink. Every length is a published ONS Effects of taxes and benefits figure.
 */

import { useId, useMemo } from "react";
import { useWidth } from "../useWidth";
import { ReadoutCard, type ReadoutRow } from "../instrument/ReadoutCard";
import s from "./taxMachine.module.css";
import { Patterns, Swatch, fillFor, useRowHover } from "./TaxMachine";
import { fmtBurdenGbp, fmtBurdenShare, type BurdenRow } from "./tax-burden-model";

const PAD = { left: 8, right: 8 };
const ROW_H = 34;
const SEG_H = 18;
const TOP = 10;
const REF_GAP = 14;

function niceMax(v: number): number {
  const pow = Math.pow(10, Math.floor(Math.log10(v)));
  for (const m of [1, 2, 2.5, 4, 5, 6, 8, 10]) if (m * pow >= v) return m * pow;
  return 10 * pow;
}

export function BurdenRows({
  rows,
  share,
  label,
  gutter = 150,
}: {
  rows: BurdenRow[];
  share: boolean;
  label: string;
  gutter?: number;
}) {
  const uid = useId().replace(/:/g, "");
  const [wrapRef, width] = useWidth<HTMLDivElement>(900);
  const narrow = width < 560;
  const g = narrow ? 112 : gutter;
  const plotW = Math.max(200, width - g - PAD.left - PAD.right);
  const left = g + PAD.left;
  const fmt = share ? fmtBurdenShare : fmtBurdenGbp;
  const hasDirect = rows.some((r) => r.direct != null);

  const axisMax = useMemo(
    () => niceMax(Math.max(1, ...rows.map((r) => Math.max(0, r.direct ?? 0) + Math.max(0, r.indirect ?? 0)))),
    [rows],
  );
  const x = (v: number) => left + (v / axisMax) * plotW;
  const ticks = useMemo(() => {
    const step = niceMax(axisMax / (narrow ? 4 : 8));
    const out: number[] = [];
    for (let v = 0; v <= axisMax + 1e-9; v += step) out.push(v);
    return out;
  }, [axisMax, narrow]);

  const main = rows.filter((r) => !r.reference);
  const ref = rows.filter((r) => r.reference);
  const refTop = TOP + main.length * ROW_H + REF_GAP;
  const axisY = refTop + ref.length * ROW_H + 6;
  const height = axisY + 28;

  const { hover, onMove, onLeave } = useRowHover(width);
  const ordered = [...main, ...ref];
  const hoverRow = hover ? ordered[hover.i] : null;
  const readRows: ReadoutRow[] = hoverRow
    ? [
        ...(hoverRow.direct != null ? [{ label: "Direct taxes", value: fmt(hoverRow.direct), pattern: "solid" as const }] : []),
        { label: "Indirect taxes", value: hoverRow.indirect != null ? fmt(hoverRow.indirect) : "—", pattern: "hatch" as const },
        ...(hoverRow.all != null ? [{ label: "All taxes", value: fmt(hoverRow.all) }] : []),
      ]
    : [];

  const aria = `${label}. Five income fifths and all households; direct and indirect taxes laid end to end.`;

  const Row = ({ r, y, i }: { r: BurdenRow; y: number; i: number }) => {
    const segY = y + (ROW_H - SEG_H) / 2;
    const d = Math.max(0, r.direct ?? 0);
    const ind = Math.max(0, r.indirect ?? 0);
    return (
      <g onMouseMove={onMove(i)}>
        <rect x={0} y={y} width={width} height={ROW_H} className={s.rowHit} />
        <text x={g - 8} y={segY + SEG_H - 5} textAnchor="end" className={s.rowLabel}>
          {r.label}
        </text>
        {r.direct != null && d > 0 ? <rect x={x(0)} y={segY} width={x(d) - x(0)} height={SEG_H} fill={fillFor(uid, "solid")} className={s.seg} /> : null}
        {r.indirect != null && ind > 0 ? <rect x={x(d)} y={segY} width={x(d + ind) - x(d)} height={SEG_H} fill={fillFor(uid, "hatch")} className={s.seg} /> : null}
        <text x={x(d + ind) + 8} y={segY + SEG_H - 5} className={s.labelFig}>
          {fmt(d + ind)}
        </text>
      </g>
    );
  };

  return (
    <div ref={wrapRef} className={s.root} role="group" aria-label={aria}>
      <div className={s.strip}>
        <svg className={s.svg} viewBox={`0 0 ${width} ${height}`} width={width} height={height} aria-hidden="true" onMouseLeave={onLeave}>
          <Patterns uid={uid} />
          {main.map((r, i) => (
            <Row key={r.id} r={r} y={TOP + i * ROW_H} i={i} />
          ))}
          {ref.length ? <line x1={left} x2={left + plotW} y1={refTop - REF_GAP / 2} y2={refTop - REF_GAP / 2} className={s.gapRow} /> : null}
          {ref.map((r, i) => (
            <Row key={r.id} r={r} y={refTop + i * ROW_H} i={main.length + i} />
          ))}
          <line x1={left} x2={left + plotW} y1={axisY} y2={axisY} className={s.rule} />
          {ticks.map((v, i) => (
            <g key={v}>
              <line x1={x(v)} x2={x(v)} y1={axisY} y2={axisY + 8} className={s.tick} />
              <text x={x(v)} y={axisY + 20} textAnchor={i === 0 ? "start" : i === ticks.length - 1 ? "end" : "middle"} className={s.tickText}>
                {share ? `${v}%` : `£${v.toLocaleString("en-GB")}`}
              </text>
            </g>
          ))}
        </svg>
        {hover && hoverRow ? <ReadoutCard head={hoverRow.label} rows={readRows} style={{ top: 6, left: hover.x }} /> : null}
        <ul className={s.key} aria-label="Key">
          {hasDirect ? (
            <li>
              <Swatch uid={uid} pattern="solid" />
              <span>Direct taxes</span>
            </li>
          ) : null}
          <li>
            <Swatch uid={uid} pattern="hatch" />
            <span>Indirect taxes</span>
          </li>
        </ul>
      </div>
    </div>
  );
}
