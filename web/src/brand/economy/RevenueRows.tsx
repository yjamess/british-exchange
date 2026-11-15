"use client";

/**
 * Tax 01 — What Britain raises · composition rows.
 *
 * One row per month: the latest complete month and the same month every five years back. Each
 * row is the month's receipts laid end to end, head by head, in the head's fixed pen pattern.
 * In pounds the rows share one £ scale, so the growth of the whole and the growth of each head
 * are both lengths; as shares every row is the full rule and only the joins move.
 *
 * One ink. Heads that are negative in a month (other local taxes can be) take no length and are
 * listed in the readout.
 */

import { useId, useMemo } from "react";
import { useWidth } from "../useWidth";
import s from "./taxMachine.module.css";
import { Patterns, Swatch, fillFor, useRowHover } from "./TaxMachine";
import { ReadoutCard, type ReadoutRow } from "../instrument/ReadoutCard";
import { HEAD_PATTERN, fmtAnatomyBn, fmtAnatomyShare, type RevenueRow } from "./tax-anatomy-model";

const PAD = { left: 8, right: 8 };
const ROW_H = 30;
const SEG_H = 16;
const TOP = 10;

function niceMax(v: number): number {
  const pow = Math.pow(10, Math.floor(Math.log10(v)));
  for (const m of [1, 2, 2.5, 5, 10]) if (m * pow >= v) return m * pow;
  return 10 * pow;
}

export function RevenueRows({
  rows,
  measure,
  label,
  gutter = 72,
}: {
  rows: RevenueRow[];
  measure: "absolute" | "share";
  label: string;
  gutter?: number;
}) {
  const uid = useId().replace(/:/g, "");
  const [wrapRef, width] = useWidth<HTMLDivElement>(900);
  const narrow = width < 560;
  const g = narrow ? 60 : gutter;
  const plotW = Math.max(200, width - g - PAD.left - PAD.right);
  const left = g + PAD.left;
  const share = measure === "share";
  const axisMaxBn = useMemo(() => niceMax(Math.max(1, ...rows.map((r) => r.totalM / 1000))), [rows]);
  const x = (bn: number) => left + (share ? bn / 100 : bn / axisMaxBn) * plotW;

  const axisY = TOP + rows.length * ROW_H + 8;
  const height = axisY + 28;
  const ticks = useMemo(() => {
    const out: number[] = [];
    const step = share ? (narrow ? 25 : 20) : niceMax(axisMaxBn / (narrow ? 4 : 8));
    for (let v = 0; v <= (share ? 100 : axisMaxBn) + 1e-9; v += step) out.push(v);
    return out;
  }, [share, narrow, axisMaxBn]);

  const { hover, onMove, onLeave } = useRowHover(width);
  const hoverRow = hover ? rows[hover.i] : null;
  const readRows: ReadoutRow[] = hoverRow
    ? [
        ...hoverRow.parts.map((p) => ({ label: p.label, value: `${fmtAnatomyBn(p.m / 1000)} · ${fmtAnatomyShare(p.share)}` })),
        { label: "Total", value: fmtAnatomyBn(hoverRow.totalM / 1000) },
      ]
    : [];

  const heads = rows[rows.length - 1]?.parts ?? [];
  const aria = `${label}. ${rows.length} months from ${rows[0]?.label ?? ""} to ${rows[rows.length - 1]?.label ?? ""}, each split by head.`;

  return (
    <div ref={wrapRef} className={s.root} role="group" aria-label={aria}>
      <div className={s.strip}>
        <svg className={s.svg} viewBox={`0 0 ${width} ${height}`} width={width} height={height} aria-hidden="true" onMouseLeave={onLeave}>
          <Patterns uid={uid} />
          {rows.map((r, i) => {
            const y = TOP + i * ROW_H;
            const segY = y + (ROW_H - SEG_H) / 2;
            let cursor = 0;
            return (
              <g key={r.period} onMouseMove={onMove(i)}>
                <rect x={0} y={y} width={width} height={ROW_H} className={s.rowHit} />
                <text x={g - 8} y={segY + SEG_H - 4} textAnchor="end" className={s.rowLabel}>
                  {r.label}
                </text>
                {r.parts.map((p) => {
                  const len = share ? Math.max(0, p.share) : Math.max(0, p.m / 1000);
                  if (len <= 0) return null;
                  const x0 = x(cursor);
                  cursor += len;
                  const x1 = x(cursor);
                  return <rect key={p.id} x={x0} y={segY} width={Math.max(0, x1 - x0)} height={SEG_H} fill={fillFor(uid, HEAD_PATTERN[p.id] ?? "stipple")} className={s.seg} />;
                })}
              </g>
            );
          })}
          <line x1={left} x2={left + plotW} y1={axisY} y2={axisY} className={s.rule} />
          {ticks.map((v, i) => (
            <g key={v}>
              <line x1={x(v)} x2={x(v)} y1={axisY} y2={axisY + 8} className={s.tick} />
              <text x={x(v)} y={axisY + 20} textAnchor={i === 0 ? "start" : i === ticks.length - 1 ? "end" : "middle"} className={s.tickText}>
                {share ? `${v}%` : `£${v}bn`}
              </text>
            </g>
          ))}
        </svg>
        {hover && hoverRow ? <ReadoutCard head={hoverRow.label} rows={readRows} style={{ top: 6, left: hover.x }} /> : null}
        <ul className={s.key} aria-label="Key">
          {heads.map((p) => (
            <li key={p.id}>
              <Swatch uid={uid} pattern={HEAD_PATTERN[p.id] ?? "stipple"} />
              <span>{p.label}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
