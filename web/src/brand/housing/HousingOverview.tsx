"use client";

import { useEffect, useId, useState } from "react";
import Link from "next/link";
import { changePct, fmt, fmtT, type Pt, type Series } from "../data";
import { Choice, Evidence, MetricStrip, SectionHeading, type Metric } from "../sector/components";
import { TrendChart } from "../sector/TrendChart";
import { EngravedFigure, EngravedRibbon } from "../sector/Penwork";
import type { HousingData } from "./load";
import s from "../sector/sector.module.css";
import h from "./housing.module.css";

const TOPICS = [
  { id: "overview", label: "Overview" },
  { id: "cost", label: "House prices" },
  { id: "rent", label: "Renting" },
  { id: "afford", label: "Affordability" },
  { id: "build", label: "Housing supply" },
] as const;
type Topic = typeof TOPICS[number]["id"];
const UK = "K02000001";
const last = (points: Pt[]) => points[points.length - 1];
const one = (id: string, label: string, points: Pt[]): Series[] => [{id,label,points}];
const changeText = (value: number | null) => value === null ? "Annual change unavailable" : `${fmt.pctSigned(value)} over the year`;

/** Architectural penwork is decoration, deliberately separate from measured marks. */
export function TerraceDrawing() {
  const id = useId().replace(/:/g, "");
  return <svg viewBox="0 0 440 210" fill="none" aria-hidden="true">
    <defs><pattern id={`hatch-${id}`} width="5" height="5" patternUnits="userSpaceOnUse"><path d="M0 5 5 0" stroke="currentColor" strokeWidth=".45"/></pattern><linearGradient id={`fade-${id}`}><stop stopColor="white" stopOpacity=".25"/><stop offset=".35" stopColor="white"/><stop offset=".8" stopColor="white"/><stop offset="1" stopColor="white" stopOpacity=".1"/></linearGradient><mask id={`mask-${id}`}><rect width="440" height="210" fill={`url(#fade-${id})`}/></mask></defs>
    <g mask={`url(#mask-${id})`} stroke="currentColor" strokeWidth=".8">
      <path d="M5 179H435M15 184H425M25 190H415"/>
      {[35,125,215,305].map((x,i) => <g key={x}>
        <path d={`M${x} 177V80L${x+13} 49H${x+79}L${x+90} 80V177M${x-3} 80H${x+93}M${x-3} 84H${x+93}M${x} 126H${x+90}M${x} 130H${x+90}`}/>
        <path d={`M${x+13} 49H${x+79}L${x+90} 78H${x}Z`} fill={`url(#hatch-${id})`}/>
        <path d={`M${x+62} 49V29H${x+76}V49M${x+60} 29V25H${x+78}V29ZM${x+65} 25V18H${x+69}V25M${x+72} 25V18H${x+76}V25`}/>
        {[x+12,x+52].map(wx => <g key={wx}><rect x={wx} y="94" width="22" height="24"/><path d={`M${wx+11} 94V118M${wx} 106H${wx+22}M${wx-2} 120H${wx+24}`}/></g>)}
        <rect x={x+12} y="140" width="22" height="25"/><path d={`M${x+23} 140V165M${x+12} 152H${x+34}M${x+10} 168H${x+36}`}/>
        <path d={`M${x+53} 177V147a11 11 0 0 1 22 0V177M${x+53} 148H${x+75}M${x+57} 153H${x+71}V174H${x+57}ZM${x+50} 177H${x+78}`}/>
        {[88,124,134,171].map(y => <path key={y} d={`M${x+3} ${y}H${x+87}`} opacity=".35"/>)}
        <text x={x+39} y="204" fill="currentColor" stroke="none" fontSize="7" fontFamily="monospace">0{i+1}</text>
      </g>)}
      <path d="M18 70V177M13 70H23M13 177H23M35 9H395M35 5V13M395 5V13" strokeDasharray="2 3" opacity=".5"/>
    </g>
  </svg>;
}

