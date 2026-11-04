"use client";

import type { CSSProperties } from "react";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { TickerStat } from "@/lib/latest";
import { AsciiField, type Ramp } from "./AsciiField";
import { Postmark } from "./Postmark";
import { Stamp } from "./Stamp";
import s from "./imprint.module.css";

export type LabData = {
  titles: string[];
  seriesCount: number | null;
  stats: Record<"cpi" | "debt" | "gas" | "employment" | "gdp", TickerStat | null>;
};

/* ——— Colourways: one ASCII engine, four grounds ——— */
const COLORWAYS = {
  admiralty: {
    name: "Admiralty",
    bg: "#00002D",
    surface: "#03063a",
    fg: "#eef0f8",
    dim: "#8d97bb",
    accent: "#f07a86",
    line: "rgb(154 166 200 / 0.2)",
    ascii: "#b9c3e4",
  },
  blueprint: {
    name: "Blueprint",
    bg: "#1435d0",
    surface: "#183adb",
    fg: "#f4f6ff",
    dim: "#b8c3ff",
    accent: "#ffffff",
    line: "rgb(255 255 255 / 0.26)",
    ascii: "#dfe5ff",
  },
  verdigris: {
    name: "Verdigris",
    bg: "#030d0b",
    surface: "#061614",
    fg: "#e9f0ec",
    dim: "#7fa89c",
    accent: "#e6c98c",
    line: "rgb(127 168 156 / 0.2)",
    ascii: "#86c2b0",
  },
  portland: {
    name: "Portland",
    bg: "#f4eedf",
    surface: "#ede5d0",
    fg: "#00002D",
    dim: "#5b6380",
    accent: "#b3122e",
    line: "rgb(0 0 45 / 0.14)",
    ascii: "#1f3266",
  },
} as const;
type Colorway = keyof typeof COLORWAYS;

const RAMP_LABEL: Record<Ramp, string> = {
  density: "Density",
  phrase: "Phrase",
  dots: "Dots",
  blocks: "Blocks",
};

const SECTOR_PHRASE =
  "ENERGY · ECONOMY · HOUSING & LAND · PEOPLE & SOCIETY · GOVERNMENT · INFRASTRUCTURE · REGIONS & PLACES · HISTORY & CHANGE · ";

const v = (stat: TickerStat | null, fallback = "—") => stat?.value ?? fallback;

