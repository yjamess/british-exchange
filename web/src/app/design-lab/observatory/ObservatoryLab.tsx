"use client";

import type { CSSProperties } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { AsciiField } from "../imprint/AsciiField";
import { Halftone } from "../imprint/Halftone";
import { Stamp } from "../imprint/Stamp";
import type { SourceId } from "../imprint/lib/sources";
import { EngravedPlate } from "./EngravedPlate";
import { Frontier } from "./Frontier";
import { Guilloche } from "./Guilloche";
import type { Figure, Point, SeriesRecord } from "./lib/record";
import s from "./observatory.module.css";

export type ObservatoryData = {
  catalogue: SeriesRecord[];
  gdp: SeriesRecord | null;
  unemployment: SeriesRecord | null;
  manufacturing: SeriesRecord | null;
  coal: SeriesRecord | null;
  housing: SeriesRecord | null;
  figures: Figure[];
};

/* ——— One ink, one paper. Every surface is a duotone of the pair. ——— */
const INKS = {
  ultramarine: { name: "Ultramarine", ink: "#1b23cf", deep: "#0a0f6e", paper: "#f0ede5" },
  admiralty: { name: "Admiralty", ink: "#0d1258", deep: "#05072a", paper: "#efebe1" },
  oxblood: { name: "Oxblood", ink: "#6c1322", deep: "#2e060d", paper: "#f1ece3" },
  graphite: { name: "Graphite", ink: "#1d1d20", deep: "#050506", paper: "#eeebe4" },
} as const;
type Ink = keyof typeof INKS;

function mix(a: string, b: string, t: number): string {
  const p = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const [r1, g1, b1] = p(a);
  const [r2, g2, b2] = p(b);
  const c = (x: number, y: number) => Math.round(x + (y - x) * t).toString(16).padStart(2, "0");
  return `#${c(r1!, r2!)}${c(g1!, g2!)}${c(b1!, b2!)}`;
}

const SECTORS: { slug: string; name: string; source: SourceId }[] = [
  { slug: "history-change", name: "History", source: "series" },
  { slug: "economy-public-finance", name: "Economy", source: "coin" },
  { slug: "energy-industry", name: "Energy", source: "towers" },
  { slug: "housing-land", name: "Housing", source: "terraces" },
  { slug: "people-society", name: "People", source: "numeral" },
  { slug: "government-politics", name: "Government", source: "crown" },
  { slug: "infrastructure", name: "Networks", source: "viaduct" },
  { slug: "regions-places", name: "Regions", source: "uk" },
];

const EVENTS = [
  { year: 1914, label: "1914" },
  { year: 1939, label: "1939" },
  { year: 1973, label: "1973" },
  { year: 2008, label: "2008" },
];


