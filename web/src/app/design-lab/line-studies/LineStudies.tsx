"use client";

import { useId, useState } from "react";
import Link from "next/link";
import { TimeChart, SERIES_TONES, type ChartSeries } from "@/brand/instrument/TimeChart";
import { fmt, fmtT } from "@/brand/data";
import rents from "./rents.json";
import s from "./studies.module.css";

const directions = [
  ["A", "Clean instrument", "One clear trace. No decorative area; the shape and exact values do the work.", "Recommended default"],
  ["B", "Printed field", "A light dot screen grounds the primary series. More texture, without suggesting extra traces.", "For a single headline series"],
  ["C", "Separate panels", "One place per panel, with identical axes. Compare shapes without crossing lines.", "For several places or categories"],
  ["D", "Shared template", "Direction A is now adopted in the shared chart, with inspection and exact values.", "Adopted direction A"],
] as const;

function Plot({ series, dots, index, min, max }: { series: ChartSeries[]; dots?: boolean; index: number; min: number; max: number }) {
  const id = useId().replaceAll(":", "");
  const first = rents[0].points[0].t;
  const last = rents[0].points.at(-1)!.t;
  const x = (t: number) => 72 + (t - first) / (last - first) * 620;
  const y = (v: number) => 252 - (v - min) / (max - min) * 218;
  const path = (points: ChartSeries["points"]) => points.map((p, i) => `${i === 0 || p.t - points[i - 1].t > 0.09 ? "M" : "L"}${x(p.t)},${y(p.v)}`).join(" ");
  const primary = series[0].points;
  const labelY = new Map<string, number>();
  let previous = -20;
  [...series].sort((a, b) => b.points.at(-1)!.v - a.points.at(-1)!.v).forEach(line => {
    const position = Math.max(y(line.points.at(-1)!.v), previous + 38);
    labelY.set(line.id, position);
    previous = position;
  });
  return <svg className={s.plot} viewBox="0 0 900 300" role="img" aria-label={`${series.map(v => v.label).join(", ")} monthly rent, January 2015 to September 2026. Exact values below.`}>
    <defs><pattern id={id} width="8" height="8" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="0.65" fill="var(--bo-ink)" /></pattern></defs>
    {[0, 1, 2, 3, 4].map(i => { const v = min + (max - min) * i / 4; return <g key={i}><line x1="72" x2="692" y1={y(v)} y2={y(v)} stroke="var(--bo-ink-10)"/><text x="60" y={y(v) + 4} textAnchor="end">{fmt.gbp(v)}</text></g>; })}
    {[2015, 2020, 2025].map(t => <text key={t} x={x(t)} y="281" textAnchor="middle">{t}</text>)}
    {dots && <path d={`${path(primary)} L${x(last)},252 L72,252 Z`} fill={`url(#${id})`} />}
    {series.map(line => {
      const color = SERIES_TONES[rents.findIndex(r => r.id === line.id)];
      const end = line.points.at(-1)!;
      const split = line.points.findIndex(p => p.provisional);
      const observed = split < 0 ? line.points : line.points.slice(0, split);
      const provisional = split < 0 ? [] : line.points.slice(Math.max(0, split - 1));
      return <g key={line.id}>
        <path d={path(observed)} fill="none" stroke={color} strokeWidth="2.5" />
        <path d={path(provisional)} fill="none" stroke={color} strokeWidth="2.5" strokeDasharray="2 4" />
        <circle cx={x(end.t)} cy={y(end.v)} r="4" fill="var(--bo-paper)" stroke={color} strokeWidth="2" />
        <path d={`M698,${y(end.v)} L708,${labelY.get(line.id)}`} stroke={color} fill="none" />
        <text x="716" y={labelY.get(line.id)! - 6}>{line.label}</text><text x="716" y={labelY.get(line.id)! + 12}>{fmt.gbp(end.v)}</text>
      </g>;
    })}
    <line x1={x(primary[index].t)} x2={x(primary[index].t)} y1="28" y2="252" stroke="var(--bo-union)" strokeDasharray="3 5" />
    {series.map(line => <circle key={line.id} cx={x(line.points[index].t)} cy={y(line.points[index].v)} r="3" fill="var(--bo-paper)" stroke="var(--bo-union)" />)}
  </svg>;
}

