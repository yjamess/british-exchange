"use client";

/**
 * Domain 06 — Land Explorer (flagship).
 * Pick a place; switch on designation, heritage, development and constraint layers
 * and read where they intersect. Every mark opens its record: name, reference, dates, publisher,
 * source link. Land use for the same place sits beside the map, England as the reference.
 *
 * Data: publisher FeatureServers (ONS, MHCLG, NE, HE, EA flood) plus Planning Data CSV dumps
 * for brownfield / Article 4 / TPO, served by /housing/land-layers/[code].
 * Clipped to each district; current records only. Nothing is stored for all 309 councils in advance.
 * One ink: layers are told apart by pen hatching and outline, not by fills of opacity.
 */

import { useEffect, useId, useMemo, useState, type ReactNode } from "react";
import { fmt, fmtT } from "../../../data";
import type { HousingV1 } from "../../load";
import s from "./landExplorer.module.css";

type Enc = { type: "Point"; c: [number, number] } | { type: "MultiPolygon"; c: [number, number][][][] };
type Rec = Record<string, string | undefined>;
type Feature = { p: Rec; g: Enc };
type Layer = { label: string; group: Group; kind: "area" | "point"; count: number; coverPct: number | null; features: Feature[] };
type Group = "designations" | "heritage" | "development" | "constraints";
type Share = { id: string; label: string; share: number | null };
type Facts = {
  anyDesignationPct: number;
  floodZone3Pct: number;
  brownfieldInConservation: number;
  brownfieldInGreenBelt: number;
  brownfieldInFlood3: number;
  brownfieldHectares: number;
  brownfieldMaxDwellings: number;
  /** Sites with a published maximum. Missing is not included in the sum. */
  brownfieldCapacityStated?: number;
  brownfieldCapacityMissing?: number;
  listedInConservation: number;
};
type CoverageLayer = { status: string; count?: number | null; returned?: number; note?: string };
type Place = {
  code: string;
  name: string;
  why: string;
  bbox: [number, number, number, number];
  areaHa: number;
  boundary: Enc;
  layers: Record<string, Layer>;
  facts: Facts;
  landUse: Share[];
  landUseEngland: Share[];
  /** Records the API could not return (named, not silently dropped). */
  gaps?: { dataset: string; offset: number; reason: string }[];
  coverage?: { mode: "pinned" | "live" | "publishers"; layers?: Record<string, CoverageLayer> };
};
type Index = {
  source: { publisher: string; url: string; retrieved: string; licence: string; landUse: string };
  layers: { dataset: string; group: Group; label: string; kind: "area" | "point" }[];
  places: { code: string; name: string; why: string }[];
  orgs?: Record<string, string>;
};

const GROUPS: { id: Group; label: string }[] = [
  { id: "designations", label: "Designations" },
  { id: "heritage", label: "Heritage" },
  { id: "development", label: "Development" },
  { id: "constraints", label: "Constraints" },
];

const DEFAULT_ON = new Set([
  "flood-risk-zone",
  "green-belt",
  "conservation-area",
  "site-of-special-scientific-interest",
  "area-of-outstanding-natural-beauty",
  "national-park",
  "listed-building",
  "brownfield-land",
]);

/** What each layer is — and is not. Shown with every record. */
const CAVEAT: Record<string, string> = {
  "green-belt": "A planning designation that restricts inappropriate development — not a ban on all building.",
  "conservation-area": "Designated by the council for special architectural or historic interest.",
  "site-of-special-scientific-interest": "Natural England designation for wildlife or geology.",
  "ancient-woodland": "Wooded continuously since at least 1600 (Natural England inventory).",
  "area-of-outstanding-natural-beauty": "Protected landscape (now National Landscape).",
  "national-park": "National park boundary; the park authority is the planning authority inside it.",
  "listed-building": "Historic England listing; location is the list entry point.",
  "scheduled-monument": "Nationally important archaeological site or monument (Historic England).",
  "park-and-garden": "Registered park or garden of special historic interest (Historic England).",
  "world-heritage-site": "UNESCO World Heritage Site boundary.",
  "brownfield-land": "Registration is not a deliverable site. Dwelling estimates are council-published and often missing.",
  "flood-risk-zone": "Environment Agency flood zone: 3 = high probability, 2 = medium. Ignores defences.",
  "article-4-direction-area": "Council removes some permitted development rights here.",
  "tree-preservation-zone": "Area covered by a tree preservation order.",
};

