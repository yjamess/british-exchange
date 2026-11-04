"use client";

import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import Link from "next/link";
import { fmt, fmtT, type Pt } from "../data";
import { DitherField, ridgesField } from "../motion";
import { RankBars, TimeChart, type Cadence, type ChartSeries } from "../instrument/TimeChart";
import type { HousingV1, Source } from "./load";
import h from "./housing.module.css";

/* ——— helpers ——— */
const last = (p: Pt[]) => p[p.length - 1];
const at = (p: Pt[], t: number) => p.find((x) => Math.abs(x.t - t) < 1e-6);
const yearBefore = (p: Pt[], t: number, years = 1) => at(p, Math.round((t - years) * 12) / 12);
const since = (p: Pt[], years: number | null) => (years === null || !p.length ? p : p.filter((x) => x.t >= last(p)!.t - years));
const fmtDate = (iso: string, f: string) => (iso ? fmtT(Number(iso.slice(0, 4)) + (Number(iso.slice(5, 7)) - 1) / 12, f.startsWith("annual") ? "annual" : f === "quarterly" ? "quarterly" : "monthly") : "—");

const TOPICS = [
  { id: "prices", label: "Prices" },
  { id: "regions", label: "Regions" },
  { id: "rents", label: "Rents" },
  { id: "afford", label: "Affordability" },
  { id: "supply", label: "Supply" },
  { id: "stock", label: "Stock & tenure" },
] as const;
type TopicId = (typeof TOPICS)[number]["id"];

const RANGES = [
  { id: "all", label: "All years", years: null },
  { id: "20", label: "20 years", years: 20 },
  { id: "10", label: "10 years", years: 10 },
] as const;

