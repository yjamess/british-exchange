"use client";

import { useId, useState } from "react";
import { extent, fmtT, nearest, niceTicks, yearTicks, type Pt, type Series } from "../data";
import { useWidth } from "../useWidth";
import { linePath, scale } from "../charts/parts";
import s from "./sector.module.css";

const colors = ["var(--sector-ink)", "var(--sector-accent)", "#658477", "#837198"];

// Keep consecutive strokes together so provisional dashes do not restart at every month.
function lineRuns(points: Pt[]) {
  const runs: { provisional: boolean; points: Pt[] }[] = [];
  for (let i = 1; i < points.length; i++) {
    const previous = points[i - 1]!;
    const point = points[i]!;
    const provisional = Boolean(previous.provisional || point.provisional);
    const current = runs[runs.length - 1];
    if (current && current.provisional === provisional) current.points.push(point);
    else runs.push({ provisional, points: [previous, point] });
  }
  return runs;
}

/** An identical reading contract across sectors: unit, time, series, exact values and a table. */
export function TrendChart({ series, label, format, tickFormat = format, cadence = "monthly", bars = false, zero = false }: {
  series: Series[]; label: string; format: (v: number) => string; tickFormat?: (v: number) => string;
  cadence?: "monthly" | "annual" | "quarterly"; bars?: boolean; zero?: boolean;
}) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [selectedTime, setSelectedTime] = useState<number | null>(null);
  const controlId = useId();
  const valid = series.filter(x => x.points.length);
  const points = valid.flatMap(x => x.points);
  const times = [...new Set(points.map(p => p.t))].sort((a,b) => a-b);
  if (!points.length) return <div className={s.empty}>This series is currently unavailable.</div>;
  const [t0,t1] = extent(times);
  const [lo,hi] = extent(points.map(p => p.v));
  const bottom = zero || bars ? Math.min(0,lo) : lo - (hi-lo)*.16;
  const top = hi + (hi-bottom)*.13 || 1;
  const height = width < 480 ? 250 : 310;
  const left = width < 480 ? 44 : 55;
  const right = width - 12;
  const x = scale(t0,t1,left,right);
  const y = scale(bottom,top,height-32,15);
  const activeTime = selectedTime === null ? t1 : Math.min(t1,Math.max(t0,selectedTime));
  const activeIndex = times.indexOf(nearest(times.map(t => ({t,v:t})),activeTime)!.t);
  const active = valid.map(item => ({item, point:item.points.find(p => Math.abs(p.t-times[activeIndex]!) < 1e-6)}));
  const selectPointer = (event: React.PointerEvent<SVGSVGElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const px = (event.clientX-rect.left) * width / rect.width;
    setSelectedTime(nearest(times.map(t => ({t,v:t})), t0 + Math.max(0,Math.min(1,(px-left)/(right-left))) * (t1-t0))!.t);
  };
  return <div ref={ref} className={s.chart}>
    <div className={s.legend}>{active.map(({item,point},i) => <span key={item.id} className={s.legendItem}><i style={{background:colors[i % colors.length]}} />{item.label}<strong>{point ? format(point.v) : "No observation"}{point?.provisional ? "*" : ""}</strong></span>)}</div>
    <svg width={width} height={height} role="img" aria-label={label} onPointerMove={selectPointer} onPointerLeave={() => setSelectedTime(null)}>
      <title>{`${label} Exact values are available in the date control and data table below.`}</title>
      {niceTicks(bottom,top,4).map(v => <g key={v}><line className={s.chartGrid} x1={left} x2={right} y1={y(v)} y2={y(v)}/><text x={left-10} y={y(v)+4} textAnchor="end">{tickFormat(v)}</text></g>)}
      {yearTicks(t0,t1,width < 480 ? 3 : 6).map(t => <text key={t} x={x(t)} y={height-8} textAnchor={t === t0 ? "start" : x(t) > right-20 ? "end" : "middle"}>{t}</text>)}
      {valid.map((item,i) => <g key={item.id}>
        {bars ? item.points.map(p => <rect key={p.t} x={x(p.t)-2} y={y(p.v)} width={Math.max(1,(right-left)/item.points.length*.55)} height={y(0)-y(p.v)} fill={colors[i % colors.length]} opacity={p.provisional ? .5 : .85}/>) : <>
          {lineRuns(item.points).map((run,j) => <path key={j} d={linePath(run.points.map(p => ({x:x(p.t),y:y(p.v)})))} fill="none" stroke={colors[i % colors.length]} strokeWidth={i === 0 ? 2.5 : 1.8} strokeDasharray={run.provisional ? "3 4" : undefined} strokeLinecap="round"/>)}
        </>}
      </g>)}
      <line x1={x(times[activeIndex]!)} x2={x(times[activeIndex]!)} y1={15} y2={height-32} stroke="var(--sector-ink)" opacity=".15"/>
      {active.map(({item,point},i) => point && <circle key={item.id} cx={x(point.t)} cy={y(point.v)} r={4} fill={colors[i % colors.length]} stroke="var(--sector-white)" strokeWidth={2}/>)}
    </svg>
    <div className={s.scrubber}><label htmlFor={controlId}>{fmtT(times[activeIndex]!,cadence)}</label><input id={controlId} type="range" min={0} max={times.length-1} value={activeIndex} onChange={e => setSelectedTime(times[Number(e.target.value)]!)} aria-label={`${label}: observation date`} aria-valuetext={`${fmtT(times[activeIndex]!,cadence)}; ${active.map(({item,point}) => `${item.label}: ${point ? format(point.v) : "unavailable"}`).join("; ")}`} /></div>
    <details className={s.tableDetails}><summary>View chart data{points.some(p => p.provisional) ? " · * provisional observations" : ""}</summary><div className={s.tableScroll}><table><caption>{label}</caption><thead><tr><th scope="col">Period</th>{valid.map(item => <th key={item.id} scope="col">{item.label}</th>)}</tr></thead><tbody>{[...times].reverse().map(t => <tr key={t}><th scope="row">{fmtT(t,cadence)}</th>{valid.map(item => {const p = item.points.find(p => p.t === t); return <td key={item.id}>{p ? `${format(p.v)}${p.provisional ? " *" : ""}` : "—"}</td>;})}</tr>)}</tbody></table></div></details>
  </div>;
}