/** Pen styles, one ink plus the muted chart tones for natural designations and development. */
type Style = { fill: string; stroke: string; width: number; dash?: string };
const style = (uid: string, dataset: string, feature?: Feature): Style => {
  const p = (id: string) => `url(#${uid}-${id})`;
  switch (dataset) {
    case "green-belt":
      return { fill: p("gb"), stroke: "var(--bo-green)", width: 1.2 };
    case "national-park":
    case "area-of-outstanding-natural-beauty":
      return { fill: p("park"), stroke: "var(--bo-green)", width: 1, dash: "6 4" };
    case "site-of-special-scientific-interest":
      return { fill: p("sssi"), stroke: "var(--bo-green)", width: 1 };
    case "ancient-woodland":
      return { fill: p("wood"), stroke: "var(--bo-green)", width: 0.8 };
    case "conservation-area":
      return { fill: p("cons"), stroke: "var(--bo-ink)", width: 1.2 };
    case "scheduled-monument":
    case "world-heritage-site":
      return { fill: p("cross"), stroke: "var(--bo-ink)", width: 1 };
    case "park-and-garden":
      return { fill: "none", stroke: "var(--bo-ink)", width: 1, dash: "2 3" };
    case "flood-risk-zone":
      return { fill: String(feature?.p["flood-risk-level"]) === "3" ? p("flood3") : p("flood2"), stroke: "none", width: 0 };
    case "article-4-direction-area":
      return { fill: "none", stroke: "var(--bo-union)", width: 1, dash: "5 3" };
    case "tree-preservation-zone":
      return { fill: "none", stroke: "var(--bo-green)", width: 0.6 };
    default:
      return { fill: "none", stroke: "var(--bo-ink)", width: 1 };
  }
};

/** Opens on the map. Search replaces it. York has Green Belt, conservation areas and listed buildings. */
const OPENING_PLACE = "E06000014";

const nf = new Intl.NumberFormat("en-GB");
const dateGB = (iso?: string) => {
  if (!iso) return undefined;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
};

type EnglandRegister = HousingV1["brownfield"];

export function explorerFoot(): {
  definition: string;
  method: string[];
  source: string;
} {
  return {
    definition:
      "One English council at a time. Layers are clipped to the district — current designations only.",
    method: [
      "Flood zones 2 and 3 come live from the Environment Agency Flood Map for Planning (ignores defences). Dense districts may truncate at 400 polygons.",
      "Local-plan allocations and individual planning applications stay labelled gaps — no England polygon or case feed is ready.",
      "Inspectorate appeals sit on Planning decisions as Casework Database aggregates, not as map points.",
      "Landmark Green Belt years sit on Historical change. Land use is 2022. Brownfield marks are the England register, clipped — registration is not a deliverable home.",
    ],
    source:
      "ONS · MHCLG · Environment Agency · Historic England · Natural England · Planning Data · England councils",
  };
}