function Clock() {
  const [now, setNow] = useState<string | null>(null);
  useEffect(() => {
    const fmt = new Intl.DateTimeFormat("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      timeZone: "Europe/London",
      timeZoneName: "short",
    });
    const tick = () => setNow(fmt.format(new Date()).replace(/\//g, ".").replace(",", " ·"));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  return <span className={s.clock}>{now ?? " "}</span>;
}

/** Blueprint framing — "+" marks at the four corners of a frame. */
function Crosshairs() {
  return (
    <>
      <span className={`${s.cross} ${s.tl}`} aria-hidden="true" />
      <span className={`${s.cross} ${s.tr}`} aria-hidden="true" />
      <span className={`${s.cross} ${s.bl}`} aria-hidden="true" />
      <span className={`${s.cross} ${s.br}`} aria-hidden="true" />
    </>
  );
}

function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { id: T; name: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <fieldset className={s.seg}>
      <legend>{label}</legend>
      <div>
        {options.map((o) => (
          <button key={o.id} type="button" aria-pressed={o.id === value} onClick={() => onChange(o.id)}>
            {o.name}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

export function ImprintLab({ data }: { data: LabData }) {
  const [cw, setCw] = useState<Colorway>("admiralty");
  const [ramp, setRamp] = useState<Ramp>("density");
  const [glass, setGlass] = useState(true);
  const [motion, setMotion] = useState(true);
  const [panelOpen, setPanelOpen] = useState(true);
  useEffect(() => {
    if (window.innerWidth < 700) setPanelOpen(false);
  }, []);
  const c = COLORWAYS[cw];
  const { stats } = data;
  const count = data.seriesCount ?? 48;

  const vars = {
    "--lab-bg": c.bg,
    "--lab-surface": c.surface,
    "--lab-fg": c.fg,
    "--lab-dim": c.dim,
    "--lab-accent": c.accent,
    "--lab-line": c.line,
    "--lab-ascii": c.ascii,
  } as CSSProperties;

  const cataloguePhrase = useMemo(
    () => (data.titles.length ? data.titles.map((t) => t.toUpperCase()).join(" · ") + " · " : SECTOR_PHRASE),
    [data.titles],
  );

  const ascii = { fg: c.ascii, accent: c.accent, bg: c.bg, motion };

  const tickerItems = [
    ["CPI", stats.cpi],
    ["Employment", stats.employment],
    ["Net debt", stats.debt],
    ["Gas share", stats.gas],
    ["Real GDP", stats.gdp],
  ] as const;

  return (
    <div className={s.root} style={vars} data-glass={glass ? "on" : "off"} data-colorway={cw}>
      {/* ——— Top bar ——— */}
      <header className={s.topbar}>
        <span className={s.status}>
          <i className={s.dot} /> {count} series ready
        </span>
        <Clock />
        <span className={s.topLinks}>
          <Link href="/design-lab">Lab 01</Link>
          <Link href="/">Live home</Link>
        </span>
      </header>

      {/* ——— Floating nav pill (glass candidate A) ——— */}
      <nav className={`${s.pill} ${s.glass}`} aria-label="Primary">
        <div className={s.pillRow}>
          <span className={s.pillMark} aria-hidden="true">
            BX
          </span>
          <Link href="/" aria-current="page">
            Observatory
          </Link>
          <Link href="/economy">Economy</Link>
          <Link href="/energy">Energy</Link>
          <Link href="/housing">Housing</Link>
          <a href="#issue">Sectors</a>
        </div>
        <div className={s.marquee} aria-hidden="true">
          <div className={s.marqueeTrack}>
            {[0, 1].map((k) => (
              <span key={k}>
                {tickerItems.map(([name, st]) => (
                  <span key={name} className={s.mItem}>
                    {name} <b>{v(st)}</b> <em>{st?.period ?? ""}</em>
                  </span>
                ))}
              </span>
            ))}
          </div>
        </div>
      </nav>

      {/* ——— Hero: copy left, Britain as a live character field right ——— */}
      <section className={s.hero}>
        <div className={s.heroCopy}>
          <p className={s.kicker}>The Britain Exchange — an open observatory</p>
          <h1 className={s.h1}>
            How the country lives, works <em>and ages.</em>
          </h1>
          <p className={s.lede}>
            {count} verified public series, each traced to the release it came from. Read the nation at
            every scale — from the coastline to the decimal point.
          </p>
          <div className={s.ctas}>
            <Link href="/economy" className={s.ctaPrimary}>
              Enter the observatory <span aria-hidden="true">→</span>
            </Link>
            <a href="#issue" className={s.ctaGhost}>
              Browse sectors
            </a>
          </div>
          <dl className={s.heroStats}>
            {tickerItems.slice(0, 3).map(([name, st]) => (
              <div key={name}>
                <dt>{name}</dt>
                <dd>{v(st)}</dd>
              </div>
            ))}
          </dl>
        </div>

        <figure className={s.heroField}>
          <Crosshairs />
          <AsciiField
            className={s.fill}
            source="uk"
            ramp={ramp}
            phrase={SECTOR_PHRASE}
            cell={10}
            ground={0.28}
            flow={0.2}
            label="The United Kingdom drawn in characters, brighter where people live"
            {...ascii}
          />
          <span className={`${s.coord} ${s.coordTop}`}>60.86°N · 0.88°W</span>
          <span className={`${s.coord} ${s.coordBottom}`}>49.96°N · 5.71°W</span>
          <figcaption className={s.figcap}>
            <span>Fig. 01</span> United Kingdom, 1:50m — density by settlement. Move the cursor to read closer.
          </figcaption>
        </figure>
      </section>

      {/* ——— Readings: ASCII subjects on cards ——— */}
      <section className={s.section}>
        <header className={s.sectionHead}>
          <p className={s.kicker}>Readings · No. 01</p>
          <h2 className={s.h2}>Three figures, set in type.</h2>
        </header>
        <div className={s.cards}>
          {(
            [
              {
                fig: "02",
                title: "Government",
                note: "Acts · turnout · spending",
                source: "crown" as const,
                opts: {},
                stat: null as string | null,
                href: "/economy",
              },
              {
                fig: "03",
                title: "CPI inflation",
                note: stats.cpi?.period ?? "Latest release",
                source: "numeral" as const,
                opts: { text: v(stats.cpi, "3.8%"), pad: 0.1 },
                stat: v(stats.cpi),
                href: "/economy",
              },
              {
                fig: "04",
                title: "Public sector net debt",
                note: stats.debt?.period ?? "Latest release",
                source: "coin" as const,
                opts: {},
                stat: v(stats.debt),
                href: "/economy",
              },
            ]
          ).map((card) => (
            <Link key={card.fig} href={card.href} className={s.card}>
              <Crosshairs />
              <AsciiField
                className={s.fill}
                source={card.source}
                sourceOptions={card.opts}
                ramp={ramp === "phrase" ? "density" : ramp}
                cell={8}
                ground={0.12}
                flow={0.22}
                invert={card.source === "numeral"}
                {...ascii}
              />
              <span className={s.cardFig}>Fig. {card.fig}</span>
              <span className={`${s.cardLabel} ${s.glass}`}>
                <span className={s.cardTitle}>{card.title}</span>
                <span className={s.cardMeta}>
                  {card.stat ? <b>{card.stat}</b> : null} {card.note}
                </span>
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* ——— Spread: the catalogue as one numeral ——— */}
      <section className={s.spread}>
        <AsciiField
          className={s.fill}
          source="numeral"
          sourceOptions={{ text: String(count), alignX: 0.92, pad: 0.02 }}
          ramp="phrase"
          phrase={cataloguePhrase}
          cell={9}
          ground={0.16}
          flow={0.16}
          label={`${count}, written in the names of every series in the catalogue`}
          {...ascii}
        />
        <div className={s.spreadCopy}>
          <p className={s.kicker}>The catalogue</p>
          <h2 className={s.h2}>
            {count} series, <br />
            verified at source.
          </h2>
          <p className={s.lede}>
            The numeral is set in the names of every series we publish — each one loaded, checked and
            linked to the release it came from.
          </p>
        </div>
      </section>

      {/* ——— Issue: sector stamps ——— */}
      <section className={s.issue} id="issue">
        <header className={s.sectionHead}>
          <p className={s.kicker}>Sector issue · No. 01 · Autumn 2026</p>
          <h2 className={s.h2}>Each sector, a stamp.</h2>
          <p className={s.ledeSm}>Halftone print — not ASCII. The denomination is the sector’s headline figure.</p>
        </header>
        <div className={s.sheet}>
          <Stamp label="Energy" source="towers" field="#2d6a61" denomination={v(stats.gas)} caption="Gas · generation" tilt={-7} href="/energy" />
          <Stamp label="Economy" source="coin" field="#a8353a" denomination={v(stats.cpi)} caption="CPI · prices" tilt={3} href="/economy" />
          <Stamp label="Housing" source="terraces" field="#b9813a" caption="Prices · stock" tilt={-3} href="/housing" />
          <Stamp label="Networks" source="viaduct" field="#3b5b83" caption="Rail · water" tilt={6} href="/economy" />
          <Stamp label="Government" source="crown" field="#242d5c" caption="Acts · turnout" tilt={-4} href="/economy" />
          <Postmark className={s.sheetMark} color="#15171d" />
        </div>
      </section>

      {/* ——— Applications: the stamp beyond the homepage ——— */}
      <section className={s.section}>
        <header className={s.sectionHead}>
          <p className={s.kicker}>Applications</p>
          <h2 className={s.h2}>The motif, across the site.</h2>
        </header>
        <div className={s.apps}>
          <article className={s.evidence}>
            <div className={s.evidenceStamp}>
              <Stamp label="CPI" source="coin" field="#a8353a" size="sm" tilt={5} />
              <Postmark className={s.evidenceMark} waves={false} bottom="ONS · MM23" />
            </div>
            <p className={s.evKicker}>Evidence · Ready</p>
            <h3 className={s.evTitle}>Consumer Prices Index</h3>
            <dl className={s.evRows}>
              <div>
                <dt>Publisher</dt>
                <dd>Office for National Statistics</dd>
              </div>
              <div>
                <dt>Series</dt>
                <dd>D7G7 · MM23</dd>
              </div>
              <div>
                <dt>Latest</dt>
                <dd>
                  {v(stats.cpi)} · {stats.cpi?.period ?? "—"}
                </dd>
              </div>
            </dl>
            <p className={s.evNote}>Source panel: a small stamp and franking mark seal each verified release.</p>
          </article>

          <article className={s.masthead}>
            <Stamp label="Energy" source="towers" field="#2d6a61" size="md" tilt={-4} />
            <div>
              <p className={s.kicker}>Sector · EN</p>
              <h3 className={s.mastTitle}>Energy &amp; Industry</h3>
              <p className={s.ledeSm}>Sector masthead: the stamp is the sector’s emblem on its own page.</p>
            </div>
          </article>
        </div>
      </section>

      <footer className={s.footer}>
        <span>Imprint lab · 02 — test page, not live.</span>
        <span>Outline: Natural Earth 1:50m (public domain).</span>
      </footer>

      {/* ——— Lab controls ——— */}
      <aside className={`${s.panel} ${s.glass}`} data-open={panelOpen}>
        <button type="button" className={s.panelToggle} onClick={() => setPanelOpen((o) => !o)} aria-expanded={panelOpen}>
          {panelOpen ? "–" : "+"} <span>Lab</span>
        </button>
        {panelOpen ? (
          <div className={s.panelBody}>
            <Segmented
              label="Colourway"
              value={cw}
              options={(Object.keys(COLORWAYS) as Colorway[]).map((id) => ({ id, name: COLORWAYS[id].name }))}
              onChange={setCw}
            />
            <Segmented
              label="Glyphs"
              value={ramp}
              options={(Object.keys(RAMP_LABEL) as Ramp[]).map((id) => ({ id, name: RAMP_LABEL[id] }))}
              onChange={setRamp}
            />
            <Segmented
              label="Glass"
              value={glass ? "on" : "off"}
              options={[
                { id: "on", name: "On" },
                { id: "off", name: "Off" },
              ]}
              onChange={(x) => setGlass(x === "on")}
            />
            <Segmented
              label="Motion"
              value={motion ? "on" : "off"}
              options={[
                { id: "on", name: "On" },
                { id: "off", name: "Still" },
              ]}
              onChange={(x) => setMotion(x === "on")}
            />
          </div>
        ) : null}
      </aside>
    </div>
  );
}