/* ——— small parts ——— */
function Choice<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: readonly { id: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <div className={h.choice}>
      <span className="bo-label">{label}</span>
      <div role="group" aria-label={label} className={h.choiceRow}>
        {options.map((o) => (
          <button key={o.id} type="button" aria-pressed={value === o.id} onClick={() => onChange(o.id)}>
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function SourceLine({ src, note }: { src?: Source; note?: string }) {
  if (!src) return null;
  return (
    <div className={h.source}>
      <span>
        <b>Source</b> · {src.publisher}, {src.title} ({src.seriesId}). {src.geography}. {src.unit}.
      </span>
      <span>
        Coverage {fmtDate(src.first, src.frequency)} – {fmtDate(src.last, src.frequency)} · {src.count.toLocaleString("en-GB")} observations
        {src.provisional ? ` · ${src.provisional} provisional` : ""} · release {src.release || "—"}
      </span>
      {note && <span>{note}</span>}
      <span className={h.sourceLinks}>
        <a href={src.sourceUrl} target="_blank" rel="noreferrer">
          Official release ↗
        </a>
        <Link href={`/housing/data/${src.id}`}>Data profile · {src.id} →</Link>
      </span>
    </div>
  );
}

function Facts({ items }: { items: { label: string; value: string; note?: string }[] }) {
  return (
    <dl className={h.facts}>
      {items.map((f) => (
        <div key={f.label}>
          <dt className="bo-label">{f.label}</dt>
          <dd>
            <span className="bo-fig">{f.value}</span>
            {f.note && <small>{f.note}</small>}
          </dd>
        </div>
      ))}
    </dl>
  );
}

/* ——— hero: the one monumental piece — real regional prices as a dither field ——— */
function Hero({ ridges }: { ridges: HousingV1["ridges"] }) {
  const readout = useRef<HTMLSpanElement>(null);
  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    const mq = matchMedia("(max-width: 760px)");
    const on = () => setNarrow(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  const field = useMemo(
    () =>
      ridgesField(ridges.values, {
        periodsPerSecond: 12,
        hold: true,
        bounds: narrow ? { left: 0.04, right: 0.96, top: 0.17, bottom: 0.33 } : { left: 0.44, right: 0.97, top: 0.34, bottom: 0.9 },
        onPeriod: (k) => {
          const el = readout.current;
          const q = ridges.quarters[k];
          if (!el || !q) return;
          const label = `Q${Math.floor((Number(q.slice(5, 7)) - 1) / 3) + 1} ${q.slice(0, 4)}`;
          const a = ridges.values[0]?.[k];
          const b = ridges.values.at(-1)?.[k];
          const text = `${label} · ${ridges.names[0]} ${a ? fmt.gbp(a) : "—"} · ${ridges.names.at(-1)} ${b ? fmt.gbp(b) : "—"}`;
          if (el.textContent !== text) el.textContent = text;
        },
      }),
    [ridges, narrow],
  );
  return (
    <section className={`bo-on-ink ${h.hero}`} aria-labelledby="housing-title">
      <DitherField field={field} mark="dots" label={`Twelve ridges of average house prices by region, ${ridges.names[0]} at the back, ${ridges.names.at(-1)} at the front, drawn quarter by quarter since 1995`} />
      <div className={`bo-wrap ${h.heroInner}`}>
        <div className={`bo-panel ${h.heroPanel}`}>
          <span className="bo-label">Sector · Housing &amp; Land</span>
          <h1 id="housing-title" className="bo-d1">
            The places we live, the prices we pay
          </h1>
          <p>Prices, rents, affordability, new supply and who owns the nation&rsquo;s homes, from the official series, in one place.</p>
          <span className={`bo-label ${h.heroReadout}`} ref={readout} aria-hidden="true" />
          <span className={h.heroSource}>Field: UK HPI average price, 12 regions and nations, quarterly since 1995 · HM Land Registry / ONS</span>
        </div>
      </div>
    </section>
  );
}

/* ——— main ——— */
export function HousingExplorer({ data }: { data: HousingV1 }) {
  const [topic, setTopic] = useState<TopicId>("prices");
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    const read = () => {
      const id = window.location.hash.slice(1) as TopicId;
      if (TOPICS.some((t) => t.id === id)) setTopic(id);
    };
    read();
    window.addEventListener("hashchange", read);
    return () => window.removeEventListener("hashchange", read);
  }, []);
  const select = (id: TopicId) => {
    setTopic(id);
    history.replaceState(null, "", `#${id}`);
  };
  const onTabKey = (e: KeyboardEvent, i: number) => {
    const n = TOPICS.length;
    const j = e.key === "ArrowRight" ? (i + 1) % n : e.key === "ArrowLeft" ? (i - 1 + n) % n : e.key === "Home" ? 0 : e.key === "End" ? n - 1 : -1;
    if (j < 0) return;
    e.preventDefault();
    select(TOPICS[j]!.id);
    tabs.current[j]?.focus();
  };

  /* headline figures */
  const p = last(data.price);
  const pPrev = p && yearBefore(data.price, p.t);
  const rc = last(data.rentChange);
  const af = last(data.afford);
  const cy = last(data.completionsYear);
  const ty = data.tenure.years.length - 1;
  const metrics = [
    { label: "Average house price · UK", value: p ? fmt.gbp(p.v) : "—", note: p && pPrev ? `${fmt.pctSigned((p.v / pPrev.v - 1) * 100)} over the year` : "", period: p ? fmtT(p.t) : "", topic: "prices" as TopicId },
    { label: "Private rents · UK", value: rc ? fmt.pctSigned(rc.v) : "—", note: "annual change, calculated from the index", period: rc ? fmtT(rc.t) : "", topic: "rents" as TopicId },
    { label: "Price to earnings · England", value: af ? fmt.ratio(af.v) : "—", note: "median price ÷ median annual pay", period: af ? fmtT(af.t, "annual") : "", topic: "afford" as TopicId },
    { label: "New homes completed · England", value: cy ? fmt.count(cy.v) : "—", note: "last four quarters", period: cy ? `to ${fmtT(cy.t, "quarterly")}` : "", topic: "supply" as TopicId },
    {
      label: "Dwellings · England",
      value: ty >= 0 ? fmt.countCompact(data.tenure.total[ty]!) : "—",
      note: ty >= 0 ? `${((data.tenure.owner[ty]! / data.tenure.total[ty]!) * 100).toFixed(0)}% owner-occupied` : "",
      period: ty >= 0 ? `31 March ${data.tenure.years[ty]}` : "",
      topic: "stock" as TopicId,
    },
  ];

  return (
    <div className={h.page}>
      <header className={`bo-wrap ${h.mast}`}>
        <Link href="/" className={`bo-statement ${h.wordmark}`}>
          British Exchange
        </Link>
        <nav aria-label="Breadcrumb" className="bo-label">
          <span>Sectors</span> / <span aria-current="page">Housing &amp; Land</span>
        </nav>
      </header>

      <Hero ridges={data.ridges} />

      <section className={`bo-wrap ${h.metrics}`} aria-label="Headline figures">
        {metrics.map((m) => (
          <button key={m.label} type="button" className={h.metric} onClick={() => select(m.topic)}>
            <span className="bo-label">{m.label}</span>
            <span className={`bo-fig ${h.metricValue}`}>{m.value}</span>
            <span className={h.metricNote}>{m.note}</span>
            <span className={`bo-label ${h.metricPeriod}`}>{m.period}</span>
          </button>
        ))}
      </section>

      <nav className={`bo-on-union ${h.index}`} aria-label="Housing topics">
        <div className={`bo-wrap ${h.indexInner}`} role="tablist" aria-label="Housing topics">
          {TOPICS.map((t, i) => (
            <button
              key={t.id}
              ref={(el) => {
                tabs.current[i] = el;
              }}
              id={`tab-${t.id}`}
              role="tab"
              type="button"
              aria-selected={topic === t.id}
              aria-controls={`panel-${t.id}`}
              tabIndex={topic === t.id ? 0 : -1}
              className={`bo-caps ${h.tab}`}
              onClick={() => select(t.id)}
              onKeyDown={(e) => onTabKey(e, i)}
            >
              <span>{String(i + 1).padStart(2, "0")}</span> <b>{t.label}</b>
            </button>
          ))}
        </div>
      </nav>

      <section id={`panel-${topic}`} role="tabpanel" aria-labelledby={`tab-${topic}`} className={`bo-wrap ${h.panel}`}>
        {topic === "prices" && <Prices data={data} />}
        {topic === "regions" && <Regions data={data} />}
        {topic === "rents" && <Rents data={data} />}
        {topic === "afford" && <Afford data={data} />}
        {topic === "supply" && <Supply data={data} />}
        {topic === "stock" && <Stock data={data} />}
      </section>

      <Sources data={data} />
    </div>
  );
}

/* ——— topic layout ——— */
function Topic({
  n,
  kicker,
  question,
  lede,
  facts,
  controls,
  children,
}: {
  n: number;
  kicker: string;
  question: string;
  lede: string;
  facts: { label: string; value: string; note?: string }[];
  controls?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className={h.topic}>
      <aside className={h.aside}>
        <span className="bo-label">
          {String(n).padStart(2, "0")} · {kicker}
        </span>
        <h2 className="bo-d2">{question}</h2>
        <p className={h.lede}>{lede}</p>
        <Facts items={facts} />
        {controls}
      </aside>
      <div className={h.main}>{children}</div>
    </div>
  );
}

function useRange() {
  const [range, setRange] = useState<(typeof RANGES)[number]["id"]>("all");
  const years = RANGES.find((r) => r.id === range)!.years;
  const control = <Choice label="Range" value={range} options={RANGES} onChange={setRange} />;
  return { years, control };
}

/* ——— Prices ——— */
function Prices({ data }: { data: HousingV1 }) {
  const [m, setM] = useState<"avg" | "types" | "new" | "sales">("avg");
  const { years, control } = useRange();
  const p = last(data.price)!;
  const prev = yearBefore(data.price, p.t);
  const ten = yearBefore(data.price, p.t, 10);
  const latestOf = (pts: Pt[]) => (pts.length ? fmtT(last(pts)!.t) : "—");
  const cut = (lines: ChartSeries[]) => lines.map((l) => ({ ...l, points: since(l.points, years) }));
  const chart: { series: ChartSeries[]; kind: "line" | "bars"; format: (v: number) => string; axis: (v: number) => string; area?: boolean; label: string; note?: string; src: string } =
    m === "avg"
      ? { series: cut([{ id: "uk", label: "UK average", points: data.price }]), kind: "line", format: fmt.gbp, axis: fmt.gbpCompact, area: true, label: "UK average house price, monthly", src: "uk-average-house-price" }
      : m === "types"
        ? { series: cut(data.types), kind: "line", format: fmt.gbp, axis: fmt.gbpCompact, label: "UK average price by property type, monthly", src: "uk-hpi-measures" }
        : m === "new"
          ? { series: cut(data.newExisting), kind: "line", format: fmt.gbp, axis: fmt.gbpCompact, label: "UK average price, new build versus existing homes, monthly", src: "uk-hpi-measures", note: `New-build and existing prices lag the headline: latest published month ${latestOf(data.newExisting[0]!.points)}.` }
          : { series: cut([{ id: "sales", label: "Sales", points: data.sales }]), kind: "bars", format: fmt.count, axis: fmt.countCompact, label: "UK residential sales volume, monthly", src: "uk-hpi-measures", note: `Sales volumes lag the headline: latest published month ${latestOf(data.sales)}. Dotted bars are provisional.` };
  return (
    <Topic
      n={1}
      kicker="Prices"
      question="What does a home cost in the UK?"
      lede="The UK House Price Index average, by property type, new against existing homes, and how many homes change hands each month."
      facts={[
        { label: `Average price · ${fmtT(p.t)}`, value: fmt.gbp(p.v) },
        { label: "Change over the year", value: prev ? fmt.pctSigned((p.v / prev.v - 1) * 100) : "—", note: prev ? `from ${fmt.gbp(prev.v)}` : undefined },
        { label: "Ten years earlier", value: ten ? fmt.gbp(ten.v) : "—", note: ten ? fmtT(ten.t) : undefined },
      ]}
      controls={
        <>
          <Choice label="Measure" value={m} onChange={setM} options={[{ id: "avg", label: "Average" }, { id: "types", label: "By type" }, { id: "new", label: "New vs existing" }, { id: "sales", label: "Sales" }]} />
          {control}
        </>
      }
    >
      <TimeChart key={`${m}-${years}`} series={chart.series} kind={chart.kind} cadence="monthly" format={chart.format} axisFormat={chart.axis} area={chart.area} zero={chart.kind === "bars"} label={chart.label} />
      <SourceLine src={data.sources[chart.src]} note={chart.note} />
    </Topic>
  );
}

/* ——— Regions ——— */
function Regions({ data }: { data: HousingV1 }) {
  const [m, setM] = useState<"rank" | "time" | "index">("rank");
  const [code, setCode] = useState(data.regions[0]?.code ?? "");
  const region = data.regions.find((r) => r.code === code) ?? data.regions[0]!;
  const uk = last(data.ukRegional);
  const latest = data.regions.map((r) => ({ r, p: last(r.points)! })).filter((x) => x.p);
  const hi = latest[0];
  const lo = latest[latest.length - 1];
  const growth = latest.map((x) => ({ name: x.r.name, g: x.p.v / (x.r.points[0]?.v ?? x.p.v) })).sort((a, b) => b.g - a.g);
  const rebase = (pts: Pt[]) => (pts.length ? pts.map((q) => ({ ...q, v: (q.v / pts[0]!.v) * 100 })) : pts);
  const lines: ChartSeries[] =
    m === "index"
      ? [
          { id: region.code, label: region.name, points: rebase(region.points) },
          { id: "uk", label: "United Kingdom", points: rebase(data.ukRegional) },
        ]
      : [
          { id: region.code, label: region.name, points: region.points },
          { id: "uk", label: "United Kingdom", points: data.ukRegional },
        ];
  return (
    <Topic
      n={2}
      kicker="Regions"
      question="How far apart are prices across the UK?"
      lede="Average price in every English region and UK nation, monthly since January 1995, against the UK as a whole."
      facts={[
        { label: `Highest · ${hi ? fmtT(hi.p.t) : ""}`, value: hi ? fmt.gbp(hi.p.v) : "—", note: hi?.r.name },
        { label: "Lowest", value: lo ? fmt.gbp(lo.p.v) : "—", note: lo?.r.name },
        { label: "Fastest growth since Jan 1995", value: growth[0] ? `${growth[0].g.toFixed(1)}×` : "—", note: growth[0] ? `${growth[0].name}; slowest ${growth.at(-1)!.name} ${growth.at(-1)!.g.toFixed(1)}×` : undefined },
      ]}
      controls={
        <>
          <Choice label="View" value={m} onChange={setM} options={[{ id: "rank", label: "Ranked, latest" }, { id: "time", label: "Over time" }, { id: "index", label: "Growth, 1995 = 100" }]} />
          {m !== "rank" && (
            <label className={h.select}>
              <span className="bo-label">Place</span>
              <select value={code} onChange={(e) => setCode(e.target.value)}>
                {data.regions.map((r) => (
                  <option key={r.code} value={r.code}>
                    {r.name}
                  </option>
                ))}
              </select>
            </label>
          )}
        </>
      }
    >
      {m === "rank" ? (
        <RankBars
          label="Average house price by region and nation, latest month"
          rows={latest.map((x) => ({ id: x.r.code, label: x.r.name, v: x.p.v }))}
          reference={uk ? { label: "United Kingdom", v: uk.v } : undefined}
          format={fmt.gbpCompact}
        />
      ) : (
        <TimeChart
          key={`${m}-${code}`}
          series={lines}
          cadence="monthly"
          format={m === "index" ? (v) => v.toFixed(0) : fmt.gbp}
          axisFormat={m === "index" ? (v) => v.toFixed(0) : fmt.gbpCompact}
          label={m === "index" ? `${region.name} and UK average price, rebased to January 1995 = 100` : `${region.name} and UK average house price, monthly`}
        />
      )}
      <SourceLine src={data.sources["house-prices-by-region"]} note={m === "index" ? "Rebased by the Exchange: each line divided by its January 1995 value." : undefined} />
    </Topic>
  );
}

/* ——— Rents ——— */
function Rents({ data }: { data: HousingV1 }) {
  const [m, setM] = useState<"change" | "index">("change");
  const rc = last(data.rentChange);
  const ri = last(data.rentIndex);
  const peak = data.rentChange.reduce<Pt | undefined>((a, b) => (!a || b.v > a.v ? b : a), undefined);
  return (
    <Topic
      n={3}
      kicker="Rents"
      question="How fast are private rents rising?"
      lede="The ONS index of private rents paid across the UK, and the annual change calculated from it."
      facts={[
        { label: `Annual change · ${rc ? fmtT(rc.t) : ""}`, value: rc ? fmt.pctSigned(rc.v) : "—", note: "calculated from the index" },
        { label: "Index level", value: ri ? ri.v.toFixed(1) : "—", note: "January 2023 = 100" },
        { label: "Fastest annual rise", value: peak ? fmt.pctSigned(peak.v) : "—", note: peak ? fmtT(peak.t) : undefined },
      ]}
      controls={<Choice label="Measure" value={m} onChange={setM} options={[{ id: "change", label: "Annual change" }, { id: "index", label: "Index" }]} />}
    >
      <TimeChart
        key={m}
        series={[m === "change" ? { id: "chg", label: "Annual change", points: data.rentChange } : { id: "idx", label: "Index", points: data.rentIndex }]}
        cadence="monthly"
        format={m === "change" ? fmt.pctSigned : (v) => v.toFixed(1)}
        axisFormat={m === "change" ? (v) => `${v.toFixed(0)}%` : (v) => v.toFixed(0)}
        zero={m === "change"}
        area={m === "index"}
        label={m === "change" ? "Annual change in UK private rents, calculated from the index" : "UK private rental price index, January 2023 = 100"}
      />
      <SourceLine src={data.sources["private-rental-price-index"]} note={m === "change" ? "Annual change calculated by the Exchange from the published index (same month a year earlier)." : undefined} />
    </Topic>
  );
}

/* ——— Affordability ——— */
function Afford({ data }: { data: HousingV1 }) {
  const a = last(data.afford);
  const f = data.afford[0];
  const peak = data.afford.reduce<Pt | undefined>((x, y) => (!x || y.v > x.v ? y : x), undefined);
  return (
    <Topic
      n={4}
      kicker="Affordability"
      question="How many years of pay does a home cost?"
      lede="Median house price divided by median annual earnings of people who work in England, every year since 1997."
      facts={[
        { label: `England · ${a ? fmtT(a.t, "annual") : ""}`, value: a ? fmt.ratio(a.v) : "—" },
        { label: `In ${f ? fmtT(f.t, "annual") : ""}`, value: f ? fmt.ratio(f.v) : "—" },
        { label: "Least affordable year", value: peak ? fmt.ratio(peak.v) : "—", note: peak ? fmtT(peak.t, "annual") : undefined },
      ]}
    >
      <TimeChart series={[{ id: "eng", label: "England", points: data.afford }]} cadence="annual" format={(v) => `${v.toFixed(2)}×`} axisFormat={(v) => `${v.toFixed(0)}×`} zero area marks label="House price to workplace-based earnings ratio, England, annual" />
      <SourceLine src={data.sources["house-price-to-earnings-ratio"]} note="England only; Wales is published separately. Workplace-based median earnings." />
    </Topic>
  );
}

/* ——— Supply ——— */
function Supply({ data }: { data: HousingV1 }) {
  const [m, setM] = useState<"quarter" | "year">("year");
  const { years, control } = useRange();
  const cy = last(data.completionsYear);
  const hi = data.completionsYear.reduce<Pt | undefined>((a, b) => (!a || b.v > a.v ? b : a), undefined);
  const lo = data.completionsYear.reduce<Pt | undefined>((a, b) => (!a || b.v < a.v ? b : a), undefined);
  return (
    <Topic
      n={5}
      kicker="Supply"
      question="How many new homes are being finished?"
      lede="Permanent dwellings completed in England each quarter since 1978, and the total over each rolling year."
      facts={[
        { label: `Last four quarters · to ${cy ? fmtT(cy.t, "quarterly") : ""}`, value: cy ? fmt.count(cy.v) : "—" },
        { label: "Highest rolling year", value: hi ? fmt.count(hi.v) : "—", note: hi ? `to ${fmtT(hi.t, "quarterly")}` : undefined },
        { label: "Lowest rolling year", value: lo ? fmt.count(lo.v) : "—", note: lo ? `to ${fmtT(lo.t, "quarterly")}` : undefined },
      ]}
      controls={
        <>
          <Choice label="Measure" value={m} onChange={setM} options={[{ id: "year", label: "Rolling year" }, { id: "quarter", label: "Each quarter" }]} />
          {control}
        </>
      }
    >
      <TimeChart
        key={`${m}-${years}`}
        series={[m === "year" ? { id: "ry", label: "Rolling year", points: since(data.completionsYear, years) } : { id: "q", label: "Quarter", points: since(data.completions, years) }]}
        kind={m === "year" ? "line" : "bars"}
        cadence="quarterly"
        format={fmt.count}
        axisFormat={fmt.countCompact}
        zero
        area={m === "year"}
        label={m === "year" ? "New homes completed in England, rolling four-quarter total" : "New homes completed in England, each quarter"}
      />
      <SourceLine src={data.sources["housing-completions"]} note={m === "year" ? "Rolling year calculated by the Exchange as the sum of four consecutive quarters." : undefined} />
    </Topic>
  );
}

/* ——— Stock & tenure ——— */
function Stock({ data }: { data: HousingV1 }) {
  const [m, setM] = useState<"share" | "count" | "long">("share");
  const T = data.tenure;
  const n = T.years.length - 1;
  const pts = (arr: number[]) => T.years.map((y, i) => ({ t: y, v: arr[i]! }));
  const lines: ChartSeries[] = [
    { id: "owner", label: "Owner-occupied", points: pts(T.owner) },
    { id: "pr", label: "Private rented", points: pts(T.privateRented) },
    { id: "social", label: "Social rented", points: pts(T.social) },
  ];
  const share = (arr: number[], i: number) => (arr[i]! / (T.owner[i]! + T.privateRented[i]! + T.social[i]!)) * 100;
  const cadence: Cadence = "annual";
  return (
    <Topic
      n={6}
      kicker="Stock & tenure"
      question="Who owns England's homes?"
      lede="Every dwelling in England on 31 March, split into owner-occupied, private rented and social rented, with the long record back to 1801."
      facts={[
        { label: `Dwellings · 31 March ${T.years[n] ?? ""}`, value: n >= 0 ? fmt.count(T.total[n]!) : "—" },
        { label: "Private rented share", value: n >= 0 ? fmt.pct(share(T.privateRented, n)) : "—", note: n >= 0 ? `${fmt.pct(share(T.privateRented, 0))} in ${T.years[0]}` : undefined },
        { label: "Social rented share", value: n >= 0 ? fmt.pct(share(T.social, n)) : "—", note: n >= 0 ? `${fmt.pct(share(T.social, 0))} in ${T.years[0]}` : undefined },
      ]}
      controls={<Choice label="View" value={m} onChange={setM} options={[{ id: "share", label: "Share" }, { id: "count", label: "Dwellings" }, { id: "long", label: "Since 1801" }]} />}
    >
      {m === "share" && <TimeChart key="share" series={lines} kind="stack" cadence={cadence} format={fmt.count} axisFormat={(v) => `${Math.round(v * 100)}%`} label={`Dwelling stock by tenure, England, shares, ${T.years[0]}–${T.years[n]}`} />}
      {m === "count" && <TimeChart key="count" series={lines} cadence={cadence} format={fmt.count} axisFormat={fmt.countCompact} zero label={`Dwelling stock by tenure, England, ${T.years[0]}–${T.years[n]}`} />}
      {m === "long" && (
        <TimeChart
          key="long"
          series={[{ id: "all", label: "All dwellings", points: data.allDwellings }]}
          cadence="annual"
          format={fmt.count}
          axisFormat={fmt.countCompact}
          zero
          marks
          gaps="dashed"
          label="All dwellings in England, 1801 to latest; dots are observations, dashed lines span years with no observation"
        />
      )}
      <SourceLine
        src={data.sources["dwelling-stock-by-tenure"]}
        note={m === "long" ? "Dots are published observations; dashed lines join years with no observation and are not data." : "Social rented = local authority + private registered provider + other public sector. 31 March snapshots."}
      />
    </Topic>
  );
}

/* ——— Sources ——— */
function Sources({ data }: { data: HousingV1 }) {
  const list = Object.values(data.sources);
  return (
    <section className={`bo-wrap ${h.sources}`} aria-labelledby="sources-title">
      <span className="bo-label">Method</span>
      <h2 id="sources-title" className="bo-d3">
        Every number on this page, and where it comes from
      </h2>
      <div className={h.sourceList}>
        {list.map((s) => (
          <div key={s.id} className={h.sourceItem}>
            <b>{s.title}</b>
            <span>
              {s.publisher} · {s.geography} · {s.frequency}
            </span>
            <span className="bo-label">
              {fmtDate(s.first, s.frequency)} – {fmtDate(s.last, s.frequency)} · {s.count.toLocaleString("en-GB")} obs
            </span>
            <span className={h.sourceLinks}>
              <a href={s.sourceUrl} target="_blank" rel="noreferrer">
                Official ↗
              </a>
              <Link href={`/housing/data/${s.id}`}>Profile →</Link>
            </span>
          </div>
        ))}
      </div>
      <p className={h.method}>Calculated by the Exchange, and labelled where shown: rent annual change, rolling-year completions, regional growth rebased to January 1995, tenure shares. Provisional observations are drawn dotted; gaps are never filled.</p>
    </section>
  );
}