export function LandExplorer({
  england,
  code,
  onCode,
}: {
  england: EnglandRegister;
  /** ONS local-authority code from the URL. Empty until the visitor chooses a council. */
  code: string | null;
  onCode: (code: string) => void;
}) {
  const uid = useId().replace(/:/g, "");
  const [index, setIndex] = useState<Index | null>(null);
  const [place, setPlace] = useState<Place | null>(null);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [on, setOn] = useState<Set<string>>(() => new Set(DEFAULT_ON));
  const [picked, setPicked] = useState<{ dataset: string; f: Feature } | null>(null);
  const [placeError, setPlaceError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    fetch("/housing/land-layers/index")
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((j: Index) => {
        if (!live) return;
        setIndex(j);
      })
      .catch(() => live && setFailed(true));
    return () => {
      live = false;
    };
  }, []);

  const active = code || OPENING_PLACE;

  useEffect(() => {
    if (!code) onCode(OPENING_PLACE);
  }, [code, onCode]);

  useEffect(() => {
    if (!active) return;
    let live = true;
    setLoading(true);
    setPlace(null);
    setPlaceError(null);
    setPicked(null);
    fetch(`/housing/land-layers/${active}`)
      .then(async (r) => {
        if (!r.ok) throw new Error(await r.text());
        return r.json() as Promise<Place>;
      })
      .then((j) => {
        if (!live) return;
        setPlace(j);
        setPlaceError(null);
      })
      .catch((error: unknown) => {
        if (!live) return;
        setPlace(null);
        setPlaceError(error instanceof Error ? error.message : "This district could not be loaded.");
      })
      .finally(() => live && setLoading(false));
    return () => {
      live = false;
    };
  }, [active]);

  // projection: equirectangular scaled by cos(lat) at the district's centre; 1000 units wide
  const geo = useMemo(() => {
    if (!place) return null;
    const [minx, miny, maxx, maxy] = place.bbox;
    const kx = Math.cos((((miny + maxy) / 2) * Math.PI) / 180);
    const S = 1000 / ((maxx - minx) * kx);
    const H = (maxy - miny) * S;
    const X = (lon: number) => (lon - minx) * kx * S;
    const Y = (lat: number) => (maxy - lat) * S;
    const path = (g: Enc) =>
      g.type === "MultiPolygon"
        ? g.c.map((poly) => poly.map((ring) => `M${ring.map(([a, b]) => `${X(a).toFixed(1)} ${Y(b).toFixed(1)}`).join("L")}Z`).join("")).join("")
        : "";
    return { H, X, Y, path, boundary: path(place.boundary) };
  }, [place]);

  if (failed) {
    return (
      <p className={s.note}>Land layers could not be loaded. The Exchange does not show estimates.</p>
    );
  }
  if (!index) return <p className={s.note}>Loading places…</p>;

  const orgs = index.orgs ?? {};
  const toggle = (ds: string) =>
    setOn((cur) => {
      const next = new Set(cur);
      if (next.has(ds)) next.delete(ds);
      else next.add(ds);
      return next;
    });

  const areaOrder = index.layers.filter((l) => l.kind === "area").map((l) => l.dataset);
  // draw broad designations first, local detail on top
  const drawOrder = ["flood-risk-zone", "national-park", "area-of-outstanding-natural-beauty", "green-belt", "site-of-special-scientific-interest", "ancient-woodland", "tree-preservation-zone", "park-and-garden", "world-heritage-site", "conservation-area", "article-4-direction-area", "scheduled-monument"].filter((d) => areaOrder.includes(d));

  return (
    <div className={s.root}>
      {loading && !place && (
        <p className={s.note}>Drawing this council from publisher open data. The boundary appears when the layers arrive.</p>
      )}
      {placeError && <p className={s.note}>{placeError}</p>}

      {place && geo && (
        <div className={s.body} data-loading={loading ? "true" : undefined}>
          <figure className={s.mapCol}>
            <svg viewBox={`-12 -12 1024 ${geo.H + 24}`} className={s.map} role="img" aria-label={`Planning layers in ${place.name}`}>
              <defs>
                <clipPath id={`${uid}-clip`}>
                  <path d={geo.boundary} />
                </clipPath>
                <pattern id={`${uid}-gb`} width="9" height="9" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                  <line x1="0" y1="0" x2="0" y2="9" stroke="var(--bo-green)" strokeWidth="1" />
                </pattern>
                <pattern id={`${uid}-park`} width="14" height="14" patternUnits="userSpaceOnUse" patternTransform="rotate(-30)">
                  <line x1="0" y1="0" x2="0" y2="14" stroke="var(--bo-green)" strokeWidth="0.7" />
                </pattern>
                <pattern id={`${uid}-sssi`} width="5" height="5" patternUnits="userSpaceOnUse">
                  <line x1="0" y1="2.5" x2="5" y2="2.5" stroke="var(--bo-green)" strokeWidth="1" />
                </pattern>
                <pattern id={`${uid}-wood`} width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(-45)">
                  <line x1="0" y1="0" x2="0" y2="5" stroke="var(--bo-green)" strokeWidth="1.4" />
                </pattern>
                <pattern id={`${uid}-cons`} width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(-45)">
                  <line x1="0" y1="0" x2="0" y2="4" stroke="var(--bo-ink)" strokeWidth="1" />
                </pattern>
                <pattern id={`${uid}-cross`} width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                  <path d="M0 2.5H5M2.5 0V5" stroke="var(--bo-ink)" strokeWidth="0.9" />
                </pattern>
                <pattern id={`${uid}-flood3`} width="6" height="4" patternUnits="userSpaceOnUse">
                  <path d="M0 2 Q1.5 0.6 3 2 T6 2" fill="none" stroke="var(--bo-union)" strokeWidth="0.8" />
                </pattern>
                <pattern id={`${uid}-flood2`} width="12" height="8" patternUnits="userSpaceOnUse">
                  <path d="M0 4 Q3 2.6 6 4 T12 4" fill="none" stroke="var(--bo-ink-40)" strokeWidth="0.7" />
                </pattern>
              </defs>

              <path d={geo.boundary} className={s.land} />
              <g clipPath={`url(#${uid}-clip)`}>
                {drawOrder.map((ds) =>
                  on.has(ds)
                    ? place.layers[ds]?.features.map((f, i) => {
                        const st = style(uid, ds, f);
                        const active = picked?.f === f;
                        return (
                          <path
                            key={`${ds}-${i}`}
                            d={geo.path(f.g)}
                            fill={st.fill}
                            fillRule="evenodd"
                            stroke={active ? "var(--bo-ink)" : st.stroke}
                            strokeWidth={active ? 2.5 : st.width}
                            strokeDasharray={st.dash}
                            className={s.shape}
                            onClick={() => setPicked({ dataset: ds, f })}
                          >
                            <title>{f.p.name || place.layers[ds]!.label}</title>
                          </path>
                        );
                      })
                    : null,
                )}
              </g>
              <path d={geo.boundary} className={s.edge} />

              {on.has("listed-building") &&
                place.layers["listed-building"]?.features.map((f, i) => {
                  if (f.g.type !== "Point") return null;
                  const grade = f.p["listed-building-grade"];
                  const r = grade === "I" ? 3.4 : grade === "II*" ? 2.6 : 1.7;
                  const active = picked?.f === f;
                  return (
                    <rect
                      key={`lb-${i}`}
                      x={geo.X(f.g.c[0]) - r}
                      y={geo.Y(f.g.c[1]) - r}
                      width={r * 2}
                      height={r * 2}
                      className={s.listed}
                      data-active={active ? "true" : undefined}
                      onClick={() => setPicked({ dataset: "listed-building", f })}
                    >
                      <title>{f.p.name}</title>
                    </rect>
                  );
                })}
              {on.has("brownfield-land") &&
                place.layers["brownfield-land"]?.features.map((f, i) => {
                  if (f.g.type !== "Point") return null;
                  const ha = Number(f.p.hectares ?? 0);
                  const r = Math.max(4, Math.min(11, 3 + Math.sqrt(ha) * 3));
                  const active = picked?.f === f;
                  return (
                    <rect
                      key={`bf-${i}`}
                      x={geo.X(f.g.c[0]) - r}
                      y={geo.Y(f.g.c[1]) - r}
                      width={r * 2}
                      height={r * 2}
                      transform={`rotate(45 ${geo.X(f.g.c[0])} ${geo.Y(f.g.c[1])})`}
                      className={s.brownfield}
                      data-active={active ? "true" : undefined}
                      onClick={() => setPicked({ dataset: "brownfield-land", f })}
                    >
                      <title>{f.p["site-address"] || f.p.name}</title>
                    </rect>
                  );
                })}
            </svg>
            <figcaption className={s.caption}>
              <span className="bo-label">{place.name}</span>
              <span>
                {nf.format(place.areaHa)} ha · layers clipped to the district · current records only
                {place.coverage?.mode === "pinned"
                  ? " · stored geometry for this council"
                  : place.coverage?.mode === "publishers"
                    ? " · ONS, MHCLG, EA flood, Natural England and Historic England · brownfield, Article 4 and TPO from Planning Data dumps"
                    : " · live Planning Data query"}
                {" · select any mark for its record"}
              </span>
            </figcaption>
          </figure>

          <aside className={s.side}>
            {picked ? (
              <RecordCard dataset={picked.dataset} layer={place.layers[picked.dataset]!} f={picked.f} orgs={orgs} onClose={() => setPicked(null)} />
            ) : (
              <Lessons place={place} england={england} />
            )}

            <div className={s.layers}>
              {GROUPS.map((g) => {
                const rows = index.layers.filter((l) => l.group === g.id);
                return (
                  <fieldset key={g.id} className={s.group}>
                    <legend className="bo-label">{g.label}</legend>
                    {rows.map((l) => {
                      const layer = place.layers[l.dataset];
                      const n = layer?.count ?? 0;
                      const cov = place.coverage?.layers?.[l.dataset];
                      const countOnly = cov?.status === "count-only";
                      return (
                        <label key={l.dataset} className={s.layerRow} data-empty={n === 0 ? "true" : undefined}>
                          <input type="checkbox" checked={on.has(l.dataset)} onChange={() => toggle(l.dataset)} disabled={n === 0 || countOnly} />
                          <Swatch uid={uid} dataset={l.dataset} />
                          <span className={s.layerLabel}>{l.label}</span>
                          <span className={s.layerCount}>
                            {countOnly
                              ? `${n === 0 ? "count unavailable" : nf.format(n)} · not drawn`
                              : n === 0
                                ? "none here"
                                : layer?.kind === "area" && layer.coverPct != null
                                  ? `${n} · ${layer.coverPct}%`
                                  : nf.format(n)}
                          </span>
                          {cov?.status === "truncated" && (
                            <span className={s.gapNote}>
                              Showing {cov.returned ?? layer?.features.length} of {cov.count} records. The rest are not drawn on this live query.
                            </span>
                          )}
                          {countOnly && cov?.note && <span className={s.gapNote}>{cov.note}</span>}
                          {cov?.status === "publisher-omit" && cov?.note && <span className={s.gapNote}>{cov.note}</span>}
                          {cov?.status === "failed" && (
                            <span className={s.gapNote}>
                              {place.coverage?.mode === "publishers"
                                ? "This publisher feed did not return the layer for this council."
                                : "Planning Data did not return this layer."}
                            </span>
                          )}
                          {(place.gaps ?? []).some((g) => g.dataset === l.dataset) && (
                            <span className={s.gapNote}>
                              {(place.gaps ?? []).filter((g) => g.dataset === l.dataset).length} record(s) could not be retrieved from Planning Data; shares exclude them.
                            </span>
                          )}
                        </label>
                      );
                    })}
                    {g.id === "development" && (
                      <p className={s.gap}>
                        Local-plan allocations are not published as an England polygon layer. Brownfield
                        register sites are the national development-sites marks here. A refusal or grant
                        drawn on the map is not an appeal outcome — Inspectorate appeals sit on Planning
                        decisions.
                      </p>
                    )}
                  </fieldset>
                );
              })}
            </div>
          </aside>

          <section className={s.landUse} aria-label={`Land use in ${place.name}`}>
            <p className="bo-label">Land use · {place.name} against England · 2022</p>
            <LandUse rows={place.landUse} england={place.landUseEngland} />
          </section>
        </div>
      )}
    </div>
  );
}

