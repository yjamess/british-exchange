"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AsciiField } from "@/app/design-lab/imprint/AsciiField";
import { Halftone } from "@/app/design-lab/imprint/Halftone";
import { Stamp } from "@/app/design-lab/imprint/Stamp";
import { CombBars } from "../charts/CombBars";
import { EngravedArea } from "../charts/EngravedArea";
import { LineChart } from "../charts/LineChart";
import { ShareArea } from "../charts/ShareArea";
import { Spark } from "../charts/Spark";
import { TileMap } from "../charts/TileMap";
import { Search, Segmented } from "../controls";
import { changePct, fmt, type Series } from "../data";
import type { HousingData } from "../housing/load";
import { ICON_NAMES, Icon } from "../icons";
import { Coverage, Figure, Label, LevelStepper, Pathway, SourceLine } from "../primitives";
import g from "./playground.module.css";

/* WCAG relative-luminance contrast, computed live from the tokens */
function lum(hex: string) {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0]! + 0.7152 * c[1]! + 0.0722 * c[2]!;
}
const contrast = (a: string, b: string) => {
  const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m);
  return (x! + 0.05) / (y! + 0.05);
};

const COLOURS = [
  { name: "Portland", token: "--bo-paper", hex: "#f0ede5", role: "Paper. Every reading surface." },
  { name: "Admiralty", token: "--bo-ink", hex: "#0d1258", role: "Ink. Type, lines, rules, fills." },
  { name: "Deep", token: "--bo-ink-deep", hex: "#05072a", role: "Halftone shadows; ink on ink." },
  { name: "Signal", token: "--bo-signal", hex: "#b3122e", role: "The one highlight that matters. Never decoration." },
  { name: "London stock", token: "--bo-sector", hex: "#b07c2c", role: "Housing pigment — its imprint only, never data." },
];

const PRINCIPLES = [
  ["One ink, one paper, one signal.", "Every surface is a duotone of Admiralty and Portland. Red marks the single point a page is making."],
  ["Data chooses the form; the brand chooses the feel.", "Tenure is a share, so it’s a stacked share. Supply is counts, so it’s a comb. Never one chart for everything."],
  ["Geography is part of the number.", "A figure without its coverage is unfinished. Dashed badge = partial UK coverage."],
  ["The line tells you its status.", "Solid is observed. Dotted is provisional. Dashed is not observed — reference or forecast."],
  ["Depth is a choice.", "Overview → Explore → Data, always visible. Complexity arrives when asked for."],
  ["Imprint at the threshold, instrument in the data.", "Halftone, stamps and ASCII frame the page. Inside a chart, only exact line-work."],
];

const TYPE = [
  { role: "Hero", cls: "bo-hero", family: "Sofia Sans Extra Condensed 200", sample: "British housing." },
  { role: "Display 1", cls: "bo-d1", family: "Sofia Sans Extra Condensed 250", sample: "Twelve places, one price." },
  { role: "Display 2", cls: "bo-d2", family: "Sofia Sans Extra Condensed 250", sample: "Who owns, who rents." },
  { role: "Display 3", cls: "bo-d3", family: "Sofia Sans Extra Condensed 300", sample: "Tenure of the stock" },
  { role: "Editorial", cls: `bo-ed ${g.edSample}`, family: "Libre Caslon Display, italic", sample: "Why does a home cost so many years’ pay?" },
  { role: "Text", cls: g.textSample, family: "Source Sans 3", sample: "Each dataset has a permanent address: publisher, series, coverage, cadence, range and release status." },
  { role: "Data label", cls: "bo-label", family: "IBM Plex Mono 500, +0.16em", sample: "Source · HM Land Registry / ONS · Aug 2026" },
];

const SPACE = [
  ["s1", 4],
  ["s2", 8],
  ["s3", 12],
  ["s4", 16],
  ["s5", 24],
  ["s6", 32],
  ["s7", 48],
  ["s8", 64],
  ["s9", 96],
  ["s10", 128],
] as const;

const NAV = ["Principles", "Colour", "Type", "Grid", "Line", "Icons", "Primitives", "Charts", "Imprint"];