export function HousingOverview({ data }: { data: HousingData }) {
  const [topic, setTopic] = useState<Topic>("overview");
  const [priceView, setPriceView] = useState<"average" | "type" | "new">("average");
  const [supplyView, setSupplyView] = useState<"completions" | "tenure">("completions");
  const [rentView, setRentView] = useState<"change" | "index">("change");
  const [range, setRange] = useState<"all" | "ten">("all");
  const places = data.regions.filter(r => r.code !== UK && r.code !== "E92000001" && r.points.length);
  const [place, setPlace] = useState(places.find(r => r.name === "London")?.code ?? places[0]?.code ?? "");
  const [comparison, setComparison] = useState<"price" | "growth">("price");
  useEffect(() => {
    const read = () => {
      const hash = window.location.hash.slice(1);
      if (TOPICS.some(t => t.id === hash)) setTopic(hash as Topic);
      if (hash.startsWith("place-")) {
        const code = hash.slice(6);
        if (data.regions.some(r => r.code === code)) { setPlace(code); setTopic("overview"); }
      }
    };
    read(); window.addEventListener("hashchange",read);
    return () => window.removeEventListener("hashchange",read);
  },[data.regions]);
  const chooseTopic = (id: string, scroll = false) => {
    setTopic(id as Topic); setRange("all");
    window.history.replaceState(null,"",`#${id}`);
    if (scroll) document.getElementById("sector-topics")?.scrollIntoView({block:"start",behavior:window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth"});
  };
  const price = last(data.price), afford = last(data.afford), firstAfford = data.afford[0], rent = last(data.rent);
  const rentChange = changePct(data.rent,12);
  const quarters = data.completions.slice(-4);
  const completions = quarters.length === 4 ? quarters.reduce((a,p) => a+p.v,0) : null;
  const metrics: Metric[] = [
    {id:"cost", label:"Average house price", value:price ? fmt.gbp(price.v) : "—", context:changeText(changePct(data.price,12)), scope:`UK · ${price ? fmtT(price.t) : "Unavailable"}`},
    {id:"rent", label:"Annual rent increase", value:rentChange !== null ? fmt.pctSigned(rentChange) : "—", context:"Change in the private rent index", scope:`UK · ${rent ? fmtT(rent.t) : "Unavailable"}`},
    {id:"afford",label:"Price to earnings", value:afford ? fmt.ratio(afford.v) : "—",context:"Median price / annual earnings",scope:`England · ${afford ? fmtT(afford.t,"annual") : "Unavailable"}`},
    {id:"build",label:"New homes completed",value:completions === null ? "—" : fmt.count(completions),context:"Total over the last four quarters",scope:`England · to ${last(quarters) ? fmtT(last(quarters)!.t,"quarterly") : "Unavailable"}`},
  ];
  const annualRent = data.rent.flatMap(p => {
    const previous = data.rent.find(q => Math.abs(q.t-(p.t-1)) < 1/48);
    return previous && previous.v ? [{...p,v:(p.v/previous.v-1)*100,provisional:p.provisional || previous.provisional}] : [];
  });
  let series: Series[] = one("afford","England",data.afford);
  let format = fmt.ratio, tickFormat = fmt.ratio;
  let cadence: "annual" | "monthly" | "quarterly" = "annual";
  let title = "A home, measured in years of pay.";
  let label = "The affordability picture";
  let description = "How the price of a home compares with annual earnings in England.";
  let stat = afford ? fmt.ratio(afford.v) : "—";
  let statLabel = `Median annual earnings · ${afford ? Math.floor(afford.t) : "Unavailable"}`;
  let note = "The median house price divided by median gross annual workplace-based earnings. This is a price-to-income measure, not the time it takes to save for a home.";
  let sourceId = "house-price-to-earnings-ratio";
  let scope = "England";
  let bars = false;
  if (topic === "cost") {
    title="What does a home cost?"; label="House prices"; description="Follow the national picture, or compare different kinds of home.";
    series = priceView === "average" ? one("average","United Kingdom",data.price) : priceView === "type" ? data.types : data.newVsExisting;
    format=fmt.gbp; tickFormat=fmt.gbpCompact; cadence="monthly"; stat=price ? fmt.gbp(price.v) : "—";
    statLabel=`UK average · ${price ? fmtT(price.t) : "Unavailable"}`;
    note="UK House Price Index average prices. These are nominal prices, without adjustment for inflation. Provisional observations are shown with broken lines.";
    sourceId=priceView === "average" ? "uk-average-house-price" : "uk-hpi-measures"; scope="United Kingdom";
  } else if (topic === "rent") {
    title="The changing cost of renting."; label="Private rents"; description="See how private rental prices have moved across the United Kingdom.";
    series=one("rent","United Kingdom",rentView === "change" ? annualRent : data.rent);
    format=rentView === "change" ? fmt.pct : (v:number) => v.toFixed(1); tickFormat=format; cadence="monthly";
    stat=rentChange === null ? "—" : fmt.pctSigned(rentChange); statLabel=`Annual change · ${rent ? fmtT(rent.t) : "Unavailable"}`;
    note="ONS private rental price index, January 2023 = 100. Annual change compares each month with the same month a year earlier. The index measures price change, not an average monthly rent in pounds.";
    sourceId="private-rental-price-index"; scope="United Kingdom";
  } else if (topic === "build") {
    title=supplyView === "completions" ? "The homes we’re adding." : "Who owns the housing stock?";
    label="Housing supply"; description=supplyView === "completions" ? "New homes completed in England, quarter by quarter." : "How England’s dwelling stock is divided between ownership and rental tenures.";
    series=supplyView === "completions" ? one("completions","England",data.completions) : [
      {id:"owner",label:"Owner-occupied",points:data.tenure.years.map((t,i)=>({t,v:data.tenure.owner[i]!*100}))},
      {id:"private",label:"Private rented",points:data.tenure.years.map((t,i)=>({t,v:data.tenure.privateRented[i]!*100}))},
      {id:"social",label:"Social rented",points:data.tenure.years.map((t,i)=>({t,v:data.tenure.social[i]!*100}))},
    ];
    format=supplyView === "completions" ? fmt.count : fmt.pct; tickFormat=supplyView === "completions" ? fmt.countCompact : fmt.pct;
    cadence=supplyView === "completions" ? "quarterly" : "annual"; bars=supplyView === "completions";
    stat=supplyView === "completions" ? completions === null ? "—" : fmt.count(completions) : data.tenure.owner.length ? fmt.pct(data.tenure.owner[data.tenure.owner.length-1]!*100) : "—";
    statLabel=supplyView === "completions" ? "Completions · last four quarters" : `Owner-occupied · ${data.tenure.years[data.tenure.years.length-1] ?? "Unavailable"}`;
    note=supplyView === "completions" ? "New-build dwelling completions in England. This measure excludes other additions such as conversions and changes of use, so it is not total net housing supply." : "Shares of dwellings, not households. Annual snapshots at 31 March. Social renting combines local authorities, private registered providers and other public-sector dwellings.";
    sourceId=supplyView === "completions" ? "housing-completions" : "dwelling-stock-by-tenure";
  }
  const available = series.filter(x => x.points.length);
  const finalYear = Math.max(...available.flatMap(x=>x.points.map(p=>p.t)));
  const chartSeries = available.map(x=>({...x,points:range === "ten" ? x.points.filter(p=>p.t>=finalYear-10) : x.points}));
  const profile = data.profiles.find(p=>p.id===sourceId);
  const selectedPlace = places.find(p=>p.code===place) ?? places[0];
  const uk = data.regions.find(p=>p.code===UK);
  const placeLast = selectedPlace && last(selectedPlace.points);
  const comparisonSeries: Series[] = [
    ...(selectedPlace ? [{id:selectedPlace.code,label:selectedPlace.name,points:selectedPlace.points}] : []),
    ...(uk ? [{id:uk.code,label:"United Kingdom",points:uk.points}] : []),
  ].map(x=>({...x,points:comparison === "growth" ? x.points.map(p=>({...p,v:p.v/x.points[0]!.v*100})) : x.points}));
  const regionalProfile=data.profiles.find(p=>p.id==="house-prices-by-region");

  return <div className={s.shell}>
    <a href="#sector-topics" className={h.skip}>Skip to housing topics</a>
    <header className={h.mast}><div className={`${s.wrap} ${h.mastInner}`}><Link href="/" className={h.wordmark}><span className={h.mark} aria-hidden="true">✳</span>British Exchange<span className={h.wordmarkDot}>.</span></Link><span className={h.mastLabel}>A public record of Britain</span><Link href="/design-lab/system" className={h.systemLink}>Design index <span aria-hidden="true">↗</span></Link></div></header>
    <main className={s.wrap}>
      <div className={h.cover}>
        <section className={h.intro} aria-labelledby="housing-title">
          <div className={h.introCopy}><div className={s.eyebrow}><span className={h.orange}>I /</span> The housing issue</div><h1 id="housing-title" aria-label="Housing & Land">Housing<br/><span className={h.amp}>&</span> <em>Land.</em></h1><div className={h.introBottom}><p>The places we live.<br/>The prices we pay.</p><a href="#sector-topics" className={h.readLink}>Open the record <span aria-hidden="true">↓</span></a></div></div>
          <div className={h.threshold} aria-hidden="true">
            <div className={h.drawing}><TerraceDrawing /><span>Imprint · architectural penwork</span></div>
            <EngravedFigure values={data.afford.map(p=>p.v)} value={afford ? fmt.ratio(afford.v) : "—"} period={afford ? String(Math.floor(afford.t)) : "Unavailable"}/>
          </div>
        </section>
        <div className={h.coverRule}><span>THE SECTOR, AT A GLANCE</span><span aria-hidden="true">+ ───────────── +</span><span>INSTRUMENT · LATEST READY FIGURES</span></div>
        <MetricStrip metrics={metrics} selected={topic} onSelect={id=>chooseTopic(id,true)}/>
        <EngravedRibbon className={h.coverRibbon}/>
      </div>
      <nav id="sector-topics" className={h.topics} aria-label="Housing topics"><div role="tablist" aria-label="Explore housing">{TOPICS.map((t,index)=><button key={t.id} id={`tab-${t.id}`} role="tab" aria-selected={topic===t.id} aria-controls="topic-panel" tabIndex={topic===t.id?0:-1} onClick={()=>chooseTopic(t.id)} onKeyDown={e=>{
        let next=index;
        if(e.key==="ArrowRight") next=(index+1)%TOPICS.length;
        else if(e.key==="ArrowLeft") next=(index+TOPICS.length-1)%TOPICS.length;
        else if(e.key==="Home") next=0;
        else if(e.key==="End") next=TOPICS.length-1;
        else return;
        e.preventDefault(); chooseTopic(TOPICS[next]!.id); document.getElementById(`tab-${TOPICS[next]!.id}`)?.focus();
      }}><span className={h.tabNumber}>{String(index).padStart(2,"0")}</span>{t.label}</button>)}</div><span className={h.topicHint}>The housing record / I</span></nav>
      <section id="topic-panel" role="tabpanel" aria-labelledby={`tab-${topic}`} className={h.topicPanel}>
        <SectionHeading number="01" label={label} title={title} description={description}><span className={h.scope}><span aria-hidden="true">⊙</span> {scope}</span></SectionHeading>
        <div className={h.feature}>
          <aside className={h.story}><span className={s.eyebrow}>In focus</span><div className={h.bigStat}>{stat}</div><p className={h.statLabel}>{statLabel}</p>
            {(topic === "overview" || topic === "afford") && firstAfford && afford ? <><div className={h.thenNow}><div><span>{Math.floor(firstAfford.t)}</span><strong>{fmt.ratio(firstAfford.v)}</strong></div><span aria-hidden="true">⟶</span><div><span>{Math.floor(afford.t)}</span><strong>{fmt.ratio(afford.v)}</strong></div></div><p className={h.storyText}>The price-to-earnings ratio is {fmt.ratio(afford.v/firstAfford.v)} its {Math.floor(firstAfford.t)} level.</p></> : <p className={h.storyText}>{topic === "cost" ? "A national average is a starting point. Property type and location tell a more detailed story." : topic === "rent" ? "Switch between the annual pace of change and the longer-run rental price index." : "The amount we build and the homes already in use describe different parts of the housing picture."}</p>}
            {/* Imprint stays in the margin — never inside the plot */}
            <div className={h.marginMark} aria-hidden="true"><span>H / L · margin imprint</span></div>
          </aside>
          <div className={h.plot}>
            <div className={h.plotControls}><div>
              {topic === "cost" ? <Choice label="Price measure" value={priceView} onChange={setPriceView} options={[{id:"average",label:"Average"},{id:"type",label:"Property type"},{id:"new",label:"New / existing"}]}/> : topic === "rent" ? <Choice label="Rental measure" value={rentView} onChange={setRentView} options={[{id:"change",label:"Annual change"},{id:"index",label:"Price index"}]}/> : topic === "build" ? <Choice label="Supply measure" value={supplyView} onChange={setSupplyView} options={[{id:"completions",label:"New homes"},{id:"tenure",label:"Tenure"}]}/> : <span className={s.eyebrow}>House price / annual earnings</span>}
              </div><Choice label="Time range" value={range} onChange={setRange} options={[{id:"all",label:"All years"},{id:"ten",label:"10 years"}]}/></div>
            <TrendChart key={`${topic}-${priceView}-${rentView}-${supplyView}-${range}`} series={chartSeries} label={title} format={format} tickFormat={tickFormat} cadence={cadence} bars={bars} zero={bars || (topic === "build" && supplyView === "tenure")}/>
            <Evidence publisher={profile?.publisher ?? "Source unavailable"} href={profile?.sourceUrl}>{note}</Evidence>
          </div>
        </div>
      </section>
      {(topic === "overview" || topic === "cost") && selectedPlace && <section className={h.regional} id="explore"><EngravedRibbon className={h.regionalRibbon}/>
        <SectionHeading number="02" label="The geography of prices" title="Same country. Different price." description="Compare a nation or English region with the UK, from 1995 onwards."><Choice label="Regional comparison" value={comparison} onChange={setComparison} options={[{id:"price",label:"Average price"},{id:"growth",label:"Growth since 1995"}]}/></SectionHeading>
        <div className={h.placeGrid}><div className={h.placeSummary}><label htmlFor="housing-place" className={s.eyebrow}>Choose a place</label><select id="housing-place" value={selectedPlace.code} onChange={e=>setPlace(e.target.value)}>{places.map(p=><option key={p.code} value={p.code}>{p.name}</option>)}</select><div className={h.placeValue}>{placeLast ? fmt.gbp(placeLast.v) : "—"}</div><p>Average house price<br/>{placeLast ? fmtT(placeLast.t) : "Unavailable"}{placeLast?.provisional ? " · provisional" : ""}</p><div className={h.placeChange}><span>Annual change</span><strong>{changePct(selectedPlace.points,12) === null ? "—" : fmt.pctSigned(changePct(selectedPlace.points,12)!)}</strong></div><span className={h.placeNote}>UK HPI · Nominal prices<br/>Nations &amp; English regions</span></div>
        <div className={h.placeChart}><span className={`${s.eyebrow} ${h.chartKicker}`}>{comparison === "price" ? "Average price · GBP" : "Price index · first observation in 1995 = 100"}</span><TrendChart key={`${place}-${comparison}`} series={comparisonSeries} label={`${selectedPlace.name} and United Kingdom house prices`} format={comparison === "price" ? fmt.gbp : v=>v.toFixed(1)} tickFormat={comparison === "price" ? fmt.gbpCompact : v=>v.toFixed(0)}/><Evidence publisher={regionalProfile?.publisher ?? "HM Land Registry / ONS"} href={regionalProfile?.sourceUrl}>Average prices are mix-adjusted estimates, not individual property valuations. Growth is rebased to each series’ first observation in 1995. Broken lines indicate provisional observations.</Evidence></div></div>
      </section>}
      <div className={h.endnote}><span className={s.eyebrow}>British Exchange / Housing & Land</span><span>Explore the question. Follow the record.</span></div>
    </main>
  </div>;
}