function Swatch({ uid, dataset }: { uid: string; dataset: string }) {
  if (dataset === "listed-building") return <i className={`${s.swatch} ${s.swListed}`} aria-hidden="true" />;
  if (dataset === "brownfield-land") return <i className={`${s.swatch} ${s.swBrownfield}`} aria-hidden="true" />;
  const st = style(uid, dataset, { p: { "flood-risk-level": "3" }, g: { type: "Point", c: [0, 0] } });
  return (
    <svg className={s.swatch} viewBox="0 0 18 12" aria-hidden="true">
      <rect x="0.5" y="0.5" width="17" height="11" fill={st.fill === "none" ? "var(--bo-paper)" : st.fill} stroke={st.stroke === "none" ? "var(--bo-ink-20)" : st.stroke} strokeDasharray={st.dash} />
    </svg>
  );
}

function Lessons({ place, england }: { place: Place; england: EnglandRegister }) {
  const L = place.layers;
  const f = place.facts;
  const gb = L["green-belt"]?.coverPct ?? 0;
  const items: { k: string; text: ReactNode }[] = [];
  items.push({
    k: "des",
    text: (
      <>
        <b className="bo-fig">{f.anyDesignationPct}%</b> of {place.name} is Green Belt, SSSI, ancient woodland, AONB or national park
        {gb > 0 ? ` — Green Belt alone covers ${gb}%` : ""}.
      </>
    ),
  });
  if ((L["listed-building"]?.count ?? 0) > 0)
    items.push({
      k: "lb",
      text: (
        <>
          <b className="bo-fig">{nf.format(L["listed-building"]!.count)}</b> listed buildings, {nf.format(f.listedInConservation)} of them inside the{" "}
          {L["conservation-area"]?.count ?? 0} conservation areas.
        </>
      ),
    });
  if ((L["brownfield-land"]?.count ?? 0) > 0)
    items.push({
      k: "bf",
      text: (
        <>
          <b className="bo-fig">{L["brownfield-land"]!.count}</b> brownfield register sites in this district, {f.brownfieldHectares} ha.{" "}
          {f.brownfieldCapacityStated != null ? (
            <>
              {nf.format(f.brownfieldCapacityStated)} of the sites drawn here publish a maximum ({nf.format(f.brownfieldMaxDwellings)} homes added together).{" "}
              {(f.brownfieldCapacityMissing ?? 0) > 0
                ? `${nf.format(f.brownfieldCapacityMissing ?? 0)} drawn sites publish none. A blank maximum is missing, not zero. `
                : ""}
            </>
          ) : f.brownfieldMaxDwellings > 0 ? (
            <>Up to {nf.format(f.brownfieldMaxDwellings)} homes where a maximum is published. </>
          ) : null}
          {f.brownfieldInConservation} in conservation areas, {f.brownfieldInGreenBelt} in Green Belt, {f.brownfieldInFlood3} in flood zone 3.
          {england.siteCount != null && (
            <>
              {" "}
              England&apos;s registers list {nf.format(england.siteCount)} current sites
              {england.hectares != null ? ` (${nf.format(Math.round(england.hectares))} ha)` : ""}
              {england.asAt != null ? ` as at ${fmtT(england.asAt, "annual")}` : ""}. These diamonds are that inventory, clipped to the district — registration is not a deliverable home.
            </>
          )}
        </>
      ),
    });
  if (f.floodZone3Pct > 0)
    items.push({
      k: "fl",
      text: (
        <>
          <b className="bo-fig">{f.floodZone3Pct}%</b> of the district lies in flood zone 3, before defences.
        </>
      ),
    });
  return (
    <div className={s.lessons}>
      <p className="bo-label">What this place shows</p>
      <h3 className={s.placeTitle}>{place.name}</h3>
      {place.why ? <p className={s.why}>{place.why}</p> : null}
      <ul>
        {items.map((it) => (
          <li key={it.k}>{it.text}</li>
        ))}
      </ul>
    </div>
  );
}

