"use client";

import { useState } from "react";
import Link from "next/link";
import { TerraceDrawing } from "../housing/HousingOverview";
import type { HousingData } from "../housing/load";
import { fmt } from "../data";
import { Choice, Evidence, MetricStrip, SectionHeading } from "./components";
import { TrendChart } from "./TrendChart";
import s from "./sector.module.css";
import p from "./system.module.css";

export function SectorSystem({data}: {data: HousingData}) {
  const [period,setPeriod]=useState<"all"|"ten">("all");
  const [metric,setMetric]=useState("afford");
  const affordability=data.afford[data.afford.length-1];
  return <div className={s.shell}>
    <header className={p.header}><div className={s.wrap}><Link href="/design-lab/housing">← Housing & Land</Link><span className={s.eyebrow}>British Exchange / Design index</span></div></header>
    <main className={s.wrap}>
      <div className={p.intro}><span className={s.eyebrow}>Observatory foundations / 02</span><h1>A common language.<br/>Room for different stories.</h1><p>Shared Instrument + Imprint shell for every sector. Housing is the first proof — Energy, Economy and the rest adopt the same kit with a sector pigment for imprint only.</p><nav aria-label="Design index sections"><a href="#type">Typography</a><a href="#components">Components</a><a href="#charts">Data</a><a href="#imprint">Imprint</a></nav></div>
      <section id="type" className={p.section}>
        <SectionHeading number="01" label="Typography & colour" title="Two voices. Clear roles." description="A contemporary sans serif for reading. Monospace for dates, units and small navigational details."/>
        <div className={p.typeGrid}><div className={p.typeSpec}><span className={s.eyebrow}>Display / condensed · Caslon editorial</span><div className={p.display}>Housing & Land.</div><span className={s.eyebrow}>Section / Instrument headlines</span><h3>A home, measured in years of pay.</h3><span className={s.eyebrow}>Reading / Source Sans 3</span><p>The places we live. The prices we pay. A closer look at housing, through the public record.</p><span className={s.eyebrow}>Metadata / IBM Plex Mono</span><p className={s.eyebrow}>England · Annual · 1997–2025</p></div><div className={p.swatches}>{[
          ["Ink","#0d1258","Admiralty — headings, text, series"],
          ["Paper","#f0ede5","Portland — reading surface"],
          ["Lift","#f7f5ef","Plots and interactive surfaces"],
          ["Signal","#b3122e","The one highlight that matters"],
          ["Sector","#b07c2c","Housing imprint only — never data"],
        ].map(([name,color,use])=><div className={p.swatch} key={name}><i style={{background:color}}/><div><strong>{name} <code>{color}</code></strong><span>{use}</span></div></div>)}</div></div>
      </section>
      <section id="components" className={p.section}>
        <SectionHeading number="02" label="Reusable structure" title="Question. Figure. Evidence." description="The heading sets the question. A summary gives orientation. The chart makes comparison possible. Details open when needed."/>
        <MetricStrip selected={metric} onSelect={setMetric} metrics={[
          {id:"cost",label:"Average house price",value:data.price.length ? fmt.gbp(data.price[data.price.length-1]!.v) : "—",context:"A headline figure",scope:"Value + scope + period"},
          {id:"afford",label:"Price to earnings",value:affordability ? fmt.ratio(affordability.v) : "—",context:"A selected topic",scope:"Selection uses a fine accent rule"},
          {id:"scope",label:"Geography",value:"England",context:"Scope stays beside the number",scope:"Never imply UK-wide coverage"},
          {id:"detail",label:"Progressive detail",value:"↗",context:"Choose a topic to look closer",scope:"One topic navigation per sector"},
        ]}/>
        <div className={p.componentNotes}><p><strong>MetricStrip</strong> — a compact set of relevant figures, with one interaction per item.</p><p><strong>SectionHeading</strong> — stable numbering, question, explanation and an optional control.</p><p><strong>Choice</strong> — explicit selection. Two or three options; use a select for longer lists.</p></div>
      </section>
      <section id="charts" className={p.section}>
        <SectionHeading number="03" label="Data presentation" title="Every mark has a meaning." description="Clear axes, exact values and a keyboard-accessible date control. No decorative lines inside the plot."><Choice label="Chart time range" value={period} onChange={setPeriod} options={[{id:"all",label:"All years"},{id:"ten",label:"10 years"}]}/></SectionHeading>
        <div className={p.chartPanel}><TrendChart key={period} series={[{id:"england",label:"England",points:period === "all" ? data.afford : data.afford.filter(v=>v.t>=(affordability?.t ?? 0)-10)}]} label="House price to earnings ratio, England" format={fmt.ratio} cadence="annual"/><Evidence publisher="ONS" href={data.profiles.find(v=>v.id==="house-price-to-earnings-ratio")?.sourceUrl}>Median house prices divided by median gross annual workplace-based earnings. Source details are a disclosure, not a competing headline.</Evidence></div>
      </section>
      <section id="imprint" className={p.section}>
        <SectionHeading number="04" label="Imprint" title="A trace of the human hand." description="One motif per composition. Fine strokes and small glyphs recur in the margins, leaving the reading and plotting surfaces clear."/>
        <div className={p.imprints}><div className={p.penwork}><TerraceDrawing/><span className={s.eyebrow}>01 / Architectural penwork</span><p>A single ink, no opaque backdrop. A sector-specific drawing belongs to the surrounding composition.</p></div><div className={p.glyphs}><div aria-hidden="true">+ &nbsp; ↗ &nbsp; ⊙ &nbsp; ↳</div><span className={s.eyebrow}>02 / Small, purposeful marks</span><p>Registration, navigation, place, progression. Glyphs support a label; they never replace one.</p></div><div className={p.ascii}><pre aria-hidden="true">{'+ · · · · · · +\n·             ·\n·   + · · +   ·\n·   ·     ·   ·\n·   + · · +   ·\n·             ·\n+ · · · · · · +'}</pre><span className={s.eyebrow}>03 / ASCII marginalia</span><p>Small, static and sparse. No dense bands, flickering fields or textures behind a chart.</p></div></div>
      </section>
    </main>
  </div>;
}