const shortGeo = (g: string) => g.split(/[(;—]/)[0]!.trim();

function Clock() {
  const [now, setNow] = useState<string | null>(null);
  useEffect(() => {
    const fmt = new Intl.DateTimeFormat("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      timeZone: "Europe/London",
      timeZoneName: "short",
    });
    const tick = () => setNow(fmt.format(new Date()));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  return <>{now ?? " "}</>;
}

function Ticket({ figures, ink, paper }: { figures: Figure[]; ink: string; paper: string }) {
  const [i, setI] = useState(0);
  const f = figures[i];
  if (!f) return null;
  const rows: [string, string][] = [
    ["Publisher", f.publisher],
    ["Series", f.seriesId],
    ["Measure", f.unit],
    ["Cadence", f.frequency],
    ["Coverage", shortGeo(f.geography)],
  ];
  return (
    <div className={s.ticket}>
      <div className={s.ticketMain}>
        <Guilloche key={f.id} values={f.recent} ink={paper} className={s.rosette} opacity={0.2} />
        <p className={s.ticketKicker}>The present · {f.title}</p>
        <p className={s.figure} key={`v-${f.id}`}>
          {f.value}
        </p>
        <p className={s.figPeriod}>
          Latest release · {f.period} · {shortGeo(f.geography)}
        </p>
      </div>
      <div className={s.ticketStub}>
        <ol className={s.spec}>
          {rows.map(([k, v], n) => (
            <li key={k}>
              <span>{String(n + 1).padStart(2, "0")}</span>
              <span>{k}</span>
              <b>{v}</b>
            </li>
          ))}
        </ol>
        <div className={s.ticketActions}>
          <div className={s.tabs} role="tablist" aria-label="Headline figures">
            {figures.map((x, n) => (
              <button key={x.id} role="tab" aria-selected={n === i} onClick={() => setI(n)} type="button">
                {x.title.replace(/ \(.*\)/, "").split(" ").slice(0, 2).join(" ")}
              </button>
            ))}
          </div>
          <a className={s.ticketCta} href={f.sourceUrl} target="_blank" rel="noreferrer" style={{ color: ink, background: paper }}>
            Source ↗
          </a>
        </div>
      </div>
    </div>
  );
}

function Dissolve({ from, to, motion }: { from: string; to: string; motion: boolean }) {
  return (
    <div className={s.dissolve} style={{ background: to }} aria-hidden="true">
      <AsciiField className={s.fill} source="dissolve" fg={from} accent={from} bg={to} cell={11} lens={false} invert motion={motion} flow={0.28} />
    </div>
  );
}

export function ObservatoryLab({ data }: { data: ObservatoryData }) {
  const [inkId, setInkId] = useState<Ink>("ultramarine");
  const [motion, setMotion] = useState(true);
  const [panel, setPanel] = useState(true);
  const [chapter, setChapter] = useState("—");
  const [read, setRead] = useState<{ x: number; p: Point; g: number | null } | null>(null);
  const heroFieldRef = useRef<HTMLDivElement>(null);
  const { ink, deep, paper } = INKS[inkId];
  const soft = mix(paper, ink, 0.3);
  const lift = mix(ink, paper, 0.16);

  const gdp = data.gdp?.points ?? [];
  const y0 = gdp[0]?.year ?? 1700;
  const y1 = gdp[gdp.length - 1]?.year ?? 2016;
  const nowYear = new Date().getFullYear();
  const total = data.catalogue.length;
  const earliest = Math.min(...data.catalogue.map((c) => c.points[0]?.year ?? 9999), y0);

  const counts = useMemo(() => {
    const m = new Map<string, number>();
    for (const c of data.catalogue) m.set(c.sector, (m.get(c.sector) ?? 0) + 1);
    return m;
  }, [data.catalogue]);

  const population = data.figures.find((f) => f.id === "uk-population-estimate");

  useEffect(() => {
    if (window.innerWidth < 700) setPanel(false);
    const els = document.querySelectorAll<HTMLElement>("[data-chapter]");
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setChapter(e.target.getAttribute("data-chapter") ?? "—");
      },
      { rootMargin: "-45% 0px -45% 0px" },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  const onHeroMove = (e: React.PointerEvent) => {
    const el = heroFieldRef.current;
    if (!el || gdp.length < 2) return;
    const r = el.getBoundingClientRect();
    const f = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
    const i = Math.round(f * (gdp.length - 1));
    const p = gdp[i]!;
    const prev = gdp[i - 1];
    setRead({ x: f, p, g: prev ? (p.v / prev.v - 1) * 100 : null });
  };

  const vars = {
    "--ink": ink,
    "--deep": deep,
    "--paper": paper,
    "--soft": soft,
    "--lift": lift,
  } as CSSProperties;

  const ticks: number[] = [];
  for (let t = Math.ceil(y0 / 50) * 50; t <= y1; t += 50) ticks.push(t);

  const investigations: { n: string; q: string; series: SeriesRecord | null; source: SourceId; unit: (p: Point) => string }[] = [
    {
      n: "01",
      q: "Where did Britain’s coal go?",
      series: data.coal,
      source: "towers",
      unit: (p) => `Peak ${p.v.toFixed(0)}Mt · ${p.year}`,
    },
    {
      n: "02",
      q: "Why does a home cost so many years’ pay?",
      series: data.housing,
      source: "terraces",
      unit: (p) => `Peak ${p.v.toFixed(1)}× · ${p.year}`,
    },
    {
      n: "03",
      q: "What happened to the factory floor?",
      series: data.manufacturing,
      source: "viaduct",
      unit: (p) => `Peak ${(p.v / 1000).toFixed(1)}m jobs · ${p.year}`,
    },
  ];

  return (
    <div className={s.root} style={vars}>
      {/* ——— Instrument bezel ——— */}
      <div className={s.frame} aria-hidden="true">
        <span className={`${s.read} ${s.rTL}`}>British Observatory</span>
        <span className={`${s.read} ${s.rTR}`}>
          London · <Clock />
        </span>
        <span className={`${s.read} ${s.rBL}`}>{chapter}</span>
        <span className={`${s.read} ${s.rBR}`}>
          {total} series · {earliest}–{nowYear}
        </span>
      </div>

      {/* ——— Hero: three centuries of output, set in type ——— */}
      <section className={s.hero}>
        <nav className={s.nav} aria-label="Chapters">
          <a href="#was">I · Was</a>
          <a href="#is">II · Is</a>
          <Link href="/design-lab/observatory" className={s.mark} aria-label="British Observatory">
            <span>British</span>
            <span>Observatory</span>
          </Link>
          <a href="#how">III · How</a>
          <a href="#heading">IV · Heading</a>
        </nav>

        <div className={s.heroCopy}>
          <p className={s.kicker}>An open British observatory</p>
          <h1 className={s.h1}>
            Britain,
            <br />
            on the record.
          </h1>
          <p className={s.tagline}>
            Deep public data and original investigations — a living, evidence-led record of what Britain was, what it
            is, how it got here, and where it may be heading.
          </p>
          <div className={s.ctas}>
            <a href="#is" className={s.ctaSolid}>
              Read the record
            </a>
            <a href="#how" className={s.ctaLine}>
              Investigations
            </a>
          </div>
        </div>

        {gdp.length ? (
          <figure className={s.heroFigure}>
            <div ref={heroFieldRef} className={s.heroField} onPointerMove={onHeroMove} onPointerLeave={() => setRead(null)}>
              <AsciiField
                className={s.fill}
                source="series"
                sourceOptions={{ series: gdp.map((p) => p.v), logScale: true, pad: 0.04 }}
                fg={paper}
                accent={paper}
                bg={ink}
                cell={9}
                ground={0.14}
                flow={0.14}
                motion={motion}
                label={`Real GDP ${y0}–${y1} on a log scale, drawn in characters; brightness follows each year's growth`}
              />
              {EVENTS.filter((e) => e.year >= y0 && e.year <= y1).map((e) => (
                <span key={e.year} className={s.event} style={{ left: `${((e.year - y0) / (y1 - y0)) * 100}%` }}>
                  {e.label}
                </span>
              ))}
              {read ? (
                <span className={s.cursor} style={{ left: `${read.x * 100}%` }}>
                  <span className={s.cursorTag} data-flip={read.x > 0.72}>
                    <b>{read.p.year}</b>
                    <span>£{(read.p.v / 1000).toFixed(read.p.v < 100000 ? 1 : 0)}bn</span>
                    {read.g !== null ? (
                      <span>
                        {read.g >= 0 ? "+" : ""}
                        {read.g.toFixed(1)}%
                      </span>
                    ) : null}
                  </span>
                </span>
              ) : null}
            </div>
            <div className={s.axis} aria-hidden="true">
              {ticks.map((t) => (
                <span key={t} style={{ left: `${((t - y0) / (y1 - y0)) * 100}%` }}>
                  {t}
                </span>
              ))}
            </div>
            <figcaption className={s.caption}>
              <b>Fig. 01</b> Real GDP, {y0}–{y1}, log scale, 2013 prices. Each column’s brightness is that year’s
              growth — dark seams are contractions. {data.gdp?.publisher}, “{data.gdp?.title}”.
            </figcaption>
          </figure>
        ) : null}
      </section>

      <Dissolve from={ink} to={paper} motion={motion} />

      {/* ——— I. What it was ——— */}
      <section className={s.paper} id="was" data-chapter="I · What it was">
        <header className={s.chapterHead}>
          <p className={s.chapterNo}>I</p>
          <div>
            <p className={s.kicker}>What it was</p>
            <h2 className={s.h2}>Three long lines, engraved.</h2>
            <p className={s.lede}>
              The outer line of each plate is the series itself; the line-work beneath it is the same curve, scaled.
            </p>
          </div>
        </header>
        <div className={s.plates}>
          {(
            [
              [data.unemployment, (p: Point) => `PEAK ${p.v.toFixed(1)}% · ${p.year}`],
              [data.manufacturing, (p: Point) => `PEAK ${(p.v / 1000).toFixed(1)}M · ${p.year}`],
              [data.coal, (p: Point) => `PEAK ${p.v.toFixed(0)}MT · ${p.year}`],
            ] as const
          ).map(([rec, lab]) =>
            rec ? (
              <figure key={rec.id} className={s.plate}>
                <figcaption className={s.plateHead}>
                  <span className={s.plateTitle}>{rec.title}</span>
                  <span className={s.plateMeta}>
                    {rec.points[0]!.year}–{rec.points[rec.points.length - 1]!.year} · {rec.publisher}
                  </span>
                </figcaption>
                <EngravedPlate className={s.plateSvg} points={rec.points} ink={ink} peakLabel={lab} label={`${rec.title}, engraved`} />
              </figure>
            ) : null,
          )}
        </div>
      </section>

      {/* ——— II. What it is ——— */}
      <section className={s.paper} id="is" data-chapter="II · What it is">
        <header className={s.chapterHead}>
          <p className={s.chapterNo}>II</p>
          <div>
            <p className={s.kicker}>What it is</p>
            <h2 className={s.h2}>One figure, fully sourced.</h2>
            <p className={s.lede}>
              Every number arrives with its receipt. The rosette behind it is generated from the series’ own recent
              history — a signature no other figure shares.
            </p>
          </div>
        </header>
        <Ticket figures={data.figures} ink={ink} paper={paper} />
      </section>

      <Dissolve from={paper} to={ink} motion={motion} />

      {/* ——— III. How it got here ——— */}
      <section className={s.inkSection} id="how" data-chapter="III · How it got here">
        <header className={s.chapterHead}>
          <p className={s.chapterNo}>III</p>
          <div>
            <p className={s.kicker}>How it got here</p>
            <h2 className={s.h2}>Investigations.</h2>
            <p className={s.lede}>Original reporting that starts from the record and follows it back. In preparation.</p>
          </div>
        </header>
        <div className={s.investigations}>
          {investigations.map((inv) => {
            const pts = inv.series?.points ?? [];
            const peak = pts.length ? pts.reduce((a, b) => (b.v > a.v ? b : a)) : null;
            return (
              <article key={inv.n} className={s.inv}>
                <div className={s.invArt}>
                  <Halftone source={inv.source} field={lift} ink={deep} highlight={paper} pitch={3} />
                  <span className={s.invNo}>No. {inv.n}</span>
                </div>
                <p className={s.invTag}>Investigation · In preparation</p>
                <h3 className={s.invQ}>{inv.q}</h3>
                {pts.length ? (
                  <>
                    <EngravedPlate points={pts} ink={paper} lines={12} height={110} tickEvery={pts.length > 60 ? 50 : 10} className={s.invPlate} label={inv.series!.title} />
                    <p className={s.invSrc}>
                      {inv.series!.title} · {peak ? inv.unit(peak) : ""} · {inv.series!.publisher}
                    </p>
                  </>
                ) : null}
              </article>
            );
          })}
        </div>

        <header className={`${s.chapterHead} ${s.indexHead}`}>
          <p className={s.chapterNo} aria-hidden="true">
            §
          </p>
          <div>
            <p className={s.kicker}>The index</p>
            <h2 className={s.h2}>Eight sectors, one issue.</h2>
            <p className={s.lede}>The denomination on each stamp is how many verified series it holds today.</p>
          </div>
        </header>
        <div className={s.stamps}>
          {SECTORS.map((sec, i) => (
            <Stamp
              key={sec.slug}
              label={sec.name}
              source={sec.source}
              sourceOptions={
                sec.source === "series"
                  ? { series: gdp.map((p) => p.v), logScale: true, pad: 0.2 }
                  : sec.source === "numeral"
                    ? { text: population?.value ?? "69m", pad: 0.18 }
                    : undefined
              }
              field={lift}
              ink={deep}
              highlight={paper}
              denomination={`${counts.get(sec.slug) ?? 0} series`}
              tilt={[-5, 3, -2, 4, -4, 2, -3, 5][i]}
              href="/economy"
            />
          ))}
        </div>
      </section>

      <Dissolve from={ink} to={paper} motion={motion} />

      {/* ——— IV. Where it may be heading ——— */}
      <section className={s.paper} id="heading" data-chapter="IV · Where it may be heading">
        <header className={s.chapterHead}>
          <p className={s.chapterNo}>IV</p>
          <div>
            <p className={s.kicker}>Where it may be heading</p>
            <h2 className={s.h2}>The record ends at today.</h2>
            <p className={s.lede}>
              Every thread is one series in the catalogue, scaled to its own range, ending at its latest release. Past
              the line is what has not been observed — forecasts will appear there only with their source attached.
            </p>
          </div>
        </header>
        <Frontier series={data.catalogue} from={1960} now={nowYear} ink={ink} paper={paper} />
      </section>

      <Dissolve from={paper} to={ink} motion={motion} />

      <footer className={s.footer}>
        <div className={s.wordmark}>
          <AsciiField
            className={s.fill}
            source="numeral"
            sourceOptions={{ text: "OBSERVATORY", pad: 0.02 }}
            fg={soft}
            accent={paper}
            bg={ink}
            cell={8}
            motion={motion}
            label="Observatory"
          />
        </div>
        <div className={s.footRow}>
          <span>Lab 03 · The Record — test page, not live.</span>
          <span>
            <Link href="/design-lab/imprint">Lab 02</Link> · <Link href="/">Live home</Link>
          </span>
        </div>
      </footer>

      {/* ——— Lab controls ——— */}
      <aside className={s.panel} data-open={panel}>
        <button type="button" className={s.panelToggle} onClick={() => setPanel((o) => !o)} aria-expanded={panel}>
          {panel ? "–" : "+"} <span>Lab</span>
        </button>
        {panel ? (
          <div className={s.panelBody}>
            <fieldset className={s.seg}>
              <legend>Ink</legend>
              <div>
                {(Object.keys(INKS) as Ink[]).map((id) => (
                  <button key={id} type="button" aria-pressed={id === inkId} onClick={() => setInkId(id)}>
                    <i style={{ background: INKS[id].ink }} /> {INKS[id].name}
                  </button>
                ))}
              </div>
            </fieldset>
            <fieldset className={s.seg}>
              <legend>Motion</legend>
              <div>
                <button type="button" aria-pressed={motion} onClick={() => setMotion(true)}>
                  On
                </button>
                <button type="button" aria-pressed={!motion} onClick={() => setMotion(false)}>
                  Still
                </button>
              </div>
            </fieldset>
          </div>
        ) : null}
      </aside>
    </div>
  );
}