function RecordCard({ dataset, layer, f, orgs, onClose }: { dataset: string; layer: Layer; f: Feature; orgs: Record<string, string>; onClose: () => void }) {
  const p = f.p;
  const rows: [string, string | undefined][] = [
    ["Reference", p.reference],
    ["Grade", p["listed-building-grade"] ?? p["park-and-garden-grade"]],
    ["Designated", dateGB(p["designation-date"] ?? p["start-date"])],
    ["Flood zone", p["flood-risk-level"]],
    ["Address", p["site-address"]],
    ["Area", p.hectares ? `${p.hectares} ha` : undefined],
    [
      "Homes (published)",
      dataset === "brownfield-land"
        ? p["minimum-net-dwellings"] || p["maximum-net-dwellings"]
          ? p["minimum-net-dwellings"] === p["maximum-net-dwellings"]
            ? p["maximum-net-dwellings"]
            : `${p["minimum-net-dwellings"] ?? "Not published"}–${p["maximum-net-dwellings"] ?? "Not published"}`
          : "Not published — not zero"
        : p["minimum-net-dwellings"] || p["maximum-net-dwellings"]
          ? p["minimum-net-dwellings"] === p["maximum-net-dwellings"]
            ? p["maximum-net-dwellings"]
            : `${p["minimum-net-dwellings"] ?? "?"}–${p["maximum-net-dwellings"] ?? "?"}`
          : undefined,
    ],
    ["Permission", p["planning-permission-status"]?.replace(/-/g, " ")],
    ["Ownership", p["ownership-status"]?.replace(/-/g, " ")],
    ["Publisher", p["organisation-entity"] ? orgs[p["organisation-entity"]] ?? `Planning Data organisation ${p["organisation-entity"]}` : undefined],
    ["Record updated", dateGB(p["entry-date"])],
  ];
  const doc = p["documentation-url"] ?? p["document-url"];
  return (
    <div className={s.record}>
      <div className={s.recordHead}>
        <p className="bo-label">{layer.label}</p>
        <button type="button" className={s.close} onClick={onClose} aria-label="Close record">
          ×
        </button>
      </div>
      <h3 className={s.placeTitle}>{p.name || p.reference || layer.label}</h3>
      <dl>
        {rows
          .filter(([, v]) => v)
          .map(([k, v]) => (
            <div key={k}>
              <dt>{k}</dt>
              <dd>{v}</dd>
            </div>
          ))}
      </dl>
      <p className={s.caveat}>{CAVEAT[dataset]}</p>
      {(doc || p.entity) && (
        <p className={s.links}>
          {doc ? (
            <a href={doc} target="_blank" rel="noreferrer">
              Official record
            </a>
          ) : (
            <a href={`https://www.planning.data.gov.uk/entity/${p.entity}`} target="_blank" rel="noreferrer">
              Planning Data record
            </a>
          )}
        </p>
      )}
    </div>
  );
}

