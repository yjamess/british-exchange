"use client";

import { useState, type CSSProperties } from "react";
import { TimeChart, type ChartSeries } from "@/brand/instrument/TimeChart";
import { PALETTES, CURRENT, contrastOnPaper } from "./palettes";
import s from "./palettes.module.css";

const money = (v: number) => `£${v.toLocaleString("en-GB", { maximumFractionDigits: 1 })}bn`;
const financialYear = (t: number) => `${Math.floor(t)}–${String(Math.floor(t) + 1).slice(-2)}`;

export function PaletteLab({ series, sourceUrl }: { series: ChartSeries[]; sourceUrl?: string }) {
  const [choice, setChoice] = useState("spectrum");
  const [kind, setKind] = useState<"line" | "stack">("line");
  const [focus, setFocus] = useState("all");
  const [mono, setMono] = useState(false);
  const palette = PALETTES.find(p => p.id === choice);
  const colours = palette?.colours ?? CURRENT;
  const selectedIndex = series.findIndex(sr => sr.id === focus);
  const shown = selectedIndex < 0 ? series : [series[selectedIndex]];
  const tones = selectedIndex < 0 ? colours : [colours[selectedIndex % colours.length]];
  const name = palette?.name ?? "Previous palette";

  return <main className={`bo-wrap ${s.page}`}>
    <header className={s.head}>
      <p className="bo-label">Design lab / Colour studies</p>
      <h1 className="bo-d1">More colour, the same Exchange.</h1>
      <p className="bo-prose">Three lighter accent directions, each with twelve chart inks. Electric blue, paper and the reading type stay familiar. Try the same spending data in each palette.</p>
      <p className={s.labNote}>Electric spectrum is now the live palette. The previous five-ink palette remains here for comparison.</p>
    </header>

    <div className={s.choices} role="group" aria-label="Chart palette">
      <button type="button" aria-pressed={choice === "current"} onClick={() => setChoice("current")}><span className="bo-label">Reference</span><strong>Previous · 5 inks</strong><span className={s.mini}>{CURRENT.map(c => <i key={c} style={{ background: c }} />)}</span></button>
      {PALETTES.map((p, i) => <button key={p.id} type="button" aria-pressed={choice === p.id} onClick={() => setChoice(p.id)}><span className="bo-label">0{i + 1} / {p.tag}</span><strong>{p.name}</strong><span className={s.mini}>{p.colours.map(c => <i key={c} style={{ background: c }} />)}</span></button>)}
    </div>

    <section className={s.experiment} aria-labelledby="preview-title">
      <div className={s.previewHead}><div><p className="bo-label">On the instrument</p><h2 id="preview-title" className="bo-d3">{name}</h2></div><span className={s.counter}>{series.length} series / {colours.length} colours</span></div>
      <div className={s.controls}>
        <label><span className="bo-label">View</span><select aria-label="Chart view" value={kind} onChange={e => { setKind(e.target.value as "line" | "stack"); setFocus("all"); }}><option value="line">Each function · £bn</option><option value="stack">Composition · share</option></select></label>
        <label><span className="bo-label">Focus</span><select aria-label="Function focus" value={focus} disabled={kind === "stack"} onChange={e => setFocus(e.target.value)}><option value="all">All functions</option>{series.map(sr => <option key={sr.id} value={sr.id}>{sr.label}</option>)}</select></label>
        <label className={s.check}><input type="checkbox" checked={mono} onChange={e => setMono(e.target.checked)} />Greyscale check</label>
      </div>
      <div className={s.chart} data-mono={mono}>
        {series.length ? <TimeChart key={`${choice}-${focus}`} series={shown} seriesTones={tones} cadence="annual" kind={kind} height={440} zero motion={false} label={`Public spending by function · ${name}`} format={money} axisFormat={kind === "stack" ? v => `${Math.round(v * 100)}%` : money} periodLabel={financialYear} /> : <p>The spending data could not load. The palette studies below are still available.</p>}
      </div>
      <p className={s.source}>HM Treasury · Public Spending Statistics · Table 5.4 · UK · {series[0]?.points.length ? `${financialYear(series[0].points[0].t)}–${financialYear(series[0].points.at(-1)!.t)}` : "Annual"}{sourceUrl && <> · <a href={sourceUrl} target="_blank" rel="noreferrer">Source ↗</a></>}</p>
      <p className={s.explanation}>{choice === "current" ? "The previous five inks repeat across ten functions. The three studies provide a different ink for each function, with two in reserve." : "No repeated inks for these ten functions. Colour remains paired with full series names and the inspection card; use Focus to inspect the smaller functions."}</p>
      <p className={s.explanation}>Brighter colours help separation; they cannot separate lines that sit on top of one another. Ten to twelve hues also become harder to tell apart with some forms of colour vision difference. Labels, inspection and Focus still matter.</p>
    </section>

    <section className={s.studies} aria-label="Palette specifications">
      {PALETTES.map((p, i) => <article key={p.id} className={s.study}>
        <div className={s.studyIntro}><p className="bo-label">Study 0{i + 1} / {p.tag}</p><h2 className="bo-d3">{p.name}</h2><p>{p.description}</p><button type="button" className={s.tryButton} onClick={() => { setChoice(p.id); document.getElementById("preview-title")?.scrollIntoView({ behavior: "instant", block: "start" }); }}>Try on the chart ↑</button></div>
        <div className={s.swatches}>{p.colours.map((colour, n) => <div key={colour}><span className={s.swatch} style={{ background: colour }} /><span className="bo-label">{String(n + 1).padStart(2, "0")} / {colour}</span><span className={s.contrast}>{contrastOnPaper(colour).toFixed(1)}:1 on paper{contrastOnPaper(colour) < 3 ? " · fill only" : ""}</span></div>)}</div>
        <div className={s.ground} style={{ "--study-ground": p.ground } as CSSProperties}><p className="bo-label">Companion ground / {p.ground}</p><h3>One ink. A lighter ground.</h3><p>Union for reading. Electric for headings and rules. Accent colours belong to the data.</p><div className={s.groundButtons}><span>Current selection</span><span>Another view</span></div></div>
      </article>)}
    </section>
    <footer className={s.foot}>Electric spectrum is adopted in the shared brand tokens. Other options on this page remain previews.</footer>
  </main>;
}