export function Playground({ data }: { data: HousingData }) {
  const [overlay, setOverlay] = useState(false);
  const [demo, setDemo] = useState<"a" | "b">("a");
  const [place, setPlace] = useState("E12000007");

  const typeSeries: Series[] = data.types.map((t, i) => ({ id: t.id, label: t.label, points: t.points, role: i === 0 ? "signal" : "context" }));
  const tiles = useMemo(
    () =>
      data.regions
        .filter((r) => !["K02000001", "E92000001"].includes(r.code))
        .map((r) => {
          const v = changePct(r.points, 12);
          return { code: r.code, value: v, display: v === null ? "—" : fmt.pctSigned(v) };
        }),
    [data.regions],
  );
  const lastPrice = data.price[data.price.length - 1];
  const yoy = changePct(data.price, 12);

  return (
    <div className={g.root}>
      {overlay ? (
        <div className={g.overlay} aria-hidden="true">
          <div className="bo-wrap bo-grid">
            {Array.from({ length: 12 }, (_, i) => (
              <span key={i} />
            ))}
          </div>
        </div>
      ) : null}

      <header className={`${g.head} bo-on-ink`}>
        <div className="bo-wrap">
          <div className={g.headTop}>
            <Link href="/design-lab/observatory" className={g.mark}>
              <span>British</span>
              <span>Observatory</span>
            </Link>
            <div className={g.headTools}>
              <Segmented
                label="Grid overlay"
                value={overlay ? "on" : "off"}
                onChange={(v) => setOverlay(v === "on")}
                options={[
                  { id: "off", name: "Grid off" },
                  { id: "on", name: "Grid on" },
                ]}
              />
              <Link href="/design-lab/housing" className={`bo-label ${g.headLink}`}>
                Housing proposal <Icon name="arrow" size={14} />
              </Link>
            </div>
          </div>
          <Label marker>Brand foundations · v0.1 · living</Label>
          <h1 className="bo-hero">Instrument &amp; imprint.</h1>
          <p className={g.headLede}>
            The British Observatory’s visual system, rendered from the real components with real data. If it isn’t on this
            page, it isn’t in the system yet.
          </p>
          <nav className={g.toc} aria-label="Sections">
            {NAV.map((n, i) => (
              <a key={n} href={`#${n.toLowerCase()}`}>
                <span>{String(i + 1).padStart(2, "0")}</span> {n}
              </a>
            ))}
          </nav>
        </div>
      </header>

      <main className={g.main}>
        {/* 01 Principles */}
        <section id="principles" className={g.sec}>
          <div className="bo-wrap">
            <SecHead n="01" title="Principles" />
            <ol className={g.principles}>
              {PRINCIPLES.map(([t, d], i) => (
                <li key={t}>
                  <span className="bo-label">{String(i + 1).padStart(2, "0")}</span>
                  <p className="bo-d3">{t}</p>
                  <p>{d}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* 02 Colour */}
        <section id="colour" className={g.sec}>
          <div className="bo-wrap">
            <SecHead n="02" title="Colour" note="Contrast ratios are computed from the token values on this page." />
            <div className={g.swatches}>
              {COLOURS.map((c) => {
                const onPaper = contrast(c.hex, "#f0ede5");
                const onInk = contrast(c.hex, "#0d1258");
                return (
                  <div key={c.token} className={g.swatch}>
                    <div className={g.chip} style={{ background: c.hex }} />
                    <p className="bo-d3">{c.name}</p>
                    <p className="bo-label">
                      {c.hex.toUpperCase()} · {c.token}
                    </p>
                    <p className={g.role}>{c.role}</p>
                    <p className={`bo-label ${g.ratio}`}>
                      {c.hex !== "#f0ede5" ? `on paper ${onPaper.toFixed(1)}:1 ${onPaper >= 4.5 ? "AA" : onPaper >= 3 ? "AA large" : "—"}` : `on ink ${onInk.toFixed(1)}:1 AA`}
                    </p>
                  </div>
                );
              })}
            </div>
            <div className={g.tints}>
              {[100, 80, 60, 40, 20, 10].map((t) => (
                <div key={t} style={{ background: `color-mix(in srgb, var(--bo-ink) ${t}%, var(--bo-paper))`, color: t >= 60 ? "var(--bo-paper)" : "var(--bo-ink)" }}>
                  <span className="bo-label">ink-{t}</span>
                </div>
              ))}
            </div>
            <p className={g.note}>Tints are mixes of the ink, not new hues — comparison series, chrome and sequential map bins all come from here.</p>
          </div>
        </section>

        {/* 03 Type */}
        <section id="type" className={g.sec}>
          <div className="bo-wrap">
            <SecHead n="03" title="Type" note="Four voices: display (the instrument), editorial (the question), text (the explanation), data (the record)." />
            <div className={g.typeList}>
              {TYPE.map((t) => (
                <div key={t.role} className={g.typeRow}>
                  <div>
                    <p className="bo-label">{t.role}</p>
                    <p className={g.typeMeta}>{t.family}</p>
                  </div>
                  <p className={t.cls}>{t.sample}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 04 Grid */}
        <section id="grid" className={g.sec}>
          <div className="bo-wrap">
            <SecHead n="04" title="Grid & space" note="12 columns · 1360 max · fluid gutter · 8px rhythm. Toggle the overlay in the header to check any page." />
            <div className={`bo-grid ${g.gridDemo}`}>
              {Array.from({ length: 12 }, (_, i) => (
                <span key={i}>{i + 1}</span>
              ))}
              <b style={{ gridColumn: "1 / span 2" }}>Section no.</b>
              <b style={{ gridColumn: "3 / span 7" }}>Heading + lede</b>
              <b style={{ gridColumn: "10 / span 3" }}>Control</b>
              <b style={{ gridColumn: "1 / span 7" }}>Masthead copy</b>
              <b style={{ gridColumn: "9 / span 4" }}>Plate</b>
              <b style={{ gridColumn: "1 / span 5" }}>Map</b>
              <b style={{ gridColumn: "6 / span 7" }}>Comparison</b>
            </div>
            <div className={g.space}>
              {SPACE.map(([n, px]) => (
                <div key={n}>
                  <i style={{ width: px }} />
                  <span className="bo-label">
                    {n} · {px}px
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 05 Line language */}
        <section id="line" className={g.sec}>
          <div className="bo-wrap">
            <SecHead n="05" title="Line language" note="The same three strokes mean the same thing in icons, rules and charts." />
            <div className={g.lines}>
              {(
                [
                  ["observed", "Observed", "A published, final value."],
                  ["provisional", "Provisional", "Published, but open to revision — e.g. the latest months of UK HPI."],
                  ["unobserved", "Not observed", "Reference lines, projections, and anything the record does not contain."],
                ] as const
              ).map(([icon, name, d]) => (
                <div key={icon}>
                  <Icon name={icon} size={64} />
                  <p className="bo-d3">{name}</p>
                  <p>{d}</p>
                </div>
              ))}
            </div>
            <div className={g.coverRow}>
              <Coverage scope="United Kingdom" />
              <span>UK-wide — solid badge</span>
              <Coverage scope="England" />
              <span>Partial coverage — dashed badge, “only” appended</span>
            </div>
          </div>
        </section>

        {/* 06 Icons */}
        <section id="icons" className={g.sec}>
          <div className="bo-wrap">
            <SecHead n="06" title="Iconography" note="Engraved line: 24px grid, 1.25 stroke, square caps, mitred joins. At most one hatch or stipple per icon." />
            <div className={g.icons}>
              {ICON_NAMES.map((n) => (
                <div key={n}>
                  <Icon name={n} size={44} />
                  <Icon name={n} size={20} />
                  <span className="bo-label">{n}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 07 Primitives */}
        <section id="primitives" className={g.sec}>
          <div className="bo-wrap">
            <SecHead n="07" title="Primitives" />
            <div className={g.prims}>
              <Spec name="Figure" use="A headline number with its delta, coverage and source. Never without the source.">
                {lastPrice ? (
                  <Figure
                    label="Average house price"
                    value={fmt.gbp(lastPrice.v)}
                    delta={yoy !== null ? { text: fmt.pctSigned(yoy), dir: yoy > 0 ? "up" : yoy < 0 ? "down" : "flat", against: "on a year earlier" } : null}
                    scope="United Kingdom"
                    source={<SourceLine publisher="HM Land Registry / ONS" series="UK HPI" />}
                  />
                ) : null}
              </Spec>
              <Spec name="Level stepper" use="Shows the three depths and where the reader is.">
                <LevelStepper current={1} />
              </Spec>
              <Spec name="Segmented" use="Switch a measure or view. Two to four options; more becomes a select.">
                <Segmented
                  label="Demo"
                  value={demo}
                  onChange={setDemo}
                  options={[
                    { id: "a", name: "Price" },
                    { id: "b", name: "1-yr change" },
                  ]}
                />
              </Spec>
              <Spec name="Search" use="Places, indicators and topics in one field. Postcodes are recognised and answered honestly.">
                <Search
                  placeholder="Try “London” or “SW1A 1AA”"
                  items={data.regions.map((r) => ({ label: r.name, kind: "Place" as const, href: "/design-lab/housing#place-" + r.code }))}
                />
              </Spec>
              <Spec name="Pathway" use="A user question, never a dataset name. Spark shows shape only.">
                <div style={{ maxWidth: "20rem" }}>
                  <Pathway n="02" icon="scales" question="Who can afford it?" blurb="Prices relative to earnings" href="/design-lab/housing#afford">
                    <Spark points={data.afford} />
                  </Pathway>
                </div>
              </Spec>
              <Spec name="Source line" use="Mono, micro, always last. Links out when the dataset has a source URL.">
                <SourceLine publisher="ONS" series="AFF1 Table 1c" period="Annual" href="https://www.ons.gov.uk" />
              </Spec>
            </div>
          </div>
        </section>

        {/* 08 Charts */}
        <section id="charts" className={g.sec}>
          <div className="bo-wrap">
            <SecHead n="08" title="Charts" note="Each form has a job. The brand fixes stroke, type, colour roles and the time axis; the data picks the form." />
            <Spec name="EngravedArea" use="One long series that carries a story. The flagship of a sector page. Annotations are computed points.">
              <EngravedArea
                points={data.afford}
                format={fmt.ratio}
                tickFormat={(v) => `${v}×`}
                annotations={data.afford.length ? [{ t: data.afford[data.afford.length - 1]!.t, label: "Latest", align: "end" }] : []}
                label="Affordability ratio"
                height={320}
              />
            </Spec>
            <Spec name="LineChart" use="Comparison of 2–6 series. Colour is role: signal = the selection, ink = the reference, tints = context. End labels, no legend.">
              <LineChart series={typeSeries} format={fmt.gbp} tickFormat={fmt.gbpCompact} label="Price by property type" height={300} />
            </Spec>
            <div className={g.two}>
              <Spec name="TileMap" use="Comparing places when boundaries would distort. Equal-area tiles, five ink bins.">
                <TileMap data={tiles} selected={place} onSelect={setPlace} label="Annual change by region" legendFormat={fmt.pctSigned} />
              </Spec>
              <Spec name="ShareArea" use="Composition over time. Bands differ by print pattern — solid, hatch, stipple — not hue.">
                <ShareArea
                  years={data.tenure.years}
                  bands={[
                    { id: "o", label: "Owner-occupied", pattern: "solid", values: data.tenure.owner },
                    { id: "p", label: "Private rented", pattern: "hatch", values: data.tenure.privateRented },
                    { id: "s", label: "Social rented", pattern: "stipple", values: data.tenure.social },
                  ]}
                  label="Tenure"
                  height={300}
                />
              </Spec>
            </div>
            <Spec name="CombBars" use="Dense periodic counts. Fine ink teeth; the hovered period takes the signal.">
              <CombBars points={data.completions} format={(v) => `${fmt.count(v)} homes`} tickFormat={fmt.countCompact} label="Completions" height={220} />
            </Spec>
          </div>
        </section>

        {/* 09 Imprint */}
        <section id="imprint" className={g.sec}>
          <div className="bo-wrap">
            <SecHead n="09" title="Imprint" note="The printed voice. Allowed at thresholds — mastheads, section breaks, sector marks. Never inside a chart." />
            <div className={g.imprint}>
              <Spec name="Plate (halftone)" use="Sector illustration in the sector pigment. Two screens, grain, mis-registration.">
                <div className={g.plate}>
                  <Halftone source="terraces" field="#b07c2c" ink="#2a1606" highlight="#f0ede5" pitch={3} />
                </div>
              </Spec>
              <Spec name="Stamp" use="Sector mark and index tile. Denomination must be a real figure (e.g. series held).">
                <div className={g.stampBox}>
                  <Stamp label="Housing" source="terraces" field="#b07c2c" ink="#2a1606" highlight="#f0ede5" denomination={`${data.profiles.length} series`} tilt={-4} />
                </div>
              </Spec>
              <Spec name="ASCII threshold" use="Section hand-off between ink and paper. Motion pauses off-screen and under reduced motion.">
                <div className={g.ascii}>
                  <AsciiField className={g.fill} source="dissolve" fg="#0d1258" accent="#0d1258" bg="#f0ede5" cell={10} lens={false} invert flow={0.28} />
                </div>
              </Spec>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

function SecHead({ n, title, note }: { n: string; title: string; note?: string }) {
  return (
    <header className={g.secHead}>
      <span className="bo-label">{n}</span>
      <h2 className="bo-d1">{title}</h2>
      {note ? <p>{note}</p> : null}
    </header>
  );
}

function Spec({ name, use, children }: { name: string; use: string; children: React.ReactNode }) {
  return (
    <div className={g.spec}>
      <div className={g.specHead}>
        <span className="bo-label">{name}</span>
        <span className={g.specUse}>{use}</span>
      </div>
      <div className={g.specBody}>{children}</div>
    </div>
  );
}