function LandUse({ rows, england }: { rows: Share[]; england: Share[] }) {
  const eng = new Map(england.map((r) => [r.id, r.share]));
  const shown = rows.filter((r) => r.share !== null && (r.share! > 0.05 || (eng.get(r.id) ?? 0) > 0.05)).sort((a, b) => (b.share ?? 0) - (a.share ?? 0));
  const max = Math.max(1, ...shown.map((r) => Math.max(r.share ?? 0, eng.get(r.id) ?? 0)));
  if (shown.length === 0) return <p className={s.note}>Land use for this district is not in the 2022 tables.</p>;
  return (
    <div className={s.useRows}>
      {shown.map((r) => {
        const e = eng.get(r.id) ?? null;
        return (
          <div key={r.id} className={s.useRow}>
            <span>{r.label}</span>
            <span className={s.useTrack} aria-hidden="true">
              <i style={{ width: `${((r.share ?? 0) / max) * 100}%` }} />
              {e !== null && <em style={{ left: `${(e / max) * 100}%` }} />}
            </span>
            <b className="bo-fig">{fmt.pct(r.share ?? 0)}</b>
            <span className={s.useEng}>{e !== null ? `England ${fmt.pct(e)}` : ""}</span>
          </div>
        );
      })}
    </div>
  );
}