export function LineStudies() {
  const [compare, setCompare] = useState(false);
  const [index, setIndex] = useState(rents[0].points.length - 1);
  const [choice, setChoice] = useState<string | null>(null);
  const series = compare ? rents : rents.slice(0, 1);
  const min = compare ? 400 : 800;
  const max = 1600;
  return <main className={s.page}>
    <nav><Link href="/design-lab">← Design lab</Link><Link href="/housing?domain=renting">Open renting →</Link></nav>
    <header className={s.header}><p className={s.eyebrow}>Chart studies / 01</p><h1>Let the line speak.</h1><p>Direction A has been adopted. The original studies remain below, alongside the updated shared template.</p></header>
    <section className={s.controls} aria-label="Comparison controls">
      <div className={s.buttons}><button aria-pressed={!compare} onClick={() => setCompare(false)}>One series</button><button aria-pressed={compare} onClick={() => setCompare(true)}>Three series</button></div>
      <label className={s.slider}>Inspect month <strong>{fmtT(rents[0].points[index].t)}</strong><input aria-label="Inspect month" type="range" min="0" max={rents[0].points.length - 1} value={index} onChange={e => setIndex(Number(e.target.value))} /></label>
      <p>Monthly private rent · £ per calendar month<br/>Jan 2015–Sep 2026 · nominal · axes do not start at zero</p>
    </section>
    <div className={s.readout} aria-live="polite">{series.map(line => <span key={line.id}>{line.label} <strong>{fmt.gbp(line.points[index].v)}</strong></span>)}</div>
    {directions.map(([letter, title, description, use]) => <section className={s.study} key={letter} aria-labelledby={`study-${letter}`}>
      <div className={s.caption}><div><p className={s.eyebrow}>{letter} / {use}</p><h2 id={`study-${letter}`}>{title}</h2><p>{description}</p></div><button aria-pressed={choice === letter} onClick={() => setChoice(letter)}>{choice === letter ? `${letter} shortlisted ✓` : `Shortlist ${letter}`}</button></div>
      {letter === "D" ? <TimeChart series={series} cadence="monthly" format={fmt.gbp} height={340} label="Shared clean-line rent chart" /> : letter === "C" ? <div>{series.map(line => <div key={line.id} className={s.panel}><h3>{line.label}</h3><Plot series={[line]} min={min} max={max} index={index}/></div>)}</div> : <Plot series={series} dots={letter === "B"} min={min} max={max} index={index} />}
      <p className={s.note}>{letter === "C" ? "Shared axes across panels. " : ""}{letter === "D" ? "Existing component: automatic axis bounds and its own hover / keyboard inspection. " : "A–C share fixed axes; use the month slider or arrow keys to inspect values. "}Dotted trace = provisional. End labels show latest available.</p>
    </section>)}
    <section className={s.footer}><h2>{choice ? `Your shortlist: ${choice}` : "Which direction feels right?"}</h2><p>Shortlisting is local to this preview. Tell me A, B or C—or which elements to combine—before the live charts are updated.</p>
      <details><summary>Exact values for the selected month</summary><table><caption>{fmtT(rents[0].points[index].t)} · monthly private rent</caption><thead><tr><th>Place</th><th>Rent</th><th>Status</th></tr></thead><tbody>{series.map(line => <tr key={line.id}><th>{line.label}</th><td>{fmt.gbp(line.points[index].v)}</td><td>{line.points[index].provisional ? "Provisional" : "Final"}</td></tr>)}</tbody></table></details>
      <p>Source: <a href="https://www.ons.gov.uk/economy/inflationandpriceindices/datasets/priceindexofprivaterentsukmonthlypricestatistics">ONS · PIPR</a> · release 21 October 2026 · indicator <code>private-rental-prices</code>. Fixed snapshot from the project’s curated observations; latest two months provisional. This lab explores presentation, not a new statistical measure.</p>
    </section>
  </main>;
}
